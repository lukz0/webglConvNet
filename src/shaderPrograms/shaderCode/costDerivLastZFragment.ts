import vec from './utils/vec';
import sizeSwitch from './utils/switch';

const getFragment =
    (pixelCount: number, partialUsed: 1 | 2 | 3 | 4, activationFDeriv: (xType: string) => string) =>
        `#extension GL_EXT_draw_buffers : require
precision highp float;

uniform sampler2D a;
uniform sampler2D correct;
uniform sampler2D z_l;
uniform sampler2D previous_deriv;

uniform float significance;

const float size = ${pixelCount.toFixed(1)};

void mixWithPrevious(inout ${vec[partialUsed]} x, in float y_pos)
{
    x = mix(x, texture2D(previous_deriv, vec2(0.0, y_pos))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )}, significance);
}

${vec[partialUsed]} activationDeriv(in float y_pos)
{
    ${vec[partialUsed]} x = texture2D(z_l, vec2(0.0, y_pos))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )};
    ${activationFDeriv(vec[partialUsed])}
    return x;
}

${vec[partialUsed]} aDifference(in float y_pos)
{
    return texture2D(a, vec2(0.0, y_pos))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )} - texture2D(correct, vec2(0.0, y_pos))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )};
}

void main()
{
    float y_pos = gl_FragCoord.y/size;
    ${vec[partialUsed]} x = activationDeriv(y_pos) * 2.0 * aDifference(y_pos);
    gl_FragData[1] = ${
        sizeSwitch(
            partialUsed,
            'vec4(x, 0.0, 0.0, 0.0)',
            'vec4(x, 0.0, 0.0)',
            'vec4(x, 0.0)',
            'x'
        )
        };

    mixWithPrevious(x, y_pos);
    gl_FragData[0] = ${
        sizeSwitch(
            partialUsed,
            'vec4(x, 0.0, 0.0, 0.0)',
            'vec4(x, 0.0, 0.0)',
            'vec4(x, 0.0)',
            'x'
        )
        };
}`;

export default getFragment;