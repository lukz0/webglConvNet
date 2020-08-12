import ConvNet from "../ConvNet/ConvNet";
import textureUseNearest from "../glUtils/textureUseNearest";
import { ErrorMeasurerShaderProgram, getErrorMeasurerProgram } from "../shaderPrograms/ErrorMeasurerShaderProgram";

class ErrorMeasurer {
    cn: ConvNet;
    shaderFull: ErrorMeasurerShaderProgram;
    shaderPartial: ErrorMeasurerShaderProgram;

    size: number;
    fullPixels: number;
    partialSize: 0 | 1 | 2 | 3;

    answerTexture: WebGLTexture;
    errorFb: WebGLFramebuffer;
    errorTexture: WebGLTexture;

    constructor(cn: ConvNet) {
        this.cn = cn;
        this.size = cn.layerSizes[cn.layerSizes.length - 1];
        this.fullPixels = Math.floor(this.size / 4);
        this.partialSize = this.size % 4 as 0 | 1 | 2 | 3;

        this.shaderFull = this.fullPixels === 0
            ? null
            : getErrorMeasurerProgram(cn.gl, cn.glS, Math.ceil(this.size / 4), 4);
        this.shaderPartial = this.partialSize === 0
            ? null
            : getErrorMeasurerProgram(cn.gl, cn.glS, Math.ceil(this.size / 4), this.partialSize);

        this.answerTexture = cn.gl.createTexture();
        cn.glS.setActiveTexture2D(this.answerTexture);
        textureUseNearest(cn.gl);
        cn.gl.texImage2D(cn.gl.TEXTURE_2D, 0, cn.gl.RGBA, 1, Math.ceil(this.size / 4), 0, cn.gl.RGBA, cn.gl.FLOAT, null);

        this.errorFb = cn.gl.createFramebuffer();
        cn.glS.setActiveFramebuffer(this.errorFb);

        this.errorTexture = cn.gl.createTexture();
        cn.glS.setActiveTexture2D(this.errorTexture);
        textureUseNearest(cn.gl);
        cn.gl.texImage2D(cn.gl.TEXTURE_2D, 0, cn.gl.RGBA, 1, Math.ceil(this.size / 4), 0, cn.gl.RGBA, cn.gl.FLOAT, null);
        cn.gl.framebufferTexture2D(cn.gl.FRAMEBUFFER, cn.gl.COLOR_ATTACHMENT0, cn.gl.TEXTURE_2D, this.errorTexture, 0);
    }

    // ConvNet doesn't get deleted
    delete() {
        this.cn.gl.deleteFramebuffer(this.errorFb);
        this.cn.gl.deleteTexture(this.errorTexture);
        this.cn.gl.deleteTexture(this.answerTexture);
        if (this.shaderFull !== null) this.shaderFull.unRef();
        if (this.shaderPartial !== null) this.shaderPartial.unRef();
    }

    run() {
        if (this.shaderFull !== null) {
            this.shaderFull.run(this.cn.layers[this.cn.layers.length - 1].outputTexture, this.answerTexture, this.errorFb, 0, this.fullPixels);
        }
        if (this.shaderPartial !== null) {
            this.shaderPartial.run(this.cn.layers[this.cn.layers.length - 1].outputTexture, this.answerTexture, this.errorFb, this.fullPixels, 1);
        }
    }
}

export default ErrorMeasurer;