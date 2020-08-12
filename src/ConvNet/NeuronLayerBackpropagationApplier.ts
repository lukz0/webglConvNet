import NeuronLayer from "./NeuronLayer";
import textureUseNearest from "../glUtils/textureUseNearest";
import { BackpropagationApplierShaderProgram, getBackpropagationApplierShaderProgram } from "../shaderPrograms/BackpropagationApplierShaderProgram";

class NeuronLayerBackpropagationApplier {
    bias: WebGLTexture;
    weightMatrix: WebGLTexture;
    nl: NeuronLayer;

    fb: WebGLFramebuffer;

    shader: BackpropagationApplierShaderProgram;

    size: number;
    previousSize: number;

    constructor(nl: NeuronLayer, size: number, previousSize: number) {
        this.nl = nl;

        this.fb = nl.gl.createFramebuffer();
        this.bias = nl.gl.createTexture();
        nl.glS.setActiveTexture2D(this.bias);
        textureUseNearest(nl.gl);
        nl.gl.texImage2D(nl.gl.TEXTURE_2D, 0, nl.gl.RGBA, 1, Math.ceil(size / 4), 0, nl.gl.RGBA, nl.gl.FLOAT, null);

        this.weightMatrix = nl.gl.createTexture();
        nl.glS.setActiveTexture2D(this.bias);
        textureUseNearest(nl.gl);
        nl.gl.texImage2D(nl.gl.TEXTURE_2D, 0, nl.gl.RGBA, Math.ceil(previousSize / 4), size, 0, nl.gl.RGBA, nl.gl.FLOAT, null);

        this.shader = getBackpropagationApplierShaderProgram(nl.gl, nl.glS);
        this.size = size;
        this.previousSize = previousSize;
    }

    run(costDerivBias: WebGLTexture, costDerivWeights: WebGLTexture, weightSignificance: number, biasSignificance: number) {
        this.nl.glS.setActiveFramebuffer(this.fb);
        this.nl.gl.framebufferTexture2D(this.nl.gl.FRAMEBUFFER, this.nl.gl.COLOR_ATTACHMENT0, this.nl.gl.TEXTURE_2D, this.bias, 0);
        this.shader.run(this.fb, costDerivBias, this.nl.bias, 1, Math.ceil(this.size / 4), biasSignificance);

        this.nl.gl.framebufferTexture2D(this.nl.gl.FRAMEBUFFER, this.nl.gl.COLOR_ATTACHMENT0, this.nl.gl.TEXTURE_2D, this.weightMatrix, 0);
        this.shader.run(this.fb, costDerivWeights, this.nl.weightMatrix, Math.ceil(this.previousSize / 4), this.size, weightSignificance);

        [this.bias, this.nl.bias] = [this.nl.bias, this.bias];
        [this.weightMatrix, this.nl.weightMatrix] = [this.nl.weightMatrix, this.weightMatrix];
    }

    delete() {
        this.nl.gl.deleteTexture(this.bias);
        this.nl.gl.deleteTexture(this.weightMatrix);
        this.nl.gl.deleteFramebuffer(this.fb);
        this.shader.unRef();
    }
}

export default NeuronLayerBackpropagationApplier;