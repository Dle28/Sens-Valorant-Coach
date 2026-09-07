# Thí nghiệm sensitivity và kế hoạch thực hiện

Tất cả số lượng, deadline và gate dưới đây là **thiết kế khởi điểm**, không phải power calculation đã hoàn thành. Chưa có participant hoặc trial mới của dự án.

## Giả thuyết và thước đo

H1: thay đổi gain có thể đổi stopping error/correction burden, phụ thuộc độ khó. H2: sens phù hợp cho target nhỏ chưa chắc phù hợp cho transfer lớn. H3: candidate chọn từ lịch sử phải giữ hiệu quả trong ngày chưa dùng để fit. H4: hiệu quả trong controlled tasks cần một phép kiểm riêng trong VALORANT.

Baseline bắt buộc là **sens hiện tại của chính người chơi**, cùng hardware và scenario. So sánh thêm “giữ sens, tiếp tục luyện” để tách practice effect khỏi lợi ích đổi sens. Baseline model đầu tiên là trung bình theo player/scenario và paired contrast; model linh hoạt chỉ được thêm khi thắng trên test cùng protocol.

Primary endpoint controlled v0:

`P(first shot hits target AND shot occurs before scenario deadline)`.

Mỗi trial được bắt đầu đều vào denominator sau khi bỏ các lỗi thiết bị đã định trước. Miss, no-shot và timeout là thất bại của endpoint, vẫn giữ trong dataset. Deadline được chọn từ đợt pilot độc lập cho từng difficulty cell rồi khóa; không đổi deadline theo condition để giúp candidate thắng. Báo hit rate, thời gian tới shot, time-to-hit, correction count và các distribution riêng để người đọc hiểu trade-off.

Các shot sau deadline vẫn được lưu. Với time-to-hit, no-hit là censored theo timeout đã đăng ký; không chuyển missing timing thành 0 hoặc xóa miss khỏi dữ liệu. Nếu fit survival model phải nêu treatment của competing events như occlusion/interruption.

## Scenario khởi điểm

| Nhóm | Controlled design | Target liên quan | Lý do |
|---|---|---|---|
| C1 — Precision | Target tĩnh nhỏ; nhiều initial offsets thấp; giữ player đứng | A1–A4 | Kiểm stopping/correction trong đòi hỏi precision |
| C2 — Transfer | Target tĩnh, offsets lớn hơn C1; size thay đổi độc lập | A1–A4 | Kiểm trade-off tốc độ với precision |
| C3 — Dynamic | Target strafe có trajectory biết trước; sequence switch là task tách | A2, A5 | Stress test chống overfit target tĩnh |
| N1 — Natural | Original POV ở Range/Deathmatch sau đó Competitive | A1–A5 nếu observable | Đánh giá lỗi CV và khả năng chuyển giao |
| N2 — Movement-shot | Di chuyển/nhả phím/bắn, velocity chuẩn nếu harness | A6 | Mở sau; tránh gán lỗi movement hoặc weapon cho sens |

Không hard-code `micro <5°`, `transfer 5–20°`, `mobility >20°` như chân lý. Lưu offset, target width, direction và speed liên tục; dùng bins có version để trình bày. Lấy pilot natural để xác định phân bố target size/demand của nhóm người chơi, sau đó khóa sampling weights. Tập precision/transfer có ít nhất hai size để tách effect của distance và size.

## Thiết kế crossover

1. **Làm quen và calibration.** Ghi current sens, DPI, actual angular gain/cm-per-360, hardware, display Hz, actual frame interval, aim mode và thiết lập acceleration. Calibrate lại khi setting hoặc device đổi. Protocol ghi rõ preview/no-preview.
2. **Ba condition ban đầu:** `0.90 × current gain`, `1.00 × current gain`, `1.10 × current gain`. DPI giữ nguyên. Đây là phạm vi khám phá có chủ đích quanh mức đang dùng; không phải khuyến nghị giảm/tăng 10% cho người chơi cụ thể.
3. **Counterbalance thứ tự.** Phân đều sáu thứ tự ABC/ACB/BAC/BCA/CAB/CBA giữa người chơi và đổi sequence ở ngày sau. Đảo thứ tự scenario riêng. Lưu assignment seed, order và actual setting readback.
4. **Adaptation mỗi lần đổi condition.** Chạy warm-up tách khỏi scoring; 30 trial/cell là số minh họa để dự trù. Dùng pilot ước lượng stabilization và carryover rồi khóa số trial/thời lượng; không tự cho rằng 30 trial đủ cho mọi người. Nếu chưa ổn trong giới hạn thời gian đã khóa, đánh dấu condition chưa ổn hoặc bố trí ngày khác theo protocol.
5. **Discovery trên ≥2 ngày.** Mỗi cell thu đủ lần thử cả hit lẫn miss; có nghỉ giữa block và ghi fatigue/break. Không tăng số trial tùy lúc candidate đang thắng. Nếu phải chia ngày, lưu lại ngày/period và balance lại.
6. **Khóa candidate và mô hình.** Dùng discovery để chọn tối đa một candidate cá nhân, giữ current làm control. Định trước rule khi best condition ở biên: chưa ngoại suy ra ngoài vùng đã đo, mở vòng exploration mới riêng.
7. **Future validation trên ≥2 ngày chưa fit.** Randomized current-vs-candidate crossover; analyst dùng condition code khi tính endpoint. Người chơi có thể cảm nhận sens nên không tuyên bố participant blinding hoàn toàn.
8. **Natural transfer.** Giữ frozen analysis rồi đối chiếu metric trên original VALORANT POV. K/D/HS% báo secondary theo match context; một phiên thắng không chứng minh sens tốt hơn.

Ví dụ chuyển đơn vị: nếu sens theo gain tăng 10%, cm/360 giảm theo hệ số `1/1.10`; không phải tăng 10% cm/360. Lưu cả setting gốc và gain/calibration để tránh đảo nghĩa condition.

## Phân tích và điều kiện khuyến nghị

Discovery: trước hết vẽ speed–accuracy theo condition/scenario/ngày và paired contrasts. Có đủ dữ liệu mới thử mixed-effects logistic model cho endpoint, player random effects, period/day, difficulty và `sensitivity × difficulty` interaction. Với chỉ ba mức sens, báo ba estimates và uncertainty; không vẽ spline chi tiết rồi coi cực trị giữa chúng là đã quan sát.

Primary effect là chênh lệch endpoint candidate–current trên future sessions. Ngưỡng khởi điểm để thảo luận: **+3 điểm phần trăm** là mức hiệu quả tối thiểu, và raw hit-rate non-inferiority margin là **−2 điểm phần trăm**. Phải khóa sau pilot và trước validation. Chỉ claim vượt mức tối thiểu khi CI phù hợp, không chỉ point estimate vượt ngưỡng. Báo từng scenario để không che việc precision thắng nhưng transfer suy giảm.

Tính CI theo cấu trúc player/day/block; không bootstrap từng frame độc lập. Kết luận population cần cluster theo player; kết luận cá nhân cần đủ phiên của người đó, không lấy CI population làm bảo đảm cá nhân. Với ít session, ghi uncertainty lớn và tiếp tục đo. Chọn một primary endpoint; các metric phụ dùng để giải thích, không đổi endpoint sau khi xem p-value.

Kết quả S1 có thể là:

| Trạng thái | Hành động |
|---|---|
| `INSUFFICIENT_EVIDENCE` | Thu thêm hoặc sửa measurement |
| `NO_CLEAR_DIFFERENCE` | Giữ current; liệt kê các mức chưa phân biệt được |
| `TEST_CANDIDATE` | Thử mức candidate trên ngày mới |
| `PROSPECTIVELY_SUPPORTED_CONTROLLED` | Có hỗ trợ trong controlled task đã thử; tiếp tục kiểm natural |
| `SUPPORTED_NATURAL_TRANSFER` | Có kiểm định natural độc lập; nêu đúng phạm vi scenario/player |

Khuyến nghị nên là tập mức đủ bằng chứng hoặc khoảng *chỉ trong vùng đã đo*. Nếu estimates chưa phân biệt, không trình bày một số thập phân nhiều chữ số như tối ưu chính xác.

## Quy mô dữ liệu và chi phí

| Đợt | Quy mô đề xuất | Deliverable |
|---|---|---|
| Measurement pilot | 3–5 người, 2 ngày; 500–1.000 aim events tổng | Clock/geometry QA, schema, estimate variance, annotation time |
| Sens discovery minh họa | 12 người × 2 ngày × 3 sens × 3 scenario × 60 scored trials = **12.960** | Paired comparisons, reliability, một candidate/người nếu có |
| Future validation minh họa | 12 × 2 ngày × 2 sens × 3 scenario × 60 = **8.640** | **21.600** scored trials tổng hai đợt; chưa tính warm-up |
| Natural pilot | 5–10 người, 10–20 giờ POV, 500 events gold | CV feasibility và transfer diagnostics |
| Mở rộng | Quyết định từ variance, attrition và effect size pilot | Power simulation ở cấp player/day; không lấy 21.600 trial làm 21.600 mẫu độc lập |

Khung này giảm scope so với thu ngay hàng trăm giờ hoặc 20–40 người. Con số 12 chỉ minh họa workload, không bảo đảm phát hiện +3 điểm phần trăm. Một nghiên cứu cá nhân cũng có thể bắt đầu với một người qua nhiều ngày, nhưng kết quả chỉ áp dụng người đó.

Dự trù video theo bitrate thực: `GB/giờ ≈ Mbps × 0.45`. 20 Mbps tương đương 9 GB/giờ; 10–20 giờ là 90–180 GB một bản, chưa tính annotations/cache/backup. Đây là tính toán dung lượng, không cam kết bitrate đó đủ giữ chi tiết đầu ở FPS cao. Kiểm crop target ở bitrate pilot trước. Annotation 500 events × 2 người × 2 phút/event ≈33,3 giờ công, chưa tính adjudication; đo thực tốc độ ở 50 events đầu để cập nhật.

## Backlog triển khai theo gate

| Thứ tự / ước lượng | Việc cụ thể | Artifact hoàn thành | Gate |
|---|---|---|---|
| B0 / 1–2 ngày | Chọn harness và license; pin một sample nghiên cứu có quyền dùng | Source manifest + sample inspection | Access/rights/field semantics rõ |
| B1 / 2–4 ngày | Adapter log → session/events; QA clock/gain | 1 session replayable, report thiếu dữ liệu | G0 |
| B2 / 3–5 ngày | Ground-truth event segmentation và A1–A4 | 100 events được kiểm tay, error report | G1 |
| B3 / 1 tuần | Baseline hai ngày, tính typical error | Reliability report + pilot protocol v1 | G2 |
| B4 / 1–2 tuần thu | Randomized sens discovery | Trial ledger, response estimates, candidate freeze | Coverage đủ theo protocol |
| B5 / ≥2 ngày mới | Prospective comparison | Candidate-vs-current effect + CI | G3 |
| B6 / 1–2 tuần | Natural gold, detector khi cần, transfer | Natural QA + paired transfer report | G4 |

Thời gian là ước lượng công việc sau khi có người chơi/Windows setup phù hợp; không phải cam kết hoàn thành study trong vài tuần. Nếu B1/B2 không đạt, sửa measurement trước khi tăng model capacity. Việc kế tiếp cụ thể nhất là **B0–B1: một controlled session có input/target/settings/clock rõ và báo cáo A1–A4 có thể mở lại từng event**.
