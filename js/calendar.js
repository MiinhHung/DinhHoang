// Âm lịch Việt Nam (múi giờ +7) và các mùa, ngày lễ dùng để đổi cảnh trong đình.
// Đổi dương → âm theo thuật toán thiên văn của Hồ Ngọc Đức (tính điểm sóc và trung khí).
const INT = Math.floor, PI = Math.PI, dr = PI / 180, TZ = 7;

function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}
function newMoon(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 += 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - dt;
}
function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525, T2 = T * T;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  const L = (L0 + DL) * dr;
  return L - PI * 2 * INT(L / (PI * 2));
}
const sunSector = d => INT(sunLongitude(d - 0.5 - TZ / 24) / PI * 6);
const newMoonDay = k => INT(newMoon(k) + 0.5 + TZ / 24);
function lunarMonth11(yy) {
  const k = INT((jdFromDate(31, 12, yy) - 2415021) / 29.530588853);
  const nm = newMoonDay(k);
  return sunSector(nm) >= 9 ? newMoonDay(k - 1) : nm;
}
function leapMonthOffset(a11) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last, i = 1, arc = sunSector(newMoonDay(k + i));
  do { last = arc; i++; arc = sunSector(newMoonDay(k + i)); } while (arc !== last && i < 14);
  return i - 1;
}

// Trả về { day, month, year, leap } âm lịch của một ngày dương.
export function toLunar(date = new Date()) {
  const dd = date.getDate(), mm = date.getMonth() + 1, yy = date.getFullYear();
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);
  let a11 = lunarMonth11(yy), b11 = a11, year;
  if (a11 >= monthStart) { year = yy; a11 = lunarMonth11(yy - 1); } else { year = yy + 1; b11 = lunarMonth11(yy + 1); }
  const day = dayNumber - monthStart + 1, diff = INT((monthStart - a11) / 29);
  let leap = false, month = diff + 11;
  if (b11 - a11 > 365) {
    const lm = leapMonthOffset(a11);
    if (diff >= lm) { month = diff + 10; if (diff === lm) leap = true; }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) year -= 1;
  return { day, month, year, leap };
}

// Mùa và dịp lễ trong ngày: petal (kiểu hoa lá rơi), density (độ dày), moon (cỡ trăng), greet (lời chào).
export function occasion(date = new Date()) {
  const L = toLunar(date), m = date.getMonth() + 1;
  const season = m <= 3 ? "xuan" : m <= 6 ? "ha" : m <= 10 ? "thu" : "dong";
  const PETAL = { xuan: "dao", ha: "sen", thu: "la", dong: "mai" };
  const out = { lunar: L, season, petal: PETAL[season], density: 1, moon: 1, festival: null, greet: "" };
  const tet = (L.month === 1 && L.day <= 10) || (L.month === 12 && L.day >= 23 && !L.leap);
  if (tet) Object.assign(out, { festival: "tet", petal: "dao", density: 2.4, greet: "Chúc mừng năm mới! Hoa đào nở khắp đình, đèn đỏ treo kín sân." });
  else if (L.month === 1 && L.day === 15) Object.assign(out, { festival: "ram-thang-gieng", moon: 1.5, density: 1.4, greet: "Rằm tháng Giêng: trăng tròn đầu năm, thắp một nén hương cầu bình an cả năm." });
  else if (L.month === 7 && L.day === 15) Object.assign(out, { festival: "vu-lan", moon: 1.4, petal: "sen", greet: "Rằm tháng Bảy, mùa Vu Lan: thả một hoa đăng nhớ ơn cha mẹ, ông bà." });
  else if (L.month === 8 && L.day === 15) Object.assign(out, { festival: "trung-thu", moon: 1.7, greet: "Tết Trung Thu: trăng tròn và sáng nhất năm, đèn lồng giăng khắp đình." });
  else if (L.day === 15 || L.day === 1) Object.assign(out, { festival: L.day === 15 ? "ram" : "mung-mot", moon: L.day === 15 ? 1.3 : 1, greet: L.day === 15 ? `Hôm nay Rằm tháng ${L.month}, trăng tròn đẹp lắm.` : `Hôm nay mùng Một tháng ${L.month}, ngày đầu tháng lên đình thắp hương.` });
  return out;
}
