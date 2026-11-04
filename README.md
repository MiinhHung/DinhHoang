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

Một cao nguyên lơ lửng trên biển mây, có lan can đá quanh mép, thác nước đổ xuống và núi đá vôi xa xa. Đi từ nam lên bắc:

1. Lối vào và tam quan **Đình Hoàng Online**, hai bên có cờ âm dương.
2. Sân tròn chạm hoa sen, hai ao sen hai bên (ao trái là Ao Sen thả hoa đăng, cạnh ao phải là Lầu Chuông). Lão Đạo Sĩ đứng ngay sau cổng.
3. Hàng ba điện quay mặt về phía cổng: **Tài Thần Điện** (trái, mái vàng, cây vàng, thỏi vàng), **Tam Thanh Điện** (giữa), **Nguyệt Lão Điện** (phải, mái hồng, anh đào).
4. **Bốc Dịch Đài** trên bệ tròn cao phía sau Tam Thanh, lên bằng bậc thang ở giữa.

Toạ độ các khu vực nằm ở đầu `js/world.js` (`HALL`, `ALTAR`, `POND`, `SPOT`, `PROP`). Chạm xuống sân thì nhân vật tự tìm đường vòng qua điện, ao và lên xuống bậc thang.

## Mô hình 3D dựng bằng Blender

Phần kiến trúc của điện được dựng bằng script Python trong `tools/blender/`, chạy Blender ở chế độ ngầm, không cần mở giao diện. Bóng đổ được bake sẵn vào màu đỉnh, file xuất ra là `.glb` nén Draco, đặt trong `assets/models/`.

```bash
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tam-thanh.glb tam-thanh
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tai-than.glb tai-than
blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/nguyet-lao.glb nguyet-lao
blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/gate.glb gate
blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/chuong.glb chuong
```

- `common.py`: công cụ dùng chung (mái cong ngói, gờ nóc đuôi rồng, bake bóng đổ, xuất file).
- `build_hall.py`: ba điện; màu và kích thước trong `CFG`.
- `build_gate.py`: tam quan và khung Lầu Chuông. Quả chuông và chày vẫn do game dựng để giữ hoạt ảnh.

Nếu thiếu file `.glb` hoặc tải lỗi, game tự dùng khung hình khối đơn giản. Bốc Dịch Đài vẫn dựng trong game.

## Trong sân đình

- **Lão Đạo Sĩ** đứng cạnh chỗ xuất hiện: chào theo buổi, đọc lời dạy hôm nay, nhắc việc lành còn thiếu.
- **Ao Sen** (ao bên trái sau cổng): thả hoa đăng kèm điều nguyện (không lưu). **Lầu Chuông** (cạnh ao bên phải): thỉnh chuông.
- **Cây Tơ Hồng** (trước Nguyệt Lão Điện): buộc dây đỏ, cây giữ lại tối đa 30 sợi của mỗi người. **Cây Kim Tiền** (trước Tài Thần Điện): mỗi ngày hái một lộc.
- **Sổ Công Đức** (nút 📜): 5 việc lành mỗi ngày (thắp hương, xin quẻ, thỉnh chuông, thả hoa đăng, chia sẻ bùa), điểm, cấp bậc, chuỗi ngày liên tiếp, bộ sưu tập quẻ và xem lại lá bùa cũ. Lưu trong `localStorage` của trình duyệt, có nút xóa.
- **Ngày và đêm** theo giờ máy người chơi. Thêm `?gio=14` vào địa chỉ để xem thử cảnh vào giờ khác.

Trong câu chữ có thể dùng các biến: `{ten}` (tên gọi), `{hoten}` (họ tên đầy đủ), `{canchi}`, `{menh}`, `{mong}` (điều mong), `{nghe}`, `{chude}`. Biến nào không có giá trị sẽ để trống (riêng `{ten}` thành “thí chủ”). Ở phần Bốc Dịch không có `{canchi}`/`{menh}`.

## Cấu trúc

```
index.html        Khung trang, cổng vào, HUD, các bảng
config.js         Cấu hình cho đội vận hành
css/style.css     Giao diện
js/main.js        Điều phối: cổng, nghi lễ từng điện, kết quả, chia sẻ
js/world.js       Cảnh 3D (three.js): bố cục, nhân vật, camera, tìm đường, hiệu ứng
js/landscape.js   Địa hình: cao nguyên, vách đá, mây, núi, thác, lan can, ao, cổng, bảng tên
js/build.js       Vật liệu, hình khối và chữ vẽ canvas dùng chung
js/oracle.js      Bộ máy rút quẻ và ráp lời luận
js/lunar.js       Can chi, mệnh nạp âm, giờ âm lịch
js/charm.js       Vẽ lá bùa 1080×1920 (khung Story 9:16) trên canvas
js/share.js       Chia sẻ (Web Share, Facebook, chép lời), link có UTM
js/audio.js       Chuông, mõ, nhạc thiền tổng hợp bằng Web Audio
js/online.js      Người chơi online qua Supabase Realtime
js/progress.js    Sổ công đức: điểm, việc lành, bộ sưu tập (localStorage)
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
