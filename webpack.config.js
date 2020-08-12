const path = require('path');

const browser = true;

module.exports = {
    devServer: {
        contentBase: './dist'
    },
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.glsl$/i,
                use: 'raw-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: browser ? 'web' : 'node',
    mode: 'development',
    externals: {
        gl: browser ? 'createContext' : 'require("gl")'
    }
};