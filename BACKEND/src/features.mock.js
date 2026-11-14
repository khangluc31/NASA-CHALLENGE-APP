// features.mock.js — dữ liệu giả giống ảnh night lights (nền tối + vài cụm sáng)
// Dùng để test audio.js ngay, không cần chờ Người 3 phân tích ảnh.

export function makeMockFeatures(cols = 96, rows = 16) {
  // vài "thành phố": [cột tâm, hàng tâm, độ rộng, độ sáng, hue]
  const cities = [
    [14, 6, 4, 0.9, 45],   // vàng/cam
    [30, 5, 5, 0.7, 40],
    [55, 8, 6, 1.0, 50],
    [72, 7, 3, 0.8, 280],  // tím = tăng sáng (ảnh "change")
    [85, 4, 4, 0.6, 30],
  ];

  const columns = [];
  for (let c = 0; c < cols; c++) {
    const rowData = [];
    for (let r = 0; r < rows; r++) {
      let light = 0.02;
      let hue = 220;
      for (const [cc, cr, w, b, h] of cities) {
        const d = Math.hypot((c - cc) / w, (r - cr) / (w * 0.6));
        const v = b * Math.exp(-d * d);
        if (v > light) { light = v; hue = h; }
      }
      rowData.push({ hue, light: Math.min(1, light) });
    }
    const mean = rowData.reduce((s, x) => s + x.light, 0) / rows;
    const peak = rowData.reduce((a, x) => (x.light > a.light ? x : a), rowData[0]);
    columns.push({
      hue: peak.hue,
      sat: 0.7,
      light: mean,
      edge: Math.min(1, mean * 2.5),
      rows: rowData,
    });
  }

  return {
    id: "night-lights-mock",
    title: "Night Lights (mock)",
    description: "Dữ liệu giả để kiểm thử.",
    imageUrl: "",
    columns,
    stats: { meanHue: 60, meanLight: 0.2, warmRatio: 0.6, edgeDensity: 0.3 },
  };
}