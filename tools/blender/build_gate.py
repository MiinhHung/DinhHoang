# Dựng cổng tam quan hoặc khung Lầu Chuông bằng Blender rồi xuất .glb cho game.
#
#   blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/gate.glb gate
#   blender --background --factory-startup --python tools/blender/build_gate.py -- assets/models/chuong.glb chuong
#
# Kích thước khớp với makeGate() (js/landscape.js) và makeBellTower() (js/world.js).
# Bảng tên cổng, quả chuông và chày gỗ (có hoạt ảnh) vẫn do game dựng.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, box, cyl, sphere, curved_roof, ridge, bake_and_export

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "gate.glb"
KIND = argv[1] if len(argv) > 1 else "gate"

BASE = dict(col="#b3242a", trim="#e7b75a", ridge="#f2b84b", stone="#ddd5c6", stone_dark="#b9b0a0")


def dougong(name, x, y, z, key_a="trim", key_b="col"):
    for k, bw in enumerate((0.45, 0.7, 0.95)):
        box(f"{name}_{k}", bw, 0.14, 0.4 + k * 0.1, x, y + k * 0.14, z, key_a if k % 2 == 0 else key_b, 0.02)


if KIND == "gate":
    reset({**BASE, "roof": "#2a3a6e", "under": "#1c2244"})
    for s in (-1, 1):
        box(f"base{s}", 1.2, 0.6, 1.2, s * 3.6, 0.3, 0, "stone", 0.05, 1)
        box(f"base_cap{s}", 1.0, 0.12, 1.0, s * 3.6, 0.66, 0, "stone_dark", 0.03)
        cyl(f"pillar{s}", 0.42, 0.38, 4.5, s * 3.6, 0.7, 0, "col")
        box(f"pillar_cap{s}", 0.9, 0.2, 0.9, s * 3.6, 5.1, 0, "trim", 0.03)
        cyl(f"post{s}", 0.22, 0.2, 3.6, s * 1.6, 0, 0, "col", 12)
        box(f"post_base{s}", 0.5, 0.3, 0.5, s * 1.6, 0.15, 0, "stone_dark", 0.03)
        dougong(f"dg{s}", s * 3.6, 5.3, 0)
        # Cánh chặn hai bên: thanh ngang chạm hoa giữa cột lớn và cột nhỏ.
        box(f"wing{s}", 1.6, 0.22, 0.24, s * 2.6, 3.2, 0, "trim", 0.02)
        box(f"wing_low{s}", 1.6, 0.14, 0.2, s * 2.6, 2.7, 0, "col", 0.02)
    box("beam_top", 8.8, 0.55, 0.8, 0, 5.05, 0, "trim", 0.04)
    box("beam_top_red", 8.6, 0.2, 0.84, 0, 4.72, 0, "col", 0.02)
    box("beam_mid", 3.4, 0.25, 0.4, 0, 3.6, 0, "col", 0.02)
    curved_roof("roof", 10.4, 3.2, 1.3, 1.6, 5.6, lift=0.6, res=0.12)
    box("under_eave", 9.8, 0.06, 2.6, 0, 5.62, 0, "under", 0)
    ridge("ridge", 10.4 - 3.2, 5.6 + 1.3, curl=0.4, pearl=0.3)

elif KIND == "chuong":
    reset({**BASE, "roof": "#2f4f8f", "under": "#1c2a4a"})
    box("base", 3.4, 0.4, 3.4, 0, 0.2, 0, "stone", 0.05, 1)
    box("plinth", 3.7, 0.12, 3.7, 0, 0.06, 0, "stone_dark", 0.03)
    box("step", 1.4, 0.2, 0.4, 0, 0.1, 1.9, "stone", 0.02)
    for sx in (-1, 1):
        for sz in (-1, 1):
            cyl(f"post{sx}{sz}", 0.17, 0.14, 3.4, sx * 1.3, 0.4, sz * 1.3, "col", 12)
            cyl(f"post_base{sx}{sz}", 0.26, 0.24, 0.16, sx * 1.3, 0.4, sz * 1.3, "stone_dark", 10)
            dougong(f"dg{sx}{sz}", sx * 1.3, 3.8, sz * 1.3)
    box("beam", 3.0, 0.22, 0.22, 0, 3.72, 0, "col", 0.02)
    for sz in (-1, 1):
        box(f"beam_side{sz}", 2.9, 0.26, 0.2, 0, 3.66, sz * 1.3, "trim", 0.02)
    for sx in (-1, 1):
        box(f"beam_x{sx}", 0.2, 0.26, 2.9, sx * 1.3, 3.66, 0, "trim", 0.02)
    # Lan can thấp ba mặt, chừa mặt trước để bước vào.
    for sx in (-1, 1):
        box(f"rail{sx}", 0.1, 0.1, 2.5, sx * 1.3, 1.05, 0, "col", 0.01)
    box("rail_back", 2.5, 0.1, 0.1, 0, 1.05, -1.3, "col", 0.01)
    curved_roof("roof", 4.6, 4.6, 1.3, 2.3, 4.25, lift=0.45, res=0.1)
    box("under_eave", 4.1, 0.06, 4.1, 0, 4.27, 0, "under", 0)
    sphere("finial", 0.22, 0, 5.75, 0, "ridge")
    cyl("finial_base", 0.2, 0.12, 0.3, 0, 5.45, 0, "ridge", 12)

bake_and_export(OUT, f"{KIND}-shell")
