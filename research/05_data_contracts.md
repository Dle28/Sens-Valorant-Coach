# Hợp đồng dữ liệu và bộ khung lưu trữ

Đơn vị nghiên cứu là **trial/aim event**, nằm trong player → session/day → block/round. Frame/input sample là nguồn đo. Tất cả bảng giữ ID nối về nguồn; mọi phép suy diễn có version và quality riêng.

Các định nghĩa sau là hợp đồng đề xuất của dự án. [JSON Schema](../schemas/aim_event.schema.json) kiểm cấu trúc một aim event; chưa phải validator đầy đủ cho đồng bộ, liên kết giữa bảng, geometry hoặc tính hợp lệ khoa học.

## Các bảng tối thiểu

| Bảng | Khóa | Trường phải có |
|---|---|---|
| `players` | player_id | Pseudonym, nhóm kinh nghiệm tự báo; consent record reference tách khỏi dữ liệu công khai |
| `sessions` | session_id | Player, ngày, source kind, game/harness build, scenario/config hash, settings, device, clock domains, files/hashes, permission basis |
| `blocks` | block_id | Session, condition assigned/actual, order, previous condition, seed, adaptation/scored, scenario/difficulty, fatigue/break |
| `frames` | session_id + frame_seq | PTS, clock domain, mapped time, geometry/resolution, presentation/capture metadata nếu có, duplicates/drops |
| `inputs` | session_id + input_seq | Timestamp source và time received tách biệt; raw counts hoặc OS position type; button state; device pseudonym |
| `target_tracks` | frame_seq + track_id | Target bbox/center, visibility, ground truth vs predicted, confidence, tracker version |
| `aim_events` | event_id | Episode/trial span, timeline, target, context, metrics, outcome, quality, provenance |
| `annotations` | event_id + annotator_id + version | Raw label, source evidence, confidence, adjudicated label riêng, rubric version |
| `splits` | dataset_version + entity_id | Player/session/match/clip identity group, role, timestamp freeze và hash |

## Đơn vị và thời gian

Lưu số ticks gốc và tần số clock, video PTS/timebase, `timestamp_origin`, `timestamp_semantics` và sequence number. QPC monotonic, Unix epoch và frame index khác đơn vị; không join chỉ vì hai cột đều tên `Timestamp`.

Model mapping tối thiểu: `t_common = a × t_source + b`, với calibration anchors, residual P50/P95, phạm vi áp dụng và drift theo thời gian. Nếu clock reset/jump, cắt segment và đánh missing; không “sửa” im lặng. Mô hình affine không tự chứng minh queueing jitter đã biến mất.

Cho phép nhiều input chung receive timestamp nếu collector batch; dùng sequence để giữ ordering. **Không bắt buộc unique timestamp trên mọi sample**. Ngược lại, hàng dài timestamp bằng 0 hoặc không tăng cần ghi rõ và chưa dùng để tính vận tốc/jerk cho tới khi có timebase hợp lệ.

Input giữ `coordinate_space = raw_device_counts | os_cursor_px | harness_camera_deg | unknown`. Không convert OS cursor thành raw counts. DPI/eDPI là metadata; nếu chưa kiểm gain thì angular metrics để null. Nếu phép ánh xạ tuyến tính đã calibration, `cm_per_360 = 914.4 / (DPI × degrees_per_count)`; ghi giả định không acceleration và tách ADS/scoped.

Một bbox đầu trên video là vùng hình ảnh, không tự là hitbox engine. Head-normalized error là visual alignment metric; chỉ gắn `hit=true` từ nguồn outcome tin cậy hoặc collision ground truth của harness.

## Event boundaries và missingness

Lưu timeline dạng các thời điểm tùy chọn: event start/end, first visible, motor onset, primary segment end, first entry, click và observed fire. Nếu onset trước visible trong pre-aim, giữ thứ tự thật và reason; không cắt âm rồi coi là reaction time bằng 0.

Outcome ít nhất gồm `hit`, `miss`, `no_shot`, `timeout`, `occluded`, `interrupted`, `unknown`. Technical invalidity nằm riêng. Một miss với tín hiệu tốt vẫn là valid trial. Null phải có lý do:

| Reason | Hệ quả |
|---|---|
| `NO_RAW_INPUT` | Không báo raw-input kinematics; camera-ground-truth vẫn có thể đo rotation |
| `UNCALIBRATED_GAIN` | Không báo degrees/count hoặc cm/360 từ setting guessed |
| `UNSYNCED_STREAMS` | Chặn cross-modal durations |
| `TARGET_OCCLUDED` | Censor visibility interval; không coi target “không phát hiện” là không tồn tại |
| `NO_TARGET_ENTRY` | Dwell không xác định; vẫn giữ miss/shot |
| `SOURCE_IS_REPLAY` | Chặn original-POV timing và player-information inference |
| `SYNTHETIC_EXAMPLE` | Chỉ dùng để minh họa schema |

`eligible_for_sensitivity_fit` được tính từ record thực: assignment/actual setting có, measurement đúng, rights/consent phù hợp, traceable source. Natural records chỉ fit quan hệ quan sát trừ khi thuộc protocol can thiệp đã đăng ký; thêm cờ eligibility không làm observational data có tính nhân quả.

## Annotation protocol

Pilot 100–200 events: hai annotator độc lập đánh target/head region, first visible, entry/exit, shot, event validity và reason. Trong harness so trực tiếp ground truth; ở natural video giữ uncertainty tối thiểu theo frame. Ghi timestamp intervals khi không xác định đúng một frame.

Annotator không gán “sens quá cao” hoặc “bad aim”. Gán quan sát như “2 lần vượt target theo trục chuyển động chính”, kèm thuật toán/smoothing convention. Threshold reversals phải lớn hơn noise floor; không đếm rung detector thành correction tay.

Lưu annotations gốc, phân bố disagreement và adjudication riêng. Agreement được đo ở cả nhóm khó; không xóa bất đồng để làm metric QA đẹp. Với categorical labels có thể dùng kappa; với timing dùng absolute errors/distributions; repeated player metrics dùng ICC, bias và typical error.

## Split và provenance

1. Assign player/session/match group trước khi extract frame/clip. Clip overlap, ảnh augment và duplicate hash cùng group.
2. **Unseen-player test** đo khả năng tổng quát; **future-session test** đo personalization. Hai câu hỏi dùng hai split riêng, không gộp thành một score.
3. Với tự thu ít player, dùng grouped validation cho development và dành ngày tương lai cho final test; không hứa player-disjoint estimate ổn khi chỉ 3–5 người.
4. Natural patch/map/resolution holdout là stress tests riêng. Fit scaler, bins, weights, selection rule và calibration parameters chỉ trên train/calibration được phép.
5. Hash raw asset, metadata manifest, schema, extractor/config, annotation guideline, split và model. Cho phép reprocess raw mà không ghi đè output version cũ.

Raw gameplay có thể mang Riot ID/chat/voice; ghi permission basis của participant và secondary-use scope của dataset gốc. Kho public cho derivative được tách với bản raw hạn chế. Không thu voice mặc định trong aim pilot; nếu thiếu thông tin thì giới hạn kết luận gamesense tương ứng. Paper license, data license và code license là ba record riêng.

## Cây dữ liệu khi bắt đầu thu

```text
data/                              # Chưa được tạo/thu trong lần nghiên cứu này
  source_registry/
  raw/<source>/<player>/<session>/
  manifests/
  annotations/<version>/
  derived/<extractor_version>/
    tracks/
    events/
    features/
  splits/<version>/
  experiments/<registered_id>/
  reports/
```

MKV/MP4 cho video, Parquet cho stream/feature lớn, JSON cho manifest/config. Không cần triển khai object store, model registry hoặc online service để kiểm một session đầu tiên.

## Bất biến cần có ở validator triển khai sau

Schema đã cung cấp kiểm shape, kiểu dữ liệu, outcome enum, missing metric và eligibility cơ bản. Validator tiếp theo phải kiểm span/time ordering theo event semantics, units/calibration, join closure, actual-vs-assigned condition, split contamination, duplicate assets, source hash match, quyền sử dụng và exclusion ledger.

Ví dụ trong `examples/` đều có `is_synthetic=true`, `eligible_for_sensitivity_fit=false`; không phải raw trial hoặc evidence nghiên cứu thực.
