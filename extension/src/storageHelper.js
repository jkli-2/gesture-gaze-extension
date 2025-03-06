function getGlobalPreferences(callback) {
    chrome.storage.local.get(["preferences"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading global preferences:", chrome.runtime.lastError);
            callback({});
        } else {
            callback(result.preferences || {});
        }
    });
}

function updateGlobalPreferences(key, value) {
    chrome.storage.local.get(["preferences"], (result) => {
        let preferences = result.preferences || {};
        preferences[key] = value;
        chrome.storage.local.set({ preferences });
    });
}

function getUserData(userId, callback) {
    chrome.storage.local.get(["data"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading user data:", chrome.runtime.lastError);
            callback({});
        } else {
            callback(result.preferences || {});
        }
    });
}

function updateUserData(userId, key, value) {
    chrome.storage.local.get(["data"], (result) => {
        let preferences = result.preferences || {};
        preferences[key] = value;
        chrome.storage.local.set({ preferences });
    });
}

function getPerSitePreferences(siteId, callback) {
    chrome.storage.local.get(["perSitePreferences"], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading per site preferences:", chrome.runtime.lastError);
            callback({});
        } else {
            callback(result.preferences || {});
        }
    });
}

function updatePerSitePreferences(siteId, key, value) {
    chrome.storage.local.get(["perSitePreferences"], (result) => {
        let preferences = result.preferences || {};
        preferences[key] = value;
        chrome.storage.local.set({ preferences });
    });
}

// Expose functions for both popup.js and content.js
export {
    getGlobalPreferences,
    updateGlobalPreferences,
    getUserData,
    updateUserData,
    getPerSitePreferences,
    updatePerSitePreferences,
};
