import texture_n_t from './shaderPrograms/texture_n_t';
import { timeStamp } from 'console';

class GLState {
    gl: WebGLRenderingContext = null;

    program: WebGLProgram = null;
    arrayBuffer: WebGLBuffer = null;
    t: Map<texture_n_t, WebGLTexture> = new Map();
    t2D: WebGLTexture = null;
    framebuffer: WebGLFramebuffer = null;

    viewportX: number = -1;
    viewportY: number = -1;
    viewportWidth: number = -1;
    viewportHeight: number = -1;
    activeTexture: texture_n_t = 'TEXTURE0';

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    setProgram(program: WebGLProgram) {
        if (this.program !== program) {
            this.gl.useProgram(program);
            this.program = program;
        }
    }

    setActiveArrayBuffer(arrayBuffer: WebGLBuffer) {
        if (this.arrayBuffer !== arrayBuffer) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, arrayBuffer);
            this.arrayBuffer = arrayBuffer;
        }
    }

    setActiveTexture(t: WebGLTexture, n: texture_n_t) {
        if (this.t.get(n) !== t) {
            this.gl.activeTexture(this.gl[n]);
            this.activeTexture = n;
            this.gl.bindTexture(this.gl.TEXTURE_2D, t);
            this.t.set(n, t);
        }
    }

    setActiveTexture2D(t: WebGLTexture) {
        if (this.t2D !== t) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, t);
            this.t2D = t;
            this.t.set(this.activeTexture, t);
        }
    }

    setActiveFramebuffer(framebuffer: WebGLFramebuffer) {
        if (this.framebuffer !== framebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
            this.framebuffer = framebuffer;
        }
    }

    setViewport(x: number, y: number, width: number, height: number) {
        let viewportUpdated = false;
        if (this.viewportX !== x) {
            this.viewportX = x;
            viewportUpdated = true;
        }
        if (this.viewportY !== y) {
            this.viewportY = y;
            viewportUpdated = true;
        }
        if (this.viewportWidth !== width) {
            this.viewportWidth = width;
            viewportUpdated = true;
        }
        if (this.viewportHeight !== height) {
            this.viewportHeight = height;
            viewportUpdated = true;
        }
        if (viewportUpdated) {
            this.gl.viewport(this.viewportX, this.viewportY, this.viewportWidth, this.viewportHeight);
        }
    }
}

export default GLState;