# Dataset audit cho aim và sensitivity

Kiểm nguồn ngày **07/09/2026**. Kết luận: dùng **dữ liệu kinematic có kiểm soát để kiểm phép đo**, bổ sung **Aim-and-Shoot cho task động**, dùng **VALORANT POV để kiểm chuyển giao**, và tự thu **randomized sensitivity crossover** cho khuyến nghị cá nhân.

Trong các nguồn đã kiểm, chưa nguồn nào vừa có original VALORANT POV + raw input đã calibration + nhiều sens can thiệp có protocol đầy đủ + nhãn cơ học chuẩn + future-session improvement labels. Không dùng một tên dataset để thay cho toàn bộ pipeline này.

## Shortlist và trạng thái truy cập

`FETCHED_SAMPLE` nghĩa là đã đọc byte của một phần cụ thể; `METADATA_VERIFIED` chỉ có metadata/manifest; `REQUEST_REQUIRED` nghĩa là tác giả yêu cầu liên hệ. Các nhãn không chứng minh quyền dùng thương mại hoặc chất lượng toàn corpus.

| Nguồn | Nội dung / quy mô có căn cứ | Truy cập đã kiểm | License/access | Vai trò nên dùng |
|---|---|---|---|---|
| **Warburton 2023 / OSF xd8sm** | Hai experiments; raw/processed/tracker và R scripts | **FETCHED_SAMPLE**: Exp1 settings + trials table; xem manifest tracker | OSF node public nhưng `node_license=null` trong API; chưa xác minh data-specific license | Ưu tiên kiểm A1–A4 và adapter; cần đọc protocol/exclusion để chọn valid trials. [Paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC10411933/), [OSF](https://osf.io/xd8sm/) |
| **Aim-and-Shoot 2025** | Paper 20 người, gồm 10 pros; processed summary, gaze và trajectory 20/60 Hz | **FETCHED_SAMPLE**: summary prefix + inference table; tree xác nhận H5 files | GitHub API không có license; chưa thấy LICENSE trong tree. Full raw phải xin tác giả | Bổ sung A2–A5; có `habitual/default` sensitivity modes, chưa là prospective sens optimizer. [Paper](https://doi.org/10.1016/j.ijhcs.2025.103503), [Repo](https://github.com/jsyoon-k5/Aim-and-Shoot) |
| **BEACON / HF** | VALORANT multimodal, 28 người/79 sessions theo paper; release audit khoảng 445 GB | **FETCHED_SAMPLE**: metadata, manifests, 8 KiB đầu file chuột; không tải video | HF ghi **CC BY-NC 4.0**; chỉ chọn artifact cụ thể sau kiểm semantics | Natural capture/CV feasibility và context; chưa dùng làm ground truth raw aim hoặc optimal sens. [HF](https://huggingface.co/datasets/beacon-gui/BEACON-Dataset), [Paper](https://arxiv.org/abs/2605.10867) |
| **BEACON / Zenodo** | Record có 38 files, tổng 4.028.359.494 bytes theo API | **METADATA_VERIFIED** | API record ghi **CC BY-ND 4.0**, khác HF | Bản phân phối riêng; không gọi là full corpus 430/445 GB. [Record](https://zenodo.org/records/20034625), [API](https://zenodo.org/api/records/20034625) |
| **VALORANT object detection** | HF export 9.898 ảnh, 416×416 stretch, COCO theo README export | **METADATA_VERIFIED**: repo + export/license text; chưa tải ZIP | `README.dataset.txt` ghi **CC BY 4.0**; source lineage/labels còn phải kiểm | Bootstrap detector; không có mouse/timeline/sens crossover. [HF](https://huggingface.co/datasets/keremberke/valorant-object-detection), [Nguồn export](https://universe.roboflow.com/daniels-magonis-0pjzx/valorant-9ufcp) |
| **Roboflow Head detector** | Card ghi 2.836 ảnh, một class `head` | **METADATA_VERIFIED** qua project card; chưa kiểm export bằng byte | Card ghi **CC BY 4.0** | Candidate head-label seed; cần tự kiểm label và held-out natural set. [Project](https://universe.roboflow.com/valorant-detection/head-detector-tqndi) |
| **KovaaK reliability study** | Pilot 10 người, repeated sessions | **REQUEST_REQUIRED** đối với raw data theo data availability | Bài báo hứa cung cấp qua tác giả; không thấy public raw download trong bài | Tham khảo reliability protocol; không chặn MVP vì chờ data. [Paper](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1309991/full) |
| **Aim Lab — Donovan 2022** | Kinematic/expertise assessment | **REQUEST_REQUIRED** | Paper nêu data proprietary; paper open access không làm raw data mở | Tham khảo metric; không coi là training corpus đã sẵn sàng. [Data availability](https://pmc.ncbi.nlm.nih.gov/articles/PMC9744923/) |
| **ESTA CS:GO** | 1.558 demos, 41.782 rounds, 8,6m actions, 7,9m snapshots ở 2 Hz | **METADATA_VERIFIED**: repo/commit/LICENSE; chưa tải demo | **CC BY-SA 4.0** | Để sau cho gamesense/state representation; không phù hợp vi chuyển động aim. [Repo](https://github.com/pnxenopoulos/esta), [Paper](https://arxiv.org/abs/2209.09861) |

## Nguồn tạo dữ liệu mới

**FirstPersonScience (FPSci)** đáng thử làm harness v0: cấu hình target/task và sensitivity, có logging phục vụ user study. LICENSE thực trong repo là **CC BY-NC-SA 4.0**; vị trí là `LICENSE.txt`. Đã đọc file tại commit cố định. Tái sử dụng theo điều khoản áp dụng cho nghiên cứu; khi làm sản phẩm thương mại cần chọn implementation có quyền phù hợp. License code không tự xác định quyền của mọi dataset tạo bằng nó. [Repo](https://github.com/NVlabs/FPSci), [LICENSE](https://github.com/NVlabs/FPSci/blob/master/LICENSE.txt).

Với requirement tạo dataset của dự án, một harness có target state/camera state/click outcome rõ thường có giá trị hơn thêm hàng nghìn video chưa gán nhãn. Đây là lựa chọn thiết kế, cần benchmark logger trên máy Windows thật; chưa build/run FPSci trong lần nghiên cứu này.

## Kiểm tra byte và metadata đã thực hiện

### OSF: có bảng raw tải được; chưa tái lập paper

API dẫn tới `Experiment1/raw_data/trials.csv.xz` (**1.533.944 bytes**). Đã tải, giải nén và đọc **42.743 dòng**, 26 cột; `type=main` có **39.680**, `type=sensitivity` có **3.063**. Các cột gồm `ppid`, `session_num`, `block_num`, `condition`, `cursor_mode`, timestamps, target size và outcome. “Sensitivity” ở tên row type không được coi là trial can thiệp sens ngẫu nhiên nếu chưa đọc protocol.

Đã tải settings table nhỏ. File manifest còn có Exp1 `trackers.csv.xz` ~29,7 MB và Exp2 `trackers.Rds` ~422 MB; chưa tải quỹ đạo đó. Chưa áp exclusion rules, join mọi bảng hoặc tái tính kinematic metrics. Evidence: [sample nén](evidence/supplement_2026-09-07/osf_exp1_trials.csv.xz), [raw manifest](evidence/supplement_2026-09-07/osf_exp1_raw.json), [summary tính lại](evidence/dataset_probe_summary.json).

**Hành động:** đọc R analysis và schema tracker trước, chốt valid cohort/trial selectors; xác minh secondary-use/data license trước khi đưa vào corpus huấn luyện/phân phối. Có thể dùng cấu trúc và protocol đã công bố để dựng pipeline với dữ liệu tự thu trong lúc chờ.

### Aim-and-Shoot: processed data có giá trị, phải giữ ranh giới measurement

Repo tree xác nhận `summary.csv` ~30,9 MB và trajectories H5 ~27,0 MB (20 Hz), ~65,5 MB (60 Hz). Đã đọc prefix của summary; có target size/speed, DPI, sensitivity theo độ/mm, completion time, outcome, shoot error và reaction metrics. Bảng inference nhỏ có 80 rows, chứa modes `default` và `habitual`; đây là **model-inferred parameters**, không phải nhãn sinh lý ground truth hay 80 người. [Tree snapshot](evidence/supplement_2026-09-07/aimshoot_tree.json), [summary prefix](evidence/supplement_2026-09-07/aimshoot_summary_prefix.txt).

**Hành động:** ưu tiên kiểm task conditions và processed-loader để dùng làm benchmark mechanics; cần rõ license và protocol của các sens modes. Quỹ đạo 20/60 Hz đã resample không thay raw mouse 1 kHz; không suy correction dưới độ phân giải của bản phát hành. README nêu xin tác giả cho full raw; chưa liên hệ hoặc tải full study.

### BEACON: các bất nhất ảnh hưởng trực tiếp tới lựa chọn

Manifest có **602 dòng**, gồm cả file bị bỏ; chỉ **393 file dữ liệu included**, tổng **444.956.465.008 bytes**. Có 74 file video nhưng chỉ **72 cặp player/session duy nhất có video**, và intersection video+mouse+keyboard cũng là 72. Không được dùng 79 sessions làm số session đủ mọi modality. Các con số này tính từ manifest pinned, không đo duration video thực. [Manifest](evidence/access_2026-09-07/beacon_metadata_public_release_manifest.csv), [phép đếm](evidence/dataset_probe_summary.json).

Mẫu 8 KiB đầu `P001/S001/mouse_P001_S001.csv` cho **120 dòng đầy đủ / 13 timestamp khác nhau**, bắt đầu 0 rồi các giá trị nhỏ theo giây. Cột là `X,Y,Speed,Movement Distance,…`; chưa có bằng chứng đây là raw device counts. Mẫu không khớp mô tả timestamp Unix epoch trong card. Đây là phát hiện hẹp trên prefix, **không kết luận mọi session hỏng**. [Mẫu thực](evidence/access_2026-09-07/beacon_mouse_prefix.txt), [card snapshot](evidence/access_2026-09-07/beacon_README.md).

Consent policy nói video được redaction, trong khi release manifest gắn video `copied_unredacted`. Chưa xem video để phân xử; đây là metadata conflict phải giải quyết trước khi chọn video vào bộ derivative. [Consent snapshot](evidence/access_2026-09-07/beacon_consent_policy.md).

HF và Zenodo ghi license khác nhau, khác danh sách file. **Không tự chọn license thuận lợi hơn rồi áp cho artifact ở nguồn khác**. Dataset size 430 GB trong paper, khoảng 445 GB ở release và ~4 GB trên Zenodo là các mô tả có phạm vi khác, không phải một corpus đã được audit thống nhất.

**Hành động:** chọn 1–2 cặp session có đủ modalities; kiểm actual FPS, motion semantics, time alignment và redaction trước khi tải thêm. Chưa lấy BEACON làm nền S1. Phần PCAP không cần cho target aim của dự án.

### Detection datasets: ảnh để tìm đầu/người, chưa phải dataset aim

HF export ảnh bị stretch thành 416×416; labels cần kiểm đúng class/body/head. Không dùng pixel error ở export làm angular error trên màn 16:9 gốc. Head detector card có nhãn phù hợp hơn, nhưng mAP trên card không thay kiểm thử của dự án.

Trước fine-tuning: audit 100–200 ảnh có phân tầng target size, empty frames, occlusion và VFX; tìm near-duplicate/source video groups; giữ cùng nguồn ở một split. Nếu không khôi phục được grouping thì chỉ dùng pretraining, test trên original POV tự thu độc lập. Lưu tọa độ transform/crop của mỗi ảnh.

## Dataset tự thu bắt buộc cho S1

| Thành phần | Vì sao nguồn ngoài chưa thay thế được | Pilot đề xuất |
|---|---|---|
| Controlled personal baseline | Cần setup và ngày đo của chính player | 3–5 người, hai ngày trước khi scale |
| Randomized sens trials | Cần assignment/actual sens, adaptation, period effects và future test theo target dự án | Ba mức quanh current; protocol trong [thí nghiệm](04_experiments.md) |
| Natural POV + gold aim | Cần biết phép đo chuyển giao vào VALORANT và patch/setup thực | 10–20 giờ ban đầu; 500 events gold theo quota scenario |
| CV hard cases | Public ảnh không bảo đảm small-head/occlusion coverage | Active sample từ failure buckets, không random frames dày đặc |

Quy mô theo [bản thiết kế thí nghiệm](04_experiments.md), schema theo [data contracts](05_data_contracts.md). Không train trực tiếp label “sens tối ưu”; học response theo condition và chọn candidate, sau đó kiểm candidate trên ngày chưa quan sát.

## Quyết định nguồn theo giai đoạn

1. **Bắt đầu phép đo:** OSF sample + protocol kinematic; controlled harness tự thu làm nguồn chính cho measurement truth và S1.
2. **Mở task động:** Aim-and-Shoot processed assets sau kiểm license/protocol; giữ distinct measured vs inferred columns.
3. **Mở natural:** original POV tự thu; detection datasets làm seed khi cần. BEACON chỉ là nguồn bổ trợ sau qualification sample.
4. **Sau aim/sens:** ESTA/ggViz và expert annotations cho gamesense; không chi ngân sách thu labels này trước G0–G3.

Chưa gửi yêu cầu dữ liệu cho tác giả, chưa đăng ký Riot, chưa tải full dataset, chưa train model và chưa có kết quả tối ưu sens cá nhân. Công việc đã hoàn thành ở đây là kiểm nguồn, metadata, các sample nêu rõ và thiết kế dataset để thực hiện tiếp.

## Dấu vết kiểm tra

| Nguồn | Revision đã pin |
|---|---|
| BEACON HF | `da1306428ef626108a914abff42ead19b3a46f62` |
| Aim-and-Shoot | `251ce79854c33bdbfe2f28aaa6669b0e58ad6445` |
| ESTA | `0e81f74d480689a83f6e1e90835c1eb6f7aa0de2` |
| FPSci | `d5dcea0a981a02174cbede813adfc4d6d7cab3b7` |
| VALORANT detection HF | `8e08ea0dda44a5c942164865f3c2fc10f0e476ab` |

URL, HTTP status, timestamp kiểm tra, số byte và SHA-256 có trong [audit ban đầu](evidence/access_2026-09-07/access_report.json) và [audit bổ sung](evidence/supplement_2026-09-07/access_report.json). Audit đầu có một 404 do dò `LICENSE` của FPSci; đã tìm đúng `LICENSE.txt`, tải thành công trong audit bổ sung và sửa script cho lần chạy sau. Giữ lỗi cũ trong ledger để không che quá trình xác minh.
