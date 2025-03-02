// Scrolling
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


// Pointing
const pointer = document.createElement("div");
pointer.id = "gesture-pointer";
document.body.appendChild(pointer);
const style = document.createElement("style");
style.innerHTML = `
    #gesture-pointer {
        position: fixed;
        width: 20px;
        height: 20px;
        background-color: red;
        border-radius: 50%;
        pointer-events: none;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transition: transform 0.05s linear;
    }
`;
document.head.appendChild(style);

let pointerX = -10; // half the self
let pointerY = -10;
const speed = 10;
document.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "w":
            pointerY -= speed;
            break;
        case "s":
            pointerY += speed;
            break;
        case "a":
            pointerX -= speed;
            break;
        case "d":
            pointerX += speed;
            break;
    }
    updatePointerPos();
});

function updatePointerPos() {
    pointer.style.transform = `translate(${pointerX}px, ${pointerY}px)`;
}