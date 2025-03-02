// Function to check if content script is loaded and send a gesture message
function sendGestureMessage(tabId, gesture) {
  chrome.tabs.sendMessage(tabId, { gesture: gesture }, (response) => {
      if (chrome.runtime.lastError) {
          console.warn("Content script not ready. Retrying...");
          setTimeout(() => sendGestureMessage(tabId, gesture), 500);
      }
  });
}

// Wait for an active tab and send a test gesture
setTimeout(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
          sendGestureMessage(tabs[0].id, "scroll-down");
      }
  });
}, 3000);
