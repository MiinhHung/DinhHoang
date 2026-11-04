# Dựng Bốc Dịch Đài (bệ tròn cao, bậc thang phía nam, lan can trụ sen) bằng Blender rồi xuất .glb cho game.
#
#   blender --background --factory-startup --python tools/blender/build_altar.py -- assets/models/boc-dich.glb
#
# Kích thước khớp với ALTAR trong js/world.js (r = 9, cao 1.6, bậc rộng 2 × 2.1, dài 3.6, hướng +z).
# Bát quái xoay, đèn lồng trên cột và bảng tên vẫn do game dựng.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, box, cyl, sphere, bake_and_export, P, finish
import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "boc-dich.glb"
R, Hh, SW, SL = 9.0, 1.6, 2.1, 3.6

reset(dict(stone="#ddd5c6", stone_dark="#b9b0a0", stone_warm="#e8dcc4", panel="#c9bea8", lotus="#f0c8d2", gold="#e7b75a"))


def ring(name, r_out, r_in, y0, h, key, seg=64):
    """Vành tròn rỗng (hình khuyên) đặt từ y0 cao h."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r_out, depth=h, location=P(0, y0 + h / 2, 0))
    outer = bpy.context.active_object
    if r_in > 0:
        bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r_in, depth=h + 0.2, location=P(0, y0 + h / 2, 0))
        inner = bpy.context.active_object
        mod = outer.modifiers.new("cut", "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.object = inner
        bpy.context.view_layer.objects.active = outer
        bpy.ops.object.modifier_apply(modifier="cut")
        bpy.data.objects.remove(inner)
    outer.name = name
    return finish(outer, key, smooth=False)


# Gap chừa cho bậc thang (góc tính từ hướng nam).
GAP = math.asin(min(1, (SW + 0.4) / (R - 0.3)))


def around(count, radius, skip_gap=True):
    for i in range(count):
        a = math.pi / 2 + 2 * math.pi * i / count
        d = abs((a - math.pi / 2 + math.pi) % (2 * math.pi) - math.pi)
        if skip_gap and d < GAP + 0.05:
            continue
        yield a, math.cos(a) * radius, math.sin(a) * radius


# ---------- Thân bệ ----------
ring("plinth", R + 0.45, 0, 0, 0.22, "stone_dark")
ring("drum", R, 0, 0.22, Hh - 0.42, "panel")
ring("cornice", R + 0.22, 0, Hh - 0.2, 0.2, "stone")
# Trụ gờ quanh thân, giữa các trụ là ô chạm lõm (nhìn như các tấm đá chạm hoa văn).
for a, x, z in around(28, R + 0.02, skip_gap=False):
    box(f"pilaster{a:.2f}", 0.42, Hh - 0.42, 0.22, x, 0.22 + (Hh - 0.42) / 2, z, "stone", 0.03, yaw=-(a + math.pi / 2))
for a, x, z in around(28, R - 0.02, skip_gap=False):
    a2 = a + math.pi / 28
    x2, z2 = math.cos(a2) * (R + 0.03), math.sin(a2) * (R + 0.03)
    box(f"medal{a:.2f}", 0.5, 0.5, 0.06, x2, 0.22 + (Hh - 0.42) / 2, z2, "stone_warm", 0.08, yaw=-(a2 + math.pi / 2))

# ---------- Mặt đài: các vòng đá đồng tâm ----------
for k, (ro, ri, key) in enumerate(((R, R - 1.1, "stone"), (R - 1.1, R - 1.3, "stone_dark"), (R - 1.3, 5.2, "stone_warm"),
                                    (5.2, 4.95, "stone_dark"), (4.95, 0, "stone"))):
    ring(f"floor{k}", ro, ri, Hh - 0.02, 0.04, key)

# ---------- Lan can trụ sen ----------
posts = list(around(40, R - 0.3))
for a, x, z in posts:
    box(f"post{a:.2f}", 0.28, 0.9, 0.28, x, Hh + 0.45, z, "stone", 0.03)
    sphere(f"bud{a:.2f}", 0.17, x, Hh + 1.02, z, "lotus")
    cyl(f"budbase{a:.2f}", 0.2, 0.14, 0.1, x, Hh + 0.88, z, "stone_warm", 10)
for (a1, x1, z1), (a2, x2, z2) in zip(posts, posts[1:]):
    if abs(a2 - a1) > 2 * math.pi / 40 + 0.01:
        continue
    mx, mz, ln = (x1 + x2) / 2, (z1 + z2) / 2, math.hypot(x2 - x1, z2 - z1)
    ang = math.atan2(z2 - z1, x2 - x1)
    for y, hh, th, key in ((Hh + 0.82, 0.12, 0.18, "stone"), (Hh + 0.18, 0.36, 0.14, "panel")):
        box(f"rail{a1:.2f}_{y:.2f}", ln, hh, th, mx, y, mz, key, 0.02, yaw=-ang)

# ---------- Bậc thang có thành hai bên ----------
steps = 8
for i in range(steps):
    sh = Hh * (i + 1) / steps
    ln = SL * (steps - i) / steps
    box(f"step{i}", SW * 2, 0.12, ln, 0, sh - 0.06, R - 0.4 + ln / 2, "stone", 0.02)
    box(f"stepfill{i}", SW * 2 - 0.04, sh - 0.1, ln, 0, (sh - 0.1) / 2, R - 0.4 + ln / 2, "panel", 0)
for s in (-1, 1):
    # Thành bậc dốc: dựng bằng khối xoay theo độ dốc của cầu thang.
    slope = math.atan2(Hh, SL)
    box(f"cheek{s}", 0.4, 0.5, math.hypot(SL, Hh) + 0.2, s * (SW + 0.2), Hh / 2 + 0.25, R - 0.4 + SL / 2, "stone", 0.03, tilt=slope)
    box(f"cheekbase{s}", 0.5, 0.7, 0.5, s * (SW + 0.2), 0.35, R + SL - 0.2, "stone", 0.04)
    sphere(f"cheekbud{s}", 0.22, s * (SW + 0.2), 0.95, R + SL - 0.2, "lotus")
    box(f"cheektop{s}", 0.5, 0.9, 0.5, s * (SW + 0.2), Hh + 0.45, R - 0.5, "stone", 0.04)
    sphere(f"cheektopbud{s}", 0.22, s * (SW + 0.2), Hh + 1.05, R - 0.5, "lotus")

bake_and_export(OUT, "boc-dich-shell", ao_floor=0.5)
