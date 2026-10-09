# Nâng cấp đồ họa map — 09/09/2026

- UV theo đơn vị thế giới: mỗi ô texture phủ 2 m, tránh kéo họa tiết qua cả cột/tường dài.
- Giảm độ tương phản các vết loang và rêu trong texture đá cổ; giữ đường mạch đá nhỏ.
- Vát cạnh nhẹ cho khối lớn đứng trên mặt đất (cột/cover); geometry dùng lại theo kích thước. Hình render nằm trong kích thước collision cũ.
- Bóng tiếp xúc mềm dưới vật thể đặt trên đất, dùng một instanced mesh. Đây là bóng trang trí tĩnh, không thay thế bóng động.
- Tách ánh sáng xanh của range khỏi Combat Sites. Lotus dùng mặt trời ấm gần giếng trời, fill trung tính và đèn vàng; map ngoài trời có fill riêng.
- Dọn geometry, material, texture và shadow map khi dựng lại site.

Kiểm tra: 130 tests đạt và build thành công. Electron chạy Lotus, Atrium, Foundry không lỗi renderer; khoảng 16,7 ms median frame trong mẫu ngắn ~1,4 giây mỗi map trên môi trường kiểm tra. Không phải benchmark phần cứng hoặc phép đo cải thiện so với bản cũ.

Ảnh: `aim-lab/output/graphics-garden.png`, `graphics-atrium.png`, `graphics-foundry.png`. Chạy lại bằng `node_modules/.bin/electron.cmd scripts/graphics-smoke.cjs` trong thư mục aim-lab.

## Đợt tiếp theo: vật liệu và nhân vật

- Đã thêm normal map và roughness map procedural riêng cho đá/kim loại, giữ dữ liệu linear và texture màu sRGB. Mạch đá có độ nổi nhẹ; kim loại có độ nhám riêng.
- Gạch Lotus có texture chi tiết, normal map nhẹ và màu biến thiên theo viên; toàn bộ texture tạo cục bộ, không cần tải asset mạng.
- Ba biến thể agent nguyên gốc: sentinel, scout tóc sáng và engineer có kính trên trán. Bổ sung mắt, lông mày, mũi, miệng, tai, tóc, tai nghe; áo giáp nhiều lớp, cổ áo, dây đai, khóa, túi và trang bị lưng. Cạnh trang bị được làm mềm.
- Kích thước đầu giữ nguyên; chi tiết khuôn mặt, tóc, trang bị phụ không bổ sung vùng nhận đạn. Cả ba biến thể dùng chung hình học nhận sát thương; vẫn là nhân vật procedural cách điệu, chưa phải model skinned với animation mocap.
- 131 tests đạt; build đạt. Electron kiểm ba map và render cận cảnh agent không lỗi. Ảnh nhân vật: `aim-lab/output/agent-lineup.png`; tạo lại bằng `scripts/agent-preview.cjs`.

Chưa bổ sung AO toàn cảnh, shader nước hay preset chất lượng. Chưa đóng gói EXE mới.
