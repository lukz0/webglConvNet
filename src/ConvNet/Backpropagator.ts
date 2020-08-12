import ErrorMeasurer from './ErrorMeasurer';
import ConvNet from './ConvNet';
import CostDerivLastZ from './CostDerivLastZ';
import CostDerivWeights from './CostDerivWeights';
import CostDerivZ from './CostDerivZ';
import BackpropagatorApplier from './BackpropagatorApplier';

class Backpropagator {
    convNet: ConvNet;

    em: ErrorMeasurer;
    costDerivLastZ: CostDerivLastZ;

    costDerivWeights: CostDerivWeights[];
    costDerivZ: CostDerivZ[];

    runAmount: number = 0;

    applier: BackpropagatorApplier;

    constructor(convNet: ConvNet) {
        this.convNet = convNet;
        // TODO: use this...
        this.em = new ErrorMeasurer(convNet);

        this.costDerivLastZ = new CostDerivLastZ(convNet);

        this.costDerivWeights = new Array(convNet.layers.length);
        this.costDerivZ = new Array(convNet.layers.length - 1);

        for (let i = 0; i < convNet.layers.length - 2; i++) {
            this.costDerivWeights[i] = new CostDerivWeights(convNet, i);
            this.costDerivZ[i] = new CostDerivZ(convNet, i);
        }
        let i = convNet.layers.length - 1;
        this.costDerivWeights[i] = new CostDerivWeights(convNet, i);

        this.applier = new BackpropagatorApplier(this);
    }

    run(correct: WebGLTexture) {
        const significance = 1 / ++this.runAmount;
        this.costDerivLastZ.run(significance, correct);

        let zDerivPlus1: WebGLTexture = this.costDerivLastZ.outputTextureNotMixed;
        this.costDerivWeights[this.costDerivWeights.length - 1].run(zDerivPlus1, significance);
        for (let i = this.costDerivZ.length - 1; i >= 0; i--) {
            this.costDerivZ[i].run(zDerivPlus1, significance);
            zDerivPlus1 = this.costDerivZ[i].outputTextureNotMixed;
            this.costDerivWeights[i].run(zDerivPlus1, significance);
        }
    }

    apply(weightAmount?: number, biasAmount?: number) {
        if (typeof weightAmount === 'undefined') weightAmount = 0.01;
        if (typeof biasAmount === 'undefined') biasAmount = 0.01;

        this.applier.run(weightAmount, biasAmount);

        this.runAmount = 0;
    }

    delete() {
        [this.em, this.costDerivLastZ, this.applier, ...this.costDerivWeights, ...this.costDerivZ]
            .forEach(deletable => deletable.delete());
    }
}

export default Backpropagator;