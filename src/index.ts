import createContext from './createContext';
import { activationF } from './ConvNet/activationFunctions';
import ConvNet from './ConvNet/ConvNet';
import * as toPixels from './glUtils/toPixels';
import { saveConvNet, loadConvNet } from './ConvNetUtils/saveLoad';

import errorPrint from './glUtils/errorPrint';
import ErrorMeasurer from './ConvNet/ErrorMeasurer';
import Backpropagator from './ConvNet/Backpropagator';
import textureUseNearest from './glUtils/textureUseNearest';

const [gl, glS] = createContext();

if (!gl.getExtension('OES_texture_float'))
    console.error('OES_texture_float is required but getExtension(\'OES_texture_float\') returned null');

const drawBuffersExt = gl.getExtension('WEBGL_draw_buffers') || gl.getExtension('MOZ_WEBGL_draw_buffers');
if (!drawBuffersExt)
    console.warn('WEBGL_draw_buffers aren\'t available');
gl.getExtension('WEBGL_color_buffer_float');

const cnn = new ConvNet(gl, glS, [5, 5], [activationF.identity], null);

glS.setActiveTexture2D(cnn.layers[0].weightMatrix);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2, 5, gl.RGBA, gl.FLOAT, toPixels.mat(5, [
    0, 0, 0, 0, 1,
    0, 0, 0, 1, 0,
    0, 0, 1, 0, 0,
    0, 1, 0, 0, 0,
    1, 0, 0, 0, 0
]));

glS.setActiveTexture2D(cnn.layers[0].bias);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 2, gl.RGBA, gl.FLOAT, toPixels.vec([
    0, 0, 0, 0, 0
]));

glS.setActiveTexture2D(cnn.inputTexture);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 2, gl.RGBA, gl.FLOAT, toPixels.vec([
    5, 4, 3, 2, 1
]));

cnn.run();

glS.setActiveFramebuffer(cnn.layers[0].output);
const result = new Float32Array(8);
gl.readPixels(0, 0, 1, 2, gl.RGBA, gl.FLOAT, result);
console.log(...result);

const netInfo = JSON.stringify(saveConvNet(cnn));
cnn.delete();

console.log(netInfo);

const cnn2 = loadConvNet(gl, glS, JSON.parse(netInfo), drawBuffersExt);

glS.setActiveTexture2D(cnn2.inputTexture);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 2, gl.RGBA, gl.FLOAT, toPixels.vec([
    5, 4, 3, 2, 1
]));
cnn2.run();

const result2 = new Float32Array(8);
gl.readPixels(0, 0, 1, 2, gl.RGBA, gl.FLOAT, result2);
console.log(...result2);

const errorMeasurer = new ErrorMeasurer(cnn2);
glS.setActiveTexture2D(errorMeasurer.answerTexture);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 2, gl.RGBA, gl.FLOAT, toPixels.vec([
    10, 10, 10, 10, 10
]));
errorMeasurer.run();

errorPrint(gl.getError(), gl);

glS.setActiveFramebuffer(errorMeasurer.errorFb);
const errorVec = new Float32Array(8);
gl.readPixels(0, 0, 1, 2, gl.RGBA, gl.FLOAT, errorVec);
console.log('Error vector:', ...errorVec);

console.log(JSON.stringify(saveConvNet(cnn2)));

const backpropagator = new Backpropagator(cnn2);

backpropagator.run(errorMeasurer.answerTexture);
errorPrint(gl.getError(), gl);
backpropagator.apply();
cnn2.run();

errorMeasurer.run();

glS.setActiveFramebuffer(errorMeasurer.errorFb);
const errorVec2 = new Float32Array(8);
gl.readPixels(0, 0, 1, 2, gl.RGBA, gl.FLOAT, errorVec2);
console.log('Error vector2:', ...errorVec);

backpropagator.delete();
errorMeasurer.delete();
cnn2.delete();
errorPrint(gl.getError(), gl);
console.log(gl.getSupportedExtensions());