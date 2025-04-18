import { tf, loadHandDetector } from "./tfjs-bundle.mjs";

await tf.ready();
// console.log("TFJS backend:", tf.getBackend());

let video, canvas, ctx, stream, hands;
let lastLandmarks = [];
const targetFPS = 30;
const interval = 1000 / targetFPS;
const handDetector = await loadHandDetector();

let missedFrames = 0;
const MAX_MISSED = 5;

const CANVAS_W = 640;
const CANVAS_H = 480;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MID_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

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

    await video.play();
    requestAnimationFrame(drawLoop);
};

setInterval(async () => {
    if (video) {
        if (video.videoWidth === 0 || video.videoHeight === 0) return;
        hands = await handDetector.estimateHands(video);
        if (hands.length === 0) {
            missedFrames++;
            if (missedFrames >= MAX_MISSED) {
                lastLandmarks = [];
            }
        } else if (hands.length > 0) {
            const currLandmarks = hands.map((hand) =>
                hand.keypoints.map(({ x, y, z }) => ({ x, y, z }))
            );
            lastLandmarks = currLandmarks;
            missedFrames = 0;
        }
    }
}, interval);

const drawLoop = async () => {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    for (const landmarks of lastLandmarks) {
        drawConnectors(ctx, landmarks, {
            color: "#FFF",
            lineWidth: 4,
        });
        drawLandmarks(ctx, landmarks, { color: "#FF00FF", radius: 6 });
    }
    const hand = lastLandmarks[0];
    const [indexFingerTip] = hand?.length >= 9 ? [hand[INDEX_TIP]] : [];
    if (indexFingerTip) {
        const { x, y } = indexFingerTip;
        const nx = x / video.videoWidth;
        const ny = y / video.videoHeight;
        console.log(nx, ny);

        chrome.runtime.sendMessage({
            type: "POINTER",
            x: nx,
            y: ny,
        });
    }
    ctx.restore();
    requestAnimationFrame(drawLoop);
};

// Deprecated
function smoothMultipleHands(currentHands, previousHands, alpha = 0.8) {
    const smoothed = [];

    for (let i = 0; i < currentHands.length; i++) {
        const curr = currentHands[i];
        const prev = previousHands?.[i] || [];

        const smooth = curr.map((pt, j) => ({
            x: prev[j] ? alpha * prev[j].x + (1 - alpha) * pt.x : pt.x,
            y: prev[j] ? alpha * prev[j].y + (1 - alpha) * pt.y : pt.y,
            z: prev[j] ? alpha * prev[j].z + (1 - alpha) * pt.z : pt.z,
        }));

        smoothed.push(smooth);
    }

    return smoothed;
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
