import vec from './utils/vec';
import sizeSwitch from './utils/switch';

const getFragment = (pixelCount: number, nextPixelsPartUsed: 1 | 2 | 3 | 4) => `precision highp float;

uniform sampler2D a;
uniform sampler2D correct;

const float size = ${pixelCount.toFixed(1)};

${vec[nextPixelsPartUsed]} calculateError(in float y_pos)
{
    ${vec[nextPixelsPartUsed]} x = texture2D(a, vec2(0.0, y_pos))${
    sizeSwitch(
        nextPixelsPartUsed,
        '.r',
        '.rg',
        '.rgb',
        ''
    )} - texture2D(correct, vec2(0.0, y_pos))${
    sizeSwitch(
        nextPixelsPartUsed,
        '.r',
        '.rg',
        '.rgb',
        ''
    )};
    x = x*x;
    return x;
}

void main()
{
    float y_pos = gl_FragCoord.y/size;
    ${vec[nextPixelsPartUsed]} x = calculateError(y_pos);
    gl_FragColor = ${
    sizeSwitch(
        nextPixelsPartUsed,
        'vec4(x, 0.0, 0.0, 0.0)',
        'vec4(x, 0.0, 0.0)',
        'vec4(x, 0.0)',
        'x'
    )
    };
}`;

export default getFragment;