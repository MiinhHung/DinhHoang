// Sổ công đức: điểm, chuỗi ngày ghé đình, việc lành hôm nay, bộ sưu tập quẻ và lá bùa gần đây.
// Chỉ lưu trên máy người chơi (localStorage); có nút xóa trong sổ.
const KEY = "dh-so-cong-duc";
const HISTORY_MAX = 12;
const RIBBON_MAX = 30;

export const TASKS = [
  { id: "huong", label: "Thắp hương Tam Thanh Điện", pts: 10, go: "tam-thanh" },
  { id: "que", label: "Xin một quẻ duyên, tài hoặc Dịch", pts: 10, go: "nguyet-lao" },
  { id: "chuong", label: "Thỉnh một tiếng chuông đồng", pts: 5, go: "chuong" },
  { id: "hoadang", label: "Thả một hoa đăng ở Ao Sen", pts: 5, go: "ao-sen" },
  { id: "chiase", label: "Chia sẻ một lá bùa", pts: 10, go: null }
];
export const ALL_DONE_BONUS = 20;
export const HARVEST_PTS = 5;
export const RANKS = [
  [0, "Khách thập phương"], [30, "Thiện tín"], [100, "Cư sĩ"], [250, "Đạo hữu"], [500, "Chân tu"], [1000, "Đạo trưởng"]
];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const dayNum = s => { const [y, m, d] = s.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const fresh = () => ({
  pts: 0, streak: 0, lastDay: "", day: "", done: [], harvest: "", harvestLoc: null, ribbons: 0, visits: 0,
  seen: { "nguyet-lao": [], "tai-than": [], "boc-dich": [] }, history: []
});

let S = fresh();
try { S = { ...S, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { /* chế độ riêng tư */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* chế độ riêng tư */ } };
function roll() {
  const t = today();
  if (S.day !== t) { S.day = t; S.done = []; }
}
// Ngày nào có ít nhất một việc lành thì tính vào chuỗi ngày liên tiếp.
function markDay() {
  const t = today();
  if (S.lastDay === t) return;
  S.streak = S.lastDay && dayNum(t) - dayNum(S.lastDay) === 1 ? S.streak + 1 : 1;
  S.lastDay = t;
}
export function rankOf(pts) {
  let r = RANKS[0];
  for (const x of RANKS) if (pts >= x[0]) r = x;
  return { min: r[0], name: r[1], next: RANKS[RANKS.indexOf(r) + 1] || null };
}
function addPts(n) {
  const before = rankOf(S.pts).name;
  S.pts += n;
  const after = rankOf(S.pts).name;
  return after !== before ? after : null;
}

export function state() {
  roll();
  const streakAlive = S.lastDay && dayNum(today()) - dayNum(S.lastDay) <= 1;
  return { ...S, streak: streakAlive ? S.streak : 0, rank: rankOf(S.pts), canHarvest: S.harvest !== today() };
}

// Ghi một lần ghé đình (gọi khi bước qua cổng). Trả về true nếu là lần đầu.
export function visit() {
  const first = !S.visits;
  S.visits++;
  save();
  return first;
}

// Hoàn thành một việc lành; mỗi việc chỉ tính một lần mỗi ngày.
export function complete(id) {
  roll();
  const task = TASKS.find(t => t.id === id);
  if (!task || S.done.includes(id)) return null;
  S.done.push(id);
  markDay();
  const allDone = TASKS.every(t => S.done.includes(t.id));
  const gained = task.pts + (allDone ? ALL_DONE_BONUS : 0);
  const rankUp = addPts(gained);
  save();
  return { task, gained, allDone, rankUp, pts: S.pts };
}

// Hái lộc cây kim tiền: mỗi ngày một lần. Trả về lộc hôm nay (đã hái thì trả lại lộc cũ).
export function harvest(pickLoc) {
  if (S.harvest === today()) return { loc: S.harvestLoc, again: true };
  S.harvest = today();
  S.harvestLoc = pickLoc();
  markDay();
  const rankUp = addPts(HARVEST_PTS);
  save();
  return { loc: S.harvestLoc, again: false, gained: HARVEST_PTS, rankUp, pts: S.pts };
}

// Thưởng lễ hoa đăng chung: mỗi ngày một lần. Trả về null nếu hôm nay đã nhận.
export function festivalBonus(pts) {
  if (S.festival === today()) return null;
  S.festival = today();
  markDay();
  const rankUp = addPts(pts);
  save();
  return { gained: pts, rankUp, pts: S.pts };
}

export function addRibbon() {
  S.ribbons = Math.min(RIBBON_MAX, S.ribbons + 1);
  save();
  return S.ribbons;
}

// Lưu quẻ vào bộ sưu tập và lá bùa vào danh sách gần đây. Trả về true nếu là quẻ mới trong bộ sưu tập.
export function record(r) {
  let isNew = false;
  const no = r.kind === "boc-dich" ? r.card?.so : r.no;
  if (no && S.seen[r.kind] && !S.seen[r.kind].includes(no)) { S.seen[r.kind].push(no); isNew = true; }
  S.history = [{ at: Date.now(), r }, ...S.history].slice(0, HISTORY_MAX);
  save();
  return isNew;
}

export function clearAll() {
  S = fresh();
  try { localStorage.removeItem(KEY); } catch { /* chế độ riêng tư */ }
}
