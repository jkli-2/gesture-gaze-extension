import { Hands } from "@mediapipe/hands";

const hands = new Hands({
    locateFile: (file) => chrome.runtime.getURL(`third_party/mediapipe/hands/${file}`),
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

hands.onResults((results) => {
    // if (results.multiHandLandmarks.length > 0) {
    //     const gesture = detectGesture(results.multiHandLandmarks);
    //     callback(gesture); // Send detected gesture to content.js
    // }
    if (results.multiHandLandmarks) {
        console.log("Hand landmarks detected:", results.multiHandLandmarks);
    }
});

export async function recognizeGesture(imageBitmap) {
    console.log("Received image.");
    if (!hands) {
        console.error("MediaPipe Hands is not initialized.");
        return Promise.reject("MediaPipe Hands is not initialized.");
    }
    return new Promise((resolve, reject) => {
        try {
            const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
            const context = offscreenCanvas.getContext("2d");
            context.drawImage(imageBitmap, 0, 0);
            console.log("Sending canvas...");
            // const imageData = context.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

            hands
                .send({ image: offscreenCanvas })
                .then(() => {
                    resolve("Frame Processed.");
                })
                .catch((error) => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}

// Example basic gesture detection
function detectGesture(handLandmarks) {
    const wrist = handLandmarks[0][0];
    const indexFingerTip = handLandmarks[0][8];
    const middleFingerTip = handLandmarks[0][12];

    if (indexFingerTip.y < wrist.y && middleFingerTip.y < wrist.y) {
        return "scroll-up"; // Gesture: Hand raised
    } else if (indexFingerTip.y > wrist.y && middleFingerTip.y > wrist.y) {
        return "scroll-down"; // Gesture: Hand lowered
    }
    return null;
}
