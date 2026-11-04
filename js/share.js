// Chia sẻ lá bùa: Web Share (kèm ảnh) nếu máy hỗ trợ, nếu không thì tải ảnh và chép lời chia sẻ.
const LEAD = {
  "nguyet-lao": "Vừa rút được xăm Nguyệt Lão",
  "tai-than": "Vừa xin được quẻ Tài Thần",
  "boc-dich": "Vừa gieo được quẻ Kinh Dịch",
  "tam-thanh": "Vừa thắp nén tâm hương ở Tam Thanh Điện"
};

export function baseUrl(cfg) {
  return cfg.siteUrl || location.origin + location.pathname;
}

export function shareUrl(cfg, kind, source = "share") {
  const u = new URL(baseUrl(cfg));
  if (kind && LEAD[kind]) u.searchParams.set("dien", kind);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", kind || "general");
  return u.toString();
}

export function shareText(r, cfg, source) {
  const title = r.card?.ten ? ` “${r.card.ten}”` : "";
  return `${LEAD[r.kind] || "Vừa ghé"}${title} ở ${cfg.siteName}. ${r.blessing || ""}\nXin một quẻ cho mình: ${shareUrl(cfg, r.kind, source)}\n${(cfg.hashtags || []).join(" ")}`;
}

export const fileName = r => `bua-${r.kind}-${Date.now().toString(36)}.png`;

export function canvasBlob(cv) {
  return new Promise(res => cv.toBlob(res, "image/png"));
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Gọi ngay trong sự kiện bấm: blob phải có sẵn để trình duyệt (nhất là Safari) không mất quyền chia sẻ.
export async function shareBlob(blob, r, cfg) {
  const text = shareText(r, cfg, "webshare");
  const file = blob ? new File([blob], fileName(r), { type: "image/png" }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: cfg.siteName });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ text, title: cfg.siteName });
      return "shared";
    }
  } catch (e) {
    if (e.name === "AbortError") return "cancelled";
  }
  if (blob) saveBlob(blob, fileName(r));
  await copyText(text);
  return "copied";
}

export function facebookUrl(url) {
  return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
}

export async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* trình duyệt chặn */ }
    ta.remove();
    return ok;
  }
}
