import { NeuronLayerShaderProgram, getNeuronLayerProgram } from '../shaderPrograms/NeuronLayerShaderProgram';
import textureUseNearest from '../glUtils/textureUseNearest';
import GLState from '../GLState';
import { activationF, customActivationF } from './activationFunctions';
import drawbuffersext_t from '../drawbuffersext_t';

class NeuronLayer {
    gl: WebGLRenderingContext;
    glS: GLState;

    weightMatrix: WebGLTexture;
    bias: WebGLTexture;
    output: WebGLFramebuffer;
    outputTexture: WebGLTexture;
    outputTextureNoSigmoid: WebGLTexture;

    fullShader: NeuronLayerShaderProgram;
    partialShader: NeuronLayerShaderProgram;

    outputPixels: number;
    outputSize: number;
    inputPixels: number;

    drawBuffersExtension: Object;

    constructor(gl: WebGLRenderingContext, glS: GLState, inputSize: number, outputSize: number, f: activationF | customActivationF, drawBuffersExtension: drawbuffersext_t) {
        this.outputSize = outputSize;
        this.drawBuffersExtension = drawBuffersExtension;
        this.gl = gl;
        this.glS = glS;
        this.outputPixels = Math.ceil(outputSize / 4);
        this.inputPixels = Math.ceil(inputSize / 4);

        this.weightMatrix = gl.createTexture();
        glS.setActiveTexture2D(this.weightMatrix);
        textureUseNearest(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.ceil(inputSize / 4), outputSize, 0, gl.RGBA, gl.FLOAT, null);

        this.bias = gl.createTexture();
        glS.setActiveTexture2D(this.bias);
        textureUseNearest(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, Math.ceil(outputSize / 4), 0, gl.RGBA, gl.FLOAT, null);

        this.output = gl.createFramebuffer();
        glS.setActiveFramebuffer(this.output);

        this.outputTexture = gl.createTexture();
        if (drawBuffersExtension === null) {
            this.outputTextureNoSigmoid = null;
            glS.setActiveTexture2D(this.outputTexture);
            textureUseNearest(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, Math.ceil(outputSize / 4), 0, gl.RGBA, gl.FLOAT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputTexture, 0);
        } else {
            this.outputTextureNoSigmoid = gl.createTexture();

            glS.setActiveTexture2D(this.outputTexture);
            textureUseNearest(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, Math.ceil(outputSize / 4), 0, gl.RGBA, gl.FLOAT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExtension.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.outputTexture, 0);

            glS.setActiveTexture2D(this.outputTextureNoSigmoid);
            textureUseNearest(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, Math.ceil(outputSize / 4), 0, gl.RGBA, gl.FLOAT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExtension.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.outputTextureNoSigmoid, 0);
        }

        const fullOutputPixels = Math.floor(outputSize / 4);
        const partialOutputSize = inputSize % 4 as 0 | 1 | 2 | 3;

        this.fullShader = fullOutputPixels === 0
            ? null
            : getNeuronLayerProgram(gl, glS, inputSize, 4, f, drawBuffersExtension instanceof Object);

        this.partialShader = partialOutputSize === 0
            ? null
            : getNeuronLayerProgram(gl, glS, inputSize, partialOutputSize, f, drawBuffersExtension instanceof Object);
    }

    delete() {
        this.fullShader.unRef();
        this.partialShader.unRef();
        this.gl.deleteFramebuffer(this.output);
        this.gl.deleteTexture(this.outputTexture);
        this.gl.deleteTexture(this.weightMatrix);
        this.gl.deleteTexture(this.bias);
    }

    run(previousLayer: WebGLTexture) {
        if (this.fullShader !== null) {
            this.fullShader.run(previousLayer, this.weightMatrix, this.bias, this.outputPixels, this.output, this.outputSize, 0, this.outputPixels - (this.partialShader === null ? 0 : 1));
        }
        if (this.partialShader !== null) {
            this.partialShader.run(previousLayer, this.weightMatrix, this.bias, this.outputPixels, this.output, this.outputSize, this.outputPixels - 1, 1);
        }
    }
}

export default NeuronLayer;