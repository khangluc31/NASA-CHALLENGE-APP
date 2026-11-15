// Đọc màu pixel tại chỗ bấm trên <img> rồi đổi sang ô lưới của features.
// Ảnh phải cùng domain (đặt trong /public) nếu không canvas sẽ bị CORS chặn.
import type { PickedColor, PickGrid } from "./types";

const cache = new WeakMap<HTMLImageElement, HTMLCanvasElement>(); // img -> canvas (không vẽ lại mỗi lần bấm)

function getCanvas(img: HTMLImageElement): CanvasRenderingContext2D {
  let c = cache.get(img);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.naturalWidth; // kích thước gốc thực tế của file ảnh
    c.height = img.naturalHeight;
    c.getContext("2d", { willReadFrequently: true })?.drawImage(img, 0, 0);
    cache.set(img, c);
  }
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Không tạo được canvas 2D để đọc màu ảnh");
  return ctx;
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { hue: h, sat: mx > 1e-6 ? d / mx : 0, light: mx };
}

/**
 * @param grid  { cols, rows, crop:[x0,y0,x1,y1] } PHẢI trùng CROP lúc tạo features.
 * Lưu ý: giả định ảnh hiển thị đủ khung, không bị object-fit: cover cắt mất.
 */
export function pickFromImage(img: HTMLImageElement, event: MouseEvent, grid: PickGrid): PickedColor {
  const rect = img.getBoundingClientRect();
  const fx = (event.clientX - rect.left) / rect.width; // 0..1 trên ảnh hiển thị
  const fy = (event.clientY - rect.top) / rect.height;
  const px = Math.min(img.naturalWidth - 1, Math.max(0, Math.floor(fx * img.naturalWidth)));
  const py = Math.min(img.naturalHeight - 1, Math.max(0, Math.floor(fy * img.naturalHeight)));

  // Trung bình vùng 5x5 quanh điểm bấm: pixel đơn lẻ dễ trúng nhiễu
  const R = 2;
  const x0 = Math.max(0, px - R);
  const y0 = Math.max(0, py - R);
  const w = Math.min(img.naturalWidth - x0, 2 * R + 1);
  const h = Math.min(img.naturalHeight - y0, 2 * R + 1);
  const data = getCanvas(img).getImageData(x0, y0, w, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const color = rgbToHsv(r / n, g / n, b / n);

  const [cx0, cy0, cx1, cy1] = grid.crop;
  const inGrid = px >= cx0 && px < cx1 && py >= cy0 && py < cy1;
  const col = Math.min(grid.cols - 1, Math.max(0, Math.floor(((px - cx0) / (cx1 - cx0)) * grid.cols)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor(((py - cy0) / (cy1 - cy0)) * grid.rows)));
  const rowFrac = 1 - row / Math.max(1, grid.rows - 1);

  return { ...color, rowFrac, col, row, inGrid };
}
