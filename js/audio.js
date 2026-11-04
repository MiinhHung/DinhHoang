// Âm thanh tổng hợp bằng Web Audio: chuông đồng, mõ, nhạc thiền sinh tự động. Không cần file âm thanh.
let ctx = null, master = null, musicBus = null, sfxBus = null;
let enabled = true, started = false, musicTimer = null, zone = "san";

const PENTA = { san: [220, 247, 294, 330, 392], "tam-thanh": [196, 220, 262, 294, 330], "tai-than": [262, 294, 330, 392, 440], "nguyet-lao": [294, 330, 370, 440, 494], "boc-dich": [174, 196, 233, 262, 311] };

export function initAudio() {
  if (started) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
  started = true;
  startDrone();
  scheduleMusic();
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (enabled) ctx.resume();
  });
}

export function setSound(on) {
  enabled = on;
  if (!ctx) return;
  if (on) ctx.resume();
  master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.15);
}
export const soundOn = () => enabled;
export function setZone(z) { zone = z; }

function env(g, t, a, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
}

// Chuông đồng: các bội âm không điều hòa, ngân dài.
export function bell(base = 196, vol = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [[1, 1], [2.0, 0.55], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]].forEach(([r, a], i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = base * r; o.detune.value = (i % 2 ? 4 : -3);
    env(g, t, 0.005, vol * a, 4.5 - i * 0.6);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 5);
  });
}

// Mõ gỗ: tiếng gõ ngắn, đục.
export function mo(vol = 0.6) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = "triangle"; o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.08);
  f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 3;
  env(g, t, 0.002, vol, 0.18);
  o.connect(f).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.3);
}

// Tiếng leng keng kim tiền.
export function coins(n = 6) {
  if (!ctx) return;
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 0.07 + Math.random() * 0.04;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 1800 + Math.random() * 1600;
    env(g, t, 0.002, 0.12, 0.25);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.35);
  }
}

// Chuông gió nhẹ cho Nguyệt Lão.
export function chime() {
  if (!ctx) return;
  [1320, 1568, 1760, 2093].forEach((fr, i) => {
    const t = ctx.currentTime + i * 0.12 + Math.random() * 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = fr;
    env(g, t, 0.003, 0.08, 1.6);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 2);
  });
}

export function whoosh() {
  if (!ctx) return;
  const t = ctx.currentTime, len = 0.6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = "bandpass"; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2400, t + len);
  g.gain.value = 0.25;
  s.connect(f).connect(g).connect(sfxBus); s.start(t);
}

function startDrone() {
  [[110, 0.05], [164.8, 0.03], [220.5, 0.015]].forEach(([fr, v]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sine"; o.frequency.value = fr; g.gain.value = v;
    lfo.frequency.value = 0.05 + Math.random() * 0.08; lg.gain.value = v * 0.6;
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(musicBus); o.start(); lfo.start();
  });
}

// Nhạc thiền: những nốt ngũ cung thưa, ngẫu nhiên, theo không khí từng điện.
function scheduleMusic() {
  clearTimeout(musicTimer);
  const play = () => {
    if (ctx && enabled && !document.hidden) {
      const scale = PENTA[zone] || PENTA.san;
      const fr = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = fr; o2.type = "triangle"; o2.frequency.value = fr * 2; o2.detune.value = 6;
      const g2 = ctx.createGain(); g2.gain.value = 0.2;
      env(g, t, 0.01, 0.16, 2.8);
      o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
      o.start(t); o2.start(t); o.stop(t + 3); o2.stop(t + 3);
      if (zone === "tai-than" && Math.random() < 0.35) setTimeout(() => mo(0.25), 600);
      if (zone === "nguyet-lao" && Math.random() < 0.2) setTimeout(chime, 900);
    }
    musicTimer = setTimeout(play, 1600 + Math.random() * 2600);
  };
  play();
}
