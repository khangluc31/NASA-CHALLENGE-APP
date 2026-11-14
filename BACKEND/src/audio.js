import * as Tone from "tone";

/* 1. THANG ÂM (semitone offsets so với root)                          */
export const SCALES = {
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  tension: [0, 2, 3, 5, 7, 8, 11],
};

const LOW_MIDI = 48; // C3
const HIGH_MIDI = 84; // C6

/* 1B. BẢNG 10 ĐIỂM NEO MÀU SẮC TRÊN VÒNG TRÒN HUE (0° - 360°)        */
// Mỗi điểm neo định nghĩa 8 họa âm (partials) + thông số FM + Filter + ADSR
// để nội suy mượt mà không gây tiếng "tách" khi chuyển vùng màu.
const COLOR_NODES = [
  {
    name: "crimson",
    label: "Đỏ thẫm (Địa nhiệt / Lửa)",
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
    label: "Cam đất (Sa mạc / Bụi khoáng)",
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
    label: "Vàng rực (Bức xạ / Đèn đô thị)",
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
    label: "Vàng chanh (Đồng cỏ / Tảo biển)",
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
    label: "Xanh lá (Rừng mưa / Thảm thực vật)",
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
    label: "Xanh ngọc (Rạn san hô / Cửa sông)",
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
    label: "Cyan (Sông băng / Nước nông)",
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
    label: "Lam đậm (Đại dương sâu / Hải lưu)",
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
    label: "Chàm & Tím (Khí quyển / Cực quang)",
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
    label: "Hồng & Đỏ tía (Dị thường nhiệt / Đô thị)",
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

const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

/** Nội suy liên tục trên vòng tròn Hue (0° - 360°) giữa 10 điểm neo màu. */
function interpolateColorTimbre(hue) {
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

export function quantize(midi, scaleName = "pentatonic", root = LOW_MIDI) {
  const scale = SCALES[scaleName] ?? SCALES.pentatonic;
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
function rowToMidi(rowIdx, rowCount) {
  const t = 1 - rowIdx / Math.max(1, rowCount - 1);
  return LOW_MIDI + t * (HIGH_MIDI - LOW_MIDI);
}

/**
 * hue (0-360) -> độ "ấm" liên tục 0..1 (cosin mượt quanh 15° = ấm nhất, 195° = lạnh nhất).
 * Giữ lại để tương thích ngược với các module khác nếu có import.
 */
export function hueToWarmth(hue) {
  const h = ((hue % 360) + 360) % 360;
  const rad = ((h - 15) * Math.PI) / 180;
  return 0.5 + 0.5 * Math.cos(rad);
}

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

/**
 * Chuyển đổi bộ thông số màu sắc (H, S, L) + vị trí dọc (rowFrac) thành cấu hình âm thanh chi tiết.
 */
export function colorToVoice({ hue, sat = 0.7, light = 0.6, rowFrac = 0.5 }, scale = "pentatonic") {
  const s = Math.max(0, Math.min(1, sat));
  const l = Math.max(0, Math.min(1, light));

  const warmth = hueToWarmth(hue);
  const timbre = interpolateColorTimbre(hue);
  const midi = quantize(LOW_MIDI + rowFrac * (HIGH_MIDI - LOW_MIDI), scale);

  // Đường cong bão hòa hiệu dụng: tách biệt rõ vùng mây/tuyết (sat < 0.2) với vùng màu rực
  const satEff = Math.pow(s, 1.2);

  // Khi màu nhạt (mây, tuyết, khói), thu gọn họa âm về sine thuần để tránh rè gắt
  const partials = timbre.partials.map((p, idx) =>
    idx === 0 ? 1 : p * (0.15 + 0.85 * satEff)
  );

  // Cutoff tổng hợp từ: đặc tính Hue + độ rực Saturation + độ sáng Lightness
  const satCutoffBoost = satEff * 1100;
  const lightBrightnessScale = 0.55 + 0.8 * l;
  const cutoff = Math.round(
    Math.min(6500, Math.max(250, (timbre.cutoff + satCutoffBoost) * lightBrightnessScale))
  );
  const q = Number((timbre.q * (0.5 + 0.7 * satEff)).toFixed(2));

  // Vùng tối (light thấp) bắt tiếng chậm rãi sâu lắng; vùng sáng nhạy bén tức thì
  const attack = Math.max(0.005, timbre.attack * (1.65 - 1.15 * l));
  const velocity = Math.min(1, 0.15 + 0.85 * Math.pow(l, 0.9));

  // Tỷ lệ hòa trộn giữa tiếng nhạc tính (tonal) và tiếng gió/hơi nước (atmosphere noise)
  const tonalGain = (0.25 + 0.75 * satEff) * velocity;
  const noiseGain = Math.pow(1 - satEff, 2) * 0.28 * velocity;
  const noiseCutoff = Math.round(500 + l * 1900);

  // Nhãn mô tả thân thiện cho UI / aria-live
  const isNeutral = s < 0.18;
  const osc = isNeutral ? "atmosphere" : timbre.name;
  const label = isNeutral ? "Trung tính (Mây / Tuyết / Sương mù)" : timbre.label;

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

/* 2C. normalizeFrame: định dạng night_lights.json -> dạng nội bộ       */
// Định dạng của Người 3: { topic, calibration, frames:[{ year, stats, audioColumns:[{rows:[{value,cover}]}] }] }
// Dạng nội bộ mà featuresToNotes/_step đọc: { columns:[{hue,sat,light,edge,rows:[{hue,light}]}], stats }
//
// GIẢ ĐỊNH (chờ Người 3 xác nhận, xem contracts.md mục 7):
//   - value = độ sáng đã hiệu chuẩn 0..1 -> light
//   - cover = tỉ lệ pixel hợp lệ trong ô; cover < MIN_COVER -> ô im lặng
//   - Dữ liệu KHÔNG có màu -> hue lấy từ hueOf(light) nếu có, không thì cố định DEFAULT_HUE.
//     (Nghĩa là với night_lights, 10 gam màu chỉ nghe được khi bạn cấp hueOf, xem setHueMapper)
//   - Không có edge theo cột -> ước lượng tạm từ độ nhấp nhô giữa các hàng liền kề
//   - Mức cấp bách = deltaFromPrev của frame, chia cho giá trị lớn nhất trong các frame
const DEFAULT_HUE = 45;
const MIN_COVER = 0.5;

export function normalizeFrame(
  frame,
  { topic = "night_lights", maxDelta = 0, hue = DEFAULT_HUE, minCover = MIN_COVER, hueOf = null } = {}
) {
  const columns = frame.audioColumns.map((col) => {
    const rows = col.rows.map((r) => {
      const light = (r.cover ?? 1) >= minCover ? Math.max(0, Math.min(1, r.value)) : 0;
      return { hue: hueOf ? hueOf(light) : hue, light };
    });
    const mean = rows.reduce((sum, r) => sum + r.light, 0) / rows.length;
    // `light` của cột = ô sáng nhất (không phải trung bình): dữ liệu đèn thành phố rất thưa,
    // trung bình gần 0 sẽ làm _step luôn coi cột là "tối" khi tính attack/cutoff.
    const peak = rows.reduce((m, r) => Math.max(m, r.light), 0);
    let diff = 0;
    for (let i = 0; i < rows.length - 1; i++) diff += Math.abs(rows[i + 1].light - rows[i].light);
    return {
      hue: hueOf ? hueOf(mean) : hue,
      // sat cao: đèn thành phố là màu rực. Nếu để thấp (< ~0.5) colorToVoice coi là "mây/tuyết"
      // và pha thêm tiếng gió (atmosphere) vào cả những cột sáng.
      sat: 0.8,
      light: peak,
      edge: Math.min(1, diff / 4),
      rows,
    };
  });

  const delta = Math.max(0, frame.stats?.deltaFromPrev ?? 0);
  return {
    id: `${topic}-${frame.year}`,
    title: `${topic} ${frame.year}`,
    year: frame.year,
    columns,
    stats: {
      meanHue: hue,
      meanLight: frame.stats?.mean ?? 0,
      warmRatio: 0,
      edgeDensity: frame.stats?.edge ?? 0,
      urgency: frame.stats?.urgency ?? (maxDelta > 0 ? Math.min(1, delta / maxDelta) : 0),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 3. AUDIO ENGINE                                                     */
/* ------------------------------------------------------------------ */
export class AudioEngine {
  constructor({ baseBpm = 90 } = {}) {
    this.baseBpm = baseBpm;
    this.features = null;
    // dữ liệu thô nhiều năm (null nếu nạp dạng cũ) + frame đang chọn
    this.data = null;
    this.frameIndex = 0;
    this._maxDelta = 0;
    this.hueOf = null; // hàm (light 0..1) -> hue 0..360, null = hue cố định
    this.timeline = false; // true = phát nối tiếp các năm, không cần chọn từng năm
    this._timelineIdx = null; // danh sách chỉ số frame sẽ phát theo thứ tự
    this._ending = false; // đã phát cột cuối, đang chờ stop() (chặn lặp lại cột cuối)
    this.frameListeners = new Set();
    this.col = 0;
    this.speed = 1;
    this.scaleName = "pentatonic";
    this.urgencyMode = false;
    this.listeners = new Set();
    this.eventId = null;
    this.built = false;
    this._lastProbeTime = 0;
  }

  /** Dựng chuỗi âm thanh. Gọi lười (lazy) bên trong play() sau khi có click. */
  _build() {
    if (this.built) return;

    this.master = new Tone.Volume(-6).toDestination();
    this.limiter = new Tone.Limiter(-3).connect(this.master);
    this.reverb = new Tone.Reverb({ decay: 3.2, wet: 0.25 }).connect(this.limiter);

    // 1. Kênh quét tự động (Scan Playback) — FMSynth hỗ trợ biến hình họa âm mượt
    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 1800,
      Q: 2,
      rolloff: -12,
    }).connect(this.reverb);

    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 6,
      harmonicity: 1,
      modulationIndex: 1,
      oscillator: {
        type: "custom",
        partials: [1, 0, 0.14, 0, 0.05, 0, 0.02, 0],
      },
      modulation: { type: "sine" },
      envelope: { attack: 0.03, decay: 0.25, sustain: 0.35, release: 0.8 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
    }).connect(this.filter);
    this.synth.volume.value = -8;

    // Nhiễu tạo kết cấu biên cạnh (edge) & khí quyển cho chế độ quét
    this.noiseFilter = new Tone.Filter(3500, "bandpass").connect(this.reverb);
    this.noise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0 },
    }).connect(this.noiseFilter);
    this.noise.volume.value = -22;

    // 2. Kênh tương tác điểm ảnh (Probe: bấm/rê chuột lên ảnh)
    this.probeFilter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      Q: 2,
      rolloff: -12,
    }).connect(this.reverb);

    // Dùng PolySynth(FMSynth) maxPolyphony 4 để các nốt ngân tự nhiên, không bị cắt ngang
    this.probe = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 4,
      harmonicity: 1,
      modulationIndex: 1,
      oscillator: {
        type: "custom",
        partials: [1, 0, 0.14, 0, 0.05, 0, 0.02, 0],
      },
      modulation: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.6 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
    }).connect(this.probeFilter);
    this.probe.volume.value = -6;

    // Lớp khí quyển riêng cho Probe (tạo tiếng gió/hơi nước khi bấm vào mây, tuyết, vùng màu nhạt)
    this.probeNoiseFilter = new Tone.Filter({
      type: "lowpass",
      frequency: 1200,
      Q: 1.4,
    }).connect(this.reverb);

    this.probeNoise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.08, decay: 0.3, sustain: 0.1, release: 0.6 },
    }).connect(this.probeNoiseFilter);
    this.probeNoise.volume.value = -10;

    this.built = true;
  }

  /**
   * Nạp dữ liệu. An toàn khi gọi trước khi có click.
   * - Định dạng mới: { topic, calibration, frames:[...] } -> nạp frame đầu, đổi năm bằng setFrame(i)
   * - Định dạng cũ : { columns:[...], stats } (dùng cho mock) -> dùng nguyên trạng
   */
  load(data) {
    this.stop();
    this.timeline = false;
    this._timelineIdx = null;
    this.col = 0;
    if (Array.isArray(data?.frames)) {
      this.data = data;
      this._maxDelta = Math.max(0, ...data.frames.map((f) => f.stats?.deltaFromPrev ?? 0));
      this.setFrame(0);
    } else {
      this.data = null;
      this.frameIndex = 0;
      this.features = data;
    }
  }

  /** Chọn frame (năm) theo chỉ số trong data.frames. Dừng phát và về đầu. */
  setFrame(index) {
    if (!this.data) return;
    this.stop();
    this._loadFrame(index);
    this.col = 0;
  }

  /** Nạp frame mà KHÔNG dừng phát (dùng khi nối sang năm kế tiếp trong chế độ timeline). */
  _loadFrame(index) {
    const max = this.data.frames.length - 1;
    this.frameIndex = Math.max(0, Math.min(max, index));
    this.features = normalizeFrame(this.data.frames[this.frameIndex], {
      topic: this.data.topic,
      maxDelta: this._maxDelta,
      hueOf: this.hueOf,
    });
  }

  /**
   * Bật/tắt chế độ phát xuyên suốt các năm.
   * @param on       true = phát lần lượt từng năm, hết năm này nối ngay năm sau
   * @param indices  (tuỳ chọn) chỉ số frame sẽ phát, ví dụ [0, 3, 6, 11]; mặc định tất cả
   * Mỗi năm ~16 giây ở tốc độ 1x, nên nhiều năm thì chọn bớt năm hoặc tăng setSpeed.
   * Bật timeline sẽ dừng phát và quay về năm đầu của danh sách.
   */
  setTimeline(on, indices = null) {
    if (!this.data || !on) {
      this.timeline = false;
      this._timelineIdx = null;
      return;
    }
    const n = this.data.frames.length;
    const list = (indices ?? Array.from({ length: n }, (_, i) => i)).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < n
    );
    if (list.length === 0) {
      this.timeline = false;
      this._timelineIdx = null;
      return;
    }
    this.timeline = true;
    this._timelineIdx = list;
    this.setFrame(list[0]);
  }

  /** cb(frameIndex, year): gọi mỗi khi BẮT ĐẦU một năm (kể cả năm đầu). Dùng cho aria-live. */
  onFrame(cb) {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  /** Danh sách [{ index, year }] để UI dựng ô chọn năm (rỗng nếu dữ liệu một frame). */
  getYears() {
    return this.data ? this.data.frames.map((f, index) => ({ index, year: f.year })) : [];
  }

  /**
   * Gán hàm đổi độ sáng ô (0..1) thành hue (0..360) để dữ liệu KHÔNG có màu (night_lights)
   * vẫn dùng được 10 gam màu. Truyền null để quay về hue cố định.
   * Ví dụ: engine.setHueMapper((light) => 230 - 172 * light); // mờ = lam đậm, sáng = vàng rực
   */
  setHueMapper(fn) {
    this.hueOf = typeof fn === "function" ? fn : null;
    if (this.data) this.setFrame(this.frameIndex);
  }

  async play() {
    if (!this.features) return;
    await Tone.start();
    this._build();
    this._ending = false;
    this._applyGlobalParams();
    if (this.eventId === null) {
      this.eventId = Tone.Transport.scheduleRepeat((time) => this._step(time), "16n");
    }
    Tone.Transport.start();
  }

  pause() {
    Tone.Transport.pause();
  }

  stop() {
    Tone.Transport.stop();
    if (this.eventId !== null) {
      Tone.Transport.clear(this.eventId);
      this.eventId = null;
    }
    this._ending = false;
    // timeline: Stop (hoặc hết bài) = quay về năm đầu của danh sách
    if (this.timeline && this.data && this._timelineIdx?.length && this.frameIndex !== this._timelineIdx[0]) {
      this._loadFrame(this._timelineIdx[0]);
    }
    this.col = 0;
    this._emit(0, 0, this.features ? this._info(0, this.features.columns.length - 1) : undefined);
  }

  /** Tua tới cột index (dùng cho phím ←/→). */
  seek(index) {
    if (!this.features) return;
    const max = this.features.columns.length - 1;
    this.col = Math.max(0, Math.min(max, index));
    this._emit(this.col, max > 0 ? this.col / max : 0, this._info(this.col, max));
  }

  setSpeed(x) {
    this.speed = x;
    this._applyGlobalParams();
  }

  setScale(name) {
    if (SCALES[name]) this.scaleName = name;
  }

  setVolume(v01) {
    this._build();
    this.master.volume.value = v01 <= 0 ? -Infinity : -40 + v01 * 40;
  }

  setUrgencyMode(on) {
    this.urgencyMode = on;
    this._applyGlobalParams();
  }

  /**
   * cb(columnIndex, progress0to1, info). Trả về hàm hủy đăng ký.
   * progress: tiến độ TRONG năm hiện tại. info (có thể undefined khi chưa có dữ liệu):
   *   { frameIndex, year, timeline, yearPos, yearCount, total } với total = tiến độ cả bài 0..1.
   */
  onPlayhead(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Phát âm của một màu (bấm vào ảnh hoặc ô màu). PHẢI gọi từ click/phím.
   * @returns voice đã dùng (để UI cập nhật aria-live)
   */
  async playColor(color, { dur = "8n" } = {}) {
    await Tone.start();
    this._build();

    const v = colorToVoice(color, this.scaleName);

    // Đảm bảo thời điểm kích hoạt luôn tăng dần tuyệt đối, tránh lỗi Tone.now() trùng khung audio
    const now = Math.max(Tone.now(), this._lastProbeTime + 0.015);
    this._lastProbeTime = now;

    // Trượt mượt tần số cắt & cộng hưởng filter theo sắc độ màu
    this.probeFilter.frequency.rampTo(v.cutoff, 0.025, now);
    this.probeFilter.Q.rampTo(v.q, 0.025, now);

    // Cập nhật cấu trúc họa âm (partials), điều chế FM & Envelope
    this.probe.set({
      harmonicity: v.harmonicity,
      modulationIndex: v.modIndex,
      oscillator: {
        type: "custom",
        partials: v.partials,
      },
      envelope: {
        attack: v.attack,
        decay: v.decay,
        sustain: v.sustain,
        release: v.release,
      },
    });

    const freq = Tone.Frequency(v.midi, "midi").toFrequency();
    this.probe.triggerAttackRelease(freq, dur, now, v.tonalGain);

    // Nếu điểm ảnh có độ bão hòa thấp (mây, tuyết, khói bụi), pha thêm tiếng gió/khí quyển
    if (v.noiseGain > 0.015) {
      this.probeNoiseFilter.frequency.rampTo(v.noiseCutoff, 0.03, now);
      this.probeNoise.triggerAttackRelease(dur, now, Math.min(1, v.noiseGain * 3));
    }

    return v;
  }

  /** Phát âm của ô (col,row) trong features: dùng cho bấm chuột lẫn phím mũi tên. */
  async playCell(col, row) {
    if (!this.features) return null;
    const column = this.features.columns[col];
    const cell = column?.rows[row];
    if (!cell) return null;
    const rows = column.rows.length;
    return this.playColor({
      hue: cell.hue,
      sat: column.sat,
      light: cell.light,
      rowFrac: 1 - row / Math.max(1, rows - 1),
    });
  }

  get urgency() {
    if (!this.urgencyMode || !this.features) return 0;
    return Math.min(1, this.features.stats?.urgency ?? this.features.stats?.warmRatio ?? 0);
  }

  _applyGlobalParams() {
    const u = this.urgency;
    Tone.Transport.bpm.value = this.baseBpm * this.speed * (1 + 0.5 * u);
    if (this.built && u > 0) {
      this.filter.frequency.rampTo(1500 + 3200 * u, 0.05);
    }
  }

  _emit(i, progress, info) {
    for (const cb of this.listeners) cb(i, progress, info);
  }

  _emitFrame(frameIndex, year) {
    for (const cb of this.frameListeners) cb(frameIndex, year);
  }

  /** Thông tin vị trí cho UI: năm đang phát và tiến độ cả bài. */
  _info(idx, last) {
    const n = this.timeline ? this._timelineIdx.length : 1;
    const pos = this.timeline ? Math.max(0, this._timelineIdx.indexOf(this.frameIndex)) : 0;
    const within = last > 0 ? idx / last : 0;
    return {
      frameIndex: this.frameIndex,
      year: this.features?.year ?? null,
      timeline: this.timeline,
      yearPos: pos,
      yearCount: n,
      total: (pos + within) / n,
    };
  }

  /** Sang năm kế tiếp trong timeline. Trả false nếu đã hết danh sách. */
  _advanceFrame() {
    const pos = this._timelineIdx.indexOf(this.frameIndex);
    const next = this._timelineIdx[pos + 1];
    if (next === undefined) return false;
    this._loadFrame(next);
    this.col = 0;
    this._applyGlobalParams(); // tempo và độ gắt đổi theo mức cấp bách của năm mới
    return true;
  }

  /**
   * Tiếng "chuông" ngắn báo sang năm mới. Cao độ tăng dần theo thứ tự năm (khoảng một quãng tám)
   * để người nghe (kể cả không nhìn màn hình) cảm nhận được thời gian trôi.
   */
  _frameMarker(time, pos, n) {
    const midi = quantize(LOW_MIDI + (pos / Math.max(1, n - 1)) * 12, "pentatonic");
    this.probe.set({
      harmonicity: 1,
      modulationIndex: 0.3,
      oscillator: { type: "custom", partials: [1, 0.2, 0, 0, 0, 0, 0, 0] },
      envelope: { attack: 0.01, decay: 0.35, sustain: 0, release: 0.6 },
    });
    this.probe.triggerAttackRelease(Tone.Frequency(midi, "midi").toFrequency(), "8n", time, 0.45);
  }

  _step(time) {
    // đã phát xong cột cuối: các lần lặp còn lại của scheduleRepeat (trước khi stop() chạy) bỏ qua
    if (this._ending) return;
    const cols = this.features.columns;
    const last = cols.length - 1;
    const column = cols[this.col];
    const u = this.urgency;

    // đầu mỗi năm: báo UI (aria-live), và nếu đang timeline thì rung chuông báo năm mới
    if (this.col === 0) {
      const fi = this.frameIndex;
      const yr = this.features.year ?? null;
      Tone.Draw.schedule(() => this._emitFrame(fi, yr), time);
      if (this.timeline) {
        const pos = this._timelineIdx.indexOf(fi);
        if (pos > 0) this._frameMarker(time, pos, this._timelineIdx.length);
      }
    }
    const scale = u > 0.6 ? "tension" : this.scaleName;

    // 1. Lấy màu chủ đạo của cột hiện tại (hoặc nốt sáng nhất) để biến đổi âm sắc khi quét
    const notes = featuresToNotes(column, { scale, urgency: u });
    const dominantHue = notes[0]?.hue ?? column.hue ?? 180;
    const colVoice = colorToVoice(
      {
        hue: dominantHue,
        sat: column.sat ?? 0.6,
        light: column.light ?? 0.6,
        rowFrac: 0.5,
      },
      scale
    );

    const scanCutoff = Math.min(6500, colVoice.cutoff + u * 1500);
    this.filter.frequency.rampTo(scanCutoff, 0.03, time);
    this.filter.Q.rampTo(colVoice.q, 0.03, time);

    this.synth.set({
      harmonicity: colVoice.harmonicity,
      modulationIndex: colVoice.modIndex + u * 1.5,
      oscillator: {
        type: "custom",
        partials: colVoice.partials,
      },
      envelope: {
        attack: colVoice.attack,
        decay: colVoice.decay,
        sustain: colVoice.sustain,
        release: colVoice.release,
      },
    });

    for (const n of notes) {
      const freq = Tone.Frequency(n.midi, "midi").toFrequency();
      this.synth.triggerAttackRelease(freq, "8n", time, n.velocity);
    }

    // 2. Phát lớp nhiễu: ưu tiên chi tiết biên (edge) hoặc hơi thở khí quyển khi màu nhạt (mây/tuyết)
    const edgeLevel = column.edge ?? 0;
    if (edgeLevel > 0.5) {
      this.noiseFilter.frequency.rampTo(3800, 0.02, time);
      this.noise.triggerAttackRelease("32n", time, Math.min(1, edgeLevel));
    } else if (colVoice.noiseGain > 0.03) {
      this.noiseFilter.frequency.rampTo(colVoice.noiseCutoff, 0.04, time);
      this.noise.triggerAttackRelease("16n", time, Math.min(0.6, colVoice.noiseGain * 2));
    }

    const idx = this.col;
    const info = this._info(idx, last); // chốt NGAY, vì có thể sang năm khác ngay sau đây
    Tone.Draw.schedule(() => this._emit(idx, last > 0 ? idx / last : 0, info), time);

    if (this.col >= last) {
      // timeline: còn năm kế thì nối tiếp ngay, không dừng
      if (this.timeline && this._advanceFrame()) return;
      this._ending = true;
      Tone.Draw.schedule(() => this.stop(), time + 0.5);
      return;
    }
    this.col += 1;
  }

  /** Giải phóng tài nguyên Web Audio khi unmount component. */
  dispose() {
    this.stop();
    if (!this.built) return;
    this.synth.dispose();
    this.noise.dispose();
    this.filter.dispose();
    this.noiseFilter.dispose();
    this.probe.dispose();
    this.probeNoise.dispose();
    this.probeFilter.dispose();
    this.probeNoiseFilter.dispose();
    this.reverb.dispose();
    this.limiter.dispose();
    this.master.dispose();
    this.built = false;
  }
}

export const engine = new AudioEngine();