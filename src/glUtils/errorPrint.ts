export default (error: number, gl: WebGLRenderingContext) => {
    switch (error) {
        case gl.INVALID_ENUM:
            console.log('invalid enum');
            break;
        case gl.INVALID_VALUE:
            console.log('invalid value');
            break;
        case gl.INVALID_OPERATION:
            console.log('invalid operation');
            break;
        case gl.INVALID_FRAMEBUFFER_OPERATION:
            console.log('invalid framebuffer operation');
            break;
        case gl.OUT_OF_MEMORY:
            console.log('out of memory');
            break;
        case gl.CONTEXT_LOST_WEBGL:
            console.log('context lost webgl');
            break;
        case gl.NO_ERROR:
            console.log('no error');
            break;
    }
};