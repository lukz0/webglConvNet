import { activationF, customActivationF } from './activationFunctions';
import NeuronLayer from './NeuronLayer';
import GLState from '../GLState';
import textureUseNearest from '../glUtils/textureUseNearest';
import drawbuffersext_t from '../drawbuffersext_t';

class ConvNet {
    layers: NeuronLayer[];
    inputTexture: WebGLTexture;
    gl: WebGLRenderingContext;
    glS: GLState;
    layerSizes: number[];
    layerFunctions: (activationF | customActivationF)[];

    drawBuffersExt: drawbuffersext_t;

    constructor(gl: WebGLRenderingContext, glS: GLState, layerSizes: number[], layerFunctions: (activationF | customActivationF)[], drawBuffersExt: drawbuffersext_t) {
        this.gl = gl;
        this.glS = glS;
        this.layerSizes = layerSizes;
        this.layerFunctions = layerFunctions;
        this.drawBuffersExt = drawBuffersExt;
        this.inputTexture = gl.createTexture();
        glS.setActiveTexture2D(this.inputTexture);
        textureUseNearest(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, Math.ceil(layerSizes[0] / 4), 0, gl.RGBA, gl.FLOAT, null);

        this.layers = layerFunctions.map(
            (layerFunction, i) => new NeuronLayer(gl, glS, layerSizes[i], layerSizes[i + 1], layerFunction, drawBuffersExt)
        );
    }

    run() {
        this.layers[0].run(this.inputTexture);
        this.layers.slice(1).forEach(
            (l, i, ls) => l.run(ls[i - 1].outputTexture)
        );
    }

    delete() {
        this.gl.deleteTexture(this.inputTexture);
        this.layers.forEach(l => l.delete());
    }
}

export default ConvNet;