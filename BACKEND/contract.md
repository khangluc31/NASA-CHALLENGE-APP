# Earth Jukebox: Bảng quy ước dữ liệu (Hợp đồng 1)

Tài liệu này là thỏa thuận giữa **Người 3 (phân tích ảnh/video → JSON)** và **Người 2 (`audio.js`, đọc JSON và phát âm thanh)**. Mọi thay đổi phải sửa vào file này và báo trong kênh chung, không đổi âm thầm.

Trạng thái: **bản nháp, chờ cả nhóm chốt**. Các mục đánh dấu *(đề xuất)* chưa được thống nhất.

---

## 1. Cấu trúc JSON

```json
{
  "id": "night-lights",
  "title": "Change in Night Lights, 2012-2023",
  "description": "Mô tả cho screen reader (Người 6 viết)",
  "imageUrl": "/frames/night-lights.png",
  "columns": [
    {
      "hue": 45.0,
      "sat": 0.7,
      "light": 0.12,
      "edge": 0.3,
      "rows": [ { "hue": 45.0, "light": 0.0 } ]
    }
  ],
  "stats": { "meanHue": 60.0, "meanLight": 0.05, "warmRatio": 0.5, "edgeDensity": 0.04 }
}
```

`columns` có 96 phần tử, mỗi `rows` có 16 phần tử (ví dụ trên rút gọn).

## 2. Các trường

| Trường | Kiểu | Khoảng giá trị | Ý nghĩa | `audio.js` dùng để |
|---|---|---|---|---|
| `id` | string | kebab-case, ví dụ `night-lights` | Định danh, trùng tên file | Không dùng |
| `title`, `description` | string | | Mô tả cho screen reader (Người 6 viết) | Không dùng (UI dùng) |
| `imageUrl` | string | `/frames/<id>.png` | Ảnh hiển thị | Không dùng (UI dùng) |
| `columns[]` | array | 96 phần tử | Một cột = một bước quét | Mỗi cột một lần phát |
| `columns[].rows[]` | array | 16 phần tử | Từng ô của cột, `rows[0]` là hàng **trên cùng** | Mỗi ô có thể thành một nốt |
| `rows[].light` | number | 0..1 | Độ sáng/cường độ của ô | Velocity; dưới 0.12 là im lặng |
| `rows[].hue` | number | 0..360 (độ) | Sắc độ của ô | Ấm/lạnh |
| `columns[].hue` | number | 0..360 | Hue đại diện cả cột | Dự phòng |
| `columns[].sat` | number | 0..1 | Độ bão hòa | Chưa dùng (dành cho filter/reverb) |
| `columns[].light` | number | 0..1 | Độ sáng trung bình cột | Chưa dùng |
| `columns[].edge` | number | 0..1 | Mật độ chi tiết của cột | Trên 0.5 thêm lớp noise; trên 0.4 và cấp bách thì thêm nốt lệch |
| `stats.meanHue` | number | 0..360 | Hue trung bình | Chưa dùng |
| `stats.meanLight` | number | 0..1 | Độ sáng trung bình cả ảnh | Chưa dùng |
| `stats.warmRatio` | number | 0..1 | Tỉ lệ ô sáng có màu ấm | Mức "cấp bách" |
| `stats.edgeDensity` | number | 0..1 | Mật độ cạnh cả ảnh | Chưa dùng |

## 3. Quy ước lưới và hướng

| Mục | Quy ước |
|---|---|
| Số cột × số hàng | 96 × 16, cố định cho mọi dataset |
| Thứ tự cột | Trái sang phải, `columns[0]` là mép trái |
| Thứ tự hàng | `rows[0]` là hàng trên cùng, hàng trên thành nốt cao |
| Ô bị che (khung zoom, colorbar, chữ) | `light = 0`, tức im lặng |
| Làm tròn | `light`, `sat`, `edge` 3 chữ số thập phân; `hue` 1 chữ số |
| Hue của OpenCV | Nhân 2 để ra 0..360 (OpenCV mặc định là 0..179) |
| Không có `NaN` hoặc `null` | Thiếu dữ liệu thì ghi 0 |

## 4. Công thức chuẩn hóa

Đây là phần quyết định âm thanh nghe ra thế nào. Nếu đổi công thức, phải báo bên audio để chỉnh lại ngưỡng.

| Giá trị | Cách tính |
|---|---|
| Nền (`bg`) | Trung vị độ sáng của vùng hợp lệ, trừ đi để đất liền mờ không thành nốt rác |
| `light` của ô | Percentile 97 của pixel trong ô, trừ `bg`, chia `(ref − bg)`, rồi cắt về 0..1. Dùng percentile thay vì trung bình vì đèn thành phố là điểm nhỏ |
| `ref` | Percentile 99.5 của cả ảnh (có sàn tối thiểu) |
| `hue` của ô | Trung bình vòng tròn của các pixel sáng nhất trong ô, không dùng trung bình số học |
| `edge` | Sobel trên độ sáng, chuẩn hóa chia cho giá trị lớn nhất của **cả ảnh** (để các cột so sánh được với nhau) |
| Ảnh "change" (cam/tím) | Dùng `--metric chroma`, đo theo độ màu, để loại băng và đất xám |
| Ảnh chuỗi năm (đèn trắng/vàng trên nền đen) | Dùng `--metric value` |
| `warmRatio` | Số ô sáng có hue ≤ 70 hoặc ≥ 330, chia tổng số ô sáng (ô sáng là `light > 0.12`) |

Các sàn nền/trần chuẩn hóa của chế độ `chroma` (mặc định `--bg-floor 0.07`, `--ref-floor 0.25`) được đo từ ảnh test 320×180 và **chưa kiểm chứng trên ảnh khác**. Ảnh độ phân giải cao hơn cần đo lại.

## 5. Quy ước file và thư mục

| Mục | Quy ước |
|---|---|
| Ảnh hiển thị | `public/frames/<id>.png` (đã crop bỏ chữ, colorbar nếu có thể) |
| Features | `public/data/<id>.json` |
| Danh mục | `public/data/index.json`: danh sách `[{ id, title, thumbnail, dataUrl }]`, UI đọc từ đây |
| Đặt tên | Chữ thường, gạch ngang, không dấu, không khoảng trắng |
| Kích thước JSON | Dưới khoảng 100 KB mỗi file (96×16 hiện khoảng 52 KB) |
| Tạo lại dữ liệu | Một lệnh duy nhất trong README, kèm `requirements.txt` (`numpy`, `pillow`) |
| Commit | JSON đã sinh được commit vào repo; Vercel không chạy Python khi build |
| Ghi nguồn | Mỗi dataset có credit trong `index.json` và README, ví dụ "NASA's Scientific Visualization Studio" |

Lệnh tạo dữ liệu hiện tại:

```bash
pip install numpy pillow
python extract.py <anh>.png --out public/data/<id>.json --debug debug.png
```

## 6. Mở rộng cho "nghe thời gian trôi" *(đề xuất)*

| Mục | Đề xuất |
|---|---|
| Nhiều mốc thời gian | Mỗi năm một file: `night-lights-2012.json`, `night-lights-2023.json` |
| Liên kết | Trong `index.json` thêm `timeline: ["night-lights-2012", ..., "night-lights-2023"]` |
| Điều kiện | Các file cùng lưới 96×16 và **cùng `bg`, `ref`** (tính một lần cho cả chuỗi). Nếu mỗi năm chuẩn hóa riêng thì mọi năm nghe giống nhau, mất ý nghĩa so sánh |
| Phía audio | Engine phát lần lượt các file; bổ sung sau khi MVP chạy |

## 7. Trường `stats.urgency` *(đề xuất, cần nhóm chốt)*

`warmRatio` hiện làm mức "cấp bách", nhưng với Night Lights thì **ấm không có nghĩa là nguy hiểm**: cam là vùng giảm sáng, tím là vùng tăng sáng. Đề xuất thêm trường tùy chọn:

| Trường | Kiểu | Khoảng giá trị | Ý nghĩa |
|---|---|---|---|
| `stats.urgency` | number (tùy chọn) | 0..1 | Mức cấp bách do Người 3 hoặc Người 6 quyết định công thức riêng cho từng dataset |

Ví dụ: nhiệt độ thì vùng nóng là cấp bách; Night Lights thì tỉ lệ vùng tăng sáng mạnh. Engine dùng `urgency` nếu có, nếu không thì quay về `warmRatio`.

*Trạng thái: `audio.js` hiện chưa đọc trường này.*

## 8. Cách làm việc

| Mục | Quy ước |
|---|---|
| Kiểm tra | `extract.py` tự validate (đủ cột, giá trị trong khoảng). Người 3 chạy trước khi commit |
| Bàn giao | Mỗi lần giao gồm JSON + ảnh debug (vùng mask và lưới độ sáng) để nhìn bằng mắt |
| Thay đổi quy ước | Sửa trong file này và báo trong kênh chung |
| Phản hồi từ phía audio | Nói theo thuật ngữ dữ liệu: "quá ít cột có tiếng", "ngưỡng nền quá thấp", không chỉ nói "nghe dở" |
| Thử không phụ thuộc nhau | Audio dùng `features.mock.js`; Người 3 dùng ảnh debug. Chỉ ghép khi cả hai xong |

## 9. Việc còn mở

- [ ] Cả nhóm chốt lưới 96 × 16.
- [ ] Chốt công thức `urgency` (mục 7).
- [ ] Chốt cách làm nhiều mốc năm (mục 6).
- [ ] Đo lại `--bg-floor` và `--ref-floor` trên ảnh độ phân giải cao.
- [ ] Người 6 điền `description` và credit cho từng dataset.
- [ ] Xác nhận luật cuộc thi có cho phép code viết trước hay không.