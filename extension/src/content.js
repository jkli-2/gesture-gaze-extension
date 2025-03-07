import DOMFactory from "./domFactory";
import { getGlobalPreferences, getUserData, getPerSitePreferences } from "./storageHelper";
import { startCamera, stopCamera } from "./camera";
import { createGestureRecognizer, predictWebcam } from "./gesture";

// Handle preferences and states
async function applyGlobalPref(preferences) {
    // Dark mode example
    // if (settings.theme === "dark") {
    //     document.body.classList.add("dark-mode");
    // } else {
    //     document.body.classList.remove("dark-mode");
    // }
    if (preferences.pointerState === true) {
        createPointer();
    }
    if (preferences.pointerState === false) {
        removePointer();
    }
    if (preferences.pointerColor) {
        changePointerColor(preferences.pointerColor);
    }
    if (preferences.camPreviewState === true) {
        createCamPreviewOverlay();
        startCamera(camVideoElmt);
    }
    if (preferences.camPreviewState === false) {
        stopCamera();
        removeCamPreviewOverlay();
    }
    if (preferences.gestureControlState === true) {
        gestureRecognizer = await createGestureRecognizer();
        if (gestureRecognizer) runGestureRecognition();
    }
}
function applyPerSitePref(preferences) {}

getGlobalPreferences(applyGlobalPref);
// getPerSitePreferences(applyPerSitePref);

//
// Pointer
//
const pointerId = "pointer";
let pointerColor;
const speed = 10;

function createPointer(color = "red") {
    return DOMFactory.createElement(pointerId, "div", {
        dataset: {
            pointerx: "-10",
            pointery: "-10",
        },
        style: {
            position: "fixed",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: `${color}`,
            pointerEvents: "none",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            transition: "transform 0.05s linear",
        },
    });
}

function removePointer() {
    DOMFactory.removeElement(pointerId);
}

function changePointerColor(color) {
    pointerColor = color;
    DOMFactory.updateElement(pointerId, {
        style: {
            backgroundColor: `${color}`,
        },
    });
}

document.addEventListener("keydown", (event) => {
    const pointer = DOMFactory.getElement(pointerId);
    let pointerx = parseInt(pointer.dataset.pointerx);
    let pointery = parseInt(pointer.dataset.pointery);
    switch (event.key) {
        case "w":
            pointery -= speed;
            break;
        case "s":
            pointery += speed;
            break;
        case "a":
            pointerx -= speed;
            break;
        case "d":
            pointerx += speed;
            break;
    }
    updatePointerPos(pointerx.toString(), pointery.toString());
});

function updatePointerPos(x, y) {
    DOMFactory.updateElement(pointerId, {
        dataset: {
            pointerx: x,
            pointery: y,
        },
        style: {
            transform: `translate(${x}px, ${y}px)`,
        },
    });
}

//
// Camera Feed Preview Overlay
//
// Create overlay container
const camPreviewOverlayId = "camPreviewOverlay";
const camVideoId = "camVideo";
const camOutputCanvasId = "camOutputCanvas";
const gestureOutputId = "gestureOutput";

let camPreviewOverlayElmt = null;
let camVideoElmt = null;
let camOutputCanvasElmt = null;
let gestureOutputElmt = null;

let gestureRecognizer = null;

function createCamPreviewOverlay(displayWidth = 320, displayHeight = 240) {
    const camPreviewOverlay = DOMFactory.createElement(camPreviewOverlayId, "div", {
        style: {
            position: "fixed",
            top: "10px",
            right: "10px",
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            background: "grey",
            border: "2px solid green",
            zIndex: "9999",
            opacity: "0.8",
            display: "block",
            color: "white",
            overflow: "hidden",
            resize: "both",
            minWidth: "160px",
            minHeight: "120px",
            maxWidth: "100vw",
            maxHeight: "100vh",
        },
    });
    const camVideo = DOMFactory.createElement(
        camVideoId,
        "video",
        {
            autoplay: true,
            playsinline: true,
            style: {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                top: "0",
                left: "0",
            },
        },
        camPreviewOverlay
    );
    const camOutputCanvas = DOMFactory.createElement(
        camOutputCanvasId,
        "canvas",
        {
            width: 320,
            height: 240,
            style: {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
            },
        },
        camPreviewOverlay
    );
    const gestureOutput = DOMFactory.createElement(
        gestureOutputId,
        "p",
        {
            style: {
                position: "absolute",
                bottom: "5px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.6)",
                padding: "4px 8px",
                borderRadius: "5px",
                color: "white",
                fontSize: "12px",
            },
        },
        camPreviewOverlay
    );

    camPreviewOverlayElmt = camPreviewOverlay;
    camVideoElmt = camVideo;
    camOutputCanvasElmt = camOutputCanvas;
    gestureOutputElmt = gestureOutput;
}

function removeCamPreviewOverlay() {
    camPreviewOverlayElmt = null;
    camVideoElmt = null;
    camOutputCanvasElmt = null;
    gestureOutputElmt = null;
    DOMFactory.removeElement(camVideoId);
    DOMFactory.removeElement(camOutputCanvasId);
    DOMFactory.removeElement(gestureOutputId);
    DOMFactory.removeElement(camPreviewOverlayId);
}

async function runGestureRecognition() {
    if (!camVideoElmt) return;
    try {
        await predictWebcam(gestureRecognizer, camVideoElmt, camOutputCanvasElmt, gestureOutputElmt);
        requestAnimationFrame(() => runGestureRecognition()); // Continuously process frames
    } catch (error) {
        console.error("Gesture recognition failed:", error);
        stopCamera();
        removeCamPreviewOverlay();
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("Msg in content.js:", message);
    if (message.type === "global") {
        if (message.action === "pointerToggleChanged") {
            if (message.state) {
                createPointer(pointerColor);
            } else {
                removePointer();
            }
        } else if (message.action === "pointerColorChanged" || message.color) {
            changePointerColor(message.color);
        } else if (message.action === "previewToggleChanged") {
            if (message.state) {
                createCamPreviewOverlay();
                startCamera(camVideoElmt);
            } else {
                stopCamera();
                removeCamPreviewOverlay();
            }
        } else if (message.action === "cameraSelection") {
            console.log("Cam Select: ", message.deviceId);
            // Restart camera with new device ID
            createCamPreviewOverlay();
            startCamera(camVideoElmt, message.deviceId);
        }
    } else if (message.type === "user") {
    } else if (message.type === "site") {
    } else if (message.type === "cmd") {
    } else if (message.type === "relay") {
        if (message.action === "updateSetting") {
            getGlobalPreferences(applyGlobalPref);
        }
    }
});
