# Mở rộng mini-game và rà soát sản phẩm — 09/09/2026

**Cập nhật tiếp theo:** các mục so sánh cấu hình, playlist, combo/huy chương, nhận xét riêng và hai mode quyết định đã được triển khai. Xem [hướng dẫn bản mở rộng](TRAINING_EXPANSION.md). Danh sách đề xuất bên dưới được giữ làm bản rà soát ban đầu.

## Đã triển khai trong lần chỉnh sửa này

- Thêm **Figure 8**, **Pendulum**, **Zigzag click**, **Stop & Go**, **Elevation ladder**, **Flash flick**. Tổng catalog: **29 bài**, gồm **25 mini-game phòng tập** và **4 chế độ Combat Sites**.
- Figure 8 và Pendulum tính thời gian bám mục tiêu, không yêu cầu click. Zigzag đổi hướng liên tục; Stop & Go có đoạn chạy và đoạn đứng yên thật. Ladder lần lượt chuyển qua sáu vị trí, ba cao độ. Flash flick dùng 55% hạn bắn thường ở cả bốn độ khó.
- Game Mode trong briefing lấy đủ 25 bài từ catalog, chia nhóm Di chuyển / Chính xác / Tốc độ / Tracking. Mô tả cách chơi cập nhật ngay khi chọn; tracking hiển thị thời lượng thay vì số mục tiêu.
- Sidebar **Mini-games** mở thẳng phòng tập và danh sách bài. Có thể lọc theo kỹ năng, chọn độ khó, thời lượng và thử thách tại đây.
- Thêm bốn thử thách có seed cố định và ngưỡng đánh giá: bám số 8, chạy–dừng, flick nhanh, chuyển cao độ. Tổng **7 thử thách**. Khi chọn thử thách, bỏ cấu hình scenario cũ để không bị giới hạn số mục tiêu hoặc thay chuyển động.
- Chế độ aim chọn trực tiếp giữ chuyển động đặc trưng; ô hành vi chỉ áp dụng cho scenario hoặc đấu luyện. Bản ghi dùng exerciseVersion 0.19 để tách so sánh khỏi logic cũ.
- Sửa import map `three/addons/` để bản chạy bằng `npm start` tải được các module đồ họa đang dùng.

## Nên bổ sung tiếp, theo thứ tự ưu tiên

Đây là đề xuất từ mã nguồn hiện tại, chưa phải các tính năng đã hoàn thành.

| Ưu tiên | Phần còn thiếu và bằng chứng | Đề xuất cụ thể / điều kiện hoàn thành |
|---|---|---|
| 1 | So sánh tiến bộ chưa khóa đủ cấu hình. `comparable()` trong `training.js` chưa so scenario; `history-transfer.js` chưa giữ cấu hình scenario khi nhập. | Giữ và so map/site, cự ly, hành vi, cao độ, số mục tiêu, thời lượng và phiên bản bài. Phiên thiếu cấu hình phải được đánh dấu không so sánh được; thêm kiểm thử xuất–nhập khứ hồi. |
| 2 | Playlists mới là bốn nút mở một scenario (`renderPlaylists()` trong `app-shell.js`). | Xây hàng đợi 3–5 bài, thời gian nghỉ, bỏ qua bài, tiếp tục sau tạm dừng và báo cáo cả chuỗi. Bắt đầu với warm-up 5 phút và routine kiểm soát tâm 10 phút. |
| 3 | Tăng số bài nhưng chưa có mục tiêu tiến trình xuyên suốt. | Kỷ lục riêng theo bài/cấu hình, chuỗi hit liên tiếp, tỷ lệ timeout và huy chương theo ngưỡng công khai. Đưa một gợi ý bài tiếp dựa vào vài phiên đủ dữ liệu. |
| 4 | Phần nhận xét trong `analyzeRun()` phần lớn dùng chung accuracy, timeout và thời gian bám. | Thêm chỉ số riêng: trễ bắt lại sau đổi hướng cho Zigzag, accuracy khi đứng yên/chạy cho Stop & Go, lỗi theo cao độ cho Ladder. Chỉ hiển thị nhận xét khi có đủ mẫu. |
| 5 | Nhiều bài vẫn tập một mục tiêu; quyết định chọn mục tiêu còn hạn chế. | Thêm shoot/no-shoot với ký hiệu dễ phân biệt, thứ tự mục tiêu đánh số, target ưu tiên theo thời gian và peek có vật che thực. Mỗi mode cần luật thắng/thua, feedback và telemetry riêng. |
| 6 | Test tự động không xác nhận cảm giác chuột, cân bằng độ khó hay hiệu năng trên máy người chơi. | Chơi thử bằng chuột thật ở từng mức khó, kiểm FPS/frame time và khả năng đọc mục tiêu trên cả hai map. Điều chỉnh ngưỡng thử thách sau khi có dữ liệu; thêm tùy chọn màu mục tiêu/tâm và giảm hiệu ứng khi cần. |

Ưu tiên hai mục đầu trước khi thêm một đợt mode lớn nữa: chúng giúp các bài hiện có thành lộ trình tập có thể theo dõi được.

## Kiểm tra

- Kết quả lần sửa: **115/115 tests đạt**, build đạt; Electron đã chạy đủ sáu bài mới và kiểm tra một phiên challenge. Các bài chuyển động có telemetry thay đổi; Flash flick có timeout với hạn 1.375 ms.
- Unit tests: `npm test` trong `aim-lab`.
- Build: `npm run build`.
- Renderer integration: sau khi cài dependencies, chạy `node_modules/.bin/electron.cmd scripts/mini-games-smoke.cjs` trên Windows. Harness dùng profile tạm riêng, kiểm sáu bài mới, telemetry chuyển động, timeout Flash flick, menu và cấu hình thử thách. Ảnh chụp ở `aim-lab/output/mini-games-briefing.png`.
- Pointer lock/fullscreen trong harness là mô phỏng; chưa thay thế kiểm thử chuột thật. Lần sửa này cập nhật mã nguồn và bundle, chưa đóng gói EXE mới.
