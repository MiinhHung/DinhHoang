# Đình Hoàng Online

Đạo quán 3D chạy trên trình duyệt: thắp hương ở Tam Thanh Điện, rút xăm Nguyệt Lão, xin quẻ Tài Thần, gieo quẻ Kinh Dịch ở Bốc Dịch Đài, rồi nhận một lá bùa độc bản để lưu hoặc chia sẻ. Chỉ mang tính giải trí.

Trang web tĩnh hoàn toàn, không cần build, không cần máy chủ riêng.

## Chạy thử trên máy

Trang tải nội dung bằng `fetch`, nên **không mở thẳng file `index.html`** được — cần một web server tĩnh bất kỳ:

```bash
npx serve .          # hoặc
python -m http.server 8080
```

Rồi mở địa chỉ server in ra (ví dụ `http://localhost:3000`).

## Đưa lên mạng

Tải nguyên thư mục lên bất kỳ nơi nào phục vụ file tĩnh (Netlify, Vercel, Cloudflare Pages, GitHub Pages, hosting thường). Sau đó điền `siteUrl` trong `config.js` để link chia sẻ trỏ đúng địa chỉ.

## Link vào thẳng một điện, mã QR

Thêm `?dien=<điện>` vào địa chỉ thì người mới bấm cổng sẽ được đưa thẳng tới điện đó và mở luôn nghi lễ. Các điện: `tam-thanh`, `nguyet-lao`, `tai-than`, `boc-dich`. Link chia sẻ từ lá bùa tự gắn tham số này.

Ví dụ mã QR in ở sự kiện cho Tài Thần Điện:

```
https://ten-mien-cua-ban/?dien=tai-than&utm_source=qr&utm_medium=offline&utm_campaign=ten-su-kien
```

## Cấu hình — `config.js`

| Mục | Ý nghĩa |
| --- | --- |
| `siteName` | Tên hiển thị trên lá bùa và lời chia sẻ |
| `siteUrl` | Địa chỉ web chính thức; để trống thì lấy địa chỉ đang chạy |
| `hashtags` | Gắn vào cuối lời chia sẻ |
| `supabase.url`, `supabase.anonKey` | Bật chế độ thấy người chơi khác trong đình. Để trống = chơi một mình |
| `supabase.maxVisiblePlayers` | Số người tối đa hiển thị cùng lúc |
| `analytics.ga4Id` | Mã Google Analytics 4 (`G-XXXXXXX`); để trống = tắt |
| `birthYear` | Khoảng năm sinh hợp lệ |

### Người chơi online (Supabase)

Chỉ dùng Realtime (presence + broadcast), **không cần tạo bảng**. Tạo một project Supabase, vào *Project Settings → API*, chép `Project URL` và `anon public key` vào `config.js`. Chỉ danh xưng, màu áo và vị trí nhân vật được gửi đi — họ tên thật và năm sinh không bao giờ rời khỏi máy người chơi.

## Sửa nội dung quẻ — thư mục `content/`

Không cần đụng vào code; sửa JSON rồi tải lại trang.

- `nguyet-lao.json` — các thẻ xăm Nguyệt Lão (`single` / `dating` / `couple` là lời luận theo tình trạng).
- `tai-than.json` — các quẻ Tài Thần (`timing`: `tien` nên tiến, `thu` nên thủ, `giu` giữ nhịp).
- `boc-dich.json` — đủ 64 quẻ Kinh Dịch. **Không xóa quẻ nào**: mỗi tổ hợp `upper`/`lower` phải có mặt, nếu không gieo ra quẻ thiếu sẽ lỗi.
- `van-phong.json` — câu mở đầu, câu kết, lời chúc, lời khuyên theo ngành nghề, chủ đề hỏi Dịch, lời chúc Tam Thanh.
- `dao-si.json` — lời chào của Lão Đạo Sĩ theo buổi, lời dạy mỗi ngày (trích Đạo Đức Kinh, mỗi ngày một câu), các lộc của Cây Kim Tiền.

## Bản đồ

Một ngọn núi nổi trên biển mây, đi từ chân núi lên đỉnh qua bốn tầng, nối nhau bằng bậc đá ở giữa:

1. **Tầng 1** (chân núi): tam quan **Đình Hoàng Online**, sân tròn chạm hoa sen, Ao Sen thả hoa đăng (trái), ao thác và Lầu Chuông (phải), Lão Đạo Sĩ đứng sau cổng.
2. **Tầng 2**: **Tài Thần Điện** (trái, mái vàng, cây kim tiền, thỏi vàng) và **Nguyệt Lão Điện** (phải, mái hồng, cây tơ hồng). Suối chảy giữa, có cầu đá bắc qua.
3. **Tầng 3**: **Tam Thanh Điện**, điện lớn nhất; cạnh đó là suối nguồn của thác.
4. **Đỉnh núi**: **Bốc Dịch Đài**, nhìn xuống toàn cảnh.

Dòng thác đổ từ suối nguồn tầng 3 xuống tầng 2, chảy qua cầu, rồi đổ tiếp xuống ao thác tầng 1, chạy dọc bậc thang. Hai bên sườn núi có thêm thác đổ xuống biển mây.

Ba điện đều đi vào được bên trong; nghi lễ diễn ra trong điện, trước lư hương. Khi vào trong, camera tự thu gần và nằm dưới trần.

Toàn bộ toạ độ và độ cao nằm trong `js/map.js` (`LEVELS`, `STAIRS`, `HALL`, `ALTAR`, `WATER`, `POND`). Chạm xuống đất thì nhân vật tự tìm đường: vòng qua điện, ao, suối, đi qua cầu, lên xuống bằng bậc thang. Không leo được vách núi, mép nền điện hay vành đài.

## Mô hình 3D dựng bằng Blender

Phần kiến trúc của điện được dựng bằng script Python trong `tools/blender/`, chạy Blender ở chế độ ngầm, không cần mở giao diện. Bóng đổ được bake sẵn vào màu đỉnh, file xuất ra là `.glb` nén Draco, đặt trong `assets/models/`.

```bash
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tam-thanh.glb tam-thanh
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tai-than.glb tai-than
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/nguyet-lao.glb nguyet-lao
blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/gate.glb gate
blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/chuong.glb chuong
blender --background --factory-startup --python tools/blender/build_altar.py -- assets/models/boc-dich.glb
blender --background --factory-startup --python tools/blender/build_tree.py -- assets/models/cay-da.glb
blender --background --factory-startup --python tools/blender/preview.py -- assets/models/tam-thanh.glb xem-truoc.png
```

- `common.py`: công cụ dùng chung (mái cong ngói, gờ nóc đuôi rồng, vành tám cạnh, bake bóng đổ, xuất file).
- `build_hall.py`: ba điện có nội thất: sàn ô cờ, thảm đỏ, hai hàng cột đai vàng, dải lụa, trần ô cờ với vòm tảo tỉnh, bệ thờ, bình phong, khám thờ và tượng thần ngồi đài sen. Màu và kích thước trong `CFG`, phải khớp `HALL` trong `js/map.js`.
- `build_gate.py`: tam quan và khung Lầu Chuông. Quả chuông và chày vẫn do game dựng để giữ hoạt ảnh.
- `build_altar.py`: bệ Bốc Dịch Đài. Bát quái xoay và đèn lồng do game dựng.
- `preview.py`: render ảnh xem trước một file `.glb` để kiểm tra nhanh.

Nếu thiếu file `.glb` hoặc tải lỗi, game tự dùng khung hình khối đơn giản. Tổng các mô hình khoảng 2,8 MB.

## Trong sân đình

- **Lão Đạo Sĩ** đứng cạnh chỗ xuất hiện: chào theo buổi, đọc lời dạy hôm nay, nhắc việc lành còn thiếu.
- **Ao Sen** (tầng 1, bên trái): thả hoa đăng kèm điều nguyện (không lưu). **Lầu Chuông** (tầng 1, bên phải): thỉnh chuông.
- **Cây Tơ Hồng** (trước Nguyệt Lão Điện): buộc dây đỏ, cây giữ lại tối đa 30 sợi của mỗi người. **Cây Kim Tiền** (trước Tài Thần Điện): mỗi ngày hái một lộc.
- **Sổ Công Đức** (nút 📜): 5 việc lành mỗi ngày (thắp hương, xin quẻ, thỉnh chuông, thả hoa đăng, chia sẻ bùa), điểm, cấp bậc, chuỗi ngày liên tiếp, bộ sưu tập quẻ và xem lại lá bùa cũ. Lưu trong `localStorage` của trình duyệt, có nút xóa.
- **Trà Đình Định Tâm** (tầng 1, bên thác lớn phía đông): chọn trà, giữ để pha, ba nhịp thở theo vòng tròn, nhận một lời dạy; thêm 5 công đức mỗi ngày.
- **Lễ hoa đăng chung** mỗi tối (mặc định 20:00, 30 phút, sửa trong `config.festival`): HUD đếm ngược, Ao Sen kín hoa đăng, đèn trời bay lên; thả hoa đăng trong giờ lễ được thưởng công đức.
- **Ảnh khoảnh khắc**: khi rút được quẻ, camera lia cận cảnh vái lạy rồi chụp lại thành thiệp khung Story có tên người chơi, lưu và chia sẻ được cùng lá bùa.
- **Ngày và đêm** theo giờ máy người chơi; ban đêm đèn lồng phát sáng, có đom đóm và trăng sau Bốc Dịch Đài. Thêm `?gio=21` vào địa chỉ để xem thử giờ khác.
- **Mùa và lễ âm lịch**: hoa lá rơi đổi theo mùa (đào, sen, lá vàng, mai), lời chào dịp Tết, Rằm tháng Giêng, Vu Lan, Trung Thu, Rằm và mùng Một; đêm rằm trăng to hơn. Thêm `?ngay=2026-02-17` để xem thử một ngày.
- **Sự sống**: cá chép bơi trong các ao, đàn hạc bay quanh núi, mây trôi qua đỉnh.

Trong câu chữ có thể dùng các biến: `{ten}` (tên gọi), `{hoten}` (họ tên đầy đủ), `{canchi}`, `{menh}`, `{mong}` (điều mong), `{nghe}`, `{chude}`. Biến nào không có giá trị sẽ để trống (riêng `{ten}` thành “thí chủ”). Ở phần Bốc Dịch không có `{canchi}`/`{menh}`.

## Cấu trúc

```
index.html        Khung trang, cổng vào, HUD, các bảng
config.js         Cấu hình cho đội vận hành
css/style.css     Giao diện
js/main.js        Điều phối: cổng, nghi lễ từng điện, kết quả, chia sẻ
js/map.js         Bản đồ núi: các tầng, bậc đá, điện, dòng nước; độ cao và chỗ đi được
js/world.js       Cảnh 3D (three.js): dựng cảnh, nhân vật, camera, tìm đường, hiệu ứng
js/landscape.js   Địa hình: cao nguyên, vách đá, mây, núi, thác, lan can, ao, cổng, bảng tên
js/build.js       Vật liệu, hình khối và chữ vẽ canvas dùng chung
js/oracle.js      Bộ máy rút quẻ và ráp lời luận
js/lunar.js       Can chi, mệnh nạp âm, giờ âm lịch
js/charm.js       Vẽ lá bùa 1080×1920 (khung Story 9:16) trên canvas
js/share.js       Chia sẻ (Web Share, Facebook, chép lời), link có UTM
js/audio.js       Chuông, mõ, nhạc thiền tổng hợp bằng Web Audio
js/online.js      Người chơi online qua Supabase Realtime
js/progress.js    Sổ công đức: điểm, việc lành, bộ sưu tập (localStorage)
js/night.js       Ban đêm: hiệu ứng phát sáng, quầng đèn, đom đóm
js/life.js        Cá chép, hạc, mây trên đỉnh núi
js/calendar.js    Âm lịch Việt Nam, mùa và ngày lễ
js/analytics.js   Ghi nhận UTM, gửi sự kiện GA4
content/          Nội dung quẻ (JSON)
assets/models/    Mô hình .glb xuất từ Blender
tools/blender/    Script Python dựng mô hình trong Blender
assets/           Icon và ảnh xem trước khi chia sẻ (og.png)
```

## Điều khiển

- Điện thoại: kéo cần điều khiển góc trái, hoặc chạm xuống sân để đi tới đó.
- Máy tính: W A S D / phím mũi tên (đi theo hướng camera), hoặc bấm chuột xuống sân; giữ chuột kéo để xoay góc nhìn, lăn chuột để phóng to/thu nhỏ; phím **E** để vào nghi lễ khi đứng trước điện.
- Điện thoại: vuốt một ngón trên màn hình để xoay góc nhìn, chụm/mở hai ngón để phóng to/thu nhỏ.
- Nút 🗺 để đi nhanh tới các điện, ⛩ về Chính Điện, 🔊 bật/tắt âm thanh.
