# Gamesen Aim Lab Desktop 0.3.0 — Windows x64

Bản desktop đóng gói toàn bộ phòng tập trong Electron 44.2.0. Chạy offline với cửa sổ riêng, không cần mở browser, localhost server, Node.js hoặc npm trên máy người dùng. Ưu tiên Windows x64; Linux dùng để phát triển và smoke test.

## Chạy bản Windows

Mở `release/Gamesen-Aim-Lab-0.3.0-Windows-x64.exe` trên máy Windows x64. Đây là bản portable, không cần cài đặt. File có thể mất vài giây giải nén nội bộ trong lần mở. Bản phát triển chưa ký số và chưa có auto-update; Windows có thể hiển thị cảnh báo nhà phát hành chưa xác minh. Gói được build từ Linux, chưa chạy kiểm thử trên Windows thật.

Chọn bài, đặt đúng sens hip-fire VALORANT rồi bắt đầu. DPI ở profile không đổi DPI firmware. F11 toàn màn hình cửa sổ; nút Toàn màn hình trong phòng tập phóng riêng arena; Escape nhả khóa chuột/tạm dừng. Menu Ứng dụng → Mở thư mục dữ liệu phiên mở nơi app tự lưu JSON đầy đủ. Sens và DPI gần nhất được nhớ qua các lần mở app.

## Dữ liệu

- Summary và profile được lưu trong storage riêng của ứng dụng, không dùng chung localStorage với bản web.
- Sau mỗi phiên, app tự lưu toàn bộ session JSON vào thư mục `sessions` bên trong Electron userData. Menu ứng dụng mở đúng thư mục trên máy đang chạy; không hardcode đường dẫn Windows.
- Nếu ghi file thất bại, app báo để người chơi tải JSON thủ công. Các file phiên đầy đủ không tự xóa; người dùng quản lý dung lượng tại thư mục dữ liệu.
- Nút xuất JSON/CSV có hộp thoại lưu file của hệ điều hành.
- Chuyển lịch sử web: tải lại bản web mới → Lịch sử → Xuất lịch sử → chuyển `gamesen-history.json` sang Windows → app → Lịch sử → Nhập lịch sử từ bản web. Gộp ID, giữ tối đa 30 bản tóm tắt gần nhất. Không nhập quỹ đạo; phân tích và quyền dùng làm baseline không được suy diễn từ bản tóm tắt nhập ngoài. File JSON phiên đầy đủ cũ vẫn giữ riêng để phân tích sau, không phải định dạng import lịch sử.

## Phát triển

Cần Node.js **22.12+**, khuyến nghị Node 22 LTS hoặc mới hơn tương thích, và npm. Gói .exe đã build không cần cài Node.

```bash
cd aim-lab
npm ci
npm run desktop
```

Các lệnh khác:

```bash
npm test
npm run desktop:smoke
npm run pack:win
npm run pack:linux
```

`pack:win` build Windows x64 portable vào `release/`. `pack:linux` tạo thư mục app Linux để smoke test/runtime development. Không tự publish. Đóng gói Windows được cấu hình không ký số; cần quy trình ký và test máy Windows trước khi phát hành rộng rãi.

`npm start` và `npm run preview` vẫn phục vụ bản web khi cần so sánh hoặc xuất lịch sử cũ. Không cần chạy chúng trước `npm run desktop`.

## Kiến trúc

- `desktop/main.cjs`: vòng đời cửa sổ, scheme nội bộ `gamesen://app`, quyền Pointer Lock/fullscreen, menu, native save và download.
- `desktop/preload.cjs`: cầu nối hẹp chỉ lưu session và báo sẵn sàng. Renderer không có Node.js trực tiếp; context isolation và sandbox bật.
- `desktop/policy.cjs`: whitelist tài nguyên và validation payload ghi session. Renderer không tự chọn đường dẫn ghi.
- `src/`: Three.js, input, bài tập, phân tích, lịch sử dùng chung với bản web.
- `dist/`: tài nguyên bundle; app tải trực tiếp từ gói ASAR. Không tải website từ xa hay mở cổng HTTP.
- `scripts/desktop.mjs`: launcher loại biến môi trường ELECTRON_RUN_AS_NODE của một số môi trường phát triển trước khi chạy app.

Tài liệu tham chiếu: [Electron protocol](https://www.electronjs.org/docs/latest/api/protocol), [Electron sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox), [Electron permissions](https://www.electronjs.org/docs/latest/api/session), [electron-builder Windows targets](https://www.electron.build/v26/docs/win/).

## Input và phạm vi

App hiện dùng Chromium đi kèm Electron để xử lý Pointer Lock `unadjustedMovement: true`, chặn fallback input thường. Chuyển sang desktop giúp cố định runtime và chạy độc lập, nhưng chưa phải thay phần input bằng module Windows `WM_INPUT` riêng. Không tự đọc DPI firmware, không tự thay setting hệ điều hành và không kết nối VALORANT. Sens dùng preset 0.07° × sensitivity, FOV 103° ngang; chưa xác nhận độ khớp/latency 1:1 với VALORANT trên Windows.

## Xác minh

31 unit tests bao phủ toán học, dữ liệu, input, bài tập, phân tích, origin/asset policy, validation ghi file và chuyển lịch sử. Smoke test dùng profile tạm riêng, chạy Electron thật và chỉ thành công khi renderer gửi xác nhận sau khi render frame WebGL đầu tiên. Smoke không kiểm thao tác chuột thật, gameplay hoàn chỉnh, hộp thoại lưu file hoặc thiết bị trên Windows. Những mục này cần kiểm trên Windows trước khi dùng để thu dataset nghiên cứu.
