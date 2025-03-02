// import { Hands } from "@mediapipe/hands";
// import { Camera } from "@mediapipe/camera_utils";

// Start Camera
// const videoElement = document.createElement("video");
// const camera = new Camera(videoElement, {
//     onFrame: async () => {
//         await hands.send({ image: videoElement });
//     },
//     width: 640,
//     height: 480
// });
// camera.start();

// Initialize MediaPipe Hands
// const hands = new Hands({
//     locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
// });

// hands.setOptions({
//     maxNumHands: 1,
//     modelComplexity: 1,
//     minDetectionConfidence: 0.5,
//     minTrackingConfidence: 0.5
// });

// Process hand gestures & send messages to content script
// hands.onResults((results) => {
//     if (results.multiHandLandmarks.length > 0) {
//         const gesture = detectGesture(results.multiHandLandmarks[0]);
//         if (gesture) {
//             chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//                 if (tabs.length > 0) {
//                     chrome.tabs.sendMessage(tabs[0].id, { gesture: gesture });
//                 }
//             });
//         }
//     }
// });

// Gesture Recognition Logic
function detectGesture(handLandmarks) {
    const wrist = handLandmarks[0];  
    const indexFingerTip = handLandmarks[8];  
    const middleFingerTip = handLandmarks[12];

    if (indexFingerTip.y < wrist.y && middleFingerTip.y < wrist.y) {
        return "scroll-up";  // Gesture: Hand raised
    } else if (indexFingerTip.y > wrist.y && middleFingerTip.y > wrist.y) {
        return "scroll-down";  // Gesture: Hand lowered
    }
    return null;
}

// Old codes
// Test message sending. Wait for an active tab and send a test gesture
// setTimeout(() => {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       if (tabs.length > 0) {
//           sendGestureMessage(tabs[0].id, "scroll-down");
//       }
//   });
// }, 3000);
// 
// Function to check if content script is loaded and send a gesture message
// function sendGestureMessage(tabId, gesture) {
//   chrome.tabs.get(tabId, (tab) => {
//       if (chrome.runtime.lastError) {
//           console.warn("Error accessing tab:", chrome.runtime.lastError.message);
//           return;  // Stop execution if there's an error
//       }

//       if (!tab || !tab.url) {
//           console.warn("Invalid tab or missing URL.");
//           return;  // Exit if tab data is unavailable
//       }

//       if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
//           console.warn("Blocked sending message to a restricted page:", tab.url);
//           return;  // Exit if trying to send a message to a protected page
//       }

//       chrome.tabs.sendMessage(tabId, { gesture: gesture }, (response) => {
//           if (chrome.runtime.lastError) {
//               console.warn("Error sending message:", chrome.runtime.lastError.message);
//           }
//       });
//   });
// }