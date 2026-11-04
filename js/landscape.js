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

// ---------- Núi nhiều tầng ----------
// Mặt đất núi: lưới đỉnh lấy độ cao từ heightFn, tô màu cỏ ở chỗ thoải, đá ở chỗ dốc, đá xám ở chân núi.
export function makeTerrain(heightFn, { x0 = -120, x1 = 120, z0 = -160, z1 = 210, res = 2 } = {}) {
  const nx = Math.round((x1 - x0) / res), nz = Math.round((z1 - z0) / res);
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightFn(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const n = geo.attributes.normal, cols = new Float32Array(p.count * 3);
  const grass = new THREE.Color("#6fa64a"), grass2 = new THREE.Color("#4f8a3a"), rock = new THREE.Color("#9c958a"), deep = new THREE.Color("#7f8796"), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), up = n.getY(i), v = Math.sin(p.getX(i) * 0.37) * Math.sin(p.getZ(i) * 0.29);
    c.copy(grass).lerp(grass2, 0.5 + v * 0.5);
    c.lerp(rock, Math.min(1, Math.max(0, (0.86 - up) * 4)));
    c.lerp(deep, Math.min(1, Math.max(0, (-6 - y) / 18)));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

// Sân lát đá phủ mặt một tầng.
export function makeCourtyard(poly, y) {
  const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: pavingTexture() }));
  m.position.y = y + 0.04;
  return m;
}

// Bậc đá leo sườn núi, hai bên có thành đá bậc cấp và đèn đá ở chân, đầu bậc.
export function makeStairs({ x, hw, z0, y0, z1, y1 }) {
  const g = new THREE.Group();
  const len = Math.abs(z1 - z0), n = Math.max(2, Math.round(len / 0.5)), dir = Math.sign(z1 - z0);
  const stone = lam("#d6cebf"), edge = lam("#bdb4a4");
  const bottom = Math.min(y0, y1) - 6;
  for (let i = 0; i < n; i++) {
    const zc = z0 + dir * (i + 0.5) * len / n, top = y0 + (y1 - y0) * (i + 1) / n;
    g.add(box(hw * 2, top - bottom, len / n + 0.02, i % 2 ? stone : edge, x, (top + bottom) / 2, zc));
    [-1, 1].forEach(s => g.add(box(0.5, top - bottom + 0.9, len / n + 0.02, edge, x + s * (hw + 0.25), (top + bottom + 0.9) / 2, zc)));
  }
  return g;
}

// ---------- Nước chảy ----------
// Shader nước: vệt sóng mềm trôi theo dòng (nhiễu nhiều lớp), mép mờ dần vào bờ, mép có bọt nhẹ.
// Thác (fall) chảy nhanh, nhiều bọt trắng hơn. uLight theo giờ trong ngày để ban đêm nước tối lại.
const WATER_VS = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS = `
uniform float uTime, uSpeed, uFoam, uLight;
uniform vec3 uDeep, uShallow;
varying vec2 vUv;
#include <fog_pars_fragment>
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.0), f.x), f.y); }
float fbm(vec2 p) { return n(p) * 0.55 + n(p * 2.1 + 3.7) * 0.3 + n(p * 4.3 + 7.1) * 0.15; }
void main() {
  float side = min(vUv.x, 1.0 - vUv.x) * 2.0;
  vec2 p = vec2(vUv.x * 3.0, vUv.y - uTime * uSpeed);
  float flow = fbm(p * vec2(2.2, 1.1));
  float streak = smoothstep(0.58 - uFoam * 0.2, 0.85, fbm(p * vec2(5.0, 0.7) + flow));
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 0.8, side) * (0.6 + flow * 0.4));
  float foam = clamp(streak * (0.35 + uFoam) + (1.0 - smoothstep(0.0, 0.35, side)) * 0.35 * (0.5 + flow), 0.0, 1.0);
  col = mix(col, vec3(0.95, 0.98, 1.0), foam);
  gl_FragColor = vec4(col * uLight, smoothstep(0.0, 0.22, side) * (0.82 + foam * 0.18));
  #include <fog_fragment>
}`;
export function makeWaterMaterials() {
  const shared = { uTime: { value: 0 }, uLight: { value: 1 } };
  const make = (speed, foam, deep, shallow) => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSpeed: { value: speed }, uFoam: { value: foam }, uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) } }]),
    vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true
  });
  const stream = make(0.35, 0.08, "#2a96a0", "#9ee2e0"), fall = make(1.6, 0.75, "#5fb6cc", "#d8f2f6");
  [stream, fall].forEach(m => { m.uniforms.uTime = shared.uTime; m.uniforms.uLight = shared.uLight; });
  return { stream, fall, update: dt => { shared.uTime.value += dt; }, setLight: v => { shared.uLight.value = v; } };
}

// path: các điểm [x, y, z] dọc dòng chảy (từ nguồn xuống); width: bề rộng dòng nước; material: từ makeWaterMaterials.
export function makeWaterPath(path, width, material) {
  const pos = [], uv = [], idx = [];
  let acc = 0;
  path.forEach(([x, y, z], i) => {
    if (i) acc += Math.hypot(x - path[i - 1][0], y - path[i - 1][1], z - path[i - 1][2]);
    const [nx, , nz] = path[Math.min(i + 1, path.length - 1)], [px, , pz] = path[Math.max(i - 1, 0)];
    const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1;
    const ox = -dz / l * width / 2, oz = dx / l * width / 2;
    pos.push(x - ox, y, z - oz, x + ox, y, z + oz);
    uv.push(0, acc / 6, 1, acc / 6);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.renderOrder = 2;
  return m;
}

// Bờ kè đá hai bên lòng suối chạy dọc trục z, chừa chỗ cho cầu và ao.
export function makeBanks(x, z0, z1, y, halfW) {
  const g = new THREE.Group();
  const stone = lam("#bdb4a4"), cap = lam("#d6cebf");
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
  [-1, 1].forEach(s => {
    g.add(box(0.5, 0.55, len, stone, x + s * (halfW + 0.25), y + 0.2, zc));
    g.add(box(0.62, 0.1, len, cap, x + s * (halfW + 0.25), y + 0.5, zc));
  });
  // Lòng suối tối màu bên dưới mặt nước cho có chiều sâu.
  const bed = mesh(new THREE.PlaneGeometry(halfW * 2, len), lam("#2c4a48"), x, y + 0.1, zc);
  bed.rotation.x = -Math.PI / 2;
  g.add(bed);
  return g;
}

// Đá tảng rải hai bên thác.
export function makeRock(r) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lam(Math.random() < 0.5 ? "#8f8a82" : "#a39d93"));
  m.scale.set(1, 0.7 + Math.random() * 0.4, 1);
  m.rotation.set(Math.random(), Math.random() * 3, Math.random());
  return m;
}

// Bọt nước trắng ở chân thác.
export function makeFoam(glowTex, x, y, z, r = 2) {
  const n = 24, arr = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { seed.push(Math.random()); arr.set([x, y, z], i * 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, size: 1.1, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  return {
    points: pts,
    update: t => {
      for (let i = 0; i < n; i++) {
        const k = (t * 0.6 + seed[i]) % 1, a = seed[i] * 40;
        arr.set([x + Math.cos(a) * r * k, y + Math.sin(k * Math.PI) * 1.2, z + Math.sin(a) * r * k * 0.6], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}

// Cầu vòm bán nguyệt: thân đá liền khối khoét lỗ vòm tròn cho nước chảy qua, mặt cầu gồ cao theo deckY,
// bậc đá ngang trên mặt cầu, lan can trụ nụ sen chạy theo dáng cong. Nhịp cầu theo trục x, rộng theo z.
export function makeMoonBridge(len, width, deckY, archR = 1.45) {
  const g = new THREE.Group();
  const base = -0.4, n = 32;
  const s = new THREE.Shape();
  s.moveTo(-len / 2, base);
  for (let i = 0; i <= n; i++) { const x = -len / 2 + len * i / n; s.lineTo(x, deckY(x)); }
  s.lineTo(len / 2, base);
  s.lineTo(archR, base);
  s.absarc(0, base, archR, 0, Math.PI, false);
  s.lineTo(-len / 2, base);
  const geo = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -width / 2);
  g.add(new THREE.Mesh(geo, lam("#d8d0c1")));
  // Viền đá sẫm quanh miệng vòm hai mặt cầu.
  [-1, 1].forEach(sz => {
    const rim = new THREE.Mesh(new THREE.RingGeometry(archR, archR + 0.28, 32, 1, 0, Math.PI), lam("#a89f90"));
    rim.position.set(0, base, sz * (width / 2 + 0.01));
    if (sz < 0) rim.rotation.y = Math.PI;
    g.add(rim);
  });
  // Bậc đá ngang trên mặt cầu.
  const stepM = lam("#c4bbab");
  for (let x = -len / 2 + 0.35; x < len / 2 - 0.2; x += 0.55) {
    const slope = Math.atan2(deckY(x + 0.05) - deckY(x - 0.05), 0.1);
    const st = box(0.12, 0.05, width - 0.5, stepM, x, deckY(x) + 0.02, 0);
    st.rotation.z = slope;
    g.add(st);
  }
  // Lan can: trụ nụ sen theo dáng cong, thanh vịn nghiêng theo độ dốc.
  const post = lam("#e2dbcd"), bud = lam("#f0c8d2");
  [-1, 1].forEach(sz => {
    const z = sz * (width / 2 - 0.15), xs = [];
    for (let i = 0; i <= 8; i++) xs.push(-len / 2 + 0.3 + (len - 0.6) * i / 8);
    xs.forEach((x, i) => {
      const end = i === 0 || i === xs.length - 1;
      g.add(box(end ? 0.36 : 0.24, end ? 1.05 : 0.85, end ? 0.36 : 0.24, post, x, deckY(x) + (end ? 0.52 : 0.42), z));
      g.add(ball(end ? 0.2 : 0.14, bud, x, deckY(x) + (end ? 1.12 : 0.92), z, 8));
      if (i) {
        const x0 = xs[i - 1], y0 = deckY(x0) + 0.72, y1 = deckY(x) + 0.72;
        const rail = box(Math.hypot(x - x0, y1 - y0), 0.1, 0.14, post, (x + x0) / 2, (y0 + y1) / 2, z);
        rail.rotation.z = Math.atan2(y1 - y0, x - x0);
        g.add(rail);
        const panel = box(Math.hypot(x - x0, y1 - y0) - 0.2, 0.32, 0.08, lam("#cfc6b6"), (x + x0) / 2, (y0 + y1) / 2 - 0.36, z);
        panel.rotation.z = rail.rotation.z;
        g.add(panel);
      }
    });
  });
  return g;
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
