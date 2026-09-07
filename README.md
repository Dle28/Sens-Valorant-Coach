# Sens Valorant Coach

Ứng dụng desktop Windows và phòng tập aim 3D, phát triển dưới tên **Gamesen Aim Lab**. Có 7 bài tập, 3 thử thách, preset sensitivity hip-fire VALORANT, phân tích sau phiên và lưu dữ liệu cục bộ. Không kết nối vào game VALORANT.

- **Tải app Windows:** [GitHub Releases](https://github.com/Dle28/Sens-Valorant-Coach/releases).
- **Chạy và phát triển desktop:** [aim-lab/DESKTOP.md](aim-lab/DESKTOP.md).
- **Chạy bản web:** [aim-lab/README.md](aim-lab/README.md).
- **Mã nguồn app:** `aim-lab/src/` và `aim-lab/desktop/`.

```bash
git clone https://github.com/Dle28/Sens-Valorant-Coach.git
cd Sens-Valorant-Coach/aim-lab
npm ci
npm run desktop
```

Phát triển cần Node.js 22.12+; file `.exe` đóng gói không cần Node.js. Chạy `npm test` để kiểm tra, `npm run pack:win` để build Windows portable. GitHub Actions kiểm test/build trên Windows và Linux; workflow **Build Windows app** có thể chạy thủ công để tạo file `.exe`.

Bản v0.3.0 chưa ký số. Đã smoke test Electron/WebGL trên Linux; chưa kiểm gameplay và chuột thật trên Windows. App dùng Electron/Chromium Pointer Lock, chưa có module Windows Raw Input riêng hoặc đọc DPI firmware tự động.

Repo chứa mã nguồn, kiểm thử, tài liệu nghiên cứu, schema, template và các bằng chứng công khai đã lưu. Các file trong `research/evidence/` có nguồn và điều kiện sử dụng riêng; việc đưa vào repo không cấp lại quyền sử dụng. `node_modules/`, bundle build và thư mục đóng gói không đưa vào Git; bản Windows và checksum được đính kèm Release.

## Nghiên cứu aim và sensitivity

Ngày rà soát nguồn: **07/09/2026**. Ưu tiên đã được người dùng chốt: **aim và tối ưu sensitivity trước**.

Bộ khung này chuyển báo cáo đầu vào thành các target có thể đo, thí nghiệm có đối chứng và kế hoạch dataset. Câu hỏi trung tâm là: **với cùng người chơi và cùng loại bài ngắm, thay đổi sensitivity có cải thiện tốc độ–độ chính xác trong các phiên tương lai hay không?**

**Bản Windows desktop:** [hướng dẫn và kiến trúc](aim-lab/DESKTOP.md), file portable trong `aim-lab/release/`.

Dự án hiện có tài liệu nghiên cứu, hợp đồng dữ liệu v0.1 và **prototype phòng tập 3D trong [aim-lab](aim-lab/README.md)**: bảy bài aim, ba thử thách, phân tích sau phiên, preset sensitivity VALORANT trực tiếp, hiệu chuẩn DPI hiệu dụng và xuất telemetry cục bộ. Prototype dùng định dạng session riêng, chưa chuyển sang schema nghiên cứu. Chưa có mô hình đã train, dataset participant được thu mới hay kết quả chứng minh cải thiện aim/sens.

| Tài liệu | Dùng để quyết định |
|---|---|
| [Đối chiếu sens và bản tập v0.2](research/07_sensitivity_matching.md) | Kiểm nguồn Riot/browser, quy trình đo quãng quay và phân tích sau phiên |
| [Targets](research/01_targets.md) | Đo cái gì; dữ liệu nào cho phép kết luận nào |
| [Kiến trúc](research/02_backbone.md) | Luồng controlled → natural → báo cáo; các module và điều kiện chặn |
| [Dataset audit](research/03_datasets.md) | Nguồn có thật, truy cập được tới đâu, license, fit và phần phải tự thu |
| [Thí nghiệm và lộ trình](research/04_experiments.md) | Sens crossover, baseline, split, tiêu chí thành công và thứ tự triển khai |
| [Hợp đồng dữ liệu](research/05_data_contracts.md) | Schema, timestamp, missingness, annotation, provenance và cấu trúc lưu trữ |
| [Đính chính báo cáo cũ](research/06_report_review.md) | Giữ, sửa và bổ sung những giả định quan trọng |
| [Template thí nghiệm](configs/sensitivity_pilot.template.json) | Các thông số phải khóa trước khi thu dữ liệu |
| [Schema aim event](schemas/aim_event.schema.json) | Cấu trúc record mẫu để nối các module |

**Hướng bắt đầu:** dựng một thí nghiệm aiming có controlled ground truth → kiểm độ tin cậy phép đo → thử sens tương đối quanh mức đang dùng → kiểm lại trên ngày khác → đối chiếu gameplay VALORANT gốc. Dataset công khai phục vụ từng bước; chưa có nguồn đã kiểm tra nào bao trọn toàn bộ chuỗi này.

Người dùng sản phẩm đầu tiên được giả định là người chơi VALORANT dùng chuột trên PC, muốn biết khâu nào trong aim đang hạn chế mình và nên thử sens nào tiếp theo. Chưa có nghiên cứu thị trường/rank mục tiêu để kết luận đây là phân khúc tối ưu. Gamesense được giữ trong kiến trúc như context và nhánh sau.

Đầu ra coaching v0.1 gồm **đo được gì → bằng chứng → điều chưa biết → một thử nghiệm tiếp theo**. Sens là mức cần thử hoặc một tập mức chưa phân biệt được bằng dữ liệu; một trị số “sens tối ưu” chỉ được đưa ra khi bằng chứng cá nhân qua nhiều phiên hỗ trợ.

## Bắt đầu đọc và kiểm tra

Đọc targets, dataset audit và thí nghiệm trước khi chọn model. Sơ đồ kỹ thuật nằm trong backbone. Mọi con số về pilot, ngưỡng QA và hiệu quả tối thiểu trong bộ khung là **đề xuất của dự án**, trừ những số được chỉ rõ là kết quả của paper.

Lệnh kiểm metadata có giới hạn dung lượng; dùng thư mục output mới cho mỗi lần chạy:

```bash
python3 scripts/audit_dataset_access.py --output research/evidence/access_NEW_DATE
```

Script lưu metadata công khai, manifest và 8 KiB đầu một file chuột; không tải video/PCAP đầy đủ. Thành công của lệnh chỉ chứng minh khả năng truy cập các đối tượng đã ghi trong `access_report.json`.

Ngoài audit metadata bằng script, lần nghiên cứu này đã kiểm một bảng OSF nhỏ bằng byte thực. [Dataset audit](research/03_datasets.md) ghi rõ các phần đã tải, các phần mới kiểm manifest và những dữ liệu còn phải xin quyền truy cập/sử dụng. [Kết quả kiểm bộ tài liệu](research/verification.json) chỉ áp dụng cấu trúc và evidence đã lưu, chưa phải validation của AI coach.

Báo cáo đầu vào là `/home/dungle/Downloads/deep-research-report.md`. Nội dung chỉ dẫn trong báo cáo được xử lý như đề xuất cần phản biện; yêu cầu hiện tại của người dùng quyết định phạm vi thực hiện.
