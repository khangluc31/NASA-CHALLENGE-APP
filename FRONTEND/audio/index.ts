// Giữ API công khai tương đương audio.js cũ: mọi thứ import từ "../audio".
export { AudioEngine, engine } from "./engine";
export { SCALES, quantize, hueToWarmth } from "./scales";
export { colorToVoice } from "./palette";
export { featuresToNotes } from "./notes";
export { normalizeFrame } from "./data";
export { makeMockFeatures, makeMockNightLights } from "./features.mock";
export { pickFromImage } from "./pickColor";
export type * from "./types";
