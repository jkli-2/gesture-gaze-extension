import DOMFactory from "./domFactory.js";
import { recognizeGesture } from "./gesture.js";

//
// Camera Feed Preview Overlay
//
let currentStream = null;
// let defaultDeviceId;

// navigator.mediaDevices
//     .enumerateDevices()
//     .then((devices) => {
//         const videoInputs = devices.filter((device) => device.kind === "videoinput");

//         if (videoInputs.length > 0) {
//             defaultDeviceId = videoInputs[0].deviceId; // Pick the first available camera
//             console.log("Starting Default Camera...", defaultDeviceId);
//         } else {
//             console.warn("No camera devices found.");
//         }
//     })
//     .catch((error) => console.error("Error getting media devices:", error));

export async function startCamera(deviceId = null) {
    try {
        // Stop previous stream if it exists
        if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
        }
        const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
        } catch (error) {
            console.error("Camera error:", error.name, error.message);
        }
        const camVideoElmt = DOMFactory.getElement("camVideo");
        camVideoElmt.srcObject = currentStream;
        // camVideoElmt.addEventListener("loadeddata", predictWebcam);

        // const imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
        // let lastFrame;
        // function processFrame() {
        //     if (!imageCapture || !currentStream) {
        //         console.warn("ImageCapture not initialized.");
        //         return;
        //     }
        //     // Check if the video track is still live before capturing a frame
        //     const videoTrack = currentStream.getVideoTracks()[0];
        //     if (!videoTrack || videoTrack.readyState !== "live") {
        //         console.warn("Video track is not active, stopping frame capture.");
        //         return;
        //     }
        //     imageCapture.grabFrame().then(async function(imageBitmap) {
        //         if (lastFrame) lastFrame.close();
        //         if (previewCtx) previewCtx.drawImage(imageBitmap, 0, 0, previewCanvas.width, previewCanvas.height);

        //         // recognizeGesture(imageBitmap).then((result) => {
        //         //     console.log("Gesture result:", result);
        //         // }).catch(error => console.log("Gesture recog error:", error))

        //         lastFrame = imageBitmap;
        //     }).catch(function(error) {
        //       console.log('grabFrame() error: ', error);
        //     });
        //     // requestAnimationFrame(processFrame); // Constant update, would cause error
        //     setTimeout(processFrame, 50); // Capture frames every 50ms (20 FPS)
        // }
        // processFrame();
    } catch (error) {
        if (error.name === "NotAllowedError") {
            console.warn("User denied camera access.");
        } else {
            console.error("Camera error:", error.name, error.message);
        }
    }
}
