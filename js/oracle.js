// Bộ máy luận quẻ: rút quẻ từ kho cố định rồi ráp lời giải cá nhân hóa từ các mẫu văn phong.
import { yearInfo, gioAm, ngayVN } from "./lunar.js";

const C = {};

export async function loadContent() {
  const files = { love: "nguyet-lao", wealth: "tai-than", iching: "boc-dich", style: "van-phong" };
  await Promise.all(Object.entries(files).map(async ([k, f]) => {
    const r = await fetch(`content/${f}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(`Không tải được content/${f}.json`);
    C[k] = await r.json();
  }));
  return C;
}
export const content = C;

// ---------- Ngẫu nhiên ----------
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(...parts) {
  const extra = crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.random() * 1e9;
  return mulberry(hash(parts.join("|") + "|" + Date.now() + "|" + extra));
}
const pick = (rng, arr) => (arr && arr.length ? arr[Math.floor(rng() * arr.length)] : "");

// Không rút lại thẻ đã rút trong cùng phiên, để mỗi lần là một quẻ khác.
function drawFrom(rng, list, key) {
  const seen = session.get(`seen-${key}`, []);
  let pool = list.filter(x => !seen.includes(x.id ?? x.so));
  if (!pool.length) { pool = list; session.set(`seen-${key}`, []); }
  const item = pool[Math.floor(rng() * pool.length)];
  session.set(`seen-${key}`, [...(pool === list ? [] : seen), item.id ?? item.so]);
  return item;
}

// ---------- Lưu phiên ẩn danh ----------
export const session = {
  get(k, d) { try { const v = sessionStorage.getItem("dh-" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem("dh-" + k, JSON.stringify(v)); } catch { /* chế độ riêng tư */ } }
};

// ---------- Điền mẫu ----------
function fill(text, vars) {
  return String(text || "").replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && vars[k] !== "" ? vars[k] : m === "{ten}" ? "thí chủ" : ""));
}
const firstName = full => {
  const parts = String(full).trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(-2).join(" ") : parts[0];
};

export function validYear(y, cfg) {
  const n = Number(y);
  const max = new Date().getFullYear() - (cfg?.maxAgeOffset ?? 6);
  return Number.isInteger(n) && n >= (cfg?.min ?? 1920) && n <= max;
}

function baseVars(p) {
  const yi = yearInfo(Number(p.year));
  const now = new Date();
  return {
    yi,
    vars: { ten: firstName(p.name), hoten: p.name.trim(), canchi: yi.canchi, menh: yi.menh, mong: p.mong || "", nghe: p.ngheLabel || "", chude: p.chudeLabel || "" },
    stamp: `Giờ ${gioAm(now)} · ngày ${ngayVN(now)}`
  };
}

const STATUS = {
  single: { key: "single", label: "Độc thân" },
  dating: { key: "dating", label: "Đang tìm hiểu" },
  couple: { key: "couple", label: "Đã có đôi" }
};
export const loveStatuses = STATUS;

// ---------- Cầu Duyên ----------
export function readLove(p) {
  const rng = makeRng(p.name, p.year, p.status, p.mong);
  const card = drawFrom(rng, C.love.cards, "love");
  const st = C.style.nguyetLao;
  const { yi, vars, stamp } = baseVars(p);
  const f = t => fill(t, vars);
  const mongLine = p.mong ? f(pick(rng, st.mong)) : "";
  return {
    kind: "nguyet-lao", card, profile: p, yi, stamp,
    no: card.id, total: C.love.cards.length,
    sections: [
      { h: "Lời Nguyệt Lão", p: [f(pick(rng, st.openings)), f(card.meaning)] },
      { h: p.status === "couple" ? "Luận đạo gắn kết" : "Luận nhân duyên", p: [f(card[STATUS[p.status]?.key || "single"]), f(pick(rng, st.menh?.[yi.menh])), mongLine] },
      { h: "Lời khuyên", p: [f(card.advice), f(pick(rng, st.closings))] }
    ],
    blessing: f(pick(rng, st.blessings)),
    secret: f(card.secret)
  };
}

// ---------- Cầu Tài ----------
const LUCKY = [8, 6, 9, 8, 6, 9, 3, 7, 1, 5];
export function readWealth(p) {
  const rng = makeRng(p.name, p.year, p.nghe);
  const q = drawFrom(rng, C.wealth.que, "wealth");
  const st = C.style.taiThan;
  const ng = st.nghe[p.nghe] || st.nghe.khac;
  p.ngheLabel = ng.label;
  const { yi, vars, stamp } = baseVars(p);
  const f = t => fill(t, vars);
  const h = hash(p.name + p.year + q.id);
  const code = Array.from({ length: 4 }, (_, i) => LUCKY[(h >>> (i * 5)) % LUCKY.length]).join("");
  return {
    kind: "tai-than", card: q, profile: p, yi, stamp, code,
    no: q.id, total: C.wealth.que.length,
    timingLabel: { tien: "Nên tiến", thu: "Nên thủ", giu: "Giữ nhịp" }[q.timing] || "Giữ nhịp",
    sections: [
      { h: "Lời Tài Thần Điện", p: [f(pick(rng, st.openings)), f(q.meaning)] },
      { h: "Thời điểm", p: [f(q.timingText), f(pick(rng, st.menh?.[yi.menh]))] },
      { h: `Lời khuyên cho nghề ${ng.label.toLowerCase()}`, p: [f(q.advice), f(pick(rng, ng.advice)), f(pick(rng, st.closings))] }
    ],
    blessing: f(pick(rng, ng.wishes)),
    secret: f(q.secret)
  };
}

// ---------- Bốc Dịch ----------
const TRIGRAM_BITS = { qian: "111", dui: "110", li: "101", zhen: "100", xun: "011", kan: "010", gen: "001", kun: "000" };
export const TRIGRAM_NAME = { qian: "Càn", dui: "Đoài", li: "Ly", zhen: "Chấn", xun: "Tốn", kan: "Khảm", gen: "Cấn", kun: "Khôn" };

// Gieo 3 đồng xu cho một hào: ngửa = 3, sấp = 2. 6 lão âm, 7 thiếu dương, 8 thiếu âm, 9 lão dương.
export function tossLine() {
  const coins = [0, 0, 0].map(() => (Math.random() < 0.5 ? 3 : 2));
  const sum = coins.reduce((a, b) => a + b, 0);
  return { coins, sum, yang: sum === 7 || sum === 9, moving: sum === 6 || sum === 9 };
}

function findHexagram(bits) {
  const lower = bits.slice(0, 3).join(""), upper = bits.slice(3).join("");
  return C.iching.que.find(q => TRIGRAM_BITS[q.lower] === lower && TRIGRAM_BITS[q.upper] === upper);
}

export function readIching(p, lines) {
  const rng = makeRng(p.chude, p.ask || "", lines.map(l => l.sum).join(""));
  const bits = lines.map(l => (l.yang ? "1" : "0"));
  const hex = findHexagram(bits);
  const moving = lines.map((l, i) => (l.moving ? i + 1 : 0)).filter(Boolean);
  const changed = moving.length ? findHexagram(lines.map(l => (l.yang !== l.moving ? "1" : "0"))) : null;
  const st = C.style.bocDich;
  const cd = st.chude[p.chude] || Object.values(st.chude)[0];
  p.chudeLabel = cd.label;
  const vars = { ten: p.name ? firstName(p.name) : "thí chủ", chude: cd.label.toLowerCase(), mong: "", canchi: "", menh: "" };
  const f = t => fill(t, vars);
  const now = new Date();
  const movingText = moving.length
    ? `${f(pick(rng, st.doiHao))} Hào động: ${moving.map(n => "hào " + n).join(", ")}${changed ? `; quẻ biến thành ${changed.ten}.` : "."}`
    : "";
  return {
    kind: "boc-dich", card: hex, changed, moving, lines, profile: p,
    stamp: `Giờ ${gioAm(now)} · ngày ${ngayVN(now)}`,
    sections: [
      { h: "Lão đạo sĩ giải quẻ", p: [f(pick(rng, st.openings)), f(hex.loi)] },
      { h: `Về ${cd.label.toLowerCase()}`, p: [f(pick(rng, cd.lines)), p.ask ? `Điều thí chủ khấn thầm — “${p.ask}” — ta không cần nghe rõ, quẻ đã nghe thay.` : "", movingText] },
      { h: "Lời khuyên", p: [f(hex.khuyen), f(pick(rng, st.closings))] }
    ],
    blessing: f(hex.y),
    secret: f(hex.secret)
  };
}

// ---------- Tam Thanh ----------
export function tamThanhBlessing() {
  const rng = makeRng("tam-thanh");
  return pick(rng, C.style.tamThanh?.blessings || ["Tâm an thì cảnh an."]);
}
