// Cắt night_lights.json (~20 MB) xuống bản gọn cho web (~0.6 MB): chỉ giữ phần engine audio dùng.
// Dùng:  node scripts/slim-night-lights.mjs <input.json> [output.json]
import { readFileSync, writeFileSync } from "node:fs";

const [input, output = "public/data/night_lights.json"] = process.argv.slice(2);
if (!input) {
  console.error("Thiếu đường dẫn file input.");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(input, "utf8"));
const slim = {
  topic: raw.topic,
  calibration: raw.calibration,
  frames: raw.frames.map(({ year, stats, audioColumns }) => ({ year, stats, audioColumns })),
};

const text = JSON.stringify(slim);
writeFileSync(output, text);
console.log(`${input} -> ${output}: ${(text.length / 1048576).toFixed(2)} MB, ${slim.frames.length} frames`);
