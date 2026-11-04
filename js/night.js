// Ban đêm lung linh: hậu kỳ phát sáng (bloom) chỉ chạy khi trời tối, quầng sáng quanh đèn lồng và đèn đá,
// đèn sáng rực hơn về đêm, đom đóm bay quanh ao và bồn hoa.
import * as THREE from "three";

// Màu phát sáng (emissive) của các loại đèn: đèn lồng đỏ, vàng, hồng; đèn đá; đèn mái xanh ở Ao Sen.
const GLOW = {
  "b01a12": "#ff7a4a", "a85a00": "#ffc060", "b02a4a": "#ff8fb0", "8a5a10": "#ffd98a", "a86a10": "#ffd98a", "7a4a00": "#ffd36b"
};

export async function makeNight(renderer, scene, camera, glowTex, { fireflySpots = [] } = {}) {
  // ---- Hậu kỳ phát sáng ----
  let composer = null, bloom = null;
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js")
    ]);
    composer = new EffectComposer(renderer);
    // Điện thoại: hậu kỳ ở độ phân giải thấp hơn cho nhẹ máy.
    composer.setPixelRatio(Math.min(renderer.getPixelRatio(), matchMedia("(pointer: coarse)").matches ? 1 : 1.5));
    composer.addPass(new RenderPass(scene, camera));
    const size = renderer.getSize(new THREE.Vector2());
    bloom = new UnrealBloomPass(size, 0, 0.55, 0.78);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  } catch (e) {
    console.warn("Không bật được hiệu ứng phát sáng ban đêm.", e);
  }

  // ---- Quầng sáng quanh đèn và vật liệu đèn ----
  const glowMats = new Set(), haloMats = new Map(), halos = [];
  scene.traverse(o => {
    const m = o.isMesh && o.material;
    const key = m?.emissive && m.emissive.getHexString();
    if (!key || !GLOW[key]) return;
    glowMats.add(m);
    if (!haloMats.has(key)) {
      haloMats.set(key, new THREE.SpriteMaterial({
        map: glowTex, color: GLOW[key], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      }));
    }
    const s = new THREE.Sprite(haloMats.get(key));
    const big = key === "8a5a10" || key === "a86a10";
    s.scale.setScalar(big ? 2.6 : 2.2);
    s.raycast = () => {};
    o.add(s);
    halos.push(s);
  });

  // ---- Mây và mù (sprite không chịu ánh sáng): nhuộm tối theo đêm để khỏi trắng toát ----
  const cloudMats = new Set();
  scene.traverse(o => { if (o.isSprite && o.material.userData.cloud) cloudMats.add(o.material); });
  const dayCloud = new THREE.Color("#ffffff"), nightCloud = new THREE.Color("#3c4068");

  // ---- Đom đóm ----
  const N = Math.max(1, fireflySpots.length) * 14;
  const base = new Float32Array(N * 3), seed = new Float32Array(N), arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [x, y, z, r = 4] = fireflySpots[i % Math.max(1, fireflySpots.length)] || [0, 0, 0];
    const a = Math.random() * Math.PI * 2, d = Math.random() * r;
    base.set([x + Math.cos(a) * d, y + 0.5 + Math.random() * 2.2, z + Math.sin(a) * d], i * 3);
    seed[i] = Math.random() * 100;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const fmat = new THREE.PointsMaterial({ map: glowTex, color: 0xd8ff7a, size: 0.32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flies = new THREE.Points(fgeo, fmat);
  flies.frustumCulled = false;
  scene.add(flies);

  let night = 0;
  return {
    // n: mức tối (0 ban ngày, 1 ban đêm), tính từ giờ trong ngày.
    setNight(n) {
      night = n;
      glowMats.forEach(m => { m.emissiveIntensity = 1 + n * 2.2; });
      haloMats.forEach(m => { m.opacity = n * 0.85; });
      if (bloom) bloom.strength = n * 0.95;
      cloudMats.forEach(m => m.color.copy(dayCloud).lerp(nightCloud, n * 0.85));
      flies.visible = n > 0.05;
    },
    update(t) {
      if (night <= 0.05) return;
      for (let i = 0; i < N; i++) {
        const s = seed[i], j = i * 3;
        arr[j] = base[j] + Math.sin(t * 0.5 + s) * 0.8;
        arr[j + 1] = base[j + 1] + Math.sin(t * 0.9 + s * 1.3) * 0.4;
        arr[j + 2] = base[j + 2] + Math.cos(t * 0.4 + s * 0.7) * 0.8;
      }
      fgeo.attributes.position.needsUpdate = true;
      // Đom đóm chớp tắt nhẹ.
      fmat.opacity = night * (0.75 + Math.sin(t * 3) * 0.25);
    },
    render() {
      if (composer && night > 0.05) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) { composer?.setSize(w, h); }
  };
}
