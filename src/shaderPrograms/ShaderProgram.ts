import GLState from '../GLState';

class ShaderProgram {
    protected gl: WebGLRenderingContext;
    protected glS: GLState;
    protected glShaderProgram: WebGLProgram;

    protected vertexShader: WebGLShader;
    protected fragmentShader: WebGLShader;

    constructor(gl: WebGLRenderingContext, glS: GLState, vertexCode: string, fragmentCode: string) {
        this.gl = gl;
        this.glS = glS;

        this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vertexShader, vertexCode);
        gl.compileShader(this.vertexShader);

        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.fragmentShader, fragmentCode)
        gl.compileShader(this.fragmentShader);

        this.glShaderProgram = gl.createProgram();
        gl.attachShader(this.glShaderProgram, this.vertexShader);
        gl.attachShader(this.glShaderProgram, this.fragmentShader);
        gl.linkProgram(this.glShaderProgram);
    }

    delete() {
        this.gl.deleteProgram(this.glShaderProgram);
        this.gl.deleteShader(this.vertexShader);
        this.gl.deleteShader(this.fragmentShader);
        this.glS.setProgram(null);
    }


    // DEBUG
    validate() {
        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS))
            return `VERTEX SHADER COMPILE ERROR: ${this.gl.getShaderInfoLog(this.vertexShader)}`;
        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS))
            return `FRAGMENT SHADER COMPILE ERROR: ${this.gl.getShaderInfoLog(this.fragmentShader)}`;
        this.gl.validateProgram(this.glShaderProgram);
        if (
            !this.gl.getProgramParameter(this.glShaderProgram, this.gl.LINK_STATUS) ||
            !this.gl.getProgramParameter(this.glShaderProgram, this.gl.VALIDATE_STATUS)
        )
            return `PROGRAM ERROR: ${this.gl.getProgramInfoLog(this.glShaderProgram)}`;
    }
}

export default ShaderProgram;