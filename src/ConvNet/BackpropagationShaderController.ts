import GLState from "../GLState";
import textureUseNearest from "../glUtils/textureUseNearest";
import drawbuffersext_t from '../drawbuffersext_t';

class BackpropagationShaderController {
    current: boolean = false;
    fb: WebGLFramebuffer;
    outputTextures: [WebGLTexture, WebGLTexture];
    outputTextureNotMixed: WebGLTexture;

    gl: WebGLRenderingContext;
    glS: GLState;

    drawBuffersExt: drawbuffersext_t;

    constructor(gl: WebGLRenderingContext, glS: GLState, outWidth: number, outHeight: number, drawBuffersExt: drawbuffersext_t) {
        this.drawBuffersExt = drawBuffersExt;
        this.gl = gl;
        this.glS = glS;

        this.fb = gl.createFramebuffer();
        this.outputTextures = [
            gl.createTexture(),
            gl.createTexture()
        ];
        this.outputTextureNotMixed = gl.createTexture();

        [...this.outputTextures, this.outputTextureNotMixed].forEach(t => {
            glS.setActiveTexture2D(t);
            textureUseNearest(gl);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.ceil(outWidth / 4), Math.ceil(outHeight / 4), 0, gl.RGBA, gl.FLOAT, null);
        });
        glS.setActiveFramebuffer(this.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, drawBuffersExt.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.outputTextureNotMixed, 0);
    }

    changeCurrentTexture() {
        this.current = this.current;
        this.glS.setActiveFramebuffer(this.fb);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.drawBuffersExt.COLOR_ATTACHMENT0_WEBGL, this.gl.TEXTURE_2D, this.currentTexture, 0);
    }

    delete() {
        this.gl.deleteFramebuffer(this.fb);
        [...this.outputTextures, this.outputTextureNotMixed].forEach(t => this.gl.deleteTexture(t));
    }

    get nonCurrectTexture() {
        return this.outputTextures[Number(!this.current)];
    }

    get currentTexture() {
        return this.outputTextures[Number(this.current)];
    }
}

export default BackpropagationShaderController;