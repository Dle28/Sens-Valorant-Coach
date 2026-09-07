# Gamesen Aim Lab — Desktop + Web v0.3

**Windows desktop:** xem [DESKTOP.md](DESKTOP.md). Bản `.exe` chạy độc lập, tự lưu JSON phiên và nhớ profile. Phần dưới đây là hướng dẫn bản web dùng chung engine.

Chạy trên desktop với chuột, WebGL2 và Pointer Lock. Không kết nối, inject hoặc lấy dữ liệu từ VALORANT.

```bash
cd /home/dungle/Documents/gamesen_coaching/aim-lab
npm ci
npm start
```

Mở http://localhost:4173. Khi dependencies đã được cài, ứng dụng không cần CDN hay tài khoản. Server chỉ bind loopback 127.0.0.1.

```bash
npm test
npm run build
npm run preview
```

`preview` phục vụ bản bundle trong `dist/`, cùng cổng 4173; dừng server trước nếu cổng đang bận. Có thể dùng `PORT=4174 npm run preview`.

## Cách chơi

Chọn một trong bảy bài: Precision, Transfer, Tracking, Micro adjustment, Wide flick, Head-line hoặc Moving click. Ba thử thách có seed/cấu hình cố định và mục tiêu công khai nằm dưới danh sách bài. Đặt sensitivity hip-fire như trong VALORANT và nhập DPI từ phần mềm chuột. Chọn độ khó và 30/60/90 giây, nhấn bắt đầu, chờ đếm ngược. Di chuột để ngắm; click trái để bắn ở Precision/Transfer. Tracking chỉ cần giữ tâm trên quả cầu. Escape tạm dừng; nhấn tiếp tục hoặc kết thúc để xem kết quả. Mất focus/tab bị ẩn sẽ nhả khóa chuột và tạm dừng.

Các nút −10%, Gốc, +10% dùng chung baseline từ lần nhập sensitivity thủ công gần nhất. Một vài lượt không đủ xác định sens tối ưu. Nên giữ cùng bài, độ khó và thời lượng khi so sánh; lịch sử chưa triển khai phân tích thí nghiệm crossover.

## Sensitivity và DPI

- Xoay camera = movementX/Y × sensitivity × 0.07 độ. DPI nhập vào **không nhân thêm vào góc xoay**, vì browser đã cung cấp chuyển động chuột.
- eDPI = DPI × sensitivity; cm/360 = 914.4 / (DPI × sensitivity × 0.07).
- Camera 103 độ ngang, khung 16:9, không ADS/scope. Đây là preset theo quy ước cộng đồng, chưa được kiểm chứng 1:1 với VALORANT trên máy thật.
- Yêu cầu `unadjustedMovement: true`; khi không hỗ trợ hoặc API cũ không trả xác nhận Promise thì chặn phiên, không thử Pointer Lock thường. API không chứng minh raw sensor counts thực sự được cấp, nên luôn ghi `rawVerified: false`. Xem [Pointer Lock API của MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).
- Trình duyệt không đọc/đổi được DPI firmware. Hiệu chuẩn dùng thước thật: chọn quãng 5–50 cm, bắt đầu khóa chuột, Space để ghi, kéo thẳng một chiều hết quãng đường, Space để kết thúc. Lặp ba lượt. Công thức DPI hiệu dụng = abs(net movementX) × 2.54 / cm.
- Loại lượt quá ít dữ liệu, đổi chiều nhiều, quá chéo hoặc ngoài khoảng DPI. Chỉ áp dụng khi đủ ba lượt, cùng loại yêu cầu input, độ trải (max−min)/median ≤15%. Ngưỡng này là heuristic prototype, chưa được validation thực nghiệm. Khoảng cách tự khai, acceleration hệ điều hành và browser vẫn có thể gây sai số.

## Kết quả và dữ liệu

Precision/Transfer: số phát bắn, accuracy, trung vị thời gian tới hit của các trial trúng, tỷ lệ trúng phát đầu trong 2.5 giây trên tất cả trial đã bắt đầu. Trial hết 2.5 giây là timeout; trial dang dở khi kết thúc là interrupted, vẫn nằm trong mẫu số. Trung vị tới hit không bao gồm timeout và phải đọc cùng tỷ lệ thành công.

Tracking: phần thời gian tâm nằm trên hitbox cầu và RMS sai số góc tới tâm target. Frame >100ms bị loại khỏi tích phân tracking và được đếm riêng. Góc là độ; vị trí target là world units. Raycast dùng hitbox sphere 3D, không kiểm tra khoảng cách pixel.

JSON tải sau phiên chứa config đóng băng, seed, inputEvents, frames, shots, trials, pauses và summary. Trong v0.2, input/shot timestamp `t` dùng đồng hồ performance tại lúc xử lý event, nối từ active time của frame trước; chưa phải timestamp sensor hoặc thời điểm photon hiển thị; `dt` là khoảng frame trình duyệt. Không dùng dữ liệu này để khẳng định latency phần cứng hoặc polling rate. CSV chỉ chứa trials, nên Tracking xuất CSV chỉ có header; dùng JSON cho Tracking.

Lưu tối đa 30 **summary kèm phân tích** trong localStorage của origin. Quỹ đạo đầy đủ chỉ giữ trong bộ nhớ phiên hiện tại: tải JSON trước khi bắt đầu phiên mới hoặc reload. Không gửi telemetry qua mạng. Đây là dữ liệu phát sinh từ người chơi prototype; không phải dữ liệu trận VALORANT hay dataset công khai có sẵn, chưa tương thích trực tiếp với `../schemas/aim_event.schema.json`.

## Trạng thái kiểm tra

31 unit tests đã pass cho công thức, hiệu chuẩn, mẫu số và serialization; bundle production build thành công. Chưa kiểm thử hình ảnh, Pointer Lock, full-screen hoặc DPI bằng chuột thật do phiên triển khai không có trình duyệt kết nối. Các test toán học không chứng minh trải nghiệm chơi hay độ khớp sensitivity trên thiết bị.

Checklist chạy trên máy thật: vào ba bài và hoàn tất phiên; click trúng/trượt; Escape và resume; đổi tab; tải JSON; thử ba lượt DPI với thước; đối chiếu cm/360 cùng VALORANT. Cần kiểm tra này trước khi dùng prototype để thu dataset nghiên cứu.

## Preset trực tiếp v0.2.1

Theo yêu cầu người dùng, bỏ toàn bộ bước đo quãng đường và hệ số hiệu chỉnh thủ công trong giao diện. Nhập đúng con số sensitivity hip-fire đang dùng trong VALORANT; camera áp dụng trực tiếp `movement × sens × 0.07°` trên cả hai trục. Không nhân DPI hoặc hệ số bù thêm vào góc xoay. `inputGain: 1` được giữ trong dữ liệu để phân biệt với các phiên v0.2 từng hiệu chỉnh.

Giữ camera 103° ngang trong khung 16:9, yêu cầu raw input qua Pointer Lock. Các giới hạn hỗ trợ của trình duyệt vẫn được ghi rõ trong mục thông tin input; preset là quy ước mô phỏng, chưa có xác nhận vật lý 1:1 trên mọi thiết bị. Hiệu chuẩn DPI là tiện ích tùy chọn riêng, không bắt buộc để chơi.

Bảy bài, ba thử thách, phân tích sau phiên và lịch sử vẫn hoạt động. Gợi ý sau phiên không yêu cầu đo quãng đường nữa. Các ghi chép đối chiếu thủ công trong nghiên cứu v0.2 là lịch sử thiết kế, không phải luồng sử dụng hiện tại.

## Input bỏ qua xử lý hệ điều hành

Bản hiện tại yêu cầu `unadjustedMovement: true` và bỏ fallback input đã xử lý. Chỉ bắt đầu sau khi Promise được chấp nhận; API thiếu hỗ trợ, từ chối hoặc trả kiểu legacy sẽ nhả khóa và báo lỗi. Không thay đổi cấu hình chuột toàn hệ thống. Việc API chấp nhận vẫn không phải kiểm chứng độc lập raw sensor counts.
