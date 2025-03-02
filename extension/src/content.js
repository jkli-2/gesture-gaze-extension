let lastGesture = null;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.gesture && message.gesture !== lastGesture) {
        console.log("Received gesture:", message.gesture);
        handleGesture(message.gesture);
        lastGesture = message.gesture;  // Store last gesture to avoid repetition
    }
});

// Function to execute gestures
function handleGesture(gesture) {
    if (gesture === "scroll-up") {
        window.scrollBy(0, -100);
    } else if (gesture === "scroll-down") {
        window.scrollBy(0, 100);
    }
}
