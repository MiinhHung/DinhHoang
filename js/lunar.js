// Can chi, mệnh nạp âm và giờ âm lịch — tính thuần, không cần dữ liệu ngoài.
const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CON_GIAP = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];

// 30 cặp nạp âm theo vòng Lục Thập Hoa Giáp, bắt đầu từ Giáp Tý.
const NAP_AM = [
  ["Hải Trung Kim", "Kim"], ["Lư Trung Hỏa", "Hỏa"], ["Đại Lâm Mộc", "Mộc"], ["Lộ Bàng Thổ", "Thổ"], ["Kiếm Phong Kim", "Kim"],
  ["Sơn Đầu Hỏa", "Hỏa"], ["Giản Hạ Thủy", "Thủy"], ["Thành Đầu Thổ", "Thổ"], ["Bạch Lạp Kim", "Kim"], ["Dương Liễu Mộc", "Mộc"],
  ["Tuyền Trung Thủy", "Thủy"], ["Ốc Thượng Thổ", "Thổ"], ["Tích Lịch Hỏa", "Hỏa"], ["Tùng Bách Mộc", "Mộc"], ["Trường Lưu Thủy", "Thủy"],
  ["Sa Trung Kim", "Kim"], ["Sơn Hạ Hỏa", "Hỏa"], ["Bình Địa Mộc", "Mộc"], ["Bích Thượng Thổ", "Thổ"], ["Kim Bạch Kim", "Kim"],
  ["Phú Đăng Hỏa", "Hỏa"], ["Thiên Hà Thủy", "Thủy"], ["Đại Trạch Thổ", "Thổ"], ["Thoa Xuyến Kim", "Kim"], ["Tang Đố Mộc", "Mộc"],
  ["Đại Khê Thủy", "Thủy"], ["Sa Trung Thổ", "Thổ"], ["Thiên Thượng Hỏa", "Hỏa"], ["Thạch Lựu Mộc", "Mộc"], ["Đại Hải Thủy", "Thủy"]
];

const mod = (n, m) => ((n % m) + m) % m;

export function yearInfo(year) {
  const i = mod(year - 4, 60);
  const [napAm, menh] = NAP_AM[Math.floor(i / 2)];
  return {
    year,
    canchi: `${CAN[mod(year - 4, 10)]} ${CHI[mod(year - 4, 12)]}`,
    conGiap: CON_GIAP[mod(year - 4, 12)],
    napAm,
    menh
  };
}

// Giờ âm lịch theo giờ đồng hồ: Tý = 23h–1h.
export function gioAm(date = new Date()) {
  return CHI[Math.floor(((date.getHours() + 1) % 24) / 2)];
}

export function ngayVN(date = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}
