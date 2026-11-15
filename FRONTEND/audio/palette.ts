// 10 điểm neo màu --> âm sắc (họa âm, FM, filter, ADSR) và colorToVoice
import { HIGH_MIDI, LOW_MIDI, hueToWarmth, quantize } from "./scales";
import type { ColorQuery, Voice } from "./types";

/**
 * BẢNG 10 ĐIỂM NEO MÀU TRÊN VÒNG TRÒN HUE (0° - 360°).
 * Mỗi điểm neo định nghĩa 8 họa âm (partials) + thông số FM + Filter + ADSR
 * để nội suy mượt, không gây tiếng "tách" khi chuyển vùng màu.
 */
interface ColorNode {
  name: string;
  label: string;
  hue: number;
  partials: number[];
  harmonicity: number;
  modIndex: number;
  cutoff: number;
  q: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export const COLOR_NODES: readonly ColorNode[] = [
  {
    name: "crimson",
    label: "Crimson (Geothermal / Fire)",
    hue: 0,
    // Dày họa âm kiểu sawtooth nhưng kiểm soát dải cao để ấm và uy lực
    partials: [1.0, 0.55, 0.38, 0.28, 0.22, 0.17, 0.14, 0.11],
    harmonicity: 1.0,
    modIndex: 1.5,
    cutoff: 2700,
    q: 3.5,
    attack: 0.04,
    decay: 0.35,
    sustain: 0.6,
    release: 0.6,
  },
  {
    name: "terracotta",
    label: "Terracotta (Desert / Mineral dust)",
    hue: 30,
    // Họa âm kiểu sóng pulse rỗng ấm, mộc mạc
    partials: [1.0, 0.65, 0.15, 0.45, 0.1, 0.3, 0.08, 0.15],
    harmonicity: 1.5,
    modIndex: 1.2,
    cutoff: 2800,
    q: 2.5,
    attack: 0.03,
    decay: 0.25,
    sustain: 0.45,
    release: 0.45,
  },
  {
    name: "solar-gold",
    label: "Solar gold (Radiation / City lights)",
    hue: 58,
    // Tập trung họa âm bậc 2, 3 kết hợp FM tạo tiếng lấp lánh như chuông nhỏ
    partials: [1.0, 0.4, 0.35, 0.15, 0.25, 0.1, 0.08, 0.05],
    harmonicity: 2.0,
    modIndex: 3.2,
    cutoff: 3400,
    q: 2.0,
    attack: 0.008,
    decay: 0.22,
    sustain: 0.25,
    release: 0.5,
  },
  {
    name: "chartreuse",
    label: "Chartreuse (Grassland / Algae)",
    hue: 85,
    // Lai giữa triangle và pulse mảnh, tươi sáng
    partials: [1.0, 0.25, 0.2, 0.12, 0.08, 0.05, 0.03, 0.02],
    harmonicity: 1.0,
    modIndex: 0.8,
    cutoff: 2400,
    q: 2.2,
    attack: 0.015,
    decay: 0.2,
    sustain: 0.35,
    release: 0.4,
  },
  {
    name: "emerald",
    label: "Emerald (Rainforest / Vegetation)",
    hue: 130,
    // Dạng sóng triangle hữu cơ (chỉ giữ họa âm lẻ), êm và bao trùm
    partials: [1.0, 0.0, 0.14, 0.0, 0.05, 0.0, 0.02, 0.0],
    harmonicity: 1.0,
    modIndex: 0.4,
    cutoff: 1800,
    q: 1.5,
    attack: 0.08,
    decay: 0.4,
    sustain: 0.55,
    release: 0.7,
  },
  {
    name: "teal",
    label: "Teal (Coral reef / Estuary)",
    hue: 165,
    partials: [1.0, 0.12, 0.1, 0.04, 0.03, 0.01, 0.0, 0.0],
    harmonicity: 1.5,
    modIndex: 1.8,
    cutoff: 1500,
    q: 2.8,
    attack: 0.05,
    decay: 0.35,
    sustain: 0.4,
    release: 0.65,
  },
  {
    name: "glacial-cyan",
    label: "Cyan (Glacier / Shallow water)",
    hue: 195,
    // Sine thuần kết hợp FM harmonicity 3.0 tạo cảm giác băng tinh thể
    partials: [1.0, 0.05, 0.02, 0.08, 0.01, 0.04, 0.0, 0.0],
    harmonicity: 3.0,
    modIndex: 2.2,
    cutoff: 2100,
    q: 3.2,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.2,
    release: 0.8,
  },
  {
    name: "deep-blue",
    label: "Deep blue (Deep ocean / Currents)",
    hue: 230,
    // Gần như sine thuần, trầm sâu và tĩnh tại
    partials: [1.0, 0.04, 0.02, 0.0, 0.0, 0.0, 0.0, 0.0],
    harmonicity: 0.5,
    modIndex: 0.3,
    cutoff: 800,
    q: 1.2,
    attack: 0.14,
    decay: 0.5,
    sustain: 0.65,
    release: 0.9,
  },
  {
    name: "indigo",
    label: "Indigo & Violet (Atmosphere / Aurora)",
    hue: 275,
    partials: [1.0, 0.18, 0.08, 0.05, 0.03, 0.02, 0.01, 0.0],
    harmonicity: 2.5,
    modIndex: 1.1,
    cutoff: 1150,
    q: 2.6,
    attack: 0.18,
    decay: 0.45,
    sustain: 0.5,
    release: 1.1,
  },
  {
    name: "rose",
    label: "Pink & Magenta (Thermal anomaly / Urban)",
    hue: 325,
    partials: [1.0, 0.45, 0.25, 0.22, 0.12, 0.1, 0.06, 0.04],
    harmonicity: 1.0,
    modIndex: 1.4,
    cutoff: 2200,
    q: 3.0,
    attack: 0.03,
    decay: 0.28,
    sustain: 0.45,
    release: 0.55,
  },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Nội suy liên tục trên vòng tròn Hue (0° - 360°) giữa 10 điểm neo màu. */
function interpolateColorTimbre(hue: number) {
  const h = ((hue % 360) + 360) % 360;
  const count = COLOR_NODES.length;

  let idxA = count - 1;
  let idxB = 0;

  for (let i = 0; i < count; i++) {
    const curr = COLOR_NODES[i].hue;
    const next = i === count - 1 ? 360 : COLOR_NODES[i + 1].hue;
    if (h >= curr && h < next) {
      idxA = i;
      idxB = (i + 1) % count;
      break;
    }
  }

  const nodeA = COLOR_NODES[idxA];
  const nodeB = COLOR_NODES[idxB];

  const h1 = nodeA.hue;
  const h2 = idxB === 0 ? 360 : nodeB.hue;
  const span = h2 - h1;
  const rawT = span > 0 ? (h - h1) / span : 0;
  const t = smoothstep(Math.max(0, Math.min(1, rawT)));

  const nearest = t < 0.5 ? nodeA : nodeB;

  return {
    name: nearest.name,
    label: nearest.label,
    partials: nodeA.partials.map((pA, idx) => lerp(pA, nodeB.partials[idx], t)),
    harmonicity: lerp(nodeA.harmonicity, nodeB.harmonicity, t),
    modIndex: lerp(nodeA.modIndex, nodeB.modIndex, t),
    cutoff: lerp(nodeA.cutoff, nodeB.cutoff, t),
    q: lerp(nodeA.q, nodeB.q, t),
    attack: lerp(nodeA.attack, nodeB.attack, t),
    decay: lerp(nodeA.decay, nodeB.decay, t),
    sustain: lerp(nodeA.sustain, nodeB.sustain, t),
    release: lerp(nodeA.release, nodeB.release, t),
  };
}

/** Chuyển bộ (H, S, L) + vị trí dọc (rowFrac) thành cấu hình âm thanh chi tiết. */
export function colorToVoice(
  { hue, sat = 0.7, light = 0.6, rowFrac = 0.5 }: ColorQuery,
  scale: string = "pentatonic",
): Voice {
  const s = Math.max(0, Math.min(1, sat));
  const l = Math.max(0, Math.min(1, light));

  const warmth = hueToWarmth(hue);
  const timbre = interpolateColorTimbre(hue);
  const midi = quantize(LOW_MIDI + rowFrac * (HIGH_MIDI - LOW_MIDI), scale);

  // Đường cong bão hòa hiệu dụng: tách biệt rõ vùng mây/tuyết (sat < 0.2) với vùng màu rực
  const satEff = Math.pow(s, 1.2);

  // Khi màu nhạt (mây, tuyết, khói), thu gọn họa âm về sine thuần để tránh rè gắt
  const partials = timbre.partials.map((p, idx) => (idx === 0 ? 1 : p * (0.15 + 0.85 * satEff)));

  // Cutoff tổng hợp từ: đặc tính Hue + độ rực Saturation + độ sáng Lightness
  const satCutoffBoost = satEff * 1100;
  const lightBrightnessScale = 0.55 + 0.8 * l;
  const cutoff = Math.round(Math.min(6500, Math.max(250, (timbre.cutoff + satCutoffBoost) * lightBrightnessScale)));
  const q = Number((timbre.q * (0.5 + 0.7 * satEff)).toFixed(2));

  // Vùng tối bắt tiếng chậm rãi sâu lắng; vùng sáng nhạy bén tức thì
  const attack = Math.max(0.005, timbre.attack * (1.65 - 1.15 * l));
  const velocity = Math.min(1, 0.15 + 0.85 * Math.pow(l, 0.9));

  // Tỷ lệ hòa trộn giữa tiếng nhạc tính (tonal) và tiếng gió/hơi nước (atmosphere noise)
  const tonalGain = (0.25 + 0.75 * satEff) * velocity;
  const noiseGain = Math.pow(1 - satEff, 2) * 0.28 * velocity;
  const noiseCutoff = Math.round(500 + l * 1900);

  // Nhãn mô tả thân thiện cho UI / aria-live
  const isNeutral = s < 0.18;
  const osc = isNeutral ? "atmosphere" : timbre.name;
  const label = isNeutral ? "Neutral (Cloud / Snow / Fog)" : timbre.label;

  return {
    midi,
    osc,
    label,
    warmth,
    cutoff,
    q,
    velocity,
    partials,
    harmonicity: timbre.harmonicity,
    modIndex: timbre.modIndex * (0.3 + 0.7 * satEff),
    attack,
    decay: timbre.decay,
    sustain: timbre.sustain,
    release: timbre.release,
    tonalGain,
    noiseGain,
    noiseCutoff,
  };
}
