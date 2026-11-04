# Dựng phần kiến trúc một điện bằng Blender (chạy ngầm), bake bóng đổ vào màu đỉnh rồi xuất .glb cho game.
#
#   blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tam-thanh.glb tam-thanh
#
# Kích thước khớp với makeHall() trong js/world.js: nền cao 0.6, hàng cột trước ở z = d/2 - 0.2,
# mái dưới bắt đầu ở y = 0.6 + h + 0.1. Tượng, bàn thờ, bảng tên, câu đối, đèn vẫn do game dựng.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, box, cyl, curved_roof, ridge, bake_and_export

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "hall.glb"
KIND = argv[1] if len(argv) > 1 else "tam-thanh"

BASE = dict(col="#b3242a", stone="#ddd5c6", stone_dark="#b9b0a0", floor="#6b3a22")
CFG = {
    "tam-thanh": dict(w=14, d=8, h=4.6, roof="#d6582c", ridge="#f2b84b", wall="#9a2a20", trim="#e7b75a", under="#5a2018"),
    "tai-than": dict(w=10, d=7, h=4, roof="#e9b02c", ridge="#ffd86a", wall="#8a3a14", trim="#ffd36b", under="#5a3010"),
    "nguyet-lao": dict(w=10, d=7, h=4, roof="#de5a88", ridge="#ffd0dc", wall="#a3304e", trim="#f7c6d4", under="#5a1a30"),
}
C = {**BASE, **CFG[KIND]}
W, D, H = C["w"], C["d"], C["h"]
TOP = 0.6
RY = TOP + H + 0.1
reset({k: v for k, v in C.items() if isinstance(v, str)})

# ---------- Nền, sàn, bậc ----------
box("terrace", W + 2, TOP, D + 2, 0, TOP / 2, 0, "stone", 0.05, 1)
box("plinth", W + 2.4, 0.18, D + 2.4, 0, 0.09, 0, "stone_dark", 0.04, 1)
box("floor", W - 0.2, 0.04, D - 0.2, 0, TOP + 0.02, 0, "floor", 0)
for i in range(3):
    sw, sh, sd = W * 0.45 + 0.4 * (2 - i), TOP * (3 - i) / 3, 0.45
    box(f"step{i}", sw, sh, sd, 0, sh / 2, D / 2 + 1 + sd * (i + 0.5), "stone", 0.03)

# ---------- Tường, cột, xà ----------
box("wall_back", W, H, 0.3, 0, TOP + H / 2, -D / 2, "wall", 0.02, 1)
for s in (-1, 1):
    box(f"wall_side{s}", 0.3, H, D, s * W / 2, TOP + H / 2, 0, "wall", 0.02, 1)
    box(f"wainscot{s}", 0.34, 1.0, D - 0.2, s * W / 2, TOP + 0.5, 0, "trim", 0.02)
box("wainscot_back", W - 0.2, 1.0, 0.34, 0, TOP + 0.5, -D / 2, "trim", 0.02)

n = max(4, round(W / 3.2) + 1)
col_x = [-W / 2 + 0.3 + (W - 0.6) * i / (n - 1) for i in range(n)]
CZ = D / 2 - 0.2
for i, x in enumerate(col_x):
    cyl(f"col{i}", 0.24, 0.2, H, x, TOP, CZ, "col")
    cyl(f"colbase{i}", 0.36, 0.32, 0.22, x, TOP, CZ, "stone_dark", 12)
    box(f"colcap{i}", 0.5, 0.18, 0.5, x, TOP + H - 0.05, CZ, "trim", 0.03)
    # Đấu củng: ba tầng gỗ loe dần đỡ mái.
    for k, bw in enumerate((0.5, 0.8, 1.1)):
        box(f"dougong{i}_{k}", bw, 0.16, 0.42 + k * 0.12, x, TOP + H + 0.05 + k * 0.16, CZ + 0.05 * k, "trim" if k % 2 == 0 else "col", 0.02)
for s in (-1, 1):
    cyl(f"col_back{s}", 0.24, 0.2, H, s * (W / 2 - 0.3), TOP, -D / 2 + 0.3, "col")
box("beam_front", W + 0.6, 0.45, 0.5, 0, TOP + H - 0.1, CZ, "trim", 0.03)
box("beam_front_red", W + 0.4, 0.22, 0.52, 0, TOP + H - 0.42, CZ, "col", 0.02)

# Cửa bức bàn chấn song giữa các cột ngoài cùng, chừa gian giữa để thấy tượng.
for a, b in ((col_x[0], col_x[1]), (col_x[-2], col_x[-1])):
    cx, pw, ph = (a + b) / 2, abs(b - a) - 0.5, H - 0.9
    box(f"door_frame{cx:.1f}", pw, ph, 0.12, cx, TOP + ph / 2 + 0.05, CZ - 0.1, "col", 0.02)
    for k in range(1, 7):
        box(f"door_v{cx:.1f}_{k}", 0.05, ph * 0.62, 0.16, cx - pw / 2 + pw * k / 7, TOP + ph * 0.6, CZ - 0.02, "trim", 0)
    for k in range(1, 6):
        box(f"door_h{cx:.1f}_{k}", pw * 0.92, 0.05, 0.16, cx, TOP + ph * 0.3 + ph * 0.62 * k / 6, CZ - 0.02, "trim", 0)

# ---------- Mái hai tầng ----------
curved_roof("roof_low", W + 3.4, D + 3.2, 1.5, (D + 3.2 - D * 0.6) / 2, RY)
box("under_eave", W + 2.8, 0.06, D + 2.6, 0, RY + 0.02, 0, "under", 0)
box("upper_wall", W * 0.66, 1.1, D * 0.6, 0, RY + 1.9, 0, "wall", 0.02, 1)
for k in range(5):
    x = -W * 0.33 + 0.25 + (W * 0.66 - 0.5) * k / 4
    cyl(f"upcol{k}", 0.13, 0.12, 1.1, x, RY + 1.35, D * 0.3 + 0.02, "col", 10)
box("upper_beam", W * 0.66 + 0.2, 0.18, 0.2, 0, RY + 2.35, D * 0.3 + 0.05, "trim", 0.02)
UW, UD = W * 0.66 + 2.2, D * 0.6 + 2.2
curved_roof("roof_up", UW, UD, 1.7, UD / 2, RY + 2.4, lift=0.6)
ridge("ridge", UW - UD, RY + 2.4 + 1.7, curl=0.38 if W < 12 else 0.42, pearl=0.28 if W < 12 else 0.32)

bake_and_export(OUT, f"{KIND}-shell")
