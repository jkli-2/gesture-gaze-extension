import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/hand-pose-detection";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

// await tf.ready();
tf.ready().then(() => {
    console.log("tfjs loaded and ready");
});

const handModel = handpose.SupportedModels.MediaPipeHands;
const loadHandDetector = async () => {
    return await handpose.createDetector(handModel, {
        runtime: "tfjs",
        modelType: "full",
    });
};

const faceModel = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
const loadFaceDetector = async () => {
    return await faceLandmarksDetection.createDetector(faceModel, {
        runtime: "tfjs",
        refineLandmarks: true, // this enables iris/eye landmark precision
        maxFaces: 1,
    });
};

export { tf, loadHandDetector, loadFaceDetector };
