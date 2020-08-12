import ShaderProgram from "./shaderProgram";
import GLState from "../GLState";
import texture_n_t from './texture_n_t';
import { activationF, customActivationF, activationDerivative_shader } from '../ConvNet/activationFunctions';

import vertexCode from './shaderCode/vectorVertex.glsl';
import getFragment from "./shaderCode/costDerivZFragment";

const WEIGHTS_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    Z_DERIV_P_1_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    Z_L_TEXTURE_N = 'TEXTURE2' as texture_n_t,
    PREVIOUS_DERIV_TEXTURE_N = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [WEIGHTS_TEXTURE_N]: 0,
    [Z_DERIV_P_1_TEXTURE_N]: 1,
    [Z_L_TEXTURE_N]: 2,
    [PREVIOUS_DERIV_TEXTURE_N]: 3
};

const vertices = Float32Array.of(
    1, // upper
    -1, // lower
);

const costDerivZShaderPrograms: WeakMap<WebGLRenderingContext, Map<string, CostDerivZ>> = new WeakMap();

class CostDerivZ extends ShaderProgram {
    weightsLocation: WebGLUniformLocation;
    zDerivPlus1Location: WebGLUniformLocation;
    zLocation: WebGLUniformLocation;
    previousDerivLocation: WebGLUniformLocation;
    significanceLocation: WebGLUniformLocation;
    significance: number;

    vertexBuffer: WebGLBuffer;

    keyString: string;

    refs: number;

    constructor(gl: WebGLRenderingContext, glS: GLState, outputSize: number, derivZlsize: number, partialUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF) {
        super(gl, glS, vertexCode, getFragment(outputSize, Math.ceil(derivZlsize / 4), Math.floor(derivZlsize / 4), derivZlsize, derivZlsize % 4 as 0 | 1 | 2 | 3, partialUsed, f instanceof Array ? f[1] : activationDerivative_shader.get(f)));
        console.log("CostDerivZ validation:", this.validate());

        this.refs = 1;
        this.keyString = `${outputSize} ${derivZlsize} ${partialUsed} ${f}`;

        this.weightsLocation = gl.getUniformLocation(this.glShaderProgram, 'w_l');
        this.zDerivPlus1Location = gl.getUniformLocation(this.glShaderProgram, 'deriv_z_l_p_1');
        this.zLocation = gl.getUniformLocation(this.glShaderProgram, 'z_l');
        this.previousDerivLocation = gl.getUniformLocation(this.glShaderProgram, 'previous_deriv');
        this.significanceLocation = gl.getUniformLocation(this.glShaderProgram, 'significance');

        glS.setProgram(this.glShaderProgram);
        const positionAttribLocation = gl.getAttribLocation(this.glShaderProgram, 'vertPosition');
        this.vertexBuffer = gl.createBuffer();
        glS.setActiveArrayBuffer(this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(
            positionAttribLocation,
            1,
            gl.FLOAT,
            false,
            1 * Float32Array.BYTES_PER_ELEMENT,
            0
        );
        gl.enableVertexAttribArray(positionAttribLocation);

        gl.uniform1i(this.weightsLocation, TEXTURE_N_int[WEIGHTS_TEXTURE_N]);
        gl.uniform1i(this.zDerivPlus1Location, TEXTURE_N_int[Z_DERIV_P_1_TEXTURE_N]);
        gl.uniform1i(this.zLocation, TEXTURE_N_int[Z_L_TEXTURE_N]);
        gl.uniform1i(this.previousDerivLocation, TEXTURE_N_int[PREVIOUS_DERIV_TEXTURE_N]);
        gl.uniform1f(this.significanceLocation, 0);
        this.significance = 0;
    }

    run(costDeriv: WebGLFramebuffer, weights: WebGLTexture, zDerivPlus1: WebGLTexture, zL: WebGLTexture, previousDeriv: WebGLTexture, significance: number, drawFrom: number, drawLength: number) {
        this.glS.setActiveFramebuffer(costDeriv);
        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveArrayBuffer(this.vertexBuffer);
        this.glS.setActiveTexture(weights, WEIGHTS_TEXTURE_N);
        this.glS.setActiveTexture(zDerivPlus1, Z_DERIV_P_1_TEXTURE_N);
        this.glS.setActiveTexture(zL, Z_L_TEXTURE_N);
        this.glS.setActiveTexture(previousDeriv, PREVIOUS_DERIV_TEXTURE_N);
        if (this.significance !== significance) {
            this.gl.uniform1f(this.significanceLocation, significance);
        }
        this.glS.setViewport(0, drawFrom, 1, drawLength);

        this.gl.drawArrays(this.gl.LINES, 0, 2);
    }

    ref() {
        this.refs++;
    }

    unRef() {
        this.refs--;
        if (this.refs <= 0) {
            costDerivZShaderPrograms.get(this.gl).delete(this.keyString);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }
}

const getCostDerivZShaderProgram = (gl: WebGLRenderingContext, glS: GLState, outputSize: number, derivZlsize: number, partialUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF) => {
    let contextMap = costDerivZShaderPrograms.get(gl);
    if (typeof contextMap === 'undefined') {
        contextMap = new Map();
        costDerivZShaderPrograms.set(gl, contextMap);
    }
    let costDerivZShaderProgram = contextMap.get(`${outputSize} ${derivZlsize} ${partialUsed} ${f}`);
    if (typeof costDerivZShaderProgram === 'undefined') {
        costDerivZShaderProgram = new CostDerivZ(gl, glS, outputSize, derivZlsize, partialUsed, f);
        contextMap.set(`${outputSize} ${derivZlsize} ${partialUsed} ${f}`, costDerivZShaderProgram);
    } else {
        costDerivZShaderProgram.ref();
    }
    return costDerivZShaderProgram;
};

export {
    getCostDerivZShaderProgram,
    CostDerivZ as CostDerivZShaderProgram
};