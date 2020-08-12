import ShaderProgram from './shaderProgram';
import GLState from '../GLState';
import texture_n_t from './texture_n_t';

import vertexCode from './shaderCode/vectorVertex.glsl';
import getFragment from './shaderCode/neuronLayerFragment';
import { activationF, customActivationF, activationF_shaders } from '../ConvNet/activationFunctions';

const PREVIOUS_NEURONS_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    WEIGHT_MATRIX_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    BIAS_TEXTURE_N = 'TEXTURE2' as texture_n_t,
    UNUSED_TEXTURE_3 = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [PREVIOUS_NEURONS_TEXTURE_N]: 0,
    [WEIGHT_MATRIX_TEXTURE_N]: 1,
    [BIAS_TEXTURE_N]: 2,
    [UNUSED_TEXTURE_3]: 3
};

const vertices = Float32Array.of(
    1, // upper
    -1, // lower
);

const neuronLayerShaderPrograms: WeakMap<WebGLRenderingContext, Map<string, NeuronLayerShaderProgram>> = new WeakMap();

class NeuronLayerShaderProgram extends ShaderProgram {
    previousWholePixels: number;
    previousPartialPixelSize: number;
    nextPixelPartUsed: 1 | 2 | 3 | 4;

    previousLayerLocation: WebGLUniformLocation;
    biasLocation: WebGLUniformLocation;
    weightLocation: WebGLUniformLocation;
    weightHeightLocation: WebGLUniformLocation;
    weightHeight: number;

    nextLayerSizeLocation: WebGLUniformLocation;
    nextLayerCurrentSize: number;

    vertexBuffer: WebGLBuffer;

    refs: number;
    f: activationF | customActivationF;

    useDrawBuffers: boolean;

    constructor(gl: WebGLRenderingContext, glS: GLState, previousSize: number, nextPixelPartUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF, useDrawBuffers: boolean) {
        const previousWholePixels = Math.floor(previousSize / 4);
        const previousPartialPixelSize = previousSize % 4;
        super(gl, glS, vertexCode, getFragment(previousWholePixels, previousPartialPixelSize, nextPixelPartUsed, f instanceof Array ? f[0] : activationF_shaders.get(f), useDrawBuffers));
        this.refs = 1;
        this.useDrawBuffers = useDrawBuffers;
        this.previousWholePixels = previousWholePixels;
        this.previousPartialPixelSize = previousPartialPixelSize;
        this.nextPixelPartUsed = nextPixelPartUsed;
        this.f = f;

        this.previousLayerLocation = gl.getUniformLocation(this.glShaderProgram, 'a_lm1');
        this.biasLocation = gl.getUniformLocation(this.glShaderProgram, 'b_l');
        this.weightLocation = gl.getUniformLocation(this.glShaderProgram, 'w_l');
        this.nextLayerSizeLocation = gl.getUniformLocation(this.glShaderProgram, 'a_l_size');
        this.weightHeightLocation = gl.getUniformLocation(this.glShaderProgram, 'w_l_height');

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

        gl.uniform1i(this.previousLayerLocation, TEXTURE_N_int[PREVIOUS_NEURONS_TEXTURE_N]);
        gl.uniform1i(this.biasLocation, TEXTURE_N_int[BIAS_TEXTURE_N]);
        gl.uniform1i(this.weightLocation, TEXTURE_N_int[WEIGHT_MATRIX_TEXTURE_N]);
        gl.uniform1f(this.weightHeightLocation, 0);
        this.weightHeight = 0;
    }

    run(previousLayer: WebGLTexture, weightMatrix: WebGLTexture, bias: WebGLTexture, nextLayerPixels: number, nextLayer: WebGLFramebuffer, weightHeight: number, drawFrom: number, drawLength: number) {
        this.glS.setActiveFramebuffer(nextLayer);
        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveArrayBuffer(this.vertexBuffer);
        this.glS.setActiveTexture(previousLayer, PREVIOUS_NEURONS_TEXTURE_N);
        this.glS.setActiveTexture(weightMatrix, WEIGHT_MATRIX_TEXTURE_N);
        this.glS.setActiveTexture(bias, BIAS_TEXTURE_N);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_3);
        if (this.nextLayerCurrentSize !== nextLayerPixels) {
            this.gl.uniform1f(this.nextLayerSizeLocation, nextLayerPixels);
            this.nextLayerCurrentSize = nextLayerPixels;
        }
        if (this.weightHeight !== weightHeight) {
            this.gl.uniform1f(this.weightHeightLocation, weightHeight);
            this.weightHeight = weightHeight;
        }
        this.glS.setViewport(0, drawFrom, 1, drawLength);

        this.gl.drawArrays(this.gl.LINES, 0, 2);
    }

    unRef() {
        this.refs--;
        if (this.refs <= 0) {
            neuronLayerShaderPrograms.get(this.gl).delete(`${this.previousWholePixels * 4 + this.previousPartialPixelSize} ${this.nextPixelPartUsed} ${this.useDrawBuffers} ${this.f}`);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }

    ref() {
        this.refs++;
    }
}

const getNeuronLayerProgram = (gl: WebGLRenderingContext, glS: GLState, previousSize: number, nextPixelPartUsed: 1 | 2 | 3 | 4, f: activationF | customActivationF, useDrawBuffers: boolean) => {
    let contextMap = neuronLayerShaderPrograms.get(gl);
    if (typeof contextMap === 'undefined') {
        contextMap = new Map();
        neuronLayerShaderPrograms.set(gl, contextMap);
    }
    let neuronLayerShaderProgram = contextMap.get(`${previousSize} ${nextPixelPartUsed} ${useDrawBuffers} ${f}`);
    if (typeof neuronLayerShaderProgram === 'undefined') {
        neuronLayerShaderProgram = new NeuronLayerShaderProgram(gl, glS, previousSize, nextPixelPartUsed, f, useDrawBuffers);
        contextMap.set(`${previousSize} ${nextPixelPartUsed} ${useDrawBuffers} ${f}`, neuronLayerShaderProgram);
    } else {
        neuronLayerShaderProgram.ref();
    }
    return neuronLayerShaderProgram;
};

export {
    getNeuronLayerProgram,
    NeuronLayerShaderProgram
};