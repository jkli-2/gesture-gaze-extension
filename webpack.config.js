const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
    mode: "production",
    devtool: 'cheap-module-source-map',
    entry: {
        background: "./extension/src/background.js",
        content: "./extension/src/content.js",
        popup: "./extension/src/popup.js",
        camera: "./extension/src/camera.js",
        gesture: "./extension/src/gesture.js",
    },
    output: {
        path: path.resolve(__dirname, "extension/dist"),
        filename: "[name].bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"]
                    }
                }
            }
        ]
    },
    plugins: [
        // new CopyWebpackPlugin({
        //     patterns: [
        //         { 
        //             from: "extension/third_party", 
        //             to: "third_party"
        //         }
        //     ],
        // })
    ],
}