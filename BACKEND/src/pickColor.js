// pickColor.js — đọc màu pixel tại chỗ bấm trên <img> rồi đổi sang ô lưới của features.
// Ảnh phải cùng domain (đặt trong /public) nếu không canvas sẽ bị CORS chặn.

const cache = new WeakMap(); // img -> canvas (không vẽ lại mỗi lần bấm)

function getCanvas(img) {
  let c = cache.get(img);//check xem đã có canvas cho img chưa, nếu chưa thì tạo mới và vẽ img lên canvas
  if (!c) {
    c = document.createElement("canvas"); // create canvas
    c.width = img.naturalWidth; // kích thước gốc thực tế của file ảnh
    c.height = img.naturalHeight;
    c.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0);
    cache.set(img, c); // lưu vào weakmap
  }
  return c;
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
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
 * @param img    phần tử <img> đang hiển thị
 * @param event  sự kiện click (hoặc pointerdown)
 * @param grid   { cols:96, rows:16, crop:[x0,y0,x1,y1] }  PHẢI trùng CROP lúc tạo features
 * @returns      { hue, sat, light, rowFrac, col, row, inGrid }
 
 * Lưu ý: giả định ảnh hiển thị đủ khung, không bị object-fit: cover cắt mất.
 */
export function pickFromImage(img, event, grid) {
  const rect = img.getBoundingClientRect(); // lấy left,top w,h của img
  const fx = (event.clientX - rect.left) / rect.width;    // 0..1 trên ảnh hiển thị
  const fy = (event.clientY - rect.top) / rect.height;    // chia rect.height để ra tỷ lệ tương đối của ảnh
              // tọa độ mouse (mouse Event)
  const px = Math.min(img.naturalWidth - 1, Math.max(0, Math.floor(fx * img.naturalWidth)));
  const py = Math.min(img.naturalHeight - 1, Math.max(0, Math.floor(fy * img.naturalHeight)));

  // Lấy trung bình vùng 5x5 quanh điểm bấm: pixel đơn lẻ dễ trúng nhiễu
  const R = 2; // radius = 2px, mở rộng 2px trên dưới trái phải + 1 px ở giữa => 5px
  const x0 = Math.max(0, px - R), y0 = Math.max(0, py - R);
  const w = Math.min(img.naturalWidth - x0, 2 * R + 1);
  const h = Math.min(img.naturalHeight - y0, 2 * R + 1);
  const data = getCanvas(img).getContext("2d").getImageData(x0, y0, w, h).data;
  let r = 0, g = 0, b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const color = rgbToHsv(r / n, g / n, b / n);

  const [cx0, cy0, cx1, cy1] = grid.crop;
  const inGrid = px >= cx0 && px < cx1 && py >= cy0 && py < cy1;
  const col = Math.min(grid.cols - 1, Math.max(0, Math.floor(((px - cx0) / (cx1 - cx0)) * grid.cols)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor(((py - cy0) / (cy1 - cy0)) * grid.rows)));
  const rowFrac = 1 - row / Math.max(1, grid.rows - 1);
  
  return { ...color, rowFrac, col, row, inGrid };
}