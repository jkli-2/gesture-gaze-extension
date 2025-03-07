// // Example basic gesture detection
// function detectGesture(handLandmarks) {
//     const wrist = handLandmarks[0][0];
//     const indexFingerTip = handLandmarks[0][8];
//     const middleFingerTip = handLandmarks[0][12];

//     if (indexFingerTip.y < wrist.y && middleFingerTip.y < wrist.y) {
//         return "scroll-up"; // Gesture: Hand raised
//     } else if (indexFingerTip.y > wrist.y && middleFingerTip.y > wrist.y) {
//         return "scroll-down"; // Gesture: Hand lowered
//     }
//     return null;
// }

import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/hand-pose-detection";

let detector = null;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
export async function createGestureRecognizer() {
    if (detector) return detector;
    const handModel = handpose.SupportedModels.MediaPipeHands;
    detector = await handpose.createDetector(handModel, {
        runtime: "tfjs",
        modelType: "full", // "lite" for better speed, "full" for accuracy
    });
    console.log("Finish loading");
    return detector;
}

let results = undefined;

export async function predictWebcam(detector, video, canvasElement, gestureOutput) {
    if (!detector || !video || !canvasElement || !gestureOutput) return;

    const predictions = await detector.estimateHands(video);
    if (predictions.length > 0) {
        console.log("✋ Hand Landmarks:", predictions[0].handedness);
    }

    // const canvasCtx = canvasElement.getContext("2d");
    // canvasCtx.save();
    // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // canvasCtx.restore();
    // if (results.gestures.length > 0) {
    //     gestureOutput.style.display = "block";
    //     gestureOutput.style.width = videoWidth;
    //     const categoryName = results.gestures[0][0].categoryName;
    //     const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
    //     const handedness = results.handednesses[0][0].displayName;
    //     gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
    // } else {
    //     gestureOutput.style.display = "none";
    // }
}
