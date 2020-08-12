import ShaderProgram from "./shaderProgram";
import GLState from "../GLState";
import texture_n_t from './texture_n_t';

import vertexCode from './shaderCode/matriceVertex.glsl';
import fragmentCode from './shaderCode/backpropagationApplierFragment.glsl';

const vertices = Float32Array.of(
    -1, 1, // upper left
    -1, -1, // lower left
    1, -1, // lower right
    1, 1 // upper right
);

const COST_DERIV_TEXTURE_N = 'TEXTURE0' as texture_n_t,
    OLD_TEXTURE_N = 'TEXTURE1' as texture_n_t,
    UNUSED_TEXTURE_2 = 'TEXTURE2' as texture_n_t,
    UNUSED_TEXTURE_3 = 'TEXTURE3' as texture_n_t;

const TEXTURE_N_int: { [texture_n: string]: number } = {
    [COST_DERIV_TEXTURE_N]: 0,
    [OLD_TEXTURE_N]: 1,
    [UNUSED_TEXTURE_2]: 2,
    [UNUSED_TEXTURE_3]: 3
};

const backpropagationApplierShaderPrograms: WeakMap<WebGLRenderingContext, BackpropagationApplierShaderProgram> = new WeakMap();

class BackpropagationApplierShaderProgram extends ShaderProgram {
    gl: WebGLRenderingContext;
    glS: GLState;

    heightLocation: WebGLUniformLocation;
    widthLocation: WebGLUniformLocation;
    significanceLocation: WebGLUniformLocation;
    height: number;
    width: number;
    significance: number;

    vertexBuffer: WebGLBuffer;

    refs: number;

    constructor(gl: WebGLRenderingContext, glS: GLState) {
        super(gl, glS, vertexCode, fragmentCode);

        this.refs = 1;

        this.gl = gl;
        this.glS = glS;

        const costDerivLocation = gl.getUniformLocation(this.glShaderProgram, 'cost_deriv');
        const oldTextureLocation = gl.getUniformLocation(this.glShaderProgram, 'texture_old');
        this.widthLocation = gl.getUniformLocation(this.glShaderProgram, 'texture_width');
        this.heightLocation = gl.getUniformLocation(this.glShaderProgram, 'texture_height');
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

        gl.uniform1i(costDerivLocation, TEXTURE_N_int[COST_DERIV_TEXTURE_N]);
        gl.uniform1i(oldTextureLocation, TEXTURE_N_int[OLD_TEXTURE_N]);

        gl.uniform1f(this.heightLocation, 0);
        this.height = 0;
        gl.uniform1f(this.widthLocation, 0);
        this.width = 0;
        gl.uniform1f(this.significanceLocation, 0);
        this.significance = 0;
    }

    run(target: WebGLFramebuffer, costDeriv: WebGLTexture, oldTexture: WebGLTexture, width: number, height: number, significance: number) {
        this.glS.setActiveFramebuffer(target);
        this.glS.setProgram(this.glShaderProgram);
        this.glS.setActiveTexture(costDeriv, COST_DERIV_TEXTURE_N);
        this.glS.setActiveTexture(costDeriv, OLD_TEXTURE_N);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_2);
        this.glS.setActiveTexture(null, UNUSED_TEXTURE_3);

        if (this.height !== height) {
            this.gl.uniform1f(this.heightLocation, height);
            this.height = height;
        }
        if (this.width !== width) {
            this.gl.uniform1f(this.widthLocation, width);
            this.width = width;
        }
        if (this.significance !== significance) {
            this.gl.uniform1f(this.significanceLocation, significance);
            this.significance = significance;
        }

        this.glS.setViewport(0, 0, width, height);

        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    ref() {
        this.refs++;
    }

    unRef() {
        this.refs--;
        if (this.refs >= 0) {
            backpropagationApplierShaderPrograms.delete(this.gl);
            this.delete();
            this.gl.deleteBuffer(this.vertexBuffer);
        }
    }
}

const getBackpropagationApplierShaderProgram = (gl: WebGLRenderingContext, glS: GLState) => {
    let backpropagationApplierShaderProgram = backpropagationApplierShaderPrograms.get(gl);
    if (typeof backpropagationApplierShaderProgram === 'undefined') {
        backpropagationApplierShaderProgram = new BackpropagationApplierShaderProgram(gl, glS);
        backpropagationApplierShaderPrograms.set(gl, backpropagationApplierShaderProgram);
    } else {
        backpropagationApplierShaderProgram.ref();
    }
    return backpropagationApplierShaderProgram;
}

export {
    BackpropagationApplierShaderProgram,
    getBackpropagationApplierShaderProgram
};