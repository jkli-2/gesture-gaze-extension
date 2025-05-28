const streamIframeId = "gesture-preview-iframe";
const preprocIframeId = "preproc-preview-iframe";
const pointerId = "pointer";
const speed = 10;

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let pointerAnimationColor = "red";

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
        iframe.style.borderRadius = "8px";
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
        pointer.style.border = "2px solid white";
        pointer.style.backgroundColor = "red";
        pointer.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.6)";
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
        pointerAnimationColor = preferences.pointerColor;
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

function createStatusPill(message = "Bottom text") {
    if (document.getElementById("inference-status-pill")) return;

    const pill = document.createElement("div");
    pill.id = "inference-status-pill";
    pill.style.cssText = `
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 8px 20px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
        font-family: sans-serif;
        z-index: 999999;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
    `;
    pill.textContent = message;
    document.body.appendChild(pill);

    requestAnimationFrame(() => {
        pill.style.opacity = "1";
    });
}

function removeStatusPill() {
    const pill = document.getElementById("inference-status-pill");
    if (pill) {
        pill.style.opacity = "0";
        setTimeout(() => pill.remove(), 300); // match transition duration
    }
}

createStatusPill("Loading models, please wait...");

function animateClick(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "click-ripple";
    ripple.style.cssText = `
        position: fixed;
        top: ${y}px;
        left: ${x}px;
        width: 20px;
        height: 20px;
        background: ${pointerAnimationColor};
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        z-index: 999999;
        pointer-events: none;
        transition: transform 300ms ease, opacity 300ms ease;
    `;
    document.body.appendChild(ripple);

    requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(4)";
        ripple.style.opacity = "0";
    });

    setTimeout(() => {
        ripple.remove();
    }, 300);
}


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "OFFSCREEN_READY") {
        removeStatusPill();
    }
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
        pointerAnimationColor = msg.val;
    }
    if (msg.type === "POINTER") {
        const pageW = window.innerWidth;
        const pageH = window.innerHeight;

        const px = (1-msg.x) * pageW;
        const py = msg.y * pageH;

        pointerX = px;
        pointerY = py;

        const pointer = document.getElementById(pointerId);
        pointer.style.left = `${px}px`;
        pointer.style.top = `${py}px`;
    }
    if (msg.type === "CENTRE_POINTER") {
        pointerX = window.innerWidth / 2
        pointerY = window.innerHeight / 2
        const pointer = document.getElementById(pointerId);
        pointer.style.left = `${pointerX}px`;
        pointer.style.top = `${pointerY}px`;
    }
    if (msg.type === "GAZE_MOVE") {
        pointerX = Math.min(Math.max(0, pointerX + msg.dx), window.innerWidth);
        pointerY = Math.min(Math.max(0, pointerY + msg.dy), window.innerHeight);

        const pointer = document.getElementById(pointerId);
        if (pointer) {
            pointer.style.left = `${pointerX}px`;
            pointer.style.top = `${pointerY}px`;
        }
    }
    if (msg.type === "CLICK") {
        const pointer = document.getElementById(pointerId);
        if (!pointer) return;

        const rect = pointer.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const target = document.elementFromPoint(cx, cy);
        if (target) {
            const eventInit = {
                bubbles: true,
                cancelable: true,
                clientX: cx,
                clientY: cy,
                view: window,
                buttons: 1
            };

            target.dispatchEvent(new PointerEvent("pointerdown", eventInit));
            target.dispatchEvent(new MouseEvent("mousedown", eventInit));
            target.dispatchEvent(new PointerEvent("pointerup", eventInit));
            target.dispatchEvent(new MouseEvent("mouseup", eventInit));
            target.dispatchEvent(new MouseEvent("click", eventInit));
        }
        animateClick(cx, cy);
    }
});
