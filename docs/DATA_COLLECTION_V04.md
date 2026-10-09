# Thu dữ liệu aim chuẩn hóa v0.4

Ngày thực hiện: 09/09/2026. Bộ thu dùng schema 0.4, collector 0.4.0 và semantic validator `aim-quality-1`.

## Đã thực hiện

- Xóa 56 JSON phiên cũ (54 schema 0.3, 2 schema 0.2) tại `%APPDATA%/V-AIM COACH/sessions`. Kiểm ngay sau xóa: không còn file phiên trong thư mục này.
- Xóa `gamesen.sessions` trong storage của desktop bằng API của Chromium. Profile sens/DPI được giữ lại. Bản web xóa lịch sử cũ một lần khi mở bản schema 0.4.
- Log mới có mã người chơi giả danh theo profile cục bộ, session/block/trial ID, nguồn clock và đơn vị, số thứ tự sự kiện, source/receive timestamps, input trust flag, build hash, cấu hình, camera position, mục tiêu tham chiếu và mục tiêu trúng.
- Tính lệch tâm từ target trừ vị trí camera thực. Frame combat đo onTarget cho đúng địch tham chiếu; Site yêu cầu vùng đầu cho head-alignment. Shot vẫn lưu hitRegion/body damage riêng.
- Click/down/up, key down/up và reset input được lưu riêng. Click bị chặn có reason; nhấn chuột không còn bị đồng nhất với phát súng thực tế. Recoil áp dụng sau phát bắn được ghi riêng.
- Trial có thời điểm kết thúc, first hit và encounter clear tách biệt. First visible được lấy ở mẫu engine trong frustum, không được gọi là thời điểm màn hình thực sự phát sáng.
- Bổ sung lựa chọn tập tự do, đo ban đầu, đo lại và mức mệt. Phiên đo lại tìm baseline cùng người/cấu hình trong lịch sử; không có thì reference để null. Bấm bài gợi ý lưu source session, luật đề xuất, bài và liều tập dự kiến; cấu hình phiên phản ánh lượng tập thực tế.
- Desktop checkpoint khoảng mỗi 5 giây; raw, checkpoint và quarantine tách thư mục. Native save tự kiểm định lại và tính SHA-256 của file/cấu hình. Dữ liệu lỗi không bị sửa hoặc loại âm thầm.

## Dùng dữ liệu

```text
sessions/
  raw/<session-id>.json
  raw/<session-id>.json.manifest.json
  quarantine/...
  checkpoints/...
```

Checkpoint còn lại sau crash là phiên chưa hoàn tất; chưa có giao diện tự khôi phục gameplay. Lịch sử UI vẫn giữ 30 bản tóm tắt; raw desktop không bị cắt theo giới hạn đó.

Chạy từ `aim-lab`, dùng thư mục output mới:

```powershell
npm run data:audit -- "$env:APPDATA/V-AIM COACH/sessions/raw" "output/audit-new"
```

Lệnh kiểm cấu trúc, thời gian/sequence, liên kết trial/click, geometry, coverage, hash và duplicate. Output gồm `audit.json` và `aim-events.jsonl`. Chỉ phiên đủ điều kiện đánh giá aim, hash đúng và không trùng mới được xuất event. Tracking xuất một record theo phiên có thời gian hợp lệ và RMS; trial bắn giữ cả timeout/miss. Đây là bảng đánh giá, chưa phải corpus có quyền và protocol đủ để train.

Schema event xuất là `aim-trial-1` hoặc `aim-tracking-1`, độc lập với schema nghiên cứu `schemas/aim_event.schema.json` v0.1. Không giả mạo chuyển đổi các trường chưa đo để vượt schema nghiên cứu.

## Gate hiện tại

`eligibleForAimEvaluation`: cấu trúc đúng, coverage tối thiểu 90%, hoàn tất không pause, tối thiểu 10 trial hoặc 10 giây tracking hợp lệ, không phải synthetic/combat/decision task. Ngưỡng này là gate kỹ thuật ban đầu, chưa chứng minh độ tin cậy tâm trắc.

Decision task được đánh giá bằng gate riêng; combat không trộn endpoint hạ nhóm địch với aim một mục tiêu. Synthetic có thể hợp lệ về cấu trúc nhưng không đủ điều kiện đánh giá người chơi.

`eligibleForTraining`, `eligibleForSensitivityFit`, `eligibleForCoachingEffectFit` hiện đều false. Việc log sạch không tự chứng minh hiệu quả thay sens hoặc hiệu quả luyện tập.

## Kiểm định đã thực hiện

- Unit tests cho camera translation/crouch, tọa độ trùng, timestamp bằng nhau/đảo chiều, sequence trùng, orphan trial/click, dữ liệu null, timeout, checkpoint và tách combat.
- 60 kiểm thử liên quan dữ liệu/metrics/charts/coaching/desktop/training đều đạt. Smoke bản Windows đã đóng gói xác nhận load, WebGL và desktop bridge hoạt động.
- Electron tích hợp dùng protocol, preload, IPC và native save thật trong profile tạm riêng. Pointer lock và thao tác được mô phỏng; chưa phải kiểm sensor chuột thật.
- Lần kiểm cuối profile `v-aim-data-smoke-8160`: precision 361 frame/2 shot (có hit và first-hit timing), tracking 354 frame/0 shot, site 346 frame/10 shot. Cả 3 không lỗi cấu trúc, checkpoint được dọn sau final save.
- Audit độc lập 3 file xác minh hash: 3 hợp lệ, 0 đủ điều kiện đánh giá vì được đánh dấu synthetic. Báo cáo nằm tại `aim-lab/output/data-quality-audit-20260909/audit.json`.
- Kiểm toàn dự án ở thời điểm rà soát còn lỗi `site-lanes.test.mjs`: Garden entry `(14,13)` không nối tới vùng trung tâm. Map Garden đang có thay đổi layout riêng; chưa sửa layout trong phạm vi chuẩn hóa dữ liệu này.

## Cần bổ sung trước khi train để cải thiện aim

1. Đo thực raw input/gain trên máy và thiết bị của người chơi; hiện browser movement units không được chứng nhận sensor counts.
2. Xác nhận người chơi: ID đang đại diện profile ứng dụng. Nhiều người dùng chung máy cần chọn profile riêng trước khi thu nghiên cứu.
3. Pilot test–retest nhiều ngày; có đối chứng lịch tập và khóa endpoint trước validation. Baseline/retest tự chọn chưa phải thử nghiệm ngẫu nhiên.
4. Gán nhãn motor onset, overshoot/correction theo thuật toán được kiểm trên ground truth. Hiện motor onset để null với reason `NOT_VALIDATED`.
5. Có consent và protocol dùng dữ liệu để train; thu liều tập, tuân thủ, baseline/retest đầy đủ. Không mở cờ train chỉ vì đủ số frame.
6. Tách người chơi và ngày tương lai khi train/test; kiểm chuyển giao trên VALORANT độc lập sau khi phép đo trong harness ổn.
