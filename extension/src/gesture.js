import { Hands } from "@mediapipe/hands";

export function initializeGestureRecognition(callback) {
    const hands = new Hands({
        locateFile: (file) => chrome.runtime.getURL(`third_party/mediapipe/hands/${file}`)
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
        if (results.multiHandLandmarks.length > 0) {
            const gesture = detectGesture(results.multiHandLandmarks);
            callback(gesture); // Send detected gesture to content.js
        }
    });

    return hands;
}

// Example basic gesture detection
function detectGesture(landmarks) {
    const wrist = handLandmarks[0][0];  
    const indexFingerTip = handLandmarks[0][8];  
    const middleFingerTip = handLandmarks[0][12];

    if (indexFingerTip.y < wrist.y && middleFingerTip.y < wrist.y) {
        return "scroll-up";  // Gesture: Hand raised
    } else if (indexFingerTip.y > wrist.y && middleFingerTip.y > wrist.y) {
        return "scroll-down";  // Gesture: Hand lowered
    }
    return null;
}
