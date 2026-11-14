import * as Tone from "tone";
import { SCALES, LOW_MIDI, quantize } from "./Scales.js";
import { colorToVoice } from "./Palette.js";
import { featuresToNotes } from "./notes.js";
import { normalizeFrame } from "./Data.js";

// Giữ nguyên API cũ: nơi khác vẫn import mọi thứ từ "./audio.js"
export { SCALES, quantize, hueToWarmth } from "./Scales.js";
export { colorToVoice } from "./Palette.js";
export { featuresToNotes } from "./notes.js";
export { normalizeFrame } from "./Data.js";

/* ------------------------------------------------------------------ */
/* 3. AUDIO ENGINE                                                     */
/* ------------------------------------------------------------------ */
export class AudioEngine {
  constructor({ baseBpm = 90 } = {}) {
    this.baseBpm = baseBpm;
    this.features = null;

  // ════════════════════════════════════════════════════════════════
  // SỬA ĐỔI #1: TRẠNG THÁI MỚI TRONG constructor (dữ liệu nhiều năm, timeline, nhấn mạnh thay đổi)
  // ════════════════════════════════════════════════════════════════
    this.data = null; // dữ liệu thô nhiều năm (null nếu nạp dạng cũ)
    this.frameIndex = 0; // frame (năm) đang chọn
    this._maxDelta = 0; // deltaFromPrev dương lớn nhất, để chuẩn hóa mức cấp bách
    this.hueOf = null; // hàm (light 0..1) -> hue 0..360, null = hue cố định
    this.timeline = false; // true = phát nối tiếp các năm, không cần chọn từng năm
    this._timelineIdx = null; // danh sách chỉ số frame sẽ phát theo thứ tự
    this._ending = false; // đã phát cột cuối, đang chờ stop() (chặn lặp lại cột cuối)
    this.frameListeners = new Set(); // callback onFrame
    this.changeEmphasis = false; // true = làm nổi ô đổi so với năm gốc
  // ─────────────── HẾT SỬA ĐỔI #1 ───────────────

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

  // ════════════════════════════════════════════════════════════════
  // SỬA ĐỔI #2: NẠP ĐỊNH DẠNG MỚI night_lights.json (frames / audioColumns / value / cover)
  // ════════════════════════════════════════════════════════════════
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
      base: this.changeEmphasis ? this._baseFrame() : null, // SỬA ĐỔI #3: so với năm gốc nếu bật
    });
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

  // ─────────────── HẾT SỬA ĐỔI #2 ───────────────


  // ════════════════════════════════════════════════════════════════
  // SỬA ĐỔI #3: NHẤN MẠNH THAY ĐỔI GIỮA CÁC NĂM (mới) — vì 12 năm nghe gần như y hệt nhau
  // ════════════════════════════════════════════════════════════════
  /**
   * Bật/tắt chế độ NHẤN MẠNH THAY ĐỔI: so mỗi năm với năm gốc (năm đầu của timeline, hoặc frame 0),
   * ô sáng thêm nghe như chuông vàng rực, ô tối đi nghe như tiếng lam trầm, phần không đổi làm nền êm.
   * Dừng phát và nạp lại frame hiện tại.
   */
  setChangeEmphasis(on) {
    this.changeEmphasis = !!on;
    if (this.data) this.setFrame(this.frameIndex);
  }

  /** Frame gốc dùng để so sánh thay đổi. */
  _baseFrame() {
    return this.data.frames[this._timelineIdx?.[0] ?? 0];
  }

  // ─────────────── HẾT SỬA ĐỔI #3 ───────────────


  // ════════════════════════════════════════════════════════════════
  // SỬA ĐỔI #4: PHÁT XUYÊN SUỐT NHIỀU NĂM (timeline) thay vì chọn từng năm
  // ════════════════════════════════════════════════════════════════
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

  /**
   * cb(frameIndex, year, change): gọi mỗi khi BẮT ĐẦU một năm (kể cả năm đầu). Dùng cho aria-live.
   * change = { up, down, since } (số ô sáng thêm / tối đi so với năm `since`), hoặc null nếu chưa bật
   * setChangeEmphasis.
   */
  onFrame(cb) {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  // ─────────────── HẾT SỬA ĐỔI #4 ───────────────

  async play() {
    if (!this.features) return;
    await Tone.start();
    this._build();
    this._ending = false; // <<< SỬA ĐỔI #5: bắt đầu lại thì xóa cờ "đang kết thúc"
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

    // >>> SỬA ĐỔI #5 (stop): xóa cờ kết thúc; timeline thì Stop/hết bài = quay về năm đầu
    this._ending = false;
    if (this.timeline && this.data && this._timelineIdx?.length && this.frameIndex !== this._timelineIdx[0]) {
      this._loadFrame(this._timelineIdx[0]);
    }
    // <<< HẾT SỬA ĐỔI #5 (stop)

    this.col = 0;
    this._emit(0, 0, this.features ? this._info(0, this.features.columns.length - 1) : undefined); // <<< SỬA ĐỔI #5: kèm info
  }

  /** Tua tới cột index (dùng cho phím ←/→). */
  seek(index) {
    if (!this.features) return;
    const max = this.features.columns.length - 1;
    this.col = Math.max(0, Math.min(max, index));
    this._emit(this.col, max > 0 ? this.col / max : 0, this._info(this.col, max)); // <<< SỬA ĐỔI #5: kèm info
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
   * SỬA ĐỔI #5: thêm đối số thứ 3 `info` (callback cũ chỉ nhận 2 đối số vẫn chạy bình thường).
   * progress: tiến độ TRONG năm hiện tại. info (có thể undefined khi chưa có dữ liệu):
   *   { frameIndex, year, timeline, yearPos, yearCount, total, change } với total = tiến độ cả bài 0..1.
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
    // <<< SỬA ĐỔI #6: ưu tiên stats.urgency (tính từ deltaFromPrev), dữ liệu cũ rơi về warmRatio
    return Math.min(1, this.features.stats?.urgency ?? this.features.stats?.warmRatio ?? 0);
  }

  _applyGlobalParams() {
    const u = this.urgency;
    Tone.Transport.bpm.value = this.baseBpm * this.speed * (1 + 0.5 * u);
    if (this.built && u > 0) {
      this.filter.frequency.rampTo(1500 + 3200 * u, 0.05);
    }
  }


  // ════════════════════════════════════════════════════════════════
  // SỬA ĐỔI #7: CÁC HÀM PHỤ MỚI: báo UI (_emit, _emitFrame, _info), sang năm kế (_advanceFrame), chuông báo năm
  // ════════════════════════════════════════════════════════════════
  _emit(i, progress, info) {
    for (const cb of this.listeners) cb(i, progress, info);
  }

  _emitFrame(frameIndex, year, change) {
    for (const cb of this.frameListeners) cb(frameIndex, year, change);
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
      change: this.features?.stats?.change ?? null,
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
  // ─────────────── HẾT SỬA ĐỔI #7 ───────────────

  _step(time) {

    // >>> SỬA ĐỔI #8a (SỬA LỖI): đã phát xong cột cuối thì bỏ qua các lần lặp còn lại của
    //     scheduleRepeat (trước khi stop() chạy), tránh phát lại cột cuối nhiều lần
    if (this._ending) return;
    // <<< HẾT SỬA ĐỔI #8a

    const cols = this.features.columns;
    const last = cols.length - 1;
    const column = cols[this.col];
    const u = this.urgency;


    // >>> SỬA ĐỔI #8b: đầu mỗi năm báo UI (aria-live); đang timeline thì rung chuông báo năm mới
    if (this.col === 0) {
      const fi = this.frameIndex;
      const yr = this.features.year ?? null;
      const ch = this.features.stats?.change ?? null;
      Tone.Draw.schedule(() => this._emitFrame(fi, yr, ch), time);
      if (this.timeline) {
        const pos = this._timelineIdx.indexOf(fi);
        if (pos > 0) this._frameMarker(time, pos, this._timelineIdx.length);
      }
    }
    // <<< HẾT SỬA ĐỔI #8b

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

    // >>> SỬA ĐỔI #8c: chốt info NGAY (vì có thể sang năm khác ngay sau đây) rồi báo playhead kèm info
    const info = this._info(idx, last);
    Tone.Draw.schedule(() => this._emit(idx, last > 0 ? idx / last : 0, info), time);
    // <<< HẾT SỬA ĐỔI #8c

    if (this.col >= last) {
      // >>> SỬA ĐỔI #8d: timeline còn năm kế thì nối tiếp ngay, không dừng; hết thì đặt cờ kết thúc
      if (this.timeline && this._advanceFrame()) return;
      this._ending = true;
      // <<< HẾT SỬA ĐỔI #8d
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