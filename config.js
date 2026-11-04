// Cấu hình chung của Đình Hoàng Online — đội vận hành sửa file này, không cần đụng tới code.
export default {
  siteName: "Đình Hoàng Online",
  // Địa chỉ web chính thức (dùng cho link chia sẻ). Để trống thì tự lấy địa chỉ đang chạy.
  siteUrl: "",
  // Hashtag gắn vào lời chia sẻ.
  hashtags: ["#DinhHoangOnline", "#XinQueDauNam", "#BuaDuyen", "#LayViaTaiLoc"],

  // Người chơi online (thấy nhau trong đình) qua Supabase Realtime.
  // Điền URL và anon key của project Supabase để bật. Để trống = chơi một mình.
  supabase: {
    url: "",
    anonKey: "",
    channel: "dinh-hoang-world",
    maxVisiblePlayers: 30
  },

  // Đo nguồn truy cập. Điền mã Google Analytics 4 (G-XXXXXXX) để bật, để trống = tắt.
  analytics: {
    ga4Id: ""
  },

  // Giới hạn năm sinh hợp lệ (âm lịch).
  birthYear: { min: 1920, maxAgeOffset: 6 },

  // Lễ hoa đăng chung mỗi tối (giờ trên máy người chơi): bắt đầu lúc `hour` giờ, kéo dài `minutes` phút.
  // Thả hoa đăng trong giờ lễ được thưởng `bonus` công đức, mỗi ngày một lần.
  festival: { hour: 20, minutes: 30, bonus: 10 }
};
