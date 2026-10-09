# Kế hoạch demo → nhóm nhỏ: feedback mini-game trước

## Quyết định đã chốt

Mục tiêu giai đoạn đầu là giúp người chơi **cải thiện điểm trong mini-game**, với feedback có bằng chứng sau mỗi block/session. Chưa claim transfer sang VALORANT thực tế, chưa dự đoán rank và chưa thay sensitivity tự động.

Demo hiện chỉ có một tester. Vì vậy giá trị hiện tại là kiểm chứng measurement và feedback rule; không train hay hiển thị mô hình ML từ một người chơi.

## Target mô hình đầu tiên

`next-assessment-click-v1` dự đoán xác suất `firstShotHit` của từng trial trong **lần assessment chuẩn hoá kế tiếp**, cho block `precision`, `micro` và `wide` cùng người chơi. Khoảng dự đoán là 1–3 ngày sau assessment trước.

UI không đưa ra một xác suất theo từng target. Nó tổng hợp thành dự báo `firstShotSuccessRate` cho block, kèm phạm vi bất định và fallback: “chưa đủ assessment, dùng median ba lần gần nhất.”

Tracking giữ thành endpoint riêng (`timeOnTarget`/RMS) và chỉ được thêm khi v1 click hoạt động tốt. Recommendation “drill nào hiệu quả nhất” là bài toán causal, chỉ làm sau random drill-vs-control.

## Feedback phải hoạt động ngay trong demo

Không cần ML để làm feedback tốt. Sau session sạch, app cần giữ đúng thứ tự:

1. **Headline duy nhất:** metric yếu nhất có đủ mẫu, ví dụ first-shot hit trước deadline.
2. **Evidence:** `x/y`, deadline, block/config và thay đổi so với baseline cùng cấu hình.
3. **Một action:** task, độ khó, liều 30–90 giây; không đổi sens trong action.
4. **Guardrail:** nếu pause, thiếu sample, đổi DPI/sens/map/seed hay data quality thấp thì báo “chưa so sánh được”.
5. **Retest:** sau intervention, khoá lại baseline config và chỉ nói “observed delta”, không nói drill gây ra delta.

Không dùng browser movement để bảo người chơi DPI/sensitivity sai. DPI là metadata người chơi khai báo từ profile chuột.

## Dữ liệu cần thu

| Tầng | Grain | Bắt buộc | Dùng cho |
|---|---|---|---|
| Raw session | phiên | config, protocol, consent, device/profile change, full events/frames, checksum | replay/audit |
| Trial | target | block/seed, target geometry, deadline, first-shot outcome/timing, timeout | label click v1 |
| Assessment block | player × block × ngày | success count, attempt count, quality, fatigue, dose từ assessment trước | feature/model v1 |
| Intervention pair | player × baseline × assignment × retest | assigned drill/control, actual dose, retest result, days apart | causal coaching sau này |

Mọi bảng phải mang `schemaVersion`, `collectorVersion`, `extractorVersion`, `protocolId`, `blockId`, `sourceManifestHash` và `missing_reason`. Raw là immutable; feature tái tạo từ raw.

## Kế hoạch với một tester hiện tại

### Measurement pilot — chưa train model

- Hoàn tất 8 battery chuẩn hoá (4 block/battery) trải tối thiểu 4 ngày, không cố ý đổi sens/DPI/map/weapon.
- Xem variation từng block, tỷ lệ session bị loại và trace cho khoảng 100 event thuộc các case: hit, miss, timeout, moving target, pause.
- Nếu config hoặc geometry thay đổi, tăng `protocolVersion`; không trộn dữ liệu cũ vào baseline.

### Coaching pilot — kiểm workflow

- Sau khi measurement pilot ổn, làm 12 cặp baseline → assignment → retest.
- Random xen kẽ một drill rule-based với routine control có cùng thời lượng; retest sau 1–3 ngày.
- Log cả liều được giao và liều thực tế; skip/ended-early vẫn là dữ liệu, không tự bỏ im lặng.

Mục tiêu của hai pilot là sửa collector, wording và protocol. Với một người, chỉ dùng trend cá nhân/rule fallback; không claim generalization.

## Mở rộng cho nhóm nhỏ

### Cohort đầu tiên

- Mời 10–15 người, có consent rõ ràng, cùng bản app/protocol.
- Mỗi người làm 2 battery/tuần trong 4 tuần: mục tiêu 80–120 battery (320–480 block rows). Đây là gate về chất lượng vận hành, chưa phải bằng chứng đủ cho recommendation cá nhân.
- Nếu raw đủ sạch, mở rộng ít nhất 30 người × 8 battery trước khi cân nhắc thử model pooled đơn giản. Dù đạt con số này vẫn phải thắng persistence baseline trên future holdout mới được hiển thị prediction.

### Nhóm phát triển tối thiểu

| Vai trò | Trách nhiệm | Tiêu chí nhận việc |
|---|---|---|
| Product/data owner | protocol, consent, cohort, metric definition | Không thay protocol âm thầm |
| Game/frontend | collector, UI feedback, export | Không làm feedback khi quality gate fail |
| Data/ML | audit, feature, baseline/model evaluation | Dataset manifest + reproducible metrics |
| QA/research (part-time) | replay QA, test–retest, wording review | Issue có trace/session ID, không chỉ screenshot |

Mỗi PR dữ liệu cần reviewer kiểm: schema version, unit/provenance, missing behavior, quality gate, test fixture và không chứa raw player data.

## Sơ đồ folder cho reviewer

```text
aim-lab/
├── src/                         # game + collector + rule feedback
├── scripts/audit-sessions.mjs   # raw JSON -> audit + event export
├── data/README.md               # contract Bronze / Silver / Gold
└── ml/                          # model data, không phải 3D assets
    ├── features/                # feature builders versioned
    ├── training/                # reproducible train jobs
    ├── evaluation/              # split, calibration, baseline comparison
    └── registry/                # approved model cards + rollout state
```

`src/models/` đã có nghĩa khác: 3D asset. Không đặt ML code vào đó.

## Data lake và server tương lai

### Trạng thái bản demo hiện tại

Desktop app đã có đường nối cục bộ: một session hoàn tất có consent được lưu raw + manifest, kiểm SHA-256 và cấu trúc, rồi ghi append-only vào `userData/data-lake/bronze`, `silver` và (nếu qua quality gate) `gold`. Luồng này không có network request; dùng menu **Ứng dụng → Mở data lake cục bộ** để kiểm tra. Đây là nguồn để audit và build dataset trước khi mời cohort nhỏ.

Khi triển khai server, giữ nguyên ranh giới raw/manifest và thay điểm đến cục bộ bằng API ingest có xác thực; không thay bằng việc chỉ gửi score tổng hợp.

```text
Desktop app
  -> API ingest (auth + consent + rate limit)
  -> Bronze object storage: raw JSON + manifest, append-only
  -> validator/extractor
  -> Silver event tables
  -> Gold assessment/pair tables
  -> feature job + dataset manifest
  -> training/evaluation registry
  -> prediction API + rule fallback trong app
```

Server không nên nhận “score đã tổng hợp” như nguồn duy nhất. Nó phải nhận session raw đã validate, manifest checksum, schema/protocol version và consent state. Cần có deletion/consent-revocation workflow trước khi mời cohort ngoài nhóm thân quen.

## Gate trước mỗi pha

| Pha | Điều kiện qua gate |
|---|---|
| Rule feedback | sample/quality guards và wording được test |
| Nhóm 10–15 | raw audit sạch, protocol frozen, consent/revocation rõ |
| Shadow model | model thắng persistence trên future data, calibration đạt ngưỡng đã công bố |
| Prediction hiển thị | monitor drift + rule fallback + model card được duyệt |
| Personalized drill | randomised control evaluation cho uplift đáng tin cậy |
