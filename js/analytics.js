// Đo nguồn truy cập ẩn danh: ghi nhận UTM khi vào trang, gửi sự kiện lên GA4 nếu đã cấu hình mã.
let on = false;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

function captureUtm() {
  const q = new URLSearchParams(location.search);
  let utm = {};
  try { utm = JSON.parse(sessionStorage.getItem("dh-utm") || "{}"); } catch { /* chế độ riêng tư */ }
  if (UTM_KEYS.some(k => q.get(k))) {
    utm = Object.fromEntries(UTM_KEYS.map(k => [k, (q.get(k) || "").slice(0, 60)]).filter(([, v]) => v));
    try { sessionStorage.setItem("dh-utm", JSON.stringify(utm)); } catch { /* chế độ riêng tư */ }
  }
  return utm;
}
const utm = captureUtm();

export function initAnalytics(cfg) {
  const id = cfg?.ga4Id;
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true, campaign_source: utm.utm_source, campaign_medium: utm.utm_medium, campaign_name: utm.utm_campaign });
  on = true;
}

export function track(name, params = {}) {
  if (!on) return;
  try { window.gtag("event", name, { ...params, ...utm }); } catch { /* bỏ qua */ }
}
