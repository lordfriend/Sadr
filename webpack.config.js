const path = require('path');

const DefinePlugin = require('webpack/lib/DefinePlugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpckPlugin = require('copy-webpack-plugin');
const manifestTransform = require('./scripts/transform');

const env = require('./env');

let isProd = process.env.NODE_ENV === 'production';
let albireo_host = isProd ? env.prod.albireo_host : env.dev.albireo_host;
let watch = !isProd;
let browserType = process.env.BROWSER_TYPE || 'Chrome';

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
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                }
            }
        ]
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
        new CopyWebpckPlugin([
            {
                from: 'src',
                ignore: ['*.ts'],
                transform: (content, filePath) => {
                    if (path.basename(filePath) === 'manifest.json') {
                        return manifestTransform(content, browserType, isProd);
                    } else {
                        return content;
                    }
                }
            }
        ]),
        new DefinePlugin({
            ALBIREO_HOST: JSON.stringify(albireo_host)
        })
    ]
};