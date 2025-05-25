import { tf, loadHandDetector, loadFaceDetector } from "./tfjs-bundle.mjs";

let modelsLoaded = false;
let handDetector, faceDetector, gazeModel;

async function loadModelsOnce() {
    if (modelsLoaded) return;
    await tf.ready();
    // console.log("TFJS backend:", tf.getBackend());
    handDetector = await loadHandDetector();
    faceDetector = await loadFaceDetector();
    try {
        gazeModel = await tf.loadGraphModel(chrome.runtime.getURL("models/model.json"));
    } catch (err) {
        console.warn("Gaze Model Loading Error:", err);
    }
    modelsLoaded = true;
}
await loadModelsOnce();

let video, canvas, ctx, stream, hands, face, eye_canvas, eye_ctx;
let wasOKGesture = false;
let lastHandLandmarks = [];
let lastFaceLandmarks = [];
const targetFPS = 30;
const interval = 1000 / targetFPS;

let missedHandFrames = 0;
const MAX_MISSED_HAND = 5;

let missedFaceFrames = 0;
const MAX_MISSED_FACE = 5;

const CANVAS_W = 640;
const CANVAS_H = 480;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MID_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

const LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 246];
const RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 466];
const EYES_INDICES = LEFT_EYE_INDICES.concat(RIGHT_EYE_INDICES);
const EYE_MODEL_INPUT_SHAPE = 96

const CONFIDENCE_THRESHOLD = 0.8;

const CLASS_NAMES = [
                "center",
                "left",
                "right",
                "up",
                "down",
                "up_left",
                "up_right",
                "down_left",
                "down_right"
            ];
// const GAZE_DIRECTIONS = {
//     center: [0, 0],
//     up: [0, -1],
//     down: [0, 1],
//     left: [-1, 0],
//     right: [1, 0],
//     up_left: [-1, -1],
//     up_right: [1, -1],
//     down_left: [-1, 1],
//     down_right: [1, 1]
// };
const GAZE_DIRECTIONS = { // reversed horizontally
    center: [0, 0],
    up: [0, -1],
    down: [0, 1],
    left: [1, 0],
    right: [-1, 0],
    up_left: [1, -1],
    up_right: [-1, -1],
    down_left: [1, 1],
    down_right: [-1, 1]
};

const CENTER_BIAS = [1.0, 0.6];

function sendGazeDirection(predictedClass, confidence) {
    const [dx, dy] = GAZE_DIRECTIONS[predictedClass];

    const biasedDx = dx + CENTER_BIAS[0];
    const biasedDy = dy + CENTER_BIAS[1];

    const stepSize = 20;
    const scaledDx = biasedDx * confidence * stepSize;
    const scaledDy = biasedDy * confidence * stepSize;

    console.log("gaze move:", scaledDx, scaledDy);
    chrome.runtime.sendMessage({
        type: "GAZE_MOVE",
        dx: scaledDx,
        dy: scaledDy,
    });
}

const init = async () => {
    video = document.createElement("video");
    video.setAttribute("playsinline", true);
    video.autoplay = true;
    video.width = CANVAS_W;
    video.height = CANVAS_H;

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
    });
    await video.play();

    canvas = document.getElementById("offCanvas");
    ctx = canvas.getContext("2d");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    eye_canvas = document.createElement("canvas");
    eye_canvas.width = EYE_MODEL_INPUT_SHAPE;
    eye_canvas.height = EYE_MODEL_INPUT_SHAPE;
    eye_ctx = eye_canvas.getContext("2d", { willReadFrequently: true });

    requestAnimationFrame(drawLoop);
};

function getEyeBoundingBox(landmarks, indices) {
    const xs = indices.map(i => landmarks[i].x);
    const ys = indices.map(i => landmarks[i].y);

    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;

    return { x, y, w, h };
}

function computeCentroid(landmarks, indices) {
    const points = indices.map(i => landmarks[i]);
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
}

setInterval(async () => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw < 10 || vh < 10) return;

    try {
        face = await faceDetector.estimateFaces(video);
        if (face.length === 0) {
            missedFaceFrames++;
            if (missedFaceFrames >= MAX_MISSED_HAND) {
                lastFaceLandmarks = [];
            }
        } else if (face.length > 0) {
            const currLandmarks = face[0].keypoints;
            lastFaceLandmarks = currLandmarks;
            missedFaceFrames = 0;
        }
    } catch (err) {
        console.warn("Gaze detector error:", err);
    }

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    try {
        hands = await handDetector.estimateHands(video);
        if (hands.length === 0) {
            missedHandFrames++;
            if (missedHandFrames >= MAX_MISSED_HAND) {
                lastHandLandmarks = [];
            }
        } else if (hands.length > 0) {
            const currLandmarks = hands.map((hand) =>
                hand.keypoints.map(({ x, y, z }) => ({ x, y, z }))
            );
            lastHandLandmarks = currLandmarks;
            missedHandFrames = 0;
        }
    } catch (err) {
        console.warn("Hand detector error:", err);
    }
}, interval);

const drawLoop = async () => {
    if (!video) { return; }
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    for (const landmarks of lastHandLandmarks) {
        drawConnectors(ctx, landmarks, {
            color: "#FFF",
            lineWidth: 4,
        });
        drawLandmarks(ctx, landmarks, { color: "#FF00FF", radius: 6 });
    }

    if (lastFaceLandmarks.length > 0) {
        const box = getEyeBoundingBox(lastFaceLandmarks, EYES_INDICES);
        const margin_x = box.w * 0.5;
        const margin_y = box.h * 2.0;

        const cropX1 = Math.max(0, box.x - margin_x);
        const cropY1 = Math.max(0, box.y - margin_y);
        const cropX2 = Math.min(canvas.width, box.x + box.w + margin_x);
        const cropY2 = Math.min(canvas.height, box.y + box.h + margin_y);

        const cropW = cropX2 - cropX1;
        const cropH = cropY2 - cropY1;

        const drawBoxDim = {
            x: cropX1,
            y: cropY1,
            w: cropW,
            h: cropH
        };

        // pad to square
        const maxSide = Math.max(cropW, cropH);
        const deltaW = maxSide - cropW;
        const deltaH = maxSide - cropH;
        const leftPad = Math.floor(deltaW / 2);
        const topPad = Math.floor(deltaH / 2);
        const squareX = cropX1 - deltaW / 2;
        const squareY = cropY1 - deltaH / 2;

        ctx.strokeStyle = "#FF00FF";
        ctx.lineWidth = 2;
        ctx.strokeRect(squareX, squareY, maxSide, maxSide);
        
        drawBox(ctx, drawBoxDim, { color: "#00FFFF", lineWidth: 2 });
        const leftEyeCenter = computeCentroid(lastFaceLandmarks, LEFT_EYE_INDICES);
        const rightEyeCenter = computeCentroid(lastFaceLandmarks, RIGHT_EYE_INDICES);
        drawPoint(ctx, leftEyeCenter, { color: "#00FF00" });
        drawPoint(ctx, rightEyeCenter, { color: "#00FF00" });

        // Draw from video to offscreen canvas
        if (video) {
            eye_ctx.fillStyle = "#777"; // or compute avg color later
            eye_ctx.fillRect(0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
            eye_ctx.save()

            const aspect = EYE_MODEL_INPUT_SHAPE / maxSide;
            const drawW = cropW * aspect;
            const drawH = cropH * aspect;
            const offsetX = (EYE_MODEL_INPUT_SHAPE - drawW) / 2;
            const offsetY = (EYE_MODEL_INPUT_SHAPE - drawH) / 2;

            if (
                cropW <= 0 || cropH <= 0 ||
                drawW <= 0 || drawH <= 0
            ) {
                console.warn("Skipping inference: invalid dimensions", {
                    cropW, cropH, drawW, drawH
                });
                return;
            }
            eye_ctx.drawImage(video, 
                cropX1, cropY1, cropW, cropH, 
                offsetX, offsetY, drawW, drawH);
            eye_ctx.restore();
            const imageData = eye_ctx.getImageData(0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
            const inputTensor = tf.browser.fromPixels(imageData)
                .toFloat()
                .div(tf.scalar(255.0))
                .expandDims();

            const logits = gazeModel.predict(inputTensor);
            const probs = await logits.data();
            let maxProb = -1;
            let classIndex = -1;
            for (let i = 0; i < probs.length; i++) {
                if (probs[i] > maxProb) {
                    maxProb = probs[i];
                    classIndex = i;
                }
            }
            
            const label = CLASS_NAMES[classIndex];
            // console.log(`Predicted: ${label} (confidence: ${(maxProb * 100).toFixed(2)}%)`);
            if (maxProb >= CONFIDENCE_THRESHOLD) {
                // console.log("Predicted Gaze:", label);
                sendGazeDirection(label, maxProb);
            } else {
                // console.log("Gaze: uncertain");
            }

        }
    }

    const hand = lastHandLandmarks[0];
    const indexFingerTip = hand?.[INDEX_TIP] ?? null;
    const thumbFingerTip = hand?.[THUMB_TIP] ?? null;
    if (indexFingerTip && thumbFingerTip) {
        const dx = indexFingerTip.x - thumbFingerTip.x;
        const dy = indexFingerTip.y - thumbFingerTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // console.log(distance)
        const isOKGesture = distance < 20; // adjust threshold based on scale
        if (isOKGesture && !wasOKGesture) {
            console.log("OK gesture detected!");
            chrome.runtime.sendMessage({
                type: "CLICK"
            });
        }
        wasOKGesture = isOKGesture;
    } else {
        wasOKGesture = false;
    }
    if (lastHandLandmarks.length > 1 && indexFingerTip) {
        const nx = thumbFingerTip.x / video.videoWidth;
        const ny = thumbFingerTip.y / video.videoHeight;
        chrome.runtime.sendMessage({
            type: "POINTER",
            x: nx,
            y: ny,
        });
    }
    ctx.restore();
    requestAnimationFrame(drawLoop);
};

function drawPoint(ctx, { x, y }, { color = "#FFFF00", radius = 4 } = {}) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawBox(ctx, { x, y, w, h }, { color = "#FF0000", lineWidth = 2 } = {}) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, w, h);
}

function drawLandmarks(ctx, landmarks, { color = "#00FF00", radius = 3 } = {}) {
    for (const { x, y } of landmarks) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function drawConnectors(ctx, landmarks, { color = "#FF0000", lineWidth = 2 } = {}) {
    const HAND_CONNECTIONS = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4], // Thumb
        [5, 6],
        [6, 7],
        [7, 8], // Index
        [9, 10],
        [10, 11],
        [11, 12], // Middle
        [13, 14],
        [14, 15],
        [15, 16], // Ring
        [17, 18],
        [18, 19],
        [19, 20], // Pinky
        [0, 5],
        [5, 9],
        [9, 13],
        [13, 17],
        [0, 17], // Palm
    ];
    for (const [start, end] of HAND_CONNECTIONS) {
        const a = landmarks[start];
        const b = landmarks[end];
        if (a && b) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "START_DETECT") init();
    if (msg.type === "STOP_DETECT" && stream) {
        stream.getTracks().forEach((t) => t.stop());
    }
});

chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });
console.log("Offscreen ready.");
