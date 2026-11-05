// Bản đồ núi nhiều tầng (bắc = -z). Đi từ chân núi lên đỉnh:
//   Tầng 1 (y 0)  — cổng, sân hoa sen, Ao Sen, ao thác, Lầu Chuông, Lão Đạo Sĩ
//   Tầng 2 (y 9)  — Tài Thần Điện (trái), Nguyệt Lão Điện (phải), suối và cầu đá
//   Tầng 3 (y 18) — Tam Thanh Điện, suối nguồn của thác
//   Đỉnh  (y 28)  — Bốc Dịch Đài, nhìn xuống toàn cảnh và biển mây
// Giữa các tầng là sườn núi; chỉ đi lên xuống bằng bậc đá. Thác nước đổ dọc theo bậc thang.

export const V2 = (x, z) => ({ x, z });

const circle = (cx, cz, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * r, cz + Math.sin(i / n * Math.PI * 2) * r]);

export const LEVELS = [
  { id: 1, y: 0, poly: [[-4.5, 152], [-4.5, 125], [-30, 125], [-34, 120], [-34, 88], [-30, 84], [30, 84], [34, 88], [34, 120], [30, 125], [4.5, 125], [4.5, 152]] },
  { id: 2, y: 9, poly: [[-40, 70], [-44, 66], [-44, 26], [-40, 22], [40, 22], [44, 26], [44, 66], [40, 70]] },
  { id: 3, y: 18, poly: [[-36, 8], [-40, 4], [-40, -40], [-36, -44], [36, -44], [40, -40], [40, 4], [36, 8]] },
  { id: 4, y: 28, poly: circle(0, -76, 17.5) }
];

// Bậc đá nối các tầng: chạy dọc trục z ở giữa, rộng 2 × hw.
export const STAIRS = [
  { x: 0, hw: 4, z0: 84, y0: 0, z1: 70, y1: 9 },
  { x: 0, hw: 4, z0: 22, y0: 9, z1: 8, y1: 18 },
  { x: 0, hw: 4, z0: -44, y0: 18, z1: -58.5, y1: 28 }
];

// Điện: tâm, kích thước thân (w × d), chiều cao cột h, nền cao `base`; mặt tiền nhìn về +z.
// door: nửa bề rộng lối vào giữa; cols: số cột hàng trước.
export const HALL = {
  "tam-thanh": { x: 0, z: -24, w: 34, d: 24, h: 11, base: 0.8, cols: 10, door: 7, level: 3 },
  "tai-than": { x: -28, z: 44, w: 22, d: 16, h: 8.5, base: 0.6, cols: 7, door: 5, level: 2 },
  "nguyet-lao": { x: 28, z: 44, w: 22, d: 16, h: 8.5, base: 0.6, cols: 7, door: 5, level: 2 }
};
// Cây đa cổ thụ giữa sân tầng 2: tâm gốc, bán kính bồn đá; bàn hương ở phía +z (hướng lối lên từ tầng 1).
export const BIG_TREE = { x: 0, z: 45, r: 5.15, scale: 1.3, level: 2 };
export const ALTAR = { x: 0, z: -76, r: 9, h: 1.6, stairW: 2.1, stairLen: 3.6, level: 4 };

// Dòng nước: suối nguồn trên tầng 3 → thác 2 → ao tầng 2 → suối (qua cầu) → thác 1 → ao thác tầng 1.
export const WATER = {
  x: 13,
  spring: { x: 13, z: -2, w: 7, d: 5 },
  pool2: { x: 13, z: 27, w: 7, d: 5 },
  bridge: { z0: 54.2, z1: 57.8 },
  pool1: { x: 14, z: 97, w: 10, d: 8 },
  // Dòng tràn từ ao thác ra mép núi phía đông.
  outflow: { z: 97, x0: 19.4, x1: 34.6 },
  // Đầu nguồn: vách núi cao nhất (hai trụ đá) sau Tam Thanh; nước phun ra từ khe giữa hai trụ ở độ cao `cleft.y`,
  // văng ra với vận tốc ngang `jet` rồi rơi tự do xuống hồ chân thác `plunge` trên tầng 3.
  crag: { x: 27, z: -56 },
  cleft: { x: 27.2, y: 39.5, z: -51, jet: 4.3 },
  plunge: { x: 27, z: -39.5, w: 9, d: 6.5 },
  // Suối tầng 3 từ hồ chân thác về suối nguồn (các điểm [x, z]).
  route3: [[27, -30], [27, -12], [25.5, -6.5], [21.5, -3]],
  // Lòng khe khoét vào sườn núi giữa hai tầng: nước đổ qua mép vách tầng trên rồi chảy ghềnh xuống mép tầng dưới.
  chutes: [{ x: 13, z0: 8, y0: 18, z1: 22, y1: 9 }, { x: 13, z0: 70, y0: 9, z1: 84, y1: 0 }]
};
// Độ cao lòng khe theo z: rơi gần thẳng đứng ở 18% đầu (mép vách), sau đó dốc thoải dần (ghềnh).
export function chuteY(c, z) {
  const t = Math.min(1, Math.max(0, (z - c.z0) / (c.z1 - c.z0))), H = c.y0 - c.y1;
  return c.y0 - H * (t < 0.18 ? Math.pow(t / 0.18, 1.6) * 0.58 : 0.58 + 0.42 * Math.pow((t - 0.18) / 0.82, 0.85));
}
// Cầu vòm bắc qua suối tầng 3 (nhịp theo trục x) để sang khu phía đông của tầng.
export const BRIDGE3 = { x: 27, z: -22, len: 7, width: 3, rise: 0.8 };
export const bridge3DeckY = dx => BRIDGE3.rise * Math.max(0, 1 - (2 * dx / BRIDGE3.len) ** 2);
// Cầu vòm bán nguyệt bắc ngang suối tầng 2: dài `len` theo trục x, rộng theo z, đỉnh cao `rise`.
export const BRIDGE = { x: WATER.x, z: (WATER.bridge.z0 + WATER.bridge.z1) / 2, len: 8.4, width: WATER.bridge.z1 - WATER.bridge.z0, rise: 1.9 };
// Mặt cầu cong parabol: dốc nhất ở hai đầu (≈ 0.9), vẫn đi bộ được.
export const bridgeDeckY = dx => BRIDGE.rise * Math.max(0, 1 - (2 * dx / BRIDGE.len) ** 2);
// Cầu vòm nhỏ bắc qua dòng tràn tầng 1 (nhịp theo trục z) để vào khu Trà Đình phía bắc dòng tràn.
export const BRIDGE2 = { x: 24, z: WATER.outflow.z, len: 6, width: 3, rise: 0.7 };
export const bridge2DeckY = dz => BRIDGE2.rise * Math.max(0, 1 - (2 * dz / BRIDGE2.len) ** 2);
// Trà Đình: nền đình gần ngang mặt sân để bước vào ngồi được; lối vào ở phía tây (-x).
export const TEA = { x: 28, z: 90.5, w: 4.8, d: 4, floor: 0.12 };
export const POND = { x: -14, z: 98, w: 10, d: 7 }; // Ao Sen thả hoa đăng
export const GATE_Z = 125;
export const SPAWN = { x: 0, z: 142 };

const levelOf = id => LEVELS.find(l => l.id === id);
export const hallFloor = k => levelOf(HALL[k].level).y + HALL[k].base;
export const altarBase = () => levelOf(ALTAR.level).y;

// ---------- Hình học ----------
export function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distToPoly(poly, x, z) {
  if (inPoly(poly, x, z)) return 0;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// Nhiễu giá trị nhiều lớp (fbm), tất định theo toạ độ: dùng cho sườn núi gồ ghề.
const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

// Độ cao mặt đất nhìn thấy: mặt phẳng ở mỗi tầng; ra khỏi mép là vách đá gần như dựng đứng (~8 m),
// dưới chân vách là sườn núi thoải dần, gồ ghề, có gờ và khe; tầng nào cao hơn thì lấy tầng đó.
const CLIFF_W = 3.2, CLIFF_DROP = 2.6;
export function terrainY(x, z) {
  let y = -70;
  const rough = (fbm(x * 0.09, z * 0.09) - 0.47) * 6 + (fbm(x * 0.35, z * 0.35, 2) - 0.37) * 1.2;
  const gentle = 0.38 + 0.3 * fbm(x * 0.03 + 7, z * 0.03 + 3, 2);
  for (const l of LEVELS) {
    const d = distToPoly(l.poly, x, z);
    if (d === 0) { y = Math.max(y, l.y); continue; }
    // Vách: tụt nhanh trong CLIFF_W đầu; chân vách lởm chởm theo nhiễu.
    const cliff = Math.min(d, CLIFF_W) * CLIFF_DROP;
    const slope = Math.max(0, d - CLIFF_W) * gentle;
    const v = l.y - cliff - slope + rough * Math.min(1, Math.max(0, (d - CLIFF_W * 0.6) / 5));
    if (v > y) y = Math.min(v, l.y);
  }
  // Lòng khe giữa các tầng: đáy khoét thấp hơn mặt nước, hai bên bờ đá nhô lên rồi thoải dần ra sườn núi.
  for (const c of WATER.chutes) {
    if (z < c.z0 - 0.5 || z > c.z1 + 0.5) continue;
    const dx = Math.abs(x - c.x);
    if (dx > 14) continue;
    const cy = chuteY(c, z), bed = cy - 0.4;
    // Vách khe cao dần từ hai đầu (không nhô lên khỏi mặt sân hai tầng).
    const wallH = 1.9 * Math.max(0, Math.min(1, (z - c.z0) / 1.5, (c.z1 - z) / 1.5));
    if (dx < 1.7) y = bed;
    else if (dx < 3.8) { const s = (dx - 1.7) / 2.1; y = Math.max(z >= c.z0 && z <= c.z1 ? -99 : y, bed + wallH * s * s * (3 - 2 * s)); if (wallH === 0) y = Math.min(y, bed + 0.3); }
    else if (z >= c.z0 && z <= c.z1) y = Math.max(y, bed + wallH - (dx - 3.8) * 0.6 + rough * 0.2 * Math.min(1, (dx - 3.8) / 3));
  }
  return y;
}

// ---------- Mặt đi bộ ----------
// Vùng bậc thang lấn thêm 0.8 vào mặt hai tầng để không hở khe ở chỗ mép tầng cong (độ cao kẹp ở hai đầu).
const stairAt = (x, z) => STAIRS.find(s => Math.abs(x - s.x) <= s.hw && z <= Math.max(s.z0, s.z1) + 0.8 && z >= Math.min(s.z0, s.z1) - 0.8);
const levelAt = (x, z) => LEVELS.find(l => inPoly(l.poly, x, z));

// Phần nền nổi trên mặt tầng: nền điện và bậc trước điện, Bốc Dịch Đài và bậc của đài.
function featureY(x, z) {
  if (Math.abs(z - BRIDGE.z) <= BRIDGE.width / 2 - 0.15 && Math.abs(x - BRIDGE.x) <= BRIDGE.len / 2) return bridgeDeckY(x - BRIDGE.x);
  if (Math.abs(z - BRIDGE3.z) <= BRIDGE3.width / 2 - 0.15 && Math.abs(x - BRIDGE3.x) <= BRIDGE3.len / 2) return bridge3DeckY(x - BRIDGE3.x);
  if (Math.abs(x - BRIDGE2.x) <= BRIDGE2.width / 2 - 0.15 && Math.abs(z - BRIDGE2.z) <= BRIDGE2.len / 2) return bridge2DeckY(z - BRIDGE2.z);
  if (Math.abs(x - TEA.x) <= TEA.w / 2 && Math.abs(z - TEA.z) <= TEA.d / 2) return TEA.floor;
  for (const k in HALL) {
    const h = HALL[k], hw = h.w / 2 + 1.5, hd = h.d / 2 + 1.5;
    const dx = x - h.x, dz = z - h.z;
    if (Math.abs(dx) <= hw && Math.abs(dz) <= hd) return h.base;
    // Bậc thềm trước điện: dốc dài 2 đơn vị.
    if (Math.abs(dx) <= h.w * 0.25 && dz > hd && dz <= hd + 2) return h.base * (1 - (dz - hd) / 2);
  }
  const ar = Math.hypot(x - ALTAR.x, z - ALTAR.z);
  if (ar < ALTAR.r - 0.2) return ALTAR.h;
  const sz = z - (ALTAR.z + ALTAR.r - 1.2);
  if (Math.abs(x - ALTAR.x) < ALTAR.stairW && sz > 0 && sz < ALTAR.stairLen + 0.8) {
    return ALTAR.h * Math.min(1, Math.max(0, 1 - (z - (ALTAR.z + ALTAR.r - 0.4)) / ALTAR.stairLen));
  }
  return 0;
}

// Độ cao chỗ đứng; NaN nếu không đi được (vách núi, ngoài lan can).
export function heightAt(x, z) {
  const s = stairAt(x, z);
  if (s) return s.y0 + (s.y1 - s.y0) * Math.min(1, Math.max(0, (z - s.z0) / (s.z1 - s.z0)));
  const l = levelAt(x, z);
  if (!l) return NaN;
  const ins = insetOK(l, x, z);
  return ins ? l.y + featureY(x, z) : NaN;
}
// Chừa 1.2 đơn vị sát mép tầng cho lan can, trừ chỗ bậc thang chạm vào.
function insetOK(l, x, z) {
  if (distToEdge(l.poly, x, z) >= 1.2) return true;
  return STAIRS.some(s => Math.abs(x - s.x) <= s.hw && (Math.abs(z - s.z0) < 1.6 || Math.abs(z - s.z1) < 1.6));
}
function distToEdge(poly, x, z) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
export const walkable = (x, z) => !Number.isNaN(heightAt(x, z));
// Bước từ a sang b có hợp lệ không: không leo/nhảy qua bậc cao (dốc quá 1.2).
// Đo dày dọc đoạn (mỗi 0.15) để bậc dựng đứng không bị coi là dốc thoải khi đoạn đo dài.
export function canStep(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.15));
  let hp = heightAt(ax, az);
  for (let k = 1; k <= n; k++) {
    const h = heightAt(ax + (bx - ax) * k / n, az + (bz - az) * k / n);
    if (Number.isNaN(h) || (!Number.isNaN(hp) && Math.abs(h - hp) > Math.max(1.2 * d / n, 0.15))) return false;
    hp = h;
  }
  return true;
}

// ---------- Vật cản trong điện ----------
// Tường sau, hai tường hông, hai đoạn tường trước hai bên lối vào, bệ thờ, các cột trong và cột hiên.
export function hallObstacles(k) {
  const h = HALL[k], x0 = h.x - h.w / 2, x1 = h.x + h.w / 2, zb = h.z - h.d / 2, zf = h.z + h.d / 2;
  const boxes = [
    { x0, x1, z0: zb - 0.4, z1: zb + 0.4 },
    { x0: x0 - 0.4, x1: x0 + 0.4, z0: zb, z1: zf },
    { x0: x1 - 0.4, x1: x1 + 0.4, z0: zb, z1: zf },
    { x0, x1: h.x - h.door, z0: zf - 0.9, z1: zf - 0.3 },
    { x0: h.x + h.door, x1, z0: zf - 0.9, z1: zf - 0.3 },
    { x0: h.x - h.w * 0.32, x1: h.x + h.w * 0.32, z0: zb + 0.4, z1: zb + h.d * 0.3 }
  ];
  const circles = interiorColumns(k).map(([x, z]) => ({ x, z, r: h.w > 20 ? 0.6 : 0.45 }));
  frontColumns(k).forEach(x => circles.push({ x, z: zf + 0.9, r: 0.45 }));
  return { boxes, circles };
}
// Hàng cột hiên phía trước (ngoài tường cửa).
export function frontColumns(k) {
  const h = HALL[k];
  return Array.from({ length: h.cols }, (_, i) => h.x - h.w / 2 + 0.3 + (h.w - 0.6) * i / (h.cols - 1));
}
// Hai hàng cột lớn trong điện, chừa lối giữa.
export function interiorColumns(k) {
  const h = HALL[k], out = [];
  const xs = h.w > 20 ? [-h.door, h.door, -h.w * 0.36, h.w * 0.36] : [-h.door, h.door];
  const zs = h.w > 20 ? [-0.18, 0.12] : [0.0];
  for (const fx of xs) for (const fz of zs) out.push([h.x + fx, h.z + fz * h.d]);
  return out;
}
// Hộp bên trong điện (để camera không ra ngoài tường khi người chơi ở trong).
export function hallInterior(x, z) {
  for (const k in HALL) {
    const h = HALL[k];
    if (Math.abs(x - h.x) < h.w / 2 - 0.3 && z > h.z - h.d / 2 + 0.3 && z < h.z + h.d / 2 - 0.5) {
      const y = hallFloor(k);
      return { k, x0: h.x - h.w / 2 + 0.6, x1: h.x + h.w / 2 - 0.6, z0: h.z - h.d / 2 + h.d * 0.32 + 0.6, z1: h.z + h.d / 2 - 1.1, ceil: y + h.h - 1.0, floor: y,
        // Điểm nhìn trong điện (cao hơn chỗ đứng) và độ cao tối thiểu của camera, để thấy trọn tượng thần.
        lookUp: h.h * 0.26, camMin: y + h.h * 0.36 };
    }
  }
  return null;
}
