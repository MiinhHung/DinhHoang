// Người chơi online qua Supabase Realtime (presence + broadcast). Không cần bảng dữ liệu, chỉ cần URL và anon key.
// Chỉ gửi danh xưng, màu áo và vị trí — không bao giờ gửi họ tên thật hay năm sinh.
const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm";

export async function connectOnline(cfg, me, world, onCount) {
  if (!cfg?.url || !cfg?.anonKey) return null;
  let createClient;
  try {
    ({ createClient } = await import(SUPABASE_ESM));
  } catch (e) {
    console.warn("Không tải được Supabase, chơi một mình.", e);
    return null;
  }
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const max = cfg.maxVisiblePlayers ?? 30;
  const profile = { name: (me.name || "Thí chủ").slice(0, 20), color: me.color };
  const client = createClient(cfg.url, cfg.anonKey, { realtime: { params: { eventsPerSecond: 8 } } });
  const ch = client.channel(cfg.channel || "dinh-hoang-world", { config: { presence: { key: id }, broadcast: { self: false } } });
  const visible = new Set();

  const show = (pid, data) => {
    if (pid === id) return;
    if (!visible.has(pid)) {
      if (visible.size >= max) return;
      visible.add(pid);
    }
    world.remote.upsert(pid, data);
  };

  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState();
    const ids = Object.keys(state);
    for (const pid of [...visible]) if (!state[pid]) { visible.delete(pid); world.remote.remove(pid); }
    for (const pid of ids) show(pid, state[pid][0] || {});
    onCount?.(ids.length);
  });
  ch.on("broadcast", { event: "pos" }, ({ payload }) => {
    if (payload?.id) show(payload.id, payload);
  });
  // Hiệu ứng người khác vừa làm: thắp hương, thỉnh chuông, thả hoa đăng, buộc tơ hồng. Không kèm lời nguyện.
  ch.on("broadcast", { event: "fx" }, ({ payload }) => {
    if (!payload?.zone || !visible.has(payload.id)) return;
    if (payload.kind === "gong") world.fx.gong();
    else if (payload.kind === "hoadang") world.fx.hoaDang(["sen", "vang", "trang"].includes(payload.color) ? payload.color : "sen");
    else if (payload.kind === "ribbon") world.fx.ribbon();
    else world.fx.incense(payload.zone);
  });

  let last = "";
  const tick = setInterval(() => {
    const s = world.getState();
    const key = `${s.x},${s.z}`;
    if (key === last) return;
    last = key;
    ch.send({ type: "broadcast", event: "pos", payload: { id, ...s, ...profile } });
  }, 250);

  ch.subscribe(async status => {
    if (status === "SUBSCRIBED") await ch.track({ ...profile, ...world.getState() });
  });

  addEventListener("pagehide", () => { clearInterval(tick); ch.unsubscribe(); });

  return {
    sendFx(zone, kind, color) { ch.send({ type: "broadcast", event: "fx", payload: { id, zone, ...(kind ? { kind } : {}), ...(color ? { color } : {}) } }); }
  };
}
