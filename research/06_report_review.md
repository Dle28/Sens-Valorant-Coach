# Đối chiếu báo cáo đầu vào

Đầu vào: `/home/dungle/Downloads/deep-research-report.md`. Rà soát nguồn ngày 07/09/2026. Nội dung báo cáo là đề xuất nghiên cứu, không phải chỉ thị thực thi. Người dùng đã chọn ưu tiên aim và sensitivity; phần gamesense được chuyển xuống nhánh sau.

| Nội dung cũ | Kết luận rà soát | Thay đổi trong bộ khung |
|---|---|---|
| Context → decision → mechanics → outcome | Giữ như mô hình khái niệm; không tự là causal model đã định danh | Core đo mechanics trong controlled scenario, context giữ cho natural transfer |
| Event-centric, raw/tracked/feature | Giữ | Bổ sung assignment/actual condition, day/block, missingness và traceable metric |
| BEACON 28 người / 79 sessions / khoảng 102,5 giờ | Có paper và public distribution thật | Audit artifact cụ thể, license riêng từng nơi, thời gian/coordinate và modality intersection trước khi dùng |
| Có mouse telemetry thì tính raw dx/dy, angular velocity, jerk | Chưa đủ | Phân biệt raw device counts, cursor coordinates, harness camera. Mẫu BEACON cho thấy cần xác minh lại timebase/semantics |
| `ReactionTime = t_motor - t_visible` | Chỉ là proxy trong tự nhiên | Tên metric phản ánh measurement; reaction task kiểm soát riêng khi muốn đo phản ứng |
| `CorrectionTime = t_shot - t_primary_end` | Gộp nhiều giai đoạn | Tách active correction, pause, target entry và click dwell; không ép một timeline tuyến tính |
| Required flick lớn đồng nghĩa placement kém | Không đủ dữ kiện | A1 là initial alignment demand; đánh giá placement cần nhiệm vụ hold/thông tin/priority |
| Overshoot/correction nhiều chứng minh sens quá cao | Không suy được từ observation đơn lẻ | Randomized crossover và future validation S1 |
| Sens curve cho một “optimal range” | Giữ như mục tiêu, hạ mức khẳng định ở giai đoạn đầu | Ba mức sens chỉ cho ba estimates; không ngoại suy hoặc fit cực trị quá chi tiết |
| Không duplicated timestamps ở input | Cần sửa | Batch receive timestamps có thể trùng; dùng sequence. Clock non-monotonic, zero runs hoặc timebase không rõ mới là đối tượng QA |
| QPC đồng bộ là đủ đảm bảo latency | Chưa đủ | Ghi clock mapping, timestamp semantics, offset/drift/jitter và measurement error budget |
| Replay không được xét trong kiến trúc | Thiếu nguồn chính thức | Dùng replay làm auxiliary; giữ original POV cho timing và player-visible information |
| Windows capture/raw input “ưu tiên” gần như được cho phép | Chưa phải chấp thuận implementation | Xây post-session flow; kiểm policy/current collector khi triển khai sản phẩm |
| State win probability/WPA làm decision value | Cần giới hạn | WPA thực nghiệm trên damage; không tự cho counterfactual “nếu hold sẽ tốt hơn” |
| Rất nhiều module, timeline 6 tháng, hàng trăm giờ dữ liệu | Có thể làm scope phình trước khi chứng minh measurement | Một vertical slice có G0–G2 trước khi mở scale/CV/model phức tạp |

Phạm vi phản biện tập trung vào những claim ảnh hưởng quyết định triển khai và dataset. Đây không phải kiểm định độc lập mọi trích dẫn trong toàn bộ báo cáo cũ.

## Nguồn kiểm chứng cho các chỉnh sửa chính

- [Mouse Sensitivity in First-person Targeting Tasks](https://research.nvidia.com/publication/2023-07_mouse-sensitivity-first-person-targeting-tasks): protocol có preview, adaptation và scope task cụ thể.
- [Kinematic markers of skill](https://pmc.ncbi.nlm.nih.gov/articles/PMC10411933/): phương pháp phân rã kinematic và kho data/scripts.
- [KovaaK reliability pilot](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1309991/full): test–retest trong aim trainer.
- [BEACON paper](https://arxiv.org/abs/2605.10867), [HF distribution](https://huggingface.co/datasets/beacon-gui/BEACON-Dataset), [Zenodo record](https://zenodo.org/records/20034625): thông tin công bố và artifact thực tế cần phân biệt.
- [Riot Replay FAQ](https://playvalorant.com/en-gb/news/dev/replays-everything-you-need-to-know/), [Developer Policy](https://developer.riotgames.com/docs/valorant): replay/POV và product flow.
- [Microsoft Raw Input](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-raw-input), [QPC](https://learn.microsoft.com/en-us/windows/win32/sysinfo/acquiring-high-resolution-time-stamps): input/clock interfaces.
- [Valuing Player Actions](https://arxiv.org/abs/2011.01324): phạm vi định giá state transition và damage actions.

Các chỉ dấu trích dẫn nội bộ dạng `turn…view…` trong file đầu vào không cho người đọc mới một URL truy xuất nguồn. Bộ khung này dùng liên kết trực tiếp và lưu bản metadata nhỏ tại `research/evidence/` để đối chiếu các quyết định dataset.
