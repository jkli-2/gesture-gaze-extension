//
// Pointer
//
let pointer;
let pointerColor;
let pointerX = -10; // to center align
let pointerY = -10;
const speed = 10;

function createPointer(color = "red") {
    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "gesture-pointer";
        pointer.setAttribute("style", `
            position: fixed;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            pointer-events: none;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.05s linear;
        `);
        if (color) {
            pointer.style.backgroundColor = color;
        }
        document.body.appendChild(pointer);
    }
}

function removePointer() {
    if (pointer) {
        pointer.remove();
        pointer = null;
        pointerX = -10;
        pointerY = -10;
    }
}

function changePointerColor(color) {
    if (pointer) {
        pointer.style.backgroundColor = color;
        pointerColor = color;
    }
}


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
    if (pointer) {
        pointer.style.transform = `translate(${pointerX}px, ${pointerY}px)`;
    }
}

// Load states
chrome.storage.sync.get(["pointerState", "pointerColor"], (result) => {
    if (result.pointerState) {
        createPointer();
    }
    if (result.pointerColor) {
        changePointerColor(result.pointerColor);
    }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("Msg in content.js:", message);

    if (message.action === "pointerToggleChanged") {
        if (message.state) {
            createPointer(pointerColor);
        } else {
            removePointer();
        }
    }

    if (message.action === "pointerColorChanged" || message.color) {
        changePointerColor(message.color);
    }
});

// Gesture Recognition
// let lastGesture = null;
// startCamera();
// startCamera((canvas) => {
//     const hands = initializeGestureRecognition((gesture) => {
//         console.log("Detected gesture:", gesture);
//         if (message.gesture !== lastGesture) {
//             chrome.runtime.sendMessage({ action: "gestureDetected", gesture });
//             lastGesture = gesture;  // Store last gesture to avoid repetition
//         }
//     });

//     hands.send({ image: canvas });
// });