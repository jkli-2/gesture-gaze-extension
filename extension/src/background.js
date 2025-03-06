import {
    getGlobalPreferences,
    updateGlobalPreferences,
    getUserData,
    updateUserData,
    getPerSitePreferences,
    updatePerSitePreferences,
} from "./storageHelper";

// Welcome page & initialization
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        initializeUserStorage();
        requestCamPermission();
        chrome.tabs.create({ url: "ui/welcome.html" });
    } else if (details.reason === "update") {
        // chrome.tabs.create({ url: "ui/changelog.html" });
    }
});

// Startup Sequence
chrome.runtime.onStartup.addListener(() => {
    initializeUserStorage();
});

function requestCamPermission() {
    chrome.permissions.request(
        {
            permissions: ["camera"],
        },
        (granted) => {
            if (granted) {
                console.log("Camera permission granted permanently!");
            } else {
                console.warn("Camera permission denied.");
            }
        }
    );
}

function initializeUserStorage() {
    chrome.storage.local.get(["preferences", "data", "perSitePreferences"], (result) => {
        if (Object.keys(result).length === 0) {
            const defaultUserValues = {
                preferences: {
                    gestureControlState: true,
                    pointerState: true,
                    pointerColor: "#ff0000",
                    camPreviewState: true,
                    camDeviceId: null,
                    customGesture: null,
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

// Listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender?.tab?.id;
    switch (message.type) {
        case "global":
            handleGlobalMsg(message, sendResponse);
            break;
        case "user":
            handleUserMsg(message, sendResponse);
            break;
        case "site":
            if (tabId) handleTabMsg(tabId, message, sendResponse);
            break;
        case "cmd":
            handleCmdMsg(message, sendResponse);
            break;
        case "relay":
            relayMsg(message, sendResponse);
        default:
            console.warn("Unknown message type:", message);
            break;
    }
});

function relayMsg(message, sendResponse) {
    message.type = "relay";
    chrome.tabs.query({}, (tabs) => {
        let handled = false;
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn(`No receiver in tab ${tab.id}:`, chrome.runtime.lastError.message);
                } else {
                    console.log(`Message delivered to tab ${tab.id}`);
                    handled = true;
                }
                if (!handled) sendResponse({ status: "No receivers available!" });
            });
        });
    });
}

function handleGlobalMsg(message, sendResponse) {
    if (message.action === "updateSetting") {
        updateGlobalPreferences(message.key, message.value);
        console.log("Response:", sendResponse);
        relayMsg(message, sendResponse);
        sendResponse({ success: true });
    } else if (message.action === "getSettings") {
        getGlobalPreferences((settings) => sendResponse(settings));
    } else if (message.action === "settingUpdated") {
        console.log("UPDATED!!!", message);
    }
}

function handleUserMsg(message, sendResponse) {
    if (message.action === "updateSetting") {
        updateUserData(message.userId, message.key, message.value);
        sendResponse({ success: true });
    } else if (message.action === "getSettings") {
        getUserData(message.userId, message.key, message.value);
    }
}

// TODO: tabId vs siteId vs siteDomain
const tabStates = {};
function handleTabMsg(tabId, message, sendResponse) {
    if (message.action === "updateSetting") {
        tabStates[tabId] = tabStates[tabId] || {};
        tabStates[tabId][message.key] = message.value;
        chrome.runtime.sendMessage({
            type: "tab",
            action: "settingUpdated",
            tabId,
            key: message.key,
            value: message.value,
        });
        sendResponse({ success: true });
    } else if (message.action === "getSettings") {
        sendResponse(tabStates[tabId] || {});
    }
}

// For non-storage actions, more general use case like UI actions.
function handleCmdMsg(message, sendResponse) {
    // Example
    if (message.action === "takeScreenshot") {
        chrome.tabs.captureVisibleTab((image) => {
            sendResponse({ screenshot: image });
        });
    }
}
