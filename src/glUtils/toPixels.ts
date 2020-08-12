const mat = (width: number, values: number[]) => {
    const pixelExtra = (4 - width % 4) % 4;
    return Float32Array.from(
        pixelExtra === 0
            ? values
            : {
                [Symbol.iterator]: function* () {
                    for (let i = 0; i <= values.length - width;) {
                        for (let j = 0; j < width; j++) yield values[i++];
                        for (let j = 0; j < pixelExtra; j++) yield 0;
                    }
                }
            }
    );
};

const vec = (values: number[]) =>
    Float32Array.of(...values, ...Array((4 - values.length % 4) % 4).fill(0));

export {
    mat,
    vec
};