// Welcome page
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.tabs.create({ url: "ui/welcome.html" });
    } else if (details.reason === "update") {
        chrome.tabs.create({ url: "ui/welcome.html" });
    }
})

// Video stream choice
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BGMSG: ", message)
    if (message.type === "frameUpdate") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, message);
        });
    }
    if (message.type === "cameraSelection") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "cameraSelection", deviceId: message.deviceId });
      });
    }
    if (message.action === "pointerToggleChanged" || message.action === "previewToggleChanged" || message.action === "pointerColorChanged") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, message);
        });
    }
});
  