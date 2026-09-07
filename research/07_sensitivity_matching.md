# Đối chiếu sensitivity với VALORANT và thiết kế bản tập v0.2

**Cập nhật v0.2.1:** theo yêu cầu người dùng, app đã bỏ phép đo và hệ số bù thủ công khỏi luồng sử dụng. Áp dụng preset sens VALORANT trực tiếp, gain cố định 1. Phần quy trình đo bên dưới được giữ làm ghi chép nghiên cứu lịch sử.

Rà soát: 07/09/2026. Phạm vi: hip-fire trên desktop và chuột; không ADS/scope, recoil, di chuyển nhân vật, engine latency hoặc gameplay tương đương VALORANT. Đây là nghiên cứu kèm prototype, chưa có thử nghiệm xác nhận độ khớp trên máy người dùng.

## Kết quả kiểm nguồn

1. Riot xác nhận VALORANT dùng raw input từ khi ra mắt. Raw Input Buffer thay API xử lý input, không phải một hệ số sensitivity mới. Nguồn: [Riot, patch 3.07](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-3-07/).
2. Từ patch 11.06 (16/09/2025), Riot bỏ tùy chọn RawInputBuffer và luôn bật. Vì vậy không hướng dẫn người chơi tìm công tắc cũ để sửa sens. Nguồn: [Riot, patch 11.06](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-11-06/).
3. Trình duyệt có thể dùng đơn vị movementX khác nhau theo OS/browser. Tùy chọn `unadjustedMovement` có thể bị bỏ qua nếu không hỗ trợ. Việc gọi thành công không đủ chứng minh raw sensor counts. Nguồn: [MDN movementX](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/movementX), [MDN Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).
4. Preset yaw 0.07 được các dự án cộng đồng dùng, ví dụ [mã nguồn calculator của inommm](https://github.com/inommm/mouse-sensitivity-calculator/blob/main/src/App.tsx). Đây là bằng chứng về cách triển khai của tác giả, không phải công bố chính thức của Riot. Chưa tìm được nguồn Riot trong lần rà soát này xác nhận hằng số yaw hoặc FOV 103°. Giữ chúng làm preset cần đối chiếu; không nhận tuyên bố “1:1” từ trainer khác làm bằng chứng kiểm định.

## Cần khớp những gì?

**Khớp góc quay theo quãng đường** là bước đầu: cùng quãng chuột vật lý phải tạo cùng góc quay. **Khớp cảm giác nhìn** còn phụ thuộc FOV, aspect ratio, kích thước viewport trên màn hình và độ trễ. Hai môi trường có cùng cm/360 vẫn có thể cho cảm giác khác nếu phòng tập chạy trong một canvas nhỏ. Dùng toàn màn hình, khung 16:9 để đối chiếu gần hơn; đây không phải phép chứng minh độ trễ hoặc camera hoàn toàn giống nhau.

Công thức hiện tại:

- Góc quay = browser movement × sens VALORANT × 0.07° × inputGain.
- inputGain mặc định 1, chỉ áp dụng trong phòng tập.
- DPI nhập vào không nhân thêm góc quay; eDPI = DPI × sens.
- cm/360 preset = 914.4 / (DPI × sens × 0.07); đây là ước tính trước hiệu chỉnh và phụ thuộc tính đúng của DPI/đơn vị input.

## Quy trình đối chiếu được đưa vào app

1. Giữ nguyên chuột, DPI firmware, sens hip-fire, cấu hình OS/browser và màn hình. Không ADS/scope trong VALORANT.
2. Trong Range, đứng yên, chọn mốc ban đầu, quay đúng 360° trở lại mốc. Đo quãng đường chuột bằng thước thật, không nhấc chuột. Ba lượt, gồm tốc độ chậm và nhanh.
3. Trong app, chọn Kiểm tra góc quay. Đặt chuột ở mốc đầu, Space đặt góc về 0, kéo tới 360°, Space đóng băng, Esc thoát. Thu ba quãng tương tự. Nếu không đủ bàn, chọn 180° ở cả hai; cần mốc đối diện xác định chính xác trong VALORANT.
4. Nhập sáu số đo. Mỗi nhóm phải có ba số từ 1–300 cm, độ trải (max−min)/median ≤10%. Đây là ngưỡng QA do dự án đề xuất, không phải tiêu chuẩn đo lường đã validation.
5. Hệ số mới = hệ số hiện tại × median(quãng app) / median(quãng VALORANT). Ví dụ app 60 cm, VALORANT 50 cm, hệ số cũ 1 → hệ số mới 1.2. App cần xoay nhanh hơn để đi cùng góc với quãng ngắn hơn. Không đổi sens VALORANT.
6. Sau áp dụng, đo lại. Trạng thái luôn ghi “chưa xác nhận” vì app không quan sát được phép đo trong VALORANT. Kiểm lại ở hai tốc độ; nếu phụ thuộc tốc độ, một hệ số tuyến tính không sửa được acceleration. Không ép kết quả bằng cách tiếp tục nhân hệ số trên cùng bộ số đo cũ.

App xóa số đo lab sau áp dụng để tránh nhân lặp trên bộ cũ; đổi góc đo xóa cả hai nhóm. Đổi DPI/sens thủ công hủy hệ số cũ. Hệ số không tồn tại qua reload, nhưng config và bằng chứng đo tự nhập được ghi vào session JSON. Hiệu chuẩn trục ngang chưa xác nhận độ khớp trục dọc; app áp dụng cùng gain cho hai trục theo giả định đối xứng của preset.

## Bài tập và thử thách

Bảy bài: Precision, Transfer, Tracking, Micro adjustment, Wide flick, Head-line, Moving click. Micro tạo target quanh hướng nhìn hiện tại; Wide luân phiên hai phía với góc lớn; Head-line giữ target cùng cao độ; Moving click dịch target theo thời gian trong từng trial. Đây là bài aim tổng hợp, chưa mô phỏng head hitbox, strafe, recoil hay counter-strafe của VALORANT.

Ba thử thách có cấu hình và seed cố định: 20 hit/30s với accuracy ≥90%; Wide 35 hit/60s với accuracy ≥80%; Tracking 60s với time-on-target ≥60%. Các mốc là mục tiêu thiết kế nội bộ, không tương ứng rank. Chỉ xét khi hoàn tất, không tạm dừng, không frame >100ms, không fallback input. Tracking cần ≥90% thời gian phiên có frame hợp lệ. Cùng seed giúp lặp chuỗi target; thời điểm xuất hiện vẫn phụ thuộc tốc độ hoàn thành của người chơi.

## Phân tích sau phiên

Dùng quy tắc minh bạch trên telemetry phiên, không gọi LLM hoặc model đã train. Bài bắn cần ≥10 target và ≥10 phát; tracking cần ≥10s dữ liệu hợp lệ trước nhận xét kỹ năng. Báo accuracy, timeout, trúng phát đầu trước deadline, trung vị tới hit (chỉ các trial trúng), thời gian từ lần tâm vào target đầu tới hit; tracking báo time-on-target, RMS và hai nửa phiên nếu đủ mẫu.

Ví dụ quy tắc: accuracy <75% → tập Micro chậm hơn; accuracy đủ nhưng timeout >20% → luyện tìm/chuyển target ở Transfer; tracking <60% → giảm độ khó trước. Đây là heuristic coaching, chưa được kiểm định hiệu quả. Không suy ra overshoot/undershoot, mệt mỏi, rank hoặc sens tối ưu từ các metric chưa đủ phân biệt nguyên nhân.

So sánh mô tả với phiên gần nhất có cùng bài, độ khó, thời lượng, sens, DPI, nguồn DPI, input mode, gain, phiên bản bài, challenge và FOV. Chặn phiên cũ thiếu version, bị dừng hoặc frame chậm. Không coi chênh lệch accuracy giữa hai phiên là bằng chứng thay đổi sens có lợi. Các phiên cũ thiếu trajectory được giữ nguyên tóm tắt, không tạo lại dữ liệu không có.

## Xác minh triển khai

21 unit tests kiểm công thức, hiệu chỉnh đúng chiều/không lặp sai, QA đo, geometry bài, guard thiếu dữ liệu, quy tắc phân tích, xét thử thách và điều kiện so sánh. Production bundle và HTTP resource smoke check được chạy trong lần triển khai. Không có trình duyệt kết nối để kiểm hình ảnh/Pointer Lock trong phiên này; chưa có test máy thật hoặc số đo VALORANT được cung cấp. Cần hoàn tất kiểm thiết bị trước khi tuyên bố matched sensitivity hay thu dataset nghiên cứu có độ tin cậy.
