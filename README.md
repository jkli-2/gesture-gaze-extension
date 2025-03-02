# Webcam-Based Gesture & Gaze-Controlled Browser Extension

A 42028 Deep Learning and Convolution Neural Network class project.

# File Structure

```
📂 gesture-gaze-extension   <-- Root project folder
 ├── 📂 models              <-- Stores trained models (CNN, gaze tracking)
 │    ├── model_v1/         <-- First trained model (weights, architecture)
 │    ├── model_v2/         <-- Improved version
 │    └── README.md         <-- Model documentation
 ├── 📂 extension           <-- Browser extension source code
 │    ├── 📂 scripts        <-- JavaScript files for gesture control
 │    ├── 📂 ui             <-- Floating UI, cursor visualizations
 │    ├── manifest.json     <-- Browser extension manifest
 │    ├── background.js     <-- Handles extension lifecycle
 │    ├── content.js        <-- Injects scripts into web pages
 │    └── README.md         <-- Setup instructions
 ├── 📂 notebooks           <-- Jupyter/Colab notebooks for ML training
 │    ├── gesture_model.ipynb   <-- Hand gesture training
 │    ├── gaze_model.ipynb      <-- Gaze tracking training
 │    └── data_preprocessing.ipynb <-- Dataset preparation
 ├── 📂 datasets            <-- Store links or small dataset samples (if allowed)
 │    ├── gestures_dataset/  <-- Collected gesture data
 │    ├── gaze_dataset/      <-- Collected gaze tracking data
 │    └── README.md          <-- Dataset description
 ├── 📂 docs                <-- Documentation (Design, API, Reports)
 │    ├── project_charter.md <-- Project scope, goals, features
 │    ├── architecture.md    <-- System design & technical overview
 │    ├── API_spec.md        <-- API details if applicable
 │    └── README.md          <-- Main project overview
 ├── .gitignore             <-- Ignore unnecessary files (e.g., datasets, cache)
 ├── README.md              <-- General project info, how to set up
 ├── requirements.txt       <-- Python dependencies (for ML model training)
 ├── package.json           <-- Dependencies (for JavaScript browser extension)
```
