# Dữ liệu, mô hình và feedback cho V-AIM COACH

## Quyết định sản phẩm

Kế hoạch triển khai theo cohort và contract thư mục nằm tại [DEMO_TO_SMALL_COHORT_PLAN.md](DEMO_TO_SMALL_COHORT_PLAN.md). Target v1 đã khoá là performance click ở assessment kế tiếp; demo một người chỉ dùng rule/median baseline, không huấn luyện model.

Sản phẩm nên bắt đầu bằng một hệ thống **đo lường và dự đoán performance ở bài assessment kế tiếp**, không phải mô hình chọn sensitivity hay “bài tốt nhất” ngay từ đầu. Dữ liệu hit/miss trong một mini-game mô tả hành vi hiện tại; nó không cho biết người chơi sẽ tiến bộ vì bài tập nào. Muốn chuyển từ mô tả sang coaching cá nhân hoá phải thu được chuỗi: **baseline chuẩn hoá → can thiệp được ghi nhận → retest chuẩn hoá**, với một nhánh lịch tập đối chứng hoặc random assignment.

Vì vậy roadmap có ba tầng:

1. Đo và feedback theo luật, có sample size/quality gate rõ ràng.
2. Dự đoán endpoint quan sát được ở lần assessment sau.
3. Chỉ sau thí nghiệm random hoá mới ước lượng hiệu quả gia tăng của từng drill và dùng nó để xếp hạng prescription.

Không sử dụng mô hình ngôn ngữ để tính metric, tự gán nhãn trajectory hay kết luận nguyên nhân. Vai trò phù hợp của LLM sau này là diễn giải một kết quả đã được tính và nêu rõ độ chắc chắn.

## Những gì đã được bổ sung trong app

Bản này thêm một vertical slice tạo dữ liệu có thể dùng cho mô hình sau này:

| Thành phần | Cách hoạt động | Ý nghĩa dữ liệu |
|---|---|---|
| `core-aim-battery-v1` | Bốn block 60 giây: Precision, Micro adjustment, Wide flick, Tracking; Dark Range, Vandal, normal và seed cố định | Baseline/retest dùng cùng điều kiện; không trộn so sánh với tập tự do |
| Consent theo phiên | Người chơi tự tick đồng ý trước từng session | Tách dữ liệu được phép dùng làm corpus khỏi lịch sử cá nhân cục bộ |
| `protocol.assessment` | Lưu ID/version/bước của battery và cấu hình đã assign | Validator đánh lỗi nếu task, map, duration, seed hoặc scenario thực tế khác protocol |
| Trial telemetry features | Xuất timing, signed angular error, crossing tâm target và path/reversal input | Mỗi feature kèm `MEASURED`, `PROXY` hoặc `UNAVAILABLE`; browser deltas không bị gọi là raw device counts |
| Baseline → intervention → retest | Phiên intervention giữ source baseline và actual/planned dose; retest giữ reference baseline | UI chỉ báo “paired observation”, không báo hiệu quả nhân quả |
| Audit export | `predictive-model-events.jsonl` chỉ chứa phiên có consent, assessment fixed và quality gate | Không tự train model; `eligibleForKinematicModel` vẫn false nếu raw input chưa được xác thực |

Các module chính là `aim-lab/src/assessment-protocol.js`, `telemetry-features.js`, `coaching-outcomes.js`, `data-contract.js` và `scripts/audit-sessions.mjs`.

## Cơ sở nghiên cứu và hệ quả thiết kế

Nghiên cứu về FPS aiming cho thấy score đơn lẻ không tách được kỹ năng khỏi chiến lược hy sinh tốc độ để lấy chính xác, hoặc ngược lại. Donovan và cộng sự đo shot time, spatial error và mouse kinematics ở hai điều kiện size target khác nhau; họ lập luận rằng cần nhiều điều kiện speed–accuracy để tách motor acuity khỏi chiến lược của người chơi.[^1] Vì thế dashboard không nên xếp hạng người chơi bằng accuracy đơn lẻ, và battery cần báo ít nhất endpoint tốc độ lẫn endpoint chính xác.

Cùng nghiên cứu đó dùng orientation theo thời gian, movement onset, movement speed và corrective movement để mô tả hành vi mouse.[^1] Điều này hỗ trợ việc lưu frame, target, camera, click và shot riêng. Tuy nhiên app hiện nhận `browser_movement_units`; chúng hữu ích như proxy có version để dự đoán trong chính harness, nhưng không được diễn giải là counts vật lý, cm/s, polling rate hay bằng chứng sensitivity. Để đưa kinematics vật lý vào model cần collector xác thực trên thiết bị thật.

Một nghiên cứu dài hạn trên dữ liệu aim trainer quan sát learning curve phi tuyến theo baseline, lượng tập mỗi ngày và số ngày tập; đồng thời tác giả nêu rõ các confound như phần cứng, game ngoài app, sức khoẻ và động lực khó kiểm soát trong dữ liệu “in the wild”.[^2] Hệ quả: lưu fatigue, setup, thời điểm và training dose; dùng assessment seed chưa tập; và không coi điểm tăng trong chính drill vừa luyện là retention hoặc transfer.

Độ tin cậy phải được kiểm trước khi dùng metric làm target ML. Pilot KovaaK’s cho thấy reliability có thể tốt nhưng phụ thuộc task, chiến lược và số lần đo; nghiên cứu khuyến nghị nhiều lần thử/thời điểm để phản ánh kỹ năng thật tốt hơn.[^3] V-AIM COACH nên làm test–retest theo từng block và báo ICC/CI hoặc tối thiểu within-player variation trước khi “đóng” label. Bốn block ở đây là protocol v1 phục vụ pilot, chưa phải thước đo đã chứng minh.

Một thử nghiệm FPS adaptive cho thấy thiết kế adaptive/personalized có thể cải thiện performance so với bản tiêu chuẩn trong bối cảnh nghiên cứu cụ thể.[^4] Điều đó biện minh cho việc thử personalisation, nhưng không chứng minh rằng bất kỳ recommender nào cũng hiệu quả trên Valorant hoặc trên mọi người chơi. Recommendation trong app phải luôn ghi evidence, dữ liệu thiếu và trạng thái thực nghiệm.

Feedback hữu ích, nhưng literature về motor learning không ủng hộ việc spam chỉ dẫn giàu diễn giải sau mỗi thao tác. Nghiên cứu về knowledge of results tìm thấy mức feedback vừa phải hoặc self-controlled có thể tốt hơn mức 100% trong một task vận động cụ thể; bằng chứng vẫn phụ thuộc population/task.[^5] Thiết kế nên cung cấp hit/miss tức thời, còn feedback chẩn đoán theo block/session, có option “xem chi tiết”, và ưu tiên một hành động tiếp theo thay vì nhiều câu sửa kỹ thuật.

## Dataset contract

Raw session là nguồn chân lý, không sửa sau khi lưu. Feature table và model input phải được tái tạo từ raw bằng `extractorVersion`; không overwrite raw hoặc bù null thành nhãn. Cấu trúc khuyến nghị:

| Bảng/stream | Grain | Trường bắt buộc | Không dùng để suy diễn |
|---|---|---|---|
| `sessions_raw` | session | ID giả danh, build/config hash, clock, device, consent, phase, quality | rank, DPI vật lý hoặc raw counts nếu chưa xác thực |
| `trials` | target/trial | task/seed, size/distance, first-visible, first-entry, pointerdown, fire, outcome | ý định người chơi khi miss hoặc nhiều target |
| `frames` | frame | camera, target/reference target ID, signed geometry tính lại được, `dt`, onTarget | presented-on-screen timestamp nếu chỉ có engine frustum |
| `input_events` | input event | sequence, received/source timestamp, dx/dy, yaw/pitch, trust flag | sensor-level velocity/acceleration khi coordinate space là browser unit |
| `interventions` | prescription/run | source baseline, reason/rule version, assigned task/dose, actual dose, status | causal response nếu chưa có retest/control |
| `assessment_pairs` | baseline–retest | same protocol/config, elapsed dose, days apart, pre/post outcome | effect size chung hoặc best drill nếu assignment không random |

Mọi event nên có `playerId`, `sessionId`, `blockId`, `trialId`, `targetId`, `schemaVersion`, `collectorVersion`, `extractorVersion` và SHA-256 source manifest. Cần giữ `missing_reason` với mọi metric chưa đo được.

### Eligibility flags

Các cờ có nghĩa khác nhau:

- `eligibleForAimEvaluation`: session sạch đủ để mô tả aim trong harness.
- `eligibleForPredictiveDataset`: thêm consent, ID bền vững và assessment protocol fixed; phù hợp làm candidate cho mô hình performance trong harness.
- `eligibleForKinematicModel`: chỉ true sau khi `rawVerified` thật sự được xác nhận. Hiện sẽ false.
- `eligibleForCoachingEffectFit`: vẫn false. Một cặp pre/post không đủ cho causal coaching model.
- `eligibleForSensitivityFit`: vẫn false. Sens cần experiment crossover riêng.

Không dùng field boolean đơn lẻ làm chứng nhận khoa học. Khi xuất dataset, giữ `reasonCodes`, source hash và quality columns để analyst quyết định cohort rõ ràng.

## Features và nhãn nên triển khai tiếp

### Nhãn quan sát được ngay

Đây là labels nên ưu tiên vì có thể kiểm lại từ log, không yêu cầu gán nhãn chủ quan.

| Nhóm | Label/metric | Điều kiện diễn giải |
|---|---|---|
| Click | first-shot hit trước deadline; timeout; shot count | Giữ toàn bộ trial trong mẫu số, gồm miss/timeout |
| Timing | visible→entry, entry→first shot, first-shot latency | `visible` hiện là engine sample, không gọi là pixel presentation |
| Precision | signed angular offset tại frame/shot; error RMS; hit rate theo size/distance | So sánh chỉ trong cùng protocol/config |
| Trajectory | path efficiency, reversal count, crossed target center | Browser input là `PROXY`; target động không được gắn label overshoot tĩnh |
| Tracking | time-on-target weighted by valid time, RMS angular error, reacquisition after direction reversal | Chỉ dùng frames phủ đủ thời lượng; định nghĩa reversal phải có version |
| Movement-shot | velocity at shot, time since key release, crouch/jump, recoil applied | Chỉ trong combat endpoint tách riêng; không trộn với one-target aim |
| Decision | shoot/no-shoot accuracy, false fire, priority order error | Task riêng, target/context/latency riêng |

Nên thêm sau pilot và có ground-truth review:

- Motor onset: threshold/segmentation cần kiểm với replay; hiện phải để `UNAVAILABLE`.
- Overshoot/undershoot: cần định nghĩa dựa trên signed target-center crossing, target boundary, target motion và noise floor. Không suy từ một click miss.
- Reacquisition after reversal: log timeline đảo hướng do engine, rồi đo thời gian đi từ reversal đến entry/on-target.
- Movement-stop: log velocity kế trước shot, timestamp keyup và xác định pre-shot stop window. Không gọi mọi shot lúc tốc độ thấp là counter-strafe tốt.

### Biến context phải giữ

`task`, version, block/seed, map, weapon, target radius/angular size, distance, difficulty, deadline, sensitivity, declared/estimated DPI, input mode, display/fps quality, date/time, fatigue, recent practice dose, device changes và pause. Các biến này có thể là confound; thiếu chúng dễ khiến model chỉ học “ngày người chơi mệt” hoặc thay phần cứng.

## Mô hình nên làm, theo thứ tự

### 0. Baseline không-ML — bắt buộc

So sánh cùng người + cùng block + cùng config với median/rolling baseline. Báo confidence theo số lần, variation giữa ngày và quality. Đây là baseline phải đánh bại trước khi gọi bất kỳ mô hình nào hữu ích.

### 1. Dự đoán performance assessment kế tiếp — mô hình đầu tiên

**Mục tiêu:**

- Click blocks: xác suất `firstShotSuccessRate` ở assessment ngày sau, hoặc expected success trên từng trial.
- Tracking: expected time-on-target/RMS ở assessment ngày sau.
- Không dự đoán rank Valorant, K/D hay “sens tối ưu”.

**Feature set v1:** baseline score từng block, xu hướng 3–5 assessment gần nhất, variance cá nhân, dose kể từ baseline, days since previous assessment, fatigue, setup/config, task geometry và quality. Bắt đầu bằng model chỉ dùng aggregated session/trial feature, không dùng raw frame sequence.

**Model:**

1. Regularized logistic/binomial regression cho outcome trial và ridge/elastic-net regression cho session outcome; thêm player fixed effect hoặc hierarchical partial pooling.
2. HistGradientBoosting/CatBoost chỉ sau khi data đủ dày và feature engineering ổn; calibrate probability trên validation set.
3. So sánh với persistence baseline: “lần sau = median ba lần trước cùng block”. Nếu không thắng ở held-out players và future sessions, không deploy.

Mô hình cây có thể học interaction giữa size, distance, fatigue và lịch tập; linear/hierarchical model dễ debug, hợp với cohort nhỏ và tạo benchmark minh bạch. Không ưu tiên neural network hoặc sequence transformer: raw trajectory nhiều chiều, sample độc lập ít và input chưa raw-verified.

**Đánh giá:** Brier score/log loss + calibration curve cho probability; MAE/median absolute error cho score; error theo player, block, fatigue và thiết bị. Phải hold out toàn bộ player và một future time window. Documentation của scikit-learn cảnh báo không fit/đánh giá trên cùng dữ liệu, và khuyên split theo group/time nếu generative process có group hoặc phụ thuộc thời gian.[^6]

### 2. Phân loại pattern kinematic — chỉ sau raw-input validation

**Mục tiêu:** dự đoán pattern *đã định nghĩa* như `high_correction_proxy`, `late_entry`, `unstable_tracking`, không dự đoán các lời khuyên mơ hồ như “aim tệ”.

**Mô hình:** logistic regression/gradient boosting per task, với labels reviewable; sau đó sequence model chỉ khi có số lượng large raw trajectories, same-rate sampling và external test set. Phải lưu feature validity để model không học missingness như performance.

**Feedback:** “Ở 18/30 trial tĩnh, tâm đã qua center trước phát đầu; đây là metric geometry trong harness. Lặp 30 s micro ở easy, rồi retest.” Không nói “sens của bạn quá cao”.

### 3. Xếp hạng drill — một bài toán causal, chưa làm sớm

Prediction “ai sẽ có score cao” không trả lời “drill nào tạo thêm improvement”. Khi user tự chọn drill, selection bias rất mạnh: người chơi yếu có thể chọn bài dễ, người tập nhiều có thể khác về động lực. Causal/individual treatment-effect models chỉ xét sau khi drill/control được assign random và endpoint retest đã khóa. Các tổng quan ITE phân biệt prediction với treatment-effect estimation và nêu randomized data là chuẩn phù hợp cho mục tiêu latter.[^7]

**Thiết kế tối thiểu:** random giữa 2–3 can thiệp hợp lý và 1 routine control có cùng thời lượng; block random theo player/day; không đổi sens; retest ngày hôm sau bằng seed assessment chưa tập. Tạo row ở grain `player × baseline × assigned treatment × retest`.

**Model:** bắt đầu bằng average treatment effect + confidence interval cho mỗi cohort. Sau khi kiểm đủ power và overlap, thử T-learner/S-learner hoặc causal forest để ước lượng CATE; evaluate policy bằng held-out randomized data. Không hiển thị prescription cá nhân nếu CI/overlap yếu.

### 4. Sensitivity experiment — cohort và protocol riêng

Sens là intervention khác training drill. Dùng randomized crossover, wash-in/adaptation, counterbalanced order, exact actual gain, nhiều ngày validation và safe reversion về baseline. Endpoint nên là assessment fixed nhiều condition speed–accuracy; không chọn sens theo score của một session. Không gộp vào dataset coaching ban đầu.

## Chính sách feedback

### Tức thời trong trial

Cho feedback outcome tối giản: hit/miss, hold đúng/sai trong decision task. Không hiện correction diagnosis hoặc thay sensitivity trong lúc player điều khiển chuột; điều đó làm thay đổi hành vi và làm nhiễu measurement.

### Sau block/session

Chỉ hiện khi quality gate và sample size đạt:

1. **Một headline:** metric yếu nhất có số liệu, chẳng hạn “first-shot đúng hạn thấp hơn baseline cùng block”.
2. **Evidence:** numerator/denominator, deadline, size/distance, coverage, và delta so với baseline cùng config.
3. **Một action:** drill, difficulty, liều 30–90 giây, mục tiêu quan sát được.
4. **Uncertainty:** “một session”, “input proxy”, “không kết luận sens”, hoặc “thiếu sample”.
5. **Retest prompt:** sau intervention hoàn tất, khóa lại baseline config; hiển thị observed delta, không causal wording.

Không feedback theo metric nếu: session pause/ended early, coverage thấp, config khác, imported history, có combat/decision endpoint lẫn vào aim evaluation, hoặc feature `UNAVAILABLE`.

## Protocol pilot và ngưỡng ra quyết định

### Pilot measurement

- 3–5 người chơi, tối thiểu hai ngày; mỗi người làm full battery baseline và retest không can thiệp để đo natural variation.
- Kiểm tay khoảng 100 event gồm: static, moving, timeout, camera translation, nhiều target và click bị chặn. So trace/frame/shot với replay/debug state.
- Lưu lý do loại dữ liệu, không chỉ đếm valid rate.
- Khóa protocol khi seed/config/target geometry/version thay đổi; version mới là cohort mới.

### Pilot coaching

- Từ baseline, random assignment giữa một drill theo rule và routine control cùng thời lượng.
- Log proposed dose, actual dose, skip/early end, fatigue, thời gian giữa intervention và retest.
- Đánh giá primary endpoint là change tại retest vào ngày sau; secondary endpoint là transfer block khác task nhưng cùng difficulty family.
- Báo average result trước; không cố tìm subgroup “phù hợp” khi cohort chưa đủ.

### Điều kiện chuyển pha

| Quyết định | Cần bằng chứng trước khi chuyển |
|---|---|
| Đưa metric vào feedback | semantic validator, replay QA, test–retest variation và UX wording review |
| Train model performance | consented fixed assessments; group/time split; model thắng persistence baseline; calibration chấp nhận được |
| Hiện dự đoán cho user | error theo subgroup không có bias lớn; explanation không vượt bằng chứng; fallback rule khi confidence thấp |
| Personalize drill | held-out randomised policy evaluation cho thấy uplift so với control |
| Đề xuất sens | crossover protocol độc lập và validation qua ngày |

## Pipeline vận hành

1. Desktop lưu `raw/<session>.json` và manifest. Không chỉnh file raw.
2. Chạy khối lệnh PowerShell trong [`aim-lab/data/README.md`](../aim-lab/data/README.md) để audit raw directory.
3. Kiểm `audit.json`; điều tra reason code, duplicate/hash mismatch trước khi export.
4. `aim-events.jsonl` giữ các event mô tả aim sạch; `predictive-model-events.jsonl` là cohort đã consent + standardized assessment. Cả hai vẫn giữ provenance và eligibility.
5. Build feature set bằng extractor version cố định, create immutable dataset manifest (session IDs, hashes, cohort dates, exclusions).
6. Split theo player và future time. Fit imputer/scaler/feature selection trong training folds; freeze model card, data manifest và metric report.
7. Chỉ release feedback model sau shadow evaluation; log model version, prediction, confidence và rule fallback để audit.

## Giới hạn hiện tại

- Browser API đã request unadjusted movement nhưng chưa chứng minh raw hardware counts; kinematic fields là proxy.
- Engine `firstVisible` không phải measurement của photon/display presentation.
- Battery chưa có reliability study riêng; “standardized” trong mã nghĩa là fixed protocol, không phải validated psychometric instrument.
- Điểm tập trong harness chưa chứng minh transfer sang VALORANT. Muốn kiểm transfer cần POV/replay có consent và annotation độc lập.
- Một cặp baseline–intervention–retest chỉ tạo observed within-player delta. Không thể chứng minh effect hay personalize treatment.

## Sources

[^1]: Donovan, I. et al. (2022). [“Assessment of human expertise and movement kinematics in first-person shooter games.”](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2022.979293/full) *Frontiers in Human Neuroscience*, 16, 979293. https://doi.org/10.3389/fnhum.2022.979293.

[^2]: Listman, J. B. et al. (2021). [“Long-Term Motor Learning in the ‘Wild’ With High Volume Video Game Data.”](https://pmc.ncbi.nlm.nih.gov/articles/PMC8720934/) *Frontiers in Human Neuroscience*, 15, 777779. https://doi.org/10.3389/fnhum.2021.777779.

[^3]: Rogers, E. J. et al. (2024). [“KovaaK's aim trainer as a reliable metrics platform for assessing shooting proficiency in esports players: a pilot study.”](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1309991/full) *Frontiers in Sports and Active Living*, 6, 1309991. https://doi.org/10.3389/fspor.2024.1309991.

[^4]: Neri, F. et al. (2021). [“Personalized Adaptive Training Improves Performance at a Professional First-Person Shooter Action Videogame.”](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.598410/full) *Frontiers in Psychology*, 12, 598410. https://doi.org/10.3389/fpsyg.2021.598410.

[^5]: Hebert, E. P., & Coker, C. (2021). [“Optimizing Feedback Frequency in Motor Learning: Self-Controlled and Moderate Frequency KR Enhance Skill Acquisition.”](https://pubmed.ncbi.nlm.nih.gov/34338053/) *Perceptual and Motor Skills*, 128(5), 2381–2397. https://doi.org/10.1177/00315125211036413.

[^6]: scikit-learn developers. [“Cross-validation: evaluating estimator performance.”](https://scikit-learn.org/stable/modules/cross_validation.html) Accessed 2026-09-11; see group/time-dependent split guidance and preprocessing leakage notes.

[^7]: Basu, S. et al. (2024). [“Individualized Treatment Effect Prediction with Machine Learning — Salient Considerations.”](https://doi.org/10.1056/EVIDoa2300041) *NEJM Evidence*, 3(1).
