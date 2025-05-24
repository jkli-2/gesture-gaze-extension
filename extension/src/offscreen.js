import { tf, loadHandDetector, loadFaceDetector } from "./tfjs-bundle.mjs";

await tf.ready();
// console.log("TFJS backend:", tf.getBackend());

let video, canvas, ctx, stream, hands, face, eye_canvas, eye_ctx;
let lastHandLandmarks = [];
let lastFaceLandmarks = [];
const targetFPS = 30;
const interval = 1000 / targetFPS;
const handDetector = await loadHandDetector();
const faceDetector = await loadFaceDetector();
const gazeModel = await tf.loadGraphModel(chrome.runtime.getURL("models/model.json"));

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

const init = async () => {
    video = document.createElement("video");
    video.setAttribute("playsinline", true);
    video.autoplay = true;
    video.width = CANVAS_W;
    video.height = CANVAS_H;

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    canvas = document.getElementById("offCanvas");
    ctx = canvas.getContext("2d");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    eye_canvas = document.createElement("canvas");
    eye_canvas.width = EYE_MODEL_INPUT_SHAPE;
    eye_canvas.height = EYE_MODEL_INPUT_SHAPE;
    eye_ctx = eye_canvas.getContext("2d");

    await video.play();
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
    if (video) {
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

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
    }
}, interval);

const drawLoop = async () => {
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
        const margin = 40;
        const cropX = Math.max(box.x - margin, 0);
        const cropY = Math.max(box.y - margin, 0);
        const cropW = box.w + 2 * margin;
        const cropH = box.h + 2 * margin;
        const drawBoxDim = {
            x: cropX,
            y: cropY,
            w: cropW,
            h: cropH
        };
        drawBox(ctx, drawBoxDim, { color: "#00FFFF", lineWidth: 2 });
        const leftEyeCenter = computeCentroid(lastFaceLandmarks, LEFT_EYE_INDICES);
        const rightEyeCenter = computeCentroid(lastFaceLandmarks, RIGHT_EYE_INDICES);
        drawPoint(ctx, leftEyeCenter, { color: "#00FF00" });
        drawPoint(ctx, rightEyeCenter, { color: "#00FF00" });

        // Draw from video to offscreen canvas
        if (video) {
            eye_ctx.save()
            // eye_ctx.scale(-1, 1);
            eye_ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
            eye_ctx.restore();
            const imageData = eye_ctx.getImageData(0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
            const inputTensor = tf.browser.fromPixels(imageData)
                .toFloat()
                .div(tf.scalar(255.0))
                .expandDims();
            const gazeClass = gazeModel.predict(inputTensor).argMax(-1);
            const classIndex = (await gazeClass.data())[0];
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
            const label = CLASS_NAMES[classIndex];
            console.log("Predicted:", label);
        }
    }

    const hand = lastHandLandmarks[0];
    const indexFingerTip = hand?.[INDEX_TIP] ?? null;
    const thumbFingerTip = hand?.[THUMB_TIP] ?? null;
    if (indexFingerTip) {
        const nx = indexFingerTip.x / video.videoWidth;
        const ny = indexFingerTip.y / video.videoHeight;
        // console.log(nx, ny);

        chrome.runtime.sendMessage({
            type: "POINTER",
            x: nx,
            y: ny,
        });
    }
    if (indexFingerTip && thumbFingerTip) {
        const dx = indexFingerTip.x - thumbFingerTip.x;
        const dy = indexFingerTip.y - thumbFingerTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // console.log(distance)
        const isOKGesture = distance < 10; // adjust threshold based on scale
        if (isOKGesture) {
            console.log("OK gesture detected!");
        }
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
