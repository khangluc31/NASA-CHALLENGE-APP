// data.js — normalizeFrame: định dạng night_lights.json của Người 3 -> dạng nội bộ

/* 2C. normalizeFrame: định dạng night_lights.json -> dạng nội bộ       */
// Định dạng của Người 3: { topic, calibration, frames:[{ year, stats, audioColumns:[{rows:[{value,cover}]}] }] }
// Dạng nội bộ mà featuresToNotes/_step đọc: { columns:[{hue,sat,light,edge,rows:[{hue,light}]}], stats }
//
// XÁC NHẬN TỪ FILE THẬT (night_lights.json, 12 năm 2012-2023):
//   - value = clip((v - bg) / (ref - bg), 0, 1), bg = 0, ref = 37 (ghi trong calibration.normalization)
//   - lưới audio 96 cột x 16 hàng; hàng 0 là phía Bắc (ô sáng nhiều nhất ở hàng 3-5)
//   - cover < 1 chỉ ở các dải bị mask (value ở đó ~ 0)
//   - stats.deltaFromPrev CÓ DẤU và rất nhỏ (cỡ 0.001): dùng max(0, ·) rồi chia cho giá trị lớn nhất
// GIẢ ĐỊNH CÒN LẠI:
//   - cover = tỉ lệ pixel hợp lệ trong ô; cover < MIN_COVER -> ô im lặng
//   - Dữ liệu KHÔNG có màu -> hue lấy từ hueOf(light) nếu có, không thì cố định DEFAULT_HUE.
//     (Nghĩa là với night_lights, 10 gam màu chỉ nghe được khi bạn cấp hueOf, xem setHueMapper)
//   - Không có edge theo cột -> ước lượng tạm từ độ nhấp nhô giữa các hàng liền kề
//   - Mức cấp bách = deltaFromPrev của frame, chia cho giá trị lớn nhất trong các frame
const DEFAULT_HUE = 45;
const MIN_COVER = 0.5;


// ════════════════════════════════════════════════════════════════
// SỬA ĐỔI #9 (data.js): HẰNG SỐ CHO CHẾ ĐỘ "NHẤN MẠNH THAY ĐỔI"
// ════════════════════════════════════════════════════════════════
// Vì sao cần: dữ liệu 12 năm rất giống nhau (2012 -> 2023 chỉ ~92/1536 ô sáng thêm đáng kể),
// nên phát lần lượt từng năm nghe gần như y hệt. Chế độ này làm nổi những ô ĐỔI so với năm gốc.
const CHANGE_THRESHOLD = 0.1; // |value hiện tại - value năm gốc| > 0.1 mới tính là "đổi"
const HUE_UP = 58; //   ô sáng thêm: vàng rực (solar-gold, tiếng chuông lấp lánh trong palette)
const HUE_DOWN = 230; // ô tối đi: lam đậm (deep-blue, sine trầm)
const HUE_SAME = 130; // ô không đổi: xanh lá (emerald, êm), làm nền
const SAME_GAIN = 0.6; // nền nhỏ đi còn 60% để ô thay đổi nổi lên
// ─────────────── HẾT SỬA ĐỔI #9 (hằng số) ───────────────


export function normalizeFrame(
  frame,
  {
    topic = "night_lights",
    maxDelta = 0,
    hue = DEFAULT_HUE,
    minCover = MIN_COVER,
    hueOf = null,
    base = null, // SỬA ĐỔI #9: frame gốc để so sánh (null = không nhấn mạnh thay đổi)
    changeThreshold = CHANGE_THRESHOLD,
  } = {}
) {
  let up = 0; //   SỬA ĐỔI #9: đếm số ô sáng thêm / tối đi so với frame gốc
  let down = 0;

  const columns = frame.audioColumns.map((col, ci) => {
    const rows = col.rows.map((r, ri) => {
      const light = (r.cover ?? 1) >= minCover ? Math.max(0, Math.min(1, r.value)) : 0;


      // ════════════════════════════════════════════════════════════════
      // SỬA ĐỔI #9 (data.js): NHẤN MẠNH Ô THAY ĐỔI SO VỚI NĂM GỐC
      // ════════════════════════════════════════════════════════════════
      if (base) {
        const before = base.audioColumns[ci]?.rows[ri]?.value ?? 0;
        const delta = light - before;
        // sáng thêm: to và vàng rực. 0.5 + delta để luôn nổi hơn ô nền (nền tối đa 0.6)
        if (delta > changeThreshold) {
          up++;
          return { hue: HUE_UP, light: Math.min(1, 0.5 + delta) };
        }
        // tối đi: ô này giờ mờ nên phải "bơm" độ to lên, nếu không sẽ im lặng đúng lúc cần nghe
        if (delta < -changeThreshold) {
          down++;
          return { hue: HUE_DOWN, light: Math.min(1, 0.5 - delta) };
        }
        // không đổi: nền êm, nhỏ hơn
        return { hue: hueOf ? hueOf(light) : HUE_SAME, light: light * SAME_GAIN };
      }
      // ─────────────── HẾT SỬA ĐỔI #9 (nhấn mạnh thay đổi) ───────────────


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
      // SỬA ĐỔI #09: số ô đổi so với năm gốc (null nếu không bật nhấn mạnh thay đổi)
      change: base ? { up, down, since: base.year ?? null } : null,
    },
  };
}