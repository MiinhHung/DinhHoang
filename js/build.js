// Vật liệu, hình khối và chữ vẽ bằng canvas dùng chung cho cảnh 3D.
import * as THREE from "three";

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Vật liệu & hình khối ----------
const mats = new Map();
export function lam(color, emissive) {
  const k = color + "|" + (emissive || "");
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 }));
  return mats.get(k);
}
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
export const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const cyl = (rt, rb, h, mat, x, y, z, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
export const ball = (r, mat, x, y, z, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0)), mat, x, y, z);

export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export const HAN = '"Noto Serif TC", "Songti SC", "SimSun", serif';
export const SERIF = '"Noto Serif", "Times New Roman", serif';

export function boardTexture(text, { w = 512, h = 160, bg = "#5a0f12", fg = "#f2c76a", font = HAN, size = 96, vertical = false } = {}) {
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

export function boardMesh(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

export function hipRoof(w, d, h, mat, topRatio) {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * topRatio, Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w, h, d);
  return m;
}
