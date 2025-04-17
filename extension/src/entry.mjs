import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/hand-pose-detection';

await tf.ready();

const model = handpose.SupportedModels.MediaPipeHands;

const loadHandDetector = async () => {
  return await handpose.createDetector(model, {
    runtime: 'tfjs',
    modelType: 'full'
  });
}

export { tf, loadHandDetector };
