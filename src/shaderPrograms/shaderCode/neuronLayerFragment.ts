import vec from './utils/vec';
import sizeSwitch from './utils/switch';

const getFragment =
    (previousWholePixels: number, previousPartialSize: number, nextPixelsPartUsed: 1 | 2 | 3 | 4, activationF: (xType: string) => string, useDrawBuffers: boolean) =>
        `${useDrawBuffers ? '#extension GL_EXT_draw_buffers : require\n' : ''}precision highp float;

uniform sampler2D a_lm1;
uniform sampler2D w_l;
uniform sampler2D b_l;

uniform float w_l_height;

const float a_lm1_size = ${(previousWholePixels + previousPartialSize).toFixed(1)};
const float a_lm1_size_whole = ${previousWholePixels.toFixed(1)};
const int a_lm1_size_partial = ${previousPartialSize};
uniform float a_l_size;

void activationF(inout ${vec[nextPixelsPartUsed]} x)
{
    ${activationF(vec[nextPixelsPartUsed])}
}

void addBias(inout ${vec[nextPixelsPartUsed]} x, in float y_pos)
{
    x += texture2D(b_l, vec2(0.0, y_pos/a_l_size))${
        sizeSwitch(
            nextPixelsPartUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )};
}

void addPartial(inout ${vec[nextPixelsPartUsed]} x, in float y_pos)
{
    if (a_lm1_size_partial == 0)
    {
        return;
    }

    vec4 a_lm1_pixel = texture2D(a_lm1, vec2(0.0, (a_lm1_size_whole+0.5)/a_lm1_size));

    a_lm1_pixel = a_lm1_size_partial == 1
        ? vec4(a_lm1_pixel.r, 0.0, 0.0, 0.0)
        : (a_lm1_size_partial == 2
            ? vec4(a_lm1_pixel.rg, 0.0, 0.0)
            : vec4(a_lm1_pixel.rgb, 0.0));

    float a_lm1_i = (a_lm1_size_whole+0.5)/a_lm1_size;

    ${
        nextPixelsPartUsed === 1
            ? 'x += dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, (y_pos*4.0+0.5)/w_l_height)));'
            : `x += ${vec[nextPixelsPartUsed]}(
            dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, (y_pos*4.0+0.5)/w_l_height)))
            , dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, (y_pos*4.0+1.5)/w_l_height)))
            ${ nextPixelsPartUsed >= 3 ? ', dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, (y_pos*4.0+2.5)/w_l_height)))' : ''}
            ${ nextPixelsPartUsed === 4 ? ', dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, (y_pos*4.0+3.5)/w_l_height)))' : ''}
        );`
        }
}

${vec[nextPixelsPartUsed]} addFull(in float y_pos)
{
    ${vec[nextPixelsPartUsed]} y_pos_vec = ${
        nextPixelsPartUsed === 1
            ? '(y_pos*4.0+0.5)/w_l_height;'
            : `${vec[nextPixelsPartUsed]}(
            (y_pos*4.0+0.5)/w_l_height
            , (y_pos*4.0+1.5)/w_l_height
            ${ nextPixelsPartUsed >= 3 ? ', (y_pos*4.0+2.5)/w_l_height' : ''}
            ${ nextPixelsPartUsed === 4 ? ', (y_pos*4.0+3.5)/w_l_height' : ''}
        );`
        }

    ${vec[nextPixelsPartUsed]} x = ${
        sizeSwitch(
            nextPixelsPartUsed,
            '0.0;',
            'vec2(0.0, 0.0);',
            'vec3(0.0, 0.0, 0.0);',
            'vec4(0.0, 0.0, 0.0, 0.0);'
        )
        }
    for (float i = 0.5; i < a_lm1_size_whole; i++)
    {
        float a_lm1_i = i/a_lm1_size;

        vec4 a_lm1_pixel = texture2D(a_lm1, vec2(0.0, a_lm1_i));

        x += ${
        nextPixelsPartUsed === 1
            ? 'a_lm1_pixel.r * texture2D(w_l, vec2(a_lm1_i, y_pos_vec)).r'
            : `${vec[nextPixelsPartUsed]}(
            dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, y_pos_vec.r)))
            , dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, y_pos_vec.g)))
            ${ nextPixelsPartUsed >= 3 ? ', dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, y_pos_vec.b)))' : ''}
            ${ nextPixelsPartUsed === 4 ? ', dot(a_lm1_pixel, texture2D(w_l, vec2(a_lm1_i, y_pos_vec.a)))' : ''}
        )`
        };
    }
    return x;
}

void main()
{
    float y_pos = gl_FragCoord.y - 0.5;
    ${vec[nextPixelsPartUsed]} x = addFull(y_pos);
    addPartial(x, y_pos);
    addBias(x, y_pos);
    ${
        useDrawBuffers
            ? `gl_FragData[1] = ${
            sizeSwitch(
                nextPixelsPartUsed,
                'vec4(x, 0.0, 0.0, 0.0)',
                'vec4(x, 0.0, 0.0)',
                'vec4(x, 0.0)',
                'x'
            )
            };`
            : ''}
    activationF(x);
    ${
        useDrawBuffers
            ? 'gl_FragData[0]'
            : 'gl_FragColor'
        } = ${
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