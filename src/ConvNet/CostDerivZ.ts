import BackpropagationShaderController from "./BackpropagationShaderController";
import ConvNet from "./ConvNet";
import { CostDerivZShaderProgram, getCostDerivZShaderProgram } from "../shaderPrograms/CostDerivZ";

class CostDerivZ extends BackpropagationShaderController {
    shaderFull: CostDerivZShaderProgram;
    shaderPartial: CostDerivZShaderProgram;

    fullOutPixels: number;

    weights: WebGLTexture;
    zL: WebGLTexture;

    constructor(convNet: ConvNet, i: number) {
        const outSize = convNet.layerSizes[i],
            derivZlsize = convNet.layerSizes[i + 1],
            fullOutPixels = Math.floor(outSize / 4),
            partialSize = outSize % 4 as 0 | 1 | 2 | 3,
            f = convNet.layerFunctions[i];
        super(convNet.gl, convNet.glS, 1, outSize, convNet.drawBuffersExt);

        this.shaderFull = fullOutPixels === 0
            ? null
            : getCostDerivZShaderProgram(convNet.gl, convNet.glS, outSize, derivZlsize, 4, f);
        this.shaderPartial = partialSize === 0
            ? null
            : getCostDerivZShaderProgram(convNet.gl, convNet.glS, outSize, derivZlsize, partialSize, f);

        this.fullOutPixels = fullOutPixels;
        this.weights = convNet.layers[i + 1].weightMatrix;
        this.zL = convNet.layers[i].outputTextureNoSigmoid;
    }

    run(zDerivPlus1: WebGLTexture, significance: number) {
        this.changeCurrentTexture();

        if (this.shaderFull !== null) {
            this.shaderFull.run(this.fb, this.weights, zDerivPlus1, this.zL, this.nonCurrectTexture, significance, 0, this.fullOutPixels);
        }
        if (this.shaderPartial !== null) {
            this.shaderPartial.run(this.fb, this.weights, zDerivPlus1, this.zL, this.nonCurrectTexture, significance, this.fullOutPixels, 1);
        }
    }

    delete() {
        super.delete();
        if (this.shaderFull !== null) this.shaderFull.unRef();
        if (this.shaderPartial !== null) this.shaderPartial.unRef();
    }
}

export default CostDerivZ;