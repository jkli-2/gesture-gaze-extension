import { tf } from "./tfjs.mjs";

let lastGazePredOutput;
let video,
    preview_canvas,
    preview_ctx,
    stream,
    hands,
    face,
    eye_canvas,
    eye_ctx,
    video_canvas,
    video_ctx,
    vidData;
let wasOKGesture = false;
let lastHandLandmarks = [];
let lastFaceLandmarks = [];
let lastDx = 0;
let lastDy = 0;
const targetFPS = 30;
const interval = 1000 / targetFPS;

let missedHandFrames = 0;
const MAX_MISSED_HAND = 5;

let missedFaceFrames = 0;
const MAX_MISSED_FACE = 5;

let vw, vh;
const PREVIEW_CANVAS_W = 640;
const PREVIEW_CANVAS_H = 480;
const PREDICT_CANVAS_W = 160;
const PREDICT_CANVAS_H = 120;

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MID_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

const LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 157, 173, 246];
const RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 384, 398, 466];
const EYES_INDICES = LEFT_EYE_INDICES.concat(RIGHT_EYE_INDICES);
const EYE_MODEL_INPUT_SHAPE = 224;

const CONFIDENCE_THRESHOLD = 0.8;
const OK_SIGN_THRESHOLD = 10;

const CLASS_NAMES = [
    "center",
    "left",
    "right",
    "up",
    "down",
    "up_left",
    "up_right",
    "down_left",
    "down_right",
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
const GAZE_DIRECTIONS = {
    // reversed horizontally
    center: [0, 0],
    up: [0, -1],
    down: [0, 1],
    left: [1, 0],
    right: [-1, 0],
    up_left: [1, -1],
    up_right: [-1, -1],
    down_left: [1, 1],
    down_right: [-1, 1],
};

const CENTER_BIAS = [1.0, 0.6];

let neutralPose = { pitch: 0, yaw: 0 };

let allowPointerMovementByGaze = true;
const STEP_SIZE_NORMAL = 10;
const STEP_SIZE_SLOW = 1;
let stepSize = STEP_SIZE_NORMAL;

let smoothedGaze = [0, 0];
const SMOOTHING_ALPHA = 0.2;
const DEADZONE_VAL = 1.0;
let deadzone = DEADZONE_VAL;

const port = chrome.runtime.connect({ name: "gaze-gesture-connection" });
setInterval(() => {
    port.postMessage({ type: "PING" });
}, 20000);

port.onMessage.addListener((msg) => {
    if (msg.type === "GAZE_RESULT") {
        lastGazePredOutput = msg.result;
    }
    if (msg.type === "FACE_RESULT") {
        face = msg.result;
    }
    if (msg.type === "HAND_RESULT") {
        hands = msg.result;
    }
});

// Exponential Moving Average (EMA) smoothing
function smoothGaze(gazeX, gazeY) {
    smoothedGaze[0] = (1 - SMOOTHING_ALPHA) * smoothedGaze[0] + SMOOTHING_ALPHA * gazeX;
    smoothedGaze[1] = (1 - SMOOTHING_ALPHA) * smoothedGaze[1] + SMOOTHING_ALPHA * gazeY;
    return smoothedGaze;
}

function applyDeadzone(dx, dy) {
    if (Math.abs(dx) < deadzone) dx = 0;
    if (Math.abs(dy) < deadzone) dy = 0;
    return [dx, dy];
}

function updatePointerControl(handCount) {
    // 2 hands: disable gaze control (manual override mode)
    if (handCount === 2) {
        allowPointerMovementByGaze = false;
        stepSize = 0;
        deadzone = DEADZONE_VAL;
        return;
    }

    // 0 or 2+ hands: enable gaze control
    if (handCount === 0 || handCount > 2) {
        allowPointerMovementByGaze = true;
        stepSize = STEP_SIZE_NORMAL;
        deadzone = DEADZONE_VAL;
        return;
    }

    // 1 hand: slow gaze mode
    if (handCount === 1) {
        allowPointerMovementByGaze = true;
        stepSize = STEP_SIZE_SLOW;
        deadzone = 0;
        return;
    }
}

function getRelativePose(poseYaw, posePitch) {
    return {
        pitch: posePitch - neutralPose.pitch,
        yaw: poseYaw - neutralPose.yaw,
    };
}

function sendRawGazeVector(dx, dy, poseYaw, posePitch) {
    const gazeBias = {
        dx: 0.10,  // favors looking left
        dy: -0.10  // favors looking up
    };
    const biasedDx = dx + gazeBias.dx;
    const biasedDy = dy + gazeBias.dy;
    const maxGazeXRange = 5;
    const maxGazeYRange = 5;
    const clampedDx = Math.max(-maxGazeXRange, Math.min(maxGazeXRange, biasedDx));
    const clampedDy = Math.max(-maxGazeYRange, Math.min(maxGazeYRange, biasedDy));

    const flippedDx = clampedDx * -1;

    const relativePose = getRelativePose(poseYaw, posePitch);
    const maxYawRange = 10;
    const maxPitchRange = 20;
    const minYawRange = -1 * maxYawRange;
    const minPitchRange = -1 * maxPitchRange;

    const yawMag = Math.abs(relativePose.yaw);
    const pitchMag = Math.abs(relativePose.pitch);
    const yawFactor = 1 + Math.min(yawMag / maxYawRange, 1) * 2.0;
    const pitchFactor = 1 + Math.min(pitchMag / maxPitchRange, 1) * 0.1;

    const yawBias = (Math.max(minYawRange, Math.min(maxYawRange, relativePose.yaw)) / maxYawRange) * yawFactor;
    const pitchBias = (Math.max(minPitchRange, Math.min(maxPitchRange, -relativePose.pitch)) / maxPitchRange) * pitchFactor;

    const poseCompensationFactor = 0.5;
    const correctedDx = flippedDx - yawBias * poseCompensationFactor;
    const correctedDy = clampedDy - pitchBias * poseCompensationFactor;

    const magnitude = Math.sqrt(flippedDx ** 2 + clampedDy ** 2);
    const dynamicFactor = 1 + Math.min(magnitude * 20, 100);
    const scaledStep = stepSize * dynamicFactor;

    const scaledDx = correctedDx * scaledStep;
    const scaledDy = correctedDy * scaledStep;

    const [stableDx, stableDy] = smoothGaze(scaledDx, scaledDy);
    const [dzDx, dzDy] = applyDeadzone(stableDx, stableDy);
    if (allowPointerMovementByGaze) {
        chrome.runtime.sendMessage({
            type: "GAZE_MOVE",
            dx: dzDx,
            dy: dzDy,
        });
    }
}

//
// Use this if we use classifier based gaze model
//
function sendGazeDirection(predictedClass, confidence, poseYaw, posePitch) {
    const [dx, dy] = GAZE_DIRECTIONS[predictedClass];

    const biasedDx = dx + CENTER_BIAS[0];
    const biasedDy = dy + CENTER_BIAS[1];

    const stepSize = 20;
    const scaledDx = biasedDx * confidence * stepSize;
    const scaledDy = biasedDy * confidence * stepSize;

    const fusionFactor = 0.5; // 0 = only gaze, 1 = only head pose
    const relativePose = getRelativePose(poseYaw, posePitch);
    const normalisedYaw = Math.max(-10, Math.min(10, relativePose.yaw)) / 10;
    const normalisedPitch = Math.max(-10, Math.min(10, relativePose.pitch)) / 10;

    const poseScale = 20;
    const fusedDx = scaledDx * (1 - fusionFactor) - normalisedYaw * fusionFactor * poseScale;
    const fusedDy = scaledDy * (1 - fusionFactor) + normalisedPitch * fusionFactor * poseScale;

    if (allowPointerMovementByGaze) {
        // console.log("gaze move:", fusedDx, fusedDy);
        chrome.runtime.sendMessage({
            type: "GAZE_MOVE",
            dx: fusedDx,
            dy: fusedDy,
        });
    }
}

const init = async () => {
    video = document.createElement("video");
    video.setAttribute("playsinline", true);
    video.autoplay = true;

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    video.width = settings.width;
    vw = settings.width;
    video.height = settings.height;
    vh = settings.height;
    video.srcObject = stream;
    await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
    });
    await video.play();

    video_canvas = document.createElement("canvas");
    video_canvas.width = PREDICT_CANVAS_W;
    video_canvas.height = PREDICT_CANVAS_H;
    video_ctx = video_canvas.getContext("2d", { willReadFrequently: true });

    preview_canvas = document.getElementById("offCanvas");
    preview_ctx = preview_canvas.getContext("2d");
    preview_canvas.width = PREVIEW_CANVAS_W;
    preview_canvas.height = PREVIEW_CANVAS_H;

    eye_canvas = document.createElement("canvas");
    eye_canvas.width = EYE_MODEL_INPUT_SHAPE;
    eye_canvas.height = EYE_MODEL_INPUT_SHAPE;
    eye_ctx = eye_canvas.getContext("2d", { willReadFrequently: true });

    requestAnimationFrame(drawLoop);
};

function landmarkCoordScaling(coord, inputDim, outputDim) {
    return (coord / inputDim) * outputDim;
}

function getEyeBoundingBox(landmarks, indices) {
    const xs = indices.map((i) => landmarkCoordScaling(landmarks[i].x, PREDICT_CANVAS_W, vw));
    const ys = indices.map((i) => landmarkCoordScaling(landmarks[i].y, PREDICT_CANVAS_H, vh));

    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;

    return { x, y, w, h };
}

function estimateHeadPose(landmarks) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[1];
    const forehead = landmarks[10];

    // yaw / horizontal
    const eyeDx = rightEye.x - leftEye.x;
    const eyeDy = rightEye.y - leftEye.y;
    const yaw = Math.atan2(eyeDy, eyeDx);

    // pitch / vertical
    const noseToForeheadY = forehead.y - noseTip.y;
    const noseToForeheadZ = forehead.z - noseTip.z;
    const pitch = Math.atan2(noseToForeheadZ, noseToForeheadY);

    return {
        yawDegrees: yaw * (180 / Math.PI),
        pitchDegrees: pitch * (180 / Math.PI),
    };
}

function computeCentroid(landmarks, indices) {
    const points = indices.map((i) => landmarks[i]);
    const x =
        points.reduce((sum, p) => sum + landmarkCoordScaling(p.x, PREDICT_CANVAS_W, vw), 0) /
        points.length;
    const y =
        points.reduce((sum, p) => sum + landmarkCoordScaling(p.y, PREDICT_CANVAS_H, vh), 0) /
        points.length;
    return { x, y };
}

let leftEyeCenter = null;
let rightEyeCenter = null;
let gazeOrigin = null;
let pupilTensor = null;
let drawBoxDim = null;
let paddedBoxDim = null;

setInterval(async () => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    if (vw < 10 || vh < 10) return;
    if (!port) return;
    if (!vidData) return;

    const vidTensor = tf.browser.fromPixels(vidData).toFloat();
    const data = Array.from(vidTensor.dataSync());
    port.postMessage({
        type: "DETECTOR",
        data,
        shape: vidTensor.shape,
        dtype: vidTensor.dtype,
    });

    if (face) {
        if (face.length === 0) {
            missedFaceFrames++;
            if (missedFaceFrames >= MAX_MISSED_HAND) {
                lastFaceLandmarks = [];
            }
        } else if (face.length > 0) {
            const currLandmarks = face[0].keypoints;
            lastFaceLandmarks = currLandmarks;
            missedFaceFrames = 0;
            const box = getEyeBoundingBox(lastFaceLandmarks, EYES_INDICES);
            leftEyeCenter = computeCentroid(lastFaceLandmarks, LEFT_EYE_INDICES);
            rightEyeCenter = computeCentroid(lastFaceLandmarks, RIGHT_EYE_INDICES);
            gazeOrigin = {
                x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
                y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
            };
            pupilTensor = tf.tensor2d([
                [
                    leftEyeCenter.x / vw,
                    leftEyeCenter.y / vh,
                    rightEyeCenter.x / vw,
                    rightEyeCenter.y / vh,
                ],
            ]);
            const margin_x = box.w * 1;
            const margin_y = box.h;

            const cropX1 = Math.max(0, box.x - margin_x);
            const cropY1 = Math.max(0, box.y - margin_y);
            const cropX2 = Math.min(vw, box.x + box.w + margin_x);
            const cropY2 = Math.min(vh, box.y + box.h + margin_y);

            const cropW = cropX2 - cropX1;
            const cropH = cropY2 - cropY1;

            drawBoxDim = {
                x: cropX1,
                y: cropY1,
                w: cropW,
                h: cropH,
            };

            // pad to square
            const maxSide = Math.max(cropW, cropH);
            const deltaW = maxSide - cropW;
            const deltaH = maxSide - cropH;
            const squareX = Math.max(0, cropX1 - deltaW / 2);
            const squareY = Math.max(0, cropY1 - deltaH / 2);

            paddedBoxDim = {
                maxSide: maxSide,
                squareX: squareX,
                squareY: squareY,
            };
        }

        eye_ctx.fillStyle = "#777"; // or compute avg color later
        eye_ctx.fillRect(0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
        eye_ctx.save();

        const aspect = EYE_MODEL_INPUT_SHAPE / paddedBoxDim.maxSide;
        const drawW = drawBoxDim.w * aspect;
        const drawH = drawBoxDim.h * aspect;
        const offsetX = (EYE_MODEL_INPUT_SHAPE - drawW) / 2;
        const offsetY = (EYE_MODEL_INPUT_SHAPE - drawH) / 2;

        if (drawBoxDim.w <= 0 || drawBoxDim.h <= 0 || drawW <= 0 || drawH <= 0) {
            console.warn("Invalid dimensions", {
                drawBoxDim,
                drawW,
                drawH,
            });
            return;
        }
        eye_ctx.drawImage(
            video,
            drawBoxDim.x,
            drawBoxDim.y,
            drawBoxDim.w,
            drawBoxDim.h,
            offsetX,
            offsetY,
            drawW,
            drawH
        );
        eye_ctx.restore();
        const imageData = eye_ctx.getImageData(0, 0, EYE_MODEL_INPUT_SHAPE, EYE_MODEL_INPUT_SHAPE);
        const imageTensor = tf.browser
            .fromPixels(imageData)
            .toFloat()
            .div(tf.scalar(255.0))
            .expandDims();
        const imageTensor_data = imageTensor.dataSync();
        const pupilTensor_data = pupilTensor.dataSync();
        port.postMessage({
            type: "PREDICT_GAZE",
            imageTensor: {
                data: Array.from(imageTensor_data),
                shape: imageTensor.shape,
                dtype: imageTensor.dtype,
            },
            pupilTensor: {
                data: Array.from(pupilTensor_data),
                shape: pupilTensor.shape,
                dtype: pupilTensor.dtype,
            },
        });

        if (lastGazePredOutput) {
            lastDx = lastGazePredOutput[0];
            lastDy = lastGazePredOutput[1];
        }
    }

    if (hands) {
        updatePointerControl(hands.length);
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
    if (!video) return;
    preview_ctx.save();
    preview_ctx.clearRect(0, 0, PREVIEW_CANVAS_W, PREVIEW_CANVAS_H);
    preview_ctx.drawImage(video, 0, 0, PREVIEW_CANVAS_W, PREVIEW_CANVAS_H);

    video_ctx.clearRect(0, 0, PREDICT_CANVAS_W, PREDICT_CANVAS_H);
    video_ctx.drawImage(video, 0, 0, PREDICT_CANVAS_W, PREDICT_CANVAS_H);
    vidData = video_ctx.getImageData(0, 0, PREDICT_CANVAS_W, PREDICT_CANVAS_H);

    for (const landmarks of lastHandLandmarks) {
        drawConnectors(preview_ctx, landmarks, { color: "#FDD835" });
        drawLandmarks(preview_ctx, landmarks, { color: "#BA68C8" });
    }

    if (lastFaceLandmarks.length > 0) {
        preview_ctx.strokeStyle = "#BA68C8";
        preview_ctx.lineWidth = 2;
        preview_ctx.strokeRect(
            landmarkCoordScaling(paddedBoxDim.squareX, vw, PREVIEW_CANVAS_W),
            landmarkCoordScaling(paddedBoxDim.squareY, vw, PREVIEW_CANVAS_W),
            landmarkCoordScaling(paddedBoxDim.maxSide, vw, PREVIEW_CANVAS_W),
            landmarkCoordScaling(paddedBoxDim.maxSide, vw, PREVIEW_CANVAS_W),
        );

        // drawBox(ctx, drawBoxDim, { color: "#4FC3F7", lineWidth: 2 });
        drawPoint(
            preview_ctx,
            {
                x: landmarkCoordScaling(leftEyeCenter.x, vw, PREVIEW_CANVAS_W),
                y: landmarkCoordScaling(leftEyeCenter.y, vh, PREVIEW_CANVAS_H),
            },
            { color: "#3DDC84" }
        );
        drawPoint(
            preview_ctx,
            {
                x: landmarkCoordScaling(rightEyeCenter.x, vw, PREVIEW_CANVAS_W),
                y: landmarkCoordScaling(rightEyeCenter.y, vh, PREVIEW_CANVAS_H),
            },
            { color: "#3DDC84" }
        );
        drawGazeArrow(
            preview_ctx,
            {
                x: landmarkCoordScaling(gazeOrigin.x, vw, PREVIEW_CANVAS_W),
                y: landmarkCoordScaling(gazeOrigin.y, vh, PREVIEW_CANVAS_H),
            },
            lastDx,
            lastDy,
            2,
            "#FF6B6B"
        );

        const { yawDegrees, pitchDegrees } = estimateHeadPose(lastFaceLandmarks);
        const norm = Math.hypot(lastDx, lastDy);
        const rawGaze = norm > 0 ? [lastDx / norm, lastDy / norm] : [0, 0];

        // dampen sensitivity
        const GAZE_GAIN = 0.3;
        const gazeVec = [rawGaze[0] * GAZE_GAIN, rawGaze[1] * GAZE_GAIN];
        sendRawGazeVector(gazeVec[0], gazeVec[1], yawDegrees, pitchDegrees);
    }

    const hand = lastHandLandmarks[0];
    const indexFingerTip = hand?.[INDEX_TIP] ?? null;
    const thumbFingerTip = hand?.[THUMB_TIP] ?? null;
    if (indexFingerTip && thumbFingerTip) {
        const dx = indexFingerTip.x - thumbFingerTip.x;
        const dy = indexFingerTip.y - thumbFingerTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // console.log(distance)
        const isOKGesture = distance < OK_SIGN_THRESHOLD;
        if (isOKGesture && !wasOKGesture) {
            console.log("OK gesture detected!");
            chrome.runtime.sendMessage({
                type: "CLICK",
            });
        }
        wasOKGesture = isOKGesture;
    } else {
        wasOKGesture = false;
    }
    if (lastHandLandmarks.length > 1 && indexFingerTip) {
        const nx = thumbFingerTip.x / vw;
        const ny = thumbFingerTip.y / vh;
        const [sx, sy] = smoothGaze(nx, ny);
        chrome.runtime.sendMessage({
            type: "POINTER",
            x: sx,
            y: sy,
        });
    }
    preview_ctx.restore();
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

function drawGazeArrow(ctx, origin, dx, dy, scale = 50, color = "red") {
    const startX = origin.x;
    const startY = origin.y;
    const endX = startX + dx * scale;
    const endY = startY + dy * scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLength = 10;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(endX, endY);
    ctx.fillStyle = color;
    ctx.fill();
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "START_DETECT") init();
    if (msg.type === "STOP_DETECT" && stream) {
        stream.getTracks().forEach((t) => t.stop());
    }
    if (msg.type === "CALIBRATE_POSE") {
        if (lastFaceLandmarks && lastFaceLandmarks.length > 0) {
            const pose = estimateHeadPose(lastFaceLandmarks);
            neutralPose = { yaw: pose.yawDegrees, pitch: pose.pitchDegrees };
            chrome.storage.local.get(["preferences"], (result) => {
                if (chrome.runtime.lastError) {
                    console.error("Error loading data:", chrome.runtime.lastError);
                } else {
                    let preferences = result.preferences || {};
                    preferences.neutralPose = { yaw: pose.yawDegrees, pitch: pose.pitchDegrees };
                    chrome.storage.local.set({ preferences });
                }
            });
            console.log("Calibrated neutral pose:", neutralPose);
        } else {
            console.warn("Cannot calibrate: no face landmarks yet.");
        }
    }
    if (msg.type === "SET_NEUTRAL_POSE") {
        neutralPose = msg.pose;
    }
});

chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });
console.log("Offscreen ready.");
