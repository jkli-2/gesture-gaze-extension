//
// Camera Feed Preview Overlay
//
let currentStream = null;

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

export function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
        currentStream = null;
        console.log("Camera stopped.");
    }
}

export async function startCamera(camVideoElmt, deviceId = null) {
    try {
        if (currentStream) return currentStream;
        try {
            const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            camVideoElmt.srcObject = currentStream;
            return currentStream;
        } catch (error) {
            console.error("Camera error:", error.name, error.message);
        }
    } catch (error) {
        if (error.name === "NotAllowedError") {
            console.warn("User denied camera access.");
        } else {
            console.error("Camera error:", error.name, error.message);
        }
    }
}
