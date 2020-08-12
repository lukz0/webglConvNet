type xType_t = 'float' | 'vec2' | 'vec3' | 'vec4';
const xTypeSwitch = (xType: xType_t, f: string, v2: string, v3: string, v4: string) => {
    switch (xType) {
        case 'float':
            return f;
        case 'vec2':
            return v2;
        case 'vec3':
            return v3;
        case 'vec4':
            return v4;
    }
};

enum activationF {
    logistic_function = 0,
    sine_wave = 1,
    arctan = 2,
    identity = 3,
    softplus = 4,
    leaky_rectified_linear_unit = 5,
    rectified_linear_unit = 6,
    exponential_linear_unit = 7,
    bent_identity = 8
}

const activationF_shaders: Map<activationF, (xType: xType_t) => string> = new Map([
    [activationF.logistic_function, () => 'x = 1.0/(1.0 + exp(-x));'],
    [activationF.sine_wave, () => 'x = sin(x);'],
    [activationF.arctan, () => 'x = atan(x);'],
    [activationF.identity, () => ''],
    [activationF.softplus, () => 'x = log(1.0 + exp(x));'],
    [activationF.leaky_rectified_linear_unit, (xType: xType_t) => `x = ${
        xTypeSwitch(
            xType,
            'x >= 0.0 ? x : (0.01*x)',
            'vec2(x.r >= 0.0 ? x.r : (0.01*x.r), x.g >= 0.0 ? x.g : (0.01*x.g))',
            'vec3(x.r >= 0.0 ? x.r : (0.01*x.r), x.g >= 0.0 ? x.g : (0.01*x.g), x.b >= 0.0 ? x.b : (0.01*x.b))',
            'vec4(x.r >= 0.0 ? x.r : (0.01*x.r), x.g >= 0.0 ? x.g : (0.01*x.g), x.b >= 0.0 ? x.b : (0.01*x.b), x.a >= 0.0 ? x.a : (0.01*x.a))'
        )
        };`],
    [activationF.rectified_linear_unit, () => 'x = max(x, 0.0);'],
    [activationF.exponential_linear_unit, (xType: xType_t) => `x = ${
        xTypeSwitch(
            xType,
            'x > 0.0 ? x : (exp(x) - 1.0)',
            'vec2(x.r > 0.0 ? x.r : (exp(x.r) - 1.0), x.g > 0.0 ? x.g : (exp(x.g) - 1.0))',
            'vec3(x.r > 0.0 ? x.r : (exp(x.r) - 1.0), x.g > 0.0 ? x.g : (exp(x.g) - 1.0), x.b > 0.0 ? x.b : (exp(x.b) - 1.0))',
            'vec4(x.r > 0.0 ? x.r : (exp(x.r) - 1.0), x.g > 0.0 ? x.g : (exp(x.g) - 1.0), x.b > 0.0 ? x.b : (exp(x.b) - 1.0), x.a > 0.0 ? x.a : (exp(x.a) - 1.0))'
        )
        };`],
    [activationF.bent_identity, () => 'x = (sqrt(x*x + 1.0) - 1.0)/2.0 + x;']
]);

const activationDerivative_shader: Map<activationF, (xType: xType_t) => string> = new Map([
    [activationF.logistic_function, (xType: xType_t) =>
        `${xType} e_neg_x = exp(-x);
${xType} divisor_square = 1.0 + e_neg_x;
x = e_neg_x/(divisor_square*divisor_square);`],
    [activationF.sine_wave, () => 'x = cos(x);'],
    [activationF.arctan, () => 'x = 1.0/(x*x + 1.0);'],
    [activationF.identity, (xType: xType_t) => `x = ${
        xTypeSwitch(
            xType,
            '1.0',
            'vec2(1.0, 1.0)',
            'vec3(1.0, 1.0, 1.0)',
            'vec4(1.0, 1.0, 1.0, 1.0)'
        )
        };`],
    [activationF.softplus, () => 'x = 1.0/(1.0 + exp(-x));'],
    [activationF.leaky_rectified_linear_unit, (xType: xType_t) => `x = ${
        xTypeSwitch(
            xType,
            'x >= 0.0 ? 1.0 : 0.01',
            'vec2(x.r >= 0.0 ? 1.0 : 0.01, x.g >= 0.0 ? 1.0 : 0.01)',
            'vec3(x.r >= 0.0 ? 1.0 : 0.01, x.g >= 0.0 ? 1.0 : 0.01, x.b >= 0.0 ? 1.0 : 0.01)',
            'vec4(x.r >= 0.0 ? 1.0 : 0.01, x.g >= 0.0 ? 1.0 : 0.01, x.b >= 0.0 ? 1.0 : 0.01, x.a >= 0.0 ? 1.0 : 0.01)'
        )
        };`],
    [activationF.rectified_linear_unit, () => `x = step(0.0, x);`],
    [activationF.exponential_linear_unit, (xType: xType_t) => `x = ${
        xTypeSwitch(
            xType,
            'x > 0.0 ? x : exp(x)',
            'vec2(x.r > 0.0 ? x.r : exp(x.r), x.g > 0.0 ? x.g : exp(x.g))',
            'vec3(x.r > 0.0 ? x.r : exp(x.r), x.g > 0.0 ? x.g : exp(x.g), x.b > 0.0 ? x.b : exp(x.b))',
            'vec4(x.r > 0.0 ? x.r : exp(x.r), x.g > 0.0 ? x.g : exp(x.g), x.b > 0.0 ? x.b : exp(x.b), x.a > 0.0 ? x.a : exp(x.a))'
        )
        };`],
    [activationF.bent_identity, () => 'x = x/(2.0*sqrt(x*x + 1)) + 1.0;']
]);


type customActivationF = [(xType: xType_t) => string, (xType: xType_t) => string];

export {
    activationF,
    customActivationF,
    activationF_shaders,
    activationDerivative_shader
};