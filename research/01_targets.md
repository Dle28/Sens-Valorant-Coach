# Target nghiên cứu: aim trước, sensitivity sau phép đo

Phạm vi v0.1: AI phân tích sau phiên chơi; ưu tiên PC mouse, hip-fire, một cấu hình cố định mỗi block. Mục tiêu đầu tiên là đo và giải thích profile cá nhân. Headshot rate, K/D và rank chỉ là outcome/context phụ.

## Cơ sở khoa học đã kiểm chứng

Boudaoud, Spjut và Kim phân tích 13 người; mỗi người có 8 phiên × 500 trial, task có preview và target tĩnh. Họ loại nửa đầu mỗi phiên để xử lý thích nghi, quan sát quan hệ sensitivity–submovement và trade-off tốc độ–độ chính xác. Đây là bằng chứng cho thiết kế thử nghiệm; không xác lập một sens dùng chung cho VALORANT hoặc reaction time của duel bất ngờ. Khoảng cách target chủ yếu 7–25° theo phương ngang. [Nghiên cứu và author PDF](https://research.nvidia.com/publication/2023-07_mouse-sensitivity-first-person-targeting-tasks).

Warburton và cộng sự phân rã thao tác ngắm thành các thành phần thời gian/không gian, gồm onset, chuyển động, correction và click dwell. Điều này hỗ trợ đo nhiều thành phần thay cho một score tổng. Protocol của dự án phải tự định nghĩa boundary; không được gắn tên của paper lên một công thức khác. [Bài báo PNAS Nexus 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10411933/).

Pilot KovaaK n=10 có familiarization và hai phiên kiểm tra; ICC point estimate 0.947–0.995 cho các metric task. Kết quả cho thấy khả năng đo lặp lại trong bài thử đó, chưa chứng minh chuyển giao sang VALORANT. [Rogers et al., 2024](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1309991/full).

## Danh mục target

Các mã dưới đây do dự án đặt. **P0** là phần triển khai trước, **P1** là stress test/mở rộng sau khi P0 đo ổn. Mỗi metric chỉ có ý nghĩa trong nhóm scenario tương đương.

| ID / ưu tiên | Câu hỏi thực tế | Observable và nhãn cần có | Metric / baseline | Giới hạn và gate |
|---|---|---|---|---|
| A1 / P0 — Initial alignment | Lúc target xuất hiện, cần dịch tâm bao xa? | Target/head region, reticle, thời điểm visibility; geometry ground truth nếu controlled | Error theo target width; góc khi calibration hợp lệ; baseline cá nhân cùng size/distance | Khoảng dịch lớn chưa đủ kết luận placement xấu. Target priority, off-angle, che khuất và nhiệm vụ hold là confound |
| A2 / P0 — Acquisition speed–accuracy | Đưa tâm vào và bắn trúng nhanh tới đâu? | Onset, first entry, shot, hit/miss, timeout | Xác suất first-shot hit trước deadline theo độ khó; thời gian và hit rate báo riêng; baseline sens hiện tại | Phải giữ miss, no-shot và timeout. Natural video chỉ cho visual-to-shot proxy; không gọi là phản xạ thần kinh |
| A3 / P0 — Stopping/correction | Chuyển động chính dừng ở đâu, sửa bao nhiêu lần? | Raw input hoặc camera/target trajectory từ harness; detector sự kiện đã đối chiếu gold | Signed endpoint error, overshoot theo target width, số correction có ngưỡng, thời gian sửa | Không suy từ `X,Y` OS hoặc target-relative video thành raw dx/dy. Target đang chạy/recoil/camera translation làm sai giải thích |
| A4 / P0 — Click timing | Tâm đã vào target nhưng bắn quá sớm/muộn? | Entry/exit intervals, click timestamp và firing event tách biệt | Dwell trước shot; shot trước lần entry đầu; tỷ lệ click khi tâm trong target | Mouse click khác đạn thực sự bắn. Entry sau shot hoặc chưa entry phải giữ trạng thái, không ép timeline |
| A5 / P1 — Dynamic robustness | Profile có giữ được khi tracking/chuyển mục tiêu/phục hồi sau miss? | Target motion có ground truth, sequence A/B, initial offset; visibility masks | Tracking RMS error và time-on-target; target-switch reacquisition; post-miss recovery, báo riêng từng task | Không cộng các metric khác đơn vị thành “aim score” tùy ý. Camera motion/target crossing dễ làm nhầm tracking identity |
| A6 / P1 — Movement–shot coordination | Bắn khi còn di chuyển hay sau khi dừng? | Key press/release, video hoặc controlled velocity, shot | Key-release-to-shot proxy; motion-at-shot nếu velocity đã validate | Nhả phím chưa chứng minh nhân vật dừng; recoil/weapon accuracy không phải lỗi sens. Không gắn nhãn counter-strafe chỉ từ tổ hợp phím |
| S1 / sau G0–G2 — Sens response cá nhân | Sens nào cải thiện hiệu suất tương lai, với accuracy và scenario constraints? | Player × day × sens × scenario; randomized order, adaptation, setting readback | So current-sens với candidate trên future sessions; curve/tập mức phù hợp kèm CI | Natural correlation, pro settings và overshoot đơn lẻ không là target label “optimal sens” |

## Cách vận hành target thay vì score 0–100

Record của một metric có `value`, `unit`, `measurement_method`, `uncertainty`, `validity` và các event làm bằng chứng. Nếu thiếu tín hiệu thì `value=null` và reason cụ thể; `0` là một phép đo hợp lệ, không phải ký hiệu thiếu dữ liệu.

Ví dụ **minh họa, không phải kết quả đo**: “Ở nhóm target nhỏ, thời gian sửa sau chuyển động đầu chiếm phần lớn acquisition. Chưa biết sensitivity là nguyên nhân; cần lặp các block ở sens hiện tại và hai mức lân cận.”

Phải đo một trục thời gian có thể có nhiều nhánh:

```text
target activation / first visible frame
    → movement onset (có thể đã xảy ra trước visibility)
    → primary segment / corrections
    → entry/exit vào target (0 hoặc nhiều lần)
    → click (có thể trước entry) → firing event
    → hit, miss, timeout, occluded hoặc interrupted
```

`first_entry - onset` chỉ tính khi event đủ điều kiện. `shot - primary_end` bao gồm cả correction lẫn chờ click; phải tách thời gian sửa, khoảng dừng và dwell nếu muốn dùng các tên tương ứng. Không tìm “intentional onset” bằng mắt trên video rồi coi đó là ground truth ý định.

## Điều kiện để các target được sử dụng

Các gate này là ngưỡng pilot đề xuất, cần khóa lại sau đợt calibration trước khi mở test set.

| Gate | Bằng chứng cần có | Tiêu chí quyết định ban đầu |
|---|---|---|
| G0 — Đo đúng thời gian/đơn vị | Calibration độc lập; clock mapping; event/frame coverage | Không có clock reversal chưa giải thích; ≥99% frame kỳ vọng trong đoạn active của harness; reporting cả P50/P95 alignment residual. Sai số tổng của phép so sánh phải nhỏ hơn 1/3 mức hiệu quả tối thiểu muốn phát hiện |
| G1 — Tự động khớp ground truth | Gold events từ harness; natural gold do hai người gán | Timing error của từng boundary và head-normalized geometry error dưới budget đã khóa; khởi điểm median center error ≤0.15 target width, P95 ≤0.5 trên nhóm đủ visibility; báo riêng nhóm nhỏ/che khuất |
| G2 — Lặp lại được | Ít nhất hai ngày baseline; phân tích theo player/session | Báo ICC với CI, bias và within-player typical error. Không chỉ chọn ICC cao do khác biệt lớn giữa các player; smallest detectable change phải phù hợp mức cải thiện muốn khuyến nghị |
| G3 — Sens có ích trong tương lai | Current vs candidate crossover trên các ngày chưa fit | Primary metric cải thiện quá mức tối thiểu đã đăng ký, CI hỗ trợ, không phá accuracy/scenario guardrail |
| G4 — Chuyển giao | Controlled và gameplay VALORANT gốc của cùng người | Có dấu hiệu cùng hướng trên natural metrics đủ tin cậy; chỉ gọi “cải thiện trong game” khi trực tiếp kiểm định được, không suy từ aim trainer |

Ở 120 FPS, một frame cách nhau khoảng 8.33 ms; ở 60 FPS là 16.67 ms. Đó là độ rời rạc lấy mẫu, không phải chứng minh sai số đồng bộ hoặc reaction latency. Nếu muốn phân biệt chênh lệch 5–10 ms, phải nâng chất lượng đo hoặc hạ mức độ chi tiết của kết luận.

Không ép người chơi thay sens nếu nhiều mức chưa khác nhau rõ, nếu lợi ích chỉ tồn tại trên dữ liệu fit, hoặc nếu candidate đổi tốc độ lấy accuracy. Đầu ra `INSUFFICIENT_EVIDENCE` và `NO_CLEAR_DIFFERENCE` là kết quả nghiên cứu hữu ích.
