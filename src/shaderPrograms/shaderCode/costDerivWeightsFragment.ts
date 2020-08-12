import vec from './utils/vec';
import sizeSwitch from './utils/switch';

const getFragment =
    (pixelHeight: number, pixelWidth: number, zLPixels: number, partialUsed: 1 | 2 | 3 | 4) =>
        `#extension GL_EXT_draw_buffers : require
precision highp float;

uniform sampler2D cost_deriv_z_l;
uniform sampler2D l_m_1;
uniform sampler2D previous_deriv;

uniform float significance;

const float pixel_height = ${pixelHeight.toFixed(1)};
const float pixel_width = ${pixelWidth.toFixed(1)};
const float z_l_size = ${zLPixels.toFixed(1)};

${vec[partialUsed]} cost()
{
    vec4 cost_deriv_z_l_pixel = texture2D(cost_deriv_z_l, vec2(0.0, gl_FragCoord.y/(z_l_size*4.0)));
    int cost_deriv_partial = int(mod(gl_FragCoord.y, 4.0));
    float cost_deriv_z_l_val = (cost_deriv_partial == 0) ? cost_deriv_z_l_pixel.r :
        (cost_deriv_partial == 1) ? cost_deriv_z_l_pixel.g :
        (cost_deriv_partial == 2) ? cost_deriv_z_l_pixel.b :
        cost_deriv_z_l_pixel.a;
    return texture2D(l_m_1, vec2(0.0, gl_FragCoord.x/pixel_width))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )
        }*cost_deriv_z_l_val;
}

void mixWithPrevious(inout ${vec[partialUsed]} x)
{
    x = mix(x, texture2D(previous_deriv, gl_FragCoord.xy/vec2(pixel_width, pixel_height))${
        sizeSwitch(
            partialUsed,
            '.r',
            '.rg',
            '.rgb',
            ''
        )
        }, significance);
}

void main()
{
    ${vec[partialUsed]} x = cost();
    gl_FragData[1] = ${
        sizeSwitch(
            partialUsed,
            'vec4(x, 0.0, 0.0, 0.0)',
            'vec4(x, 0.0, 0.0)',
            'vec4(x, 0.0)',
            'x'
        )
        };

    mixWithPrevious(x);
    gl_FragData[0] = ${
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