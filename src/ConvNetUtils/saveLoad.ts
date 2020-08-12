import ConvNet from '../ConvNet/ConvNet';
import GLState from '../GLState';
import { activationF, customActivationF } from '../ConvNet/activationFunctions';
import * as toPixels from '../glUtils/toPixels';
import * as fromPixels from '../glUtils/fromPixels';
import drawbuffersext_t from '../drawbuffersext_t';

/*
{
    "sizes": [size1, ...sizeN],
    "functions": [funcEnum, ["custom", "custom2"], ...funcN],
    "weights": [[0, 0.5, 4...], [3, -6, 3...]...],
    "biases": [[0, 0.5, 4...], [3, -6, 3...]...]
}
 */

type netInfo_t = {
    "sizes": number[],
    "functions": (activationF | [string, string])[],
    "weights": number[][],
    "biases": number[][]
};

const loadConvNet = (gl: WebGLRenderingContext, glS: GLState, netInfo: netInfo_t, drawBuffersExtension: drawbuffersext_t) => {
    const result = new ConvNet(gl, glS, netInfo.sizes, netInfo.functions.map(f =>
        f instanceof Array
            ? f.map(fCode => new Function(`return ${fCode}`)()) as customActivationF
            : f
    ), drawBuffersExtension);
    netInfo.sizes.slice(1).forEach((size: number, i: number) => {
        glS.setActiveTexture2D(result.layers[i].weightMatrix);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Math.ceil(netInfo.sizes[i] / 4), size, gl.RGBA, gl.FLOAT, toPixels.mat(
            netInfo.sizes[i],
            netInfo.weights[i]
        ));

        glS.setActiveTexture2D(result.layers[i].bias);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, Math.ceil(size / 4), gl.RGBA, gl.FLOAT, toPixels.vec(
            netInfo.biases[i]
        ));
    });
    return result;
};

const saveConvNet = (convNet: ConvNet) => {
    const fb = convNet.gl.createFramebuffer();
    convNet.glS.setActiveFramebuffer(fb);

    const result: netInfo_t = {
        "sizes": convNet.layerSizes,
        "functions": convNet.layerFunctions.map(f =>
            f instanceof Array
                ? f.map(customF => customF.toString()) as [string, string]
                : f
        ),
        "weights": [],
        "biases": []
    };

    convNet.layers.forEach((layer, i) => {
        const previousPixels = Math.ceil(convNet.layerSizes[i] / 4),
            nextPixels = Math.ceil(convNet.layerSizes[i + 1] / 4);

        convNet.glS.setActiveTexture2D(layer.weightMatrix);
        convNet.gl.framebufferTexture2D(convNet.gl.FRAMEBUFFER, convNet.gl.COLOR_ATTACHMENT0, convNet.gl.TEXTURE_2D, layer.weightMatrix, 0);

        let pixels = new Float32Array(previousPixels * convNet.layerSizes[i + 1] * 4 * 4);
        convNet.gl.readPixels(0, 0, previousPixels, convNet.layerSizes[i + 1], convNet.gl.RGBA, convNet.gl.FLOAT, pixels);
        result.weights.push(fromPixels.mat(convNet.layerSizes[i], convNet.layerSizes[i + 1], pixels));

        convNet.glS.setActiveTexture2D(layer.bias);
        convNet.gl.framebufferTexture2D(convNet.gl.FRAMEBUFFER, convNet.gl.COLOR_ATTACHMENT0, convNet.gl.TEXTURE_2D, layer.bias, 0);

        pixels = new Float32Array(nextPixels * 4);
        convNet.gl.readPixels(0, 0, 1, nextPixels, convNet.gl.RGBA, convNet.gl.FLOAT, pixels);
        result.biases.push(fromPixels.vec(convNet.layerSizes[i + 1], pixels));
    });
    convNet.gl.deleteFramebuffer(fb);

    return result;
};

export {
    loadConvNet,
    saveConvNet,
    netInfo_t
};