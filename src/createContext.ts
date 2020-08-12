import glCreate from 'gl';
import GLState from './GLState';

export default (() => {
    const gl = glCreate(1, 1, {
        antialias: false,
        depth: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false
    });
    return [gl, new GLState(gl)];
}) as () => [WebGLRenderingContext, GLState];