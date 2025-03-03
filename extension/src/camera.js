//
// Camera Feed Preview Overlay
//
// Create overlay container
let camPreviewOverlay;
let previewCanvas;
let previewCtx;

function createCamPreviewOverlay() {
    if (!camPreviewOverlay) {
        camPreviewOverlay = document.createElement("div");
        camPreviewOverlay.style.position = "fixed";
        camPreviewOverlay.style.top = "10px";
        camPreviewOverlay.style.right = "10px";
        camPreviewOverlay.style.width = "320px";
        camPreviewOverlay.style.height = "240px";
        camPreviewOverlay.style.background = "black";
        camPreviewOverlay.style.border = "2px solid white";
        camPreviewOverlay.style.zIndex = "9999";
        camPreviewOverlay.style.opacity = "0.8";
        camPreviewOverlay.style.display = "flex";
        camPreviewOverlay.style.alignItems = "center";
        camPreviewOverlay.style.justifyContent = "center";
        camPreviewOverlay.style.color = "white";
        camPreviewOverlay.innerText = "Camera not initialized";
        document.body.appendChild(camPreviewOverlay);
        
        // Create canvas inside overlay to visualize camera frames
        previewCanvas = document.createElement("canvas");
        previewCanvas.width = 320;
        previewCanvas.height = 240;
        camPreviewOverlay.innerHTML = ""; // Clear placeholder text
        camPreviewOverlay.appendChild(previewCanvas);

        previewCtx = previewCanvas.getContext("2d");
    }
}

function removeCamPreviewOverlay() {
    if (camPreviewOverlay) {
        previewCtx = null;
        previewCanvas.remove()
        previewCanvas = null;
        camPreviewOverlay.remove();
        camPreviewOverlay = null;
    }
}


// Load states
chrome.storage.sync.get(["previewState"], (result) => {
    if (result.previewState) {
        createCamPreviewOverlay();
    }
})

let currentStream = null;

async function startCamera(deviceId = null, callback) {
    try {
        // Stop previous stream if it exists
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        // Request the video stream with the selected camera (or default)
        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;

        const imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
        const offscreenCanvas = new OffscreenCanvas(640, 480);
        const ctx = offscreenCanvas.getContext("2d");

        function processFrame() {
            if (!imageCapture || !currentStream) {
                console.warn("ImageCapture not initialized");
                return;
            }
            // Check if the video track is still live before capturing a frame
            const videoTrack = currentStream.getVideoTracks()[0];
            if (!videoTrack || videoTrack.readyState !== "live") {
                console.warn("Video track is not active, stopping frame capture.");
                return;
            }
            imageCapture.grabFrame().then(async function(imageBitmap) {
                if (imageBitmap) {
                    // console.log('Grabbed frame:', imageBitmap);
                    ctx.drawImage(imageBitmap, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
                    callback(offscreenCanvas); // Send frame to gesture detection
                }
                if (previewCtx) previewCtx.drawImage(imageBitmap, 0, 0, previewCanvas.width, previewCanvas.height);
            }).catch(function(error) {
              console.log('grabFrame() error: ', error);
            });
            // requestAnimationFrame(processFrame);
            setTimeout(processFrame, 50); // Capture frames every 50ms (20 FPS)
          }

        processFrame();
    } catch (error) {
        console.error("Camera access error:", error);
    }
}

// Listen for messages to switch camera
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("Msg in camera.js:", message);

    if (message.action === "previewToggleChanged") {
        if (message.state) {
            createCamPreviewOverlay();
        } else {
            removeCamPreviewOverlay();
        }
    }

    if (message.type === "cameraSelection") {
        console.log("Cam Select: ", message.deviceId);
        startCamera(message.deviceId, ()=>{}); // Restart camera with new device ID
    }
});

// Start with the default camera when the script loads
navigator.mediaDevices.enumerateDevices().then((devices) => {
    const videoInputs = devices.filter(device => device.kind === "videoinput");
    
    if (videoInputs.length > 0) {
        const defaultDeviceId = videoInputs[0].deviceId; // Pick the first available camera
        console.log("Starting Default Camera...");
        startCamera(defaultDeviceId, ()=>{});
    } else {
        console.warn("No camera devices found.");
    }
}).catch(error => console.error("Error getting media devices:", error));

