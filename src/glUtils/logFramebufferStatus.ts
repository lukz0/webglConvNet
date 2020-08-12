export default (gl: WebGLRenderingContext) => {
    switch (gl.checkFramebufferStatus(gl.FRAMEBUFFER)) {
        case gl.FRAMEBUFFER_COMPLETE:
            console.log('Framebuffer status: "FRAMEBUFFER_COMPLETE"');
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            console.log('Framebuffer status: "FRAMEBUFFER_INCOMPLETE_ATTACHMENT"');
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            console.log('Framebuffer status: "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"');
            break;
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            console.log('Framebuffer status: "FRAMEBUFFER_INCOMPLETE_DIMENSIONS"');
            break;
        case gl.FRAMEBUFFER_UNSUPPORTED:
            console.log('Framebuffer status: "FRAMEBUFFER_UNSUPPORTED"');
            break;
    }
};