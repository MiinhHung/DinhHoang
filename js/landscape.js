// Địa hình theo bản phác thảo: cao nguyên lơ lửng trên biển mây, vách đá, thác nước, núi xa,
// lan can đá, ao sen, cờ âm dương, sân chạm hoa sen và đài Bốc Dịch. Toàn bộ dựng bằng hình khối.
import * as THREE from "three";
import { lam, mesh, box, cyl, ball, canvasTex, SERIF, hipRoof } from "./build.js";

// ---------- Kết cấu ----------
export function pavingTexture(unit = 4) {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#9c9080"; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const off = j % 2 ? s / 2 : 0;
      for (const dx of [0, -w]) {
        const v = 196 + Math.random() * 26 | 0;
        g.fillStyle = `rgb(${v},${v - 10},${v - 26})`;
        g.fillRect(i * s + off + dx + 3, j * s + 3, s - 6, s - 6);
      }
    }
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "60,40,20" : "255,255,255"},${Math.random() * 0.07})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / unit, 1 / unit);
  return t;
}

function rockTexture() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8a8378"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6 + Math.random() * 10) {
      const v = 110 + Math.random() * 50 | 0;
      g.fillStyle = `rgba(${v},${v - 6},${v - 16},.55)`;
      g.fillRect(0, y, w, 3 + Math.random() * 6);
    }
    for (let k = 0; k < 900; k++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 9, 1 / 9);
  return t;
}

function cloudTexture() {
  const t = canvasTex(256, 256, (g) => {
    for (let i = 0; i < 18; i++) {
      const x = 50 + Math.random() * 156, y = 90 + Math.random() * 80, r = 30 + Math.random() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(0.6, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
  return t;
}

// ---------- Cao nguyên ----------
// outline: các điểm [x, z] theo vòng; mặt trên ở y = 0, vách đá đổ xuống `depth`.
export function makePlateau(outline, depth = 26) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(Math.PI / 2);
  const top = new THREE.MeshLambertMaterial({ map: pavingTexture() });
  const side = new THREE.MeshLambertMaterial({ map: rockTexture(), color: "#f2ebe0", emissive: "#2a2622" });
  const m = new THREE.Mesh(geo, [top, side]);
  const g = new THREE.Group();
  g.add(m);
  // Chân núi thuôn dần xuống biển mây và vài tảng đá lồi ra ở mép vách.
  const rockM = new THREE.MeshLambertMaterial({ map: rockTexture(), color: "#a9a094" });
  const root = new THREE.Mesh(new THREE.CylinderGeometry(30, 9, 34, 9, 1), rockM);
  root.position.y = -depth - 16;
  g.add(root);
  outline.forEach(([x, z], i) => {
    if (i % 2) return;
    const r = 2.5 + Math.random() * 3;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM);
    rock.position.set(x * 0.97, -depth * (0.35 + Math.random() * 0.4), z * 0.97);
    rock.scale.set(1, 1.8, 1);
    g.add(rock);
  });
  return { group: g, top: m };
}

// Thảm cỏ thấp trên mặt sân (hình elip).
export function grassPatch(w, d, x, z) {
  const m = mesh(new THREE.CircleGeometry(1, 20), lam("#5f9a45"), x, 0.03, z);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w / 2, d / 2, 1);
  return m;
}

export function makeBush(r = 0.7, color = "#3f8a3a") {
  const g = new THREE.Group();
  const m = lam(color);
  [[0, r * 0.7, 0, r], [r * 0.7, r * 0.5, 0.2, r * 0.7], [-r * 0.6, r * 0.5, -0.1, r * 0.75]].forEach(([x, y, z, s]) => g.add(ball(s, m, x, y, z, 8)));
  return g;
}

// Cây tán tròn: xanh, vàng (cây kim tiền) hay hồng (anh đào).
export function makeRoundTree(color = "#3f7a3a", size = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.18 * size, 0.3 * size, 2.2 * size, lam("#5a3a24"), 0, 1.1 * size, 0, 7));
  const m = lam(color, color === "#f2c14e" ? "#3a2a00" : color === "#f4a6c0" ? "#40202c" : "#000000");
  [[0, 3, 0, 1.4], [0.9, 2.6, 0.3, 1], [-0.9, 2.7, -0.2, 1.05], [0.2, 3.6, -0.6, 0.9], [-0.3, 2.5, 0.9, 0.9]]
    .forEach(([x, y, z, r]) => g.add(ball(r * size, m, x * size, y * size, z * size, 10)));
  return g;
}

// ---------- Lan can đá ----------
// Cột và thanh ngang dựng bằng InstancedMesh để nhẹ máy dù chạy quanh cả cao nguyên.
export function makeBalustrade(points, { closed = true, step = 2, y = 0 } = {}) {
  const posts = [], rails = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = points[i], [bx, bz] = points[(i + 1) % points.length];
    const len = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++) posts.push([ax + (bx - ax) * j / k, az + (bz - az) * j / k]);
    rails.push([ax, az, bx, bz, len]);
  }
  if (!closed) posts.push(points[points.length - 1]);
  const stone = lam("#d9d2c4");
  const postM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), stone, posts.length);
  const capM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), stone, posts.length);
  const railM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.14, 0.18), stone, rails.length * 2);
  const o = new THREE.Object3D();
  posts.forEach(([x, z], i) => {
    o.position.set(x, y + 0.55, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); postM.setMatrixAt(i, o.matrix);
    o.position.y = y + 1.18; o.updateMatrix(); capM.setMatrixAt(i, o.matrix);
  });
  rails.forEach(([ax, az, bx, bz, len], i) => {
    o.rotation.set(0, -Math.atan2(bz - az, bx - ax), 0);
    o.scale.set(len, 1, 1);
    [0.95, 0.35].forEach((h, k) => { o.position.set((ax + bx) / 2, y + h, (az + bz) / 2); o.updateMatrix(); railM.setMatrixAt(i * 2 + k, o.matrix); });
  });
  const g = new THREE.Group();
  g.add(postM, capM, railM);
  return g;
}

// ---------- Biển mây, núi xa, thác nước ----------
export function makeClouds(scene) {
  const tex = cloudTexture();
  const puffs = [];
  const sea = mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: "#f4f2f8", emissive: "#3a3848" }), 0, -22, 0);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 });
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, r = 38 + Math.random() * 120;
    const s = new THREE.Sprite(mat);
    const size = 22 + Math.random() * 30;
    s.scale.set(size, size * 0.55, 1);
    s.position.set(Math.cos(a) * r, -16 + Math.random() * 12, Math.sin(a) * r);
    scene.add(s);
    puffs.push({ s, a, r, speed: 0.004 + Math.random() * 0.006 });
  }
  return dt => {
    for (const p of puffs) {
      p.a += p.speed * dt;
      p.s.position.x = Math.cos(p.a) * p.r;
      p.s.position.z = Math.sin(p.a) * p.r;
    }
  };
}

// Núi đá vôi tròn đầu, có mũ cây xanh, chân chìm trong mây.
export function makePeak(h, r) {
  const g = new THREE.Group();
  const prof = [[r, 0], [r * 0.92, h * 0.3], [r * 0.7, h * 0.6], [r * 0.55, h * 0.8], [r * 0.38, h * 0.93], [0.01, h]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 9), lam("#9aa0a8")));
  const green = lam("#4f8a4a");
  g.add(ball(r * 0.42, green, 0, h * 0.94, 0, 8));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + Math.random();
    g.add(ball(r * 0.25, green, Math.cos(a) * r * 0.55, h * (0.66 + Math.random() * 0.15), Math.sin(a) * r * 0.55, 7));
  }
  return g;
}

export function makeWaterfall(w, h) {
  const tex = canvasTex(64, 256, (g, cw, ch) => {
    g.fillStyle = "rgba(170,215,240,.55)"; g.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
      g.fillRect(Math.random() * cw, Math.random() * ch, 2 + Math.random() * 3, 20 + Math.random() * 60);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, h / 10);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
  m.position.y = -h / 2 + 0.05;
  const g = new THREE.Group();
  g.add(m);
  // Rãnh nước nhỏ chảy ra mép vách.
  const lip = mesh(new THREE.PlaneGeometry(w, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }), 0, 0.04, -1.2);
  lip.rotation.x = -Math.PI / 2;
  g.add(lip);
  return { group: g, update: dt => { tex.offset.y += dt * 0.9; } };
}

// ---------- Trang trí sân ----------
function taijiTexture(bg = "#b3242a") {
  return canvasTex(128, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 128, 256);
    g.strokeStyle = "#f2c14e"; g.lineWidth = 6; g.strokeRect(6, 6, 116, 244);
    const cx = 64, cy = 110, r = 40;
    g.fillStyle = "#f4ead6"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1b1730"; g.beginPath(); g.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); g.fill();
    g.beginPath(); g.arc(cx, cy - r / 2, r / 2, 0, Math.PI * 2); g.fillStyle = "#f4ead6"; g.fill();
    g.beginPath(); g.arc(cx, cy + r / 2, r / 2, 0, Math.PI * 2); g.fillStyle = "#1b1730"; g.fill();
    g.beginPath(); g.arc(cx, cy - r / 2, r / 7, 0, Math.PI * 2); g.fillStyle = "#1b1730"; g.fill();
    g.beginPath(); g.arc(cx, cy + r / 2, r / 7, 0, Math.PI * 2); g.fillStyle = "#f4ead6"; g.fill();
    g.fillStyle = "#f2c14e";
    for (let i = 0; i < 3; i++) g.fillRect(30, 180 + i * 18, 68, 8);
  });
}

// Cờ đỏ âm dương trên cột, phất nhẹ theo gió.
export function makeBanner() {
  const g = new THREE.Group();
  g.add(cyl(0.08, 0.1, 5.4, lam("#5a3a24"), 0, 2.7, 0, 6));
  g.add(ball(0.16, lam("#f2c14e", "#4a3000"), 0, 5.5, 0, 8));
  g.add(box(1.5, 0.08, 0.08, lam("#5a3a24"), 0.6, 5.1, 0));
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.8, 1, 6), new THREE.MeshLambertMaterial({ map: taijiTexture(), side: THREE.DoubleSide }));
  cloth.position.set(0.65, 3.65, 0);
  g.add(cloth);
  const base = cloth.geometry.attributes.position.array.slice();
  g.userData.wave = t => {
    const p = cloth.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = base[i * 3 + 1];
      p.array[i * 3 + 2] = Math.sin(t * 2.2 + y * 1.6) * 0.12 * (1.4 - y) / 2.8;
    }
    p.needsUpdate = true;
  };
  return g;
}

// Sân tròn chạm hoa sen ngay sau cổng.
export function makeMedallion(r = 4.2) {
  const tex = canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#cfc3ad"; g.fillRect(0, 0, w, w);
    g.strokeStyle = "#a89a82"; g.lineWidth = 8;
    [240, 200, 90].forEach(rr => { g.beginPath(); g.arc(c, c, rr, 0, Math.PI * 2); g.stroke(); });
    g.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      g.save(); g.translate(c, c); g.rotate(i * Math.PI / 6);
      g.beginPath(); g.moveTo(0, -90); g.quadraticCurveTo(46, -150, 0, -196); g.quadraticCurveTo(-46, -150, 0, -90); g.stroke();
      g.restore();
    }
    for (let i = 0; i < 24; i++) {
      g.save(); g.translate(c, c); g.rotate(i * Math.PI / 12);
      g.beginPath(); g.arc(0, -220, 9, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    g.beginPath(); g.arc(c, c, 40, 0, Math.PI * 2); g.stroke();
  });
  const m = mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshLambertMaterial({ map: tex }), 0, 0.04, 0);
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Đống thỏi vàng trước Tài Thần Điện.
export function makeIngots() {
  const g = new THREE.Group();
  const gold = lam("#f2c14e", "#5a3a00");
  const one = (x, y, z, ry) => {
    const i = new THREE.Group();
    i.add(box(0.7, 0.22, 0.38, gold, 0, 0.11, 0));
    i.add(ball(0.2, gold, 0, 0.26, 0, 8));
    [-1, 1].forEach(s => { const e = box(0.22, 0.2, 0.36, gold, s * 0.36, 0.22, 0); e.rotation.z = s * 0.5; i.add(e); });
    i.position.set(x, y, z); i.rotation.y = ry;
    g.add(i);
  };
  [[-0.5, 0, 0, 0.2], [0.4, 0, 0.2, -0.3], [0, 0, -0.45, 0.5], [-0.1, 0.3, 0, 0.1], [0.5, 0, -0.5, 1]].forEach(a => one(...a));
  return g;
}

// Đèn đá mái xanh ở góc ao.
export function makePavilionLamp() {
  const g = new THREE.Group();
  const s = lam("#d9d2c4");
  g.add(box(0.7, 0.3, 0.7, s, 0, 0.15, 0));
  g.add(box(0.3, 1.2, 0.3, s, 0, 0.9, 0));
  g.add(box(0.6, 0.55, 0.6, lam("#ffd98a", "#a86a10"), 0, 1.75, 0));
  g.add(hipRoof(1.2, 1.2, 0.55, lam("#2f4f8f"), 0.1).translateY(2.02));
  g.add(ball(0.08, lam("#f2c14e"), 0, 2.62, 0, 6));
  return g;
}

// Ao sen chữ nhật bo góc có lan can, lá sen và hoa sen; trả về group và bán kính hoa đăng trôi.
export function makePondRect(w, d) {
  const g = new THREE.Group();
  const s = new THREE.Shape(), r = 1.4, x0 = -w / 2, z0 = -d / 2;
  s.moveTo(x0 + r, z0); s.lineTo(x0 + w - r, z0); s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  s.lineTo(x0 + w, z0 + d - r); s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  s.lineTo(x0 + r, z0 + d); s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false }), lam("#cfc6b6"));
  rim.rotation.x = -Math.PI / 2;
  g.add(rim);
  const water = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshLambertMaterial({ color: "#3fa7a0", emissive: "#0b2a2a" }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.37;
  water.scale.set(0.9, 0.86, 1);
  g.add(water);
  const pad = lam("#3f8a3a");
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, rr = 0.8 + (i % 4) * 0.55;
    const p = mesh(new THREE.CircleGeometry(0.34, 12, 0.3, Math.PI * 2 - 0.3), pad, Math.cos(a) * rr * w / 6, 0.39, Math.sin(a) * rr * d / 7);
    p.rotation.x = -Math.PI / 2; p.rotation.z = a;
    g.add(p);
  }
  const petal = lam("#f6a9c0", "#3a0f1c");
  [[1.6, 0.8], [-1.8, 1], [-0.8, -1.4], [2.3, -1], [0.2, 1.6]].forEach(([x, z]) => {
    const f = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const c = mesh(new THREE.ConeGeometry(0.08, 0.26, 5), petal, Math.cos(k) * 0.09, 0.1, Math.sin(k) * 0.09);
      c.rotation.set(Math.sin(k) * 0.5, 0, -Math.cos(k) * 0.5);
      f.add(c);
    }
    f.add(ball(0.05, lam("#f2c14e", "#4a3000"), 0, 0.08, 0, 6));
    f.position.set(x, 0.39, z);
    g.add(f);
  });
  const hw = w / 2 + 0.3, hd = d / 2 + 0.3;
  g.add(makeBalustrade([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], { step: 1.6, y: 0.3 }));
  [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].forEach(([x, z]) => { const l = makePavilionLamp(); l.position.set(x, 0, z); g.add(l); });
  return g;
}

// Đài Bốc Dịch: bệ tròn cao, bậc thang phía nam, lan can quanh vành và đèn trên cột.
// shell: bệ đài dựng từ Blender; không có thì dựng bằng hình khối.
export function makeAltarPlatform(r, h, stairW, stairLen, shell) {
  const g = new THREE.Group();
  if (shell) { g.add(shell); return g; }
  const stone = lam("#d9d2c4");
  const body = mesh(new THREE.CylinderGeometry(r, r + 0.4, h, 40), lam("#bfb6a6"), 0, h / 2, 0);
  g.add(body);
  const top = mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ map: pavingTexture(3) }), 0, h + 0.01, 0);
  top.rotation.x = -Math.PI / 2;
  g.add(top);
  // Bậc thang: các bậc nhỏ từ mặt sân lên mặt đài.
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const sh = h * (i + 1) / steps, len = stairLen * (steps - i) / steps;
    g.add(box(stairW * 2, sh, len, stone, 0, sh / 2, r - 0.4 + len / 2));
  }
  // Lan can quanh vành, chừa lối bậc thang.
  const gap = Math.asin(Math.min(1, (stairW + 0.4) / (r - 0.3)));
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI / 2 + gap + (Math.PI * 2 - gap * 2) * i / 40;
    pts.push([Math.cos(a) * (r - 0.3), Math.sin(a) * (r - 0.3)]);
  }
  g.add(makeBalustrade(pts, { closed: false, step: 1.4, y: h }));
  [-1, 1].forEach(sx => g.add(makeBalustrade([[sx * (stairW + 0.2), r - 0.2], [sx * (stairW + 0.2), r + stairLen - 0.3]], { closed: false, step: 1.2, y: 0 })));
  return g;
}

// Bảng tên đỏ chữ vàng như trong bản phác thảo.
export function signTexture(text, { w = 768, h = 192, sub } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = "#8f1416"; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#c0282a"); gr.addColorStop(1, "#8a1214");
    g.fillStyle = gr; g.fillRect(14, 14, w - 28, h - 28);
    g.strokeStyle = "#f2c14e"; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = "#ffe08a"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(60,0,0,.6)"; g.shadowBlur = 6; g.shadowOffsetY = 3;
    g.font = `700 ${sub ? 76 : 88}px ${SERIF}`;
    g.fillText(text, w / 2, sub ? h / 2 - 18 : h / 2 + 4, w - 80);
    if (sub) { g.font = `600 40px ${SERIF}`; g.fillText(sub, w / 2, h / 2 + 50, w - 80); }
  });
}
export function makeSign(text, width = 4.8, opts = {}) {
  const tex = signTexture(text, opts);
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 0.09;
  g.add(face);
  g.add(box(width + 0.2, width / 4 + 0.2, 0.16, lam("#6a1010"), 0, 0, 0));
  [-1, 1].forEach(s => {
    const c = mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 12, Math.PI * 1.3), lam("#f2c14e", "#4a3000"), s * (width / 2 + 0.25), width / 8, 0);
    c.rotation.z = s > 0 ? -0.3 : Math.PI + 0.3;
    g.add(c);
  });
  return g;
}

// Tam quan "Đình Hoàng Online": cột đỏ, mái xanh đậm cong đầu đao, bảng tên cả hai mặt.
// shell: khung cổng dựng từ Blender; không có thì dựng bằng hình khối.
export function makeGate(shell) {
  const g = new THREE.Group();
  if (shell) g.add(shell);
  else buildGateFrame(g);
  [1, -1].forEach(side => {
    const sg = makeSign("Đình Hoàng Online", 4.6);
    sg.position.set(0, 4.35, side * 0.5);
    if (side < 0) sg.rotation.y = Math.PI;
    g.add(sg);
  });
  return g;
}

function buildGateFrame(g) {
  const red = lam("#b3242a"), gold = lam("#e7b75a", "#3a2508");
  [-3.6, 3.6].forEach(x => {
    g.add(cyl(0.38, 0.42, 5.2, red, x, 2.6, 0));
    g.add(box(1.2, 0.6, 1.2, lam("#cfc6b6"), x, 0.3, 0));
  });
  [-1.6, 1.6].forEach(x => g.add(cyl(0.2, 0.22, 3.6, red, x, 1.8, 0, 8)));
  g.add(box(8.8, 0.55, 0.8, gold, 0, 5.05, 0));
  g.add(box(3.4, 0.25, 0.4, red, 0, 3.6, 0));
  const roofM = new THREE.MeshLambertMaterial({ color: "#2a3560", side: THREE.DoubleSide });
  g.add(hipRoof(10.4, 3.2, 1.3, roofM, 0.35).translateY(5.3));
  g.add(box(6.2, 0.22, 0.32, gold, 0, 6.65, 0));
  [-1, 1].forEach(s => {
    const curl = mesh(new THREE.TorusGeometry(0.4, 0.09, 6, 12, Math.PI * 1.2), gold, s * 3.2, 6.95, 0);
    curl.rotation.z = s > 0 ? -0.2 : Math.PI + 0.2;
    g.add(curl);
    for (const sz of [-1, 1]) {
      const e = mesh(new THREE.ConeGeometry(0.14, 1.0, 6), gold, s * 5.2, 5.5, sz * 1.6);
      e.rotation.z = -s * 0.9; e.rotation.x = sz * 0.9;
      g.add(e);
    }
  });
}
