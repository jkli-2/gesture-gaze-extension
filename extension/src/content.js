const streamIframeId = "gesture-preview-iframe";
const preprocIframeId = "preproc-preview-iframe";
const outerPointerId = "outerCursor";
const innerPointerId = "innerCursor";

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let innerX = window.innerWidth / 2;
let innerY = window.innerHeight / 2;
let outerX = innerX;
let outerY = innerY;
let pointerAnimationColor = "red";
const elasticity = 0.15;
let isPointerDown = false;
let lastHoveredElement;
let gazeScrollMode = false;
let scrollToggleButton = null;
let stickyScrollMode = false;
let stickScrollToggleButton = null;
const GAZE_SCROLL_SPEED_X = 2;
const GAZE_SCROLL_SPEED_Y = 5;

function stickyScroll(startX, startY, dx, dy) {
    const startEvent = new MouseEvent("mousedown", {
        clientX: startX,
        clientY: startY,
        bubbles: true
    });
    const moveEvent = new MouseEvent("mousemove", {
        clientX: startX + dx,
        clientY: startY + dy,
        bubbles: true
    });
    const endEvent = new MouseEvent("mouseup", {
        clientX: startX + dx,
        clientY: startY + dy,
        bubbles: true
    });
    const target = document.elementFromPoint(startX, startY);
    if (target) {
        target.dispatchEvent(startEvent);
        target.dispatchEvent(moveEvent);
        target.dispatchEvent(endEvent);
    }
}

function useMaterialIcons() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("style/material-icons.css");
    document.head.appendChild(link);
}
useMaterialIcons();

function createFloatingPanel() {
    const panel = document.createElement("div");
    panel.id = "omni-panel";
    panel.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(0, 0, 0, 0.3);
        padding: 12px 10px;
        border-radius: 12px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    `;

    const actionButtons = [
        { label: "arrow_upward", action: () => window.scrollBy(0, -200), title: "Scroll Up" },
        { label: "arrow_downward", action: () => window.scrollBy(0, 200), title: "Scroll Down" },
        // { label: "vertical_align_top", action: () => window.scrollTo(0, 0), title: "Scroll to Top" },
        // { label: "refresh", action: () => location.reload(), title: "Refresh" },
        { label: "arrow_back", action: () => history.back(), title: "Back" },
        { label: "arrow_forward", action: () => history.forward(), title: "Forward" },
        { label: "pan_tool", title: "Gaze Scroll Mode" },
        // { label: "open_with", title: "Sticky Scroll Mode" }

    ];
    actionButtons.forEach(({ label, action, title }) => {
        const btn = document.createElement("div");
        btn.innerHTML = `<span class="material-icons">${label}</span>`;
        btn.title = title;
        btn.style.cssText = `
            font-family: 'Material Icons';
            font-size: 24px;
            background: white;
            color: black;
            padding: 6px 10px;
            border-radius: 8px;
            text-align: center;
            user-select: none;
            cursor: pointer;
            transition: background 0.2s ease;
        `;
        if (label === "pan_tool") {
            scrollToggleButton = btn;
            btn.onclick = () => {
                gazeScrollMode = !gazeScrollMode;
                btn.style.background = gazeScrollMode ? "#d1eaff" : "white";
                if (gazeScrollMode) {
                    hideElement(innerPointerId);
                    hideElement(outerPointerId);
                } else {
                    centerPointers();
                    showElement(innerPointerId);
                    showElement(outerPointerId);
                }
            };
        } else {
            btn.onmouseenter = () => (btn.style.background = "#f0f0f0");
            btn.onmouseleave = () => (btn.style.background = "white");
            btn.onclick = action;
        }
        panel.appendChild(btn);
    });
    document.body.appendChild(panel);
}
createFloatingPanel();

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
    if (!document.getElementById(innerPointerId)) {
        const inner = document.createElement("div");
        inner.id = innerPointerId;
        inner.className = "gaze-cursor inner";
        document.body.appendChild(inner);
    }

    if (!document.getElementById(outerPointerId)) {
        const outer = document.createElement("div");
        outer.id = outerPointerId;
        outer.className = "gaze-cursor outer";
        document.body.appendChild(outer);
    }
}
createPointer();

const style = document.createElement("style");
style.textContent = `
  .gaze-cursor {
    position: fixed;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 999999;
    transform: translate(-50%, -50%);
  }

  .gaze-cursor.inner {
    background: limegreen;
    opacity: 0.8;
  }

  .gaze-cursor.outer {
    background: crimson;
    width: 22px;
    height: 22px;
    opacity: 0.5;
    border: 2px solid white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
  }
`;
document.head.appendChild(style);

function updateBalloonCursor(dx, dy) {
    innerX = Math.min(Math.max(0, innerX + dx), window.innerWidth);
    innerY = Math.min(Math.max(0, innerY + dy), window.innerHeight);

    outerX += (innerX - outerX) * elasticity;
    outerY += (innerY - outerY) * elasticity;

    const innerCursor = document.getElementById(innerPointerId);
    const outerCursor = document.getElementById(outerPointerId);
    if (innerCursor && outerCursor) {
        innerCursor.style.left = `${innerX}px`;
        innerCursor.style.top = `${innerY}px`;

        outerCursor.style.left = `${outerX}px`;
        outerCursor.style.top = `${outerY}px`;
    }

    const hoveredElement = document.elementFromPoint(outerX, outerY);
    if (hoveredElement && hoveredElement !== lastHoveredElement) {
        if (lastHoveredElement) {
            lastHoveredElement.dispatchEvent(new MouseEvent("mouseout", {
                bubbles: true,
                clientX: outerX,
                clientY: outerY
            }));
        }

        hoveredElement.dispatchEvent(new MouseEvent("mouseover", {
            bubbles: true,
            clientX: outerX,
            clientY: outerY
        }));

        hoveredElement.dispatchEvent(new MouseEvent("mouseenter", {
            bubbles: true,
            clientX: outerX,
            clientY: outerY
        }));

        lastHoveredElement = hoveredElement;
    }
}

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
        showElement(innerPointerId);
        showElement(outerPointerId);
    }
    if (preferences.pointerState === false) {
        hideElement(innerPointerId);
        hideElement(outerPointerId);
    }
    if (preferences.pointerColor) {
        document.getElementById(innerPointerId).style.background = preferences.pointerColor;
        document.getElementById(outerPointerId).style.background = preferences.pointerColor;
        document.getElementById(outerPointerId).style.borderColor = getContrastyColor(preferences.pointerColor);
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
        setTimeout(() => pill.remove(), 300);
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

function animatePointerDown(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "pointer-down-ripple";
    ripple.style.cssText = `
        position: fixed;
        top: ${y}px;
        left: ${x}px;
        width: 20px;
        height: 20px;
        background: ${pointerAnimationColor};
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.8;
        z-index: 999999;
        pointer-events: none;
        transition: transform 100ms ease-out, opacity 100ms ease-out;
    `;
    document.body.appendChild(ripple);

    requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(1.8)";
        ripple.style.opacity = "0.5";
    });

    setTimeout(() => {
        ripple.remove();
    }, 150);
}

function animatePointerUp(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "pointer-up-ripple";
    ripple.style.cssText = `
        position: fixed;
        top: ${y}px;
        left: ${x}px;
        width: 20px;
        height: 20px;
        background: ${pointerAnimationColor};
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.5;
        z-index: 999999;
        pointer-events: none;
        transition: transform 300ms ease-out, opacity 300ms ease-out;
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

function getContrastyColor(hexColor) {
    if (hexColor.startsWith('#')) hexColor = hexColor.slice(1);
    if (hexColor.length === 3) {
        hexColor = hexColor.split('').map(c => c + c).join('');
    }

    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);

    // Calculate luminance (per ITU-R BT.709)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 160 ? '#000000' : '#FFFFFF';
}

function centerPointers() {
    px = window.innerWidth / 2
    py = window.innerHeight / 2
    outerX = px;
    outerY = py;
    const outer = document.getElementById(outerPointerId);
    outer.style.left = `${px}px`;
    outer.style.top = `${py}px`;
    innerX = px;
    innerY = py;
    const inner = document.getElementById(innerPointerId);
    inner.style.left = `${px}px`;
    inner.style.top = `${py}px`;
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
        showElement(innerPointerId);
        showElement(outerPointerId);
    }
    if (msg.type === "HIDE_POINTER") {
        hideElement(innerPointerId);
        hideElement(outerPointerId);
    }
    if (msg.type === "POINTER_COLOR") {
        document.getElementById(innerPointerId).style.background = msg.val;
        document.getElementById(outerPointerId).style.background = msg.val;
        document.getElementById(outerPointerId).style.borderColor = getContrastyColor(msg.val);
        pointerAnimationColor = msg.val;
    }
    if (msg.type === "POINTER") {
        const pageW = window.innerWidth;
        const pageH = window.innerHeight;

        const px = (1-msg.x) * pageW;
        const py = msg.y * pageH;

        innerX = px;
        innerY = py;
        const inner = document.getElementById(innerPointerId);
        inner.style.left = `${px}px`;
        inner.style.top = `${py}px`;
        outerX = px;
        outerY = py;
        const outer = document.getElementById(outerPointerId);
        outer.style.left = `${px}px`;
        outer.style.top = `${py}px`;
    }
    if (msg.type === "CENTRE_POINTER") {
        centerPointers();
    }
    if (msg.type === "GAZE_MOVE") {
        if (gazeScrollMode) {
            window.scrollBy(msg.dx * GAZE_SCROLL_SPEED_X, msg.dy * GAZE_SCROLL_SPEED_Y);
        } else {
            updateBalloonCursor(msg.dx, msg.dy);
        }
    }
    if (msg.type === "CLICK") {
        const pointer = document.getElementById(outerPointerId);
        if (!pointer) return;
        if (gazeScrollMode) {
            gazeScrollMode = false;
            if (scrollToggleButton) {
                scrollToggleButton.style.background = "white";
            }
            centerPointers();
            showElement(innerPointerId);
            showElement(outerPointerId);
            return;
        }

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
    if (msg.type === "MOUSE_DOWN" || msg.type === "MOUSE_UP") {
        const eventType = msg.type === "MOUSE_DOWN" ? "mousedown" : "mouseup";
        isPointerDown = msg.type === "MOUSE_DOWN";
        const pointer = document.getElementById(outerPointerId);
        if (!pointer) return;

        const rect = pointer.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const target = document.elementFromPoint(cx, cy);
        if (target) {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                clientX: cx,
                clientY: cy,
                buttons: 1
            });
            target.dispatchEvent(event);
        }
        if (msg.type === "MOUSE_DOWN") {
            animatePointerDown(outerX, outerY);
        }
        if (msg.type === "MOUSE_UP") {
            animatePointerUp(outerX, outerY);
        }
    }
});
