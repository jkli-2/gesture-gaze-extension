const streamIframeId = "gesture-preview-iframe";
const pointerId = "pointer";
const speed = 10;

function createStreamIframe() {
    const elmt = document.getElementById(streamIframeId);
    if (!elmt) {
        const iframe = document.createElement("iframe");
        iframe.src = chrome.runtime.getURL("ui/offscreen.html");
        iframe.id = streamIframeId;
        iframe.style.position = "fixed";
        iframe.style.bottom = "10px";
        iframe.style.right = "10px";
        iframe.style.width = "320px";
        iframe.style.height = "240px";
        iframe.style.border = "2px solid #666";
        iframe.style.zIndex = "9999";
        iframe.style.display = "none";
        iframe.allow = "camera";
        document.body.appendChild(iframe);
    }
}
createStreamIframe();

function createPointer() {
    const elmt = document.getElementById(pointerId);
    if (!elmt) {
        const pointer = document.createElement("div");
        pointer.id = pointerId;
        pointer.dataset.pointerx = "-10";
        pointer.dataset.pointery = "-10";
        pointer.style.position = "fixed";
        pointer.style.width = "20px";
        pointer.style.height = "20px";
        pointer.style.borderRadius = "50%";
        pointer.style.backgroundColor = "red";
        pointer.style.pointerEvents = "none";
        pointer.style.top = "50%";
        pointer.style.left = "50%";
        pointer.style.transform = "translate(-50%, -50%)";
        pointer.style.transition = "transform 0.05s linear";
        pointer.style.display = "none";
        document.body.appendChild(pointer);
    }
}
createPointer();

function showElement(id) {
    const elmt = document.getElementById(id);
    if (elmt) elmt.style.display = "";
}

function hideElement(id) {
    const elmt = document.getElementById(id);
    if (elmt) elmt.style.display = "none";
}

function removeElement(id) {
    const elmt = document.getElementById(id);
    if (elmt) elmt.remove();
}

getPreferences((preferences) => {
    if (preferences.streamState === true) {
        showElement(streamIframeId);
    }
    if (preferences.streamState === false) {
        hideElement(streamIframeId);
    }
    if (preferences.pointerState === true) {
        showElement(pointerId);
    }
    if (preferences.pointerState === false) {
        hideElement(pointerId);
    }
    if (preferences.pointerColor) {
        document.getElementById(pointerId).style.backgroundColor = preferences.pointerColor;
    }
    const state = preferences.detectState;
    chrome.runtime.sendMessage({ type: "TOGGLE_DETECT", state });
});

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_STREAM") {
        showElement(streamIframeId);
    }
    if (msg.type === "STOP_STREAM") {
        hideElement(streamIframeId);
    }
    if (msg.type === "SHOW_POINTER") {
        showElement(pointerId);
    }
    if (msg.type === "HIDE_POINTER") {
        hideElement(pointerId);
    }
    if (msg.type === "POINTER_COLOR") {
        document.getElementById(pointerId).style.backgroundColor = msg.val;
    }
    if (msg.type === "POINTER") {
        const pageW = window.innerWidth;
        const pageH = window.innerHeight;

        const px = (1-msg.x) * pageW;
        const py = msg.y * pageH;

        const pointer = document.getElementById(pointerId);
        pointer.style.left = `${px}px`;
        pointer.style.top = `${py}px`;
    }
});
