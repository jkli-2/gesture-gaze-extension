document.addEventListener("DOMContentLoaded", async () => {
    const togglePointer = document.getElementById("togglePointer");
    const pointerColor = document.getElementById("pointerColor");
    const toggleDetect = document.getElementById("toggleDetect");
    const toggleStream = document.getElementById("toggleStream");
    const btnCalibrate = document.getElementById("calibrate-btn");
    let preferredCamId;

    function applyPopupPref(preferences) {
        togglePointer.checked = preferences.pointerState || false;
        pointerColor.value = preferences.pointerColor || "#FF0000";
        toggleDetect.checked = preferences.detectState || false;
        toggleStream.checked = preferences.streamState || false;
        preferredCamId = preferences.camDeviceId;
    }

    getPreferences(applyPopupPref);

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

    function updatePreferences(key, value) {
        chrome.storage.local.get(["preferences"], (result) => {
            let preferences = result.preferences || {};
            preferences[key] = value;
            chrome.storage.local.set({ preferences });
        });
    }

    togglePointer.addEventListener("change", () => {
        const state = togglePointer.checked;
        updatePreferences("pointerState", state);
        chrome.runtime.sendMessage({ type: "TOGGLE_POINTER", state });
    });
    pointerColor.addEventListener("input", () => {
        const val = pointerColor.value;
        updatePreferences("pointerColor", val);
        chrome.runtime.sendMessage({ type: "POINTER_COLOR", val });
    });
    toggleDetect.addEventListener("change", () => {
        const state = toggleDetect.checked;
        updatePreferences("detectState", state);
        chrome.runtime.sendMessage({ type: "TOGGLE_DETECT", state });
    });
    toggleStream.addEventListener("change", () => {
        const state = toggleStream.checked;
        updatePreferences("streamState", state);
        chrome.runtime.sendMessage({ type: "TOGGLE_STREAM", state });
    });
    btnCalibrate.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "CALIBRATE_POSE" });
});
});
