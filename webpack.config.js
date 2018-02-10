const path = require('path');

const DefinePlugin = require('webpack/lib/DefinePlugin');
const { CheckerPlugin } = require('awesome-typescript-loader');
const CopyWebpckPlugin = require('copy-webpack-plugin');

const env = require('./env');

let isProd = process.env.NODE_ENV === 'production';
let albireo_host = isProd ? env.prod.albireo_host : env.dev.albireo_host;
let watch = !isProd;

module.exports = {
    watch: watch,
    entry: {
        backend: './src/event-page.ts',
        // popup: './src/popup.ts'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: 'sourcemap',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'awesome-typescript-loader'
            }
        ]
    },
    plugins: [
        new CheckerPlugin(),
        new CopyWebpckPlugin([
            {
                from: 'src',
                ignore: ['*.ts']
            }
        ]),
        new DefinePlugin({
            ALBIREO_HOST: JSON.stringify(albireo_host)
        })
    ]
};