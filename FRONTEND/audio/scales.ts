// Thang âm, đổi hàng ảnh thành cao độ, đổi hue thành độ ấm.
import type { ScaleName } from "./types";

/** Semitone offsets so với root. */
export const SCALES: Record<ScaleName, readonly number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  tension: [0, 2, 3, 5, 7, 8, 11],
};

export const LOW_MIDI = 48; // C3
export const HIGH_MIDI = 84; // C6

export const isScaleName = (name: string): name is ScaleName => Object.hasOwn(SCALES, name);

export function quantize(midi: number, scaleName: string = "pentatonic", root: number = LOW_MIDI): number {
  const scale = isScaleName(scaleName) ? SCALES[scaleName] : SCALES.pentatonic;
  const rel = midi - root;
  const octave = Math.floor(rel / 12);
  const pc = rel - octave * 12;
  const candidates = [...scale, 12];

  let best = candidates[0];
  for (const d of candidates) {
    if (Math.abs(d - pc) < Math.abs(best - pc)) best = d;
  }

  return root + octave * 12 + best;
}

/** Hàng trên cùng = cao độ cao. */
export function rowToMidi(rowIdx: number, rowCount: number): number {
  const t = 1 - rowIdx / Math.max(1, rowCount - 1);
  return LOW_MIDI + t * (HIGH_MIDI - LOW_MIDI);
}

/** hue (0-360) -> độ "ấm" liên tục 0..1 (cosin mượt quanh 15° = ấm nhất, 195° = lạnh nhất). */
export function hueToWarmth(hue: number): number {
  const h = ((hue % 360) + 360) % 360;
  const rad = ((h - 15) * Math.PI) / 180;
  return 0.5 + 0.5 * Math.cos(rad);
}
