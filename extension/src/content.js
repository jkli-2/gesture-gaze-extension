const streamPreviewId = "gesture-preview-iframe";
const outerPointerId = "outerCursor";
const innerPointerId = "innerCursor";

let isIframeResizing = false;
let iframeAspectRatio = 4 / 3;
let startX, startY, startWidth, startHeight;
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
const GAZE_SCROLL_SPEED_X = 1;
const GAZE_SCROLL_SPEED_Y = 2;

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
        top: 240px;
        right: 40px;
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
        // { label: "refresh", action: () => location.reload(), title: "Refresh" },
        { label: "arrow_upward", action: () => scrollOnScrollable(0, -200), title: "Scroll Up" },
        { label: "arrow_downward", action: () => scrollOnScrollable(0, 200), title: "Scroll Down" },
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
            all: initial;
            display: inline-block;
            font-family: 'Material Icons';
            font-size: 24px;
            background: white;
            color: black;
            padding: 6px 6px;
            border-radius: 8px;
            text-align: center;
            user-select: none;
            cursor: pointer;
            transition: background 0.2s ease;
            line-height: 1;
            vertical-align: middle;
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

function setupResize(wrapper, iframe, handle) {
    handle.addEventListener("mousedown", (e) => {
        isIframeResizing = true;
        const wrapperRect = wrapper.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = wrapperRect.width;
        startHeight = wrapperRect.height;
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isIframeResizing) return;

        const dx = startX - e.clientX;
        const newWidth = Math.max(160, startWidth + dx);
        const newHeight = newWidth / iframeAspectRatio;

        wrapper.style.width = `${newWidth}px`;
        wrapper.style.height = `${newHeight}px`;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
    });

    document.addEventListener("mouseup", () => {
        isIframeResizing = false;
    });
}


function createStreamIframe() {
    const elmt = document.getElementById("streamIframeWrapper");
    if (elmt) return;

    const iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("ui/offscreen.html");
    iframe.id = "streamIframe";
    iframe.allow = "camera";
    iframe.style.border = "2px solid #666";
    iframe.style.borderRadius = "8px";
    iframe.style.background = "black";
    iframe.style.opacity = "1";
    iframe.style.pointerEvents = "auto";
    iframe.style.position = "absolute";
    iframe.style.width = "100%";
    iframe.style.height = "100%";

    const handle = document.createElement("div");
    handle.id = "streamIframeResizeHandle";
    handle.innerHTML = `<span class="material-icons" style="font-size:14px;">open_with</span>`;
    handle.style.position = "absolute";
    handle.style.width = "16px";
    handle.style.height = "16px";
    handle.style.bottom = "-4px";
    handle.style.left = "0px";
    handle.style.cursor = "nwse-resize";
    handle.style.zIndex = "10001";
    handle.style.color = "#aaa";
    handle.style.display = "flex";
    handle.style.alignItems = "center";
    handle.style.justifyContent = "center";
    handle.style.userSelect = "none";
    handle.style.background = "rgba(0,0,0,0.4)";
    handle.style.borderRadius = "6px";

    const wrapper = document.createElement("div");
    wrapper.id = streamPreviewId;
    wrapper.style.position = "fixed";
    wrapper.style.top = "10px";
    wrapper.style.right = "10px";
    wrapper.style.width = "160px";
    wrapper.style.height = "120px";
    wrapper.style.zIndex = "9999";
    wrapper.appendChild(iframe);
    wrapper.appendChild(handle);
    document.body.appendChild(wrapper);

    setupResize(wrapper, iframe, handle);
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

function showElement(id, useOpacity = false) {
    const elmt = document.getElementById(id);
    if (elmt) {
        if (useOpacity) {
            elmt.style.opacity = "1";
        } else {
            elmt.style.display = ""
        }
    };
}

function hideElement(id, useOpacity = false) {
    const elmt = document.getElementById(id);
    if (elmt) {
        if (useOpacity) {
            elmt.style.opacity = "0";
        } else {
            elmt.style.display = "none";
        }
    }
}

function removeElement(id) {
    const elmt = document.getElementById(id);
    if (elmt) elmt.remove();
}

getPreferences((preferences) => {
    if (preferences.streamState === true) {
        showElement(streamPreviewId, useOpacity=true);
    }
    if (preferences.streamState === false) {
        hideElement(streamPreviewId, useOpacity=true);
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

function scrollOnScrollable(dx, dy) {
    const scrollTarget = findScrollables() || window;
    scrollTarget.scrollBy(dx, dy);
}

function findScrollables() {
    if (document.scrollingElement?.scrollHeight > window.innerHeight) {
        return document.scrollingElement;
    }

    const candidates = Array.from(document.querySelectorAll("div, main, section, article"));
    let bestMatch = null;

    for (const el of candidates) {
        const style = getComputedStyle(el);
        const canScroll = el.scrollHeight > el.clientHeight;
        const overflowY = style.overflowY;

        const isScrollable = canScroll && (
            overflowY === "auto" ||
            overflowY === "scroll" ||
            overflowY === "visible"
        );

        if (isScrollable) {
            if (!bestMatch || el.scrollHeight > bestMatch.scrollHeight) {
                bestMatch = el;
            }
        }
    }
    return bestMatch;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "MODEL_READY") {
        removeStatusPill();
    }
    if (msg.type === "START_STREAM") {
        showElement(streamPreviewId, useOpacity=true);
    }
    if (msg.type === "STOP_STREAM") {
        hideElement(streamPreviewId, useOpacity=true);
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
            // window.scrollBy(msg.dx * GAZE_SCROLL_SPEED_X, msg.dy * GAZE_SCROLL_SPEED_Y);
            scrollOnScrollable(msg.dx * GAZE_SCROLL_SPEED_X, msg.dy * GAZE_SCROLL_SPEED_Y)
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
