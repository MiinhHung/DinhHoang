// Cảnh 3D của đình: sân, bốn điện, nhân vật, người chơi khác và hiệu ứng. Toàn bộ dựng bằng hình khối, không cần file mô hình.
import * as THREE from "three";
import { V, lam, mesh, box, cyl, ball, canvasTex, roundRect, HAN, SERIF, boardTexture, boardMesh, hipRoof } from "./build.js";
import {
  grassPatch, makeBush, makeRoundTree, makeBalustrade, makeClouds, makePeak, makeTerrain, makeCourtyard, makeStairs,
  makeWaterPath, makeWaterMaterials, makeStreamBanks, makeBoulders, makeCrag, terrainMaterial, makeNaturalPond, makeGardenBed, makeRockField, makeMist, makeFoam, makeMoonBridge, makeBanner, makeMedallion, makeIngots, makePondRect, makeAltarPlatform, makeSign, makeGate, makePavilionLamp, makeStoneLantern, makeFence, stoneBenchGeometry, makeTeaPavilion
} from "./landscape.js";
import {
  LEVELS, STAIRS, HALL, ALTAR, WATER, POND, BRIDGE, bridgeDeckY, BRIDGE2, bridge2DeckY, BRIDGE3, bridge3DeckY, chuteY, TEA, BIG_TREE, GATE_Z, SPAWN as SPAWN_XZ, hallFloor, altarBase,
  terrainY, heightAt, walkable, canStep, hallObstacles, interiorColumns, hallInterior, inPoly
} from "./map.js";
import { makeNight } from "./night.js";
import { makeKoiPonds, makeCranes, makeSummitClouds } from "./life.js";

export const ZONES = {
  san: { name: "Sân Đình", han: "", sub: "" },
  "tam-thanh": { name: "Tam Thanh Điện", han: "三清殿", sub: "Chính điện · thắp nén tâm hương", act: "Thắp hương" },
  "tai-than": { name: "Tài Thần Điện", han: "財神殿", sub: "Triệu Công Minh · cầu tài lộc", act: "Xin quẻ Tài Thần" },
  "nguyet-lao": { name: "Nguyệt Lão Điện", han: "月老殿 · 合歡宮", sub: "Hợp Hoan Cung · cầu duyên", act: "Rút xăm Nguyệt Lão" },
  "boc-dich": { name: "Bốc Dịch Đài", han: "卜易台", sub: "Gieo quẻ Kinh Dịch", act: "Gieo quẻ" },
  // Các điểm nhỏ trong sân: không có biển tên lớn, chỉ hiện nút khi đứng gần.
  "dao-si": { name: "Lão Đạo Sĩ", act: "Hỏi chuyện Lão Đạo Sĩ", prop: true },
  chuong: { name: "Lầu Chuông", act: "Thỉnh chuông", prop: true },
  "ao-sen": { name: "Ao Sen", act: "Thả hoa đăng", prop: true },
  "to-hong": { name: "Cây Tơ Hồng", act: "Buộc tơ hồng", prop: true },
  "kim-tien": { name: "Cây Kim Tiền", act: "Hái lộc", prop: true },
  "tra-dinh": { name: "Trà Đình Định Tâm", act: "Ngồi uống trà", prop: true }
};

// ---------- Vị trí trên bản đồ núi (xem js/map.js) ----------
// Nghi lễ ở ba điện diễn ra bên trong điện, trước lư hương đặt giữa hai hàng cột.
const inHall = (k, dz) => V(HALL[k].x, 0, HALL[k].z + dz);
const BURNER = {
  "tam-thanh": inHall("tam-thanh", 0), "tai-than": inHall("tai-than", 1), "nguyet-lao": inHall("nguyet-lao", 1),
  "boc-dich": V(ALTAR.x, 0, ALTAR.z)
};
const SPOT = {
  "tam-thanh": inHall("tam-thanh", 3.6), "tai-than": inHall("tai-than", 4), "nguyet-lao": inHall("nguyet-lao", 4),
  "boc-dich": V(ALTAR.x, 0, ALTAR.z + 5.2),
  "dao-si": V(3.4, 0, 119.6), chuong: V(27, 0, 116), "ao-sen": V(POND.x, 0, POND.z + POND.d / 2 + 1.7),
  "to-hong": V(36, 0, 62.6), "kim-tien": V(-36, 0, 62.6), "tra-dinh": V(27.1, 0, 90.5)
};
const PROP = { "dao-si": V(5, 0, 118), chuong: V(27, 0, 112), "ao-sen": V(POND.x, 0, POND.z), "to-hong": V(38, 0, 60), "kim-tien": V(-38, 0, 60), "tra-dinh": V(28, 0, 90.5) };
// Chỗ nhân vật quay mặt về khi làm nghi lễ ở mỗi điểm.
const FOCUS = { ...BURNER, ...PROP };
const ACT_R = { "tam-thanh": 3.2, "tai-than": 3, "nguyet-lao": 3, "boc-dich": 4.2, "dao-si": 2.8, chuong: 2.3, "ao-sen": 2.3, "to-hong": 2, "kim-tien": 2, "tra-dinh": 2.4 };
const POND_R = 2.6;
const HOA_DANG = { sen: ["#f59ab5", "#5a1626"], vang: ["#f2c14e", "#5a3a00"], trang: ["#f3ecd8", "#3a3428"] };
const SPAWN = V(SPAWN_XZ.x, 0, SPAWN_XZ.z);
const SPEED = 5.6, RADIUS = 0.45;
const groundY = (x, z) => { const h = heightAt(x, z); return Number.isNaN(h) ? terrainY(x, z) : h; };

function zoneAt(x, z) {
  if (z < -50) return "boc-dich";
  if (z < 12) return "tam-thanh";
  if (z < 74 && x < -14) return "tai-than";
  if (z < 74 && x > 16) return "nguyet-lao";
  return "san";
}

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
    g.fillStyle = "#ffffff";
    g.beginPath(); g.ellipse(16, 16, 12, 7, 0.6, 0, Math.PI * 2); g.fill();
  });
  const shadow = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  return { glow, smoke, heart, coin, petal, shadow };
}

// ---------- Công trình ----------
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

// Điện đi vào được: nền cao `base`, tường ba mặt, tường cửa phía trước chừa lối giữa rộng 2 × door,
// hiên cột ngoài, hai hàng cột trong, bệ thờ ở cuối điện, trần cao.
// shell: phần kiến trúc và nội thất dựng sẵn từ Blender (kể cả tượng); không có thì dựng khung hình khối đơn giản.
function makeHall({ w, d, h, base, door, cols, wall, roof, trim = "#e7b75a", board, couplets, statues = [], lantern, sign, signSub, shell }) {
  const g = new THREE.Group();
  const top = base;
  const ry = top + h + 0.6;
  const frontZ = d / 2;
  const n = cols || Math.max(4, Math.round(w / 3.4) + 1);
  const colX = Array.from({ length: n }, (_, i) => -w / 2 + 0.3 + (w - 0.6) * i / (n - 1));
  const daisH = w > 20 ? 1.4 : 1.0, daisD = d * 0.3;
  if (shell) g.add(shell);
  else buildHallFrame(g, { w, d, h, top, ry, wall, roof, trim, colX, door, daisH, daisD });

  // Hoành phi chữ Hán trên cửa chính, câu đối trên hai cột hiên hai bên cửa.
  if (board) {
    const b = boardMesh(boardTexture(board), w > 20 ? 4.4 : 3.2, w > 20 ? 1.375 : 1);
    b.position.set(0, top + h - 1.1, frontZ - 0.42);
    g.add(b);
  }
  // Bảng tên tiếng Việt lớn trên mái, nhìn từ xa như bản phác thảo.
  if (sign) {
    const sg = makeSign(sign, Math.min(7.2, w * 0.42), signSub ? { sub: signSub } : {});
    sg.position.set(0, ry + 2.6, d * 0.3 + 2);
    sg.rotation.x = -0.12;
    g.add(sg);
  }
  if (couplets) {
    const cx = colX.filter(x => Math.abs(x) > door * 0.6).sort((a, b) => Math.abs(a) - Math.abs(b));
    [Math.min(...cx.slice(0, 2)), Math.max(...cx.slice(0, 2))].forEach((x, i) => {
      const c = boardMesh(boardTexture(couplets[i], { w: 128, h: 512, vertical: true, size: 84 }), 0.55, h * 0.6);
      c.position.set(x, top + h * 0.5, frontZ + 0.9 + 0.3);
      g.add(c);
    });
  }

  // Bàn thờ trước bệ, nến; tượng (khi chưa có mô hình Blender).
  const altarZ = -d / 2 + daisD + 0.9;
  g.add(box(Math.min(w * 0.4, 7), 1, 1.2, lam("#5c1f14"), 0, top + 0.5, altarZ));
  g.add(box(Math.min(w * 0.4, 7) + 0.1, 0.6, 0.05, lam("#d4a03c", "#3a2508"), 0, top + 0.6, altarZ + 0.62));
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false });
  [-1, 1].forEach(s => {
    g.add(cyl(0.08, 0.08, 0.5, lam("#f3e6c8"), s * 1.5, top + 1.25, altarZ, 8));
    g.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 6), flameM, s * 1.5, top + 1.6, altarZ));
  });
  if (!shell) {
    const sc = w > 20 ? 1.9 : 1.45;
    statues.forEach(s => {
      const st = makeStatue(s);
      st.scale.setScalar(sc);
      st.position.set((s.x || 0) * sc, top + daisH, -d / 2 + daisD * 0.5);
      g.add(st);
    });
  }
  // Ánh nến ấm trong điện: một đèn trước bệ thờ, một đèn giữa gian.
  const light = new THREE.PointLight(0xffb066, w > 20 ? 60 : 34, w > 20 ? 22 : 15, 2);
  light.position.set(0, top + h * 0.55, altarZ + 1.2);
  g.add(light);
  const fill = new THREE.PointLight(0xffc890, w > 20 ? 30 : 18, w > 20 ? 20 : 13, 2);
  fill.position.set(0, top + h * 0.7, d * 0.15);
  g.add(fill);
  g.userData.light = light;

  const lc = lantern || ["#e0362c", "#b01a12"];
  [-1, 1].forEach(s => {
    const lx = s * (door + 1.6);
    const l = makeLantern(lc[0], lc[1]);
    l.scale.setScalar(w > 20 ? 1.4 : 1.1);
    l.position.set(lx, top + h - 1.2, frontZ + 1.4);
    g.add(l);
    g.add(cyl(0.012, 0.012, 0.9, lam("#222"), lx, top + h - 0.3, frontZ + 1.4, 4));
  });
  return g;
}

// Khung điện bằng hình khối đơn giản, dùng khi chưa có (hoặc không tải được) mô hình Blender.
function buildHallFrame(g, { w, d, h, top, ry, wall, roof, trim, colX, door, daisH, daisD }) {
  const stone = lam("#cfc6b6");
  g.add(box(w + 3, top, d + 3, stone, 0, top / 2, 0));
  g.add(box(w * 0.5, top * 0.5, 2, stone, 0, top * 0.25, d / 2 + 2.5));
  g.add(box(w, 0.04, d, lam("#6b3a22"), 0, top + 0.02, 0));
  const wallM = lam(wall);
  g.add(box(w, h, 0.4, wallM, 0, top + h / 2, -d / 2));
  g.add(box(0.4, h, d, wallM, -w / 2, top + h / 2, 0));
  g.add(box(0.4, h, d, wallM, w / 2, top + h / 2, 0));
  [-1, 1].forEach(s => {
    const len = w / 2 - door;
    g.add(box(len, h, 0.3, lam("#a3201f"), s * (door + len / 2), top + h / 2, d / 2 - 0.6));
  });
  g.add(box(door * 2, h * 0.22, 0.3, lam(trim), 0, top + h - h * 0.11, d / 2 - 0.6));
  colX.forEach(x => g.add(cyl(0.26, 0.3, h, lam("#a3201f"), x, top + h / 2, d / 2 + 0.9)));
  interiorColumnsLocal(w, d, door).forEach(([x, z]) => g.add(cyl(w > 20 ? 0.5 : 0.36, w > 20 ? 0.56 : 0.4, h, lam("#a3201f"), x, top + h / 2, z)));
  g.add(box(w, 0.3, d, lam("#5a2018"), 0, top + h + 0.45, 0));
  g.add(box(w * 0.64, daisH, daisD, lam("#8a6a4a"), 0, top + daisH / 2, -d / 2 + daisD / 2 + 0.2));
  g.add(box(w + 0.6, 0.45, 0.5, lam(trim), 0, top + h + 0.2, d / 2 + 0.9));
  const roofM = new THREE.MeshLambertMaterial({ color: roof, side: THREE.DoubleSide });
  g.add(hipRoof(w + 4.6, d + 4.6, 1.8, roofM, 0.62).translateY(ry));
  g.add(box(w * 0.66, 1.4, d * 0.6, wallM, 0, ry + 2.3, 0));
  g.add(hipRoof(w * 0.66 + 2.4, d * 0.6 + 2.4, 2, roofM, 0.12).translateY(ry + 2.9));
  const ridgeY = ry + 2.9 + 2;
  g.add(box(w * 0.5, 0.22, 0.3, lam(trim), 0, ridgeY, 0));
  g.add(ball(0.32, lam("#ffd36b", "#7a4a00"), 0, ridgeY + 0.38, 0));
  [-1, 1].forEach(s => {
    const curl = mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12, Math.PI * 1.2), lam(trim), s * w * 0.25, ridgeY + 0.3, 0);
    curl.rotation.z = s > 0 ? -0.2 : Math.PI + 0.2;
    g.add(curl);
  });
  // Đầu đao cong vút ở bốn góc mái dưới.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(0.14, 1.0, 6), lam(trim), sx * (w + 4.6) / 2, ry + 0.25, sz * (d + 4.6) / 2);
    e.rotation.z = -sx * 0.9;
    e.rotation.x = sz * 0.9;
    g.add(e);
  }
}
// Cột trong điện theo toạ độ của điện (khớp với interiorColumns trong js/map.js).
function interiorColumnsLocal(w, d, door) {
  const xs = w > 20 ? [-door, door, -w * 0.36, w * 0.36] : [-door, door];
  const zs = w > 20 ? [-0.18, 0.12] : [0.0];
  return xs.flatMap(x => zs.map(z => [x, z * d]));
}

// Ảnh texture lặp (Poly Haven, CC0; nguồn ghi trong tools/blender/prep_textures.py).
const texLoader = new THREE.TextureLoader();
function loadTexture(url, repeat = 1) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

// ---------- Mô hình dựng từ Blender ----------
// Tải các file .glb trong assets/models (nén Draco). Thiếu file hay lỗi mạng thì trả về null để dùng khung đơn giản.
const MODELS = Object.fromEntries(["gate", "chuong", "boc-dich", "tam-thanh", "tai-than", "nguyet-lao", "cay-da"].map(k => [k, `assets/models/${k}.glb`]));
async function loadModels() {
  let GLTFLoader, DRACOLoader;
  try {
    ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
    ({ DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js"));
  } catch (e) { console.warn("Không tải được GLTFLoader", e); return {}; }
  const draco = new DRACOLoader().setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const out = {};
  const plainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const roofMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: loadTexture("assets/textures/roof_tiles.jpg") });
  await Promise.all(Object.entries(MODELS).map(async ([k, url]) => {
    try {
      const gltf = await loader.loadAsync(url);
      // Màu và bóng đổ đã bake vào màu đỉnh; dùng Lambert cho đồng bộ ánh sáng ngày/đêm với phần còn lại.
      // Mặt mái ("roof_tiles") phủ thêm ảnh ngói Poly Haven, nhân với màu mái và bóng đổ đã bake.
      gltf.scene.traverse(o => { if (o.isMesh) o.material = o.material?.name === "roof_tiles" ? roofMat : plainMat; });
      out[k] = gltf.scene;
    } catch (e) { console.warn(`Không tải được ${url}, dùng khung đơn giản.`, e); }
  }));
  draco.dispose();
  return out;
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

// Đèn đá xám dọc lối đi và đầu các bậc thang.
const makeStoneLamp = () => makeStoneLantern({ scale: 1.05 });

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

// Nhân vật có khớp: hông, đùi, gối, vai, khuỷu, cổ. poseAvatar() đặt tư thế mỗi khung hình (đi, đứng thở,
// ngồi ghế, ngồi xếp bằng, rót trà, nâng chén, hít thở, vái).
function makeAvatar(color, name, tex) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const robe = lam(color), skin = lam("#f1c9a0"), dark = lam("#1d1612"), pant = lam("#3a3430"), shoe = lam("#2a2420");
  const robeMeshes = [];
  const R = m => (robeMeshes.push(m), m);
  // Hông (gốc của thân trên và hai chân).
  const hips = new THREE.Group();
  hips.position.y = 0.62;
  body.add(hips);
  const skirt = R(cyl(0.34, 0.48, 0.46, robe, 0, -0.23, 0, 14));
  const skirtPivot = new THREE.Group();
  skirtPivot.add(skirt);
  hips.add(skirtPivot);
  hips.add(R(cyl(0.3, 0.35, 0.5, robe, 0, 0.25, 0, 14)));
  hips.add(cyl(0.32, 0.32, 0.1, lam("#e7b75a"), 0, 0.5, 0, 14));
  const legs = [-1, 1].map(side => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.13, 0, 0);
    thigh.rotation.order = "YXZ";
    thigh.add(cyl(0.085, 0.095, 0.33, pant, 0, -0.165, 0, 8));
    const knee = new THREE.Group();
    knee.position.y = -0.33;
    knee.add(cyl(0.07, 0.085, 0.27, pant, 0, -0.135, 0, 8));
    knee.add(box(0.13, 0.08, 0.25, shoe, 0, -0.29, 0.05));
    thigh.add(knee);
    hips.add(thigh);
    return { side, thigh, knee };
  });
  // Thân trên, cổ và đầu.
  const upper = new THREE.Group();
  upper.position.y = 0.53;
  hips.add(upper);
  upper.add(R(cyl(0.24, 0.3, 0.5, robe, 0, 0.25, 0, 14)));
  const head = new THREE.Group();
  head.position.y = 0.52;
  upper.add(head);
  head.add(ball(0.24, skin, 0, 0.2, 0));
  const hair = ball(0.255, dark, 0, 0.25, -0.03);
  hair.scale.set(1, 0.85, 1);
  head.add(hair);
  head.add(ball(0.11, dark, 0, 0.46, -0.08, 8));
  [-1, 1].forEach(s => head.add(ball(0.03, dark, s * 0.08, 0.22, 0.215, 6)));
  // Tay: vai → ống tay trên → khuỷu → ống tay áo rộng → bàn tay.
  const arms = [-1, 1].map(side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.3, 0.42, 0.02);
    shoulder.add(R(cyl(0.085, 0.12, 0.32, robe, 0, -0.16, 0, 8)));
    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    elbow.add(R(cyl(0.11, 0.17, 0.3, robe, 0, -0.15, 0, 8)));
    const hand = ball(0.065, skin, 0, -0.33, 0.01, 8);
    elbow.add(hand);
    shoulder.add(elbow);
    upper.add(shoulder);
    return { side, shoulder, elbow, hand };
  });
  // Chén trà cầm tay phải (chỉ hiện khi ngồi uống trà).
  const cup = cyl(0.055, 0.04, 0.08, lam("#f2ece0"), 0, -0.36, 0.08, 10);
  cup.visible = false;
  arms[1].elbow.add(cup);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: tex.shadow, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  group.add(sh);
  let label = makeLabel(name);
  group.add(label);
  return {
    group, body, hips, upper, head, legs, arms, skirtPivot, cup, name,
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
      robeMeshes.forEach(x => (x.material = m));
    }
  };
}

// p: { speed 0–1, phase (nhịp bước), sit 0–1, seat (độ cao mặt ngồi so với đất), cross 0–1 (xếp bằng),
//      pour 0–1, sip 0–1, breath −1–1 (thở ra → hít vào), bow 0–1 }, t: thời gian (giây).
const mix = (a, b, k) => a + (b - a) * k;
function poseAvatar(av, p, t) {
  const s = p.speed || 0, ph = p.phase || 0, sit = p.sit || 0, cross = p.cross || 0, walk = s * (1 - sit);
  const sw = Math.sin(ph);
  const idleBreath = Math.sin(t * 1.7) * 0.5 * (1 - walk);
  const br = p.breath ?? idleBreath;
  // Ngồi: hạ hông xuống ngang mặt ghế; đi: nhún theo bước.
  const hipH = (p.seat ?? 0.42) + 0.06;
  av.body.position.y = mix(Math.abs(Math.cos(ph)) * 0.05 * walk, hipH - 0.62, sit);
  av.hips.rotation.z = Math.sin(ph) * 0.04 * walk;
  // Vạt áo đung đưa theo bước; khi ngồi thì xếp gọn lại phủ lên đùi.
  av.skirtPivot.rotation.x = mix(Math.sin(ph * 2) * 0.05 * walk, -0.42, sit);
  av.skirtPivot.scale.set(1, mix(1, 0.62, sit), mix(1, 1.1, sit));
  av.legs.forEach(L => {
    const k = L.side < 0 ? 1 : -1, swing = sw * 0.6 * walk * k;
    const lift = Math.max(0, Math.sin(ph + (k > 0 ? 0 : Math.PI))) * 0.75 * walk;
    L.thigh.rotation.x = mix(-swing, -1.48, sit);
    L.thigh.rotation.y = L.side * 0.55 * sit * cross;
    L.knee.rotation.x = mix(lift, 1.5 * (1 - cross), sit);
    L.knee.rotation.z = -L.side * 2.45 * sit * cross;
  });
  // Thân trên: hơi nghiêng tới khi đi, vái, phồng nhẹ theo hơi thở.
  av.upper.rotation.x = 0.07 * walk + (p.bow || 0) * 0.75 + (p.pour || 0) * 0.18;
  av.upper.scale.set(1 + br * 0.025, 1 + br * 0.02, 1 + br * 0.03);
  av.head.rotation.x = -br * 0.08 * (p.breath != null ? 1 : 0.3) + (p.sip || 0) * -0.25;
  av.head.rotation.y = Math.sin(t * 0.37) * 0.12 * (1 - walk) * (1 - (p.pour || 0));
  av.arms.forEach(A => {
    const k = A.side < 0 ? -1 : 1, swing = sw * 0.5 * walk * k;
    // Ngồi: tay đặt trên đùi. Rót trà: hai tay đưa ra trước. Nâng chén (tay phải) lên miệng.
    let sx = mix(swing, -0.55, sit), ex = mix(-0.15 * walk - 0.08, -0.75, sit), sz = A.side * (0.12 + 0.06 * br);
    const pour = p.pour || 0;
    sx = mix(sx, -1.0, pour); ex = mix(ex, -0.5, pour); sz = mix(sz, -A.side * 0.25, pour);
    if (A.side > 0) { const sp = p.sip || 0; sx = mix(sx, -1.25, sp); ex = mix(ex, -1.85, sp); sz = mix(sz, -0.45, sp); }
    A.shoulder.rotation.set(sx, 0, sz);
    A.shoulder.position.y = 0.42 + br * 0.02;
    A.elbow.rotation.x = ex;
  });
}

// ---------- Điểm tương tác trong sân ----------
// shell: khung lầu dựng từ Blender; quả chuông và chày vẫn dựng ở đây vì có hoạt ảnh.
function makeBellTower(shell) {
  const g = new THREE.Group();
  const wood = lam("#a3201f");
  if (shell) g.add(shell);
  else {
    g.add(box(3.4, 0.4, 3.4, lam("#8d8577"), 0, 0.2, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.14, 0.17, 3.4, wood, sx * 1.3, 2.1, sz * 1.3, 8));
    g.add(box(3, 0.22, 0.22, wood, 0, 3.72, 0));
    g.add(hipRoof(4.4, 4.4, 1.3, new THREE.MeshLambertMaterial({ color: "#2c5a52", side: THREE.DoubleSide }), 0.15).translateY(3.8));
    g.add(ball(0.22, lam("#ffd36b", "#7a4a00"), 0, 5.2, 0));
  }
  const bronze = new THREE.MeshLambertMaterial({ color: "#8a6a32", emissive: "#2a1a04", side: THREE.DoubleSide });
  const bell = new THREE.Group();
  bell.position.y = 3.6;
  const prof = [[0, 0], [0.4, -0.05], [0.48, -0.4], [0.53, -1], [0.66, -1.35], [0.68, -1.42], [0, -1.42]].map(([x, y]) => new THREE.Vector2(x, y));
  bell.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 20), bronze));
  [-0.45, -1.15].forEach(y => {
    const band = mesh(new THREE.TorusGeometry(y < -1 ? 0.6 : 0.49, 0.03, 6, 20), lam("#c99a3e", "#3a2508"), 0, y, 0);
    band.rotation.x = Math.PI / 2;
    bell.add(band);
  });
  g.add(bell);
  // Chày gỗ treo bên cạnh, xoay quanh điểm treo trên xà.
  const striker = new THREE.Group();
  striker.position.set(1.05, 3.62, 0);
  const log = cyl(0.12, 0.12, 0.95, lam("#6b4a2e"), 0.55, -0.95, 0, 8);
  log.rotation.z = Math.PI / 2;
  striker.add(log);
  [0.2, 0.9].forEach(x => striker.add(cyl(0.015, 0.015, 0.95, lam("#3a2a1a"), x, -0.47, 0, 4)));
  g.add(striker);
  g.userData = { bell, striker };
  return g;
}

function makePond() {
  const g = new THREE.Group();
  g.add(cyl(POND_R + 0.35, POND_R + 0.45, 0.45, lam("#7d766b"), 0, 0.22, 0, 28));
  const water = mesh(new THREE.CircleGeometry(POND_R, 32), new THREE.MeshLambertMaterial({ color: "#1d4652", emissive: "#06161c" }), 0, 0.46, 0);
  water.rotation.x = -Math.PI / 2;
  g.add(water);
  const pad = lam("#2f6a3a");
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, r = 0.8 + (i % 3) * 0.6;
    const p = mesh(new THREE.CircleGeometry(0.3, 12, 0.3, Math.PI * 2 - 0.3), pad, Math.cos(a) * r, 0.47, Math.sin(a) * r);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = a;
    g.add(p);
  }
  const petal = lam("#f6a9c0", "#3a0f1c");
  [[1.2, 0.6], [-1, 1.1], [-0.6, -1.4], [1.6, -0.9]].forEach(([x, z]) => {
    const f = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const c = mesh(new THREE.ConeGeometry(0.07, 0.24, 5), petal, Math.cos(k) * 0.08, 0.1, Math.sin(k) * 0.08);
      c.rotation.set(Math.sin(k) * 0.5, 0, -Math.cos(k) * 0.5);
      f.add(c);
    }
    f.add(ball(0.05, lam("#f2c14e", "#4a3000"), 0, 0.08, 0, 6));
    f.position.set(x, 0.47, z);
    g.add(f);
  });
  return g;
}

function makeHoaDang(color, glowTex) {
  const [c, e] = HOA_DANG[color] || HOA_DANG.sen;
  const g = new THREE.Group();
  g.add(box(0.34, 0.06, 0.34, lam("#d9c8a0"), 0, 0.03, 0));
  const pm = lam(c, e);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    const p = mesh(new THREE.ConeGeometry(0.07, 0.26, 5), pm, Math.cos(a) * 0.15, 0.15, Math.sin(a) * 0.15);
    p.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    g.add(p);
  }
  g.add(cyl(0.035, 0.035, 0.12, lam("#f3e6c8"), 0, 0.12, 0, 6));
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb347, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  flame.position.y = 0.26;
  flame.scale.set(0.4, 0.4, 1);
  g.add(flame);
  return g;
}

function makeDaoSi(tex) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const robe = lam("#5d6b8a"), white = lam("#f4f1ea");
  body.add(cyl(0.34, 0.58, 1.25, robe, 0, 0.63, 0));
  body.add(cyl(0.36, 0.36, 0.1, lam("#e7b75a"), 0, 1.2, 0));
  const upper = new THREE.Group();
  upper.position.y = 1.2;
  body.add(upper);
  upper.add(cyl(0.26, 0.33, 0.5, robe, 0, 0.25, 0));
  [-1, 1].forEach(s => {
    const sl = cyl(0.12, 0.25, 0.62, robe, s * 0.36, 0.18, 0.05, 8);
    sl.rotation.z = s * 0.4;
    upper.add(sl);
  });
  upper.add(ball(0.24, lam("#ecc79c"), 0, 0.74, 0));
  upper.add(ball(0.25, lam("#d8d4cc"), 0, 0.8, -0.04));
  upper.add(cyl(0.09, 0.11, 0.16, lam("#1d1612"), 0, 1.05, -0.02, 8));
  upper.add(box(0.3, 0.03, 0.03, lam("#c99a3e"), 0, 1.07, -0.02));
  const beard = mesh(new THREE.ConeGeometry(0.13, 0.5, 8), white, 0, 0.45, 0.2);
  beard.rotation.x = Math.PI;
  upper.add(beard);
  [-1, 1].forEach(s => upper.add(box(0.09, 0.025, 0.03, white, s * 0.09, 0.83, 0.22)));
  // Phất trần cầm tay phải
  const whisk = new THREE.Group();
  whisk.position.set(0.5, -0.05, 0.22);
  whisk.add(cyl(0.02, 0.02, 0.55, lam("#7a4a24"), 0, 0.2, 0, 5));
  whisk.add(mesh(new THREE.ConeGeometry(0.06, 0.45, 6), white, 0, -0.25, 0));
  whisk.rotation.z = 0.25;
  upper.add(whisk);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: tex.shadow, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  group.add(sh);
  const label = makeLabel("Lão Đạo Sĩ");
  label.position.y = 2.75;
  group.add(label);
  return { group, body, upper };
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

  const hemi = new THREE.HemisphereLight(0xb9a8ff, 0x4a3426, 1.7);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0x8a7aa8, 0.55);
  scene.add(amb);
  const moonLight = new THREE.DirectionalLight(0xffe2c0, 1.5);
  moonLight.position.set(-30, 50, 20);
  scene.add(moonLight);

  const sky = skyDome();
  scene.add(sky);
  const stars = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3, r = 200;
    stars.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff6e0, size: 1.1, sizeAttenuation: false, fog: false, transparent: true });
  scene.add(new THREE.Points(sg, starMat));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xfff1cf, fog: false, depthWrite: false, toneMapped: false }));
  // Trăng (ban ngày là mặt trời) mọc phía sau Bốc Dịch Đài trên đỉnh núi.
  moon.position.set(40, 120, -300);
  moon.scale.set(40, 40, 1);
  scene.add(moon);
  const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xffffff, fog: false, depthWrite: false, toneMapped: false }));
  moonCore.position.copy(moon.position);
  moonCore.scale.set(12, 12, 1);
  scene.add(moonCore);

  // Ngày và đêm theo giờ trên máy người chơi: nội suy giữa các mốc trong ngày.
  const NIGHT = { top: "#070818", mid: "#1c1c48", low: "#5a3a5a", fog: "#1a1a36", hs: "#7f8cd8", hg: "#2a2030", hi: 0.75, ai: 0.28, dc: "#b8c8ff", di: 0.75, star: 1, sun: 0, exp: 1.05 };
  const DAWN = { top: "#27346a", mid: "#9a7aa8", low: "#f6a878", fog: "#6e5c7e", hs: "#ffd0c0", hg: "#5a4030", hi: 1.6, ai: 0.6, dc: "#ffc49a", di: 1.6, star: 0.25, sun: 0.6, exp: 1.05 };
  const DAY = { top: "#3d78c4", mid: "#a3c8ea", low: "#f4e6c8", fog: "#b4c4d4", hs: "#e6eeff", hg: "#6e5c40", hi: 1.5, ai: 0.7, dc: "#fff4dc", di: 2.3, star: 0, sun: 1, exp: 0.95 };
  const DUSK = { top: "#232458", mid: "#b0607a", low: "#ffa25a", fog: "#5e405e", hs: "#ffc2a8", hg: "#4a3426", hi: 1.6, ai: 0.55, dc: "#ffb27a", di: 1.6, star: 0.35, sun: 0.5, exp: 1.05 };
  const SKY_KEYS = [[0, NIGHT], [4.8, NIGHT], [6, DAWN], [8, DAY], [16.3, DAY], [18, DUSK], [19.4, NIGHT], [24, NIGHT]];
  const ca = new THREE.Color(), cb = new THREE.Color();
  const mixC = (a, b, t, out) => out.copy(ca.set(a)).lerp(cb.set(b), t);
  let hourOverride = null, skyTimer = 0;
  function applySky() {
    const d = new Date();
    const h = hourOverride ?? d.getHours() + d.getMinutes() / 60;
    let i = 0;
    while (i < SKY_KEYS.length - 2 && h >= SKY_KEYS[i + 1][0]) i++;
    const [h0, a] = SKY_KEYS[i], [h1, b] = SKY_KEYS[i + 1];
    const t = h1 > h0 ? Math.min(1, Math.max(0, (h - h0) / (h1 - h0))) : 0;
    const n = k => a[k] + (b[k] - a[k]) * t;
    const u = sky.material.uniforms;
    mixC(a.top, b.top, t, u.top.value); mixC(a.mid, b.mid, t, u.mid.value); mixC(a.low, b.low, t, u.low.value);
    mixC(a.fog, b.fog, t, scene.fog.color);
    mixC(a.hs, b.hs, t, hemi.color); mixC(a.hg, b.hg, t, hemi.groundColor);
    hemi.intensity = n("hi"); amb.intensity = n("ai");
    mixC(a.dc, b.dc, t, moonLight.color); moonLight.intensity = n("di");
    starMat.opacity = n("star");
    const sun = n("sun");
    moon.material.color.set(0xfff1cf).lerp(cb.set(0xfff8e6), sun);
    moon.scale.setScalar((70 - sun * 10) * (1 + (moonBoost - 1) * (1 - sun)));
    moonCore.scale.setScalar((20 - sun * 4) * (1 + (moonBoost - 1) * (1 - sun)));
    renderer.toneMappingExposure = n("exp");
    // Độ sáng cho mặt nước (shader không dùng đèn của cảnh): tối dần về đêm.
    waterLight = 0.42 + 0.58 * sun;
    // Màu trời mặt nước phản chiếu (nhìn xiên): giữa vòm trời, ngả về đỉnh trời.
    skyRefl.copy(u.mid.value).lerp(u.top.value, 0.35);
    nightLevel = 1 - sun;
    night?.setNight(nightLevel);
  }
  let waterLight = 1, night = null, nightLevel = 0, moonBoost = 1;
  const skyRefl = new THREE.Color();
  applySky();

  // ---------- Núi, sân các tầng, bậc đá ----------
  scene.fog.near = 110;
  scene.fog.far = 460;
  camera.far = 900;
  camera.updateProjectionMatrix();
  const terrain = makeTerrain(terrainY, { res: 1 });
  terrain.userData.noShadow = true;
  scene.add(terrain);
  const walkMeshes = [terrain];
  // Đá lát Poly Haven: một ô ảnh phủ 4 m (mỗi tấm đá khoảng 0,8 m).
  const pavingMap = loadTexture("assets/textures/paving.jpg", 1 / 4);
  LEVELS.forEach(l => { const c = makeCourtyard(l.poly, l.y, pavingMap); scene.add(c); walkMeshes.push(c); });
  STAIRS.forEach(s => { const st = makeStairs(s); scene.add(st); walkMeshes.push(st); });
  const driftClouds = makeClouds(scene);
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + Math.random() * 0.15, r = 230 + Math.random() * 110;
    const pk = makePeak(60 + Math.random() * 50, 18 + Math.random() * 14, i + 1);
    pk.position.set(Math.cos(a) * r, -50, 25 + Math.sin(a) * r);
    scene.add(pk);
  }
  // Lan can quanh mép mỗi tầng, chừa lối bậc thang.
  LEVELS.forEach(l => {
    const cx = l.poly.reduce((s, p) => s + p[0], 0) / l.poly.length, cz = l.poly.reduce((s, p) => s + p[1], 0) / l.poly.length;
    const pts = [];
    l.poly.forEach(([ax, az], i) => {
      const [bx, bz] = l.poly[(i + 1) % l.poly.length], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.8));
      for (let k = 0; k < n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, dl = Math.hypot(cx - x, cz - z) || 1;
        pts.push([x + (cx - x) / dl * 0.5, z + (cz - z) / dl * 0.5]);
      }
    });
    // Chừa lối cho bậc thang và chỗ dòng nước chảy qua mép tầng.
    const gap = ([x, z]) => Math.abs(x - WATER.x) < 2.2 || (x > 28 && Math.abs(z - WATER.outflow.z) < 2.4) ||
      STAIRS.some(s => Math.abs(x - s.x) < s.hw + 0.7 && (Math.abs(z - s.z0) < 2 || Math.abs(z - s.z1) < 2));
    let run = [];
    const flush = () => { if (run.length > 1) scene.add(makeBalustrade(run, { closed: false, step: 1.8, y: l.y })); run = []; };
    [...pts, pts[0]].forEach(p => { if (gap(p)) flush(); else run.push(p); });
    flush();
  });

  // ---------- Dòng nước liền một mạch ----------
  // Khe giữa hai trụ đá vôi cao nhất sau Tam Thanh → thác rơi tự do → hồ chân thác (tầng 3) → suối uốn quanh sân
  // → suối nguồn → lòng khe đổ qua mép vách, chảy ghềnh xuống tầng 2 → ao → suối qua cầu → lòng khe xuống tầng 1
  // → ao thác → dòng tràn ra mép núi → thác lớn đổ xuống biển mây.
  const waterMats = makeWaterMaterials(skyRefl);
  const foams = [], mistPts = [];
  const HW = 1.3; // nửa bề rộng lòng suối
  const WY = 0.14; // mặt nước so với mặt sân (bằng mặt nước các ao)
  const lv = id => LEVELS.find(l => l.id === id).y;
  const pondR = p => [p.w / 2 * 1.12, p.d / 2 * 1.12];
  // Đường suối mịn (Catmull-Rom) qua các điểm điều khiển [x, z].
  const smooth = (ctrl, step = 0.6) => {
    const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
    return c.getSpacedPoints(Math.max(2, Math.ceil(c.getLength() / step))).map(v => [v.x, v.z]);
  };
  // Đoạn suối trên mặt sân; `walk` = có chặn người đi (cầu thì chừa lối qua trong blockSkip).
  const streamPaths = [];
  const nearBridge = (x, z) => (Math.abs(z - BRIDGE.z) < BRIDGE.width / 2 + 0.5 && Math.abs(x - BRIDGE.x) < 3) ||
    (Math.abs(z - BRIDGE3.z) < BRIDGE3.width / 2 + 0.5 && Math.abs(x - BRIDGE3.x) < 3) ||
    (Math.abs(x - BRIDGE2.x) < BRIDGE2.width / 2 + 0.5 && Math.abs(z - BRIDGE2.z) < 3);
  const stream = (ctrl, y, seed, walk = true) => {
    const path = smooth(ctrl);
    scene.add(makeWaterPath(path.map(([x, z]) => [x, y + WY, z]), HW * 2, waterMats.stream, { across: 3, fadeStart: 1.2, fadeEnd: 1.2 }));
    scene.add(makeStreamBanks(path, y, HW, { seed, skip: nearBridge }));
    if (walk) streamPaths.push(path);
    return path;
  };
  const addPond = (p, y, seed, lilies = true) => {
    const [rx, rz] = pondR(p);
    const g = makeNaturalPond(rx, rz, waterMats.pond, { seed, lilies });
    g.position.set(p.x, y, p.z);
    scene.add(g);
  };

  // Vách đầu nguồn: hai trụ đá vôi kẹp một khe, khối đá phía sau làm vách khe, thêm một trụ thấp bên cạnh cho thành dãy.
  // Đá chỗ nước chảy qua sẫm màu ướt.
  const cl = WATER.cleft, y3 = lv(3), y2 = lv(2), y1 = lv(1);
  {
    const cragMat = terrainMaterial();
    const wet = (x, y, z) => Math.max(0, 1 - Math.abs(x - cl.x) / 3.2) * (y < cl.y + 1.5 ? 1 : 0) * (z > cl.z - 7 ? 1 : 0);
    [[19.4, -55.8, 54, 7.6, 3], [35.2, -55.4, 47, 7.2, 5], [27.3, -61.5, 46, 6.6, 8], [42, -62, 31, 7, 12]].forEach(([x, z, h, r, s]) => {
      const base = terrainY(x, z) - 8;
      scene.add(makeCrag(h + 8, r, { seed: s, wet, at: [x, base, z], material: cragMat }));
    });
    // Lòng khe: đá kê dưới dòng nước trước khi nước vọt ra khỏi miệng khe.
    const sill = [];
    for (let z = cl.z - 6.5; z < cl.z - 0.8; z += 0.9) [-1, 1].forEach(s => sill.push([cl.x + s * (1.1 + Math.random() * 0.6), cl.y - 0.5, z, 1.1 + Math.random() * 0.5, 0.8]));
    sill.push([cl.x, cl.y - 1.6, cl.z - 3, 2.2, 0.7], [cl.x, cl.y - 2.2, cl.z - 1.4, 1.7, 0.8]);
    scene.add(makeBoulders(sill, { seed: 31, moss: 0.5, wet: 0.6 }));
    scene.add(makeWaterPath([[cl.x, cl.y + 0.25, cl.z - 6.5], [cl.x, cl.y + 0.15, cl.z - 3], [cl.x, cl.y, cl.z]], 2, waterMats.rapids, { across: 3 }));
    // Rơi tự do: x không đổi, z = z0 + v·t, y = y0 − g·t²/2; màn nước loe dần khi rơi.
    const fall = [], yEnd = y3 + WY;
    for (let t = 0; ; t += 0.05) {
      const y = cl.y - 4.9 * t * t;
      fall.push([cl.x, Math.max(y, yEnd), cl.z + cl.jet * t]);
      if (y <= yEnd) break;
    }
    scene.add(makeWaterPath(fall, t => 2.1 + 2.4 * t, waterMats.fall, { bulge: 0.16 }));
    scene.add(makeWaterPath(fall.map(([x, y, z]) => [x + 0.25, y + 0.1, z - 0.3]), t => 1.2 + 1.6 * t, waterMats.fall, { bulge: 0.3 }));
    const [, , zl] = fall[fall.length - 1];
    foams.push(makeFoam(tex.glow, cl.x, y3 + 0.3, zl, 2.4), makeFoam(tex.glow, cl.x + 0.6, y3 + 0.2, zl + 0.8, 1.6), makeFoam(tex.glow, cl.x, cl.y - 0.3, cl.z + 0.5, 0.7));
    mistPts.push([cl.x, y3 + 2.2, zl + 0.5, 8]);
    // Hồ chân thác: không có sen (nước động), đá tảng lớn sau lưng hồ.
    addPond(WATER.plunge, y3, 14, false);
    const pl = WATER.plunge, [prx, prz] = pondR(pl), back = [];
    for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.22) back.push([pl.x + Math.cos(a) * prx * 1.15, y3 + 0.2, pl.z + Math.sin(a) * prz * 1.15, 0.8 + Math.random() * 0.6, 0.75]);
    scene.add(makeBoulders(back, { seed: 32, moss: 0.5, wet: 0.4 }));
  }

  // Lòng khe giữa hai tầng: nước rời mép vách rơi theo đường parabol, đập xuống lòng khe rồi chảy ghềnh qua đá.
  const chute = (c, seed) => {
    const v = 2.4, H = c.y0 - c.y1;
    // Một dải liền: rơi tự do qua mép vách tới khi chạm lòng khe, rồi bám lòng khe chảy ghềnh.
    const pts = [];
    let landed = null;
    for (let z = c.z0 - 1.2; z <= c.z1 + 1; z += 0.25) {
      const bed = z <= c.z0 ? c.y0 + WY : chuteY(c, z) + 0.14;
      const free = z <= c.z0 ? c.y0 + WY : c.y0 + WY - 4.9 * ((z - c.z0) / v) ** 2;
      if (landed === null && free <= bed + 0.05 && z > c.z0) landed = z;
      pts.push([c.x, landed === null ? Math.max(free, bed) : bed, z]);
    }
    scene.add(makeWaterPath(pts, t => 2.3 + 0.6 * Math.min(1, t * 3), waterMats.fall, { across: 4, fadeStart: 1.0, fadeEnd: 1.6 }));
    // Đá hai bờ lòng khe, vài tảng nằm giữa dòng tạo bọt.
    const rocks = [];
    for (let z = landed + 0.4; z < c.z1 + 0.6; z += 0.7) {
      [-1, 1].forEach(s => {
        const x = c.x + s * (1.6 + Math.random() * 1.1);
        rocks.push([x, terrainY(x, z), z + Math.random() * 0.4, 0.45 + Math.random() * 0.55, 0.75]);
      });
      if (z > landed + 1 && Math.random() < 0.18) {
        const x = c.x + (Math.random() - 0.5) * 1.6, y = chuteY(c, z);
        rocks.push([x, y - 0.05, z, 0.35 + Math.random() * 0.25, 0.7]);
        foams.push(makeFoam(tex.glow, x, y + 0.2, z + 0.4, 0.5));
      }
    }
    scene.add(makeBoulders(rocks, { seed, moss: 0.3, wet: 0.35 }));
    foams.push(makeFoam(tex.glow, c.x, chuteY(c, landed) + 0.3, landed + 0.3, 1.3), makeFoam(tex.glow, c.x, c.y1 + 0.3, c.z1 + 0.9, 1.4));
    mistPts.push([c.x, chuteY(c, landed) + 1.5, landed + 0.5, 5], [c.x, c.y1 + 1.2, c.z1 + 1, 6]);
    return H;
  };

  // Suối tầng 3: hồ chân thác uốn quanh sân phía đông về suối nguồn, rồi từ suối nguồn ra mép vách.
  const sp = WATER.spring, p2 = WATER.pool2, p1 = WATER.pool1, pl = WATER.plunge;
  addPond(sp, y3, 11); addPond(p2, y2, 12); addPond(p1, y1, 13);
  stream([[pl.x, pl.z + pondR(pl)[1] * 0.6], ...WATER.route3, [sp.x + pondR(sp)[0] * 0.6, sp.z]], y3, 41);
  stream([[WATER.x, sp.z + pondR(sp)[1] * 0.6], [WATER.x + 0.6, 3.5], [WATER.x, WATER.chutes[0].z0 + 0.1]], y3, 42);
  chute(WATER.chutes[0], 51);
  stream([[WATER.x, WATER.chutes[0].z1 - 0.1], [WATER.x, p2.z - pondR(p2)[1] * 0.6]], y2, 43);
  stream([[WATER.x, p2.z + pondR(p2)[1] * 0.6], [WATER.x + 1.3, 37], [WATER.x - 1.4, 45], [WATER.x, BRIDGE.z - 3.2], [WATER.x, BRIDGE.z + 3.2],
    [WATER.x - 1.1, 63], [WATER.x, WATER.chutes[1].z0 + 0.1]], y2, 44);
  chute(WATER.chutes[1], 52);
  stream([[WATER.x, WATER.chutes[1].z1 - 0.1], [WATER.x, p1.z - pondR(p1)[1] * 0.6]], y1, 45);
  // Dòng tràn ra mép núi phía đông rồi đổ thành thác lớn theo sườn xuống biển mây.
  const of = WATER.outflow;
  stream([[p1.x + pondR(p1)[0] * 0.6, of.z], [of.x1, of.z]], y1, 46, false);
  {
    const pts = [];
    for (let x = of.x1; x <= 112; x += 0.8) pts.push([x, Math.max(terrainY(x, of.z) + 0.35, x < of.x1 + 1 ? y1 + WY : -60), of.z]);
    scene.add(makeWaterPath(pts, 3.6, waterMats.fall, { across: 3 }));
    const rocks = [];
    for (let x = of.x1 + 1; x < 100; x += 1.4) [-1, 1].forEach(s => rocks.push([x, terrainY(x, of.z + s * 3), of.z + s * (2.6 + Math.random()), 0.6 + Math.random() * 0.9, 0.7]));
    scene.add(makeBoulders(rocks, { seed: 47, moss: 0.3, wet: 0.3 }));
    foams.push(makeFoam(tex.glow, of.x1 + 0.6, y1 + 0.2, of.z, 1.2));
    for (let x = 45; x < 110; x += 16) mistPts.push([x, terrainY(x, of.z) + 3, of.z, 12]);
  }
  foams.forEach(f => scene.add(f.points));
  // Cầu vòm nhỏ qua dòng tràn tầng 1 (nhịp theo trục z: dựng theo trục x rồi xoay 90°).
  const bridge2 = makeMoonBridge(BRIDGE2.len, BRIDGE2.width, x => bridge2DeckY(x), 0.75);
  bridge2.position.set(BRIDGE2.x, y1, BRIDGE2.z);
  bridge2.rotation.y = Math.PI / 2;
  scene.add(bridge2);
  walkMeshes.push(bridge2);
  const bridge = makeMoonBridge(BRIDGE.len, BRIDGE.width, bridgeDeckY);
  bridge.position.set(BRIDGE.x, y2, BRIDGE.z);
  scene.add(bridge);
  walkMeshes.push(bridge);
  // Cầu vòm qua suối tầng 3 (nhịp theo trục x như cầu tầng 2).
  const bridge3 = makeMoonBridge(BRIDGE3.len, BRIDGE3.width, bridge3DeckY, 1.45);
  bridge3.position.set(BRIDGE3.x, y3, BRIDGE3.z);
  scene.add(bridge3);
  walkMeshes.push(bridge3);

  // ---------- Tam quan và sân tầng 1 ----------
  const models = await loadModels();
  const gate = makeGate(models.gate);
  gate.position.set(0, 0, GATE_Z);
  scene.add(gate);
  const medallion = makeMedallion(5);
  medallion.position.set(0, 0, 106);
  scene.add(medallion);

  // ---------- Ba điện (đi vào được bên trong) và Bốc Dịch Đài ----------
  const halls = {};
  const HALL_STYLE = {
    "tam-thanh": { wall: "#8a2a1e", roof: "#c4532a", board: "三清殿", couplets: ["玉清上清", "太清福壽"], sign: "Tam Thanh Điện",
      statues: [{ x: -2.2, robe: "#3b5ba5" }, { x: 0, robe: "#c9302c", halo: "#fff0b0" }, { x: 2.2, robe: "#2e7a5a" }].map(s => ({ ...s, beard: true })) },
    "tai-than": { wall: "#8a3a14", roof: "#e0a526", trim: "#ffd36b", board: "財神殿", couplets: ["招財進寶", "金錢吉祥"], sign: "Tài Thần Điện",
      statues: [{ robe: "#c99a3e", skin: "#3a2a20", hat: "#1b1b1b" }], lantern: ["#ffb32c", "#a85a00"] },
    "nguyet-lao": { wall: "#a3304e", roof: "#d4527e", trim: "#ffc0d4", board: "月老殿", couplets: ["天作之合", "合歡吉祥"], sign: "Nguyệt Lão Điện", signSub: "(Hợp Hoan Cung)",
      statues: [{ robe: "#c8243a", beard: true, hat: "#8e2a3a", halo: "#ffc0d0" }], lantern: ["#ff7a9c", "#b02a4a"] }
  };
  Object.entries(HALL_STYLE).forEach(([k, st]) => {
    const hl = HALL[k];
    const g = makeHall({ ...st, w: hl.w, d: hl.d, h: hl.h, base: hl.base, door: hl.door, cols: hl.cols, shell: models[k] });
    g.position.set(hl.x, LEVELS.find(l => l.id === hl.level).y, hl.z);
    g.userData.zone = k;
    halls[k] = g;
    scene.add(g);
    walkMeshes.push(g);
  });

  const altarY = altarBase();
  const altar = makeAltarPlatform(ALTAR.r, ALTAR.h, ALTAR.stairW, ALTAR.stairLen, models["boc-dich"]);
  altar.position.set(ALTAR.x, altarY, ALTAR.z);
  altar.userData.zone = "boc-dich";
  scene.add(altar);
  walkMeshes.push(altar);
  const bagua = makeBagua();
  bagua.position.set(ALTAR.x, altarY + ALTAR.h - 0.18, ALTAR.z);
  bagua.userData.zone = "boc-dich";
  scene.add(bagua);
  const altarSign = makeSign("Bốc Dịch Đài", 5.2);
  altarSign.position.set(ALTAR.x, altarY + ALTAR.h + 4.6, ALTAR.z - ALTAR.r + 0.4);
  scene.add(altarSign);
  [-1, 1].forEach(s => scene.add(cyl(0.16, 0.18, 4.6, lam("#b3242a"), ALTAR.x + s * 2.9, altarY + ALTAR.h + 2.3, ALTAR.z - ALTAR.r + 0.4, 8)));
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + 0.55 + i / 9 * (Math.PI * 2 - 1.1);
    const x = ALTAR.x + Math.cos(a) * (ALTAR.r - 0.3), z = ALTAR.z + Math.sin(a) * (ALTAR.r - 0.3);
    scene.add(cyl(0.07, 0.08, 1.6, lam("#5a3a24"), x, altarY + ALTAR.h + 0.8, z, 6));
    const l = makeLantern("#ffb32c", "#a85a00");
    l.scale.setScalar(0.7);
    l.position.set(x, altarY + ALTAR.h + 1.9, z);
    scene.add(l);
  }

  // Lư hương: trong ba điện (giữa hai hàng cột) và lư lớn ngoài sân Tam Thanh.
  const burners = {};
  ["tam-thanh", "tai-than", "nguyet-lao"].forEach(z => {
    const b = makeBurner();
    b.position.set(BURNER[z].x, hallFloor(z), BURNER[z].z);
    if (z === "tam-thanh") b.scale.setScalar(1.3);
    b.userData.zone = z;
    for (let i = 0; i < 3; i++) addStick(b);
    scene.add(b);
    burners[z] = b;
  });

  // ---------- Vật cản ----------
  const obstacles = [], circles = [], benches = [];
  // Cây đa cổ thụ giữa sân tầng 2 (mô hình Blender): bồn đá tròn, bàn hương phía trước, đèn lồng treo dưới tán.
  if (models["cay-da"]) {
    const T = BIG_TREE, ty = LEVELS.find(l => l.id === T.level).y, k = T.scale;
    const tree = models["cay-da"];
    tree.position.set(T.x, ty, T.z);
    tree.scale.setScalar(k);
    scene.add(tree);
    walkMeshes.push(tree);
    circles.push({ x: T.x, z: T.z, r: T.r * k + 0.3 });
    obstacles.push({ x0: T.x - 0.85 * k - 0.1, x1: T.x + 0.85 * k + 0.1, z0: T.z + 5.55 * k - 0.1, z1: T.z + 6.45 * k + 0.1 });
    const lc = [["#e0362c", "#b01a12"], ["#ffb32c", "#a85a00"]];
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2, r = (5.6 + (i % 2) * 1.3) * k, x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
      const l = makeLantern(...lc[i % 2]);
      l.scale.setScalar(0.75);
      l.position.set(x, ty + (6.1 + (i % 3) * 0.35) * k, z);
      scene.add(l);
      scene.add(cyl(0.012, 0.012, 2.2, lam("#3a2a20"), x, l.position.y + 1.4, z, 4));
    }
  }
  Object.keys(HALL).forEach(k => { const o = hallObstacles(k); obstacles.push(...o.boxes); circles.push(...o.circles); });
  Object.keys(burners).forEach(k => circles.push({ x: BURNER[k].x, z: BURNER[k].z, r: k === "tam-thanh" ? 1.2 : 0.95 }));
  const rectOf = (p, pad = 0.4) => ({ x0: p.x - p.w / 2 - pad, x1: p.x + p.w / 2 + pad, z0: p.z - p.d / 2 - pad, z1: p.z + p.d / 2 + pad });
  const pondPad = p => Math.max(p.w, p.d) * 0.18 + 0.4;
  // ---------- Hàng rào ven hồ, ven suối (đúng chỗ có vật cản, đi tới đâu thấy rào tới đó) ----------
  // Hồ: rào theo viền hình bầu dục ngoài thảm cỏ; vòng tròn chặn đặt dọc hàng rào thay cho hộp chặn vô hình.
  // Ao Sen chừa lối ở mặt trước (chỗ thả hoa đăng).
  const FENCE_K = 1.42, fenceRuns = [];
  const ponds = [[WATER.spring, lv(3)], [WATER.pool2, lv(2)], [WATER.pool1, lv(1)], [WATER.plunge, lv(3)], [{ ...POND, w: POND.w * 0.94, d: POND.d * 0.94 }, 0, true]];
  const inPondFence = (x, z, pad = 0) => ponds.some(([p]) => ((x - p.x) / (p.w / 2 * 1.12 * FENCE_K + pad)) ** 2 + ((z - p.z) / (p.d / 2 * 1.12 * FENCE_K + pad)) ** 2 < 1);
  const nearStream = (x, z, r) => streamPaths.some(path => path.some(([px, pz]) => Math.hypot(px - x, pz - z) < r));
  // Cắt một dãy điểm thành các đoạn liền nhau thoả điều kiện ok.
  const runsOf = (pts, ok, closed = false) => {
    const out = []; let cur = [];
    const list = closed ? [...pts, pts[0]] : pts;
    list.forEach(q => { if (ok(q)) cur.push(q); else { if (cur.length > 1) out.push(cur); cur = []; } });
    if (cur.length > 1) out.push(cur);
    if (closed && out.length > 1 && ok(pts[0]) && out[0][0] === pts[0]) { const last = out.pop(); out[0] = [...last, ...out[0].slice(1)]; }
    return out;
  };
  ponds.forEach(([p, y, front]) => {
    const rx = p.w / 2 * 1.12 * FENCE_K, rz = p.d / 2 * 1.12 * FENCE_K, pts = [];
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pts.push([p.x + Math.cos(a) * rx, y, p.z + Math.sin(a) * rz]); }
    const ok = ([x, , z]) => !nearStream(x, z, HW + 0.9) && !(front && Math.abs(x - p.x) < 2.2 && z > p.z) && walkable(x, z);
    runsOf(pts, ok, true).forEach(r => fenceRuns.push(r));
    // Chặn: vòng tròn dọc hàng rào (cả chỗ suối chảy vào để không lọt qua), chừa lối trước Ao Sen.
    pts.forEach(([x, , z]) => { if (!(front && Math.abs(x - p.x) < 2.2 && z > p.z)) circles.push({ x, z, r: 0.45 }); });
    if (front) { // Ao Sen: chặn phần mặt nước sau lối vào để không bước xuống nước.
      circles.push({ x: p.x, z: p.z, r: Math.min(rx, rz) * 0.95 });
    }
  });
  // Suối: rào hai bên, cách tim dòng HW + 0.5 (ngay ngoài vòng chặn), chừa chỗ cầu và chỗ suối chui vào hồ.
  streamPaths.forEach(path => [-1, 1].forEach(side => {
    const pts = path.map(([x, z], i) => {
      const [ax, az] = path[Math.max(0, i - 1)], [bx, bz] = path[Math.min(path.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1;
      const nx = -(bz - az) / L * side, nz = (bx - ax) / L * side, o = HW + 0.5;
      const qx = x + nx * o, qz = z + nz * o;
      return [qx, groundY(qx, qz), qz];
    });
    runsOf(pts, ([x, , z]) => !nearBridge(x, z) && !inPondFence(x, z, -0.3) && walkable(x, z) && Math.abs(groundY(x, z) - pts[0][1]) < 0.5).forEach(r => fenceRuns.push(r));
  }));
  // Dòng tràn ra mép núi (tầng 1): rào dọc hai mép, chừa cầu Trà Đình.
  [-1, 1].forEach(sd => {
    const z = WATER.outflow.z + sd * 1.85, pts = [];
    for (let x = WATER.pool1.x; x <= WATER.outflow.x1 - 0.6; x += 0.6) pts.push([x, 0, z]);
    runsOf(pts, ([x, , zz]) => Math.abs(x - BRIDGE2.x) > BRIDGE2.width / 2 + 0.3 && !inPondFence(x, zz, -0.3) && walkable(x, zz)).forEach(r => fenceRuns.push(r));
  });
  scene.add(makeFence(fenceRuns));
  // Dòng tràn chặn hai đoạn, chừa chỗ cầu vòm nhỏ (BRIDGE2) để vào khu Trà Đình.
  [[WATER.pool1.x, BRIDGE2.x - BRIDGE2.width / 2], [BRIDGE2.x + BRIDGE2.width / 2, 40]].forEach(([x0, x1]) =>
    obstacles.push({ x0, x1, z0: WATER.outflow.z - 1.9, z1: WATER.outflow.z + 1.9 }));
  // Hai thành cầu.
  [-1, 1].forEach(s => obstacles.push({ x0: BRIDGE2.x + s * BRIDGE2.width / 2 - 0.15, x1: BRIDGE2.x + s * BRIDGE2.width / 2 + 0.15, z0: BRIDGE2.z - BRIDGE2.len / 2, z1: BRIDGE2.z + BRIDGE2.len / 2 }));
  [-1, 1].forEach(s => obstacles.push({ x0: BRIDGE3.x - BRIDGE3.len / 2, x1: BRIDGE3.x + BRIDGE3.len / 2, z0: BRIDGE3.z + s * BRIDGE3.width / 2 - 0.15, z1: BRIDGE3.z + s * BRIDGE3.width / 2 + 0.15 }));
  // Suối: chuỗi vòng tròn dọc dòng; sát hai cầu tầng 2, 3 (đoạn suối thẳng theo trục z) thì chặn bằng hình chữ nhật
  // tới đúng mép mặt cầu để lối lên cầu không bị vòng tròn lấn.
  const crossings = [BRIDGE, BRIDGE3];
  streamPaths.forEach(path => path.forEach(([x, z], i) => {
    if (i % 2) return;
    if (crossings.some(b => Math.abs(x - b.x) < 3 && Math.abs(z - b.z) < b.width / 2 + 1.7)) return;
    circles.push({ x, z, r: HW + 0.25 });
  }));
  crossings.forEach(b => [-1, 1].forEach(s => {
    const za = b.z + s * b.width / 2, zb = b.z + s * (b.width / 2 + 1.8);
    obstacles.push({ x0: b.x - HW - 0.15, x1: b.x + HW + 0.15, z0: Math.min(za, zb), z1: Math.max(za, zb) });
  }));
  [-3.6, 3.6].forEach(x => circles.push({ x, z: GATE_Z, r: 0.6 }));
  const place = (obj, x, z, r) => { obj.position.set(x, groundY(x, z), z); scene.add(obj); if (r) circles.push({ x, z, r }); };

  // Cờ âm dương: hai bên cổng và hai bên đầu mỗi bậc thang.
  const banners = [];
  [[-6, 128], [6, 128], [-6.5, 86.5], [6.5, 86.5], [-6.5, 67.5], [6.5, 67.5], [-6.5, 5.5], [6.5, 5.5], [-6.5, -56], [6.5, -56]].forEach(([x, z]) => {
    const b = makeBanner();
    if (x > 0) b.rotation.y = Math.PI;
    place(b, x, z, 0.3);
    banners.push(b);
  });

  // ---------- Cây cối ----------
  // Rừng thông và cây tán tròn mọc trên sườn núi (không đi tới được), rải theo hạt giống cố định.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 560 && seed; i++) {
    const x = (rnd() - 0.5) * 170, z = -110 + rnd() * 270;
    const y = terrainY(x, z);
    if (walkable(x, z) || y < -26 || y > 30) continue;
    if (Math.abs(x - WATER.x) < 4 || STAIRS.some(s => Math.abs(x - s.x) < s.hw + 2.5 && z < Math.max(s.z0, s.z1) + 1 && z > Math.min(s.z0, s.z1) - 1)) continue;
    const t = rnd() < 0.65 ? makeTree("pine") : makeRoundTree(rnd() < 0.15 ? "#f4a6c0" : "#3f7a3a", 0.9 + rnd() * 0.4);
    t.scale.multiplyScalar(1 + rnd() * 0.5);
    t.position.set(x, y - 0.2, z);
    scene.add(t);
  }
  // Cây trên các tầng (có va chạm): vàng quanh Tài Thần, hồng quanh Nguyệt Lão, anh đào trước cổng.
  [[-41, 44], [-41, 30], [-13, 34]].forEach(([x, z]) => place(makeRoundTree("#f2c14e", 1.15), x, z, 0.6));
  [[41, 44], [41, 30], [19, 62], [-9, 121], [9, 121], [-31, 117], [31, 92]].forEach(([x, z]) => place(makeRoundTree("#f4a6c0", 1), x, z, 0.6));
  [[-33, 0], [36, 2], [-33, -36], [36, -30], [-20, 4], [35, -14], [-30, 88], [-31, 104], [-12, -66], [12, -66], [-14, -84], [14, -84]]
    .forEach(([x, z], i) => place(i % 2 ? makeTree("pine") : makeRoundTree("#3f7a3a", 0.95), x, z, 0.6));
  [[-17, 6], [8, 4], [-37, 20], [37, 20], [-24, 122], [24, 122], [-9, 86], [-20, 66], [26, 66], [-9, -50], [9, -50]]
    .forEach(([x, z]) => place(makeBush(0.75 + Math.random() * 0.3), x, z, 0.8));
  [[-35, 58.5], [-21, 58.5]].forEach(([x, z]) => place(makeIngots(), x, z, 0.7));
  [[-26, 112, 10, 8], [17, 108, 7, 5], [-41.5, 37, 3.5, 13], [41.5, 37, 3.5, 13], [-28, -20, 8, 14], [34, -12, 6, 10], [-10, -70, 6, 6], [10, -82, 6, 6]]
    .forEach(([x, z, w, d]) => { const gp = grassPatch(w, d, x, z); gp.position.y = groundY(x, z) + 0.02; scene.add(gp); });

  // ---------- Vườn, đá, mây mù: lấp những khoảng sân và sườn núi còn trống ----------
  // Bồn cây trên sân các tầng [x, z, rộng, sâu, màu tán cây]; có va chạm.
  const BEDS = [
    [-25, 90, 5, 3, "#f4a6c0"], [-18, 118, 5, 3, "#f4a6c0"], [18, 118, 5, 3, "#f4a6c0"], [-26, 104, 3, 6, "#3f7a3a"],
    [-22, 62, 6, 3, "#f2c14e"], [30, 64, 5, 3, "#f4a6c0"], [-30, 28, 8, 3, "#f2c14e"], [30, 28, 8, 3, "#f4a6c0"],
    [-24, -6, 6, 4, "#3f7a3a"], [-27, -26, 4, 10, "#3f7a3a"], [34.5, -24, 4, 9, "#3f7a3a"], [-10, -2, 5, 3, "#f4a6c0"], [33, -5, 5, 3, "#f4a6c0"],
    [-8, -64, 4, 3, null], [8, -64, 4, 3, null]
  ];
  BEDS.forEach(([x, z, w, d, tree], i) => {
    const b = makeGardenBed(w, d, { seed: i + 1, tree });
    b.position.set(x, groundY(x, z), z);
    scene.add(b);
    obstacles.push({ x0: x - w / 2 - 0.2, x1: x + w / 2 + 0.2, z0: z - d / 2 - 0.2, z1: z + d / 2 + 0.2 });
  });
  // Đá tảng trên sườn núi (chỗ không đi được), thưa dần xuống thấp.
  {
    const rocks = [];
    for (let i = 0; i < 420; i++) {
      const x = (rnd() - 0.5) * 190, z = -120 + rnd() * 290, y = terrainY(x, z);
      if (walkable(x, z) || y < -30 || y > 30 || Math.abs(x - WATER.x) < 3) continue;
      rocks.push([x, y, z, 0.4 + rnd() * rnd() * 2.2]);
    }
    scene.add(makeRockField(rocks));
  }
  // Núi đá vôi gần hơn, chân chìm trong mây, và một vòng mây mù quanh sườn núi.
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.3, r = 135 + rnd() * 40;
    const pk = makePeak(34 + rnd() * 26, 9 + rnd() * 7, i + 40);
    pk.position.set(Math.cos(a) * r, -40, 25 + Math.sin(a) * r);
    scene.add(pk);
  }
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, r = 92 + rnd() * 30;
    mistPts.push([Math.cos(a) * r * 0.7, -16 + rnd() * 10, 25 + Math.sin(a) * r * 1.25, 26 + rnd() * 18]);
  }
  const mist = makeMist(mistPts, 0.5);
  scene.add(mist);

  const toHong = makeTree("tohong"), kimTien = makeRoundTree("#f2c14e", 1.15);
  place(toHong, PROP["to-hong"].x, PROP["to-hong"].z, 0.5);
  place(kimTien, PROP["kim-tien"].x, PROP["kim-tien"].z, 0.5);
  const coinM = lam("#ffd36b", "#4a3000");
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 0.7;
    const c = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), coinM, Math.cos(a) * r, 2.3 + Math.random() * 1.7, Math.sin(a) * r);
    c.rotation.x = Math.PI / 2; c.rotation.z = a;
    kimTien.add(c);
  }
  toHong.userData.zone = "to-hong";
  kimTien.userData.zone = "kim-tien";

  // ---------- Ao Sen, Lầu Chuông, Lão Đạo Sĩ ----------
  const pond = makeNaturalPond(POND.w / 2 * 1.05, POND.d / 2 * 1.05, waterMats.pond, { seed: 21 });
  // Bốn đèn đá mái xanh quanh Ao Sen giữ nét riêng của chỗ thả hoa đăng.
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
    const l = makePavilionLamp();
    l.position.set(POND.x + sx * (POND.w / 2 + 1.2), 0, POND.z + sz * (POND.d / 2 + 1));
    scene.add(l);
  });
  pond.position.set(POND.x, 0, POND.z);
  pond.userData.zone = "ao-sen";
  scene.add(pond);
  const pondLabel = makeLabel("Ao Sen · thả hoa đăng");
  pondLabel.position.set(POND.x, 2.6, POND.z);
  scene.add(pondLabel);
  const hoaDang = [];
  let festivalOn = false, festivalSpawn = 0;
  ["vang", "sen", "trang"].forEach((c, i) => addHoaDang(c, i * 2.1, false));

  const bellTower = makeBellTower(models.chuong);
  place(bellTower, PROP.chuong.x, PROP.chuong.z);
  bellTower.userData.zone = "chuong";
  obstacles.push({ x0: PROP.chuong.x - 1.7, x1: PROP.chuong.x + 1.7, z0: PROP.chuong.z - 1.7, z1: PROP.chuong.z + 1.7 });
  const bellLabel = makeLabel("Lầu Chuông");
  bellLabel.position.set(PROP.chuong.x, 6.7, PROP.chuong.z);
  scene.add(bellLabel);

  const daoSi = makeDaoSi(tex);
  const daoYaw = Math.atan2(0 - PROP["dao-si"].x, GATE_Z - PROP["dao-si"].z);
  daoSi.group.rotation.y = daoYaw;
  place(daoSi.group, PROP["dao-si"].x, PROP["dao-si"].z, 0.45);
  daoSi.group.userData.zone = "dao-si";
  let daoNod = -1;

  // ---------- Lễ hoa đăng chung: hoa đăng tự thả dần kín ao, đèn trời bay lên ----------
  const skyLanterns = [];
  {
    const paper = new THREE.MeshBasicMaterial({ color: 0xffb04a, toneMapped: false });
    const halo = new THREE.SpriteMaterial({ map: tex.glow, color: 0xffa040, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 28; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 8), paper));
      const h = new THREE.Sprite(halo);
      h.scale.setScalar(1.6);
      g.add(h);
      g.visible = false;
      scene.add(g);
      skyLanterns.push({ g, x: 0, y: 0, z: 0, v: 0.5 + Math.random() * 0.5, seed: Math.random() * 9 });
    }
  }
  const respawnSky = (s, spread = 1) => {
    s.x = POND.x + (Math.random() - 0.5) * 14 * spread;
    s.z = POND.z + (Math.random() - 0.5) * 10 * spread;
    s.y = Math.random() * 6 * spread;
  };
  function setFestival(on) {
    if (on === festivalOn) return;
    festivalOn = on;
    skyLanterns.forEach((s, i) => { s.g.visible = on; respawnSky(s, 1); s.y = -i * 1.2; });
  }
  function updateFestival(dt, t) {
    if (!festivalOn) return;
    festivalSpawn -= dt;
    if (festivalSpawn <= 0 && hoaDang.length < 50) {
      festivalSpawn = 1.4 + Math.random();
      addHoaDang(["sen", "vang", "trang"][Math.floor(Math.random() * 3)], Math.random() * Math.PI * 2, true);
    }
    for (const s of skyLanterns) {
      s.y += s.v * dt;
      if (s.y > 70) respawnSky(s, 1);
      const y = Math.max(0, s.y);
      s.g.position.set(s.x + Math.sin(t * 0.3 + s.seed) * y * 0.05, 1 + y, s.z + Math.cos(t * 0.25 + s.seed) * y * 0.05 - y * 0.15);
      s.g.visible = s.y > 0;
    }
  }

  function addHoaDang(color, angle, fresh) {
    const g = makeHoaDang(color, tex.glow);
    const item = { g, a: angle ?? Math.PI / 2, r: fresh ? POND_R : 0.9 + Math.random() * 1.2, speed: (0.05 + Math.random() * 0.05) * (Math.random() < 0.5 ? -1 : 1), seed: Math.random() * 9, born: fresh ? 0 : 1 };
    scene.add(g);
    hoaDang.push(item);
    if (hoaDang.length > (festivalOn ? 60 : 24)) scene.remove(hoaDang.shift().g);
  }
  function addRibbon(fresh) {
    const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.7, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y0 = 2.3 + Math.random() * 0.5, y1 = y0 - 0.7 - Math.random() * 0.6;
    const rib = new THREE.Group();
    rib.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x, y0, z), V(x, y1, z)]), new THREE.LineBasicMaterial({ color: 0xff2f4f })));
    rib.add(box(0.12, 0.22, 0.02, lam("#e0283a", "#5a0010"), x, y1 - 0.1, z));
    toHong.add(rib);
    const mine = toHong.userData.mine || (toHong.userData.mine = []);
    mine.push(rib);
    if (mine.length > 30) toHong.remove(mine.shift());
    if (fresh) {
      rib.scale.setScalar(0.01);
      let life = 0;
      effects.push(dt => { life += dt; rib.scale.setScalar(Math.min(1, life / 0.6)); return life < 0.6; });
    }
  }

  // Ghế đá ngắm cảnh ở những góc yên tĩnh: bấm vào ghế để đi tới ngồi. [x, z, hướng nhìn khi ngồi]
  // SEATS[k]: chỗ ngồi (mặt ghế cao h), front: chỗ đứng trước ghế, cam: góc camera so với hướng ngồi.
  const SEATS = {};
  const benchMesh = new THREE.MeshLambertMaterial({ vertexColors: true }), benchGeo = stoneBenchGeometry();
  // Còn trống đủ chỗ cho ghế (và chỗ đứng trước ghế)? Tránh điện, cây, bồn hoa, suối, hồ, đèn, bậc thang, điểm nghi lễ.
  const roomFor = (x, z, r) => walkable(x, z) &&
    !obstacles.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) &&
    !circles.some(c => Math.hypot(x - c.x, z - c.z) < c.r + r) &&
    !STAIRS.some(st => Math.abs(x - st.x) < st.hw + 3 && z > Math.min(st.z0, st.z1) - 4 && z < Math.max(st.z0, st.z1) + 4) &&
    !Object.values(SPOT).some(sp => Math.hypot(x - sp.x, z - sp.z) < 3.2);
  const addBench = (x, z, yaw, check = true) => {
    const fx = Math.sin(yaw), fz = Math.cos(yaw), ax = Math.cos(yaw), az = -Math.sin(yaw);
    const front = V(x + fx * 0.95, 0, z + fz * 0.95);
    if (check && !(roomFor(x, z, 1.1) && roomFor(x + ax * 0.9, z + az * 0.9, 0.7) && roomFor(x - ax * 0.9, z - az * 0.9, 0.7) && (roomFor(front.x, front.z, 0.8) || roomFor(x - fx * 0.95, z - fz * 0.95, 0.8))
      && Math.abs(groundY(x, z) - groundY(front.x, front.z)) < 0.05)) return false;
    const b = new THREE.Mesh(benchGeo, benchMesh);
    const k = "ghe-" + Object.keys(SEATS).length;
    b.userData.zone = k;
    b.position.set(x, groundY(x, z), z);
    b.rotation.y = yaw;
    scene.add(b);
    benches.push(b);
    b.userData.blockers = [-0.5, 0.5].map(o => ({ x: x + ax * o, z: z + az * o, r: 0.42 }));
    circles.push(...b.userData.blockers);
    SEATS[k] = { zone: k, x: x - fx * 0.04, z: z - fz * 0.04, yaw, h: 0.5, front, cam: Math.PI - 0.55 };
    // Mặt sau của ghế (ghế không tựa, ngồi được cả hai phía): quay mặt ngược lại.
    SEATS[k].back = { ...SEATS[k], x: x + fx * 0.04, z: z + fz * 0.04, yaw: yaw + Math.PI, front: V(x - fx * 0.95, 0, z - fz * 0.95) };
    return true;
  };
  // Vòng ghế quanh cây đa, quay mặt vào gốc cây.
  {
    const T = BIG_TREE, R = T.r * T.scale + 3.5;
    [40, 90, 140, 180, 220, 270, 320].forEach(d => { const a = d * Math.PI / 180, x = T.x + Math.sin(a) * R, z = T.z + Math.cos(a) * R; addBench(x, z, Math.atan2(T.x - x, T.z - z)); });
  }
  // Ven vực: dọc mép mỗi tầng, lùi vào 2.4 m, quay mặt ra biển mây; cách nhau khoảng 9 m, bỏ chỗ vướng.
  LEVELS.forEach(l => {
    const cx = l.poly.reduce((s2, q) => s2 + q[0], 0) / l.poly.length, cz = l.poly.reduce((s2, q) => s2 + q[1], 0) / l.poly.length;
    l.poly.forEach(([ax, az], i) => {
      const [bx, bz] = l.poly[(i + 1) % l.poly.length], L = Math.hypot(bx - ax, bz - az);
      if (L < 5) return;
      let nx = (bz - az) / L, nz = -(bx - ax) / L;
      if ((ax + bx) / 2 * 0 + nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
      const n = Math.max(1, Math.floor(L / 7));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, x = ax + (bx - ax) * t - nx * 3.0, z = az + (bz - az) * t - nz * 3.0;
        if (l.id === 1 && z > 123) continue; // lối vào trước cổng
        addBench(x, z, Math.atan2(nx, nz));
      }
    });
  });
  // Đỉnh Bốc Dịch (tầng tròn): vòng ghế quay ra ngoài.
  { const l4 = LEVELS.find(l => l.id === 4), c = ALTAR; for (let d = 0; d < 360; d += 30) { const a = d * Math.PI / 180; addBench(c.x + Math.sin(a) * 14.6, c.z + Math.cos(a) * 14.6, a); } }
  // Vài chỗ ngắm cảnh đặt tay: cạnh lầu chuông, tầng 3 nhìn ra thác.
  [[30.4, 106, Math.PI / 2], [-31, 96, -Math.PI / 2], [20, -31, 2.57], [-37, -12, -Math.PI / 2], [0, -91, 0]].forEach(([x, z, yaw]) => addBench(x, z, yaw));
  // Chỗ ngồi uống trà: bồ đoàn bên bàn trà, ngồi xếp bằng quay mặt vào bàn; camera nhìn chếch từ phía trước.
  const TEA_SEAT = { zone: "tra-dinh", x: PROP["tra-dinh"].x - 0.4, z: PROP["tra-dinh"].z - 0.7, yaw: Math.PI / 2, h: 0.17, cross: true,
    front: V(PROP["tra-dinh"].x - 1.3, 0, PROP["tra-dinh"].z - 0.4), cam: 1.05, camPitch: 0.16, camZoom: 0.42 };

  // Đèn đá dọc lối vào và hai bên chân, đầu mỗi bậc thang.
  [[-3.2, 132], [3.2, 132], [-3.2, 138], [3.2, 138], [-5.6, 87.5], [5.6, 87.5], [-5.6, 66.5], [5.6, 66.5], [-5.6, 24.5], [5.6, 24.5],
    [-5.6, 4.5], [5.6, 4.5], [-5.6, -41.5], [5.6, -41.5], [-4.5, 112], [4.5, 112]].forEach(([x, z]) => place(makeStoneLamp(), x, z, 0.4));
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
    [a, b].forEach(p => { const y0 = groundY(p.x, p.z); scene.add(cyl(0.08, 0.1, p.y - y0, lam("#4a3324"), p.x, (p.y + y0) / 2, p.z, 6)); circles.push({ x: p.x, z: p.z, r: 0.3 }); });
  };
  lanternLine(V(-9, 5.2, 92), V(9, 5.2, 92), 9, [["#e0362c", "#b01a12"], ["#ffb32c", "#a85a00"]]);
  lanternLine(V(-9, 14.2, 34), V(9, 14.2, 34), 9, [["#ffb32c", "#a85a00"], ["#ff7a9c", "#b02a4a"]]);

  // Khói hương liên tục trên các lư
  const smokes = Object.entries(burners).map(([z, b]) => {
    const N = 26, arr = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { seed.push(Math.random()); arr.set([0, Math.random() * 3.2, 0], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ map: tex.smoke, size: 0.9, color: 0xdcd3cc, transparent: true, opacity: 0.22, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(b.position).setY(b.position.y + 2.1 * b.scale.y);
    scene.add(pts);
    return { zone: z, pts, arr, seed, mat, boost: 0 };
  });
  // ---------- Trà Đình Định Tâm bên thác lớn ----------
  const teaHouse = makeTeaPavilion();
  teaHouse.position.copy(PROP["tra-dinh"]);
  teaHouse.userData.zone = "tra-dinh";
  scene.add(teaHouse);
  // Đi vào được: chỉ chặn ở lan can ba mặt (lối vào phía tây), bốn cột và bàn trà.
  obstacles.push({ x0: TEA.x - 2.2, x1: TEA.x + 2.2, z0: TEA.z + 1.8, z1: TEA.z + 2.1 }, { x0: TEA.x - 2.2, x1: TEA.x + 2.2, z0: TEA.z - 2.1, z1: TEA.z - 1.8 },
    { x0: TEA.x + 2.2, x1: TEA.x + 2.5, z0: TEA.z - 2, z1: TEA.z + 2 });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => circles.push({ x: TEA.x + sx * 2.2, z: TEA.z + sz * 1.8, r: 0.2 }));
  circles.push({ x: TEA.x + 0.6, z: TEA.z, r: 0.55 });
  const teaLabel = makeLabel("Trà Đình Định Tâm");
  teaLabel.position.set(PROP["tra-dinh"].x, 5.8, PROP["tra-dinh"].z);
  scene.add(teaLabel);
  {
    // Hơi trà bốc lên từ ấm (dùng chung cơ chế khói hương).
    const N = 14, arr = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) { seed.push(Math.random()); arr.set([0, Math.random() * 1.2, 0], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ map: tex.smoke, size: 0.45, color: 0xf4f0ea, transparent: true, opacity: 0.12, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(teaHouse.userData.teapot).add(teaHouse.position);
    pts.scale.setScalar(0.4);
    scene.add(pts);
    smokes.push({ zone: "tra-dinh", pts, arr, seed, mat, boost: 0 });
  }

  // Cánh hoa rơi
  const PN = 420, parr = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) parr.set([(Math.random() - 0.5) * 56, Math.random() * 14, (Math.random() - 0.5) * 56], i * 3);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(parr, 3));
  // Hoa lá rơi đổi theo mùa (setSeason): đào hồng, sen phớt, lá vàng cam, mai trắng; dịp Tết rơi dày hơn.
  const petalMat = new THREE.PointsMaterial({ map: tex.petal, color: "#ffc2d4", size: 0.28, transparent: true, depthWrite: false, opacity: 0.9 });
  const petals = new THREE.Points(pgeo, petalMat);
  pgeo.setDrawRange(0, 160);
  scene.add(petals);

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
  // Camera xoay quanh nhân vật: camYaw = 0 là đứng phía nam nhìn về chính điện.
  // Kéo chuột / vuốt để xoay, lăn chuột / chụm hai ngón để phóng to thu nhỏ.
  // Góc âm: camera hạ sát đất sau lưng nhân vật và ngước nhìn lên trời.
  const PITCH_MIN = -1.0, PITCH_MAX = 1.15, ZOOM_MIN = 0.55, ZOOM_MAX = 1.5;
  let camYaw = 0, camYawWant = 0, camPitch = 0.6, camPitchWant = 0.6, camDist = 14.5, zoom = 1, zoomWant = 1;

  function fitCamera() {
    const a = W() / H();
    camera.aspect = a;
    camera.fov = a < 0.8 ? 62 : 55;
    camDist = a < 0.8 ? 17.9 : 14.5;
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    night?.setSize(W(), H());
  }
  // indoor (0–1): độ "ở trong điện", kéo camera lại gần và thấp hơn.
  let indoor = 0, lookUpAng = 0;
  function updateCamOff(k = 0) {
    // Ngước lên (camPitch < 0.12): camera thấp dần, gần lại, còn điểm nhìn nâng lên theo góc ngước.
    lookUpAng = Math.max(0, 0.12 - camPitch);
    const near = 1 - 0.45 * Math.min(1, lookUpAng / 0.9);
    const d = THREE.MathUtils.lerp(camDist * zoom * near, Math.min(camDist * zoom * near, 8.5), k);
    const pitch = THREE.MathUtils.lerp(Math.max(camPitch, 0.06), Math.min(Math.max(camPitch, 0.06), 0.36), k);
    const flat = Math.cos(pitch) * d;
    camOff.set(Math.sin(camYaw) * flat, Math.sin(pitch) * d, Math.cos(camYaw) * flat);
  }
  // Hướng camera nhìn tới để đặt camera ra sau lưng khi tới một điện.
  const yawToward = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
  fitCamera();
  addEventListener("resize", fitCamera);

  // prev: vị trí trước bước đi, để biết đang ở trên đài hay dưới sân và trượt dọc mép khi va.
  function collide(p, prev = p) {
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
    // Không bước ra khỏi lan can, không leo vách hay nhảy xuống bậc cao (nền điện, vành đài, sườn núi):
    // thử trượt theo từng trục trước khi đứng lại.
    if (!canStep(prev.x, prev.z, p.x, p.z)) {
      if (canStep(prev.x, prev.z, p.x, prev.z)) p.z = prev.z;
      else if (canStep(prev.x, prev.z, prev.x, p.z)) p.x = prev.x;
      else { p.x = prev.x; p.z = prev.z; }
    }
  }

  // ---------- Tìm đường khi chạm để đi ----------
  // Lưới 1×1 phủ cả núi; ô bị chặn là chỗ không đứng được hoặc vướng vật cản. Hai ô kề nhau chỉ nối
  // được nếu đi từ ô này sang ô kia không vấp bậc cao, nên đường đi tự đi qua bậc thang và cửa điện.
  const GX0 = -46, GZ0 = -96, GW = 93, GH = 252, PAD = 0.5;
  let grid = null, reach = null, cellH = null;
  // Lưới ô 1 m: ô bị chặn, và độ cao mặt đất mỗi ô (tính sẵn một lần để tìm đường nhanh).
  function buildGrid() {
    if (grid) return;
    grid = new Uint8Array(GW * GH); cellH = new Float32Array(GW * GH);
    for (let i = 0; i < grid.length; i++) { grid[i] = blockedAt(cellX(i), cellZ(i)) ? 1 : 0; if (!grid[i]) cellH[i] = heightAt(cellX(i), cellZ(i)); }
  }
  function blockedAt(x, z) {
    if (!walkable(x, z)) return true;
    // Chừa khoảng an toàn quanh chỗ chênh độ cao (mép bậc thang, mép nền điện, vành đài, mép tầng).
    for (const [dx, dz] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) if (!canStep(x, z, x + dx, z + dz)) return true;
    for (const b of obstacles) if (x > b.x0 - PAD && x < b.x1 + PAD && z > b.z0 - PAD && z < b.z1 + PAD) return true;
    for (const c of circles) if (Math.hypot(x - c.x, z - c.z) < c.r + PAD) return true;
    return false;
  }

  const cellOf = (x, z) => Math.round(z - GZ0) * GW + Math.round(x - GX0);
  const cellX = i => (i % GW) + GX0, cellZ = i => Math.floor(i / GW) + GZ0;
  function nearestFree(i) {
    if (!grid[i]) return i;
    for (let r = 1; r < 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const j = i + dz * GW + dx;
      if (j >= 0 && j < grid.length && !grid[j]) return j;
    }
    return -1;
  }
  // A* 8 hướng với hàng đợi ưu tiên dạng heap nhị phân.
  function findPath(a, b) {
    buildGrid();
    const s = nearestFree(cellOf(a.x, a.z)), e = nearestFree(cellOf(b.x, b.z));
    if (s < 0 || e < 0) return null;
    // Đích nằm ngoài vùng đi được liền với cổng: trả về ngay, khỏi quét cả bản đồ.
    if (reach && reach[s] && !reach[e]) return null;
    const g = new Float32Array(grid.length).fill(Infinity), from = new Int32Array(grid.length).fill(-1), heap = [];
    const hx = i => Math.hypot(cellX(i) - cellX(e), cellZ(i) - cellZ(e));
    const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top[1]; };
    g[s] = 0; push(s, hx(s));
    while (heap.length) {
      const i = pop();
      if (i === e) break;
      const ix = i % GW;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = ix + dx, j = i + dz * GW + dx;
        if (nx < 0 || nx >= GW || j < 0 || j >= grid.length || grid[j]) continue;
        if (dx && dz && (grid[i + dx] || grid[i + dz * GW])) continue;
        if (Math.abs(cellH[i] - cellH[j]) > 1.0) continue;
        const ng = g[i] + (dx && dz ? Math.SQRT2 : 1);
        if (ng < g[j]) { g[j] = ng; from[j] = i; push(j, ng + hx(j)); }
      }
    }
    if (from[e] < 0 && s !== e) return null;
    const cells = [];
    for (let i = e; i >= 0; i = from[i]) { cells.push(V(cellX(i), 0, cellZ(i))); if (i === s) break; }
    return cells.reverse();
  }
  // Rút gọn đường: bỏ các điểm giữa nếu đi thẳng được mà không chạm ô bị chặn.
  function clearLine(a, b) {
    const n = Math.ceil(a.distanceTo(b) / 0.4);
    let px = a.x, pz = a.z;
    for (let k = 1; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
      if ((k < n && grid[cellOf(x, z)]) || !canStep(px, pz, x, z)) return false;
      px = x; pz = z;
    }
    return true;
  }
  let route = [];
  function routeTo(t) {
    const cells = findPath(pos, t);
    route = [];
    if (cells) {
      let from = pos.clone();
      for (let k = 1; k < cells.length; k++) {
        if (!clearLine(from, cells[k])) { from = cells[k - 1]; route.push(from); }
      }
    }
    route = route.filter((p, k) => k || p.distanceTo(pos) > 0.6);
    route.push(t);
    target = route.shift();
  }

  const angleLerp = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  };

  // Thêm ?debug vào địa chỉ để xem vị trí nhân vật và thử tìm đường từ console (dùng khi kiểm thử).
  let debugView = null;
  if (new URLSearchParams(location.search).has("debug")) {
    window.__dbg = () => ({ seats: Object.keys(SEATS).length, seat: seat?.zone || null, sitW, pos: pos.toArray(), h: heightAt(pos.x, pos.z), target: target?.toArray(), route: route.length, paused, camYaw });
    window.__go = (x, z) => routeTo(V(x, 0, z));
    window.__seatsReach = (i0 = 0, i1 = 999) => Object.values(SEATS).slice(i0, i1).flatMap(st => [st, st.back].filter(Boolean)).filter(st => { const c = findPath(SPAWN, st.front); return !c || Math.hypot(c[c.length - 1].x - st.front.x, c[c.length - 1].z - st.front.z) > 0.8; }).map(st => [st.zone, +st.x.toFixed(1), +st.z.toFixed(1)]);
    // Giả lập bấm vào một điểm (điện, ghế đá…): đi tới rồi tự mở / ngồi.
    window.__tap = (z, back) => { arriveZone = z; arriveSeat = SEATS[z] ? (back && SEATS[z].back) || SEATS[z] : null; routeTo(arriveSeat ? arriveSeat.front.clone() : SPOT[z].clone()); };
    // Đặt camera cố định để chụp cảnh: __view([x, y, z], [lx, ly, lz]); __view(null) để trả lại.
    window.__view = (p, l) => { debugView = p ? [p, l] : null; };
  }
  // Vận tốc làm mượt (tăng tốc, giảm tốc), nhịp bước theo quãng đường đi được.
  const vel = new THREE.Vector2();
  let speedK = 0;
  // Ngồi: seat = { x, z, yaw, h (mặt ngồi so với đất), cross, front: Vector3 (chỗ đứng trước ghế), zone, cam }.
  let seat = null, sitW = 0, sitMove = 0, sitFrom = null, standing = null;
  const act = { pour: 0, sip: 0, breath: null, pourW: 0, sipW: 0, breathV: 0 };
  let arriveZone = null, camSaved = null, arriveSeat = null;
  function sitAt(st) {
    if (seat === st) return;
    seat = st; sitMove = 0; sitFrom = pos.clone(); standing = null; target = null; route = [];
    vel.set(0, 0);
    if (st.cam != null) camYawWant = st.yaw + st.cam;
    // Hạ camera xuống thấp, lại gần (nhìn rõ dáng ngồi, không bị mái che); đứng dậy thì trả lại.
    if (!camSaved) camSaved = { pitch: camPitchWant, zoom: zoomWant };
    camPitchWant = st.camPitch ?? 0.3;
    zoomWant = st.camZoom ?? 0.7;
    hooks.onSit?.(st.zone);
  }
  function standUp() {
    if (!seat) return;
    standing = seat; seat = null; sitMove = 0; sitFrom = pos.clone();
    if (camSaved) { camPitchWant = camSaved.pitch; zoomWant = camSaved.zoom; camSaved = null; }
    act.pour = act.sip = 0; act.breath = null;
    hooks.onSit?.(null);
  }
  function updatePlayer(dt) {
    let mx = 0, mz = 0;
    if (!paused && !intro) {
      mx = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0) + joy.x;
      mz = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0) + joy.y;
    }
    let len = Math.hypot(mx, mz);
    // Đang ngồi mà bấm đi: đứng dậy trước.
    if (seat && len > 0.12) standUp();
    const busy = seat || standing;
    if (busy) len = 0;
    else if (len > 0.12) {
      target = null; arriveZone = null;
      if (len > 1) { mx /= len; mz /= len; len = 1; }
      // Phím và cần điều khiển đi theo hướng camera đang nhìn.
      const c = Math.cos(camYaw), s = Math.sin(camYaw);
      [mx, mz] = [mx * c + mz * s, -mx * s + mz * c];
    } else if (target && !paused) {
      const dx = target.x - pos.x, dz = target.z - pos.z, dd = Math.hypot(dx, dz);
      // Cua sớm ở điểm rẽ để không khựng; điểm cuối thì chậm dần rồi dừng đúng chỗ.
      if (route.length && dd < 0.9) target = route.shift();
      else if (!route.length && dd < 0.12) { target = null; len = 0; }
      else { mx = dx / dd; mz = dz / dd; len = route.length ? 1 : Math.min(1, dd / 1.2 + 0.25); }
    } else len = 0;
    const kv = 1 - Math.exp(-dt * (len > 0 ? 7 : 10));
    vel.x += (mx * SPEED * len - vel.x) * kv;
    vel.y += (mz * SPEED * len - vel.y) * kv;
    const sp = vel.length();
    if (sp > 0.02 && !busy) {
      const prev = pos.clone();
      pos.x += vel.x * dt;
      pos.z += vel.y * dt;
      collide(pos, prev);
      const moved = Math.hypot(pos.x - prev.x, pos.z - prev.z);
      if (sp > 0.3) wantYaw = Math.atan2(vel.x, vel.y);
      if (target) { stuck = moved < SPEED * dt * 0.15 && len > 0 ? stuck + dt : 0; if (stuck > 0.4) { target = null; route = []; stuck = 0; } }
      walkPhase += moved * 1.85;
    } else if (!busy) vel.set(0, 0);
    speedK += (Math.min(1, sp / SPEED) - speedK) * (1 - Math.exp(-dt * 10));
    if (!target) route = [];
    // Tới nơi đã bấm (điện, lư hương, ghế đá…): quay mặt về đó và tự mở.
    if (arriveZone && !target && sp < 0.4) {
      const z = arriveZone;
      arriveZone = null;
      if (SEATS[z]) { const st = arriveSeat || SEATS[z]; if (Math.hypot(pos.x - st.front.x, pos.z - st.front.z) < 1.2) sitAt(st); }
      else if (near === z) { if (FOCUS[z]) wantYaw = faceYaw(z); hooks.onArrive?.(z); }
    }
    // Ngồi xuống / đứng dậy: trượt từ chỗ đứng vào mặt ghế rồi hạ người (và ngược lại).
    if (seat) {
      sitMove = Math.min(1, sitMove + dt / 0.6);
      const e = sitMove * sitMove * (3 - 2 * sitMove);
      pos.x = mix(sitFrom.x, seat.x, e); pos.z = mix(sitFrom.z, seat.z, e);
      wantYaw = seat.yaw;
      if (sitMove > 0.35) sitW = Math.min(1, sitW + dt / 0.55);
    } else {
      sitW = Math.max(0, sitW - dt / 0.5);
      if (standing && sitW < 0.4) {
        sitMove = Math.min(1, sitMove + dt / 0.45);
        const e = sitMove * sitMove * (3 - 2 * sitMove);
        pos.x = mix(sitFrom.x, standing.front.x, e); pos.z = mix(sitFrom.z, standing.front.z, e);
        if (sitMove >= 1) standing = null;
      }
    }
    yaw = angleLerp(yaw, wantYaw, 1 - Math.exp(-dt * (seat ? 6 : 9)));
    const st = seat || standing;
    player.group.position.set(pos.x, st ? groundY(st.x, st.z) : heightAt(pos.x, pos.z), pos.z);
    player.group.rotation.y = yaw;
    let bow = 0;
    if (bowT >= 0) {
      bowT += dt / 0.9;
      bow = Math.sin(Math.min(bowT, 1) * Math.PI);
      if (bowT >= 1) bowT = -1;
    }
    // Động tác trà: chuyển mượt giữa rót, nâng chén, hít thở.
    const ka = 1 - Math.exp(-dt * 4);
    act.pourW += (act.pour - act.pourW) * ka;
    act.sipW += (act.sip - act.sipW) * ka;
    if (act.breath != null) act.breathV += (act.breath - act.breathV) * (1 - Math.exp(-dt * act.breathRate));
    player.cup.visible = !!(seat && seat.zone === "tra-dinh") || act.sipW > 0.05;
    const T = performance.now() / 1000;
    poseAvatar(player, {
      speed: speedK, phase: walkPhase, sit: sitW * sitW * (3 - 2 * sitW), seat: (st?.h ?? 0.42), cross: st?.cross ? 1 : 0,
      pour: act.pourW, sip: act.sipW, breath: act.breath != null ? act.breathV : undefined, bow
    }, T);
    marker.material.opacity = target ? 0.5 + Math.sin(performance.now() / 150) * 0.2 : Math.max(0, marker.material.opacity - dt * 2);

    const z = zoneAt(pos.x, pos.z);
    if (z !== zone) { zone = z; hooks.onZone?.(z); }
    let n = null;
    for (const k in SPOT) if (pos.distanceTo(SPOT[k]) < ACT_R[k]) n = k;
    if (n !== near) { near = n; hooks.onNear?.(n); }
  }

  // ---------- Khoảnh khắc: camera lia cận khi rút được quẻ rồi chụp lại khung hình ----------
  // Camera đi từ chỗ đang đứng tới sau lưng chếch bên nhân vật, thấp ngang vai, nhìn về điện/tượng;
  // nhân vật vái, khói hương bốc lên; cuối đoạn chụp canvas (ngay sau khi vẽ) và trả về ảnh.
  let cine = null, captureReq = null;
  function moment(z, ms = 2800) {
    return new Promise(resolve => {
      const f = FOCUS[z] || pos, gy = groundY(pos.x, pos.z), room = hallInterior(pos.x, pos.z);
      const dir = V(f.x - pos.x, 0, f.z - pos.z);
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dir.normalize();
      const side = V(-dir.z, 0, dir.x);
      const to = pos.clone().addScaledVector(dir, -3.4).addScaledVector(side, 0.55).setY(gy + 1.9);
      if (room) {
        to.x = Math.min(room.x1, Math.max(room.x0, to.x));
        to.z = Math.min(room.z1, Math.max(room.z0, to.z));
      }
      const lookTo = pos.clone().addScaledVector(dir, 5).setY(gy + (room ? 2.4 : 1.3));
      cine = { t: 0, ms, from: camera.position.clone(), to, lookFrom: look.clone(), lookTo, resolve };
      // Ẩn nhãn tên trên đầu khi camera áp sát.
      player.group.children.forEach(o => { if (o.isSprite) o.visible = false; });
      const s = smokes.find(x => x.zone === z);
      if (s) s.boost = 1;
    });
  }
  function updateCine(dt) {
    cine.t += dt * 1000;
    const k = Math.min(1, cine.t / cine.ms), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(cine.from, cine.to, e);
    look.lerpVectors(cine.lookFrom, cine.lookTo, e);
    camera.lookAt(look);
    // Bắt đầu vái trước khi chụp nửa giây để ảnh chụp đúng lúc cúi sâu nhất.
    const bowAt = cine.ms - 500;
    if (cine.t >= bowAt && cine.t - dt * 1000 < bowAt) bowT = 0;
    if (k >= 1 && !captureReq) captureReq = cine.resolve;
  }

  // Bay vào đình: từ góc nhìn toàn cảnh trên cao (lúc ở màn hình chào) lượn xuống phía trước tam quan rồi
  // hạ về sau lưng nhân vật. Đường bay Bézier bậc ba, điểm nhìn trượt từ giữa núi về cổng rồi về nhân vật.
  let intro = null;
  const bez3 = (a, b, c, d, t, out) => {
    const u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  };
  const bez2 = (a, b, c, t, out) => { const u = 1 - t; return out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t); };
  function startIntro() {
    // Đích: đúng vị trí camera theo sau nhân vật như khi chơi bình thường.
    updateCamOff(0);
    const endLook = V(pos.x, 1.3 + groundY(pos.x, pos.z), pos.z - 2.5), end = endLook.clone().add(camOff);
    const p0 = camera.position.clone();
    intro = {
      t: 0, dur: 4.6,
      p: [p0, V(p0.x * 0.35, Math.max(p0.y, 70), p0.z * 0.35 + 60), V(0, 26, GATE_Z + 70), end],
      l: [V(0, 8, 20), V(0, 5, GATE_Z - 6), endLook]
    };
  }
  function updateIntro(dt) {
    intro.t = Math.min(1, intro.t + dt / intro.dur);
    // Êm ở hai đầu (smootherstep): bắt đầu chậm, lướt nhanh giữa chừng, hạ xuống nhẹ nhàng.
    const x = intro.t, e = x * x * x * (x * (x * 6 - 15) + 10);
    bez3(...intro.p, e, camera.position);
    camera.lookAt(bez2(...intro.l, Math.min(1, e * 1.08), hit));
    gate.visible = true;
    if (intro.t >= 1) {
      look.copy(intro.l[2]);
      lookWant.copy(look);
      intro = null;
      hooks.onIntroDone?.();
    }
  }
  const skipIntro = () => { if (intro && intro.t > 0.05) intro.t = Math.max(intro.t, 0.999); };

  function updateCamera(dt, t) {
    if (!entered) {
      // Trước khi vào đình: bay vòng quanh cả ngọn núi.
      const a = t * 0.03;
      camera.position.set(Math.sin(a) * 165, 85, 25 + Math.cos(a) * 165);
      camera.lookAt(0, 8, 20);
      return;
    }
    if (intro) { updateIntro(dt); return; }
    if (cine) { updateCine(dt); return; }
    // Ẩn tam quan khi nó chắn giữa camera và nhân vật đã đi vào trong sân.
    gate.visible = !(camera.position.z > GATE_Z - 0.5 && pos.z < GATE_Z - 0.5);
    // Góc xoay và độ xa làm mượt riêng, điểm bám theo nhân vật làm mượt riêng,
    // để khi xoay nhanh camera đi vòng quanh nhân vật chứ không cắt ngang qua.
    const ka = 1 - Math.exp(-dt * 12);
    camYaw = angleLerp(camYaw, camYawWant, ka);
    camPitch += (camPitchWant - camPitch) * ka;
    zoom += (zoomWant - zoom) * (1 - Math.exp(-dt * 8));
    // Trong điện: camera thu gần, hạ thấp dưới trần và không ra ngoài tường.
    const room = hallInterior(pos.x, pos.z);
    indoor += ((room ? 1 : 0) - indoor) * (1 - Math.exp(-dt * 4));
    updateCamOff(indoor);
    const k = 1 - Math.exp(-dt * 3.5);
    const gy = groundY(pos.x, pos.z);
    // Trong điện nhìn cao hơn để thấy trọn tượng thần và trần.
    lookWant.set(pos.x - Math.sin(camYaw) * 2.5 * (1 - indoor * 0.6), 1.3 + gy + indoor * (room?.lookUp ?? 1.8), pos.z - Math.cos(camYaw) * 2.5 * (1 - indoor * 0.6));
    look.lerp(lookWant, k);
    camWant.copy(look).add(camOff);
    if (room) {
      camWant.x = Math.min(room.x1, Math.max(room.x0, camWant.x));
      camWant.z = Math.min(room.z1, Math.max(room.z0, camWant.z));
      // Camera ngang tầm điểm nhìn (không cao quá để khỏi chúc xuống, mất đầu tượng).
      camWant.y = Math.min(room.ceil, look.y + 1.2, Math.max(room.camMin, camWant.y));
    }
    // Không để camera chui xuống sườn núi.
    camWant.y = Math.max(terrainY(camWant.x, camWant.z) + 1.2, gy + 1.2, camWant.y);
    camera.position.copy(camWant);
    if (lookUpAng > 0) {
      const flat = Math.hypot(look.x - camWant.x, look.z - camWant.z);
      camera.lookAt(look.x, look.y + Math.tan(lookUpAng) * flat * (1 - indoor * 0.5), look.z);
    } else camera.lookAt(look);
    if (debugView) { camera.position.fromArray(debugView[0]); camera.lookAt(...debugView[1]); }
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
    banners.forEach(b => b.userData.wave(t));
    waterMats.update(dt);
    updateFestival(dt, t);
    koi(t);
    cranes(t);
    summitClouds(t, camera);
    waterMats.setLight(waterLight);
    foams.forEach(f => f.update(t));
    driftClouds(dt);
    mist.userData.update(t);
    // Cánh hoa rơi quanh nhân vật (bản đồ rộng, không rải khắp núi).
    if (entered) petals.position.set(pos.x, groundY(pos.x, pos.z), pos.z);
    const pc = PROP["ao-sen"];
    for (const d of hoaDang) {
      d.born = Math.min(1, d.born + dt * 0.5);
      d.a += d.speed * dt;
      d.r += (Math.min(d.r, 1.9) - d.r) * dt * 0.3;
      d.g.position.set(pc.x + Math.cos(d.a) * d.r * 1.5, 0.2 + Math.sin(t * 1.6 + d.seed) * 0.025, pc.z + Math.sin(d.a) * d.r);
      d.g.rotation.y += dt * 0.15;
      d.g.scale.setScalar(0.4 + d.born * 0.6);
    }
    // Lão đạo sĩ quay sang nhìn người chơi khi lại gần, gật đầu khi được hỏi chuyện.
    const dp = PROP["dao-si"];
    const want = player && Math.hypot(pos.x - dp.x, pos.z - dp.z) < 7 ? Math.atan2(pos.x - dp.x, pos.z - dp.z) : daoYaw;
    daoSi.group.rotation.y = angleLerp(daoSi.group.rotation.y, want, 1 - Math.exp(-dt * 3));
    daoSi.body.position.y = Math.sin(t * 1.4) * 0.015;
    if (daoNod >= 0) {
      daoNod += dt / 1.1;
      daoSi.upper.rotation.x = Math.sin(Math.min(daoNod, 1) * Math.PI * 2) * 0.18;
      if (daoNod >= 1) { daoNod = -1; daoSi.upper.rotation.x = 0; }
    }
    skyTimer -= dt;
    if (skyTimer <= 0) { skyTimer = 5; applySky(); }
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
      r.phase += Math.hypot(dx, dz) * k * 1.85;
      r.spd = (r.spd || 0) + ((moving ? Math.min(1, Math.hypot(dx, dz) * k / dt / SPEED) : 0) - (r.spd || 0)) * k;
      r.av.group.position.set(r.x, groundY(r.x, r.z), r.z);
      r.av.group.rotation.y = r.ry;
      poseAvatar(r.av, { speed: r.spd, phase: r.phase }, now / 1000 + r.x);
    }
  }

  // ---------- Hiệu ứng ----------
  function burst(z, kind) {
    const base = groundY(FOCUS[z].x, FOCUS[z].z);
    const o = FOCUS[z].clone().setY(base + ({ "boc-dich": 0.8, "kim-tien": 2.8, "to-hong": 2.6, "ao-sen": 0.8 }[z] ?? 1.6));
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
        arr[j] += v.x * dt; arr[j + 1] = Math.max(base + 0.05, arr[j + 1] + v.y * dt); arr[j + 2] += v.z * dt;
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
    m.position.set(o.x, groundY(o.x, o.z) + 8, o.z);
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

  // Thỉnh chuông: kéo chày lùi lại, đánh vào chuông, chuông đung đưa và sóng âm lan ra mặt sân.
  let gongBusy = false;
  function gong(onHit) {
    if (gongBusy) return false;
    gongBusy = true;
    const { bell, striker } = bellTower.userData;
    let life = 0, hitDone = false;
    effects.push(dt => {
      life += dt;
      if (life < 0.45) striker.rotation.z = Math.sin(life / 0.45 * Math.PI / 2) * 0.5;
      else if (life < 0.6) striker.rotation.z = 0.5 - (life - 0.45) / 0.15 * 0.95;
      else striker.rotation.z = -0.45 * Math.exp(-(life - 0.6) * 3) * Math.cos((life - 0.6) * 5);
      if (!hitDone && life >= 0.6) { hitDone = true; onHit?.(); wave(); }
      const s = Math.max(0, life - 0.6);
      bell.rotation.z = hitDone ? -0.12 * Math.exp(-s * 1.2) * Math.sin(s * 5) : 0;
      if (life > 3.2) { striker.rotation.z = 0; bell.rotation.z = 0; gongBusy = false; return false; }
      return true;
    });
    return true;
  }
  function wave() {
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 48),
        new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(PROP.chuong.x, 0.08, PROP.chuong.z);
      scene.add(m);
      let life = -k * 0.35;
      effects.push(dt => {
        life += dt;
        if (life < 0) return true;
        m.scale.setScalar(1 + life * 5);
        m.material.opacity = Math.max(0, 0.7 * (1 - life / 1.8));
        if (life > 1.8) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
        return true;
      });
    }
  }

  // ---------- Chạm để đi ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V(0, 1, 0), 0), hit = V();
  // Bỏ những ghế đá không đi tới được (chỗ đứng trước ghế nằm ngoài vùng liền với cổng vào): loang trên lưới.
  {
    buildGrid();
    const seen = (reach = new Uint8Array(grid.length)), q = [nearestFree(cellOf(SPAWN.x, SPAWN.z))];
    seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], ix = i % GW;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ix + dx, j = i + dz * GW + dx;
        if (nx < 0 || nx >= GW || j < 0 || j >= grid.length || grid[j] || seen[j] || Math.abs(cellH[i] - cellH[j]) > 1.0) continue;
        seen[j] = 1; q.push(j);
      }
    }
    for (let k = benches.length - 1; k >= 0; k--) {
      const b = benches[k], st = SEATS[b.userData.zone];
      // Chỗ đứng trước ghế phải là ô trống thật sự (không lấy ô lân cận), nằm trong vùng đi tới được.
      const ok = q => { const c = cellOf(q.x, q.z); return c >= 0 && c < grid.length && !grid[c] && seen[c] && walkable(q.x, q.z); };
      const f = ok(st.front), bk = ok(st.back.front);
      if (!bk) st.back = null;
      if (f || bk) { if (!f) { SEATS[b.userData.zone] = { ...st.back, back: null }; } continue; }
      scene.remove(b);
      benches.splice(k, 1);
      delete SEATS[b.userData.zone];
      b.userData.blockers.forEach(o => circles.splice(circles.indexOf(o), 1));
    }
  }
  const clickables = [...Object.values(halls), ...Object.values(burners), altar, bagua, bellTower, pond, toHong, kimTien, daoSi.group, teaHouse, ...benches];
  // Một ngón / chuột: chạm nhanh để đi, kéo để xoay góc nhìn. Hai ngón: chụm để phóng to thu nhỏ.
  const cv = renderer.domElement, ptrs = new Map(), ROT = 0.006;
  const clampPitch = p => Math.min(PITCH_MAX, Math.max(PITCH_MIN, p));
  const clampZoom = z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  const pinchDist = () => { const [a, b] = [...ptrs.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  let down = null, dragging = false, pinch = 0;
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("pointerdown", e => {
    cv.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { down = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button }; dragging = false; }
    else { down = null; pinch = pinchDist(); }
  });
  // Rê chuột lên chỗ bấm được: đổi con trỏ và báo tên (main hiện nhãn cạnh con trỏ).
  let hoverAt = 0, hoverZone = null;
  cv.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || ptrs.size || !entered || paused) return;
    const now = performance.now();
    if (now - hoverAt < 70) return;
    hoverAt = now;
    const r = cv.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let z = null;
    for (let o = ray.intersectObjects(clickables, true)[0]?.object; o && !z; o = o.parent) z = o.userData?.zone || null;
    cv.style.cursor = z ? "pointer" : "";
    if (z !== hoverZone || z) { hoverZone = z; hooks.onHover?.(z, e.clientX - r.left, e.clientY - r.top, z && seat?.zone === z); }
  });
  cv.addEventListener("pointerleave", () => { hoverZone = null; cv.style.cursor = ""; hooks.onHover?.(null); });
  cv.addEventListener("pointermove", e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!entered) return;
    if (ptrs.size >= 2) {
      const d = pinchDist();
      if (pinch > 0 && d > 0) zoomWant = clampZoom(zoomWant * pinch / d);
      pinch = d;
      return;
    }
    if (down && !dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { dragging = true; cv.classList.add("dragging"); }
    if (dragging) {
      camYawWant -= dx * ROT;
      camPitchWant = clampPitch(camPitchWant + dy * ROT * 0.7);
    }
  });
  const release = e => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = 0;
    if (!ptrs.size) cv.classList.remove("dragging");
  };
  cv.addEventListener("pointercancel", e => { release(e); down = null; });
  cv.addEventListener("wheel", e => {
    if (!entered) return;
    e.preventDefault();
    zoomWant = clampZoom(zoomWant * Math.exp(e.deltaY * 0.0012));
  }, { passive: false });
  cv.addEventListener("pointerup", e => {
    release(e);
    const tap = down && !dragging && down.button === 0;
    const d = down;
    down = null;
    if (intro) { skipIntro(); return; }
    if (!tap || !entered || paused) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y), quick = performance.now() - d.t < 450;
    if (moved > 12 || !quick) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickables, true);
    let z = null;
    for (let o = hits[0]?.object; o && !z; o = o.parent) z = o.userData?.zone || null;
    let t = null;
    if (z && SEATS[z]) {
      // Ghế đá: đang ngồi chính ghế này thì đứng dậy, không thì đi tới trước ghế rồi ngồi.
      const S0 = SEATS[z];
      if (seat && seat.zone === z) { standUp(); return; }
      // Người chơi đang đứng phía nào của ghế thì ngồi quay mặt về phía đó.
      const side = (pos.x - S0.x) * Math.sin(S0.yaw) + (pos.z - S0.z) * Math.cos(S0.yaw);
      arriveSeat = side < 0 && S0.back ? S0.back : S0;
      t = arriveSeat.front.clone();
    } else if (z) {
      // Đứng sẵn ở đó thì mở luôn, không cần đi.
      if (near === z && !seat) { if (FOCUS[z]) wantYaw = faceYaw(z); hooks.onArrive?.(z); return; }
      t = SPOT[z].clone();
    }
    else {
      // Chạm xuống mặt sân các tầng, bậc thang hay sườn núi: lấy điểm chạm nếu đứng được ở đó.
      const gh = ray.intersectObjects(walkMeshes.filter(m => !m.userData.zone), true)[0];
      if (gh && walkable(gh.point.x, gh.point.z)) t = V(gh.point.x, 0, gh.point.z);
    }
    if (!t) return;
    if (seat) standUp();
    arriveZone = z;
    routeTo(t);
    stuck = 0;
    marker.position.set(t.x, 0.04 + heightAt(t.x, t.z), t.z);
    marker.material.opacity = 0.8;
  });

  const KEYMAP = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
  addEventListener("keydown", e => {
    const k = KEYMAP[e.code];
    if (!k || typing(e) || !entered || paused) return;
    if (intro) skipIntro();
    keys.add(k);
    e.preventDefault();
  });
  addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());

  // ---------- Cá chép, hạc, mây trên đỉnh ----------
  const koi = makeKoiPonds(scene, [
    ...[[WATER.spring, lv(3)], [WATER.pool2, lv(2)], [WATER.pool1, lv(1)]].map(([p, y]) => ({ x: p.x, y: y + 0.14, z: p.z, rx: p.w / 2 * 0.85, rz: p.d / 2 * 0.85 })),
    { x: POND.x, y: 0.14, z: POND.z, rx: POND.w / 2 * 0.8, rz: POND.d / 2 * 0.8 }
  ]);
  const cranes = makeCranes(scene, { center: [0, 25], count: 7 });
  const summitClouds = makeSummitClouds(scene, mist.children[0].material, { x: ALTAR.x, y: altarBase(), z: ALTAR.z, r: 26 });

  // ---------- Ban đêm: phát sáng, quầng đèn, đom đóm quanh ao và bồn hoa ----------
  night = await makeNight(renderer, scene, camera, tex.glow, {
    fireflySpots: [
      ...BEDS.map(([x, z]) => [x, groundY(x, z), z, 3]),
      [POND.x, 0, POND.z, 6],
      ...[[WATER.spring, 18], [WATER.pool2, 9], [WATER.pool1, 0]].map(([p, y]) => [p.x, y, p.z, 5])
    ]
  });
  night.setNight(nightLevel);

  // ---------- Vòng lặp ----------
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (player && entered) updatePlayer(dt);
    updateCamera(dt, t);
    updateAmbient(dt, t);
    updateRemotes(dt);
    night.update(t);
    night.render();
    // Chụp ngay sau khi vẽ (cùng khung hình) nên không cần preserveDrawingBuffer.
    if (captureReq) {
      const done = captureReq;
      captureReq = null;
      cine = null;
      player.group.children.forEach(o => { if (o.isSprite) o.visible = true; });
      try { renderer.domElement.toBlob(b => done(b), "image/jpeg", 0.92); } catch { done(null); }
    }
  });

  const faceYaw = z => Math.atan2(FOCUS[z].x - pos.x, FOCUS[z].z - pos.z);

  return {
    enter({ name, color }) {
      player = makeAvatar(color, name, tex);
      scene.add(player.group);
      pos.copy(SPAWN);
      yaw = wantYaw = Math.PI;
      camYaw = camYawWant = 0;
      look.set(pos.x, 1.3, pos.z - 2.5);
      entered = true;
      startIntro();
      hooks.onZone?.(zone);
    },
    setPaused(p) { paused = p; if (p) { keys.clear(); target = null; } },
    setJoystick(x, y) { joy.x = x; joy.y = y; },
    teleport(z) {
      const s = SPOT[z] || SPAWN;
      pos.copy(s);
      target = null;
      route = [];
      seat = standing = null; sitW = 0; arriveZone = null; camSaved = null; intro = null;
      act.pour = act.sip = 0; act.breath = null;
      if (FOCUS[z]) {
        yaw = wantYaw = faceYaw(z);
        camYaw = camYawWant = yawToward(pos, FOCUS[z]);
      }
      indoor = hallInterior(pos.x, pos.z) ? 1 : 0;
      updateCamOff(indoor);
      look.set(pos.x - Math.sin(camYaw) * 2.5, 1.3 + groundY(pos.x, pos.z), pos.z - Math.cos(camYaw) * 2.5);
      camera.position.copy(look).add(camOff);
    },
    // Quay nhân vật về phía điện và đưa camera ra sau lưng để thấy rõ nghi lễ.
    moment,
    face(z) {
      if (!FOCUS[z]) return;
      wantYaw = faceYaw(z);
      camYawWant = yawToward(pos, FOCUS[z]);
    },
    // Giờ trong ngày (0–24) để xem thử cảnh ngày/đêm; null = theo giờ máy.
    // Giờ đang dùng trong game (giờ máy, hoặc giờ đặt bằng ?gio=).
    hour() { const d = new Date(); return hourOverride ?? d.getHours() + d.getMinutes() / 60; },
    festival: setFestival,
    // occ từ calendar.occasion(): kiểu hoa lá rơi, độ dày, cỡ trăng đêm rằm.
    setSeason(occ) {
      const P = { dao: ["#ffc2d4", 0.28], sen: ["#ffdbe6", 0.26], la: ["#f0a040", 0.34], mai: ["#fff6e0", 0.24] }[occ.petal] || ["#ffc2d4", 0.28];
      petalMat.color.set(P[0]);
      petalMat.size = P[1];
      pgeo.setDrawRange(0, Math.min(PN, Math.round(160 * occ.density)));
      moonBoost = occ.moon || 1;
      applySky();
    },
    setHour(h) { hourOverride = Number.isFinite(h) ? ((h % 24) + 24) % 24 : null; applySky(); },
    bow() { bowT = 0; },
    // Ngồi uống trà (bồ đoàn ở Trà Đình) / đứng dậy; isSeated: đang ngồi ở đâu (zone hoặc null).
    sit(z) { if (z === "tra-dinh") sitAt(TEA_SEAT); else if (SEATS[z]) sitAt(SEATS[z]); },
    stand() { standUp(); },
    seated() { return seat?.zone || null; },
    // Động tác khi ngồi trà: "pour" rót, "sip" nâng chén uống, "in"/"hold"/"out" hít – giữ – thở (ms: độ dài nhịp), "rest".
    tea(kind, ms = 1000) {
      act.pour = kind === "pour" ? 1 : 0;
      act.sip = kind === "sip" ? 1 : 0;
      if (kind === "in" || kind === "hold" || kind === "out") {
        if (act.breath == null) act.breathV = 0;
        act.breath = kind === "out" ? -1 : 1;
        act.breathRate = kind === "hold" ? 0.5 : 3.2 / (ms / 1000);
      } else if (kind === "rest") act.breath = null;
    },
    getState() { return { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), ry: +yaw.toFixed(2) }; },
    fx: {
      // Hơi trà (Trà Đình) hoặc khói hương bốc mạnh lên.
      steam(z) { const s = smokes.find(x => x.zone === z); if (s) s.boost = 1; },
      incense(z) {
        const b = burners[z];
        if (!b) return;
        for (let i = 0; i < 3; i++) addStick(b);
        const s = smokes.find(x => x.zone === z);
        if (s) s.boost = 1;
      },
      burst(z) {
        if (z === "tai-than" || z === "kim-tien") burst(z, "coin");
        else if (z === "nguyet-lao" || z === "to-hong") burst(z, "heart");
        else if (z === "boc-dich") { burst(z, "blue"); spinBoost = 1; }
        else if (PROP[z]) burst(z, "spark");
        else { burst(z, "spark"); pillar(z); }
      },
      gong,
      hoaDang(color) { addHoaDang(color, Math.PI / 2 + (Math.random() - 0.5) * 0.6, true); },
      ribbon(n = 1, fresh = true) { for (let i = 0; i < n; i++) addRibbon(fresh); },
      daoSiNod() { daoNod = 0; }
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
          if (walkable(d.x, d.z)) { r.tx = d.x; r.tz = d.z; }
        }
        r.seen = performance.now();
      },
      remove(id) { const r = remotes.get(id); if (r) { scene.remove(r.av.group); remotes.delete(id); } },
      has(id) { return remotes.has(id); },
      count() { return remotes.size; }
    }
  };
}
