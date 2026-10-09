# Rà soát dữ liệu cho AI cải thiện aim — 09/09/2026

## Kết luận

App đã có bộ thu telemetry và desktop tự lưu JSON khi kết thúc phiên. Ưu tiên tiếp theo là kiểm đúng phép đo, chuẩn hóa dữ liệu theo người/ngày, và thu kết quả trước–sau bài tập. Chưa có bằng chứng trong phần đã kiểm rằng một mô hình huấn luyện đang cải thiện aim. Tăng số map hoặc độ phức tạp bot chưa giải quyết khoảng thiếu này.

Phạm vi: đọc mã nguồn hiện tại, tài liệu nghiên cứu và thống kê 52 JSON tại `C:/Users/DungLe/AppData/Roaming/V-AIM COACH/sessions`. Không xác minh ai đã chơi, không coi mọi file là phiên nghiên cứu hợp lệ, không chạy lại gameplay hoặc thay đổi mã ứng dụng. Workspace có nhiều thay đổi đang phát triển; phát hiện mã nguồn áp dụng cho bản hiện tại, không mặc định cho mọi bản cũ.

## Dữ liệu thực tế đã lưu

| Chỉ mục | Kết quả |
|---|---:|
| File phiên đọc được | 52 |
| Tổng thời gian chơi được log | 1.669.790,7 ms ≈ 27,8 phút |
| Frame | 184.473 |
| Input events | 110.851 |
| Phát bắn | 1.545 |
| Trial | 410 |
| Hoàn tất / kết thúc sớm | 21 / 31 |
| Phiên có player_id hoặc playerId | 0 |
| Sensitivity | 0,3 ở cả 52 phiên |
| rawVerified | false ở cả 52 phiên |
| exerciseVersion khác nhau | 9 |

Phân bố task: attack 19, site 10, retake 6, readmove 5, precision 4, vertical 3, reactive 2, survival 2, counter 1. Không có task tracking/orbit trong các file này. Các phiên combat có thể dùng trial cho cả nhóm địch, nên 410 trial không tương đương 410 lần aim độc lập đồng nhất. Kết thúc sớm không tự động là dữ liệu hỏng: phải phân biệt bị hạ gục, người dùng dừng và lỗi kỹ thuật.

`main.js` ghi config, chuột dx/dy, camera yaw/pitch, target, errorDeg/onTarget, frame interval, shot/trial, một số trạng thái player/combat. `finish()` gọi desktop `saveSession`; `desktop/main.cjs` ghi JSON qua file tạm rồi rename. localStorage chỉ giữ tối đa 30 bản tóm tắt/phân tích; bản web cần xuất JSON để giữ đầy đủ phiên. Chưa có checkpoint định kỳ trong đường lưu đã kiểm, nên vẫn cần xử lý app đóng/crash giữa phiên.

## Những chỗ cần sửa trước khi dùng dữ liệu train

### P0 — Phép đo và định nghĩa event

1. **Tọa độ lệch tâm khi di chuyển:** `charts.js:aimOffset` và bản tương tự trong `chart-coaching.js` giả định camera ở `(0,1.6,0)`. Chúng dùng target world position mà không trừ camera position. Heatmap/aimX/aimY có thể sai khi đi lại, nhảy hoặc crouch. Ví dụ camera `(10,1.6,0)`, target `(10,1.6,-20)`, yaw/pitch 0 phải có lệch ngang 0°, nhưng công thức hiện tại cho khoảng −26,6°. Sửa bằng vector target−camera tại đúng thời điểm; log camera position thật. `errorAngleAt` có trừ camera position, nên không kết luận mọi angular metric đều sai.
2. **Nhiều địch:** `syncCombatFocusTarget()`/`combatEnemySnapshot()` chọn địch sống đầu tiên; `isHit()` có thể trúng một địch khác. Vì vậy errorDeg và onTarget trong cùng frame có thể nói về hai mục tiêu khác nhau. Cần log danh sách target ID, hitbox, trạng thái che khuất; gắn shot với hit target ID, tách target được bài tập chỉ định với target thực sự trúng. Với miss, không tự đoán ý định người chơi.
3. **Trial combat:** `hitMs` có thể là lúc tiêu diệt hết nhóm địch, không phải thời gian tới hit đầu tiên. Tách encounter/wave, target acquisition, first damage và elimination. Không gộp metric này với precision một target.
4. **Click và fire:** ngoài Site, nhánh quá deadline return trước khi thêm shot. Input chuột hiện không lưu riêng button down/up. Muốn phân tích bấm sớm/muộn cần ghi click kể cả khi game không bắn, lý do bị chặn, fire riêng, key release và vận tốc tại shot. Sửa bất nhất với tài liệu thí nghiệm vốn yêu cầu giữ sự kiện sau deadline.
5. **Clock và input:** `inputEvents.t` là thời gian do handler/app tính, chưa có source timestamp và sequence riêng. Bổ sung `event.timeStamp`, receive monotonic time, sequence, pause mapping và semantics. Không gọi browser deltas là sensor raw counts đã kiểm chứng; chính config đang ghi `rawVerified:false`. Kiểm gain/cm360 và độ ổn định timestamp trên máy thật trước khi suy diễn vận tốc/jerk.

Pointer Lock có tùy chọn yêu cầu unadjusted movement, nhưng tương thích và hành vi cần kiểm; tham khảo [MDN Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API). Việc API chấp nhận yêu cầu không thay thế kiểm chất lượng collector.

### P0 — Chuyển log thành dataset có thể truy nguyên

- Bổ sung player ID giả danh ổn định, session/day/block/trial/target ID; đánh dấu phiên test hoặc nghiên cứu, consent cho thu và dùng để train khi tuyển người.
- Thêm build hash, config hash, schema/extractor version, clock units, source checksum; tách schema app 0.3 khỏi schema nghiên cứu 0.1 bằng adapter rõ ràng. Không ép null thành nhãn có thật để qua validator.
- Device/setup: DPI tự khai hay hiệu chuẩn, sensitivity/gain thực, FOV, viewport, display Hz, frame-time distribution, thiết bị và polling rate nếu đo được; cho phép unknown.
- Validator kiểm join, thời gian, target identity, chất lượng frame/input, missing reason, duplicate và eligibility. `qualityClean` hiện là cờ UI sơ bộ, không phải chứng nhận đủ điều kiện train.
- Giữ raw bất biến; feature/label xuất theo version. Thêm checkpoint, manifest và công cụ nhập hàng loạt JSON. Đánh giá riêng khả năng tái tính metric cho log cũ, vì không thể khôi phục sự kiện chưa từng được ghi.

## Cần thu thêm gì để AI biết cách giúp người chơi tiến bộ?

| Nhóm dữ liệu | Trường/nhãn cần có | Mục đích |
|---|---|---|
| Baseline cá nhân | Người, ngày, bài cố định, size/offset/speed, setup, đủ hit/miss/timeout | Biết mức hiện tại và biến động tự nhiên |
| Quỹ đạo aim | Camera/target theo thời gian, signed angular error, target width, first visible, motor onset, first entry, click/fire | Phân biệt quá đà, thiếu đà, chỉnh nhiều lần, giữ tâm chưa ổn |
| Movement-shot | Key events, velocity, crouch/jump, weapon, recoil contribution, shot target | Tách chuyển động/cơ chế súng khỏi thao tác chuột |
| Can thiệp luyện tập | Điểm yếu quan sát, bài được giao, lý do, difficulty, liều tập đề xuất/thực tế, mức hoàn thành | Biết người chơi đã thực hiện hành động nào |
| Kết quả tương lai | Bài đánh giá chuẩn trước/sau, lần đo ngày sau, fatigue và nhóm đối chứng | Học và kiểm hiệu quả của coaching |
| Sens experiment riêng | Assigned/actual gain, thứ tự điều kiện, warm-up, adaptation, ngày validation | Kiểm nên thử sens nào, khi đã đủ phép đo |

Nhãn khởi đầu nên là quan sát kiểm được: overshoot/undershoot theo quy tắc có version, số correction vượt noise floor, first-shot success, thời gian vào target, dwell và tracking error. Không dùng “sens quá cao”, “aim kém” hoặc “bài X chắc chắn tốt nhất” làm nhãn từ một phiên.

Coaching outcome là khoảng thiếu quan trọng nhất: dữ liệu input→hit/miss chỉ cho biết điều gì xảy ra; chưa trả lời bài tập nào giúp cải thiện. Cần lưu chuỗi **baseline → đề xuất → thực hiện → đánh giá lại**, và so với luyện theo lịch cố định có thời lượng tương đương. Giữ sens ổn định ở thử nghiệm bài tập đầu để không thay đồng thời quá nhiều yếu tố.

## Kế hoạch triển khai đề xuất

1. **Sửa P0 và kiểm 1 phiên:** camera/target geometry, event identity, click/fire, adapter và QA. Đối chiếu khoảng 100 event với trạng thái engine/replay; dùng các ca di chuyển, nhiều target và timeout để kiểm sai số.
2. **Pilot đo lường:** 3–5 người, ít nhất hai ngày, khoảng 500–1.000 aim event tổng. Chọn ít bài: precision/micro-adjustment, flick/transfer, tracking; giữ movement-shot thành bài riêng. Đây là mức khởi đầu để phát hiện lỗi collector, không phải ngưỡng đảm bảo đủ train.
3. **Coach bằng luật có bằng chứng:** hồ sơ điểm yếu, một bài ưu tiên, liều tập và tiêu chí đo lại. UI hiển thị evidence, coverage, độ chắc chắn và “chưa đủ dữ liệu” khi cần.
4. **Thu thí nghiệm hiệu quả bài tập:** đánh giá trước, tập theo can thiệp hoặc lịch đối chứng, đánh giá ngày sau bằng bài/seed chưa tập nhưng cùng độ khó. Quy mô tiếp theo quyết định từ biến động giữa người và giữa ngày trong pilot.
5. **Train baseline nhỏ:** dự đoán performance hoặc xếp hạng bài tập từ lịch sử được phép dùng. So với baseline theo người/bài và coach luật. Chưa cần fine-tune LLM để tính metric; LLM nếu dùng chỉ diễn giải kết quả đã kiểm.
6. **Kiểm test đúng:** giữ riêng người chưa thấy và phiên tương lai; không chia ngẫu nhiên frame cùng phiên sang train/test. Scaler/feature selection chỉ fit trên train. [scikit-learn: grouped/time-series validation](https://scikit-learn.org/stable/modules/cross_validation.html), [data leakage](https://scikit-learn.org/stable/common_pitfalls.html).
7. **Kiểm chuyển giao VALORANT:** sau khi controlled measurement ổn, thu POV gốc có đồng ý, annotate target/visibility/shot theo độ chắc chắn. Cải thiện trong app chưa tự chứng minh cải thiện trong VALORANT.

Metric chính đề xuất cho bài bắn một mục tiêu: tỷ lệ first shot hit trước deadline cố định theo difficulty; giữ mọi trial bắt đầu và phân loại lỗi kỹ thuật riêng. Báo thêm hit rate/thời gian để thấy đánh đổi tốc độ–độ chính xác. Tracking dùng time-on-target và RMS theo thời gian riêng. Đánh giá coaching bằng thay đổi ở bài kiểm ngày sau so với control; không chỉ bằng điểm tăng ngay trong bài vừa luyện.

## Tận dụng nghiên cứu cũ

Theo audit đã lưu ngày 07/09, repo có sample/metadata OSF, Aim-and-Shoot và các nguồn detection, chưa phải một corpus đầy đủ đã chuẩn hóa. Dùng chúng theo vai trò đã ghi trong `research/03_datasets.md`: kiểm metric/adapter, bổ sung task động, hoặc hỗ trợ detector. Chưa kiểm lại trạng thái truy cập/license các nguồn này trong lần rà soát hiện tại. Không dùng số lượng ảnh detection thay cho dữ liệu hiệu quả luyện tập cá nhân.

Tài liệu README còn ghi chưa có dataset participant mới; nay đã có log desktop cục bộ, nhưng thiếu identity/protocol nên chưa thể gọi đó là dataset participant nghiên cứu đã xác minh. Cần phân biệt hai trạng thái này trong tài liệu sản phẩm.
