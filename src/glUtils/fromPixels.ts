const mat = (width: number, height: number, values: Float32Array) =>
    Array.from({
        [Symbol.iterator]: function* () {
            const valuesWidth = Math.ceil(width / 4) * 4;
            for (let row = 0; row < height; row++)
                for (let col = 0; col < width; col++)
                    yield values[col + row * valuesWidth];
        }
    });

const vec = (len: number, values: Float32Array) =>
    Array.from(values.slice(0, len));

export {
    mat,
    vec
};