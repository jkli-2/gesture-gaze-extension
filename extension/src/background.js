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
                    neutralPose: { yaw: 0, pitch: 0 }
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

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.type === "OFFSCREEN_READY") {
        chrome.runtime.sendMessage({ type: "START_DETECT" });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "OFFSCREEN_READY" });
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
                chrome.tabs.sendMessage(tabs[0].id, { type: "START_STREAM" });
            });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_STREAM" });
            });
        }
    }
    if (msg.type === "TOGGLE_POINTER") {
        if (msg.state) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_POINTER" });
            });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "HIDE_POINTER" });
            });
        }
    }
    if (msg.type === "POINTER_COLOR") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "POINTER_COLOR", val: msg.val });
        });
    }
    if (msg.type === "POINTER") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "POINTER", x: msg.x, y: msg.y });
        });
    }
    if (msg.type === "GAZE_MOVE") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "GAZE_MOVE", dx: msg.dx, dy: msg.dy });
        });
    }
    if (msg.type === "CLICK") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "CLICK" });
        });
    }
    if (msg.type === "MOUSE_DOWN") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "MOUSE_DOWN" });
        });
    }
    if (msg.type === "MOUSE_UP") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "MOUSE_UP" });
        });
    }
    if (msg.type === "CENTRE_POINTER") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: "CENTRE_POINTER" });
        });
    }
});
