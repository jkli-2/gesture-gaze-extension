const path = require("path");

module.exports = {
    mode: "production",
    entry: {
        background: "./extension/src/background.js",
        content: "./extension/src/content.js",
        popup: "./extension/src/popup.js"
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
    }
}