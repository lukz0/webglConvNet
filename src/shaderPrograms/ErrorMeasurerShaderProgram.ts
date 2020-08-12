import ShaderProgram from "./shaderProgram";
import GLState from "../GLState";

import vertexCode from './shaderCode/vectorVertex.glsl';
import getFragment from './shaderCode/measureErrorFragment';

import texture_n_t from './texture_n_t';

const vertices = Float32Array.of(
    1, // upper
    -1, // lower
);

const NEURONS_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    CORRECT_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    UNUSED_TEXTURE_2 = 'TEXTURE2' as texture_n_t,
    UNUSED_TEXTURE_3 = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [NEURONS_TEXTURE_N]: 0,
    [CORRECT_TEXTURE_N]: 1,
    [UNUSED_TEXTURE_2]: 2,
    [UNUSED_TEXTURE_3]: 3
};

const errorMeasurerShaderPrograms: WeakMap<WebGLRenderingContext, Map<string, ErrorMeasurerShaderProgram>> = new WeakMap();

class ErrorMeasurerShaderProgram extends ShaderProgram {
    gl: WebGLRenderingContext;
    glS: GLState;

    aLocation: WebGLUniformLocation;
    correctLocation: WebGLUniformLocation;

    vertexBuffer: WebGLBuffer;

    pixelCount: number;
    nextPixelPartUsed: 1 | 2 | 3 | 4;
    refs: number

    constructor(gl: WebGLRenderingContext, glS: GLState, pixelCount: number, nextPixelPartUsed: 1 | 2 | 3 | 4) {
        super(gl, glS, vertexCode, getFragment(pixelCount, nextPixelPartUsed));

        this.refs = 1;
        this.pixelCount = pixelCount;
        this.nextPixelPartUsed = nextPixelPartUsed;

        this.aLocation = gl.getUniformLocation(this.glShaderProgram, 'a');
        this.correctLocation = gl.getUniformLocation(this.glShaderProgram, 'correct');

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

        gl.uniform1i(this.aLocation, TEXTURE_N_int[NEURONS_TEXTURE_N]);
        gl.uniform1i(this.correctLocation, TEXTURE_N_int[CORRECT_TEXTURE_N]);
    }

    run(neurons: WebGLTexture, correct: WebGLTexture, error: WebGLFramebuffer, drawFrom: number, drawLength: number) {
        this.glS.setActiveFramebuffer(error);
        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveArrayBuffer(this.vertexBuffer);
        this.glS.setActiveTexture(neurons, NEURONS_TEXTURE_N);
        this.glS.setActiveTexture(correct, CORRECT_TEXTURE_N);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_2);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_3);
        this.glS.setViewport(0, drawFrom, 1, drawLength);

        this.gl.drawArrays(this.gl.LINES, 0, 2);
    }

    ref() {
        this.refs++;
    }

    unRef() {
        this.refs--;
        if (this.refs <= 0) {
            errorMeasurerShaderPrograms.get(this.gl).delete(`${this.pixelCount} ${this.nextPixelPartUsed}`);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }
}

const getErrorMeasurerProgram = (gl: WebGLRenderingContext, glS: GLState, pixelCount: number, nextPixelPartUsed: 1 | 2 | 3 | 4) => {
    let contextMap = errorMeasurerShaderPrograms.get(gl);
    if (typeof contextMap === 'undefined') {
        contextMap = new Map();
        errorMeasurerShaderPrograms.set(gl, contextMap);
    }
    let errorMeasurerShaderProgram = contextMap.get(`${pixelCount} ${nextPixelPartUsed}`);
    if (typeof errorMeasurerShaderProgram === 'undefined') {
        errorMeasurerShaderProgram = new ErrorMeasurerShaderProgram(gl, glS, pixelCount, nextPixelPartUsed);
        contextMap.set(`${pixelCount} ${nextPixelPartUsed}`, errorMeasurerShaderProgram);
    } else {
        errorMeasurerShaderProgram.ref();
    }
    return errorMeasurerShaderProgram;
};

export {
    getErrorMeasurerProgram,
    ErrorMeasurerShaderProgram
};