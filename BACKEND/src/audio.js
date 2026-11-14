import * as Tone from "tone";

/* 1. THANG ÂM (semitone offsets so với root)                          */
export const SCALES = { // distant array ( unit: semitone) compare with origin note
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  tension: [0, 2, 3, 5, 7, 8, 11], 
};

const LOW_MIDI = 48; // C3
const HIGH_MIDI = 84; // C6

export function quantize(midi, scaleName = "pentatonic", root = LOW_MIDI) {
  //tra thang theo tên; nếu tên sai (undefined) thì rơi về pentatonic nhờ toán tử ??
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
// JS:    đổi chỉ số hàng ảnh (0 = trên cùng) thành MIDI (có thể lẻ, chưa quantize).
function rowToMidi(rowIdx, rowCount) {
  // JS:    chuẩn hóa hàng về [0..1] rồi ĐẢO (1 - ...) vì ảnh tính y từ trên xuống,
  //        còn nhạc thì cao = lên trên. Math.max(1, ...) chống chia cho 0 khi chỉ có 1 hàng.
  const t = 1 - rowIdx / Math.max(1, rowCount - 1);
  // VÌ SAO: nội suy TUYẾN TÍNH theo MIDI (nửa cung) = nội suy theo hàm mũ theo Hz. Tai người
  //        cảm nhận cao độ theo log(tần số), nên bước đều trên MIDI nghe là các bước đều nhau.
  return LOW_MIDI + t * (HIGH_MIDI - LOW_MIDI);
}

/** hue (0-360) -> độ "ấm" 0..1. Cam/đỏ/vàng = ấm, lam/tím = lạnh. */
// JS:    đổi góc màu trên vòng tròn màu (HSL/HSV) thành 3 mức rời rạc: 1, 0.5, 0.
export function hueToWarmth(hue) {
  // JS:    chuẩn hóa về [0, 360): cộng 360 trước để xử lý hue âm (vd -30 -> 330).
  const h = ((hue % 360) + 360) % 360;
  // VÌ SAO: đỏ ≈ 0, cam ≈ 30, vàng ≈ 60 và màu hồng/đỏ tím ≥ 330 đều được coi là ấm (đầu và cuối vòng tròn).
  if (h <= 70 || h >= 330) return 1; // đỏ, cam, vàng
  // VÌ SAO: lục lam (~180) -> lam (~240) -> tím (~280) là nhóm lạnh.
  if (h >= 180 && h <= 300) return 0; // lục lam -> lam -> tím
  // JS:    còn lại: 70..180 (vàng chanh, xanh lá) và 300..330 (tím hồng) -> mức trung gian.
  return 0.5; // vùng chuyển tiếp
}

/* 2. featuresToNotes: 1 cột ảnh -> tối đa N nốt                       */
/**
 * @param column  { hue, sat, light, edge, rows:[{hue,light}] }  (light 0..1)
 * @param opts    { scale, maxNotes, threshold, urgency }
 * @returns       [{ midi, velocity, warmth }]  — rỗng nếu cột tối (im lặng)
 */
export function featuresToNotes(column, opts = {}) {
  // destructuring kèm giá trị mặc định: lấy từ opts nếu có, không thì dùng mặc định.
  // maxNotes = 3 để một cột không thành "cụm nốt" dày đặc; threshold = 0.12 để loại nền.
  const { scale = "pentatonic", maxNotes = 3, threshold = 0.12, urgency = 0 } = opts;
  // ?? [] : nếu cột không có rows thì coi là mảng rỗng, tránh crash.
  const rows = column.rows ?? [];
  const n = rows.length;

  const picked = rows
    .map((r, i) => ({ i, light: r.light, hue: r.hue }))
    .filter((r) => r.light > threshold)
    .sort((a, b) => b.light - a.light)
    .slice(0, maxNotes);

  // JS:    Set để loại trùng nốt (hai hàng khác nhau có thể bị quantize về cùng 1 MIDI).
  const seen = new Set();
  const notes = [];
  for (const r of picked) {
    // JS:    hàng -> MIDI lẻ -> ép vào thang.
    const midi = quantize(rowToMidi(r.i, n), scale);
    // VÌ SAO: hai nốt cùng cao độ chỉ cộng thêm âm lượng mà không thêm thông tin, nên bỏ.
    if (seen.has(midi)) continue; // tránh nốt trùng
    seen.add(midi);
    notes.push({
      midi,
      // ÂM:    velocity 0..1 nhân với biên độ (amplitude) của nốt. Công thức 0.2 + 0.8 * light:
      //        sàn 0.2 để ô vừa vượt ngưỡng vẫn nghe được; trần 1 nhờ Math.min.
      // VÌ SAO: tuyến tính theo biên độ cho đơn giản. (Tai người cảm nhận độ to theo dB/log, nên
      //        nếu muốn đều tai hơn có thể đổi sang đường cong lũy thừa.)
      velocity: Math.min(1, 0.2 + r.light * 0.8),
      // JS:    warmth được tính và trả về nhưng _step() hiện KHÔNG dùng [P4 #3].
      warmth: hueToWarmth(r.hue),
    });
  }

  // Chế độ cấp bách: thêm 1 nốt lệch nửa cung (dissonance) khi cột nhiều chi tiết
  // JS:    chỉ khi: cấp bách cao (> 0.5) VÀ đã có ít nhất 1 nốt VÀ cột nhiều chi tiết (edge > 0.4).
  //        Nếu column.edge là undefined thì (undefined > 0.4) là false, không crash.
  if (urgency > 0.5 && notes.length && column.edge > 0.4) {
    notes.push({
      // ÂM:    +1 nửa cung so với nốt sáng nhất = quãng 2 thứ, quãng nghịch tai nhất. Hai tần số
      //        gần nhau (vd 698 Hz và 740 Hz) tạo "phách" (beating) 42 lần/giây, nghe thô ráp, căng thẳng.
      // VÌ SAO: số này KHÔNG qua quantize, cố ý nằm ngoài thang để gây khó chịu có kiểm soát.
      midi: notes[0].midi + 1,
      // ÂM:    nhỏ (tối đa 0.25) để làm "gia vị", không lấn át giai điệu chính.
      velocity: 0.25 * urgency,
      warmth: 1,
    });
  }
  // JS:    cho phép tối đa maxNotes + 1 (nốt thứ 4 là nốt dissonance).
  return notes.slice(0, maxNotes + 1);
}

export function colorToVoice({ hue, sat = 0.7, light = 0.6, rowFrac = 0.5 }, scale = "pentatonic") {
  const warmth = hueToWarmth(hue);
  // JS:    cùng công thức với rowToMidi nhưng nhận rowFrac (0..1) có sẵn, sau đó quantize.
  const midi = quantize(LOW_MIDI + rowFrac * (HIGH_MIDI - LOW_MIDI), scale);
  // ÂM:    "dạng sóng" quyết định độ giàu họa âm (harmonics):
  //        sine = chỉ có tần số cơ bản (tinh khiết, mềm); triangle = họa âm lẻ yếu dần (êm, hơi rỗng);
  //        sawtooth = đủ mọi họa âm (sáng, rè, "gắt").
  const osc = warmth === 1 ? "sawtooth" : warmth === 0 ? "sine" : "triangle";
  // ÂM:    tần số cắt (cutoff, đơn vị Hz) của bộ lọc lowpass: loại bỏ họa âm cao hơn mức này.
  //        warmth 0 -> ~900..1800 Hz (tối, mờ); warmth 1 -> ~3500..4400 Hz (sáng, nhiều "răng cưa").
  const cutoff = 900 + 2600 * warmth + 900 * sat;
  // JS:    khác featuresToNotes: sàn thấp hơn (0.15), nên điểm tối cho tiếng rất nhỏ chứ không im hẳn.
  const velocity = Math.min(1, 0.15 + 0.85 * light);
  // JS:    trả về object mô tả, UI có thể dùng để đọc bằng aria-live.
  return { midi, osc, cutoff, velocity };
}

/* ------------------------------------------------------------------ */
/* 3. AUDIO ENGINE                                                     */
/* ------------------------------------------------------------------ */
// JS:    lớp (class) gom trạng thái + hành vi. Cuối file xuất ra MỘT instance duy nhất (singleton).
export class AudioEngine {
  // JS:    constructor nhận object tùy chọn, mặc định {} để gọi new AudioEngine() không lỗi.
  // ÂM:    BPM (beats per minute) = số phách mỗi phút. 90 BPM: 1 phách (nốt đen "4n") = 0.667 giây.
  //        Một bước quét là nốt "16n" = 1/4 phách = 0.1667 giây. 96 cột * 0.1667 ≈ 16 giây ở tốc độ 1x.
  constructor({ baseBpm = 90 } = {}) {
    this.baseBpm = baseBpm;
    // JS:    features đang nạp (null cho tới khi load()).
    this.features = null;
    // JS:    con trỏ cột: chỉ số cột SẼ được phát ở bước kế tiếp (0..95).
    this.col = 0;
    this.speed = 1;
    this.scaleName = "pentatonic";
    this.urgencyMode = false;
    // JS:    Set các callback đã đăng ký qua onPlayhead (Set tránh đăng ký trùng cùng một hàm).
    this.listeners = new Set();
    // JS:    id sự kiện lặp trong Transport; null = chưa lên lịch.
    this.eventId = null;
    // JS:    cờ: đã dựng đồ thị âm thanh chưa (dựng lười).
    this.built = false;
  }

  /** Dựng chuỗi âm thanh. Gọi lười (lazy) bên trong play() sau khi có click. */
  _build() {
    // idempotent: gọi bao nhiêu lần cũng chỉ dựng đúng một lần.
    if (this.built) return;

    this.master = new Tone.Volume(-6).toDestination();
    this.limiter = new Tone.Limiter(-3).connect(this.master);
    this.reverb = new Tone.Reverb({ decay: 3.5, wet: 0.25 }).connect(this.limiter);
    this.filter = new Tone.Filter(1800, "lowpass").connect(this.reverb);

    this.synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.3, release: 0.8 },
    }).connect(this.filter);
    this.synth.volume.value = -8;

    this.noiseFilter = new Tone.Filter(4000, "highpass").connect(this.reverb);

    this.noise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0 },
    }).connect(this.noiseFilter);
    this.noise.volume.value = -26;

    // synth riêng cho việc bấm vào ảnh, không chen vào các giọng của chế độ quét
    // ÂM:    filter riêng cho probe để mỗi lần bấm đổi cutoff theo màu mà không ảnh hưởng chế độ quét.
    this.probeFilter = new Tone.Filter(2000, "lowpass").connect(this.reverb);
    // ÂM:    Synth (đơn âm: một nốt một lúc), dùng khi người dùng bấm vào ảnh hoặc ô màu.
    this.probe = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.5 },
    }).connect(this.probeFilter);
    this.probe.volume.value = -6;

    // JS:    đánh dấu đã dựng xong. Lưu ý: không có hàm dispose() để tháo các node này [P4 #5].
    this.built = true;
  }

  /** Nạp features (hợp đồng 1). An toàn khi gọi trước khi có click. */
  // JS:    đồng bộ (không async), không đụng tới Tone.start().
  load(features) {
    // JS:    stop() trước để dọn lịch cũ + đưa col về 0 (gọi cả _emit(0,0) báo UI về đầu).
    this.stop();
    this.features = features;
    this.col = 0;
  }

  // JS:    async vì có await Tone.start(). Trả về Promise; UI có thể bỏ qua hoặc await.
  async play() {
    // JS:    chưa load features thì thoát im lặng (UI không nhận được phản hồi nào) [P4 #6].
    if (!this.features) return;
    // ÂM:    chính sách autoplay: AudioContext ở trạng thái "suspended" cho tới khi có cử chỉ người dùng.
    //        Tone.start() gọi context.resume(). Phải là lệnh await ĐẦU TIÊN trong handler click [P4 #7].
    await Tone.start(); // BẮT BUỘC: phải chạy trong handler của click/phím
    // JS:    dựng đồ thị âm thanh (lần đầu), rồi áp dụng bpm/filter hiện tại.
    this._build();
    this._applyGlobalParams();
    // JS:    chỉ lên lịch MỘT lần. Nhờ vậy gọi play() sau pause() không nhân đôi sự kiện.
    if (this.eventId === null) {
      // JS:    scheduleRepeat(callback, interval): gọi callback LẶP LẠI mỗi "16n" trên đồng hồ Transport.
      //        Callback nhận `time` = thời điểm CHÍNH XÁC (giây, theo đồng hồ âm thanh) mà sự kiện phải xảy ra.
      this.eventId = Tone.Transport.scheduleRepeat((time) => this._step(time), "16n");
    }
    // ÂM:    bắt đầu chạy đồng hồ Transport (từ vị trí hiện tại; sau pause thì tiếp tục từ chỗ dừng).
    Tone.Transport.start();
  }

  pause() {
    // ÂM:    dừng đồng hồ nhưng GIỮ vị trí. Các nốt đã phát đang ngân sẽ tắt tự nhiên theo release.
    Tone.Transport.pause();
  }

  stop() {
    // ÂM:    dừng đồng hồ và đưa vị trí Transport về 0.
    Tone.Transport.stop();
    // JS:    gỡ sự kiện lặp khỏi lịch, đặt lại null để play() sau này lên lịch lại.
    if (this.eventId !== null) {
      Tone.Transport.clear(this.eventId);
      this.eventId = null;
    }
    this.col = 0;
    // JS:    báo UI đưa vạch quét về đầu (cột 0, tiến độ 0).
    //        Lưu ý: các callback Draw đã lên lịch trước đó có thể bắn muộn sau dòng này [P4 #4].
    this._emit(0, 0);
  }

  /** Tua tới cột index (dùng cho phím ←/→). */
  seek(index) {
    if (!this.features) return;
    // JS:    max = chỉ số cột cuối (95 nếu có 96 cột).
    const max = this.features.columns.length - 1;
    // JS:    kẹp (clamp) index vào [0, max]: Math.min/Math.max lồng nhau.
    this.col = Math.max(0, Math.min(max, index));
    // JS:    nếu chỉ có 1 cột thì max = 0 -> this.col / 0 = NaN [P4 #6].
    this._emit(this.col, this.col / max);
  }

  setSpeed(x) {
    this.speed = x;
    // JS:    đổi tốc độ = đổi BPM của Transport, thực hiện trong _applyGlobalParams.
    this._applyGlobalParams();
  }

  setScale(name) {
    // JS:    kiểm tra tên hợp lệ trước khi gán: tên lạ thì bỏ qua, giữ thang cũ.
    if (SCALES[name]) this.scaleName = name;
  }

  setVolume(v01) {
    // JS:    cần master tồn tại, nên dựng đồ thị âm thanh nếu chưa dựng.
    this._build();
    // 0..1 -> -40dB..0dB, 0 = tắt hẳn
    // ÂM:    ánh xạ tuyến tính theo dB (không phải biên độ): 0.5 -> -20 dB. Cách này hợp với cảm nhận
    //        của tai hơn thanh trượt tuyến tính theo biên độ. -Infinity dB = im lặng hoàn toàn.
    this.master.volume.value = v01 <= 0 ? -Infinity : -40 + v01 * 40;
  }

  setUrgencyMode(on) {
    this.urgencyMode = on;
    this._applyGlobalParams();
  }

  /** cb(columnIndex, progress0to1). Trả về hàm hủy đăng ký. */
  onPlayhead(cb) {
    this.listeners.add(cb);
    // JS:    trả về arrow function đóng (closure) giữ cb. Trong React: useEffect(() => engine.onPlayhead(fn), []).
    //        Dùng đúng cách thì cleanup tự gỡ listener khi component unmount.
    return () => this.listeners.delete(cb);
  }

  /**
   * Phát âm của một màu (bấm vào ảnh hoặc ô màu). PHẢI gọi từ click/phím.
   * @returns voice đã dùng (để UI cập nhật aria-live), hoặc null nếu chưa có gì để phát
   */
  // JS:    tham số thứ hai có destructuring + mặc định: dur = "8n" (độ dài nốt: 1/8 phách...).
  // JS:    chú thích @returns nói có thể trả null, nhưng hàm này luôn trả voice; chỉ playCell mới trả null.
  async playColor(color, { dur = "8n" } = {}) {
    await Tone.start();
    this._build();
    // JS:    dùng thang âm hiện tại của engine để nốt khi bấm khớp với chế độ quét.
    const v = colorToVoice(color, this.scaleName);
    // ÂM:    đổi dạng sóng của probe theo màu. set() sửa tham số lúc đang chạy.
    //        Nếu nốt trước còn ngân, đổi dạng sóng ngay có thể nghe "tách" nhẹ [P4 #8].
    this.probe.set({ oscillator: { type: v.osc } });
    // ÂM:    rampTo(giá trị, 0.01): trượt cutoff sang giá trị mới trong 10 ms, tránh "pop" do nhảy đột ngột.
    this.probeFilter.frequency.rampTo(v.cutoff, 0.01);
    // ÂM:    Tone.Frequency(midi, "midi").toFrequency() = đổi số MIDI sang Hz.
    //        Tone.now() = thời điểm hiện tại của đồng hồ âm thanh (+ look-ahead). Hai lần gọi trong
    //        cùng một khung audio có thể trùng thời điểm và Tone sẽ ném lỗi [P4 #8].
    this.probe.triggerAttackRelease(
      Tone.Frequency(v.midi, "midi").toFrequency(), dur, Tone.now(), v.velocity
    );
    return v;
  }

  /** Phát âm của ô (col,row) trong features: dùng cho bấm chuột lẫn phím mũi tên. */
  async playCell(col, row) {
    // JS:    chưa có features thì trả null; UI phải kiểm tra null trước khi đọc v.osc [P4 #6].
    if (!this.features) return null;
    const column = this.features.columns[col];
    // JS:    optional chaining ?.: nếu column là undefined (col ngoài phạm vi) thì cell = undefined, không crash.
    const cell = column?.rows[row];
    if (!cell) return null;
    const rows = column.rows.length;
    // JS:    chuyển (col,row) thành mô tả màu để tái dùng playColor.
    //        rowFrac = 1 - row/(rows-1): đảo chiều giống rowToMidi (hàng 0 = cao nhất).
    return this.playColor({
      hue: cell.hue,
      sat: column.sat,
      light: cell.light,
      rowFrac: 1 - row / Math.max(1, rows - 1),
    });
  }

  get urgency() {
    if (!this.urgencyMode || !this.features) return 0;
    return Math.min(1, this.features.stats?.warmRatio ?? 0);
  }

  _applyGlobalParams() {
    const u = this.urgency;
    Tone.Transport.bpm.value = this.baseBpm * this.speed * (1 + 0.5 * u);
    if (this.built) {
      this.filter.frequency.value = 1200 + 3500 * u; // gắt hơn khi cấp bách
      this.synth.set({ oscillator: { type: u > 0.6 ? "sawtooth" : "triangle" } });
    }
  }

  _emit(i, progress) {
    // gọi lần lượt mọi callback UI. Nếu một callback ném lỗi, các callback sau sẽ không chạy.
    for (const cb of this.listeners) cb(i, progress);
  }

  _step(time) {
    const cols = this.features.columns;
    const last = cols.length - 1;
    const column = cols[this.col];
    const u = this.urgency;
    const scale = u > 0.6 ? "tension" : this.scaleName;
    const notes = featuresToNotes(column, { scale, urgency: u });

    for (const n of notes) {
      const freq = Tone.Frequency(n.midi, "midi").toFrequency();
      this.synth.triggerAttackRelease(freq, "8n", time, n.velocity);
    }

    if ((column.edge ?? 0) > 0.5) {
      this.noise.triggerAttackRelease("32n", time, Math.min(1, column.edge));
    }

    const idx = this.col;

    Tone.Draw.schedule(() => this._emit(idx, idx / last), time);

    if (this.col >= last) {
      Tone.Draw.schedule(() => this.stop(), time + 0.5);
      return;
    }
    this.col += 1;
  }
}

export const engine = new AudioEngine();