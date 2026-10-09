# Lộ trình luyện tập và mini-game quyết định

Triển khai ngày 09/09/2026, phiên bản bài tập 0.20. Tổng catalog hiện có 31 bài: 27 mini-game và 4 chế độ Combat Sites.

## Sử dụng

- Mở **Playlists**: chọn Khởi động (~5 phút), Kiểm soát tâm (~10 phút) hoặc Đọc tín hiệu (~4 phút). Thời lượng gồm bài tập và nghỉ, chưa tính đếm ngược/đợi người chơi.
- Khi kết thúc bài, playlist đếm giờ nghỉ và tự chuẩn bị bài tiếp. Nhấn **Bắt đầu bài tiếp** để khóa chuột; trình duyệt cần thao tác này. Có nút tạm dừng nghỉ, tiếp tục, bỏ qua và đóng lộ trình.
- Vị trí trong playlist và kết quả từng bài lưu cục bộ. Sau khi mở lại app, vào Playlists → **Tiếp tục lộ trình đã lưu**. Bài đang chơi dở sẽ bắt đầu lại. Báo cáo cuối cho biết số bài hoàn tất/bỏ qua và điểm từng bài; không cộng các chỉ số khác loại thành một điểm tổng.
- Một lượt bị thay bài hoặc thay thời lượng so với playlist không được tính là hoàn tất bài đã lên lịch.
- Mở **Mini-games** hoặc Game Mode trong briefing để chọn **Shoot / No-shoot** hay **Priority trio**.

## Luật chơi và điểm

**Shoot / No-shoot:** mục tiêu có tín hiệu `+ SHOOT` hoặc `× HOLD`. Bắn mục tiêu SHOOT; không bắn trong toàn bộ lượt HOLD. Mọi click ở lượt HOLD đều sai luật, kể cả click ra ngoài mục tiêu. Chuỗi có khoảng một phần ba lượt HOLD.

**Priority trio:** ba mục tiêu có số 1, 2, 3 cùng xuất hiện. Bắn theo thứ tự; bắn nhầm số tính trượt và giữ nguyên mục tiêu cần bắn. Hoàn tất bộ sau khi trúng cả ba. Bảng quyết định đúng không tính bộ có lỗi thứ tự là bộ sạch.

**Combo sạch:** tăng sau một mục tiêu trúng phát đầu không bắn thừa; Priority yêu cầu đúng cả ba phát; HOLD yêu cầu giữ tay đúng hết lượt. Timeout/lỗi làm đứt combo. Combo tốt nhất có trong kết quả cuối phiên.

**Huy chương:** Đồng ≥65%, Bạc ≥80%, Vàng ≥90%. Với bài click, cả điểm và tỷ lệ hoàn tất mục tiêu phải đạt ngưỡng. Tracking dùng tỷ lệ thời gian bám trúng; bài quyết định dùng tỷ lệ quyết định đúng. Chỉ xét phiên hoàn tất, đủ mẫu, không tạm dừng và qua cổng chất lượng tương ứng. Đây là ngưỡng sản phẩm, không phải thứ hạng kỹ năng đã được chuẩn hóa.

**Kỷ lục:** tính trong lịch sử cục bộ còn được giữ (tối đa 30 phiên), chỉ cùng người chơi và cấu hình đủ thông tin. Không dùng phiên nhập lại hoặc phiên thiếu chất lượng để xác lập kỷ lục.

## So sánh và nhận xét

- So sánh khóa task, súng, map, độ khó, thời lượng, hạn bắn, sens, DPI, input, phiên bản bài và toàn bộ cấu hình scenario (site, zone, góc, hành vi, cự ly, cao độ, số mục tiêu…). Challenge còn yêu cầu cùng seed.
- Xuất/nhập lịch sử giữ súng, hạn bắn và scenario. Dữ liệu nhập vẫn được đánh dấu chưa xác minh, không tự trở thành baseline.
- Stop & Go: accuracy khi mục tiêu dừng và khi chạy, tối thiểu 5 phát mỗi nhóm.
- Ladder: tỷ lệ xử lý theo ba cao độ, tối thiểu 3 mục tiêu mỗi nhóm.
- Zigzag: trung vị thời gian từ lần đổi hướng ngang gần nhất tới phát trúng, tối thiểu 5 phát trúng. Đây không phải phép đo độc lập thời gian phản xạ hay thời gian bắt lại tâm.
- Thiếu mẫu sẽ hiện số mẫu cần bổ sung. Hai bài quyết định dùng cổng đánh giá riêng, không đưa vào đánh giá aim/sensitivity thông thường.

## Kiểm chứng

- Toàn bộ 128 tests đạt tại thời điểm kiểm tra cuối; build thành công.
- `scripts/training-expansion-smoke.cjs`: Electron profile riêng, kiểm bắn sai/đúng thứ tự, HOLD sai/đúng, dữ liệu hợp lệ, đếm nghỉ/tạm dừng, tự chuẩn bị bài và khôi phục sau reload. Test rút ngắn một lượt để xác nhận không ghi nhầm thành bài playlist hoàn tất.
- `scripts/mini-games-smoke.cjs`: sáu bài từ đợt trước vẫn chạy được và ghi telemetry.
- Các kiểm tra dùng chuột/fullscreen mô phỏng; cần chơi thử bằng chuột thật để đánh giá cảm giác và cân bằng. Đợt này cập nhật mã nguồn/bundle, không tạo EXE mới.
