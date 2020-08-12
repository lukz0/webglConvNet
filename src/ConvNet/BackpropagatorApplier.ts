import Backpropagator from "./Backpropagator";
import NeuronLayerBackpropagationApplier from "./NeuronLayerBackpropagationApplier";

class BackpropagatorApplier {
    b: Backpropagator;
    nlba: NeuronLayerBackpropagationApplier[];

    biasProxy: { [n: number]: WebGLTexture };
    weightProxy: { [n: number]: WebGLTexture };

    constructor(b: Backpropagator) {
        this.b = b;

        this.nlba = Array.from({
            [Symbol.iterator]: function* () {
                for (let i = b.convNet.layers.length - 1; i >= 0; i--)
                    yield new NeuronLayerBackpropagationApplier(b.convNet.layers[i], b.convNet.layerSizes[i + 1], b.convNet.layerSizes[i]);
            }
        });

        this.biasProxy = new Proxy({} as { [n: number]: WebGLTexture }, {
            get: ({ }, i: number) =>
                i === 0
                    ? b.costDerivLastZ.currentTexture
                    : b.costDerivZ[i - 1].currentTexture
        });

        this.weightProxy = new Proxy({} as { [n: number]: WebGLTexture }, {
            get: ({ }, i: number) =>
                b.costDerivWeights[i].currentTexture
        });
    }

    run(weightAmount: number, biasAmount: number) {
        this.nlba.forEach((a, i) => a.run(this.biasProxy[i], this.weightProxy[i], weightAmount, biasAmount));
    }

    delete() {
        this.nlba.forEach(a => a.delete());
    }
}

export default BackpropagatorApplier;