import {
    getGlobalPreferences,
    getUserData,
} from "./storageHelper";

const videoSelect = document.querySelector("#videoSource");
const togglePreview = document.querySelector("#togglePreview");
const togglePointer = document.querySelector("#togglePointer");
const pointerColor = document.querySelector("#pointerColor");
let preferredCamId;

function applyPopupPref(preferences) {
    if (preferences.pointerState) {
        togglePointer.checked = preferences.pointerState;
    }
    if (preferences.pointerColor) {
        pointerColor.value = preferences.pointerColor;
    }
    if (preferences.camPreviewState) {
        togglePreview.checked = preferences.camPreviewState;
    }
    if (preferences.camDeviceId) {
        preferredCamId = preferences.camDeviceId;
    }
}

getGlobalPreferences(applyPopupPref);

// getUserData((data) => {});

navigator.mediaDevices
    .enumerateDevices()
    .then(gotDevices)
    .catch((error) => console.error("enumerateDevices() error: ", error));

function gotDevices(deviceInfos) {
    for (const deviceInfo of deviceInfos) {
        if (deviceInfo.kind === "videoinput") {
            const option = document.createElement("option");
            option.value = deviceInfo.deviceId;
            option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    }
    videoSelect.addEventListener("change", () => {
        const selectedCameraId = videoSelect.value;
        chrome.runtime.sendMessage({
            type: "global",
            action: "cameraSelection",
            deviceId: selectedCameraId,
        });
    });
}

togglePointer.addEventListener("change", () => {
    console.log("Sending message to background.js...");
    chrome.runtime.sendMessage(
        {
            type: "global",
            action: "updateSetting",
            key: "pointerState",
            value: togglePointer.checked,
        },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("Message sent successfully:", response);
            }
        }
    );
});
pointerColor.addEventListener("input", () => {
    chrome.runtime.sendMessage({
        type: "global",
        action: "updateSetting",
        key: "pointerColor",
        value: pointerColor.value,
    });
});
togglePreview.addEventListener("change", () => {
    chrome.runtime.sendMessage({
        type: "global",
        action: "updateSetting",
        key: "camPreviewState",
        value: togglePreview.checked,
    });
});
