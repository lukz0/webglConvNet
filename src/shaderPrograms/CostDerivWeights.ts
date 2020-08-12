import ShaderProgram from "./shaderProgram";
import GLState from "../GLState";
import texture_n_t from './texture_n_t';

import vertexCode from './shaderCode/matriceVertex.glsl';
import getFragment from "./shaderCode/costDerivWeightsFragment";
import logFramebufferStatus from "../glUtils/logFramebufferStatus";

const COST_DERIV_Z_L_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    L_M_1_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    PREVIOUS_DERIV_TEXTURE_N = 'TEXTURE2' as texture_n_t,
    UNUSED_TEXTURE_3 = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [COST_DERIV_Z_L_TEXTURE_N]: 0,
    [L_M_1_TEXTURE_N]: 1,
    [PREVIOUS_DERIV_TEXTURE_N]: 2,
    [UNUSED_TEXTURE_3]: 3
};

const vertices = Float32Array.of(
    -1, 1, // upper left
    -1, -1, // lower left
    1, -1, // lower right
    1, 1 // upper right
);

const costDerivWeightsShaderPrograms: WeakMap<WebGLRenderingContext, Map<string, CostDerivWeights>> = new WeakMap();

class CostDerivWeights extends ShaderProgram {
    vertexBuffer: WebGLBuffer;

    zLLocation: WebGLUniformLocation;
    previousLayerLocation: WebGLUniformLocation;
    previousDerivLocation: WebGLUniformLocation;
    significanceLocation: WebGLUniformLocation;

    significance: number;

    refs: number;
    weightsHeight: number;
    weightsWidth: number;
    partialUsed: 1 | 2 | 3 | 4;

    constructor(gl: WebGLRenderingContext, glS: GLState, height: number, width: number, partialUsed: 1 | 2 | 3 | 4) {
        super(gl, glS, vertexCode, getFragment(height, width, Math.ceil(width / 4), partialUsed));
        console.log("CostDerivWeights validation:", this.validate());

        this.refs = 1;
        this.weightsHeight = Math.ceil(height / 4);
        this.weightsWidth = Math.ceil(width / 4);
        this.partialUsed = partialUsed;

        this.zLLocation = gl.getUniformLocation(this.glShaderProgram, 'cost_deriv_z_l');
        this.previousLayerLocation = gl.getUniformLocation(this.glShaderProgram, 'l_m_1');
        this.previousDerivLocation = gl.getUniformLocation(this.glShaderProgram, 'previous_deriv');
        this.significanceLocation = gl.getUniformLocation(this.glShaderProgram, 'significance');

        glS.setProgram(this.glShaderProgram);
        const positionAttribLocation = gl.getAttribLocation(this.glShaderProgram, 'vertPosition');
        this.vertexBuffer = gl.createBuffer();
        glS.setActiveArrayBuffer(this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(
            positionAttribLocation,
            2,
            gl.FLOAT,
            false,
            2 * Float32Array.BYTES_PER_ELEMENT,
            0
        );
        gl.enableVertexAttribArray(positionAttribLocation);

        gl.uniform1i(this.zLLocation, TEXTURE_N_int[COST_DERIV_Z_L_TEXTURE_N]);
        gl.uniform1i(this.previousLayerLocation, TEXTURE_N_int[L_M_1_TEXTURE_N]);
        gl.uniform1i(this.previousDerivLocation, TEXTURE_N_int[PREVIOUS_DERIV_TEXTURE_N]);
        gl.uniform1f(this.significanceLocation, 0);
        this.significance = 0;
    }

    run(weightDeriv: WebGLFramebuffer, previousNeurons: WebGLTexture, costDerivzL: WebGLTexture, previousDeriv: WebGLTexture, significance: number, drawFrom: number, drawLength: number) {
        this.glS.setActiveFramebuffer(weightDeriv);

        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveArrayBuffer(this.vertexBuffer);
        this.glS.setActiveTexture(costDerivzL, COST_DERIV_Z_L_TEXTURE_N);
        this.glS.setActiveTexture(previousNeurons, L_M_1_TEXTURE_N);
        this.glS.setActiveTexture(previousDeriv, PREVIOUS_DERIV_TEXTURE_N);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_3);

        if (this.significance !== significance) {
            this.gl.uniform1f(this.significanceLocation, significance);
            this.significance = significance;
        }
        this.glS.setViewport(drawFrom, 0, drawLength, this.weightsHeight);

        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    ref() {
        this.refs++;
    }

    unRef() {
        this.refs--;
        if (this.refs <= 0) {
            costDerivWeightsShaderPrograms.get(this.gl).delete(`${this.weightsHeight} ${this.weightsWidth} ${this.partialUsed}`);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }
}

const getCostDerivWeightsShaderProgram = (gl: WebGLRenderingContext, glS: GLState, weightsHeight: number, weightsWidth: number, nextPixelPartUsed: 1 | 2 | 3 | 4) => {
    let contextMap = costDerivWeightsShaderPrograms.get(gl);
    if (typeof contextMap === 'undefined') {
        contextMap = new Map();
        costDerivWeightsShaderPrograms.set(gl, contextMap);
    }
    let costDerivWeightsShaderProgram = contextMap.get(`${weightsHeight} ${weightsWidth} ${nextPixelPartUsed}`);
    if (typeof costDerivWeightsShaderProgram === 'undefined') {
        costDerivWeightsShaderProgram = new CostDerivWeights(gl, glS, weightsHeight, weightsWidth, nextPixelPartUsed);
        contextMap.set(`${weightsHeight} ${weightsWidth} ${nextPixelPartUsed}`, costDerivWeightsShaderProgram);
    } else {
        costDerivWeightsShaderProgram.ref();
    }
    return costDerivWeightsShaderProgram;
};

export {
    CostDerivWeights as CostDerivWeightsShaderProgram,
    getCostDerivWeightsShaderProgram
};