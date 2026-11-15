/* ------------------------------------------------------------------ */
/* Dữ liệu                                                             */
/* ------------------------------------------------------------------ */

/** Một ô trong dạng nội bộ mà engine phát. */
export interface Cell {
  hue: number;
  light: number;
}

export interface FeatureColumn {
  hue: number;
  sat: number;
  /** ô sáng nhất của cột (dữ liệu mới) hoặc trung bình (mock cũ) */
  light: number;
  edge: number;
  rows: Cell[];
}

/** Số ô sáng thêm / tối đi so với năm gốc (chỉ có khi bật nhấn mạnh thay đổi). */
export interface FrameChange {
  up: number;
  down: number;
  since: number | null;
}

export interface FeatureStats {
  meanHue?: number;
  meanLight?: number;
  warmRatio?: number;
  edgeDensity?: number;
  urgency?: number;
  change?: FrameChange | null;
}

/** Dạng nội bộ: { columns, stats } — đầu ra của normalizeFrame, cũng là định dạng "cũ" của mock. */
export interface Features {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  year?: number;
  columns: FeatureColumn[];
  stats?: FeatureStats;
}

/* ---- JSON thô của Người 3 (night_lights.json). Mọi trường để optional vì validateRaw kiểm tra dữ liệu chưa tin cậy ---- */
export interface RawRow {
  value?: number;
  cover?: number;
}
export interface RawAudioColumn {
  rows?: RawRow[];
}
export interface RawFrame {
  year?: number;
  /** số thứ tự frame của video gốc (night_lights.mp4) tại thời điểm năm này */
  frame_id?: number;
  stats?: { mean?: number; deltaFromPrev?: number; edge?: number; urgency?: number };
  audioColumns?: RawAudioColumn[];
}
export interface RawData {
  topic?: string;
  source?: { video?: string; fps?: number; width?: number; height?: number };
  calibration?: { bg?: number; ref?: number };
  frames?: RawFrame[];
}

/** Engine nhận dạng mới (frames) hoặc dạng cũ (Features). */
export type EngineInput = RawData | Features;

/* ------------------------------------------------------------------ */
/* Âm thanh                                                            */
/* ------------------------------------------------------------------ */
export type ScaleName = "pentatonic" | "dorian" | "tension";
export type HueMapper = (light: number) => number;

export interface ColorQuery {
  hue: number;
  sat?: number;
  light?: number;
  rowFrac?: number;
}

/** Cấu hình giọng do colorToVoice sinh ra. */
export interface Voice {
  midi: number;
  osc: string;
  label: string;
  warmth: number;
  cutoff: number;
  q: number;
  velocity: number;
  partials: number[];
  harmonicity: number;
  modIndex: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  tonalGain: number;
  noiseGain: number;
  noiseCutoff: number;
}

export interface Note {
  midi: number;
  velocity: number;
  warmth: number;
  hue: number;
}

export interface YearEntry {
  index: number;
  year: number | undefined;
}

export interface PlayheadInfo {
  frameIndex: number;
  year: number | null;
  timeline: boolean;
  yearPos: number;
  yearCount: number;
  /** tiến độ cả bài 0..1 */
  total: number;
  change: FrameChange | null;
}

export type FrameListener = (frameIndex: number, year: number | null, change: FrameChange | null) => void;
export type PlayheadListener = (col: number, progress: number, info?: PlayheadInfo) => void;

/* ---- pickColor ---- */
export interface PickGrid {
  cols: number;
  rows: number;
  crop: readonly [number, number, number, number];
}
export interface PickedColor {
  hue: number;
  sat: number;
  light: number;
  rowFrac: number;
  col: number;
  row: number;
  inGrid: boolean;
}

/* ---- tua ---- */
export interface SeekTarget {
  frameIndex?: number;
  col?: number;
  /** 0..1 trong năm đang chọn */
  progress?: number;
}
export interface SeekOptions {
  /** nghe thử cột đích một lần nếu đang không phát */
  audition?: boolean;
}
