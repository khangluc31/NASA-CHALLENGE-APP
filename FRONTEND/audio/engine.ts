import * as Tone from "tone";

import { normalizeFrame } from "./data";
import { featuresToNotes } from "./notes";
import { colorToVoice } from "./palette";
import { LOW_MIDI, isScaleName, quantize } from "./scales";
import type {
  ColorQuery,
  FeatureColumn,
  EngineInput,
  Features,
  FrameChange,
  FrameListener,
  HueMapper,
  PlayheadInfo,
  PlayheadListener,
  RawData,
  RawFrame,
  ScaleName,
  SeekOptions,
  SeekTarget,
  Voice,
  YearEntry,
} from "./types";

const isRawData = (d: EngineInput): d is RawData => Array.isArray((d as RawData).frames);

/** Cấu hình partials tuỳ chỉnh dùng chung cho các synth. */
const customOsc = (partials: number[]) => ({ type: "custom" as const, partials });

export class AudioEngine {
  /* ---- dữ liệu ---- */
  features: Features | null = null;
  /** dữ liệu thô nhiều năm (null nếu nạp dạng cũ) */
  data: RawData | null = null;
  /** frame (năm) đang chọn */
  frameIndex = 0;
  /** hàm (light 0..1) -> hue 0..360, null = hue cố định */
  hueOf: HueMapper | null = null;
  /** true = phát nối tiếp các năm */
  timeline = false;
  /** true = làm nổi ô đổi so với năm gốc */
  changeEmphasis = false;

  /* ---- phát ---- */
  col = 0;
  speed = 1;
  scaleName: ScaleName = "pentatonic";
  urgencyMode = false;

  private readonly baseBpm: number;
  private maxDelta = 0; // deltaFromPrev dương lớn nhất, để chuẩn hóa mức cấp bách
  private timelineIdx: number[] | null = null; // chỉ số frame sẽ phát theo thứ tự
  private ending = false; // đã phát cột cuối, đang chờ stop() (chặn lặp lại cột cuối)
  private readonly frameListeners = new Set<FrameListener>();
  private readonly listeners = new Set<PlayheadListener>();
  private eventId: number | null = null;
  private built = false;
  private lastProbeTime = 0;

  /* ---- node Tone (dựng lười trong build()) ---- */
  private master!: Tone.Volume;
  private limiter!: Tone.Limiter;
  private reverb!: Tone.Reverb;
  private filter!: Tone.Filter;
  private synth!: Tone.PolySynth<Tone.FMSynth>;
  private noiseFilter!: Tone.Filter;
  private noise!: Tone.NoiseSynth;
  private probeFilter!: Tone.Filter;
  private probe!: Tone.PolySynth<Tone.FMSynth>;
  private probeNoiseFilter!: Tone.Filter;
  private probeNoise!: Tone.NoiseSynth;

  constructor({ baseBpm = 90 }: { baseBpm?: number } = {}) {
    this.baseBpm = baseBpm;
  }

  /** Chỉ số frame của danh sách timeline đang dùng (null nếu timeline tắt). */
  get timelineIndexes(): readonly number[] | null {
    return this.timelineIdx;
  }

  /* ------------------------------------------------------------------ */
  /* Dựng chuỗi âm thanh. Gọi lười bên trong play() sau khi có click.     */
  /* ------------------------------------------------------------------ */
  private build() {
    if (this.built) return;

    this.master = new Tone.Volume(-6).toDestination();
    this.limiter = new Tone.Limiter(-3).connect(this.master);
    this.reverb = new Tone.Reverb({ decay: 3.2, wet: 0.25 }).connect(this.limiter);

    // 1. Kênh quét tự động — FMSynth hỗ trợ biến hình họa âm mượt
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 1800, Q: 2, rolloff: -12 }).connect(this.reverb);

    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1,
      modulationIndex: 1,
      oscillator: customOsc([1, 0, 0.14, 0, 0.05, 0, 0.02, 0]),
      modulation: { type: "sine" },
      envelope: { attack: 0.03, decay: 0.25, sustain: 0.35, release: 0.8 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
    }).connect(this.filter);
    this.synth.maxPolyphony = 6; // không có trong type của constructor, nhưng là property công khai
    this.synth.volume.value = -8;

    // Nhiễu tạo kết cấu biên cạnh (edge) & khí quyển cho chế độ quét
    this.noiseFilter = new Tone.Filter(3500, "bandpass").connect(this.reverb);
    this.noise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0 },
    }).connect(this.noiseFilter);
    this.noise.volume.value = -22;

    // 2. Kênh tương tác điểm ảnh (Probe: bấm/rê chuột lên ảnh)
    this.probeFilter = new Tone.Filter({ type: "lowpass", frequency: 2000, Q: 2, rolloff: -12 }).connect(this.reverb);

    // PolySynth(FMSynth) maxPolyphony 4 để các nốt ngân tự nhiên, không bị cắt ngang
    this.probe = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1,
      modulationIndex: 1,
      oscillator: customOsc([1, 0, 0.14, 0, 0.05, 0, 0.02, 0]),
      modulation: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.6 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
    }).connect(this.probeFilter);
    this.probe.maxPolyphony = 4;
    this.probe.volume.value = -6;

    // Lớp khí quyển riêng cho Probe (gió/hơi nước khi bấm vào mây, tuyết, vùng màu nhạt)
    this.probeNoiseFilter = new Tone.Filter({ type: "lowpass", frequency: 1200, Q: 1.4 }).connect(this.reverb);
    this.probeNoise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.08, decay: 0.3, sustain: 0.1, release: 0.6 },
    }).connect(this.probeNoiseFilter);
    this.probeNoise.volume.value = -10;

    this.built = true;
  }

  /* ------------------------------------------------------------------ */
  /* Nạp dữ liệu                                                         */
  /* ------------------------------------------------------------------ */
  /**
   * An toàn khi gọi trước khi có click.
   * - Định dạng mới: { topic, calibration, frames:[...] } -> nạp frame đầu, đổi năm bằng setFrame(i)
   * - Định dạng cũ : { columns:[...], stats } (mock) -> dùng nguyên trạng
   */
  load(data: EngineInput) {
    this.stop();
    this.timeline = false;
    this.timelineIdx = null;
    this.col = 0;
    if (isRawData(data)) {
      this.data = data;
      this.maxDelta = Math.max(0, ...(data.frames ?? []).map((f) => f.stats?.deltaFromPrev ?? 0));
      this.setFrame(0);
    } else {
      this.data = null;
      this.frameIndex = 0;
      this.features = data;
    }
  }

  /** Chọn frame (năm) theo chỉ số trong data.frames. Dừng phát và về đầu. */
  setFrame(index: number) {
    if (!this.data) return;
    this.stop();
    this.loadFrame(index);
    this.col = 0;
  }

  /** Nạp frame mà KHÔNG dừng phát (dùng khi nối sang năm kế tiếp trong timeline). */
  private loadFrame(index: number) {
    const frames = this.frames();
    const max = frames.length - 1;
    this.frameIndex = Math.max(0, Math.min(max, index));
    this.features = normalizeFrame(frames[this.frameIndex], {
      topic: this.data?.topic,
      maxDelta: this.maxDelta,
      hueOf: this.hueOf,
      base: this.changeEmphasis ? this.baseFrame() : null,
    });
  }

  private frames(): RawFrame[] {
    return this.data?.frames ?? [];
  }

  /** Danh sách [{ index, year }] để UI dựng ô chọn năm (rỗng nếu dữ liệu một frame). */
  getYears(): YearEntry[] {
    return this.frames().map((f, index) => ({ index, year: f.year }));
  }

  /**
   * Gán hàm đổi độ sáng ô (0..1) thành hue (0..360) để dữ liệu KHÔNG có màu (night_lights)
   * vẫn dùng được 10 gam màu. Truyền null để quay về hue cố định.
   */
  setHueMapper(fn: HueMapper | null) {
    this.hueOf = typeof fn === "function" ? fn : null;
    if (this.data) this.setFrame(this.frameIndex);
  }

  /**
   * Bật/tắt NHẤN MẠNH THAY ĐỔI: so mỗi năm với năm gốc, ô sáng thêm nghe như chuông vàng rực,
   * ô tối đi nghe như tiếng lam trầm, phần không đổi làm nền êm. Dừng phát và nạp lại frame hiện tại.
   */
  setChangeEmphasis(on: boolean) {
    this.changeEmphasis = !!on;
    if (this.data) this.setFrame(this.frameIndex);
  }

  /** Frame gốc dùng để so sánh thay đổi (năm đầu của timeline, hoặc frame 0). */
  private baseFrame(): RawFrame {
    return this.frames()[this.timelineIdx?.[0] ?? 0];
  }

  /**
   * Bật/tắt chế độ phát xuyên suốt các năm.
   * @param indices chỉ số frame sẽ phát, ví dụ [0, 3, 6, 11]; mặc định tất cả.
   * Mỗi năm ~16 giây ở tốc độ 1x. Bật timeline sẽ dừng phát và quay về năm đầu của danh sách.
   */
  setTimeline(on: boolean, indices: number[] | null = null) {
    if (!this.data || !on) {
      this.timeline = false;
      this.timelineIdx = null;
      return;
    }
    const n = this.frames().length;
    const list = (indices ?? Array.from({ length: n }, (_, i) => i)).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < n,
    );
    if (list.length === 0) {
      this.timeline = false;
      this.timelineIdx = null;
      return;
    }
    this.timeline = true;
    this.timelineIdx = list;
    this.setFrame(list[0]);
  }

  /**
   * cb(frameIndex, year, change): gọi mỗi khi BẮT ĐẦU một năm (kể cả năm đầu).
   * change = { up, down, since } hoặc null nếu chưa bật setChangeEmphasis. Trả về hàm huỷ đăng ký.
   */
  onFrame(cb: FrameListener): () => void {
    this.frameListeners.add(cb);
    return () => {
      this.frameListeners.delete(cb);
    };
  }

  /**
   * cb(columnIndex, progress0to1, info). Trả về hàm huỷ đăng ký.
   * progress: tiến độ TRONG năm hiện tại. info.total = tiến độ cả bài 0..1.
   */
  onPlayhead(cb: PlayheadListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /* ------------------------------------------------------------------ */
  /* Transport                                                           */
  /* ------------------------------------------------------------------ */
  async play() {
    if (!this.features) return;
    await Tone.start();
    this.build();
    this.ending = false; // bắt đầu lại thì xóa cờ "đang kết thúc"
    this.applyGlobalParams();
    if (this.eventId === null) {
      this.eventId = Tone.Transport.scheduleRepeat((time) => this.step(time), "16n");
    }
    Tone.Transport.start();
  }

  pause() {
    Tone.Transport.pause();
  }

  stop() {
    const transport = Tone.Transport;
    transport.stop();
    if (this.eventId !== null) {
      transport.clear(this.eventId);
      this.eventId = null;
    }

    // Xóa cờ kết thúc; timeline thì Stop/hết bài = quay về năm đầu
    this.ending = false;
    if (this.timeline && this.data && this.timelineIdx?.length && this.frameIndex !== this.timelineIdx[0]) {
      this.loadFrame(this.timelineIdx[0]);
    }

    this.col = 0;
    this.emit(0, 0, this.features ? this.info(0, this.features.columns.length - 1) : undefined);
  }

  /**
   * Tua tới một vị trí, dùng được cả khi đang phát lẫn khi dừng/tạm dừng.
   * - frameIndex: đổi sang năm khác (không dừng phát); bỏ trống = giữ năm hiện tại.
   * - col HOẶC progress (0..1 trong năm): cột đích; bỏ trống cả hai = giữ cột hiện tại.
   * Đang phát thì nhịp kế tiếp phát đúng cột mới. Khi KHÔNG phát, `audition: true` sẽ nghe thử cột đó một lần.
   */
  seekTo({ frameIndex, col, progress }: SeekTarget, { audition = false }: SeekOptions = {}) {
    if (!this.features) return;

    let yearChanged = false;
    if (frameIndex !== undefined && this.data && frameIndex !== this.frameIndex) {
      this.loadFrame(frameIndex);
      this.applyGlobalParams(); // tempo / độ gắt đổi theo mức cấp bách của năm mới
      yearChanged = true;
    }

    const features = this.features;
    if (!features) return;
    const max = features.columns.length - 1;
    const target = col ?? (progress !== undefined ? progress * max : this.col);
    this.col = Math.max(0, Math.min(max, Math.round(target)));
    this.ending = false;

    if (yearChanged) this.emitFrame(this.frameIndex, features.year ?? null, features.stats?.change ?? null);
    this.emit(this.col, max > 0 ? this.col / max : 0, this.info(this.col, max));

    if (audition && !this.playing) void this.auditionColumn();
  }

  /**
   * Tua theo tiến độ cả bài 0..1 (cùng thang với info.total).
   * Timeline BẬT: trải đều trên các năm của timeline. Timeline tắt: trải trong năm hiện tại.
   */
  seekTotal(total: number, options?: SeekOptions) {
    if (!this.features) return;
    const t = Math.max(0, Math.min(1, total));
    const idxs = this.timeline ? this.timelineIdx : null;
    if (!idxs) return this.seekTo({ progress: t }, options);

    const n = idxs.length;
    const pos = Math.min(n - 1, Math.floor(t * n));
    this.seekTo({ frameIndex: idxs[pos], progress: t >= 1 ? 1 : t * n - pos }, options);
  }

  /** Tua tới cột index (dùng cho phím ←/→). */
  seek(index: number) {
    this.seekTo({ col: index });
  }

  /** Đang phát (Transport chạy)? */
  get playing(): boolean {
    return Tone.Transport.state === "started";
  }

  /** Thời gian (giây) để quét hết một năm ở tốc độ 1x, chưa tính chế độ cấp bách. */
  get sweepSeconds1x(): number {
    const cols = this.features?.columns.length ?? 0;
    return (cols * 60) / (this.baseBpm * 4); // mỗi cột = một nhịp "16n" = 1/4 beat
  }

  setSpeed(x: number) {
    this.speed = x;
    this.applyGlobalParams();
  }

  setScale(name: string) {
    if (isScaleName(name)) this.scaleName = name;
  }

  setVolume(v01: number) {
    this.build();
    this.master.volume.value = v01 <= 0 ? -Infinity : -40 + v01 * 40;
  }

  setUrgencyMode(on: boolean) {
    this.urgencyMode = on;
    this.applyGlobalParams();
  }

  /* ------------------------------------------------------------------ */
  /* Nghe thử                                                            */
  /* ------------------------------------------------------------------ */
  /**
   * Phát âm của một màu (bấm vào ảnh hoặc ô màu). PHẢI gọi từ click/phím.
   * @returns voice đã dùng (để UI cập nhật aria-live)
   */
  async playColor(color: ColorQuery, { dur = "8n" }: { dur?: Tone.Unit.Time } = {}): Promise<Voice> {
    await Tone.start();
    this.build();

    const v = colorToVoice(color, this.scaleName);

    // Đảm bảo thời điểm kích hoạt luôn tăng dần tuyệt đối, tránh lỗi Tone.now() trùng khung audio
    const now = Math.max(Tone.now(), this.lastProbeTime + 0.015);
    this.lastProbeTime = now;

    // Trượt mượt tần số cắt & cộng hưởng filter theo sắc độ màu
    this.probeFilter.frequency.rampTo(v.cutoff, 0.025, now);
    this.probeFilter.Q.rampTo(v.q, 0.025, now);

    // Cập nhật cấu trúc họa âm (partials), điều chế FM & Envelope
    this.probe.set({
      harmonicity: v.harmonicity,
      modulationIndex: v.modIndex,
      oscillator: customOsc(v.partials),
      envelope: { attack: v.attack, decay: v.decay, sustain: v.sustain, release: v.release },
    });

    const freq = Tone.Frequency(v.midi, "midi").toFrequency();
    this.probe.triggerAttackRelease(freq, dur, now, v.tonalGain);

    // Điểm ảnh bão hòa thấp (mây, tuyết, khói bụi): pha thêm tiếng gió/khí quyển
    if (v.noiseGain > 0.015) {
      this.probeNoiseFilter.frequency.rampTo(v.noiseCutoff, 0.03, now);
      this.probeNoise.triggerAttackRelease(dur, now, Math.min(1, v.noiseGain * 3));
    }

    return v;
  }

  /** Phát âm của ô (col,row) trong features: dùng cho bấm chuột lẫn phím mũi tên. null nếu ô không tồn tại. */
  async playCell(col: number, row: number): Promise<Voice | null> {
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

  /* ------------------------------------------------------------------ */
  /* Nội bộ                                                              */
  /* ------------------------------------------------------------------ */
  get urgency(): number {
    if (!this.urgencyMode || !this.features) return 0;
    // ưu tiên stats.urgency (tính từ deltaFromPrev), dữ liệu cũ rơi về warmRatio
    return Math.min(1, this.features.stats?.urgency ?? this.features.stats?.warmRatio ?? 0);
  }

  private applyGlobalParams() {
    const u = this.urgency;
    Tone.Transport.bpm.value = this.baseBpm * this.speed * (1 + 0.5 * u);
    if (this.built && u > 0) {
      this.filter.frequency.rampTo(1500 + 3200 * u, 0.05);
    }
  }

  private emit(i: number, progress: number, info?: PlayheadInfo) {
    for (const cb of this.listeners) cb(i, progress, info);
  }

  private emitFrame(frameIndex: number, year: number | null, change: FrameChange | null) {
    for (const cb of this.frameListeners) cb(frameIndex, year, change);
  }

  /** Thông tin vị trí cho UI: năm đang phát và tiến độ cả bài. */
  private info(idx: number, last: number): PlayheadInfo {
    const idxs = this.timeline ? this.timelineIdx : null;
    const n = idxs ? idxs.length : 1;
    const pos = idxs ? Math.max(0, idxs.indexOf(this.frameIndex)) : 0;
    const within = last > 0 ? idx / last : 0;
    return {
      frameIndex: this.frameIndex,
      year: this.features?.year ?? null,
      timeline: this.timeline,
      yearPos: pos,
      yearCount: n,
      total: (pos + within) / n,
      change: this.features?.stats?.change ?? null,
    };
  }

  /** Sang năm kế tiếp trong timeline. Trả false nếu đã hết danh sách. */
  private advanceFrame(): boolean {
    const idxs = this.timelineIdx;
    if (!idxs) return false;
    const next = idxs[idxs.indexOf(this.frameIndex) + 1];
    if (next === undefined) return false;
    this.loadFrame(next);
    this.col = 0;
    this.applyGlobalParams(); // tempo và độ gắt đổi theo mức cấp bách của năm mới
    return true;
  }

  /**
   * Tiếng "chuông" ngắn báo sang năm mới. Cao độ tăng dần theo thứ tự năm (khoảng một quãng tám)
   * để người nghe (kể cả không nhìn màn hình) cảm nhận được thời gian trôi.
   */
  private frameMarker(time: number, pos: number, n: number) {
    const midi = quantize(LOW_MIDI + (pos / Math.max(1, n - 1)) * 12, "pentatonic");
    this.probe.set({
      harmonicity: 1,
      modulationIndex: 0.3,
      oscillator: customOsc([1, 0.2, 0, 0, 0, 0, 0, 0]),
      envelope: { attack: 0.01, decay: 0.35, sustain: 0, release: 0.6 },
    });
    this.probe.triggerAttackRelease(Tone.Frequency(midi, "midi").toFrequency(), "8n", time, 0.45);
  }

  /** Phát một cột: dùng chung cho quét tự động (step) và nghe thử khi tua (auditionColumn). */
  private playColumn(column: FeatureColumn, time: number, u: number) {
    const scale = u > 0.6 ? "tension" : this.scaleName;

    // 1. Màu chủ đạo của cột (hoặc nốt sáng nhất) để biến đổi âm sắc khi quét
    const notes = featuresToNotes(column, { scale, urgency: u });
    const dominantHue = notes[0]?.hue ?? column.hue ?? 180;
    const colVoice = colorToVoice(
      { hue: dominantHue, sat: column.sat ?? 0.6, light: column.light ?? 0.6, rowFrac: 0.5 },
      scale,
    );

    const scanCutoff = Math.min(6500, colVoice.cutoff + u * 1500);
    this.filter.frequency.rampTo(scanCutoff, 0.03, time);
    this.filter.Q.rampTo(colVoice.q, 0.03, time);

    this.synth.set({
      harmonicity: colVoice.harmonicity,
      modulationIndex: colVoice.modIndex + u * 1.5,
      oscillator: customOsc(colVoice.partials),
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

    // 2. Lớp nhiễu: ưu tiên chi tiết biên (edge) hoặc hơi thở khí quyển khi màu nhạt (mây/tuyết)
    const edgeLevel = column.edge ?? 0;
    if (edgeLevel > 0.5) {
      this.noiseFilter.frequency.rampTo(3800, 0.02, time);
      this.noise.triggerAttackRelease("32n", time, Math.min(1, edgeLevel));
    } else if (colVoice.noiseGain > 0.03) {
      this.noiseFilter.frequency.rampTo(colVoice.noiseCutoff, 0.04, time);
      this.noise.triggerAttackRelease("16n", time, Math.min(0.6, colVoice.noiseGain * 2));
    }
  }

  /** Nghe thử cột hiện tại đúng một lần (khi tua lúc đang dừng/tạm dừng). Giới hạn tần suất để kéo thanh trượt không bị rè. */
  private lastAuditionAt = 0;
  private async auditionColumn() {
    const column = this.features?.columns[this.col];
    if (!column) return;
    const nowMs = performance.now();
    if (nowMs - this.lastAuditionAt < 60) return;
    this.lastAuditionAt = nowMs;
    await Tone.start();
    this.build();
    this.playColumn(column, Tone.now() + 0.01, 0);
  }

  private step(time: number) {
    // Đã phát xong cột cuối thì bỏ qua các lần lặp còn lại của scheduleRepeat (trước khi stop() chạy)
    if (this.ending) return;
    const features = this.features;
    if (!features) return;

    const cols = features.columns;
    const last = cols.length - 1;
    const column = cols[this.col];
    const u = this.urgency;

    // Đầu mỗi năm báo UI (aria-live); đang timeline thì rung chuông báo năm mới
    if (this.col === 0) {
      const fi = this.frameIndex;
      const yr = features.year ?? null;
      const ch = features.stats?.change ?? null;
      Tone.Draw.schedule(() => this.emitFrame(fi, yr, ch), time);
      if (this.timeline && this.timelineIdx) {
        const pos = this.timelineIdx.indexOf(fi);
        if (pos > 0) this.frameMarker(time, pos, this.timelineIdx.length);
      }
    }

    this.playColumn(column, time, u);

    const idx = this.col;

    // Chốt info NGAY (vì có thể sang năm khác ngay sau đây) rồi báo playhead kèm info
    const info = this.info(idx, last);
    Tone.Draw.schedule(() => this.emit(idx, last > 0 ? idx / last : 0, info), time);

    if (this.col >= last) {
      // timeline còn năm kế thì nối tiếp ngay, không dừng; hết thì đặt cờ kết thúc
      if (this.timeline && this.advanceFrame()) return;
      this.ending = true;
      Tone.Draw.schedule(() => {
        if (this.ending) this.stop(); // seek/play lại trong 0.5s đó đã xoá cờ → không dừng nhầm
      }, time + 0.5);
      return;
    }
    this.col += 1;
  }

  /** Giải phóng tài nguyên Web Audio (gọi khi thật sự huỷ engine, không cần mỗi lần unmount trang). */
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
