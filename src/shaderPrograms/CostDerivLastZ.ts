import GLState from "../GLState";
import { activationF, customActivationF, activationDerivative_shader } from '../ConvNet/activationFunctions';
import ShaderProgram from "./shaderProgram";
import texture_n_t from './texture_n_t';

import getFragment from './shaderCode/costDerivLastZFragment';
import vertexCode from './shaderCode/vectorVertex.glsl';

const A_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    CORRECT_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    Z_L_TEXTURE_N = 'TEXTURE2' as texture_n_t,
    PREVIOUS_DERIV_TEXTURE_N = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [A_TEXTURE_N]: 0,
    [CORRECT_TEXTURE_N]: 1,
    [Z_L_TEXTURE_N]: 2,
    [PREVIOUS_DERIV_TEXTURE_N]: 3
};

const vertices = Float32Array.of(
    1, // upper
    -1, // lower
);

const costDerivLastZShaderPrograms: WeakMap<WebGLRenderingContext, Map<string, CostDerivLastZ>> = new WeakMap();

// TODO: support using different activation function when getting the shader
class CostDerivLastZ extends ShaderProgram {
    aLocation: WebGLUniformLocation;
    correctLocation: WebGLUniformLocation;
    zLLocation: WebGLUniformLocation;
    previousDerivLocation: WebGLUniformLocation;
    significanceLocation: WebGLUniformLocation;
    significance: number;

    vertexBuffer: WebGLBuffer;

    refs: number;
    pixelCount: number;
    nextPixelPartUsed: 1 | 2 | 3 | 4;
    f: activationF | customActivationF;

    constructor(gl: WebGLRenderingContext, glS: GLState, pixelCount: number, nextPixelPartUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF) {
        super(gl, glS, vertexCode, getFragment(pixelCount, nextPixelPartUsed, f instanceof Array ? f[1] : activationDerivative_shader.get(f)));
        console.log("CostDerivLastZ validation:", this.validate());

        this.refs = 1;
        this.pixelCount = pixelCount;
        this.nextPixelPartUsed = nextPixelPartUsed;
        this.aLocation = gl.getUniformLocation(this.glShaderProgram, 'a');
        this.correctLocation = gl.getUniformLocation(this.glShaderProgram, 'correct');
        this.zLLocation = gl.getUniformLocation(this.glShaderProgram, 'z_l');
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

        gl.uniform1i(this.aLocation, TEXTURE_N_int[A_TEXTURE_N]);
        gl.uniform1i(this.correctLocation, TEXTURE_N_int[CORRECT_TEXTURE_N]);
        gl.uniform1i(this.zLLocation, TEXTURE_N_int[Z_L_TEXTURE_N]);
        gl.uniform1i(this.previousDerivLocation, TEXTURE_N_int[PREVIOUS_DERIV_TEXTURE_N]);
        gl.uniform1f(this.significanceLocation, 0);
        this.significance = 0;
    }

    run(costDeriv: WebGLFramebuffer, neurons: WebGLTexture, correct: WebGLTexture, zL: WebGLTexture, previousDeriv: WebGLTexture, significance: number, drawFrom: number, drawLength: number) {
        this.glS.setActiveFramebuffer(costDeriv);
        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveArrayBuffer(this.vertexBuffer);
        this.glS.setActiveTexture(neurons, A_TEXTURE_N);
        this.glS.setActiveTexture(correct, CORRECT_TEXTURE_N);
        this.glS.setActiveTexture(zL, Z_L_TEXTURE_N);
        this.glS.setActiveTexture(previousDeriv, PREVIOUS_DERIV_TEXTURE_N);
        if (this.significance !== significance) {
            this.gl.uniform1f(this.significanceLocation, significance);
            this.significance = significance;
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
            costDerivLastZShaderPrograms.get(this.gl).delete(`${this.pixelCount} ${this.nextPixelPartUsed} ${this.f}`);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }
}

const getCostDerivLastZShaderProgram = (gl: WebGLRenderingContext, glS: GLState, pixelCount: number, nextPixelPartUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF) => {
    let contextMap = costDerivLastZShaderPrograms.get(gl);
    if (typeof contextMap === 'undefined') {
        contextMap = new Map();
        costDerivLastZShaderPrograms.set(gl, contextMap);
    }
    let costDerivLastZShaderProgram = contextMap.get(`${pixelCount} ${nextPixelPartUsed} ${f}`);
    if (typeof costDerivLastZShaderProgram === 'undefined') {
        costDerivLastZShaderProgram = new CostDerivLastZ(gl, glS, pixelCount, nextPixelPartUsed, f);
        contextMap.set(`${pixelCount} ${nextPixelPartUsed} ${f}`, costDerivLastZShaderProgram);
    } else {
        costDerivLastZShaderProgram.ref();
    }
    return costDerivLastZShaderProgram;
};

export {
    getCostDerivLastZShaderProgram,
    CostDerivLastZ as CostDerivLastZShaderProgram
};