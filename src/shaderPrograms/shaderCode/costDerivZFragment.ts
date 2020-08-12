import vec from './utils/vec';
import sizeSwitch from './utils/switch';

// TODO: significance
const getFragment =
    (derivZlpixels: number, derivZlp1pixels: number, derivZlsizeFull: number, weightsHeight: number, weightsPartialUsed: 0 | 1 | 2 | 3, partialUsed: 1 | 2 | 3 | 4, activationFDeriv: (xType: string) => string) =>
        `#extension GL_EXT_draw_buffers : require
precision highp float;

uniform sampler2D w_l;
uniform sampler2D deriv_z_l_p_1;
uniform sampler2D z_l;
uniform sampler2D previous_deriv;

uniform float significance;

const float deriv_z_l_size = ${derivZlpixels.toFixed(1)};

const float deriv_z_l_p_1_size = ${derivZlp1pixels.toFixed(1)};
const float deriv_z_l_p_1_size_full = ${derivZlsizeFull.toFixed(1)};

const float w_l_height = ${weightsHeight.toFixed(1)};

void mixWithPrevious(inout ${vec[partialUsed]} x)
{
    x = mix(x, texture2D(previous_deriv, vec2(0.0, gl_FragCoord.y/deriv_z_l_size))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )
        }, significance);
}

${vec[partialUsed]} findZLDeriv()
{
    ${vec[partialUsed]} x = texture2D(z_l, vec2(0.0, gl_FragCoord.y/size))${
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

void multiplyByZLDeriv(inout ${vec[partialUsed]} x)
{
    x *= findZLDeriv();
}

${
        weightsPartialUsed === 0
            ? ''
            : `void sumPartial(inout ${vec[partialUsed]} x)
        {
            vec4 cost_deriv_pixel = texture2D(deriv_z_l_p_1, vec2(0.0, (deriv_z_l_p_1_size_full+0.5)/deriv_z_l_p_1_size));

            vec4 w_l_pixel0 = texture2D(w_l, vec2((deriv_z_l_p_1_size_full+0.5)/deriv_z_l_p_1_size, (gl_FragCoord.y - 0.375)/(w_l_height/4.0)));
            ${weightsPartialUsed >= 2 ? 'vec4 w_l_pixel1 = texture2D(w_l, vec2((deriv_z_l_p_1_size_full+0.5)/deriv_z_l_p_1_size, (gl_FragCoord.y - 0.125)/(w_l_height/4.0)))' : ''}
            ${weightsPartialUsed === 3 ? 'vec4 w_l_pixel2 = texture2D(w_l, vec2((deriv_z_l_p_1_size_full+0.5)/deriv_z_l_p_1_size, (gl_FragCoord.y + 0.125)/(w_l_height/4.0)))' : ''}

            x += ${
            partialUsed === 1
                ? `dot(cost_deriv_pixel, vec4(w_l_pixel0.r, ${weightsPartialUsed >= 2 ? 'w_l_pixel1.r' : '0.0'}, ${weightsPartialUsed === 3 ? 'w_l_pixel2.r' : '0.0'}, 0.0))`
                : `${vec[partialUsed]}(
                dot(cost_deriv_pixel, vec4(w_l_pixel0.r, ${weightsPartialUsed >= 2 ? 'w_l_pixel1.r' : '0.0'}, ${weightsPartialUsed === 3 ? 'w_l_pixel2.r' : '0.0'}, 0.0))
                , dot(cost_deriv_pixel, vec4(w_l_pixel0.g, ${weightsPartialUsed >= 2 ? 'w_l_pixel1.g' : '0.0'}, ${weightsPartialUsed === 3 ? 'w_l_pixel2.g' : '0.0'}, 0.0))
                ${partialUsed >= 3 ? `, dot(cost_deriv_pixel, vec4(w_l_pixel0.b, ${weightsPartialUsed >= 2 ? 'w_l_pixel1.b' : '0.0'}, ${weightsPartialUsed === 3 ? 'w_l_pixel2.b' : '0.0'}, 0.0))` : ''}
                ${partialUsed === 4 ? `, dot(cost_deriv_pixel, vec4(w_l_pixel0.a, ${weightsPartialUsed >= 2 ? 'w_l_pixel1.r' : '0.0'}, ${weightsPartialUsed === 3 ? 'w_l_pixel2.r' : '0.0'}, 0.0))` : ''}
              )`
            };
        }`
        }

${vec[partialUsed]} sumFull()
{
    ${vec[partialUsed]} x = ${
        sizeSwitch(
            partialUsed,
            '0.0',
            'vec2(0.0, 0.0)',
            'vec3(0.0, 0.0, 0.0)',
            'vec4(0.0, 0.0, 0.0, 0.0)'
        )
        };

    vec4 y_pos = vec4(
        (gl_FragCoord.y - 0.375)/(w_l_height/4.0),
        (gl_FragCoord.y - 0.125)/(w_l_height/4.0),
        (gl_FragCoord.y + 0.125)/(w_l_height/4.0),
        (gl_FragCoord.y + 0.375)/(w_l_height/4.0)
    );

    for (float i = 0.5; i < deriv_z_l_p_1_size_full; i++)
    {
        float deriv_z_l_p_1_index = i/deriv_z_l_p_1_size;
        vec4 cost_deriv_pixel = texture2D(deriv_z_l_p_1, vec2(0.0, deriv_z_l_p_1_index));
        vec4 w_l_pixel0 = texture2D(w_l, vec2(deriv_z_l_p_1_index, y_pos.r));
        vec4 w_l_pixel1 = texture2D(w_l, vec2(deriv_z_l_p_1_index, y_pos.g));
        vec4 w_l_pixel2 = texture2D(w_l, vec2(deriv_z_l_p_1_index, y_pos.b));
        vec4 w_l_pixel3 = texture2D(w_l, vec2(deriv_z_l_p_1_index, y_pos.a));

         x += ${
        partialUsed === 1
            ? 'dot(cost_deriv_pixel, vec4(w_l_pixel0.r, w_l_pixel1.r, w_l_pixel2.r, w_l_pixel3.r))'
            : `${vec[partialUsed]}(
                dot(cost_deriv_pixel, vec4(w_l_pixel0.r, w_l_pixel1.r, w_l_pixel2.r, w_l_pixel3.r))
                , dot(cost_deriv_pixel, vec4(w_l_pixel0.g, w_l_pixel1.g, w_l_pixel2.g, w_l_pixel3.g))
                ${partialUsed >= 3 ? ', dot(cost_deriv_pixel, vec4(w_l_pixel0.b, w_l_pixel1.b, w_l_pixel2.b, w_l_pixel3.b))' : ''}
                ${partialUsed === 4 ? ', dot(cost_deriv_pixel, vec4(w_l_pixel0.a, w_l_pixel1.a, w_l_pixel2.a, w_l_pixel3.a))' : ''}
          )`
        };
    }
    return x;
}

void main()
{
    ${vec[partialUsed]} x = sumFull();
    ${weightsPartialUsed === 0 ? '' : 'sumPartial(x);'}
    multiplyByZLDeriv(x);
    mixWithPrevious(x);

    gl_FragColor = ${
        sizeSwitch(
            partialUsed,
            'vec4(x, 0.0, 0.0, 0.0)',
            'vec4(x, 0.0, 0.0)',
            'vec4(x, 0.0)',
            'x'
        )
        };
}
`;

export default getFragment;