// Sự sống trong cảnh: cá chép bơi trong các ao, đàn hạc bay lượn quanh núi, mây lững lờ trôi qua đỉnh núi.
import * as THREE from "three";

// ---------- Cá chép ----------
// Thân cá dẹt hình giọt nước, vây đuôi vẫy; màu đỏ cam, trắng đỏ, vàng.
function makeKoi(color, spot) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), new THREE.MeshLambertMaterial({ color }));
  body.scale.set(0.55, 0.32, 1.35);
  g.add(body);
  if (spot) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 5), new THREE.MeshLambertMaterial({ color: spot }));
    s.scale.set(0.7, 0.4, 1);
    s.position.set(0, 0.03, 0.06);
    g.add(s);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 4), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.85 }));
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(1, 1, 0.25);
  tail.position.z = -0.27;
  const tailPivot = new THREE.Group();
  tailPivot.position.z = -0.16;
  tail.position.z = -0.11;
  tailPivot.add(tail);
  g.add(tailPivot);
  g.userData.tail = tailPivot;
  return g;
}

// ponds: [{ x, y, z, rx, rz }] — tâm và hai bán kính mặt nước; mỗi ao vài con cá.
export function makeKoiPonds(scene, ponds) {
  const COLORS = [["#f2683a", "#ffffff"], ["#ffffff", "#e0402a"], ["#f2b632", null], ["#e8502e", null], ["#fff4e0", "#f08a30"]];
  const fish = [];
  ponds.forEach((p, pi) => {
    const n = Math.max(3, Math.round((p.rx + p.rz) * 0.9));
    for (let i = 0; i < n; i++) {
      const [c, s] = COLORS[(i + pi) % COLORS.length];
      const k = makeKoi(c, s);
      scene.add(k);
      fish.push({ k, p, a: Math.random() * Math.PI * 2, r: 0.35 + Math.random() * 0.45, w: (0.25 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1), seed: Math.random() * 9 });
    }
  });
  return t => {
    for (const f of fish) {
      const a = f.a + t * f.w, rr = f.r + Math.sin(t * 0.4 + f.seed) * 0.12;
      const x = f.p.x + Math.cos(a) * f.p.rx * rr, z = f.p.z + Math.sin(a) * f.p.rz * rr;
      const dx = -Math.sin(a) * f.p.rx * Math.sign(f.w), dz = Math.cos(a) * f.p.rz * Math.sign(f.w);
      f.k.position.set(x, f.p.y + 0.04, z);
      f.k.rotation.y = Math.atan2(dx, dz);
      f.k.userData.tail.rotation.y = Math.sin(t * 7 + f.seed) * 0.5;
    }
  };
}

// ---------- Hạc ----------
// Thân trắng, cổ dài, đỉnh đầu đỏ, chót cánh đen; cánh vỗ chậm rồi lượn.
function makeCrane() {
  const white = new THREE.MeshLambertMaterial({ color: "#f6f4ee" }), black = new THREE.MeshLambertMaterial({ color: "#1d1a1a" });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 6), white);
  body.scale.set(0.6, 0.55, 1.6);
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.1, 6), white);
  neck.rotation.x = Math.PI / 2 - 0.25;
  neck.position.set(0, 0.12, 0.95);
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), white);
  head.position.set(0, 0.26, 1.5);
  g.add(head);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshLambertMaterial({ color: "#d8202a" }));
  crown.position.set(0, 0.34, 1.5);
  g.add(crown);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.32, 5), new THREE.MeshLambertMaterial({ color: "#c9b48a" }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.24, 1.72);
  g.add(beak);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), black);
  legs.rotation.x = Math.PI / 2;
  legs.position.set(0, -0.08, -0.95);
  g.add(legs);
  const wings = [];
  [-1, 1].forEach(s => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.18, 0.08, 0.1);
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.7), white);
    w.position.x = s * 0.8;
    pivot.add(w);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 0.6), black);
    tip.position.x = s * 1.85;
    pivot.add(tip);
    g.add(pivot);
    wings.push({ pivot, s });
  });
  g.userData.wings = wings;
  return g;
}

// Đàn hạc bay vòng quanh núi ở các độ cao khác nhau.
export function makeCranes(scene, { center = [0, 25], count = 6 } = {}) {
  const birds = [];
  for (let i = 0; i < count; i++) {
    const c = makeCrane();
    c.scale.setScalar(0.9 + Math.random() * 0.4);
    scene.add(c);
    birds.push({ c, r: 45 + Math.random() * 40, y: 32 + Math.random() * 18, w: 0.05 + Math.random() * 0.03, a: Math.random() * Math.PI * 2, seed: Math.random() * 9 });
  }
  return t => {
    for (const b of birds) {
      const a = b.a + t * b.w;
      const y = b.y + Math.sin(t * 0.3 + b.seed) * 4;
      b.c.position.set(center[0] + Math.cos(a) * b.r, y, center[1] + Math.sin(a) * b.r * 0.8);
      b.c.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.8);
      // Vỗ cánh vài nhịp rồi lượn.
      const flap = Math.sin(t * 0.5 + b.seed) > 0 ? Math.sin(t * 5 + b.seed) * 0.6 : 0.08;
      b.c.userData.wings.forEach(({ pivot, s }) => { pivot.rotation.z = s * flap; });
    }
  };
}

// ---------- Mây trôi qua đỉnh núi ----------
// Các cụm mây thấp bay ngang qua đài trên đỉnh, mỏng dần khi tới gần camera để không che tầm nhìn.
export function makeSummitClouds(scene, cloudMat, { x = 0, y = 28, z = -76, r = 26 } = {}) {
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(cloudMat.clone());
    s.material.userData.cloud = true;
    const size = 10 + Math.random() * 10;
    s.scale.set(size, size * 0.45, 1);
    scene.add(s);
    puffs.push({ s, off: Math.random() * r * 2, dz: (Math.random() - 0.5) * r * 1.4, h: y + 4 + Math.random() * 6, v: 1.2 + Math.random() * 1.4 });
  }
  return (t, camera) => {
    for (const p of puffs) {
      const px = x - r + ((p.off + t * p.v) % (r * 2));
      p.s.position.set(px, p.h, z + p.dz);
      const d = camera.position.distanceTo(p.s.position);
      // Mép trôi vào ra mờ dần; sát camera thì mỏng đi.
      const edge = Math.min(1, (r - Math.abs(px - x)) / 6);
      p.s.material.opacity = 0.32 * Math.max(0, edge) * Math.min(1, Math.max(0, (d - 9) / 18));
    }
  };
}
