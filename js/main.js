// Điều phối: cổng vào, HUD, nghi lễ từng điện, kết quả, lá bùa và chia sẻ.
import config from "../config.js";
import { createWorld, ZONES } from "./world.js";
import * as audio from "./audio.js";
import { loadContent, content, session, validYear, readLove, readWealth, readIching, tossLine, tamThanhBlessing, loveStatuses, TRIGRAM_NAME } from "./oracle.js";
import { yearInfo, gioAm, ngayVN } from "./lunar.js";
import { drawCharm } from "./charm.js";
import { canvasBlob, saveBlob, shareBlob, shareText, shareUrl, facebookUrl, copyText, fileName } from "./share.js";
import { initAnalytics, track } from "./analytics.js";
import { connectOnline } from "./online.js";
import * as progress from "./progress.js";
import { TASKS, ALL_DONE_BONUS } from "./progress.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
const COLORS = [
  { v: "#b3242a", n: "đỏ son" }, { v: "#e7b75a", n: "vàng nghệ" }, { v: "#2e6f5e", n: "xanh ngọc" }, { v: "#3b5ba5", n: "xanh lam" },
  { v: "#e8899f", n: "hồng đào" }, { v: "#f1e6cf", n: "trắng ngà" }, { v: "#5b3a8a", n: "tím than" }
];
const RAIN = { "tam-thanh": ["✨", "🪷"], "tai-than": ["🪙", "✨", "🧧"], "nguyet-lao": ["🌸", "❤️", "🌸"], "boc-dich": ["☯️", "✨"] };
// Lễ vật: [mã, nhãn nút, chữ in trên kết quả]
const OFFERS = {
  "tam-thanh": [["hoaqua", "🍑 Mâm ngũ quả", "Dâng mâm ngũ quả"], ["tra", "🍵 Trà đạo", "Dâng chén trà đạo"], ["sen", "🪷 Hoa sen", "Dâng hoa sen"]],
  "tai-than": [["tra", "🍵 Chén trà", "Dâng chén trà"], ["kimtien", "💰 Kim tiền hương", "Dâng kim tiền hương"]]
};
// Link chia sẻ có ?dien=<điện> thì người mới vào thẳng điện đó.
const GATE_CTA = {
  "nguyet-lao": "Vào Hợp Hoan Cung – Cầu Duyên",
  "tai-than": "Vào Tài Thần Điện – Cầu Tài Lộc",
  "boc-dich": "Lên Bốc Dịch Đài – Gieo Quẻ",
  "tam-thanh": "Vào Tam Thanh Điện – Thắp Hương"
};
const deepZone = (z => (GATE_CTA[z] ? z : null))(new URLSearchParams(location.search).get("dien"));

let world = null, online = null, near = null, flow = 0, entered = false;
const me = { name: session.get("name", ""), color: session.get("color", COLORS[0].v) };

// ---------- Tiện ích giao diện ----------
// Rung nhẹ; iOS Safari không hỗ trợ thì bỏ qua.
const buzz = p => { try { navigator.vibrate?.(p); } catch { /* không hỗ trợ */ } };
// iOS 13+ chỉ cho đọc cảm biến lắc sau khi người dùng chạm và đồng ý.
let motionAsked = false;
function askMotion() {
  if (motionAsked) return;
  motionAsked = true;
  const D = window.DeviceMotionEvent;
  if (typeof D?.requestPermission === "function") D.requestPermission().catch(() => {});
}
let toastTimer, hintTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}
// Nhiều thông báo liên tiếp (công đức, thăng bậc…) hiện lần lượt, không đè nhau.
const toastQ = [];
let toastBusy = false;
function toastSeq(msgs) {
  toastQ.push(...msgs.filter(Boolean));
  if (!toastBusy) nextToast();
}
function nextToast() {
  const m = toastQ.shift();
  if (!m) { toastBusy = false; return; }
  toastBusy = true;
  toast(m, 2300);
  setTimeout(nextToast, 2600);
}
function showHint(msg, ms = 4000) {
  const h = $("#hint");
  h.textContent = msg;
  h.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.remove("show"), ms);
}
function rain(chars, n = 22) {
  const box = $("#fx2d");
  for (let i = 0; i < n; i++) {
    const el = document.createElement("i");
    el.textContent = chars[i % chars.length];
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = 16 + Math.random() * 18 + "px";
    el.style.animationDuration = 2.6 + Math.random() * 2.4 + "s";
    el.style.animationDelay = Math.random() * 0.8 + "s";
    box.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}
let bannerEl, bannerTimer;
function banner(z) {
  const info = ZONES[z];
  if (!info?.han) return;
  if (!bannerEl) { bannerEl = document.createElement("div"); bannerEl.className = "zone-banner"; document.body.appendChild(bannerEl); }
  bannerEl.innerHTML = `<div class="han">${esc(info.han)}</div><b>${esc(info.name)}</b><small>${esc(info.sub)}</small>`;
  bannerEl.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => bannerEl.classList.remove("show"), 2600);
}
function veil(fn) {
  const v = $("#veil");
  v.classList.add("on");
  setTimeout(() => { fn(); setTimeout(() => v.classList.remove("on"), 120); }, 480);
}

// ---------- Bảng (sheet) ----------
const sheet = $("#sheet"), sheetBody = $("#sheet-body");
const sheetOpen = () => !sheet.classList.contains("hidden") && !sheet.classList.contains("enter");
function openSheet(html, tall = false) {
  sheetBody.innerHTML = html;
  sheetBody.scrollTop = 0;
  sheet.classList.toggle("tall", tall);
  if (sheet.classList.contains("hidden") || sheet.classList.contains("enter")) {
    sheet.classList.remove("hidden");
    sheet.classList.add("enter");
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.remove("enter")));
  }
  world?.setPaused(true);
  $("#btn-act").classList.add("hidden");
}
function closeSheet() {
  flow++;
  sheet.classList.add("enter");
  setTimeout(() => { if (sheet.classList.contains("enter")) sheet.classList.add("hidden"); }, 460);
  world?.setPaused(false);
  onNear(near);
}

const stepDots = (n, i) => `<div class="step-dots">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>`;
const ent = `<p class="ent">Chỉ mang tính giải trí, chữa lành — không phải lời tiên đoán, không thay thế tín ngưỡng thật hay tư vấn chuyên môn.</p>`;

// ---------- Ô nhập ----------
const profile = () => session.get("profile", {});
const saveProfile = p => session.set("profile", { ...profile(), ...p });

function nameYearFields(p) {
  return `<label class="field"><span>Họ và tên</span>
      <input id="f-name" maxlength="40" value="${esc(p.name || me.name)}" placeholder="Ví dụ: Nguyễn Thiện Tâm" autocomplete="name">
      <span class="err hidden" id="e-name"></span></label>
    <label class="field"><span>Năm sinh (âm lịch) <em id="f-canchi"></em></span>
      <input id="f-year" inputmode="numeric" maxlength="4" value="${esc(p.year || "")}" placeholder="Ví dụ: 1995" autocomplete="bday-year">
      <span class="err hidden" id="e-year"></span></label>`;
}
function bindYear() {
  const inp = $("#f-year"), out = $("#f-canchi");
  const upd = () => {
    inp.value = inp.value.replace(/\D/g, "").slice(0, 4);
    if (validYear(inp.value, config.birthYear)) { const yi = yearInfo(Number(inp.value)); out.textContent = `· ${yi.canchi} · mệnh ${yi.menh}`; }
    else out.textContent = "";
  };
  inp.addEventListener("input", upd);
  upd();
}
function chips(id, items, sel) {
  return `<div class="chips" id="${id}" role="radiogroup">${items.map(([k, l]) =>
    `<button type="button" role="radio" aria-checked="${k === sel}" class="chip${k === sel ? " on" : ""}" data-k="${esc(k)}">${esc(l)}</button>`).join("")}</div>`;
}
function bindChips(id) {
  const box = $("#" + id);
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    box.querySelectorAll(".chip").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    box.dataset.val = b.dataset.k;
  });
  box.dataset.val = box.querySelector(".on")?.dataset.k || "";
}
function setErr(id, msg) {
  const e = $("#" + id);
  e.textContent = msg || "";
  e.classList.toggle("hidden", !msg);
}
function readNameYear() {
  const name = $("#f-name").value.trim().replace(/\s+/g, " ");
  const year = $("#f-year").value.trim();
  let ok = true;
  setErr("e-name", "");
  setErr("e-year", "");
  if (!name) { setErr("e-name", "Thí chủ cho biết danh tính để Thần luận quẻ nhé."); ok = false; }
  if (!validYear(year, config.birthYear)) {
    const max = new Date().getFullYear() - (config.birthYear?.maxAgeOffset ?? 6);
    setErr("e-year", `Năm sinh cần từ ${config.birthYear?.min ?? 1920} đến ${max}.`);
    ok = false;
  }
  return ok ? { name, year: Number(year) } : null;
}

// ---------- Nút giữ (thắp hương) ----------
function mountHold(el, label, ms, onDone) {
  const C = 2 * Math.PI * 76;
  el.innerHTML = `<div class="hold-wrap"><button class="hold" type="button" aria-label="Nhấn giữ để thắp hương">
    <svg viewBox="0 0 170 170"><circle class="ring-bg" cx="85" cy="85" r="76" fill="none" stroke-width="6"/>
    <circle class="ring" cx="85" cy="85" r="76" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
    <span class="hold-label">${label}</span></button></div>`;
  const btn = el.querySelector(".hold"), ring = el.querySelector(".ring");
  let p = 0, holding = false, last = 0, raf = 0, done = false;
  const loop = now => {
    const dt = now - last;
    last = now;
    p = holding ? p + dt / ms : Math.max(0, p - dt / ms * 1.5);
    ring.style.strokeDashoffset = C * (1 - Math.min(p, 1));
    if (p >= 1 && !done) { done = true; holding = false; btn.classList.remove("active"); buzz(40); onDone(); raf = 0; return; }
    raf = holding || p > 0 ? requestAnimationFrame(loop) : 0;
  };
  const start = e => {
    if (done) return;
    e.preventDefault();
    if (e.pointerId != null) btn.setPointerCapture?.(e.pointerId);
    holding = true;
    btn.classList.add("active");
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  const stop = () => { holding = false; btn.classList.remove("active"); };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("contextmenu", e => e.preventDefault());
  btn.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) start(e); });
  btn.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") stop(); });
}

// ---------- Ống xăm ----------
function tubeSvg(kind) {
  const love = kind === "nguyet-lao";
  const tube = love ? "#b3242a" : "#d4a03c", band = love ? "#e7b75a" : "#b3242a", stick = love ? "#e9cf8f" : "#c8352f", tip = love ? "#c8243a" : "#f2c14e";
  let sticks = "";
  for (let i = 0; i < 10; i++) {
    const x = 30 + i * 6.4, y = 22 + ((i * 37) % 30);
    if (i === 5) continue;
    sticks += `<rect x="${x}" y="${y}" width="4.5" height="120" rx="2" fill="${stick}"/><rect x="${x}" y="${y}" width="4.5" height="12" rx="2" fill="${tip}"/>`;
  }
  return `<svg viewBox="0 0 120 220" aria-hidden="true">${sticks}
    <g class="pick"><rect x="62" y="14" width="5" height="120" rx="2" fill="${stick}"/><rect x="62" y="14" width="5" height="14" rx="2" fill="${tip}"/></g>
    <rect x="22" y="80" width="76" height="132" rx="10" fill="${tube}"/>
    <ellipse cx="60" cy="80" rx="38" ry="8" fill="rgba(0,0,0,.35)"/>
    <rect x="22" y="98" width="76" height="6" fill="${band}"/><rect x="22" y="188" width="76" height="6" fill="${band}"/>
    <text x="60" y="152" text-anchor="middle" font-size="34" font-weight="700" fill="${band}" style="font-family:var(--han)">${love ? "緣" : "財"}</text></svg>`;
}

function mountShake(el, kind, onDone) {
  el.innerHTML = `<div class="draw-stage" tabindex="0" role="button" aria-label="Nhấn giữ để lắc ống">${tubeSvg(kind)}</div>
    <div class="shake-bar"><i></i></div>
    <p class="swipe-hint"><span class="arrow">↕</span> Nhấn giữ vào ống rồi vuốt lên xuống để lắc${"DeviceMotionEvent" in window && isTouch ? " (hoặc lắc điện thoại)" : ""}</p>`;
  const stage = el.querySelector(".draw-stage"), bar = el.querySelector(".shake-bar i");
  let energy = 0, holding = false, lastY = null, raf = 0, last = 0, done = false, rattle = 0, shakeUntil = 0;
  const finish = () => {
    done = true;
    stage.classList.remove("shaking");
    stage.querySelector(".pick").classList.add("stick-out");
    audio.whoosh();
    buzz([60, 40, 140]);
    removeEventListener("devicemotion", motion);
    setTimeout(onDone, 1000);
  };
  const loop = now => {
    const dt = (now - last) / 1000;
    last = now;
    const active = holding || now < shakeUntil;
    if (active) energy += dt * 0.42;
    stage.classList.toggle("shaking", active);
    bar.style.width = Math.min(100, energy * 100) + "%";
    rattle -= dt;
    if (active && rattle <= 0) { audio.mo(0.12); buzz(12); rattle = 0.13; }
    if (energy >= 1 && !done) return finish();
    raf = requestAnimationFrame(loop);
  };
  const ensure = () => { if (!raf && !done) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const motion = e => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || done) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (m > 16) { energy += 0.05; shakeUntil = performance.now() + 250; ensure(); }
  };
  addEventListener("devicemotion", motion);
  stage.addEventListener("pointerdown", e => { if (done) return; askMotion(); stage.setPointerCapture?.(e.pointerId); holding = true; lastY = e.clientY; ensure(); });
  stage.addEventListener("pointermove", e => {
    if (!holding || lastY == null) return;
    energy += Math.min(0.06, Math.abs(e.clientY - lastY) * 0.0018);
    lastY = e.clientY;
  });
  const up = () => { holding = false; lastY = null; };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); holding = true; ensure(); } });
  stage.addEventListener("keyup", up);
  const id = flow;
  const stopIfLeft = setInterval(() => { if (id !== flow || done) { clearInterval(stopIfLeft); removeEventListener("devicemotion", motion); cancelAnimationFrame(raf); } }, 500);
}

// ---------- Nghi lễ ----------
function openRitual(z) {
  if (!z || !entered) return;
  world.face(z);
  track("ritual_start", { zone: z });
  ({
    "tam-thanh": ritualTamThanh, "nguyet-lao": ritualLove, "tai-than": ritualWealth, "boc-dich": ritualIching,
    "dao-si": talkDaoSi, chuong: ringBell, "ao-sen": ritualHoaDang, "to-hong": tieRibbon, "kim-tien": harvestLoc
  })[z]?.();
}

// Chọn lễ vật (nếu điện có) ngay trên bảng thắp hương; trả về chữ in trên kết quả.
const offerField = z => OFFERS[z] ? `<div class="field"><span>Lễ vật dâng lên</span>${chips("f-offer", OFFERS[z], OFFERS[z][0][0])}</div>` : "";
function readOffer(z) {
  if (!OFFERS[z]) return "";
  const k = $("#f-offer")?.dataset.val;
  return (OFFERS[z].find(o => o[0] === k) || OFFERS[z][0])[2];
}

function lightIncense(z, intro, next) {
  const id = flow;
  openSheet(`${stepDots(4, 1)}<h2>${esc(ZONES[z].name)}</h2><p class="sub">${intro}</p>${offerField(z)}<div id="hold"></div>
    <p class="note">${isTouch ? "Chạm và giữ" : "Nhấn giữ chuột (hoặc phím cách)"} cho tới khi vòng sáng khép lại.</p>`);
  if (OFFERS[z]) bindChips("f-offer");
  mountHold($("#hold"), OFFERS[z] ? "<b>Giữ</b>để dâng lễ, thắp hương" : "<b>Giữ</b>để thắp hương", 2000, () => {
    if (id !== flow) return;
    const offer = readOffer(z);
    world.fx.incense(z);
    online?.sendFx(z);
    z === "nguyet-lao" ? audio.chime() : audio.bell(z === "tai-than" ? 262 : 196, 0.45);
    setTimeout(() => id === flow && next(offer), 700);
  });
}

function ritualTamThanh() {
  const id = ++flow;
  openSheet(`${stepDots(3, 0)}<h2>Tam Thanh Điện</h2>
    <p class="sub">Kính Ngọc Thanh, Thượng Thanh, Thái Thanh. Chọn lễ vật, thắp ba nén tâm hương, giữ lòng tĩnh lặng và nghĩ về điều mình mong cho người thân.</p>
    ${offerField("tam-thanh")}<div id="hold"></div><p class="note">${isTouch ? "Chạm và giữ" : "Nhấn giữ chuột (hoặc phím cách)"} cho tới khi vòng sáng khép lại.</p>${ent}`);
  bindChips("f-offer");
  mountHold($("#hold"), "<b>Giữ</b>để dâng lễ, thắp ba nén hương", 2600, () => {
    if (id !== flow) return;
    const offer = readOffer("tam-thanh");
    world.fx.incense("tam-thanh");
    online?.sendFx("tam-thanh");
    audio.bell(196, 0.5);
    setTimeout(() => id === flow && bows(id, offer), 700);
  });
}

function bows(id, offer) {
  openSheet(`${stepDots(3, 1)}<h2>Ba lạy</h2><p class="sub">Lễ đã dâng, hương đã bén. Chắp tay, cúi đầu ba lần.</p>
    <div class="bows"><span>Lạy thứ nhất</span><span>Lạy thứ hai</span><span>Lạy thứ ba</span></div>
    <div class="btn-row"><button class="btn primary big" id="bow">🙏 Vái</button></div>`);
  let n = 0;
  $("#bow").addEventListener("click", () => {
    if (id !== flow || n >= 3) return;
    document.querySelectorAll(".bows span")[n].classList.add("on");
    n++;
    world.bow();
    audio.mo(0.5);
    buzz(25);
    if (n === 3) {
      $("#bow").disabled = true;
      setTimeout(() => {
        if (id !== flow) return;
        audio.bell(147, 0.6);
        world.fx.burst("tam-thanh");
        rain(RAIN["tam-thanh"], 18);
        const r = { kind: "tam-thanh", blessing: tamThanhBlessing(), profile: { name: me.name }, stamp: `${offer} · Giờ ${gioAm()} · ngày ${ngayVN()}` };
        track("reading_done", { kind: "tam-thanh", offer });
        afterReading(r, "huong");
        showResult(r, id);
      }, 900);
    }
  });
}

function ritualLove() {
  const id = ++flow, p = profile();
  const statuses = Object.values(loveStatuses).map(s => [s.key, s.label]);
  openSheet(`${stepDots(4, 0)}<h2>Nguyệt Lão Điện</h2>
    <p class="sub">Hợp Hoan Cung — nơi ông Tơ se chỉ hồng. Cho Nguyệt Lão biết đôi điều về thí chủ.</p>
    ${nameYearFields(p)}
    <div class="field"><span>Tình trạng hiện tại</span>${chips("f-status", statuses, p.status || "single")}</div>
    <label class="field"><span>Điều thí chủ mong <em>(không bắt buộc)</em></span>
      <textarea id="f-mong" maxlength="80" placeholder="Ví dụ: gặp được người hiểu mình">${esc(p.mong || "")}</textarea></label>
    <button class="btn primary big" id="go">Thắp hương & xin xăm</button>${ent}`);
  bindYear();
  bindChips("f-status");
  $("#go").addEventListener("click", () => {
    const ny = readNameYear();
    if (!ny) return;
    const prof = { ...ny, status: $("#f-status").dataset.val || "single", mong: $("#f-mong").value.trim().slice(0, 80) };
    saveProfile(prof);
    lightIncense("nguyet-lao", "Thắp một nén hương, khấn tên mình và điều mình mong.", () => shakeStep(id, "nguyet-lao", prof));
  });
}

function ritualWealth() {
  const id = ++flow, p = profile();
  const nghe = Object.entries(content.style.taiThan.nghe).map(([k, v]) => [k, v.label]);
  openSheet(`${stepDots(4, 0)}<h2>Tài Thần Điện</h2>
    <p class="sub">Triệu Công Minh cưỡi hổ, tay cầm roi vàng giữ kho lộc. Cho Tài Thần biết thí chủ là ai, làm nghề gì.</p>
    ${nameYearFields(p)}
    <div class="field"><span>Ngành nghề</span>${chips("f-nghe", nghe, p.nghe || "kinhdoanh")}</div>
    <button class="btn primary big" id="go">Thắp hương & xin quẻ</button>${ent}`);
  bindYear();
  bindChips("f-nghe");
  $("#go").addEventListener("click", () => {
    const ny = readNameYear();
    if (!ny) return;
    const prof = { ...ny, nghe: $("#f-nghe").dataset.val || "khac" };
    saveProfile(prof);
    lightIncense("tai-than", "Chọn lễ vật dâng Tài Thần, thắp một nén hương, khấn tên mình và việc làm ăn của mình.", offer => shakeStep(id, "tai-than", prof, offer));
  });
}

function shakeStep(id, z, prof, offer = "") {
  if (id !== flow) return;
  const love = z === "nguyet-lao";
  openSheet(`${stepDots(4, 2)}<h2>${love ? "Lắc ống xăm" : "Lắc ống quẻ"}</h2>
    <p class="sub">${love ? "Tâm nghĩ về chuyện nhân duyên, lắc cho tới khi một thẻ xăm nhô lên." : "Tâm nghĩ về công việc làm ăn, lắc cho tới khi một thẻ quẻ nhô lên."}</p><div id="shake"></div>`);
  mountShake($("#shake"), z, () => {
    if (id !== flow) return;
    const r = love ? readLove({ ...prof }) : readWealth({ ...prof });
    if (offer) r.stamp = `${offer} · ${r.stamp}`;
    track("reading_done", { kind: z, no: r.no, ...(offer ? { offer } : {}) });
    afterReading(r, "que");
    z === "tai-than" ? audio.coins(8) : audio.chime();
    world.fx.burst(z);
    rain(RAIN[z]);
    showResult(r, id);
  });
}

function ritualIching() {
  const id = ++flow, p = profile();
  const chude = Object.entries(content.style.bocDich.chude).map(([k, v]) => [k, v.label]);
  openSheet(`${stepDots(3, 0)}<h2>Bốc Dịch Đài</h2>
    <p class="sub">Gieo ba đồng xu sáu lần để lập một quẻ Kinh Dịch. Lão đạo sĩ sẽ giải cho thí chủ.</p>
    <div class="field"><span>Thí chủ muốn hỏi về</span>${chips("f-chude", chude, p.chude || "congviec")}</div>
    <label class="field"><span>Điều muốn hỏi <em>(khấn thầm cũng được)</em></span>
      <textarea id="f-ask" maxlength="80" placeholder="Ví dụ: có nên đổi việc trong năm nay?"></textarea></label>
    <label class="field"><span>Danh xưng <em>(không bắt buộc)</em></span>
      <input id="f-name" maxlength="40" value="${esc(p.name || me.name)}" placeholder="Để trống cũng được" autocomplete="name"></label>
    <button class="btn primary big" id="go">Bắt đầu gieo quẻ</button>${ent}`);
  bindChips("f-chude");
  $("#go").addEventListener("click", () => {
    const prof = { chude: $("#f-chude").dataset.val || "congviec", ask: $("#f-ask").value.trim().slice(0, 80), name: $("#f-name").value.trim().slice(0, 40) };
    saveProfile({ chude: prof.chude, ...(prof.name ? { name: prof.name } : {}) });
    tossStep(id, prof);
  });
}

function tossStep(id, prof) {
  if (id !== flow) return;
  openSheet(`${stepDots(3, 1)}<h2>Gieo sáu hào</h2>
    <p class="sub">Mỗi lần gieo ba đồng xu được một hào, xếp từ dưới lên. Ba mặt chữ là lão dương, ba mặt trơn là lão âm — đó là hào động.</p>
    <div class="coins">${'<div class="coin">錢</div>'.repeat(3)}</div>
    <div class="hexa">${'<div class="ln empty"><i></i></div>'.repeat(6)}</div>
    <button class="btn primary big" id="toss">Gieo hào 1 / 6</button>`);
  const lines = [], btn = $("#toss"), coins = [...document.querySelectorAll(".coin")], lns = [...document.querySelectorAll(".hexa .ln")];
  btn.addEventListener("click", () => {
    if (id !== flow || lines.length >= 6 || btn.disabled) return;
    btn.disabled = true;
    const l = tossLine();
    coins.forEach(c => { c.classList.remove("flip", "yin"); void c.offsetWidth; c.classList.add("flip"); });
    audio.coins(3);
    setTimeout(() => {
      if (id !== flow) return;
      coins.forEach((c, i) => { const yang = l.coins[i] === 3; c.classList.toggle("yin", !yang); c.textContent = yang ? "錢" : "寶"; });
      const el = lns[lines.length];
      el.className = `ln show${l.moving ? " mv" : ""}`;
      el.innerHTML = l.yang ? "<i></i>" : "<i></i><i></i>";
      lines.push(l);
      audio.mo(0.35);
      buzz(lines.length < 6 ? 30 : [40, 30, 100]);
      if (lines.length < 6) { btn.textContent = `Gieo hào ${lines.length + 1} / 6`; btn.disabled = false; return; }
      btn.textContent = "Quẻ đã thành";
      setTimeout(() => {
        if (id !== flow) return;
        const r = readIching({ ...prof }, lines);
        track("reading_done", { kind: "boc-dich", no: r.card?.so });
        afterReading(r, "que");
        audio.bell(174, 0.5);
        world.fx.burst("boc-dich");
        rain(RAIN["boc-dich"], 14);
        showResult(r, id);
      }, 900);
    }, 720);
  });
}

// ---------- Công đức ----------
const COLL_TOTAL = () => ({ "nguyet-lao": content.love.cards.length, "tai-than": content.wealth.que.length, "boc-dich": 64 });
const KIND_LABEL = { "nguyet-lao": "Xăm Nguyệt Lão", "tai-than": "Quẻ Tài Thần", "boc-dich": "Quẻ Dịch", "tam-thanh": "Bùa Bình An" };
const dayIdx = n => [...new Date().toDateString()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % n;
const withName = t => String(t || "").replace(/\{ten\}/g, me.name || "thí chủ");

function updateMerit(pop) {
  const b = $("#merit");
  b.querySelector("b").textContent = progress.state().pts;
  if (pop) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
}
// Báo điểm vừa nhận, thưởng đủ việc lành và thăng bậc.
function announce(res, first, extra = []) {
  if (!res) { toastSeq(extra); return; }
  updateMerit(true);
  const msgs = [first, ...extra];
  if (res.allDone) msgs.push(`Đủ 5 việc lành hôm nay — thưởng thêm ${ALL_DONE_BONUS} công đức 🎉`);
  if (res.rankUp) msgs.push(`Thăng bậc: ${res.rankUp} ✨`);
  toastSeq(msgs);
  if (res.allDone || res.rankUp) { rain(["✨", "☯️", "🪷"], 16); audio.chime(); }
  track("merit", { pts: res.pts, ...(res.task ? { task: res.task.id } : {}) });
}
function gain(id, extra) {
  const res = progress.complete(id);
  announce(res, res && `+${res.task.pts} công đức · ${res.task.label}`, extra);
}
function afterReading(r, task) {
  const extra = [];
  if (progress.record(r) && COLL_TOTAL()[r.kind]) {
    extra.push(`Quẻ mới vào bộ sưu tập · ${progress.state().seen[r.kind].length}/${COLL_TOTAL()[r.kind]}`);
  }
  gain(task, extra);
}

const taskList = st => `<ul class="tasks">${TASKS.map(t => {
  const ok = st.done.includes(t.id);
  return `<li class="${ok ? "ok" : ""}"><span class="tick">${ok ? "✓" : ""}</span><span class="tl">${esc(t.label)}</span><span class="tp">+${t.pts}</span>${!ok && t.go ? `<button class="btn mini" data-goto="${t.go}">Đi tới</button>` : ""}</li>`;
}).join("")}</ul><p class="note">Làm đủ 5 việc trong ngày: thưởng thêm ${ALL_DONE_BONUS} công đức.</p>`;
const bindTaskGo = () => sheetBody.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.goto)));

// ---------- Các điểm trong sân ----------
function talkDaoSi() {
  ++flow;
  world.fx.daoSiNod();
  audio.mo(0.3);
  const st = progress.state(), d = content.dao;
  const h = new Date().getHours();
  const greets = d.greetings[h < 11 ? "sang" : h < 14 ? "trua" : h < 18 ? "chieu" : "toi"];
  const teach = d.teachings[dayIdx(d.teachings.length)];
  const allDone = TASKS.every(t => st.done.includes(t.id));
  openSheet(`<div class="npc-head"><div class="npc-ava">道</div><div><h2>Lão Đạo Sĩ</h2><p class="sub">${esc(withName(greets[dayIdx(greets.length)]))}</p></div></div>
    ${st.visits <= 1 && !st.pts ? `<p class="sub">${esc(d.newcomer)}</p>` : ""}
    <div class="teach"><span class="lv">Lời dạy hôm nay</span><blockquote>${esc(teach.text)}</blockquote><cite>— ${esc(teach.src)}</cite><p>${esc(teach.giang)}</p></div>
    <h4>Việc lành hôm nay</h4>${allDone ? `<p class="sub">${esc(withName(d.allDone))}</p>` : ""}${taskList(st)}
    <div class="btn-row"><button class="btn primary" id="b-ledger">📜 Mở Sổ Công Đức</button></div>${ent}`, true);
  bindTaskGo();
  $("#b-ledger").addEventListener("click", openLedger);
}

function ringBell() {
  ++flow;
  const ok = world.fx.gong(() => {
    audio.bell(98, 0.8);
    setTimeout(() => audio.bell(147, 0.22), 140);
    buzz([30, 50, 30]);
    gain("chuong");
  });
  if (ok) online?.sendFx("chuong", "gong");
}

function ritualHoaDang() {
  const id = ++flow;
  const colors = [["sen", "🌸 Hồng sen"], ["vang", "🌼 Vàng nghệ"], ["trang", "🤍 Trắng ngà"]];
  openSheet(`<h2>Ao Sen</h2>
    <p class="sub">Viết một điều nguyện rồi thả hoa đăng xuống ao. Lời nguyện chỉ ở lại trong lòng thí chủ — người khác trong đình chỉ thấy chiếc đèn trôi.</p>
    <div class="field"><span>Màu hoa đăng</span>${chips("f-hd", colors, "sen")}</div>
    <label class="field"><span>Điều nguyện <em>(không bắt buộc, không lưu lại)</em></span>
      <textarea id="f-wish" maxlength="60" placeholder="Ví dụ: Mong mẹ luôn mạnh khỏe"></textarea></label>
    <button class="btn primary big" id="go">🏮 Thả hoa đăng</button>${ent}`);
  bindChips("f-hd");
  $("#go").addEventListener("click", () => {
    if (id !== flow) return;
    const color = $("#f-hd").dataset.val || "sen", wish = $("#f-wish").value.trim().slice(0, 60);
    closeSheet();
    world.fx.hoaDang(color);
    online?.sendFx("ao-sen", "hoadang", color);
    audio.chime();
    buzz(30);
    if (wish) showHint(`“${wish}” đã theo hoa đăng trôi đi…`, 4500);
    gain("hoadang");
  });
}

function tieRibbon() {
  ++flow;
  const n = progress.addRibbon();
  world.fx.ribbon(1, true);
  world.fx.burst("to-hong");
  online?.sendFx("to-hong", "ribbon");
  audio.chime();
  buzz(25);
  toast(`Đã buộc một sợi tơ hồng lên cây ❤️ (${n} sợi của thí chủ)`);
  if (n === 1) setTimeout(() => showHint("Muốn biết duyên mình ra sao? Nguyệt Lão Điện ở ngay phía sau cây.", 4500), 2600);
}

function harvestLoc() {
  ++flow;
  const list = content.dao.loc;
  const res = progress.harvest(() => list[Math.floor(Math.random() * list.length)]);
  if (!res.again) {
    world.fx.burst("kim-tien");
    audio.coins(8);
    buzz([40, 30, 80]);
    announce(res, `+${res.gained} công đức · Hái lộc cây kim tiền`);
  }
  openSheet(`<div class="reveal"><div class="lot"><span class="lv">Cây Kim Tiền · lộc hôm nay</span><h3>${esc(res.loc.ten)}</h3><div class="poem">${esc(res.loc.text)}</div></div></div>
    <p class="sub" style="text-align:center;margin-top:12px">${res.again ? "Hôm nay thí chủ đã hái lộc rồi — mai cây lại ra lộc mới." : "Mỗi ngày cây ra một lộc. Mai ghé hái tiếp nhé."}</p>
    <div class="btn-row"><button class="btn primary" id="b-tt">Sang Tài Thần Điện xin quẻ</button></div>${ent}`);
  $("#b-tt").addEventListener("click", () => goTo("tai-than"));
  track("harvest", { again: res.again });
}

function openLedger() {
  closeModal();
  ++flow;
  const st = progress.state(), rk = st.rank, totals = COLL_TOTAL();
  const pct = rk.next ? Math.round((st.pts - rk.min) / (rk.next[0] - rk.min) * 100) : 100;
  const coll = kind => {
    const seen = st.seen[kind] || [];
    return `<details class="coll"><summary><b>${KIND_LABEL[kind]}</b><span>${seen.length}/${totals[kind]}</span></summary>
      <div class="cells ${kind}">${Array.from({ length: totals[kind] }, (_, i) => `<i class="${seen.includes(i + 1) ? "on" : ""}">${i + 1}</i>`).join("")}</div></details>`;
  };
  const hist = st.history.length
    ? st.history.map((h, i) => `<li><span>${esc(KIND_LABEL[h.r.kind])} · ${esc(h.r.card?.ten || "Tâm an vạn sự an")}</span><small>${new Date(h.at).toLocaleDateString("vi-VN")}</small><button class="btn mini" data-h="${i}">Xem lại</button></li>`).join("")
    : `<li class="muted">Chưa có lá bùa nào. Ghé một điện để xin quẻ nhé.</li>`;
  openSheet(`<h2>📜 Sổ Công Đức</h2>
    <div class="rank"><div class="rank-name">${esc(rk.name)}</div>
      <div class="rank-pts">☯ ${st.pts} công đức${rk.next ? ` · còn ${rk.next[0] - st.pts} nữa lên bậc ${esc(rk.next[1])}` : ""}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="streak">🔥 ${st.streak} ngày liên tiếp làm việc lành</div></div>
    <h4>Việc lành hôm nay</h4>${taskList(st)}
    <h4>Bộ sưu tập quẻ</h4>${coll("nguyet-lao")}${coll("tai-than")}${coll("boc-dich")}
    <h4>Lá bùa gần đây</h4><ul class="hist">${hist}</ul>
    <p class="note">Sổ chỉ lưu trên trình duyệt của máy này. <button class="linkish" id="b-clear">Xóa sổ công đức</button></p>`, true);
  bindTaskGo();
  sheetBody.querySelectorAll("[data-h]").forEach(b => b.addEventListener("click", () => {
    const r = st.history[+b.dataset.h]?.r;
    if (r) showResult(r, ++flow, true);
  }));
  $("#b-clear").addEventListener("click", () => {
    if (!confirm("Xóa toàn bộ công đức, bộ sưu tập và lá bùa đã lưu trên máy này?")) return;
    progress.clearAll();
    updateMerit();
    openLedger();
    toast("Đã xóa sổ công đức.");
  });
  track("ledger_open");
}

// ---------- Kết quả ----------
const hexHtml = lines => `<div class="hexa">${lines.map(l => `<div class="ln show${l.moving ? " mv" : ""}">${l.yang ? "<i></i>" : "<i></i><i></i>"}</div>`).join("")}</div>`;

function lotHtml(r) {
  const c = r.card;
  if (r.kind === "tam-thanh") {
    return `<div class="lot"><span class="lv">Tam Thanh ban phúc</span><h3>Tâm an vạn sự an</h3><div class="poem">${esc(r.blessing)}</div></div>`;
  }
  if (r.kind === "boc-dich") {
    const ch = r.changed ? `<div class="cdn">Biến sang quẻ ${esc(r.changed.ten)}</div>` : "";
    return `<div class="lot"><span class="lv">Quẻ số ${c.so} · Thượng ${TRIGRAM_NAME[c.upper]} · Hạ ${TRIGRAM_NAME[c.lower]}</span>
      ${hexHtml(r.lines)}<h3>${esc(c.ten)}</h3><div class="cd">${esc(c.han)}</div>${ch}</div>`;
  }
  return `<div class="lot"><span class="lv">${r.kind === "tai-than" ? "Quẻ" : "Xăm"} số ${r.no}/${r.total} · ${esc(c.lv)}</span>
    <h3>${esc(c.ten)}</h3><div class="poem">${(c.tho || []).map(esc).join("<br>")}</div></div>`;
}

function showResult(r, id, replay = false) {
  if (id !== flow) return;
  const p = r.profile || {};
  const who = r.yi ? `${esc(p.name)} · ${esc(r.yi.canchi)} · mệnh ${esc(r.yi.menh)}` : p.chudeLabel ? `Hỏi về ${esc(p.chudeLabel.toLowerCase())}` : "";
  const badge = r.timingLabel ? `<p style="text-align:center;margin:14px 0 0"><span class="badge ${esc(r.card.timing)}">${esc(r.timingLabel)}</span></p>` : "";
  const sections = (r.sections || []).map(s => {
    const ps = s.p.filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
    return ps ? `<h4>${esc(s.h)}</h4>${ps}` : "";
  }).join("");
  const secret = r.secret ? `<div class="secret locked" id="secret"><h4>Lời dặn riêng 🔒</h4><div class="s-body">${esc(r.secret)}</div>
    <p class="note" id="secret-note">Lưu hoặc chia sẻ lá bùa để mở lời dặn riêng.</p></div>` : "";
  const nextZone = { "tam-thanh": "nguyet-lao", "nguyet-lao": "tai-than", "tai-than": "boc-dich", "boc-dich": "tam-thanh" }[r.kind];
  openSheet(`<div class="reveal">${lotHtml(r)}</div>
    <p class="sub" style="text-align:center;margin-top:12px">${who ? who + "<br>" : ""}${esc(r.stamp || "")}</p>${badge}
    ${sections ? `<div class="read">${sections}</div>` : ""}
    ${r.blessing && r.kind !== "tam-thanh" ? `<p class="blessing">${esc(r.blessing)}</p>` : ""}
    <img class="charm-preview" id="charm" alt="Lá bùa của bạn" hidden>
    <p class="note" id="charm-note">Đang vẽ lá bùa…</p>
    <div class="btn-row"><button class="btn primary" id="b-save" disabled>⬇ Lưu lá bùa</button><button class="btn primary" id="b-share" disabled>↗ Chia sẻ</button></div>
    <div class="share-list"><button class="btn" id="b-fb">Facebook</button><button class="btn" id="b-copy">Chép lời chia sẻ</button></div>
    ${secret}
    <div class="btn-row">${r.kind === "tam-thanh" ? "" : `<button class="btn ghost" id="b-again">${r.kind === "boc-dich" ? "Gieo quẻ khác" : "Rút quẻ khác"}</button>`}
      <button class="btn ghost" id="b-next">Sang ${esc(ZONES[nextZone].name)}</button></div>${ent}`, true);

  let blob = null;
  const unlock = () => {
    const s = $("#secret");
    if (!s || !s.classList.contains("locked")) return;
    s.classList.remove("locked");
    s.querySelector("h4").textContent = "Lời dặn riêng 🔓";
    $("#secret-note")?.remove();
  };
  if (replay) unlock();
  drawCharm(r, config).then(async cv => {
    blob = await canvasBlob(cv);
    if (id !== flow || !blob) return;
    const img = $("#charm");
    img.src = URL.createObjectURL(blob);
    img.hidden = false;
    $("#charm-note").textContent = isTouch ? "Nhấn giữ ảnh để lưu nếu nút Lưu không hoạt động." : "Lá bùa được vẽ ngay trên máy của bạn.";
    $("#b-save").disabled = false;
    $("#b-share").disabled = false;
  }).catch(e => { console.error(e); $("#charm-note").textContent = "Chưa vẽ được lá bùa trên trình duyệt này."; });

  $("#b-save").addEventListener("click", () => {
    if (!blob) return;
    saveBlob(blob, fileName(r));
    unlock();
    track("charm_save", { kind: r.kind });
    toast("Đã lưu lá bùa 🧧");
  });
  $("#b-share").addEventListener("click", async () => {
    const res = await shareBlob(blob, r, config);
    if (res === "cancelled") return;
    unlock();
    gain("chiase");
    track("charm_share", { kind: r.kind, method: res });
    if (res === "copied") toast("Đã tải ảnh và chép lời chia sẻ — dán vào nơi bạn muốn đăng nhé.");
  });
  $("#b-fb").addEventListener("click", () => {
    open(facebookUrl(shareUrl(config, r.kind, "facebook")), "_blank", "noopener,width=640,height=560");
    unlock();
    gain("chiase");
    track("charm_share", { kind: r.kind, method: "facebook" });
  });
  $("#b-copy").addEventListener("click", async () => {
    const ok = await copyText(shareText(r, config, "copy"));
    toast(ok ? "Đã chép lời chia sẻ" : "Trình duyệt chưa cho chép, bạn thử chọn và sao chép thủ công nhé.");
    if (ok) { unlock(); gain("chiase"); track("charm_share", { kind: r.kind, method: "copy" }); }
  });
  $("#b-again")?.addEventListener("click", () => openRitual(r.kind));
  $("#b-next").addEventListener("click", () => goTo(nextZone));
}

// ---------- Di chuyển nhanh ----------
function goTo(z) {
  closeModal();
  if (!sheet.classList.contains("hidden")) closeSheet();
  veil(() => { world.teleport(z); audio.whoosh(); });
}

// ---------- Sự kiện thế giới ----------
function onZone(z) {
  document.body.dataset.zone = z;
  $("#zone-name").textContent = ZONES[z]?.name || "Sân Đình";
  audio.setZone(z);
  if (z !== "san") { banner(z); track("zone_enter", { zone: z }); }
}
function onNear(z) {
  near = z;
  const b = $("#btn-act");
  if (!z || !entered || sheetOpen()) { b.classList.add("hidden"); return; }
  b.innerHTML = `${esc(ZONES[z].act)}${isTouch ? "" : " <kbd>E</kbd>"}`;
  b.classList.remove("hidden");
}

// ---------- Modal ----------
function openModal(id) { $("#" + id).classList.remove("hidden"); world?.setPaused(true); }
function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
  if (sheet.classList.contains("hidden")) world?.setPaused(false);
}

// ---------- Khởi động ----------
function setupGate() {
  const box = $("#gate-colors");
  box.innerHTML = COLORS.map(c => `<button type="button" class="chip swatch${c.v === me.color ? " on" : ""}" data-c="${c.v}" title="Áo ${c.n}" aria-label="Áo ${c.n}" style="background:${c.v}"></button>`).join("");
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if (!b) return;
    me.color = b.dataset.c;
    box.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#gate-name").value = me.name;
  $("#gate-name").addEventListener("keydown", e => { if (e.key === "Enter" && !$("#gate-enter").disabled) enter(); });
  $("#gate-enter").addEventListener("click", enter);
}

function enter() {
  if (entered) return;
  if (!world) { location.reload(); return; }
  entered = true;
  me.name = $("#gate-name").value.trim().replace(/\s+/g, " ").slice(0, 20);
  session.set("name", me.name);
  session.set("color", me.color);
  audio.initAudio();
  audio.bell(174, 0.45);
  const gate = $("#gate");
  gate.classList.add("out");
  setTimeout(() => gate.classList.add("hidden"), 820);
  $("#hud").classList.remove("hidden");
  world.enter({ name: me.name || "Thí chủ", color: me.color });
  const firstVisit = progress.visit();
  const ribbons = progress.state().ribbons;
  if (ribbons) world.fx.ribbon(ribbons, false);
  updateMerit();
  if (deepZone) {
    // Đến từ link chia sẻ của một điện: đưa thẳng tới đó và mở nghi lễ.
    setTimeout(() => veil(() => { world.teleport(deepZone); openRitual(deepZone); }), 700);
  } else if (firstVisit) {
    showHint("Lão Đạo Sĩ đang đứng chờ ngay bên phải — bấm nút để hỏi chuyện", 6000);
    setTimeout(() => !sheetOpen() && showHint(isTouch ? "Kéo cần điều khiển hoặc chạm xuống sân để đi" : "Dùng W A S D / phím mũi tên, hoặc bấm xuống sân để đi", 5200), 6500);
  } else {
    const left = TASKS.filter(t => !progress.state().done.includes(t.id)).length;
    showHint(left ? `Hôm nay còn ${left} việc lành chưa làm — mở 📜 để xem` : "Hôm nay thí chủ đã đủ việc lành. Cứ thong thả dạo đình.", 5200);
  }
  track("enter", { color: me.color, ...(deepZone ? { zone: deepZone } : {}) });
  connectOnline(config.supabase, me, world, n => {
    const el = $("#online");
    el.textContent = `● ${n} người trong đình`;
    el.classList.toggle("hidden", n < 1);
  }).then(o => { online = o; });
}

function setupHud() {
  $("#btn-act").addEventListener("click", () => openRitual(near));
  $("#merit").addEventListener("click", openLedger);
  $("#btn-map").addEventListener("click", () => openModal("map"));
  $("#btn-home").addEventListener("click", () => goTo("tam-thanh"));
  $("#btn-sound").addEventListener("click", () => {
    const on = !audio.soundOn();
    audio.setSound(on);
    $("#btn-sound").textContent = on ? "🔊" : "🔇";
  });
  $("#sheet-close").addEventListener("click", closeSheet);
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => goTo(b.dataset.go)));
  document.querySelectorAll("[data-open]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openModal(a.dataset.open); }));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) closeModal(); }));
  addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (document.querySelector(".modal:not(.hidden)")) closeModal();
      else if (!sheet.classList.contains("hidden")) closeSheet();
      return;
    }
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName)) return;
    if ((e.code === "KeyE" || e.key === "Enter") && near && entered && sheet.classList.contains("hidden") && !document.querySelector(".modal:not(.hidden)")) {
      e.preventDefault();
      openRitual(near);
    }
  });
}

function setupJoystick() {
  const joy = $("#joy"), knob = joy.querySelector(".joy-knob"), MAX = 40;
  let pid = null, cx = 0, cy = 0;
  const move = e => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > MAX) { dx = dx / d * MAX; dy = dy / d * MAX; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    world?.setJoystick(dx / MAX, dy / MAX);
  };
  const end = e => {
    if (e.pointerId !== pid) return;
    pid = null;
    knob.style.transform = "";
    joy.classList.remove("free");
    world?.setJoystick(0, 0);
  };
  joy.addEventListener("pointerdown", e => {
    pid = e.pointerId;
    joy.setPointerCapture(pid);
    const r = joy.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    joy.classList.add("free");
    move(e);
  });
  joy.addEventListener("pointermove", e => { if (e.pointerId === pid) move(e); });
  joy.addEventListener("pointerup", end);
  joy.addEventListener("pointercancel", end);
}

async function boot() {
  initAnalytics(config.analytics);
  setupGate();
  setupHud();
  setupJoystick();
  const btn = $("#gate-enter");
  try {
    const [, w] = await Promise.all([loadContent(), createWorld($("#scene"), { onZone, onNear })]);
    world = w;
    // ?gio=14 để xem thử cảnh vào giờ khác (dùng khi kiểm thử, chụp ảnh quảng bá).
    const gio = new URLSearchParams(location.search).get("gio");
    if (gio) world.setHour(Number(gio));
    btn.disabled = false;
    btn.textContent = GATE_CTA[deepZone] || "Bước vào đình";
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = "Chưa mở được cổng — bấm để tải lại";
  }
}

boot();
