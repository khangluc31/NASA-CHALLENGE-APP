import type { Features } from "../../../../audio";
import { LIT_THRESHOLD } from "./validate";

export const CELL_W = 8;
export const CELL_H = 20;

export interface Cursor {
  col: number;
  row: number;
}

/**
 * Vẽ lưới features. Dữ liệu night_lights không có màu (hue cố định 45 = luôn vàng),
 * nên chỉ vẽ màu thật khi `useHue` = true; còn lại vẽ thang xám theo độ sáng.
 */
export function drawGrid(
  canvas: HTMLCanvasElement,
  features: Features,
  playCol: number,
  cursor: Cursor,
  useHue: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Gán width/height sẽ xoá canvas, nên chỉ gán khi kích thước thật sự đổi.
  const w = features.columns.length * CELL_W;
  const h = features.columns[0].rows.length * CELL_H;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  features.columns.forEach((c, i) =>
    c.rows.forEach((r, j) => {
      if (r.light > LIT_THRESHOLD)
        ctx.fillStyle = useHue ? `hsl(${r.hue} 85% ${20 + r.light * 55}%)` : `hsl(0 0% ${25 + r.light * 70}%)`;
      else ctx.fillStyle = "#14141c";
      ctx.fillRect(i * CELL_W, j * CELL_H, CELL_W - 1, CELL_H - 1);
    }),
  );

  if (playCol >= 0) {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillRect(playCol * CELL_W, 0, 2, h);
  }

  ctx.strokeStyle = "#ffd54a";
  ctx.lineWidth = 2;
  ctx.strokeRect(cursor.col * CELL_W + 1, cursor.row * CELL_H + 1, CELL_W - 3, CELL_H - 3);
}
