import { tf, loadHandDetector, loadFaceDetector } from "./tfjs-bundle.mjs";

let portRef = null;
let modelsLoaded = false;
let handDetector, faceDetector, gazeModel;

async function loadModelsOnce() {
    if (modelsLoaded) return;
    handDetector = await loadHandDetector();
    faceDetector = await loadFaceDetector();
    try {
        gazeModel = await tf.loadGraphModel(chrome.runtime.getURL("models/model.json"));
    } catch (err) {
        console.warn("Gaze Model Loading Error:", err);
    }
    modelsLoaded = true;
}
loadModelsOnce().then(() => {
    console.log("Models loaded and ready");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length < 1) return;
        chrome.tabs.sendMessage(tabs[0].id, { type: "MODEL_READY" });
    });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && modelsLoaded) {
        chrome.tabs.sendMessage(tabId, { type: "MODEL_READY" }, function (response) {
            if (chrome.runtime.lastError) {
                console.warn("Message failed:", chrome.runtime.lastError.message);
            }
        });
    }
});

chrome.runtime.onConnect.addListener(function (port) {
    console.log("Long-lived connection established:", port.name);
    if (port.name !== "gaze-gesture-connection") return;

    portRef = port;

    port.onMessage.addListener(async (msg) => {
        if (msg.type === "PING") {
            console.log("Ping received.");
        }
        if (msg.type === "PREDICT_GAZE") {
            const imageTensor = tf.tensor(
                msg.imageTensor.data,
                msg.imageTensor.shape,
                msg.imageTensor.dtype
            );
            const pupilTensor = tf.tensor(
                msg.pupilTensor.data,
                msg.pupilTensor.shape,
                msg.pupilTensor.dtype
            );
            const output = gazeModel
                .predict({
                    image_input: imageTensor,
                    pupil_input: pupilTensor,
                })
                .dataSync();
            imageTensor.dispose();
            pupilTensor.dispose();
            port.postMessage({ type: "GAZE_RESULT", result: output });
        }
        if (msg.type === "DETECTOR") {
            const imageTensor = tf.tensor(msg.data, msg.shape, msg.dtype);
            if (faceDetector) {
                const faces = await faceDetector.estimateFaces(imageTensor);
                port.postMessage({ type: "FACE_RESULT", result: faces });
            }
            if (handDetector) {
                const hands = await handDetector.estimateHands(imageTensor);
                port.postMessage({ type: "HAND_RESULT", result: hands });
            }
            imageTensor.dispose();
        }
    });

    port.onDisconnect.addListener(() => {
        console.log("Port disconnected. Background worker may suspend soon.");
        portRef = null;
    });
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        initializeUserStorage();
        chrome.tabs.create({ url: "ui/welcome.html" });
    } else if (details.reason === "update") {
        // chrome.tabs.create({ url: "ui/changelog.html" });
    }
});

// Startup Sequence
chrome.runtime.onStartup.addListener(() => {
    initializeUserStorage();
});

let creating;
async function ensureOffscreenDoc() {
    const path = "ui/offscreen.html";
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [offscreenUrl],
    });

    if (existingContexts.length > 0) {
        return;
    }
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: offscreenUrl,
            reasons: ["DISPLAY_MEDIA"],
            justification: "Stream webcam using offscreen canvas",
        });
        await creating;
        creating = null;
    }
}

function initializeUserStorage() {
    chrome.storage.local.get(["preferences", "data", "perSitePreferences"], (result) => {
        if (Object.keys(result).length === 0) {
            const defaultUserValues = {
                preferences: {
                    detectState: true,
                    pointerState: true,
                    pointerColor: "#ff0000",
                    streamState: true,
                    camDeviceId: null,
                    neutralPose: { yaw: 0, pitch: 0 },
                },
                data: [
                    {
                        userId: 0,
                        groupId: -1,
                        userName: "John",
                    },
                ],
                perSitePreferences: [
                    {
                        siteId: 0,
                        siteDomain: "youtube.com",
                        customGesture: null,
                    },
                ],
            };
            chrome.storage.local.set(defaultUserValues, () => {
                console.log("User Storage is set to default.");
            });
        }
    });
}

function getPreferences(callback) {
    chrome.storage.local.get(["preferences"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading preferences:", chrome.runtime.lastError);
            callback({});
        } else {
            callback(result.preferences || {});
        }
    });
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.type === "OFFSCREEN_READY") {
        chrome.runtime.sendMessage({ type: "START_DETECT" });
        getPreferences((preferences) => {
            if (preferences.neutralPose) {
                const neutralPose = {
                    yaw: preferences.neutralPose.yaw,
                    pitch: preferences.neutralPose.pitch,
                };
                chrome.runtime.sendMessage({ type: "SET_NEUTRAL_POSE", pose: neutralPose });
            }
        });
    }
    if (msg.type === "TOGGLE_DETECT") {
        await ensureOffscreenDoc();
        if (msg.state) {
            chrome.runtime.sendMessage({ type: "START_DETECT" });
        } else {
            chrome.runtime.sendMessage({ type: "STOP_DETECT" });
        }
    }
    if (msg.type === "TOGGLE_STREAM") {
        if (msg.state) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length < 1) return;
                chrome.tabs.sendMessage(tabs[0].id, { type: "START_STREAM" });
            });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length < 1) return;
                chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_STREAM" });
            });
        }
    }
    if (msg.type === "TOGGLE_POINTER") {
        if (msg.state) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length < 1) return;
                chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_POINTER" });
            });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || tabs.length < 1) return;
                chrome.tabs.sendMessage(tabs[0].id, { type: "HIDE_POINTER" });
            });
        }
    }
    if (msg.type === "POINTER_COLOR") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "POINTER_COLOR", val: msg.val });
        });
    }
    if (msg.type === "POINTER") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "POINTER", x: msg.x, y: msg.y });
        });
    }
    if (msg.type === "GAZE_MOVE") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "GAZE_MOVE", dx: msg.dx, dy: msg.dy });
        });
    }
    if (msg.type === "CLICK") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "CLICK" });
        });
    }
    if (msg.type === "MOUSE_DOWN") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "MOUSE_DOWN" });
        });
    }
    if (msg.type === "MOUSE_UP") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "MOUSE_UP" });
        });
    }
    if (msg.type === "CENTRE_POINTER") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length < 1) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: "CENTRE_POINTER" });
        });
    }
});
