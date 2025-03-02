# A proof-of-concept extension

The extension has three key components that work together:

- background.js (Runs in the background, detects gestures)
- content.js (Injected into web pages, handles UI interactions & scrolling)
- manifest.json (Defines extension settings & permissions)

# High-Level Overview of How Everything Works

- background.js detects gestures using MediaPipe.
- When a gesture is recognized, background.js sends a message to content.js.
- content.js listens for messages and performs the corresponding browser action (e.g., scrolling).
- The user sees the result (page scrolls, pointer moves, etc.).

# Component Breakdown

## `manifest.json` (Extension Configuration)

This file tells Chrome:

- What permissions the extension needs.
- Which scripts should run on web pages.
- Which file handles background processing.

```json
{
  "manifest_version": 3,
  "name": "Gesture & Gaze Control",
  "version": "0.1",
  "description": "Control webpages using hand gestures and gaze tracking.",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "scripts/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["scripts/content.js"]
    }
  ],
  "action": {
    "default_popup": "ui/popup.html"
  }
}
```

What This Does:

- Tells Chrome this is a browser extension (manifest_version: 3).
- Defines background script (background.js) for gesture recognition.
- Injects content.js into all web pages (matches: ["<all_urls>"]).
- Allows storage & scripting (permissions) to send messages between scripts.

## background.js (Gesture Detection & Messaging)

This script runs in the background and detects gestures using MediaPipe or TensorFlow.js.

How background.js Works: 

- Captures webcam feed.
- Processes hand gestures using MediaPipe.
- Sends detected gestures to content.js via chrome.tabs.sendMessage().

```js
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Process hand gestures & send messages to content script
hands.onResults((results) => {
    if (results.multiHandLandmarks.length > 0) {
        const gesture = detectGesture(results.multiHandLandmarks[0]);
        if (gesture) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { gesture: gesture });
                }
            });
        }
    }
});

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

// Start Camera
const videoElement = document.createElement("video");
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();
```

What This Does:

- Uses MediaPipe Hands to detect gestures.
- Sends messages to content.js whenever a gesture is recognized.
- Tracks hand movement in real time.

## content.js (Handles Browser Actions Like Scrolling)

This script is injected into web pages and listens for gesture messages.

How content.js Works: 

- Listens for gesture messages from background.js.
- Executes actions like scrolling when a gesture is received.

```js
let lastGesture = null;

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.gesture && message.gesture !== lastGesture) {
        console.log("Received gesture:", message.gesture);
        handleGesture(message.gesture);
        lastGesture = message.gesture;  // Avoid repeated gestures
    }
});

// Perform scrolling based on gesture
function handleGesture(gesture) {
    if (gesture === "scroll-up") {
        window.scrollBy(0, -100);
    } else if (gesture === "scroll-down") {
        window.scrollBy(0, 100);
    }
}
```

What This Does:

- Listens for messages from background.js.
- Executes browser interactions (scrolling, zooming, etc.).
- Prevents repeated gesture actions using lastGesture.

# Process Flow

1. Background.js: Detects hand gestures using MediaPipe.
2. Background.js: Sends gesture (scroll-up or scroll-down) to content.js.
3. Content.js: Receives message and logs it in the browser console.
4. Content.js: Performs the action (scrolling, zooming, etc.).

# How to Test Our Extension

Step 1: Load the Extension

- Open Chrome → Go to chrome://extensions/
- Enable Developer Mode (top right).
- Click "Load Unpacked" → Select the gesture-gaze-extension/extension folder.

Step 2: Open a Webpage & Check Console

- Open any website (e.g., Google Docs, YouTube).
- Press Ctrl + Shift + J (Windows) or Cmd + Option + J (Mac) to open DevTools Console.
- Move Our hand up/down to see gesture logs.

Step 3: Verify Scrolling Works
- If you see "Received gesture: scroll-down" in the console, Our extension is working.
- If the page scrolls up/down when you move Our hand, gesture control is fully functional.