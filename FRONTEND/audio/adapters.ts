// Adapter: co2.json / ocean.json (chuỗi số theo frame, KHÔNG có audioColumns) --> RawData giống night_lights.
//
// Cách sonify: trục ngang = thời gian, mỗi cột = trung bình của một nhóm frame liên tiếp.
// Mỗi cột chỉ sáng ĐÚNG MỘT ô, ở hàng ứng với giá trị (giá trị cao = hàng trên = nốt cao) -> một dòng
// giai điệu lên/xuống theo dữ liệu. Màu chạy lam (thấp) -> đỏ (cao). Frame thiếu dữ liệu = khoảng lặng.
import { MIN_COVER } from "./data";
import type { Co2Data, EngineInput, Features, OceanData, RawAudioColumn, RawData, RawFrame } from "./types";

export interface AdaptOptions {
  /** số cột của mỗi frame (mặc định 96 như night_lights -> ~16 giây ở 1x) */
  columns?: number;
  /** số hàng (mặc định 16 như night_lights) */
  rows?: number;
  /** chia chuỗi thành bao nhiêu frame ("năm") nối tiếp; 1 = cả chuỗi trong một lượt quét */
  segments?: number;
}

const DEFAULT_COLUMNS = 96;
const DEFAULT_ROWS = 16;

const HUE_LOW = 230; // giá trị thấp: lam đậm (deep-blue)
const HUE_HIGH = 0; //  giá trị cao: đỏ thẫm (crimson). Đi qua cyan/xanh lá/vàng/cam ở giữa
const EDGE_GAIN = 2.5; //  |thay đổi giữa 2 cột liền kề| * 2.5 = edge; > 0.5 (nhảy > 20% thang) thì có tiếng nhiễu
const LOW_PCT = 0.01; //  chuẩn hoá theo percentile 1%..99% của cả chuỗi để vài điểm ngoại lai không làm phẳng giai điệu
const HIGH_PCT = 0.99;

const CO2_OK_QUALITY = "approximate_visible_color_match";
const CO2_MIN_PIXELS = 50; // frame có ít hơn 50 pixel khớp màu thì số ppm quá nhiễu -> coi như thiếu

type Sample = number | null;

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/* ------------------------------------------------------------------ */
/* Trích chuỗi số từ từng loại JSON                                    */
/* ------------------------------------------------------------------ */
function co2Samples(d: Co2Data): Sample[] {
  return (d.frames ?? []).map((f) =>
    f.quality === CO2_OK_QUALITY && num(f.co2_mean_ppm) && (f.valid_pixel_count ?? 0) >= CO2_MIN_PIXELS
      ? f.co2_mean_ppm
      : null,
  );
}

function oceanSamples(d: OceanData): Sample[] {
  return (d.frames ?? []).map((f) => (num(f.temperature?.mean_temp) ? f.temperature.mean_temp : null));
}

/* ------------------------------------------------------------------ */
/* Chuẩn hoá và lấy mẫu lại                                            */
/* ------------------------------------------------------------------ */
/** Đưa cả chuỗi về 0..1 (dùng chung một thang cho mọi segment để các đoạn so sánh được với nhau). */
function toLevels(samples: Sample[]): Sample[] {
  const valid = samples.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (valid.length === 0) return samples;
  const at = (p: number) => valid[Math.min(valid.length - 1, Math.floor(p * valid.length))];
  const lo = at(LOW_PCT);
  const hi = at(HIGH_PCT);
  const span = hi - lo;
  return samples.map((v) => (v === null ? null : span > 1e-9 ? Math.max(0, Math.min(1, (v - lo) / span)) : 0.5));
}

interface Bucket {
  level: number | null;
  /** tỉ lệ frame hợp lệ trong nhóm (0..1) */
  cover: number;
}

/** Gộp đoạn [from, to) của chuỗi thành `columns` nhóm, mỗi nhóm lấy trung bình các frame hợp lệ. */
function resample(levels: Sample[], from: number, to: number, columns: number): Bucket[] {
  const n = to - from;
  return Array.from({ length: columns }, (_, j) => {
    const a = from + Math.floor((j * n) / columns);
    const b = Math.min(to, Math.max(a + 1, from + Math.floor(((j + 1) * n) / columns)));
    let sum = 0;
    let count = 0;
    for (let i = a; i < b; i++) {
      const v = levels[i];
      if (v !== null) {
        sum += v;
        count++;
      }
    }
    return { level: count > 0 ? sum / count : null, cover: count / (b - a) };
  });
}

/* ------------------------------------------------------------------ */
/* Nhóm -> lưới audioColumns                                           */
/* ------------------------------------------------------------------ */
function buildFrame(buckets: Bucket[], rows: number, frameId: number): RawFrame {
  let prev: number | null = null;
  let sumLevel = 0;
  let sumEdge = 0;
  let voiced = 0;

  const audioColumns = buckets.map(({ level, cover }): RawAudioColumn => {
    // Thiếu dữ liệu (hoặc quá ít frame hợp lệ, data.ts cũng sẽ cắt ở ngưỡng này): cột im lặng
    if (level === null || cover < MIN_COVER) {
      prev = null;
      return { edge: 0, rows: Array.from({ length: rows }, () => ({ value: 0, cover: 0 })) };
    }

    const hue = HUE_LOW + (HUE_HIGH - HUE_LOW) * level;
    const row = Math.round((1 - level) * (rows - 1)); // hàng 0 = trên cùng = cao độ cao (khớp rowToMidi)
    const edge = prev === null ? 0 : Math.min(1, Math.abs(level - prev) * EDGE_GAIN);
    prev = level;

    sumLevel += level;
    sumEdge += edge;
    voiced++;

    return {
      hue,
      edge,
      rows: Array.from({ length: rows }, (_, i) => ({ value: i === row ? 1 : 0, cover, hue })),
    };
  });

  const mean = voiced > 0 ? sumLevel / voiced : 0;
  return {
    frame_id: frameId,
    stats: {
      mean,
      deltaFromPrev: 0,
      edge: voiced > 0 ? sumEdge / voiced : 0,
      // giá trị trung bình của đoạn càng cao (CO2 nhiều / biển nóng) thì "cấp bách" càng lớn (dùng khi bật urgencyMode)
      urgency: mean,
    },
    audioColumns,
  };
}

function seriesToRaw(topic: string, samples: Sample[], frameIds: (number | undefined)[], opts: AdaptOptions): RawData {
  const columns = Math.max(1, Math.floor(opts.columns ?? DEFAULT_COLUMNS));
  const rows = Math.max(2, Math.floor(opts.rows ?? DEFAULT_ROWS));
  const total = samples.length;
  if (total === 0) throw new Error(`${topic}: dữ liệu không có frame nào`);
  if (!samples.some((v) => v !== null)) throw new Error(`${topic}: không frame nào có số liệu hợp lệ`);

  const segments = Math.max(1, Math.min(total, Math.floor(opts.segments ?? 1)));
  const levels = toLevels(samples);

  const frames: RawFrame[] = [];
  for (let s = 0; s < segments; s++) {
    const from = Math.floor((s * total) / segments);
    const to = Math.floor(((s + 1) * total) / segments);
    frames.push(buildFrame(resample(levels, from, to, columns), rows, frameIds[from] ?? from));
  }
  return { topic, frames };
}

/* ------------------------------------------------------------------ */
/* Điểm vào                                                            */
/* ------------------------------------------------------------------ */
const framesOf = (d: unknown): unknown[] | null => {
  const f = (d as { frames?: unknown }).frames;
  return Array.isArray(f) ? f : null;
};

const hasKey = (frames: unknown[], key: string) =>
  frames.some((f) => typeof f === "object" && f !== null && key in f);

/**
 * Nhận diện loại JSON và trả về dạng engine phát được:
 * - có audioColumns (night_lights) hoặc dạng cũ Features -> giữ nguyên
 * - co2.json, ocean.json -> đổi thành RawData với audioColumns
 * JSON không nhận ra được thì ném lỗi rõ ràng.
 */
export function toRawData(input: EngineInput, opts: AdaptOptions = {}): RawData | Features {
  const frames = framesOf(input);
  if (!frames) return input as Features; // dạng cũ { columns, stats }

  if (hasKey(frames, "audioColumns")) return input as RawData;

  const meta = input as { topic?: string; dataset?: string };

  if (meta.topic === "co2" || hasKey(frames, "co2_mean_ppm")) {
    const d = input as Co2Data;
    return seriesToRaw(
      "co2",
      co2Samples(d),
      (d.frames ?? []).map((f) => f.frame_id),
      opts,
    );
  }

  if (meta.dataset?.includes("sea_surface") || meta.topic === "ocean" || hasKey(frames, "temperature")) {
    const d = input as OceanData;
    return seriesToRaw(
      "ocean",
      oceanSamples(d),
      (d.frames ?? []).map((f) => f.frame_id),
      opts,
    );
  }

  throw new Error("JSON không nhận ra được: không có audioColumns, cũng không phải co2 hay ocean");
}