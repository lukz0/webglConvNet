import BackpropagationShaderController from "./BackpropagationShaderController";

import { CostDerivLastZShaderProgram, getCostDerivLastZShaderProgram } from '../shaderPrograms/CostDerivLastZ';
import ConvNet from "./ConvNet";
import NeuronLayer from "./NeuronLayer";

class CostDerivLastZ extends BackpropagationShaderController {
    outputWholePixels: number;
    outputPartialUsed: 0 | 1 | 2 | 3;

    lastLayer: NeuronLayer;

    wholeShader: CostDerivLastZShaderProgram;
    partialShader: CostDerivLastZShaderProgram;

    constructor(convNet: ConvNet) {
        const outputHeight = convNet.layerSizes[convNet.layerSizes.length - 1],
            outputFunc = convNet.layerFunctions[convNet.layerFunctions.length - 1];
        super(convNet.gl, convNet.glS, 1, outputHeight, convNet.drawBuffersExt);

        this.outputWholePixels = Math.floor(outputHeight / 4);
        this.outputPartialUsed = outputHeight % 4 as 0 | 1 | 2 | 3;

        this.wholeShader = this.outputWholePixels === 0
            ? null
            : getCostDerivLastZShaderProgram(convNet.gl, convNet.glS, Math.ceil(outputHeight / 4), 4, outputFunc);
        this.partialShader = this.outputPartialUsed === 0
            ? null
            : getCostDerivLastZShaderProgram(convNet.gl, convNet.glS, Math.ceil(outputHeight / 4), this.outputPartialUsed, outputFunc);
        this.lastLayer = convNet.layers[convNet.layers.length - 1];
    }

    run(significance: number, correct: WebGLTexture) {
        this.changeCurrentTexture();

        if (this.wholeShader !== null) {
            this.wholeShader.run(this.fb, this.lastLayer.outputTexture, correct, this.lastLayer.outputTextureNoSigmoid, this.nonCurrectTexture, significance, 0, this.outputWholePixels);
        }
        if (this.partialShader !== null) {
            this.partialShader.run(this.fb, this.lastLayer.outputTexture, correct, this.lastLayer.outputTextureNoSigmoid, this.nonCurrectTexture, significance, this.outputWholePixels, 1);
        }
    }

    delete() {
        super.delete();
        if (this.wholeShader !== null) this.wholeShader.unRef();
        if (this.partialShader !== null) this.partialShader.unRef();
    }
}

export default CostDerivLastZ;