// notes.js — featuresToNotes: một cột dữ liệu -> tối đa N nốt
import { quantize, rowToMidi, hueToWarmth } from "./Scales.js";

/* 2. featuresToNotes: 1 cột ảnh -> tối đa N nốt                       */
/**
 * @param column  { hue, sat, light, edge, rows:[{hue,light}] }  (light 0..1)
 * @param opts    { scale, maxNotes, threshold, urgency }
 * @returns       [{ midi, velocity, warmth, hue }]  — rỗng nếu cột tối (im lặng)
 */
export function featuresToNotes(column, opts = {}) {
  const { scale = "pentatonic", maxNotes = 3, threshold = 0.12, urgency = 0 } = opts;
  const rows = column.rows ?? [];
  const n = rows.length;

  const picked = rows
    .map((r, i) => ({ i, light: r.light, hue: r.hue }))
    .filter((r) => r.light > threshold)
    .sort((a, b) => b.light - a.light)
    .slice(0, maxNotes);

  const seen = new Set();
  const notes = [];
  for (const r of picked) {
    const midi = quantize(rowToMidi(r.i, n), scale);
    if (seen.has(midi)) continue;
    seen.add(midi);
    notes.push({
      midi,
      velocity: Math.min(1, 0.2 + r.light * 0.8),
      warmth: hueToWarmth(r.hue),
      hue: r.hue,
    });
  }

  // Chế độ cấp bách: thêm 1 nốt lệch nửa cung (dissonance) khi cột nhiều chi tiết
  if (urgency > 0.5 && notes.length && column.edge > 0.4) {
    notes.push({
      midi: notes[0].midi + 1,
      velocity: 0.25 * urgency,
      warmth: 1,
      hue: 0,
    });
  }

  return notes.slice(0, maxNotes + 1);
}