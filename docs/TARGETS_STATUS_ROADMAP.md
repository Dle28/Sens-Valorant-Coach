# Sens Valorant Coach — mục tiêu, hiện trạng và định hướng phát triển

> Cập nhật ngày 07/09/2026. Phiên bản ứng dụng đối chiếu: **v0.3.0**. Commit triển khai được kiểm tra: **f7642cf21eccaee1e6186eb8951d88d410ed1a2b**.
>
> Tài liệu này mô tả những gì đã có bằng chứng trong mã nguồn và bản build, những phần còn cần xác minh và backlog đề xuất. Các mốc tương lai chưa phải cam kết ngày phát hành hoặc kết quả nghiên cứu đã đạt.

## 1. Mục tiêu tổng thể

**Xây dựng ứng dụng desktop Windows giúp người chơi VALORANT luyện aim có kiểm soát, hiểu kết quả từng phiên và từng bước tìm được thiết lập sensitivity phù hợp với chính mình.**

Tên repository là **Sens Valorant Coach**; tên cửa sổ và gói ứng dụng hiện tại là **Gamesen Aim Lab**. Sản phẩm bắt đầu từ phòng tập 3D trên web, sau đó chuyển sang desktop để chạy độc lập và lưu dữ liệu tại máy. Hai bản hiện dùng chung phần bài tập và phân tích.

Câu hỏi cần trả lời theo thứ tự:

1. Người chơi thực hiện bài ngắm như thế nào: trúng bao nhiêu, mất bao lâu, bỏ lỡ bao nhiêu target?
2. Phép đo có đúng và đủ ổn định để so sánh giữa các phiên không?
3. Người chơi nên luyện bài nào tiếp theo dựa trên dữ kiện đang có?
4. Khi thay đổi sens, kết quả có tốt hơn so với giữ sens cũ trên những ngày tiếp theo không?
5. Cải thiện trong phòng tập có chuyển sang tình huống VALORANT thực tế không?

Bản hiện tại đã triển khai nền tảng cho câu hỏi 1 và gợi ý sơ bộ cho câu hỏi 3. Câu hỏi 2 chưa được xác nhận bằng thử nghiệm thiết bị/người chơi có kiểm soát. Câu hỏi 4–5 là định hướng nghiên cứu, chưa có kết quả.

## 2. Quyết định phạm vi đã chốt

| Chủ đề | Quyết định hiện tại | Ý nghĩa triển khai |
|---|---|---|
| Năng lực ưu tiên | Aim và sensitivity | Chưa mở rộng sang coach chiến thuật toàn diện |
| Nền tảng | Windows x64 là chính | Có `.exe` portable; Linux phục vụ phát triển và smoke test |
| Môi trường đo đầu tiên | Mini-game 3D với bài tập kiểm soát | Có vị trí target, hitbox và sự kiện do app tạo |
| Sens | Nhập đúng con số hip-fire đang dùng trong VALORANT | Áp dụng preset trực tiếp, không bắt người chơi đo quãng đường |
| Ảnh hưởng hệ điều hành | Yêu cầu chuyển động chuột chưa qua xử lý của OS | Chặn fallback sang input thường khi yêu cầu thất bại |
| DPI | Nhập tay hoặc dùng tiện ích ước lượng tùy chọn | Chưa đọc DPI firmware; số nhập không đổi phần cứng |
| Phân tích | Sau phiên, có số liệu và gợi ý | Chưa có trợ lý can thiệp khi đang chơi VALORANT |
| Lưu trữ | Cục bộ, chạy offline | Chưa cần tài khoản, backend hoặc đồng bộ cloud |
| Đánh giá sens | So với baseline cá nhân, có điều kiện | Chưa tự chọn một con số “sens tối ưu” |

Không đưa lại phép đo bằng thước vào luồng bắt buộc của người chơi. Nếu đội phát triển cần đối chiếu vật lý để kiểm định input, đó là công việc QA nội bộ, tách khỏi thao tác sử dụng thông thường.

## 3. Cách đọc trạng thái

| Nhãn | Định nghĩa |
|---|---|
| **Đã triển khai** | Có mã và đường sử dụng trong ứng dụng |
| **Đã kiểm tra tự động** | Có test/build/smoke hoặc kiểm artifact cụ thể |
| **Cần xác minh thực tế** | Có triển khai nhưng thiếu kiểm thiết bị, gameplay hoặc người dùng thật |
| **Chưa triển khai** | Mới có định hướng hoặc đặc tả |
| **Ngoài phạm vi hiện tại** | Chủ động chưa đưa vào vòng phát triển này |

Một tính năng có thể vừa “đã triển khai” vừa “cần xác minh thực tế”. Build `.exe` thành công không chứng minh input chính xác, và test metric pass không chứng minh người chơi cải thiện kỹ năng.

## 4. Những phần đã làm

### 4.1. Ứng dụng và phát hành

| Hạng mục | Hiện trạng | Bằng chứng |
|---|---|---|
| Phòng tập 3D | Đã triển khai Three.js, camera FPS, target cầu, raycast và hitbox | [main.js](../aim-lab/src/main.js) |
| Desktop độc lập | Electron 44.2.0, tải tài nguyên nội bộ, không cần HTTP server | [desktop/main.cjs](../aim-lab/desktop/main.cjs) |
| Windows portable | Đã tạo `.exe` v0.3.0 khoảng 95 MiB | [Release v0.3.0](https://github.com/Dle28/Sens-Valorant-Coach/releases/tag/v0.3.0) |
| Build trực tiếp trên Windows CI | Đã pass và tải artifact của workflow | [Windows packaging run](https://github.com/Dle28/Sens-Valorant-Coach/actions/runs/34133251530) |
| GitHub repository | Đã tạo repo private, push main và tag v0.3.0 | [Repository](https://github.com/Dle28/Sens-Valorant-Coach) |
| Kiểm thử đa nền tảng | 31 unit tests và build pass trên Windows/Linux | [Quality run](https://github.com/Dle28/Sens-Valorant-Coach/actions/runs/34132745192) |
| Smoke desktop Linux | Electron chạy, cầu nối desktop hoạt động, render frame WebGL đầu tiên | [Hướng dẫn và mô tả kiểm tra](../aim-lab/DESKTOP.md) |
| Rà soát độc lập | Luna đã chạy lại test/build/smoke; chưa tìm thấy lỗi chặn bàn giao trong phạm vi rà soát | Kết quả kiểm tra trong phiên bàn giao; chưa có báo cáo reviewer riêng trong repo |

Gói `.exe` được đính kèm Release ban đầu build từ Linux. Workflow Windows tạo một artifact riêng; không mặc định coi hai file binary có checksum giống nhau hoặc coi artifact Windows đã thay thế file Release.

### 4.2. Bảy bài tập

| Bài | Cách hoạt động hiện tại | Năng lực hướng tới | Giới hạn |
|---|---|---|---|
| Precision | Target tĩnh, khoảng chuyển nhỏ | Đưa tâm và dừng chính xác | Chưa phân rã chuyển động chính và correction |
| Transfer | Target tĩnh, góc chuyển rộng hơn Precision | Chuyển mục tiêu nhanh và đúng | Chưa mô phỏng chọn mục tiêu giữa nhiều đối thủ |
| Tracking | Target chuyển động theo quỹ đạo liên tục | Duy trì tâm trên target | Quỹ đạo tổng hợp, chưa tương đương di chuyển đối thủ |
| Micro adjustment | Target nhỏ xuất hiện quanh hướng nhìn hiện tại | Chỉnh tâm khoảng nhỏ | Không suy từ kết quả ra lỗi sens quá cao/thấp |
| Wide flick | Target luân phiên trái/phải ở góc rộng | Flick và ổn định sau chuyển góc | Chưa mô phỏng quay người trong giao tranh |
| Head-line | Các target có cùng cao độ | Di chuyển tâm theo phương ngang | Target cầu không phải head hitbox thật |
| Moving click | Target di chuyển ngang trong từng trial | Canh thời điểm bắn mục tiêu động | Chưa có strafe/recoil/weapon accuracy |

Có ba mức độ khó và thời lượng 30/60/90 giây. Cần tiếp tục kiểm khả năng nhìn target, bố cục, độ khó và nhịp xuất hiện trên máy Windows thật trước khi coi bộ bài là benchmark chuẩn.

### 4.3. Ba thử thách

| Thử thách | Mục tiêu hiện tại |
|---|---|
| 20 hit sạch | Precision, 30 giây, ít nhất 20 hit và accuracy ≥90% |
| Chuyển góc chính xác | Wide flick, 60 giây, ít nhất 35 hit và accuracy ≥80% |
| Bám đuổi 60 giây | Tracking, 60 giây, time-on-target ≥60% |

Thử thách dùng cấu hình và seed cố định. Điều kiện xét bao gồm hoàn tất thời lượng, không tạm dừng, không frame >100ms và không input fallback; Tracking cần ít nhất 90% thời lượng có dữ liệu hợp lệ. Đây là quy tắc prototype khá chặt, cần xem lại bằng dữ liệu sử dụng thực tế.

Các ngưỡng không tương ứng rank Iron/Radiant, percentile cộng đồng hay chuẩn năng lực đã kiểm định. Cùng seed lặp lại chuỗi target nhưng thời điểm spawn vẫn chịu ảnh hưởng tốc độ hoàn thành của người chơi.

### 4.4. Sensitivity và input

Công thức hiện tại:

```text
Góc xoay = movementX/Y × sensitivity × 0.07 độ

eDPI = DPI × sensitivity
cm/360 preset = 914.4 / (DPI × sensitivity × 0.07)
```

- Camera dùng preset 103° ngang trong khung 16:9; chưa có ADS hoặc scope multiplier.
- Không nhân thêm DPI vào góc xoay; chuyển động nhận từ chuột đã phản ánh thiết bị.
- Hệ số bù thủ công đã bị loại khỏi luồng sử dụng; `inputGain: 1` còn trong metadata để phân biệt với phiên cũ.
- Pointer Lock yêu cầu `unadjustedMovement: true`; API không hỗ trợ/từ chối hoặc không trả xác nhận Promise sẽ chặn bắt đầu phiên.
- Mục đích là bỏ xử lý chuột của hệ điều hành khi runtime hỗ trợ; app không sửa setting toàn hệ thống.
- Chấp nhận Promise không chứng minh độc lập sensor counts hoặc độ khớp 1:1 với VALORANT.
- Chưa có module Windows `WM_INPUT` riêng. Electron vẫn dùng Chromium để nhận input.

Cơ sở nghiên cứu và lịch sử quyết định: [đối chiếu sensitivity](../research/07_sensitivity_matching.md). Các hướng dẫn đo thủ công cũ trong tài liệu đó là lịch sử nghiên cứu, không phải yêu cầu thao tác hiện tại.

### 4.5. Phân tích sau phiên

Đã triển khai phân tích theo quy tắc trong [training.js](../aim-lab/src/training.js):

1. Nêu kết quả đo được: hit/miss, accuracy, timeout, trúng phát đầu trước deadline, trung vị thời gian tới hit.
2. Với Tracking: time-on-target, RMS sai số góc và diễn biến hai nửa phiên nếu đủ thời gian quan sát.
3. Gợi ý bài nên tập tiếp và thao tác luyện cụ thể.
4. Báo chất lượng dữ liệu: ít mẫu, kết thúc sớm, tạm dừng, frame chậm hoặc input không phù hợp.
5. So sánh mô tả với phiên gần nhất có cấu hình tương thích.
6. Hiển thị đạt/chưa đạt/chưa xét thử thách và nút chọn bài tiếp.

Các ngưỡng đang dùng là heuristic của dự án: bài bắn cần ít nhất 10 target và 10 phát để nhận xét; Tracking cần ít nhất 10 giây hợp lệ. Accuracy <75% gợi ý ưu tiên precision; tỷ lệ timeout >20% trong nhánh đủ accuracy gợi ý luyện acquisition/transfer. Chưa có validation cho hiệu quả coaching của các ngưỡng này.

Trung vị tới hit chỉ tính trên các trial trúng, phải đọc cùng hit rate/timeout. Thời gian từ first entry tới hit có thể gồm chỉnh tâm và chờ bắn; chưa phải phép đo correction thuần túy. App chưa dùng LLM hay model ML để tạo nhận xét.

### 4.6. Dữ liệu và lưu trữ

| Loại dữ liệu | Đã có | Chưa có |
|---|---|---|
| Telemetry phiên | Config, seed, inputEvents, frames, shots, trials, pauses, summary, analysis | Timestamp cảm biến phần cứng và photon/display latency |
| Profile | Nhớ sens và DPI gần nhất | Đọc profile firmware chuột |
| Lịch sử | Tối đa 30 tóm tắt, xem lại nhận xét của phiên app tạo | Kho lịch sử toàn bộ phiên có tìm kiếm/lọc nâng cao |
| File đầy đủ | Desktop tự lưu JSON vào userData/sessions | Chính sách retention, quota và backup tự động |
| Chuyển từ web | Export/import tóm tắt, gộp ID | Khôi phục quỹ đạo không được lưu hoặc tự dựng lại phân tích thiếu dữ liệu |
| Hợp đồng nghiên cứu | Có schema và record minh họa | Adapter session v0.2 sang schema nghiên cứu hoàn chỉnh |
| Dataset công khai | Có audit nguồn, manifest và một số sample/bảng đã tải | Dataset tự thu đạt chuẩn, pipeline train/eval và model đã train |

Người dùng đã báo có chơi thử. Điều đó chưa xác định số phiên, số trial, người tham gia hoặc chất lượng dataset: dữ liệu localStorage/file phiên trên máy người chơi chưa được kiểm kê trong lần cập nhật tài liệu này. Không gọi các bản ghi nghiên cứu công khai là dữ liệu người chơi của dự án.

## 5. Trạng thái từng target nghiên cứu

Mã A1–A6/S1 kế thừa [target nghiên cứu gốc](../research/01_targets.md).

| Target | Mục đích | Hiện trạng v0.3.0 | Còn thiếu để kết luận đáng tin cậy |
|---|---|---|---|
| A1 — Initial alignment | Đo góc lệch khi target xuất hiện | Có `initialErrorDeg` trên trial của bài bắn | Chuẩn hóa theo kích thước target, báo phân bố theo scenario, đối chiếu geometry |
| A2 — Acquisition | Đo tốc độ đi kèm độ chính xác | Có shot/hit/timeout, first-shot success, median time-to-hit | Kiểm thời gian thực, phân bố thay vì chỉ trung vị, định nghĩa censoring/interruption rõ hơn |
| A3 — Stopping/correction | Xác định dừng quá/thiếu và sửa tâm | Có quỹ đạo input/camera để nghiên cứu; chưa có detector hoàn chỉnh | Định nghĩa primary segment, signed endpoint, correction boundary và gold annotation |
| A4 — Click timing | Phân tích lúc vào target và lúc bắn | Có first entry/first shot và khoảng thời gian liên quan | Entry/exit đầy đủ, phân biệt correction với chờ bắn, kiểm event/frame timing |
| A5 — Dynamic robustness | Kiểm độ ổn định với target động | Có Tracking RMS/time-on-target, Moving click và các bài chuyển góc | Phân tích reacquisition, recovery sau miss, task motion đa dạng và validation |
| A6 — Movement–shot | Phối hợp di chuyển nhân vật và bắn | Chưa triển khai | Mô hình velocity, phím di chuyển, accuracy theo movement và ground truth |
| S1 — Sens response cá nhân | Chọn mức sens có lợi trong phiên tương lai | Có nhập sens, ±10% và lịch sử; chưa có thí nghiệm tự động | Randomization, warm-up, crossover nhiều ngày, CI và validation tương lai |

Không đổi nhãn “đã có telemetry” thành “đã hoàn thành target”. Đặc biệt A3 và S1 chưa được giải quyết chỉ nhờ có quỹ đạo hoặc nút ±10%.

## 6. Công việc đang ở giai đoạn hiện tại

**Giai đoạn dự án: prototype có thể phát hành thử → kiểm chứng vận hành và phép đo trên Windows.**

Tại thời điểm viết, các workflow kiểm tra được đối chiếu đều đã hoàn tất; không có study hoặc tác vụ train nào được ghi nhận đang chạy. “Đang làm” ở đây là hướng công việc hiện tại của dự án, không có nghĩa mọi dòng backlog đã có người thực hiện.

| Việc cần tiếp tục ngay | Trạng thái | Kết quả cần bàn giao |
|---|---|---|
| Kiểm Windows máy thật | Chưa hoàn tất | Biên bản mở app, input, fullscreen, pause/resume, xuất/lưu file, restart |
| Kiểm telemetry so với thao tác | Có test công thức; thiếu xác minh thực tế | Tập phiên QA kèm expected events và báo lệch |
| Rà soát thuật ngữ phân tích | Có nhận xét rule-based | Mỗi nhận xét gắn bằng chứng, không gán sai nguyên nhân |
| Chuẩn hóa dữ liệu phiên | Có format JSON riêng | Version, validator và adapter sang hợp đồng nghiên cứu |
| Tập hợp feedback chơi thử | Người dùng đã báo chơi thử; chưa có log đối chiếu | Danh sách lỗi có phiên, cấu hình, cách tái hiện |

## 7. Lộ trình đề xuất theo điều kiện hoàn thành

### M0 — Đóng nền tảng Windows v0.3.x

**Mục tiêu:** người dùng mở app và hoàn tất phiên an toàn về dữ liệu, lặp lại được các thao tác cơ bản.

Backlog:

- Kiểm toàn bộ 7 bài, hoàn tất đủ thời lượng và kết thúc sớm.
- Kiểm Esc, resume, mất focus, alt-tab, fullscreen, đổi màn hình.
- Kiểm yêu cầu input thất bại có báo rõ và không tự chuyển sang input thường.
- Kiểm sens/profile giữ sau restart; JSON đầy đủ thực sự có trên đĩa và mở được.
- Kiểm lưu thất bại, thiếu dung lượng/quyền ghi, import file sai và history trùng ID.
- Ghi OS, màn hình, chuột, DPI, sens, bản app và trạng thái input trong báo cáo QA.

**Điều kiện hoàn thành đề xuất:** tất cả tình huống bắt buộc có kết quả pass/fail và cách tái hiện; không còn lỗi crash, mất phiên hoặc ghi sai config đã biết. Danh sách này cần được chốt trước khi mở vòng QA, không đánh dấu hoàn tất chỉ bằng CI build.

### M1 — Đo đáng tin cậy và dữ liệu có thể kiểm tra

**Mục tiêu:** có một session mà từng chỉ số có thể lần ngược tới event và điều kiện tạo nó.

Backlog:

- Xây validator riêng cho session app, kiểm unit, timestamp đơn điệu, liên kết trial/shot/frame.
- Lưu target radius, geometry, version scenario và input policy đủ để replay/đối chiếu.
- Ghi đầy đủ sự kiện không đủ điều kiện hoặc sau deadline vào log chẩn đoán thay vì chỉ bỏ khỏi scoring.
- Chuẩn hóa hành vi trial pending khi pause/end; phân biệt timeout, no-shot, interrupted.
- Thêm adapter sang schema nghiên cứu; giữ file nguồn và version chuyển đổi.
- Thêm màn xem lại trial/quỹ đạo, trước hết read-only trên JSON đã lưu.

**Điều kiện hoàn thành đề xuất:** kiểm tay ít nhất 100 events theo protocol đã khóa; báo mismatch và sai số thời gian/geometry. Con số 100 là quy mô QA khởi điểm, chưa phải chứng minh đầy đủ độ chính xác.

### M2 — Phân tích aim sâu hơn, có giải thích

**Mục tiêu:** giải thích cơ chế thao tác thay vì chỉ báo score.

Backlog:

- A3: phân đoạn chuyển động chính/correction với ngưỡng có version.
- A4: entry/exit intervals, dwell trước shot, click khi tâm ngoài target.
- Phân tích theo kích thước target, offset, hướng và tốc độ target.
- Phân biệt dữ liệu insufficient với giá trị bằng 0.
- Mỗi nhận xét có số mẫu, metric và ít nhất một trial minh họa có thể mở lại.
- Giữ ngôn ngữ “quan sát thấy” và “giả thuyết cần thử”, không tự quy lỗi cho sens.

**Điều kiện hoàn thành:** detector được đối chiếu với gold events; sai số nằm trong budget do dự án khóa trước. Nếu chưa đủ, tiếp tục báo metric thô thay vì đưa chẩn đoán mạnh hơn.

### M3 — Đánh giá lặp lại và thử nghiệm sens cá nhân

**Mục tiêu:** biết biến thiên tự nhiên của người chơi trước khi nói sens mới tốt hơn.

Backlog:

- Baseline cùng người qua ít nhất hai ngày theo protocol.
- Tách warm-up khỏi scored trials; có thời gian nghỉ.
- Khởi đầu với các mức 0.9×, 1.0×, 1.1× sens hiện tại nếu phù hợp pilot.
- Randomize/counterbalance thứ tự, ghi seed, block và day.
- Phân tích paired contrasts theo người/ngày/block; không coi mỗi frame là mẫu độc lập.
- Khóa candidate từ discovery, đánh giá ở ngày chưa dùng để chọn candidate.

**Điều kiện hoàn thành:** có báo cáo độ lặp lại và uncertainty, sau đó mới xét lợi ích sens. Các mức sens và số ngày là đề xuất thiết kế; không phải lời khuyên đổi sens cho mọi người.

Kết quả hợp lệ có thể là `INSUFFICIENT_EVIDENCE`, `NO_CLEAR_DIFFERENCE`, hoặc `TEST_CANDIDATE`. Không bắt buộc hệ thống phải trả một “best sens”.

### M4 — Chuyển giao sang VALORANT thực tế

**Mục tiêu:** kiểm tra kỹ năng phòng tập có liên quan đến gameplay gốc trong phạm vi đo được.

Backlog:

- Thu original POV của cùng người với quyền sử dụng rõ ràng.
- Bắt đầu Range/Deathmatch trước tình huống Competitive phức tạp.
- Định nghĩa event đủ visibility và nhãn gold; kiểm sai số trước model.
- Tách ảnh hưởng movement, recoil, weapon, đối thủ và tactical context khỏi aim.
- K/D, HS% hoặc rank chỉ là chỉ số phụ, không thay endpoint cơ học.

**Điều kiện hoàn thành:** phép đo trên gameplay có validation riêng, so sánh trên dữ liệu tương lai và báo đúng phạm vi. Chỉ dùng cụm “cải thiện trong VALORANT” sau bước này.

### M5 — Hoàn thiện sản phẩm để phân phối rộng hơn

Sau khi nền tảng vận hành ổn, xem xét:

- Đồng bộ tên hiển thị thành Sens Valorant Coach nếu người dùng muốn bỏ tên Gamesen Aim Lab.
- Installer, ký số, version/update và migration dữ liệu.
- Quản lý dung lượng, backup/export toàn bộ phiên và khôi phục dữ liệu.
- Trải nghiệm onboarding ngắn, accessibility, tùy chỉnh crosshair và feedback âm thanh.
- Bộ thử thách tiến triển và routine cá nhân dựa trên metric đã kiểm định.
- Tài khoản/cloud chỉ khi có nhu cầu rõ, có thiết kế quyền riêng tư và retention.

Các hạng mục này chưa được triển khai chỉ vì đã có repository hoặc file `.exe`.

## 8. Định hướng dataset

### 8.1. Vai trò từng nguồn

| Nguồn | Vai trò phù hợp | Không được mặc định |
|---|---|---|
| Dataset công khai đã audit | Học cấu trúc, kiểm parser, đối chiếu phương pháp và làm baseline khi license cho phép | Là dữ liệu VALORANT hoàn chỉnh hoặc ground truth sens tối ưu |
| Phiên mini-game tự thu | Input/target ground truth có kiểm soát, nghiên cứu A1–A5 và S1 | Tự động đại diện cho giao tranh thật |
| POV VALORANT có quyền dùng | Kiểm transfer và tính phù hợp scenario | Suy raw mouse counts từ pixel hoặc tự có nhãn nguyên nhân |
| Synthetic/test fixtures | Test code, lỗi biên, serialization | Là participant hoặc bằng chứng hiệu quả coaching |

Chi tiết nguồn và license: [dataset audit](../research/03_datasets.md). Cần đọc trạng thái truy cập từng nguồn; “đã kiểm manifest”, “đã tải sample” và “được phép train/phân phối” là các trạng thái khác nhau.

### 8.2. Dataset tối thiểu cần tự xây

Đề xuất cấu trúc logic:

```text
participant (mã ẩn danh, quyền sử dụng)
  → device/input/display profile
  → day/session (app version, scenario version)
  → block/condition (sens, thứ tự, warm-up hay scored)
  → trial (target geometry, timing, outcome)
  → shots + input events + frames
  → QA flags + derived metrics + analysis version
```

Chưa có registry participant, consent flow, chia tập theo người/ngày hoặc bộ dataset mới được xác nhận trong dự án hiện tại. Cần hoàn thiện trước khi dùng dữ liệu người khác cho training.

Không split ngẫu nhiên các frame cùng phiên sang train/test. Với đánh giá tổng quát hóa phải tách theo người; với cá nhân hóa phải giữ ngày/phiên tương lai chưa dùng để chọn candidate.

### 8.3. Thứ tự model

1. Bắt đầu với công thức, validator, thống kê mô tả và quy tắc giải thích được.
2. Thêm mô hình thống kê phù hợp cấu trúc người/ngày/block khi dữ liệu đủ.
3. Chỉ thêm ML nếu thắng baseline trên cùng split và metric.
4. LLM có thể hỗ trợ diễn đạt báo cáo về sau, nhưng không được tạo số liệu, tự bù missing hoặc thay phép kiểm định.

## 9. Backlog ưu tiên ngắn hạn

Các owner dưới đây là **vai trò cần có**, chưa phải nhân sự đã được phân công hoặc tác vụ đang chạy.

| ID | Ưu tiên | Việc | Vai trò | Phụ thuộc | Đầu ra kiểm được |
|---|---|---|---|---|---|
| W01 | P0 | QA Windows thực tế | Người kiểm máy Windows | Có máy/chuột và bản build | Biên bản test, version và lỗi tái hiện |
| W02 | P0 | Test lưu file, restart và lỗi storage | Desktop developer + QA | W01 | File thật đối chiếu config/summary |
| D01 | P0 | Session validator và version contract | Data/application developer | Chốt trường dữ liệu | Report valid/invalid có lý do |
| D02 | P0 | Kiểm event/frame và deadline | Measurement developer | D01 | Bộ events QA và sai số |
| A01 | P1 | Trial review/replay | Application developer | D01, D02 | Mở lại trial từ JSON |
| A02 | P1 | Detector correction và click intervals | Research developer | A01 và gold events | Error report trên gold |
| S01 | P1 | Baseline nhiều ngày | Research + người chơi | M1 đủ tin cậy | Reliability report |
| S02 | P1 | Guided sens experiment | Application + research | S01 | Block ledger và randomized order |
| S03 | P1 | Future validation candidate | Research + người chơi | S02 | Effect + uncertainty trên ngày mới |
| N01 | P2 | Natural POV pilot | Data/CV + người gán nhãn | Quyền dữ liệu, M3 | Gold set và transfer diagnostics |
| R01 | P2 | Ký số/installer/update | Release developer | W01, W02 | Bản phân phối có quy trình cập nhật |

Không gán ngày hoàn thành cứng khi chưa biết cấu hình máy, thời gian người chơi, lỗi QA và quy mô dữ liệu. Mỗi milestone chỉ chuyển trạng thái sau khi có artifact đáp ứng điều kiện đã nêu.

## 10. Rủi ro, giới hạn và quyết định kỹ thuật tiếp theo

| Rủi ro | Tình trạng | Cách xử lý dự kiến |
|---|---|---|
| Sens có cảm giác khác VALORANT | Chưa xác nhận 1:1 | Kiểm input/viewport/fullscreen nội bộ; chỉ cân nhắc native input nếu có bằng chứng vấn đề |
| Có `.exe` nhưng tưởng đã có native engine | Electron vẫn dùng Chromium/Three.js | Ghi đúng kiến trúc; chưa quyết định chuyển Godot/Unity/engine khác |
| Phân tích tự tin hơn chất lượng đo | Rule thresholds chưa validation | Thêm evidence, sample count, QA và giới hạn kết luận |
| Lịch sử app khác lịch sử web | Đã có import summary | Giữ ID/provenance; không tạo lại dữ liệu thiếu |
| File JSON tăng dung lượng | Chưa retention tự động | Hiển thị dung lượng và quản lý lưu trữ trước thu dài hạn |
| Tối ưu cho aim trainer | Chưa transfer validation | Đánh giá gameplay gốc ở milestone riêng |
| Dataset rò rỉ giữa train/test | Chưa có pipeline train | Thiết kế split theo người/ngày trước model |
| Quyền sử dụng dữ liệu | License nguồn khác nhau | Manifest quyền và mục đích cho từng nguồn, không coi repo private là giấy phép |

Native Windows input là một phương án cần đánh giá, chưa phải lời hứa triển khai ngay. Quyết định phải dựa trên vấn đề đo được về input, effort tích hợp, bảo trì và lợi ích so với runtime hiện tại.

## 11. Tiêu chí thành công của dự án

### Ngắn hạn — app dùng được và dữ liệu không sai

- Người chơi Windows hoàn tất bài và đọc báo cáo mà không cần đo sens thủ công.
- Config trong file đúng với thiết lập thực sự dùng trong phiên.
- Mất focus/pause/end không làm lệch outcome hoặc mất dữ liệu không được báo.
- Các metric có đơn vị, mẫu số và điều kiện loại trừ rõ.

### Trung hạn — phân tích có thể tin và hành động được

- Chỉ số đủ lặp lại để phân biệt biến thiên tự nhiên với thay đổi có ý nghĩa.
- Nhận xét liên kết được tới event và bài tập tiếp theo.
- Candidate sens được đánh giá trên phiên tương lai, có accuracy guardrail và uncertainty.

### Dài hạn — giá trị cho người chơi VALORANT

- Có bằng chứng chuyển giao trên gameplay gốc trong phạm vi người/scenario đã thử.
- Người chơi hiểu khi nào nên giữ sens, khi nào thử candidate và khi nào dữ liệu chưa đủ.
- Giá trị sản phẩm được kiểm bằng sử dụng thực tế; chưa có claim giữ chân người dùng, tăng rank hoặc hiệu quả thị trường ở v0.3.0.

## 12. Tài liệu và điểm vào mã nguồn

| Cần tìm | Nơi đọc |
|---|---|
| Tổng quan và tải app | [README](../README.md), [Release](https://github.com/Dle28/Sens-Valorant-Coach/releases/tag/v0.3.0) |
| Chạy/build desktop | [DESKTOP.md](../aim-lab/DESKTOP.md) |
| Phần chơi và vòng đời phiên | [main.js](../aim-lab/src/main.js) |
| Công thức chỉ số | [metrics.js](../aim-lab/src/metrics.js) |
| Bài tập, thử thách, coaching | [training.js](../aim-lab/src/training.js) |
| Input chưa qua xử lý | [input.js](../aim-lab/src/input.js) |
| Desktop và lưu dữ liệu | [main.cjs](../aim-lab/desktop/main.cjs), [policy.cjs](../aim-lab/desktop/policy.cjs) |
| Target và điều kiện nghiên cứu | [01_targets](../research/01_targets.md) |
| Kiến trúc nghiên cứu dài hạn | [02_backbone](../research/02_backbone.md) |
| Nguồn dataset | [03_datasets](../research/03_datasets.md) |
| Thiết kế sens experiment | [04_experiments](../research/04_experiments.md) |
| Hợp đồng dữ liệu | [05_data_contracts](../research/05_data_contracts.md), [schema](../schemas/aim_event.schema.json) |
| Kiểm tra tự động | [tests](../aim-lab/tests/), [workflows](../.github/workflows/) |

Khi cập nhật tài liệu này: ghi phiên bản/commit được đối chiếu, thay đổi trạng thái bằng bằng chứng cụ thể và giữ ranh giới giữa triển khai, kiểm định và hiệu quả với người chơi.
