## Bản 0.5.6 — Lotus + Dark Range

Map đền đá 3D nguyên gốc nay mang tên **Lotus**. Cảnh có nền lát đá, vách núi low-poly, sáu cột với biến thể gãy, tường lõm, lối đi dẫn tâm, dây leo, lá, hoa năng lượng và ba thác nước chuyển động. **Dark Range** là lựa chọn còn lại: nền tối tối giản, chỉ giữ sàn, mục tiêu và súng để người chơi tập trung hoàn toàn vào tâm ngắm. Các sector cũ đã được bỏ khỏi giao diện và world scene. Lịch sử Verdant Sanctum được đọc là Lotus; phiên thuộc map đã bỏ được giữ nhãn legacy và không gộp vào số liệu hai map hiện hành. Cảnh Lotus dùng geometry Three.js dựng trong app, không dùng layout, texture hay asset của VALORANT.

Tải [bản Windows portable v0.5.6](https://github.com/Dle28/Sens-Valorant-Coach/releases/tag/v0.5.6), kèm checksum SHA-256.

## Bản 0.5.4 — cinematic 3D lobby, sector maps và loadout

Màn hình chính chuyển thành lobby menu: tiêu đề ENTER THE RANGE, loadout đang chọn, PLAY NOW, bộ chọn mode đóng/mở và phím tắt ENTER/ESC. Canvas Three.js được phóng thành cinematic background với cột năng lượng, portal, tinh thể, địa hình low-poly, debris bay, hạt sáng và chiều sâu sương. Bốn sector 3D tự tạo — Astra Courtyard, Three Lane Shrine, Relay Dunes và Polar Cargo — đổi kiến trúc, nền, sương và ánh sáng khi chọn map. Mỗi sector còn áp dụng quy luật lane riêng cho target: Shrine hẹp góc, Relay kéo xa sightline, Cargo đẩy cự ly và peek quanh container. Loadout có bốn profile trình bày theo vai trò súng VALORANT-style; thông số được ghi trong cấu hình phiên nhưng hit logic không phụ thuộc profile. Thẻ MINI-GAME PROGRESS so sánh tối đa tám phiên gần nhất cùng bài/map, hiển thị điểm gần nhất, tốt nhất, chênh lệch và các cột tiến bộ. Màu đỏ san hô là nhận diện riêng của Gamesen; không dùng logo, key art hay tài sản của VALORANT.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.4-Windows-x64.exe`.

## Bản 0.5.2 — FPS visual direction

Màn hình chính chuyển thành lobby menu với tiêu đề ENTER THE RANGE, loadout đang chọn, PLAY NOW, bộ chọn mode đóng/mở và phím tắt ENTER/ESC. Tinh chỉnh theo nghiên cứu giao diện FPS: CTA có tương phản cao, hình khối được đơn giản hóa, trạng thái active/pulse rõ hơn và motion nhẹ dẫn mắt vào nút bắt đầu, kho chế độ, HUD và kết quả. Màu đỏ san hô là nhận diện riêng của Gamesen; không dùng logo, key art hay tài sản của VALORANT.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.2-Windows-x64.exe`.

## Bản 0.5.1 — gaming command deck

Lớp trình bày mới dùng viewport làm trung tâm, command deck cắt góc, HUD chữ kỹ thuật, nền grid/scanline và trạng thái màu để giao diện đọc như một game client hiện đại thay vì dashboard web. Các control cũ vẫn giữ nguyên hành vi và hỗ trợ cả theme tối lẫn sáng.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.1-Windows-x64.exe`.

## Bản 0.5.0 — phòng tập FPS và cự ly bắn

Giao diện tactical FPS gọn với chủ đề sáng/tối, mô hình súng và bàn tay góc nhìn thứ nhất dựng bằng Three.js. Chuyển động súng chỉ là hiệu ứng hình ảnh, không đổi tâm ngắm hay phép tính hit.

Cự ly mục tiêu luân phiên theo bài và chuỗi seed. Kết quả có bảng cự ly gần (<12 m), trung (12–<24 m), xa (≥24 m), dùng số mục tiêu cho bài click và thời gian hợp lệ cho tracking. Đây là mét trong phòng tập mô phỏng. Kích thước và quỹ đạo cùng ảnh hưởng kết quả; chỉ nêu cự ly có tỷ lệ thấp khi đủ mẫu.

Exercise version 0.5 tách so sánh với hình học của phiên cũ. Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.0-Windows-x64.exe`.

## Bản 0.4.1 — giao diện gọn và hướng cải thiện

Bỏ hero, slogan và banner trang; gom toàn bộ chế độ vào một mục đóng/mở, tự đóng khi chọn. Giữ phòng tập và thiết lập chính trên màn hình đầu.

Mỗi biểu đồ có nhận xét riêng gồm bằng chứng + hành động tiếp theo. Báo cáo đặt một ưu tiên ở đầu, giữ các giải thích dài trong mục thu gọn. Hướng luyện dựa trên mẫu số, độ phủ và tính liên tục của phiên; các ngưỡng là quy tắc sản phẩm, chưa phải chuẩn kỹ năng đã kiểm định. Nhận xét được lưu cùng lịch sử phiên mới.

## Bản phát triển 0.4.0 — 08/09/2026

- Giao diện sảnh game với chủ đề Tối / Sáng / Theo hệ thống, lưu trên máy.
- 16 chế độ, 4 độ khó; cầu nhỏ/vừa/lớn luân phiên theo trial, Tracking đổi kích thước mỗi 6 giây. Layout so le theo bài, Head-line giữ cao độ, Micro có kích thước góc nhỏ hơn Precision. Bốn map sector tự tạo đổi kiến trúc và palette trong lobby.
- Phân tích giải thích mẫu số accuracy, tỷ lệ mục tiêu hoàn thành, phát đầu đúng hạn, trung vị/P90, nhịp hit, tracking/RMS/coverage; bảng theo kích thước cho cả click và tracking.
- Biểu đồ trung bình sai số mỗi giây và min–max; biểu đồ nhịp/accuracy mỗi 5 giây; heatmap thời gian và lớp điểm bắn với ba phạm vi góc, thang màu, tooltip và đếm ngoài vùng.
- Session mới ghi targetRadius, sizeBand, distance/layout và aimX/aimY khi bắn. Exercise version 0.4 ngăn so sánh tự động với bài cũ.
- Dữ liệu chi tiết chỉ có trong phiên đang xem/JSON đầy đủ; lịch sử vẫn giữ tóm tắt và các phân tích đã lưu, không dựng lại tọa độ của phiên cũ.
- `tests/visual-preview.html` là fixture QA với dữ liệu tổng hợp, không được đóng gói vào app hay ghi vào lịch sử người chơi.

## Cập nhật giao diện và mini-game

- Thư viện 16 bài tập, lọc theo độ chính xác, tốc độ/phản xạ và bám mục tiêu. Mỗi bài có map, cự ly và profile súng để lưu tiến bộ riêng.
- Thêm Burst control, Grid shot, Strafe click, Orbit tracking và Target switch.
- Bốn mức easy/normal/hard/expert thay đổi kích thước, deadline và tốc độ. Exercise version 0.3 tách so sánh khỏi phiên cũ.
- Bắt đầu yêu cầu khóa chuột và toàn màn hình; chỉ đếm ngược sau khi cả hai thành công. Esc tạm dừng.
- Kết quả có sai số góc theo thời gian, hiệu suất mỗi 5 giây và heatmap góc mục tiêu tương đối với tâm ngắm. Heatmap tính theo thời gian frame hợp lệ, không phải vị trí đạn.
- Biểu đồ chi tiết hiện có sau phiên vừa chơi; lịch sử vẫn lưu tóm tắt.

# Gamesen Aim Lab — Desktop + Web v0.5.6

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
