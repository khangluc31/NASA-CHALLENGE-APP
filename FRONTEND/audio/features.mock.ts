// Dữ liệu giả giống ảnh night lights (nền tối + vài cụm sáng), để test engine không cần chờ Người 3.
import type { Cell, FeatureColumn, Features, RawData, RawAudioColumn, RawFrame, RawRow } from "./types";

/** Dạng cũ (Features): có sẵn hue riêng từng ô. */
export function makeMockFeatures(cols = 96, rows = 16): Features {
  // [cột tâm, hàng tâm, độ rộng, độ sáng, hue]
  const cities: [number, number, number, number, number][] = [
    [14, 6, 4, 0.9, 45], // vàng/cam
    [30, 5, 5, 0.7, 40],
    [55, 8, 6, 1.0, 50],
    [72, 7, 3, 0.8, 280], // tím = tăng sáng (ảnh "change")
    [85, 4, 4, 0.6, 30],
  ];

  const columns: FeatureColumn[] = [];
  for (let c = 0; c < cols; c++) {
    const rowData: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      let light = 0.02;
      let hue = 220;
      for (const [cc, cr, w, b, h] of cities) {
        const d = Math.hypot((c - cc) / w, (r - cr) / (w * 0.6));
        const v = b * Math.exp(-d * d);
        if (v > light) {
          light = v;
          hue = h;
        }
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

/** Dạng MỚI (night_lights.json): nhiều năm, frames[].audioColumns[].rows[].{value, cover}. Đèn sáng dần theo năm. */
export function makeMockNightLights(cols = 96, rows = 16, years: number[] = [2012, 2018, 2023]): RawData {
  const cities: [number, number, number, number][] = [
    [14, 6, 4, 0.9],
    [30, 5, 5, 0.7],
    [55, 8, 6, 1.0],
    [72, 7, 3, 0.8],
    [85, 4, 4, 0.6],
  ];
  const frames: RawFrame[] = [];
  let prevMean = 0;

  years.forEach((year, yi) => {
    const growth = 0.55 + 0.45 * (yi / Math.max(1, years.length - 1)); // sáng dần
    const all: number[] = [];
    const audioColumns: RawAudioColumn[] = [];
    for (let c = 0; c < cols; c++) {
      const rws: RawRow[] = [];
      for (let r = 0; r < rows; r++) {
        let v = 0;
        for (const [cc, cr, w, b] of cities) {
          const d = Math.hypot((c - cc) / w, (r - cr) / (w * 0.6));
          v = Math.max(v, b * growth * Math.exp(-d * d));
        }
        v = v < 0.03 ? 0 : Math.min(1, v);
        all.push(v);
        rws.push({ value: +v.toFixed(4), cover: 1.0 });
      }
      audioColumns.push({ rows: rws });
    }
    const mean = all.reduce((s, x) => s + x, 0) / all.length;
    frames.push({
      year,
      stats: {
        mean,
        edge: 0.02,
        deltaFromPrev: yi === 0 ? 0 : Math.abs(mean - prevMean),
      },
      audioColumns,
    });
    prevMean = mean;
  });

  return { topic: "night_lights_mock", calibration: { bg: 0, ref: 56 }, frames };
}
