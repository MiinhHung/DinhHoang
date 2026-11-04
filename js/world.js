// Cảnh 3D của đình: sân, bốn điện, nhân vật, người chơi khác và hiệu ứng. Toàn bộ dựng bằng hình khối, không cần file mô hình.
import * as THREE from "three";

export const ZONES = {
  san: { name: "Sân Đình", han: "", sub: "" },
  "tam-thanh": { name: "Tam Thanh Điện", han: "三清殿", sub: "Chính điện · thắp nén tâm hương", act: "Thắp hương" },
  "tai-than": { name: "Tài Thần Điện", han: "財神殿", sub: "Triệu Công Minh · cầu tài lộc", act: "Xin quẻ Tài Thần" },
  "nguyet-lao": { name: "Nguyệt Lão Điện", han: "月老殿 · 合歡宮", sub: "Hợp Hoan Cung · cầu duyên", act: "Rút xăm Nguyệt Lão" },
  "boc-dich": { name: "Bốc Dịch Đài", han: "卜易台", sub: "Gieo quẻ Kinh Dịch", act: "Gieo quẻ" }
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SPOT = { "tam-thanh": V(0, 0, -10.5), "tai-than": V(11.8, 0, -2), "nguyet-lao": V(-11.8, 0, -2), "boc-dich": V(0, 0, 8) };
const BURNER = { "tam-thanh": V(0, 0, -13), "tai-than": V(14.5, 0, -2), "nguyet-lao": V(-14.5, 0, -2), "boc-dich": V(0, 0, 8) };
const ACT_R = { "tam-thanh": 3.2, "tai-than": 3.2, "nguyet-lao": 3.2, "boc-dich": 4.2 };
const SPAWN = V(0, 0, 19);
// Giới hạn phía nam để camera không chui sau mái tam quan.
const BOUNDS = { x0: -27.5, x1: 27.5, z0: -27.5, z1: 21 };
const SPEED = 5.2, RADIUS = 0.45;

function zoneAt(x, z) {
  if (Math.hypot(x, z - 8) < 5.5) return "boc-dich";
  if (z < -6 && Math.abs(x) < 11) return "tam-thanh";
  if (x > 8 && z < 8) return "tai-than";
  if (x < -8 && z < 8) return "nguyet-lao";
  return "san";
}

// ---------- Vật liệu & hình khối ----------
const mats = new Map();
function lam(color, emissive) {
  const k = color + "|" + (emissive || "");
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 }));
  return mats.get(k);
}
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (rt, rb, h, mat, x, y, z, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const ball = (r, mat, x, y, z, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0)), mat, x, y, z);

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

const HAN = '"Noto Serif TC", "Songti SC", "SimSun", serif';
const SERIF = '"Noto Serif", "Times New Roman", serif';

function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const all = Promise.all([
    document.fonts.load(`700 64px ${HAN}`, "三清殿財神月老卜易台玉上太福壽招進寶金錢吉祥天作之合紅線歡道緣"),
    document.fonts.load(`700 40px ${SERIF}`, "ĐÌNH HOÀNG")
  ]).catch(() => {});
  return Promise.race([all, new Promise(r => setTimeout(r, 2500))]);
}

// ---------- Kết cấu vẽ bằng canvas ----------
function makeTextures() {
  const glow = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const smoke = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const heart = canvasTex(64, 64, (g) => {
    g.fillStyle = "#ff7a9c";
    g.beginPath(); g.moveTo(32, 54);
    g.bezierCurveTo(4, 36, 6, 10, 22, 10); g.bezierCurveTo(28, 10, 32, 16, 32, 20);
    g.bezierCurveTo(32, 16, 36, 10, 42, 10); g.bezierCurveTo(58, 10, 60, 36, 32, 54); g.fill();
  });
  const coin = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(24, 22, 2, 32, 32, 30);
    gr.addColorStop(0, "#fff1b8"); gr.addColorStop(0.6, "#e0a93c"); gr.addColorStop(1, "#8a5e17");
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
    g.clearRect(26, 26, 12, 12);
    g.strokeStyle = "rgba(90,58,8,.6)"; g.lineWidth = 2; g.strokeRect(25, 25, 14, 14);
  });
  const petal = canvasTex(32, 32, (g) => {
    g.fillStyle = "#ffc2d4";
    g.beginPath(); g.ellipse(16, 16, 12, 7, 0.6, 0, Math.PI * 2); g.fill();
  });
  const shadow = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  return { glow, smoke, heart, coin, petal, shadow };
}

function stoneTexture() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#4e4a45"; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 108 + Math.random() * 22 | 0;
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
    for (let k = 0; k < 2500; k++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},${Math.random() * 0.06})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  return t;
}

function boardTexture(text, { w = 512, h = 160, bg = "#5a0f12", fg = "#f2c76a", font = HAN, size = 96, vertical = false } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${size}px ${font}`;
    if (vertical) {
      const chars = [...text], step = (h - 60) / chars.length;
      chars.forEach((c, i) => g.fillText(c, w / 2, 30 + step * (i + 0.5)));
    } else {
      g.fillText(text, w / 2, h / 2 + 4, w - 60);
    }
  });
}

function boardMesh(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

// ---------- Công trình ----------
function hipRoof(w, d, h, mat, topRatio) {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * topRatio, Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w, h, d);
  return m;
}

function makeStatue({ robe, skin = "#e9c58f", beard = false, hat = "#2b2b2b", halo = "#ffd98a" }) {
  const g = new THREE.Group();
  const gold = lam("#c99a3e", "#3a2508");
  g.add(box(1.6, 0.8, 1.2, gold, 0, 0.4, 0));
  g.add(cyl(0.55, 0.85, 1.4, lam(robe), 0, 1.5, 0));
  g.add(box(1.3, 0.35, 0.9, lam(robe), 0, 0.95, 0.25));
  g.add(ball(0.36, lam(skin), 0, 2.45, 0));
  g.add(cyl(0.28, 0.32, 0.35, lam(hat), 0, 2.85, 0));
  g.add(box(0.7, 0.08, 0.3, lam(hat), 0, 3.02, 0));
  if (beard) {
    const b = mesh(new THREE.ConeGeometry(0.22, 0.7, 10), lam("#f4f1ea"), 0, 2.05, 0.28);
    b.rotation.x = Math.PI;
    g.add(b);
  }
  const h = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ color: halo, transparent: true, opacity: 0.55, toneMapped: false }));
  h.position.set(0, 2.5, -0.35);
  g.add(h);
  return g;
}

function makeLantern(color = "#e0362c", emissive = "#b01a12") {
  const g = new THREE.Group();
  const body = ball(0.32, lam(color, emissive), 0, 0, 0, 14);
  body.scale.set(1, 1.25, 1);
  g.add(body);
  g.add(cyl(0.14, 0.14, 0.08, lam("#e7b75a"), 0, 0.42, 0));
  g.add(cyl(0.14, 0.14, 0.08, lam("#e7b75a"), 0, -0.42, 0));
  g.add(cyl(0.015, 0.015, 0.5, lam("#e7b75a"), 0, -0.7, 0, 4));
  return g;
}

function makeBurner() {
  const g = new THREE.Group();
  const bronze = lam("#7a5a2e", "#1a1004");
  g.add(box(1.5, 0.3, 1.5, lam("#6f675c"), 0, 0.15, 0));
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    g.add(cyl(0.07, 0.1, 0.45, bronze, Math.cos(a) * 0.45, 0.5, Math.sin(a) * 0.45, 6));
  }
  g.add(cyl(0.72, 0.55, 0.6, bronze, 0, 1.0, 0, 18));
  const rim = mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 20), bronze, 0, 1.3, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  g.add(cyl(0.66, 0.66, 0.04, lam("#8f8574"), 0, 1.28, 0, 18));
  const sticks = new THREE.Group();
  sticks.position.y = 1.28;
  g.add(sticks);
  g.userData.sticks = sticks;
  return g;
}

function addStick(burner) {
  const s = burner.userData.sticks;
  if (s.children.length >= 18) s.remove(s.children[0]);
  const st = new THREE.Group();
  const r = Math.random() * 0.4, a = Math.random() * Math.PI * 2;
  st.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  st.rotation.set((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15);
  st.add(cyl(0.022, 0.022, 0.9, lam("#b3242a"), 0, 0.45, 0, 4));
  st.add(ball(0.04, new THREE.MeshBasicMaterial({ color: 0xff8a3c, toneMapped: false }), 0, 0.92, 0, 6));
  s.add(st);
}

function makeHall({ w, d, h, wall, roof, trim = "#e7b75a", board, couplets, statues = [], lantern }) {
  const g = new THREE.Group();
  const top = 0.6;
  const stone = lam("#8d8577");
  g.add(box(w + 2, top, d + 2, stone, 0, top / 2, 0));
  g.add(box(w * 0.45, 0.3, 1.2, stone, 0, 0.15, d / 2 + 1.6));
  g.add(box(w, 0.04, d, lam("#4a2e22"), 0, top + 0.02, 0));
  const wallM = lam(wall);
  g.add(box(w, h, 0.3, wallM, 0, top + h / 2, -d / 2));
  g.add(box(0.3, h, d, wallM, -w / 2, top + h / 2, 0));
  g.add(box(0.3, h, d, wallM, w / 2, top + h / 2, 0));

  const colM = lam("#a3201f");
  const n = Math.max(4, Math.round(w / 3.2) + 1);
  const colX = [];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.3 + (w - 0.6) * i / (n - 1);
    colX.push(x);
    g.add(cyl(0.2, 0.24, h, colM, x, top + h / 2, d / 2 - 0.2));
  }
  g.add(box(w + 0.6, 0.45, 0.5, lam(trim), 0, top + h - 0.1, d / 2 - 0.2));

  const roofM = new THREE.MeshLambertMaterial({ color: roof, side: THREE.DoubleSide });
  const ry = top + h + 0.1;
  g.add(hipRoof(w + 3.4, d + 3.2, 1.5, roofM, 0.62).translateY(ry));
  g.add(box(w * 0.66, 1.1, d * 0.6, wallM, 0, ry + 1.9, 0));
  g.add(hipRoof(w * 0.66 + 2.2, d * 0.6 + 2.2, 1.7, roofM, 0.12).translateY(ry + 2.4));
  const ridgeY = ry + 2.4 + 1.7;
  g.add(box(w * 0.5, 0.22, 0.3, lam(trim), 0, ridgeY, 0));
  g.add(ball(0.32, lam("#ffd36b", "#7a4a00"), 0, ridgeY + 0.38, 0));
  [-1, 1].forEach(s => {
    const curl = mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12, Math.PI * 1.2), lam(trim), s * w * 0.25, ridgeY + 0.3, 0);
    curl.rotation.z = s > 0 ? -0.2 : Math.PI + 0.2;
    g.add(curl);
  });
  // Đầu đao cong vút ở bốn góc mái dưới.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(0.14, 1.0, 6), lam(trim), sx * (w + 3.4) / 2, ry + 0.25, sz * (d + 3.2) / 2);
    e.rotation.z = -sx * 0.9;
    e.rotation.x = sz * 0.9;
    g.add(e);
  }

  if (board) {
    const b = boardMesh(boardTexture(board), 3.2, 1);
    b.position.set(0, top + h - 0.85, d / 2 + 0.12);
    g.add(b);
  }
  if (couplets) {
    [colX[1], colX[n - 2]].forEach((x, i) => {
      const c = boardMesh(boardTexture(couplets[i], { w: 128, h: 512, vertical: true, size: 84 }), 0.5, h * 0.62);
      c.position.set(x, top + h * 0.48, d / 2 + 0.08);
      g.add(c);
    });
  }

  // Bàn thờ, tượng, nến và đèn trong điện.
  const altarZ = -d / 2 + 2.4;
  g.add(box(Math.min(w - 2, 6), 1, 1.2, lam("#5c1f14"), 0, top + 0.5, altarZ));
  g.add(box(Math.min(w - 2, 6) + 0.1, 0.6, 0.05, lam("#d4a03c", "#3a2508"), 0, top + 0.6, altarZ + 0.62));
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false });
  [-1, 1].forEach(s => {
    g.add(cyl(0.07, 0.07, 0.4, lam("#f3e6c8"), s * 1.2, top + 1.2, altarZ, 8));
    g.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 6), flameM, s * 1.2, top + 1.47, altarZ));
  });
  statues.forEach(s => {
    const st = makeStatue(s);
    st.position.set(s.x || 0, top, -d / 2 + 1.0);
    g.add(st);
  });
  const light = new THREE.PointLight(0xffb066, 22, 11, 2);
  light.position.set(0, top + 2.4, altarZ + 0.8);
  g.add(light);
  g.userData.light = light;

  const lc = lantern || ["#e0362c", "#b01a12"];
  [-1, 1].forEach(s => {
    const l = makeLantern(lc[0], lc[1]);
    l.position.set(s * (w / 2 + 0.6), top + h - 0.8, d / 2 + 0.9);
    g.add(l);
    g.add(cyl(0.012, 0.012, 0.6, lam("#222"), s * (w / 2 + 0.6), top + h - 0.25, d / 2 + 0.9, 4));
  });
  return g;
}

function makeTree(kind = "pine") {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.28, 2, lam("#4a3324"), 0, 1, 0, 7));
  if (kind === "pine") {
    const m = lam("#1f4a3a");
    [[1.8, 2.2, 2.4], [1.4, 1.9, 3.6], [0.9, 1.5, 4.7]].forEach(([r, h, y]) => g.add(mesh(new THREE.ConeGeometry(r, h, 8), m, 0, y, 0)));
  } else {
    const col = kind === "tohong" ? "#e2557a" : kind === "kimtien" ? "#3f7a3a" : "#f4a6c0";
    const m = lam(col, kind === "blossom" ? "#40202c" : "#000000");
    [[0, 3, 0, 1.4], [0.9, 2.6, 0.3, 1], [-0.9, 2.7, -0.2, 1.05], [0.2, 3.6, -0.6, 0.9], [-0.3, 2.5, 0.9, 0.9]].forEach(([x, y, z, r]) => g.add(ball(r, m, x, y, z, 10)));
    if (kind === "tohong") {
      const thread = new THREE.LineBasicMaterial({ color: 0xff2f4f });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 0.8, x = Math.cos(a) * r, z = Math.sin(a) * r;
        const y0 = 2.2 + Math.random() * 0.4, y1 = y0 - 0.6 - Math.random() * 0.7;
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x, y0, z), V(x, y1, z)]), thread));
        g.add(box(0.1, 0.18, 0.02, lam("#d0202e", "#4a0008"), x, y1 - 0.08, z));
      }
    }
    if (kind === "kimtien") {
      const cm = lam("#e7b75a", "#4a3000");
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.7;
        const c = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), cm, Math.cos(a) * r, 2.1 + Math.random() * 1.6, Math.sin(a) * r);
        c.rotation.x = Math.PI / 2;
        c.rotation.z = a;
        g.add(c);
      }
    }
  }
  return g;
}

function makeStoneLamp() {
  const g = new THREE.Group();
  const s = lam("#7d766b");
  g.add(box(0.6, 0.2, 0.6, s, 0, 0.1, 0));
  g.add(box(0.25, 0.9, 0.25, s, 0, 0.65, 0));
  g.add(box(0.55, 0.45, 0.55, lam("#e8c27a", "#8a5a10"), 0, 1.32, 0));
  g.add(mesh(new THREE.ConeGeometry(0.55, 0.4, 4), s, 0, 1.75, 0).rotateY(Math.PI / 4));
  return g;
}

function makeBagua() {
  const g = new THREE.Group();
  g.add(cyl(4.3, 4.5, 0.4, lam("#77706a"), 0, 0.2, 0, 8));
  const tex = canvasTex(1024, 1024, (c, w) => {
    const cx = w / 2;
    c.fillStyle = "#3b3f55"; c.fillRect(0, 0, w, w);
    c.strokeStyle = "#c9a95c"; c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cx, 470, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cx, 250, 0, Math.PI * 2); c.stroke();
    // Hậu Thiên Bát Quái: Ly ở hướng Nam (phía người chơi đứng nhìn vào).
    const order = ["101", "011", "110", "000", "010", "001", "111", "100"];
    order.forEach((bits, i) => {
      c.save();
      c.translate(cx, cx);
      c.rotate(i * Math.PI / 4);
      c.fillStyle = "#e7c46e";
      for (let k = 0; k < 3; k++) {
        const y = 300 + k * 45;
        if (bits[k] === "1") c.fillRect(-90, y, 180, 26);
        else { c.fillRect(-90, y, 75, 26); c.fillRect(15, y, 75, 26); }
      }
      c.restore();
    });
  });
  const top = new THREE.Mesh(new THREE.CircleGeometry(4.1, 8), new THREE.MeshLambertMaterial({ map: tex }));
  top.rotation.x = -Math.PI / 2;
  top.rotation.z = Math.PI / 8;
  top.position.y = 0.41;
  g.add(top);
  const taiTex = canvasTex(512, 512, (c) => {
    const r = 240, cx = 256;
    c.fillStyle = "#f4ead6"; c.beginPath(); c.arc(cx, cx, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#1b1730"; c.beginPath(); c.arc(cx, cx, r, Math.PI / 2, Math.PI * 1.5); c.fill();
    c.beginPath(); c.arc(cx, cx - r / 2, r / 2, 0, Math.PI * 2); c.fillStyle = "#f4ead6"; c.fill();
    c.beginPath(); c.arc(cx, cx + r / 2, r / 2, 0, Math.PI * 2); c.fillStyle = "#1b1730"; c.fill();
    c.beginPath(); c.arc(cx, cx - r / 2, r / 7, 0, Math.PI * 2); c.fillStyle = "#1b1730"; c.fill();
    c.beginPath(); c.arc(cx, cx + r / 2, r / 7, 0, Math.PI * 2); c.fillStyle = "#f4ead6"; c.fill();
  });
  const taiji = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshLambertMaterial({ map: taiTex, emissive: 0x111122 }));
  taiji.rotation.x = -Math.PI / 2;
  taiji.position.y = 0.43;
  g.add(taiji);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.95, 2.15, 48), new THREE.MeshBasicMaterial({ color: 0x9fc3ff, transparent: true, opacity: 0.25, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.44;
  g.add(ring);
  g.userData = { taiji, ring };
  return g;
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const g = c.getContext("2d");
  g.font = `700 44px ${SERIF}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const tw = Math.min(500, g.measureText(text).width + 44);
  g.fillStyle = "rgba(20,16,34,.62)";
  roundRect(g, 256 - tw / 2, 14, tw, 68, 34); g.fill();
  g.fillStyle = "#f7d98b";
  g.fillText(text, 256, 50, 470);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(2.6, 0.49, 1);
  s.position.y = 2.65;
  return s;
}

function makeAvatar(color, name, tex) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const robe = lam(color);
  body.add(cyl(0.3, 0.5, 1.15, robe, 0, 0.58, 0));
  body.add(cyl(0.32, 0.32, 0.1, lam("#e7b75a"), 0, 1.15, 0));
  const upper = new THREE.Group();
  upper.position.y = 1.15;
  body.add(upper);
  upper.add(cyl(0.24, 0.3, 0.5, robe, 0, 0.25, 0));
  [-1, 1].forEach(s => {
    const sl = cyl(0.09, 0.17, 0.6, robe, s * 0.33, 0.2, 0.05, 8);
    sl.rotation.z = s * 0.35;
    upper.add(sl);
  });
  upper.add(ball(0.24, lam("#f1c9a0"), 0, 0.72, 0));
  const hair = ball(0.255, lam("#1d1612"), 0, 0.77, -0.03);
  hair.scale.set(1, 0.85, 1);
  upper.add(hair);
  upper.add(ball(0.11, lam("#1d1612"), 0, 0.98, -0.08, 8));
  [-1, 1].forEach(s => upper.add(ball(0.03, lam("#1d1612"), s * 0.08, 0.74, 0.215, 6)));
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: tex.shadow, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  group.add(sh);
  let label = makeLabel(name);
  group.add(label);
  return {
    group, body, upper, name,
    setName(n) {
      if (n === this.name) return;
      group.remove(label);
      label.material.map.dispose(); label.material.dispose();
      label = makeLabel(n);
      group.add(label);
      this.name = n;
    },
    setColor(c) {
      const m = lam(c);
      body.children[0].material = m;
      upper.children.slice(0, 3).forEach(x => (x.material = m));
    }
  };
}

function skyDome() {
  const geo = new THREE.SphereGeometry(220, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color("#0c0a22") }, mid: { value: new THREE.Color("#3a2a5e") }, low: { value: new THREE.Color("#d9855a") } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c, 1.0); }"
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -1;
  return m;
}

// ---------- Tạo thế giới ----------
export async function createWorld(container, hooks = {}) {
  await fontsReady();
  const W = () => container.clientWidth || innerWidth, H = () => container.clientHeight || innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: (devicePixelRatio || 1) < 2, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a2342, 38, 130);
  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 500);
  camera.position.set(0, 16, 46);
  const tex = makeTextures();

  scene.add(new THREE.HemisphereLight(0xb9a8ff, 0x4a3426, 1.7));
  scene.add(new THREE.AmbientLight(0x8a7aa8, 0.55));
  const moonLight = new THREE.DirectionalLight(0xffe2c0, 1.5);
  moonLight.position.set(-30, 50, 20);
  scene.add(moonLight);

  scene.add(skyDome());
  const stars = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3, r = 200;
    stars.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6e0, size: 1.1, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xfff1cf, fog: false, depthWrite: false, toneMapped: false }));
  moon.position.set(-70, 80, -170);
  moon.scale.set(40, 40, 1);
  scene.add(moon);
  const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xffffff, fog: false, depthWrite: false, toneMapped: false }));
  moonCore.position.copy(moon.position);
  moonCore.scale.set(12, 12, 1);
  scene.add(moonCore);

  // Mặt đất
  const outside = mesh(new THREE.PlaneGeometry(500, 500), lam("#1d2620"), 0, -0.02, 0);
  outside.rotation.x = -Math.PI / 2;
  scene.add(outside);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ map: stoneTexture() }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const path = mesh(new THREE.PlaneGeometry(4.5, 36), lam("#9a8f7c"), 0, 0.01, 7);
  path.rotation.x = -Math.PI / 2;
  scene.add(path);

  // Tường bao và tam quan
  const wallM = lam("#8a3a2a"), capM = lam("#2f4f48");
  const wall = (w, d, x, z) => {
    scene.add(box(w, 2.2, d, wallM, x, 1.1, z));
    scene.add(box(w + 0.4, 0.3, d + 0.4, capM, x, 2.35, z));
  };
  wall(60, 0.5, 0, -30);
  wall(0.5, 60, -30, 0);
  wall(0.5, 60, 30, 0);
  wall(26, 0.5, -17, 30);
  wall(26, 0.5, 17, 30);
  const gate = new THREE.Group();
  [-3.6, 3.6].forEach(x => {
    gate.add(cyl(0.35, 0.4, 5, lam("#a3201f"), x, 2.5, 0));
    gate.add(box(1.1, 0.5, 1.1, lam("#7d766b"), x, 0.25, 0));
  });
  gate.add(box(8.6, 0.5, 0.7, lam("#e7b75a"), 0, 4.9, 0));
  gate.add(hipRoof(10, 2.8, 1.4, new THREE.MeshLambertMaterial({ color: "#2f4f48", side: THREE.DoubleSide }), 0.3).translateY(5.1));
  const gb = boardMesh(boardTexture("ĐÌNH HOÀNG", { font: SERIF, size: 70 }), 3.2, 1);
  gb.position.set(0, 4.2, -0.4);
  gb.rotation.y = Math.PI;
  gate.add(gb);
  gate.position.set(0, 0, 30);
  scene.add(gate);

  // Bốn điện
  const halls = {};
  const tamThanh = makeHall({
    w: 14, d: 8, h: 4.6, wall: "#7a2a1e", roof: "#2c5a52", board: "三清殿", couplets: ["玉清上清", "太清福壽"],
    statues: [{ x: -2.2, robe: "#3b5ba5" }, { x: 0, robe: "#c9302c", halo: "#fff0b0" }, { x: 2.2, robe: "#2e7a5a" }].map(s => ({ ...s, beard: true }))
  });
  tamThanh.position.set(0, 0, -20);
  halls["tam-thanh"] = tamThanh;
  const taiThan = makeHall({
    w: 10, d: 7, h: 4, wall: "#7a3a14", roof: "#b8862a", trim: "#f2c14e", board: "財神殿", couplets: ["招財進寶", "金錢吉祥"],
    statues: [{ robe: "#c99a3e", skin: "#3a2a20", hat: "#1b1b1b" }], lantern: ["#ffb32c", "#a85a00"]
  });
  taiThan.position.set(21, 0, -2);
  taiThan.rotation.y = -Math.PI / 2;
  halls["tai-than"] = taiThan;
  const nguyetLao = makeHall({
    w: 10, d: 7, h: 4, wall: "#7a2034", roof: "#8e2a3a", trim: "#f29bb0", board: "月老殿", couplets: ["天作之合", "合歡吉祥"],
    statues: [{ robe: "#c8243a", beard: true, hat: "#8e2a3a", halo: "#ffc0d0" }], lantern: ["#ff7a9c", "#b02a4a"]
  });
  nguyetLao.position.set(-21, 0, -2);
  nguyetLao.rotation.y = Math.PI / 2;
  halls["nguyet-lao"] = nguyetLao;
  Object.entries(halls).forEach(([z, g]) => { g.userData.zone = z; scene.add(g); });

  const bagua = makeBagua();
  bagua.position.copy(BURNER["boc-dich"]);
  bagua.userData.zone = "boc-dich";
  scene.add(bagua);
  const stele = new THREE.Group();
  stele.add(box(1.6, 2.4, 0.4, lam("#6f6a62"), 0, 1.4, 0));
  stele.add(box(2, 0.3, 0.7, lam("#5c574f"), 0, 0.15, 0));
  const sb = boardMesh(boardTexture("卜易台", { w: 160, h: 480, vertical: true, size: 110, bg: "#2d3350", fg: "#d8c27a" }), 0.8, 2);
  sb.position.set(0, 1.45, 0.21);
  stele.add(sb);
  stele.position.set(5.6, 0, 8);
  stele.rotation.y = -Math.PI / 2;
  scene.add(stele);

  const burners = {};
  ["tam-thanh", "tai-than", "nguyet-lao"].forEach(z => {
    const b = makeBurner();
    b.position.copy(BURNER[z]);
    b.userData.zone = z;
    for (let i = 0; i < 3; i++) addStick(b);
    scene.add(b);
    burners[z] = b;
  });

  // Cây, đèn đá, dây đèn lồng
  const obstacles = [
    { x0: -8, x1: 8, z0: -25, z1: -15 },
    { x0: 16.5, x1: 26.5, z0: -8.5, z1: 4.5 },
    { x0: -26.5, x1: -16.5, z0: -8.5, z1: 4.5 },
    { x0: 5.1, x1: 6.1, z0: 6.9, z1: 9.1 }
  ];
  const circles = Object.values(BURNER).slice(0, 3).map(p => ({ x: p.x, z: p.z, r: 0.95 }));
  const place = (obj, x, z, r) => { obj.position.set(x, 0, z); scene.add(obj); if (r) circles.push({ x, z, r }); };
  [[-23, -22], [23, -22], [-25, 15], [25, 15], [-12, 22], [12, 22], [-25, -12], [25, -12]].forEach(([x, z]) => place(makeTree("pine"), x, z, 0.6));
  [[-9, -9], [9, -9], [-18, 18], [18, 18]].forEach(([x, z]) => place(makeTree("blossom"), x, z, 0.5));
  place(makeTree("tohong"), -15, 6.5, 0.5);
  place(makeTree("kimtien"), 15, 6.5, 0.5);
  [[-3.2, 14], [3.2, 14], [-3.2, 19], [3.2, 19], [-3.2, 24], [3.2, 24], [-6, -6], [6, -6]].forEach(([x, z]) => place(makeStoneLamp(), x, z, 0.4));
  const lanternLine = (a, b, count, colors) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.8;
      const l = makeLantern(...colors[i % colors.length]);
      l.position.copy(p);
      l.scale.setScalar(0.8);
      scene.add(l);
    }
    [a, b].forEach(p => scene.add(cyl(0.08, 0.1, p.y, lam("#4a3324"), p.x, p.y / 2, p.z, 6)));
  };
  lanternLine(V(-9, 5, 15.5), V(9, 5, 15.5), 9, [["#e0362c", "#b01a12"], ["#ffb32c", "#a85a00"]]);
  lanternLine(V(-10, 4.6, 2), V(-10, 4.6, -7), 5, [["#ff7a9c", "#b02a4a"]]);
  lanternLine(V(10, 4.6, 2), V(10, 4.6, -7), 5, [["#ffb32c", "#a85a00"]]);
  circles.push({ x: -9, z: 15.5, r: 0.3 }, { x: 9, z: 15.5, r: 0.3 }, { x: -10, z: 2, r: 0.3 }, { x: -10, z: -7, r: 0.3 }, { x: 10, z: 2, r: 0.3 }, { x: 10, z: -7, r: 0.3 });

  // Khói hương liên tục trên các lư
  const smokes = Object.entries(burners).map(([z, b]) => {
    const N = 26, arr = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { seed.push(Math.random()); arr.set([0, Math.random() * 3.2, 0], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ map: tex.smoke, size: 0.9, color: 0xdcd3cc, transparent: true, opacity: 0.22, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(b.position).setY(2.1);
    scene.add(pts);
    return { zone: z, pts, arr, seed, mat, boost: 0 };
  });

  // Cánh hoa rơi
  const PN = 160, parr = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) parr.set([(Math.random() - 0.5) * 56, Math.random() * 14, (Math.random() - 0.5) * 56], i * 3);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(parr, 3));
  scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ map: tex.petal, size: 0.28, transparent: true, depthWrite: false, opacity: 0.9 })));

  const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshBasicMaterial({ color: 0xf7d98b, transparent: true, opacity: 0, toneMapped: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.04;
  scene.add(marker);

  // ---------- Trạng thái nhân vật ----------
  let player = null, entered = false, paused = false;
  const pos = SPAWN.clone();
  let yaw = Math.PI, wantYaw = Math.PI, walkPhase = 0, target = null, stuck = 0, bowT = -1;
  let zone = "san", near = null;
  const keys = new Set(), joy = { x: 0, y: 0 };
  const camOff = V(0, 8.2, 12), camWant = V(), look = V(0, 2, -4), lookWant = V();
  const effects = [];
  const remotes = new Map();
  let spinBoost = 0;

  function fitCamera() {
    const a = W() / H();
    camera.aspect = a;
    camera.fov = a < 0.8 ? 62 : 55;
    camOff.set(0, a < 0.8 ? 10.5 : 8.2, a < 0.8 ? 14.5 : 12);
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  }
  fitCamera();
  addEventListener("resize", fitCamera);

  function collide(p) {
    p.x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, p.x));
    p.z = Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, p.z));
    for (const b of obstacles) {
      const cx = Math.min(b.x1, Math.max(b.x0, p.x)), cz = Math.min(b.z1, Math.max(b.z0, p.z));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < RADIUS) {
        if (d > 1e-4) { p.x = cx + dx / d * RADIUS; p.z = cz + dz / d * RADIUS; }
        else p.z = b.z1 + RADIUS;
      }
    }
    for (const c of circles) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + RADIUS;
      if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
    }
  }

  const angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  };

  function updatePlayer(dt) {
    let mx = 0, mz = 0;
    if (!paused) {
      mx = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0) + joy.x;
      mz = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0) + joy.y;
    }
    let len = Math.hypot(mx, mz);
    if (len > 0.12) {
      target = null;
      if (len > 1) { mx /= len; mz /= len; len = 1; }
    } else if (target && !paused) {
      const dx = target.x - pos.x, dz = target.z - pos.z, dd = Math.hypot(dx, dz);
      if (dd < 0.25) { target = null; len = 0; }
      else { mx = dx / dd; mz = dz / dd; len = 1; }
    } else len = 0;
    if (len > 0) {
      const ox = pos.x, oz = pos.z;
      pos.x += mx * SPEED * len * dt;
      pos.z += mz * SPEED * len * dt;
      collide(pos);
      wantYaw = Math.atan2(mx, mz);
      const moved = Math.hypot(pos.x - ox, pos.z - oz);
      if (target) { stuck = moved < SPEED * dt * 0.2 ? stuck + dt : 0; if (stuck > 0.35) { target = null; stuck = 0; } }
      walkPhase += dt * 10 * len;
    }
    yaw = angleLerp(yaw, wantYaw, 1 - Math.exp(-dt * 12));
    player.group.position.set(pos.x, 0, pos.z);
    player.group.rotation.y = yaw;
    player.body.position.y = len > 0 ? Math.abs(Math.sin(walkPhase)) * 0.08 : player.body.position.y * 0.8;
    if (bowT >= 0) {
      bowT += dt / 0.9;
      player.upper.rotation.x = Math.sin(Math.min(bowT, 1) * Math.PI) * 0.75;
      if (bowT >= 1) { bowT = -1; player.upper.rotation.x = 0; }
    }
    marker.material.opacity = target ? 0.5 + Math.sin(performance.now() / 150) * 0.2 : Math.max(0, marker.material.opacity - dt * 2);

    const z = zoneAt(pos.x, pos.z);
    if (z !== zone) { zone = z; hooks.onZone?.(z); }
    let n = null;
    for (const k in SPOT) if (pos.distanceTo(SPOT[k]) < ACT_R[k]) n = k;
    if (n !== near) { near = n; hooks.onNear?.(n); }
  }

  function updateCamera(dt, t) {
    if (!entered) {
      const a = t * 0.05;
      camera.position.set(Math.sin(a) * 34, 15, Math.cos(a) * 34 + 2);
      camera.lookAt(0, 2, -4);
      return;
    }
    gate.visible = camera.position.z < 27;
    const k = 1 - Math.exp(-dt * 3.5);
    camWant.copy(pos).add(camOff);
    camera.position.lerp(camWant, k);
    lookWant.set(pos.x, 1.3, pos.z - 2.5);
    look.lerp(lookWant, k);
    camera.lookAt(look);
  }

  function updateAmbient(dt, t) {
    for (const s of smokes) {
      s.boost = Math.max(0, s.boost - dt * 0.08);
      s.mat.opacity = 0.2 + s.boost * 0.35;
      for (let i = 0; i < s.seed.length; i++) {
        const j = i * 3;
        s.arr[j + 1] += dt * (0.5 + s.seed[i] * 0.4);
        s.arr[j] = Math.sin(t * 0.8 + s.seed[i] * 9) * 0.12 * s.arr[j + 1];
        s.arr[j + 2] = Math.cos(t * 0.6 + s.seed[i] * 7) * 0.1 * s.arr[j + 1];
        if (s.arr[j + 1] > 3.6) s.arr[j + 1] = 0;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
    for (let i = 0; i < PN; i++) {
      const j = i * 3;
      parr[j + 1] -= dt * 0.6;
      parr[j] += Math.sin(t + i) * dt * 0.3;
      if (parr[j + 1] < 0) parr[j + 1] = 14;
    }
    pgeo.attributes.position.needsUpdate = true;
    spinBoost = Math.max(0, spinBoost - dt * 0.4);
    bagua.userData.taiji.rotation.z += dt * (0.15 + spinBoost * 2.5);
    bagua.userData.ring.material.opacity = 0.2 + spinBoost * 0.6 + (zone === "boc-dich" ? 0.15 : 0);
    Object.values(halls).forEach((h, i) => { h.userData.light.intensity = 20 + Math.sin(t * 7 + i) * 2 + Math.sin(t * 13 + i * 2) * 1.5; });
    for (let i = effects.length - 1; i >= 0; i--) if (!effects[i](dt)) effects.splice(i, 1);
  }

  function updateRemotes(dt) {
    const now = performance.now(), k = 1 - Math.exp(-dt * 8);
    for (const [id, r] of remotes) {
      if (now - r.seen > 20000) { scene.remove(r.av.group); remotes.delete(id); continue; }
      const dx = r.tx - r.x, dz = r.tz - r.z, moving = Math.hypot(dx, dz) > 0.05;
      r.x += dx * k; r.z += dz * k;
      if (moving) r.ry = angleLerp(r.ry, Math.atan2(dx, dz), k);
      r.phase += moving ? dt * 10 : 0;
      r.av.group.position.set(r.x, 0, r.z);
      r.av.group.rotation.y = r.ry;
      r.av.body.position.y = moving ? Math.abs(Math.sin(r.phase)) * 0.08 : 0;
    }
  }

  // ---------- Hiệu ứng ----------
  function burst(z, kind) {
    const o = BURNER[z].clone().setY(z === "boc-dich" ? 0.8 : 1.6);
    const N = kind === "coin" ? 50 : 70;
    const arr = new Float32Array(N * 3), vel = [];
    for (let i = 0; i < N; i++) {
      arr.set([o.x + (Math.random() - 0.5) * 0.6, o.y, o.z + (Math.random() - 0.5) * 0.6], i * 3);
      vel.push(V((Math.random() - 0.5) * 3, 2.5 + Math.random() * 3.5, (Math.random() - 0.5) * 3));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const spark = kind === "spark" || kind === "blue";
    const mat = new THREE.PointsMaterial({
      map: kind === "coin" ? tex.coin : kind === "heart" ? tex.heart : tex.glow,
      size: kind === "coin" ? 0.42 : spark ? 0.3 : 0.36,
      color: kind === "blue" ? 0x9fc3ff : kind === "spark" ? 0xffe39a : 0xffffff,
      transparent: true, depthWrite: false, blending: spark ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    const grav = kind === "coin" ? 6 : kind === "heart" ? -0.4 : 1.2;
    let life = 0;
    effects.push(dt => {
      life += dt;
      for (let i = 0; i < N; i++) {
        const v = vel[i], j = i * 3;
        v.y -= grav * dt;
        v.multiplyScalar(1 - dt * 0.6);
        arr[j] += v.x * dt; arr[j + 1] = Math.max(0.05, arr[j + 1] + v.y * dt); arr[j + 2] += v.z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - Math.max(0, (life - 1.6) / 1.2);
      if (life > 2.8) { scene.remove(pts); geo.dispose(); mat.dispose(); return false; }
      return true;
    });
  }

  function pillar(z) {
    const o = BURNER[z];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(o.x, 8, o.z);
    scene.add(m);
    let life = 0;
    effects.push(dt => {
      life += dt;
      m.material.opacity = Math.sin(Math.min(life / 2.6, 1) * Math.PI) * 0.45;
      m.scale.x = m.scale.z = 1 + life * 0.15;
      if (life > 2.6) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      return true;
    });
  }

  // ---------- Chạm để đi ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V(0, 1, 0), 0), hit = V();
  const clickables = [...Object.values(halls), ...Object.values(burners), bagua];
  let down = null;
  renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down || !entered || paused) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 450;
    down = null;
    if (moved > 12 || !quick) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickables, true);
    let z = null;
    for (let o = hits[0]?.object; o && !z; o = o.parent) z = o.userData?.zone || null;
    if (z) target = SPOT[z].clone();
    else if (ray.ray.intersectPlane(plane, hit)) { target = hit.clone(); collide(target); }
    else return;
    stuck = 0;
    marker.position.set(target.x, 0.04, target.z);
    marker.material.opacity = 0.8;
  });

  const KEYMAP = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
  addEventListener("keydown", e => {
    const k = KEYMAP[e.code];
    if (!k || typing(e) || !entered || paused) return;
    keys.add(k);
    e.preventDefault();
  });
  addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());

  // ---------- Vòng lặp ----------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (player && entered) updatePlayer(dt);
    updateCamera(dt, t);
    updateAmbient(dt, t);
    updateRemotes(dt);
    renderer.render(scene, camera);
  });

  const faceYaw = z => Math.atan2(BURNER[z].x - pos.x, BURNER[z].z - pos.z);

  return {
    enter({ name, color }) {
      player = makeAvatar(color, name, tex);
      scene.add(player.group);
      pos.copy(SPAWN);
      yaw = wantYaw = Math.PI;
      entered = true;
      hooks.onZone?.(zone);
    },
    setPaused(p) { paused = p; if (p) { keys.clear(); target = null; } },
    setJoystick(x, y) { joy.x = x; joy.y = y; },
    teleport(z) {
      const s = SPOT[z] || SPAWN;
      pos.copy(s);
      if (z === "boc-dich") pos.z += 2.5;
      target = null;
      if (BURNER[z]) yaw = wantYaw = faceYaw(z);
      camera.position.copy(pos).add(camOff);
      look.set(pos.x, 1.3, pos.z - 2.5);
    },
    face(z) { if (BURNER[z]) wantYaw = faceYaw(z); },
    bow() { bowT = 0; },
    getState() { return { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), ry: +yaw.toFixed(2) }; },
    fx: {
      incense(z) {
        const b = burners[z];
        if (!b) return;
        for (let i = 0; i < 3; i++) addStick(b);
        const s = smokes.find(x => x.zone === z);
        if (s) s.boost = 1;
      },
      burst(z) {
        if (z === "tai-than") burst(z, "coin");
        else if (z === "nguyet-lao") burst(z, "heart");
        else if (z === "boc-dich") { burst(z, "blue"); spinBoost = 1; }
        else { burst(z, "spark"); pillar(z); }
      }
    },
    remote: {
      upsert(id, d) {
        let r = remotes.get(id);
        if (!r) {
          const av = makeAvatar(d.color || "#e7b75a", (d.name || "Thí chủ").slice(0, 20), tex);
          const x = Number.isFinite(d.x) ? d.x : SPAWN.x, z = Number.isFinite(d.z) ? d.z : SPAWN.z;
          r = { av, x, z, tx: x, tz: z, ry: d.ry || 0, phase: 0, seen: 0, color: d.color };
          scene.add(av.group);
          remotes.set(id, r);
        }
        if (d.name) r.av.setName(String(d.name).slice(0, 20));
        if (d.color && d.color !== r.color) { r.color = d.color; r.av.setColor(d.color); }
        if (Number.isFinite(d.x) && Number.isFinite(d.z)) {
          r.tx = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, d.x));
          r.tz = Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, d.z));
        }
        r.seen = performance.now();
      },
      remove(id) { const r = remotes.get(id); if (r) { scene.remove(r.av.group); remotes.delete(id); } },
      has(id) { return remotes.has(id); },
      count() { return remotes.size; }
    }
  };
}
