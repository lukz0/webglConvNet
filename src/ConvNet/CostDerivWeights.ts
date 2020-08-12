import BackpropagationShaderController from "./BackpropagationShaderController";
import ConvNet from "./ConvNet";
import { CostDerivWeightsShaderProgram, getCostDerivWeightsShaderProgram } from '../shaderPrograms/CostDerivWeights';

class CostDerivWeights extends BackpropagationShaderController {
    shaderFull: CostDerivWeightsShaderProgram;
    shaderPartial: CostDerivWeightsShaderProgram;

    previousTexture: WebGLTexture;

    fullPixelWidth: number;

    constructor(convNet: ConvNet, i: number) {
        const fullPixelWidth = Math.floor(convNet.layerSizes[i] / 4),
            partialWidthUsed = convNet.layerSizes[i] % 4 as 0 | 1 | 2 | 3,
            height = convNet.layerSizes[i + 1] * 4,
            width = convNet.layerSizes[i];

        super(convNet.gl, convNet.glS, width, height, convNet.drawBuffersExt);

        this.shaderFull = fullPixelWidth === 0
            ? null
            : getCostDerivWeightsShaderProgram(convNet.gl, convNet.glS, height, width, 4);
        this.shaderPartial = partialWidthUsed === 0
            ? null
            : getCostDerivWeightsShaderProgram(convNet.gl, convNet.glS, height, width, partialWidthUsed);

        this.previousTexture = i === 0
            ? convNet.inputTexture
            : convNet.layers[i - 1].outputTexture;

        this.fullPixelWidth = fullPixelWidth;
    }

    run(costDerivzL: WebGLTexture, significance: number) {
        this.changeCurrentTexture();

        if (this.shaderFull !== null) {
            this.shaderFull.run(this.fb, this.previousTexture, costDerivzL, this.nonCurrectTexture, significance, 0, this.fullPixelWidth);
        }
        if (this.shaderPartial !== null) {
            this.shaderPartial.run(this.fb, this.previousTexture, costDerivzL, this.nonCurrectTexture, significance, this.fullPixelWidth, 1);
        }
    }

    delete() {
        super.delete();
        if (this.shaderFull !== null) this.shaderFull.unRef();
        if (this.shaderPartial !== null) this.shaderPartial.unRef();
    }
}

export default CostDerivWeights;