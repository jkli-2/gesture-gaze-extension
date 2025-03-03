const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "production",
    entry: {
        background: "./extension/src/background.js",
        content: "./extension/src/content.js",
        popup: "./extension/src/popup.js",
        camera: "./extension/src/camera.js",
        gesture: "./extension/src/gesture.js",
        pointer: "./extension/src/pointer.js",
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
        new CopyWebpackPlugin({
            patterns: [{ from: "extension/third_party", to: "third_party" }],
        }),
    ],
}