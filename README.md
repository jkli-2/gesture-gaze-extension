# Webcam-Based Gesture & Gaze-Controlled Browser Extension

A 42028 Deep Learning and Convolution Neural Network class project.

# Prerequisites

Install `nvm` and `Git`.

We use Node.js 18. After installing `nvm`, run the following:

```
nvm install 18
nvm use 18
nvm alias default 18
```

# Setup

1. Clone this repo
2. Run `npm install` to install dependencies

# Build & Run

## 1. Bundle the JS Files ("Compiling")

`npx webpack --config webpack.config.js`

Instead of manually bundling every time you change code, open a terminal and run:

`npv webpack --watch`

This watches for changes and rebuilds automatically.

## 2. Load the Extension in Chrome

- Open Chrome → Go to chrome://extensions/
- Enable Developer Mode (top right).
- Click "Load Unpacked" → Select the gesture-gaze-extension/extension folder.
- Open any website (e.g., Google Docs, YouTube).
- Press Ctrl + Shift + J (Windows) or Cmd + Option + J (Mac) to open DevTools Console.
- Move Our hand up/down to see gesture logs.

# Contributing

To keep it simple, we use the `dev` branch. Everyone works in the `dev` branch. It will be merged into `main` when features are ready. But using feature branches is always encouraged for major changes.

# File Structure

```
📂 gesture-gaze-extension   <-- Root project folder
 ├── 📂 models              <-- Stores trained models (CNN, gaze tracking)
 ├── 📂 extension           <-- Browser extension source code
 ├── 📂 notebooks           <-- Jupyter/Colab notebooks for ML training
 ├── 📂 datasets            <-- Store links or small dataset samples
 ├── 📂 docs                <-- Documentation (Design, API, Reports)
 ├── .gitignore             <-- Ignore unnecessary files (e.g., datasets, cache)
 ├── README.md              <-- General project info, how to set up
 ├── requirements.txt       <-- Python dependencies (for ML model training)
 ├── webpack.config.js      <-- Webpack config (for bundling)
 ├── package.json           <-- Dependencies (for JavaScript browser extension)
```
