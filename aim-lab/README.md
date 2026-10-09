## 0.24.0 — Local data lake release

- Sau khi hoàn tất phiên desktop có consent, raw và manifest được kiểm checksum rồi tự đồng bộ cục bộ theo lớp `Bronze → Silver → Gold`. Phiên lỗi, synthetic hoặc chưa consent bị chặn khỏi dữ liệu dự đoán.
- Lớp Bronze là immutable; đồng bộ lại cùng raw là idempotent, còn trùng `sessionId` nhưng checksum khác bị từ chối để không ghi đè lịch sử.
- Mở vị trí dữ liệu từ menu **Ứng dụng** → **Mở data lake cục bộ**. Chưa có upload server hoặc API cloud trong bản demo.
- Build phát hành duy nhất: `release/V-AIM-COACH-0.24.0-Windows-x64.exe`.

## 0.22.0 — Lotus reference details

- Integrates the supplied reference into the playable temple: warm sandstone, softer weathering, layered pink lotus crowns, instanced hanging foliage, column water ribbons and an engraved lotus floor medallion.
- Wider skylight openings and more stone paving retain dirt channels and the existing connected interior layout. Flowers, foliage and water are cosmetic; water ribbons are static, not fluid simulation.
- Build: release/V-AIM-COACH-0.22.0-Windows-x64.exe.

## 0.21.0 — Lotus temple interior

**Đã triển khai lộ trình luyện tập:** 3 playlists có nghỉ và khôi phục, Shoot/No-shoot, Priority trio, combo/huy chương và so sánh đúng cấu hình. Tổng 31 bài. Xem [hướng dẫn sử dụng](../docs/TRAINING_EXPANSION.md).


- Replaces the outdoor square Garden courtyard with a stepped temple footprint: nave, west cloister, east hall and rear sanctuary. Collision-backed 8 m perimeter walls, nave colonnades, adjoining screen walls and stone obstacles.
- Interior ceiling bands, overhead beams, longitudinal skylights and warm hanging lamps. Existing exterior facades and decorative trees are removed from this site.
- Continuous earth floor with interrupted stone slabs and irregular moss patches. Floor stays level for movement; upper galleries and ramps remain accessible.
- Player and bot navigation respect the room footprint. Minimap includes room shapes. All three approach routes remain connected to the plant area.
- Build: release/V-AIM-COACH-0.21.0-Windows-x64.exe.

## 0.20.0 — Ancient Lotus masonry

- Garden/Lotus alone gains weathered plaster, exposed stone, branching cracks, mineral stains and moss patches.
- Added lotus wall reliefs, incomplete halo carvings, broken frieze segments, trailing surface growth and chipped parapet tops. Removed modern utility vents from this site.
- Surface details retain the existing cover footprints; visible cracks are not bullet-passable openings. Other site styles are unchanged.
- Build: release/V-AIM-COACH-0.20.0-Windows-x64.exe.

## 0.19.0 — Weapon clarity

**Cập nhật mini-game 09/09/2026:** thêm 6 bài (Figure 8, Pendulum, Zigzag click, Stop & Go, Elevation ladder, Flash flick), nâng catalog lên 29 bài gồm 25 mini-game và 4 Combat Sites; có 7 thử thách. Mở **Mini-games** ở sidebar hoặc chọn **Game Mode** trong briefing. Xem [chi tiết và các phần cần bổ sung](../docs/MINI_GAMES_REVIEW.md). Đây là cập nhật mã nguồn/bundle, chưa có EXE mới.


- Bevelled gun housings, receiver screws, ejection-port recess, rail teeth, fore-end vents, magazine ribs and dark muzzle bores.
- Knife uses a broad extruded blade with bevelled cutting edges, ribbed handle, metal pins and pommel.
- Neutral fill light and subdued non-emissive body materials replace bright colored body glow. Geometry stays outside hit tests; damage and recoil rules are unchanged.
- Build: release/V-AIM-COACH-0.19.0-Windows-x64.exe.

## 0.18.0 — Wall bands and terrain cover

- Added 17 collision-backed pieces per site: staggered entry-lane walls, rear L-shaped wall enclosures, interrupted low back walls, and raised cover at 0.45 / 0.85 / 1.25 m.
- Long walls have buttresses and inset bands; stepped cover has distinct top surfaces and edge markings. Low steps can be jumped onto, not automatically climbed.
- All three entrances remain connected to the objective. Both existing upper-floor ramps remain passable, and bot spawn movement checks pass.
- Build: release/V-AIM-COACH-0.18.0-Windows-x64.exe.

## 0.17.0 — Bot stances and combat HUD

- Bots alternate crouch, occasional jumps, trigger-release windows and smooth pre-aim toward visible or last-seen player positions. They stop firing in midair or while aim is unsettled. Procedural animation, not a skeletal motion-capture system.
- Added 20 collidable pillar-and-wall corner clusters across four maps. Existing entrances and ramp routes remain usable.
- Top-left minimap shows layout, player heading, objective and unobstructed enemy positions. Bottom health/shield bars, red impact vignette fading in 650 ms, and low-health styling.
- Build: release/V-AIM-COACH-0.17.0-Windows-x64.exe.

## 0.16.0 — Objective update

- Hold Ctrl for smooth crouch eye height and slower movement; hold Shift to walk. Crouch lowers the enemy sight-line target but does not allow crawling beneath geometry.
- 1 primary / 2 Classic / 3 knife / 4 Spike. Separate procedural view models, 300 ms equip delay, 2 m melee reach and 50 knife damage. No ammunition/reload simulation yet.
- Retake: pre-planted objective, 45-second fuse, hold F within 2 m for 7-second defuse with a 3.5-second checkpoint. Eliminating bots alone does not win.
- Attack & Plant: 90 seconds to enter and plant. Hold F with slot 4 in the marked zone for 4 seconds, then survive 45 seconds against bot waves. Moving or releasing F cancels planting; pausing freezes time.
- Solo objective drills: no agent abilities, teammates, economy or bot defusing. Timing values are training rules; this is not a full Valorant match simulation.
- Added perimeter vents, light strips, framed entry portals and equipment hands. Bot navigation remains on the ground floor.
- Retake role reference: https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-00/
- Build: release/V-AIM-COACH-0.16.0-Windows-x64.exe.

## 0.15.0 — Cover routes and armed bots

- Added 21 collidable supply caches across the four site layouts (garden 7, piazza 4, atrium 5, foundry 5), with straps, handles and surface trim. Three entrances and both ramps remain clear.
- Bots use ground-level grid navigation to relocate between cover-adjacent positions, with smooth velocity and brief firing pauses. Player-accessible upper floors remain; bots currently navigate the ground floor.
- Procedural Vandal-style rifle on bots. Shared Vandal damage: head 160, body 40, legs 34; bots have 150 total HP, matching the player's 100 HP + 50 shield budget. Other player weapons now have explicit per-region damage in `src/combat-balance.js`.
- Easy / Normal / Hard / Expert vary reaction, shot cadence, accuracy and movement (1.35 / 1.65 / 2.0 / 2.3 m/s), never damage. Enemy hits are probabilistic with line-of-sight checks; this is not a physical bullet simulation. Rifle geometry is authored locally.
- EXE: `release/V-AIM-COACH-0.15.0-Windows-x64.exe`.

## Bản phát triển 0.14.0 — Animated opponents & multilevel sites

- Bot có chân khớp xoay theo nhịp bước, thân/tay chuyển nhẹ theo nhịp chạy/thở, vận tốc né được blend qua gia tốc. Vùng trúng đạn của chân đi theo mesh động. Đây là animation procedural, chưa phải motion capture hoặc IK bàn chân.
- Súng góc nhìn thứ nhất lắc nhẹ theo tốc độ đi bộ; giữ tâm ngắm độc lập với hiệu ứng lắc súng.
- Khu chơi khoảng 52 × 49 m; hai tầng biên cao 1.8 m / 3 m có ramp đi lên, nhảy xuống được. Ba cổng West/Main/East ở phía tiếp cận, vùng đặt bom 7 × 6 m đánh dấu dưới sàn. Vùng này là mốc luyện tập, chưa có cơ chế đặt/gỡ bom.
- Dữ liệu traversal chung ở `src/maps/shared/traversal.js`, áp dụng cho 4 map. Kiểm tra đường vào, đi lên/xuống ramp, animation và phiên FPS bằng input mô phỏng.
- Windows: `release/V-AIM-COACH-0.14.0-Windows-x64.exe`.

## Bản phát triển 0.13.0 — Surface & ornamental detail

- Bề mặt đá/kim loại procedural có vân, đường mạch và đinh tán, tạo bằng mã và dùng offline. Texture được giải phóng khi đổi site.
- Piazza có cửa chớp, mái hiên sọc và bồn hoa trên cao; Garden/Atrium có cột, phù điêu và huy chương đá; Foundry có ống nối, mặt bích và van.
- Chi tiết mới nằm dọc tường và trên vùng ngắm. Không thay đổi layout va chạm hoặc cân bằng bot.
- Kiểm thử Electron chạy cả 4 site với di chuyển, nhảy, giữ cò và recoil bằng input mô phỏng.
- Windows: `release/V-AIM-COACH-0.13.0-Windows-x64.exe`.

## Bản phát triển 0.12.0 — Map/site folders & architectural detail

- Map data now lives in `src/maps/{garden,piazza,atrium,foundry}/sites/main/layout.js`; each site has a `scene.js` render entry point. See `src/maps/README.md` for the folder contract.
- Added upper side galleries, railings, window/door surrounds, masonry courses and lamps; Foundry uses pipes and ventilation details. Cover has plinths and layered face panels.
- Original map IDs, collision layout and saved-session compatibility are preserved. New ornamental architecture stays along the perimeter or above the aiming band.
- Windows build: `release/V-AIM-COACH-0.12.0-Windows-x64.exe`.

## Bản phát triển 0.11.0 — Site architecture & smooth movement

- Thêm Temple Garden (tham khảo mỹ thuật Lotus) và Piazza Court (tham khảo mỹ thuật Ascent), nâng tổng số Combat Sites lên 4. Có mái tầng, vòm, tháp, cây rủ và nền trời theo chủ đề. Đây là kiến trúc nguyên gốc giản lược, chưa phải bản tái dựng map Valorant chính xác.
- Bóng đổ mềm 2048 px, vật liệu dùng chung, sàn dùng instancing để giảm draw calls. Chỉnh typography, đường viền, hover/focus của menu Combat Sites.
- Di chuyển có gia tốc/phanh theo thời gian, giữ nguyên nhảy và va chạm.
- Tham khảo: [Lotus art & architecture](https://playvalorant.com/en-gb/news/dev/lotus-unearthing-valorant-s-lost-city/), [Ascent design](https://playvalorant.com/en-us/news/dev/the-birth-of-ascent/).
- Windows: `release/V-AIM-COACH-0.11.0-Windows-x64.exe`.

## Bản phát triển 0.10.0 — Expanded combat sites

- Hai site mở rộng khoảng 36 × 45 m, thêm đường vòng và 7 cụm vật che cao/thấp mỗi site. Thiết kế nguyên gốc, tham khảo nguyên tắc sightline/encounter distance trong bài [The Birth of Ascent](https://playvalorant.com/en-us/news/dev/the-birth-of-ascent/).
- Bot né ngang theo vị trí người chơi, lùi khi người chơi quá gần; tốc độ tối đa 1.65 m/s, đổi quyết định sau 0.85–1.85 giây, có dừng ngắn và xử lý vật cản cục bộ. Chưa dùng hệ thống tìm đường toàn map.
- Địch xuất hiện cách nhau 1 giây; nghỉ 2.8 giây sau khi hạ hết đợt.
- Space nhảy, có trọng lực và tiếp đất trên vật che thấp. Giữ chuột trái bắn liên thanh khoảng 9 phát/giây trong Combat Sites; recoil kéo camera lên và lệch ngang nhẹ, có thể ghìm bằng chuột. Nhả cò một lúc đặt lại nhịp recoil, không tự kéo tâm về vị trí cũ.
- Bản portable: `release/V-AIM-COACH-0.10.0-Windows-x64.exe`.

## Bản phát triển 0.9.1 — Compact tactical opponents

Địch có dáng người chiến thuật nguyên gốc gọn hơn, cao khoảng 1.77 m, đầu nhỏ, giáp ôm thân và hai tay giữ súng. Combat Sites đặt chân đúng mặt sàn, vùng trúng đạn bám theo đầu/thân/tay/chân; súng và phụ kiện không nhận hit. Exercise version 0.9.1 tách baseline vì kích thước hình học đã đổi. File Windows: `release/V-AIM-COACH-0.9.1-Windows-x64.exe`.

## Bản phát triển 0.9.0 — Combat Sites FPS

**Combat Sites** thay vị trí Tactical Lab trên sidebar: chọn **Sunken Atrium** hoặc **Relay Foundry**, độ khó và thời lượng rồi chơi ở góc nhìn thứ nhất.

- **Site Defense:** 2–3 địch một đợt tùy độ khó, xuất hiện ở nhiều phía. Hạ hết đợt sẽ có đợt mới cho đến khi hết giờ hoặc hết HP.
- **Movement Read:** địch đổi nhịp strafe/wide swing/điểm đến, xen kẽ nhịp dừng ngắn; gây ít sát thương hơn để tập đọc chuyển động.
- WASD, Shift, ngắm chuột và click bắn; có súng, thân hình địch, cover chặn di chuyển và đường đạn. Không có camera tactical hay mũi tên hướng dẫn trong phiên.
- Ghi số phát, hạ gục, HP/giáp và vị trí/vận tốc. Đạn địch vẫn dùng mô hình xác suất có xét cover và chuyển động, chưa phải mô phỏng đường đạn vật lý đầy đủ.

Windows portable: `release/V-AIM-COACH-0.9.0-Windows-x64.exe`. Integration harness `scripts/site-smoke.cjs` kiểm tra hai phiên trong Electron với input mô phỏng và profile riêng.

## Bản phát triển 0.8.0 — Tactical Lab

Mở **Tactical Lab** ở sidebar để xem 10 tình huống: wide swing, jiggle peek, angle clearing, off-angle, counter-strafe, shoulder peek, micro-adjustment, target switch, vertical transition và retake.

- Cảnh Three.js nguyên gốc, nhân vật cyan/cam, đường di chuyển, hướng ngắm được chặn bởi cover, bóng vị trí và vùng lộ/khuất cho bài peek.
- Phát/tạm dừng, tua timeline, chọn bước, đổi tốc độ, xoay/zoom camera, toàn màn hình và bật/tắt hướng dẫn.
- 10 ảnh concept đi kèm, dùng offline. Concept là minh họa mỹ thuật; mô phỏng 3D dùng hình học riêng để kiểm tra đường nhìn.
- Đây là mô phỏng hướng dẫn chiến thuật, chưa phải 10 mini-game điều khiển trực tiếp và không tạo điểm hay lịch sử luyện tập. Các mini-game WASD/bắn trả hiện có vẫn nằm trong phần Train.

Bản portable cục bộ: `release/V-AIM-COACH-0.8.0-Windows-x64.exe`.

## Bản phát triển 0.7.0 — Active tactical mini-games

- Ba mode mới: **Strafe Duel**, **Counter-strafe** và **Survival Lane**.
- Khi vào các mode này, `WASD` di chuyển theo hướng nhìn, `Shift` chạy; địch 3D nguyên gốc có thể strafe, peek, wide swing hoặc đổi lane ngẫu nhiên rồi bắn trả.
- Phiên ghi lại vị trí/vận tốc người chơi, HP/giáp, áp lực địch và sát thương để kết quả vẫn dựa trên dữ liệu đo được.
- Mỗi micro-zone dùng background render nguyên gốc riêng: Lotus Water Court và Dark Range lane thay vì lặp lại một ảnh toàn map.

## Bản phát triển 0.6.0 — V-AIM COACH tactical scenario browser

Giao diện desktop nay dùng App Shell **V-AIM COACH** với top navigation, sidebar cố định, Home coaching hub, Map Training, Scenario Detail và Analytics. Chỉ có hai map: **Lotus** với cảnh đền 3D gốc và **Dark Range** tối giản. Map → zone → scenario → cấu hình → Start Training là một luồng dữ liệu; nút Start dùng đúng engine Pointer Lock/toàn màn hình đang có. Mọi thumbnail, minimap, marker và preview là hình khối CSS/Three.js tự tạo, không dùng UI, logo, map hay asset chính thức của VALORANT.

Scenario được tách vào `src/scenarios.js`: mỗi micro-zone có các tình huống chiến thuật, góc spawn, kỹ năng cần luyện và khuyến nghị riêng. Dashboard và Analytics chỉ hiển thị các số liệu đã lưu cục bộ; không sinh số liệu giả khi chưa có baseline.

## Bản 0.5.6 — Lotus + Dark Range

Map đền đá 3D nguyên gốc nay mang tên **Lotus**. Cảnh có nền lát đá, vách núi low-poly, sáu cột với biến thể gãy, tường lõm, lối đi dẫn tâm, dây leo, lá, hoa năng lượng và ba thác nước chuyển động. **Dark Range** là lựa chọn còn lại: nền tối tối giản, chỉ giữ sàn, mục tiêu và súng để người chơi tập trung hoàn toàn vào tâm ngắm. Các sector cũ đã được bỏ khỏi giao diện và world scene. Lịch sử Verdant Sanctum được đọc là Lotus; phiên thuộc map đã bỏ được giữ nhãn legacy và không gộp vào số liệu hai map hiện hành. Cảnh Lotus dùng geometry Three.js dựng trong app, không dùng layout, texture hay asset của VALORANT.

Tải [bản Windows portable v0.5.6](https://github.com/Dle28/Sens-Valorant-Coach/releases/tag/v0.5.6), kèm checksum SHA-256.

## Bản 0.5.4 — cinematic 3D lobby, sector maps và loadout

Màn hình chính chuyển thành lobby menu: tiêu đề ENTER THE RANGE, loadout đang chọn, PLAY NOW, bộ chọn mode đóng/mở và phím tắt ENTER/ESC. Canvas Three.js được phóng thành cinematic background với cột năng lượng, portal, tinh thể, địa hình low-poly, debris bay, hạt sáng và chiều sâu sương. Bốn sector 3D tự tạo — Astra Courtyard, Three Lane Shrine, Relay Dunes và Polar Cargo — đổi kiến trúc, nền, sương và ánh sáng khi chọn map. Mỗi sector còn áp dụng quy luật lane riêng cho target: Shrine hẹp góc, Relay kéo xa sightline, Cargo đẩy cự ly và peek quanh container. Loadout có bốn profile trình bày theo vai trò súng VALORANT-style; thông số được ghi trong cấu hình phiên nhưng hit logic không phụ thuộc profile. Thẻ MINI-GAME PROGRESS so sánh tối đa tám phiên gần nhất cùng bài/map, hiển thị điểm gần nhất, tốt nhất, chênh lệch và các cột tiến bộ. Màu đỏ san hô là nhận diện riêng của Gamesen; không dùng logo, key art hay tài sản của VALORANT.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.4-Windows-x64.exe`.

## Bản 0.5.2 — FPS visual direction

Màn hình chính chuyển thành lobby menu với tiêu đề ENTER THE RANGE, loadout đang chọn, PLAY NOW, bộ chọn mode đóng/mở và phím tắt ENTER/ESC. Tinh chỉnh theo nghiên cứu giao diện FPS: CTA có tương phản cao, hình khối được đơn giản hóa, trạng thái active/pulse rõ hơn và motion nhẹ dẫn mắt vào nút bắt đầu, kho chế độ, HUD và kết quả. Màu đỏ san hô là nhận diện riêng của Gamesen; không dùng logo, key art hay tài sản của VALORANT.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.2-Windows-x64.exe`.

## Bản 0.5.1 — gaming command deck

Lớp trình bày mới dùng viewport làm trung tâm, command deck cắt góc, HUD chữ kỹ thuật, nền grid/scanline và trạng thái màu để giao diện đọc như một game client hiện đại thay vì dashboard web. Các control cũ vẫn giữ nguyên hành vi và hỗ trợ cả theme tối lẫn sáng.

Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.1-Windows-x64.exe`.

## Bản 0.5.0 — phòng tập FPS và cự ly bắn

Giao diện tactical FPS gọn với chủ đề sáng/tối, mô hình súng và bàn tay góc nhìn thứ nhất dựng bằng Three.js. Chuyển động súng chỉ là hiệu ứng hình ảnh, không đổi tâm ngắm hay phép tính hit.

Cự ly mục tiêu luân phiên theo bài và chuỗi seed. Kết quả có bảng cự ly gần (<12 m), trung (12–<24 m), xa (≥24 m), dùng số mục tiêu cho bài click và thời gian hợp lệ cho tracking. Đây là mét trong phòng tập mô phỏng. Kích thước và quỹ đạo cùng ảnh hưởng kết quả; chỉ nêu cự ly có tỷ lệ thấp khi đủ mẫu.

Exercise version 0.5 tách so sánh với hình học của phiên cũ. Bản Windows cục bộ nằm trong `release/Gamesen-Aim-Lab-0.5.0-Windows-x64.exe`.

## Bản 0.4.1 — giao diện gọn và hướng cải thiện

Bỏ hero, slogan và banner trang; gom toàn bộ chế độ vào một mục đóng/mở, tự đóng khi chọn. Giữ phòng tập và thiết lập chính trên màn hình đầu.

Mỗi biểu đồ có nhận xét riêng gồm bằng chứng + hành động tiếp theo. Báo cáo đặt một ưu tiên ở đầu, giữ các giải thích dài trong mục thu gọn. Hướng luyện dựa trên mẫu số, độ phủ và tính liên tục của phiên; các ngưỡng là quy tắc sản phẩm, chưa phải chuẩn kỹ năng đã kiểm định. Nhận xét được lưu cùng lịch sử phiên mới.

## Bản phát triển 0.4.0 — 08/09/2026

- Giao diện sảnh game với chủ đề Tối / Sáng / Theo hệ thống, lưu trên máy.
- 16 chế độ, 4 độ khó; cầu nhỏ/vừa/lớn luân phiên theo trial, Tracking đổi kích thước mỗi 6 giây. Layout so le theo bài, Head-line giữ cao độ, Micro có kích thước góc nhỏ hơn Precision. Bốn map sector tự tạo đổi kiến trúc và palette trong lobby.
- Phân tích giải thích mẫu số accuracy, tỷ lệ mục tiêu hoàn thành, phát đầu đúng hạn, trung vị/P90, nhịp hit, tracking/RMS/coverage; bảng theo kích thước cho cả click và tracking.
- Biểu đồ trung bình sai số mỗi giây và min–max; biểu đồ nhịp/accuracy mỗi 5 giây; heatmap thời gian và lớp điểm bắn với ba phạm vi góc, thang màu, tooltip và đếm ngoài vùng.
- Session mới ghi targetRadius, sizeBand, distance/layout và aimX/aimY khi bắn. Exercise version 0.4 ngăn so sánh tự động với bài cũ.
- Dữ liệu chi tiết chỉ có trong phiên đang xem/JSON đầy đủ; lịch sử vẫn giữ tóm tắt và các phân tích đã lưu, không dựng lại tọa độ của phiên cũ.
- `tests/visual-preview.html` là fixture QA với dữ liệu tổng hợp, không được đóng gói vào app hay ghi vào lịch sử người chơi.

## Cập nhật giao diện và mini-game

- Thư viện 16 bài tập, lọc theo độ chính xác, tốc độ/phản xạ và bám mục tiêu. Mỗi bài có map, cự ly và profile súng để lưu tiến bộ riêng.
- Thêm Burst control, Grid shot, Strafe click, Orbit tracking và Target switch.
- Bốn mức easy/normal/hard/expert thay đổi kích thước, deadline và tốc độ. Exercise version 0.3 tách so sánh khỏi phiên cũ.
- Bắt đầu yêu cầu khóa chuột và toàn màn hình; chỉ đếm ngược sau khi cả hai thành công. Esc tạm dừng.
- Kết quả có sai số góc theo thời gian, hiệu suất mỗi 5 giây và heatmap góc mục tiêu tương đối với tâm ngắm. Heatmap tính theo thời gian frame hợp lệ, không phải vị trí đạn.
- Biểu đồ chi tiết hiện có sau phiên vừa chơi; lịch sử vẫn lưu tóm tắt.

# Gamesen Aim Lab — Desktop + Web v0.5.6

**Windows desktop:** xem [DESKTOP.md](DESKTOP.md). Bản `.exe` chạy độc lập, tự lưu JSON phiên và nhớ profile. Phần dưới đây là hướng dẫn bản web dùng chung engine.

Chạy trên desktop với chuột, WebGL2 và Pointer Lock. Không kết nối, inject hoặc lấy dữ liệu từ VALORANT.

```bash
cd /home/dungle/Documents/gamesen_coaching/aim-lab
npm ci
npm start
```

Mở http://localhost:4173. Khi dependencies đã được cài, ứng dụng không cần CDN hay tài khoản. Server chỉ bind loopback 127.0.0.1.

```bash
npm test
npm run build
npm run preview
```

`preview` phục vụ bản bundle trong `dist/`, cùng cổng 4173; dừng server trước nếu cổng đang bận. Có thể dùng `PORT=4174 npm run preview`.

## Cách chơi

Chọn một trong bảy bài: Precision, Transfer, Tracking, Micro adjustment, Wide flick, Head-line hoặc Moving click. Ba thử thách có seed/cấu hình cố định và mục tiêu công khai nằm dưới danh sách bài. Đặt sensitivity hip-fire như trong VALORANT và nhập DPI từ phần mềm chuột. Chọn độ khó và 30/60/90 giây, nhấn bắt đầu, chờ đếm ngược. Di chuột để ngắm; click trái để bắn ở Precision/Transfer. Tracking chỉ cần giữ tâm trên quả cầu. Escape tạm dừng; nhấn tiếp tục hoặc kết thúc để xem kết quả. Mất focus/tab bị ẩn sẽ nhả khóa chuột và tạm dừng.

Các nút −10%, Gốc, +10% dùng chung baseline từ lần nhập sensitivity thủ công gần nhất. Một vài lượt không đủ xác định sens tối ưu. Nên giữ cùng bài, độ khó và thời lượng khi so sánh; lịch sử chưa triển khai phân tích thí nghiệm crossover.

## Sensitivity và DPI

- Xoay camera = movementX/Y × sensitivity × 0.07 độ. DPI nhập vào **không nhân thêm vào góc xoay**, vì browser đã cung cấp chuyển động chuột.
- eDPI = DPI × sensitivity; cm/360 = 914.4 / (DPI × sensitivity × 0.07).
- Camera 103 độ ngang, khung 16:9, không ADS/scope. Đây là preset theo quy ước cộng đồng, chưa được kiểm chứng 1:1 với VALORANT trên máy thật.
- Yêu cầu `unadjustedMovement: true`; khi không hỗ trợ hoặc API cũ không trả xác nhận Promise thì chặn phiên, không thử Pointer Lock thường. API không chứng minh raw sensor counts thực sự được cấp, nên luôn ghi `rawVerified: false`. Xem [Pointer Lock API của MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).
- Trình duyệt không đọc/đổi được DPI firmware. Hiệu chuẩn dùng thước thật: chọn quãng 5–50 cm, bắt đầu khóa chuột, Space để ghi, kéo thẳng một chiều hết quãng đường, Space để kết thúc. Lặp ba lượt. Công thức DPI hiệu dụng = abs(net movementX) × 2.54 / cm.
- Loại lượt quá ít dữ liệu, đổi chiều nhiều, quá chéo hoặc ngoài khoảng DPI. Chỉ áp dụng khi đủ ba lượt, cùng loại yêu cầu input, độ trải (max−min)/median ≤15%. Ngưỡng này là heuristic prototype, chưa được validation thực nghiệm. Khoảng cách tự khai, acceleration hệ điều hành và browser vẫn có thể gây sai số.

## Kết quả và dữ liệu

Precision/Transfer: số phát bắn, accuracy, trung vị thời gian tới hit của các trial trúng, tỷ lệ trúng phát đầu trong 2.5 giây trên tất cả trial đã bắt đầu. Trial hết 2.5 giây là timeout; trial dang dở khi kết thúc là interrupted, vẫn nằm trong mẫu số. Trung vị tới hit không bao gồm timeout và phải đọc cùng tỷ lệ thành công.

Tracking: phần thời gian tâm nằm trên hitbox cầu và RMS sai số góc tới tâm target. Frame >100ms bị loại khỏi tích phân tracking và được đếm riêng. Góc là độ; vị trí target là world units. Raycast dùng hitbox sphere 3D, không kiểm tra khoảng cách pixel.

JSON tải sau phiên chứa config đóng băng, seed, inputEvents, frames, shots, trials, pauses và summary. Trong v0.2, input/shot timestamp `t` dùng đồng hồ performance tại lúc xử lý event, nối từ active time của frame trước; chưa phải timestamp sensor hoặc thời điểm photon hiển thị; `dt` là khoảng frame trình duyệt. Không dùng dữ liệu này để khẳng định latency phần cứng hoặc polling rate. CSV chỉ chứa trials, nên Tracking xuất CSV chỉ có header; dùng JSON cho Tracking.

Lưu tối đa 30 **summary kèm phân tích** trong localStorage của origin. Quỹ đạo đầy đủ chỉ giữ trong bộ nhớ phiên hiện tại: tải JSON trước khi bắt đầu phiên mới hoặc reload. Không gửi telemetry qua mạng. Đây là dữ liệu phát sinh từ người chơi prototype; không phải dữ liệu trận VALORANT hay dataset công khai có sẵn, chưa tương thích trực tiếp với `../schemas/aim_event.schema.json`.

## Trạng thái kiểm tra

31 unit tests đã pass cho công thức, hiệu chuẩn, mẫu số và serialization; bundle production build thành công. Chưa kiểm thử hình ảnh, Pointer Lock, full-screen hoặc DPI bằng chuột thật do phiên triển khai không có trình duyệt kết nối. Các test toán học không chứng minh trải nghiệm chơi hay độ khớp sensitivity trên thiết bị.

Checklist chạy trên máy thật: vào ba bài và hoàn tất phiên; click trúng/trượt; Escape và resume; đổi tab; tải JSON; thử ba lượt DPI với thước; đối chiếu cm/360 cùng VALORANT. Cần kiểm tra này trước khi dùng prototype để thu dataset nghiên cứu.

## Preset trực tiếp v0.2.1

Theo yêu cầu người dùng, bỏ toàn bộ bước đo quãng đường và hệ số hiệu chỉnh thủ công trong giao diện. Nhập đúng con số sensitivity hip-fire đang dùng trong VALORANT; camera áp dụng trực tiếp `movement × sens × 0.07°` trên cả hai trục. Không nhân DPI hoặc hệ số bù thêm vào góc xoay. `inputGain: 1` được giữ trong dữ liệu để phân biệt với các phiên v0.2 từng hiệu chỉnh.

Giữ camera 103° ngang trong khung 16:9, yêu cầu raw input qua Pointer Lock. Các giới hạn hỗ trợ của trình duyệt vẫn được ghi rõ trong mục thông tin input; preset là quy ước mô phỏng, chưa có xác nhận vật lý 1:1 trên mọi thiết bị. Hiệu chuẩn DPI là tiện ích tùy chọn riêng, không bắt buộc để chơi.

Bảy bài, ba thử thách, phân tích sau phiên và lịch sử vẫn hoạt động. Gợi ý sau phiên không yêu cầu đo quãng đường nữa. Các ghi chép đối chiếu thủ công trong nghiên cứu v0.2 là lịch sử thiết kế, không phải luồng sử dụng hiện tại.

## Input bỏ qua xử lý hệ điều hành

Bản hiện tại yêu cầu `unadjustedMovement: true` và bỏ fallback input đã xử lý. Chỉ bắt đầu sau khi Promise được chấp nhận; API thiếu hỗ trợ, từ chối hoặc trả kiểu legacy sẽ nhả khóa và báo lỗi. Không thay đổi cấu hình chuột toàn hệ thống. Việc API chấp nhận vẫn không phải kiểm chứng độc lập raw sensor counts.
