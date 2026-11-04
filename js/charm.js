// Vẽ lá bùa độc bản ngay trên máy người chơi (canvas 1080×1920, khung Story 9:16). Không gửi gì lên máy chủ.
// Chữ quan trọng nằm trong khoảng y 270–1650 để không bị thanh giao diện Story che.
const W = 1080, H = 1920;
const HAN = '"Noto Serif TC", "Songti SC", "SimSun", serif';
const SERIF = '"Noto Serif", "Times New Roman", serif';

const THEME = {
  "nguyet-lao": { bg: ["#fff1ef", "#f4b8c4"], ink: "#8a1c2c", accent: "#c9354a", glyph: "緣", side: ["紅線", "天作之合"], title: "Bùa Duyên", from: "Nguyệt Lão Điện · 月老殿" },
  "tai-than": { bg: ["#fbe58a", "#e9ae34"], ink: "#9e1218", accent: "#b3242a", glyph: "財", side: ["招財進寶", "金錢吉祥"], title: "Bùa Tài Lộc", from: "Tài Thần Điện · 財神殿" },
  "boc-dich": { bg: ["#f5f2ea", "#c6d3ee"], ink: "#1d2a4a", accent: "#3b5ba5", glyph: "卦", side: ["卜易", "吉祥"], title: "Quẻ Kinh Dịch", from: "Bốc Dịch Đài · 卜易台" },
  "tam-thanh": { bg: ["#fff6dc", "#efcf8f"], ink: "#7a1414", accent: "#b3242a", glyph: "福", side: ["玉清上清", "太清福壽"], title: "Bùa Bình An", from: "Tam Thanh Điện · 三清殿" }
};

async function fontsReady() {
  if (!document.fonts?.load) return;
  const all = Promise.all([
    document.fonts.load(`700 200px ${HAN}`, "緣財卦福紅線天作之合招進寶金錢吉祥卜易玉清上太壽月老殿神三台道"),
    document.fonts.load(`700 40px ${SERIF}`, "Bùa Duyên Đình Hoàng"),
    document.fonts.load(`italic 40px ${SERIF}`, "Nguyện")
  ]).catch(() => {});
  await Promise.race([all, new Promise(r => setTimeout(r, 2500))]);
}

function wrap(g, text, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function frame(g, t) {
  g.strokeStyle = t.accent;
  g.lineWidth = 8; g.strokeRect(40, 40, W - 80, H - 80);
  g.lineWidth = 2; g.strokeRect(62, 62, W - 124, H - 124);
  // Góc hoa văn mây
  [[62, 62, 1, 1], [W - 62, 62, -1, 1], [62, H - 62, 1, -1], [W - 62, H - 62, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.lineWidth = 4;
    g.beginPath(); g.arc(34, 34, 22, Math.PI, Math.PI * 2.4); g.stroke();
    g.beginPath(); g.arc(34, 34, 10, 0, Math.PI * 2); g.stroke();
    g.restore();
  });
}

function vertical(g, text, x, y, size, color) {
  g.font = `700 ${size}px ${HAN}`;
  g.fillStyle = color;
  g.textAlign = "center"; g.textBaseline = "middle";
  [...text].forEach((c, i) => g.fillText(c, x, y + i * size * 1.15));
}

function hexagram(g, lines, cx, cy, color) {
  const w = 280, h = 28, gap = 22, total = 6 * h + 5 * gap;
  g.fillStyle = color;
  lines.forEach((l, i) => {
    const y = cy + total / 2 - (i + 1) * h - i * gap;
    if (l.yang) g.fillRect(cx - w / 2, y, w, h);
    else { g.fillRect(cx - w / 2, y, w * 0.42, h); g.fillRect(cx + w * 0.08, y, w * 0.42, h); }
    if (l.moving) { g.beginPath(); g.arc(cx + w / 2 + 24, y + h / 2, 8, 0, Math.PI * 2); g.fill(); }
  });
}

function seal(g, x, y, ink) {
  g.save();
  g.translate(x, y); g.rotate(-0.06);
  g.fillStyle = "#b3242a"; g.globalAlpha = 0.9;
  g.fillRect(-62, -62, 124, 124);
  g.globalAlpha = 1;
  g.strokeStyle = "#ffe9c8"; g.lineWidth = 4; g.strokeRect(-52, -52, 104, 104);
  g.fillStyle = "#ffe9c8"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 44px ${HAN}`;
  g.fillText("道", 0, -20); g.fillText("緣", 0, 26);
  g.restore();
}

export async function drawCharm(r, cfg) {
  await fontsReady();
  const t = THEME[r.kind] || THEME["tam-thanh"];
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, t.bg[0]); bg.addColorStop(1, t.bg[1]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3500; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "90,50,20" : "255,255,255"},${Math.random() * 0.07})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 2, 2);
  }
  frame(g, t);

  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = t.ink;
  g.font = `700 38px ${SERIF}`;
  g.fillText(t.from, W / 2, 290);
  g.fillRect(W / 2 - 100, 314, 200, 3);

  vertical(g, t.side[0], 140, 400, 66, t.accent);
  vertical(g, t.side[1], W - 140, 400, 66, t.accent);

  const cy = 630;
  const halo = g.createRadialGradient(W / 2, cy, 20, W / 2, cy, 260);
  halo.addColorStop(0, "rgba(255,255,255,.75)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = halo; g.beginPath(); g.arc(W / 2, cy, 260, 0, Math.PI * 2); g.fill();
  g.strokeStyle = t.accent; g.lineWidth = 3;
  g.beginPath(); g.arc(W / 2, cy, 228, 0, Math.PI * 2); g.stroke();
  if (r.kind === "boc-dich" && r.lines) {
    hexagram(g, r.lines, W / 2, cy, t.ink);
  } else {
    g.fillStyle = t.ink; g.textBaseline = "middle";
    g.font = `700 320px ${HAN}`;
    g.fillText(t.glyph, W / 2, cy + 12);
  }
  if (r.kind === "nguyet-lao") {
    g.strokeStyle = "#d0202e"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(150, cy + 240);
    g.bezierCurveTo(380, cy + 140, 700, cy + 340, 930, cy + 215); g.stroke();
  }

  g.textBaseline = "alphabetic";
  const sub = [t.title, r.card?.lv, r.no ? `số ${r.no}` : r.card?.so ? `quẻ ${r.card.so}` : ""].filter(Boolean).join(" · ");
  g.font = `700 68px ${SERIF}`;
  const tLines = wrap(g, r.card?.ten || "Tâm an vạn sự an", 800).slice(0, 2);
  g.font = `italic 42px ${SERIF}`;
  const bLines = wrap(g, r.blessing, 800).slice(0, r.code ? 2 : 4);
  // Canh khối chữ vào giữa khoảng trống dưới vòng tròn (y 900–1420), dù lời chúc dài hay ngắn.
  const span = 84 + (tLines.length - 1) * 82 + 92 + (bLines.length - 1) * 60 + (r.code ? 162 : 0);
  let y = 932 + Math.max(0, (520 - span - 42) / 2);
  g.fillStyle = t.accent; g.font = `700 32px ${SERIF}`;
  g.fillText(sub.toUpperCase(), W / 2, y);
  y += 84;
  g.fillStyle = t.ink; g.font = `700 68px ${SERIF}`;
  tLines.forEach(l => { g.fillText(l, W / 2, y); y += 82; });

  g.font = `italic 42px ${SERIF}`;
  y += 10;
  bLines.forEach(l => { g.fillText(l, W / 2, y); y += 60; });

  if (r.code) {
    y += 20;
    g.font = `700 28px ${SERIF}`; g.fillStyle = t.accent;
    g.fillText("SỐ LỘC MAY MẮN", W / 2, y);
    y += 82;
    g.font = `700 84px ${SERIF}`; g.fillStyle = t.ink;
    g.fillText(r.code.split("").join("  "), W / 2, y);
  }

  const p = r.profile || {};
  const who = p.name?.trim() ? `Kính gửi ${p.name.trim()}` : r.kind === "boc-dich" ? "Gửi người gieo quẻ" : "Gửi thí chủ";
  const meta = r.yi ? `${r.yi.canchi} · mệnh ${r.yi.menh}` : p.chudeLabel ? `Hỏi về ${p.chudeLabel.toLowerCase()}` : "";
  g.fillStyle = t.ink;
  g.font = `700 40px ${SERIF}`;
  g.fillText(who, W / 2, 1480, 760);
  g.font = `32px ${SERIF}`;
  if (meta) g.fillText(meta, W / 2, 1530, 760);
  g.globalAlpha = 0.75;
  g.font = `28px ${SERIF}`;
  if (r.stamp) g.fillText(r.stamp, W / 2, 1574, 800);

  g.globalAlpha = 0.7;
  g.font = `26px ${SERIF}`;
  let host = cfg.siteUrl || location.host;
  try { host = new URL(cfg.siteUrl || location.href).host || host; } catch { /* giữ nguyên */ }
  g.fillText(`${cfg.siteName}${host ? " · " + host : ""} · Chỉ mang tính giải trí`, W / 2, 1640, W - 200);
  g.globalAlpha = 1;

  seal(g, W / 2, 1770, t.ink);
  return cv;
}
