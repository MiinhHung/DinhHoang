# Tượng thần ngồi đài sen, dựng chi tiết: mặt (mắt khép, mày, mũi, miệng, tai), râu từng lọn, tóc và mũ,
# áo có nếp, tay áo rộng, cổ áo, đai lưng, vật cầm tay riêng, hào quang có tia lửa. Dùng trong build_hall.py.
#
# Chạy riêng để dựng thử năm tượng cạnh nhau:
#   blender --background --factory-startup --python tools/blender/statue.py -- tuong-thu.glb
import math
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from common import P, finish, tube, box, PALETTE

# Năm vị thần: màu áo, viền, da, râu, mày, tóc, mũ, vật cầm tay.
SPECS = {
    "linh-bao": dict(robe="#3b5ba5", trim="#e7b75a", skin="#efd2a8", beard="#f4f1ea", brow="#f4f1ea", hair="#2a2420",
                     hat="#e7b75a", headgear="lotus", item="ruyi", item_col="#5fae8a", halo="#ffe8a0"),
    "nguyen-thuy": dict(robe="#c9302c", trim="#e7b75a", skin="#efd2a8", beard="#f4f1ea", brow="#f4f1ea", hair="#2a2420",
                        hat="#e7b75a", headgear="lotus", item="pearl", item_col="#fff3cf", halo="#ffe8a0"),
    "dao-duc": dict(robe="#2e7a5a", trim="#e7b75a", skin="#efd2a8", beard="#f4f1ea", brow="#f4f1ea", hair="#ece8e0",
                    hat="#e7b75a", headgear="guan", item="fan", item_col="#f4ead6", halo="#ffe8a0", beard_len=0.7),
    "tai-than": dict(robe="#d9a63a", trim="#b3242a", skin="#5a3a28", beard="#1d1612", brow="#1d1612", hair="#1d1612",
                     hat="#1b1b1b", headgear="official", item="ingot", item_col="#f2b632", halo="#ffd86a", beard_len=0.6),
    "nguyet-lao": dict(robe="#c8243a", trim="#e7b75a", skin="#efd2a8", beard="#f4f1ea", brow="#f4f1ea", hair="#ece8e0",
                       hat="#e7b75a", headgear="guan", item="book_staff", item_col="#7a4a24", halo="#ffc8d8", beard_len=0.65),
}


def T(o=(0, 0, 0), r=(0, 0, 0), s=(1, 1, 1)):
    """Ma trận dời, xoay (XYZ), co giãn theo hệ three.js, trả về hàm biến đổi một điểm."""
    m = Matrix.Translation(o) @ Euler(r, "XYZ").to_matrix().to_4x4() @ Matrix.Diagonal((*s, 1))
    return lambda v: m @ Vector(v)


def _obj(name, bm, key):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return finish(o, key, smooth=True)


def lathe(name, prof, key, xf, seg=24, folds=0, amp=0.0, flat=1.0):
    """Khối tròn xoay quanh trục đứng cục bộ; prof [(bán kính, y)] từ dưới lên; folds/amp: nếp áo; flat: ép dẹt trước-sau."""
    bm = bmesh.new()
    rings = []
    for r, y in prof:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            rr = r * (1 + amp * math.sin(folds * a))
            ring.append(bm.verts.new(P(*xf((math.sin(a) * rr, y, math.cos(a) * rr * flat)))))
        rings.append(ring)
    for j in range(len(rings) - 1):
        for i in range(seg):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % seg], rings[j + 1][(i + 1) % seg], rings[j + 1][i]))
    for ring, (r, _) in ((rings[0], prof[0]), (rings[-1], prof[-1])):
        if r > 1e-4:
            bm.faces.new(ring)
    return _obj(name, bm, key)


def ellipsoid(name, radii, key, xf, seg=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg * 2 // 3), radius=1)
    for v in bm.verts:
        v.co = P(*xf((v.co.x * radii[0], v.co.z * radii[1], v.co.y * radii[2])))
    return _obj(name, bm, key)


def build_statue(name, x, y, z, s, spec):
    """Tượng ngồi, gốc toạ độ ở đáy đài sen, mặt nhìn về +z; cao khoảng 2.9 × s."""
    W = T((x, y, z), (0, 0, 0), (s, s, s))

    def at(o=(0, 0, 0), r=(0, 0, 0), sc=(1, 1, 1)):
        t = T(o, r, sc)
        return lambda v: W(tuple(t(v)))

    def col(part, hexv):
        k = f"{name}_{part}"
        PALETTE[k] = hexv
        return k

    c = {p: col(p, spec[p]) for p in ("robe", "trim", "skin", "beard", "brow", "hair", "hat")}
    item = col("item", spec["item_col"])
    gold, lotus, lotus2 = col("gold", "#e7b75a"), col("lotus", "#f2b8c8"), col("lotus2", "#fbe0e8")
    ink, lip, halo, flame = col("ink", "#2a1a14"), col("lip", "#b5463c"), col("halo", spec["halo"]), col("flame", "#f2a93b")

    def strand(n, pts, r, key):
        return tube(f"{name}_{n}", [tuple(W(p)) for p in pts], r * s, key)

    # ---- Đài sen ----
    lathe(f"{name}_base", [(0, 0), (0.95, 0), (0.98, 0.08), (0.86, 0.16), (0.9, 0.24), (0.78, 0.3), (0, 0.3)], gold, at(), seg=28)
    for k in range(14):
        a = 2 * math.pi * k / 14
        ellipsoid(f"{name}_pa{k}", (0.21, 0.36, 0.07), lotus, at((math.sin(a) * 0.8, 0.5, math.cos(a) * 0.8), (0.45, a, 0)), seg=10)
        a2 = a + math.pi / 14
        ellipsoid(f"{name}_pb{k}", (0.17, 0.3, 0.06), lotus2, at((math.sin(a2) * 0.6, 0.62, math.cos(a2) * 0.6), (0.3, a2, 0)), seg=10)
    lathe(f"{name}_seat", [(0, 0.5), (0.66, 0.5), (0.7, 0.62), (0.6, 0.72), (0, 0.72)], lotus, at(), seg=24)

    # ---- Thân áo ----
    by = 0.72
    ellipsoid(f"{name}_lap", (0.8, 0.26, 0.58), c["robe"], at((0, by + 0.12, 0.12)), seg=20)
    lathe(f"{name}_torso", [(0.54, by + 0.05), (0.56, by + 0.35), (0.5, by + 0.7), (0.42, by + 1.0), (0.34, by + 1.2), (0.16, by + 1.32), (0, by + 1.34)],
          c["robe"], at(), folds=9, amp=0.03, flat=0.8)
    strand("belt", [(math.sin(a) * 0.55, by + 0.58, math.cos(a) * 0.55 * 0.8 + 0.01) for a in [i / 28 * 2 * math.pi for i in range(29)]], 0.035, c["trim"])
    for sd in (-1, 1):
        strand(f"collar{sd}", [(sd * 0.18, by + 1.27, 0.15), (sd * 0.12, by + 1.12, 0.32), (0, by + 0.86, 0.39)], 0.04, c["trim"])
        # Tay áo rộng rủ xuống trước gối, cánh tay trong áo nối tới đôi tay chắp.
        lathe(f"sleeve{sd}", [(0.14, 0), (0.2, -0.2), (0.3, -0.48), (0.36, -0.6), (0.3, -0.63), (0, -0.62)], c["robe"],
              at((sd * 0.38, by + 1.12, 0.02), (-0.75, 0, sd * 0.3)), folds=6, amp=0.06)
        strand(f"forearm{sd}", [(sd * 0.42, by + 0.7, 0.4), (sd * 0.2, by + 0.67, 0.48), (sd * 0.1, by + 0.66, 0.5)], 0.1, c["robe"])
        ellipsoid(f"hand{sd}", (0.11, 0.09, 0.12), c["skin"], at((sd * 0.07, by + 0.66, 0.54)), seg=12)

    # ---- Đầu và mặt ----
    hy = by + 1.62
    ellipsoid(f"{name}_neck", (0.11, 0.12, 0.1), c["skin"], at((0, by + 1.36, 0)), seg=12)
    ellipsoid(f"{name}_head", (0.24, 0.29, 0.25), c["skin"], at((0, hy, 0.02)), seg=20)

    def surf(px, dy, off=0.006):
        """z của mặt trước đầu tại (x, y = hy + dy), cộng một khoảng nhỏ để chi tiết nằm trên mặt."""
        return 0.02 + 0.25 * math.sqrt(max(0.0, 1 - (px / 0.24) ** 2 - (dy / 0.29) ** 2)) + off

    for sd in (-1, 1):
        ellipsoid(f"{name}_ear{sd}", (0.045, 0.12, 0.06), c["skin"], at((sd * 0.235, hy - 0.04, 0)), seg=10)
        strand(f"eye{sd}", [(sd * px, hy + dy, surf(px, dy)) for px, dy in ((0.04, 0.02), (0.09, 0.004), (0.14, 0.02))], 0.013, ink)
        strand(f"brow{sd}", [(sd * px, hy + dy, surf(px, dy, 0.01)) for px, dy in ((0.035, 0.08), (0.1, 0.1), (0.17, 0.075))], 0.022, c["brow"])
    ellipsoid(f"{name}_nose", (0.035, 0.065, 0.05), c["skin"], at((0, hy - 0.03, surf(0, -0.03, -0.01))), seg=10)
    strand("mouth", [(px, hy + dy, surf(px, dy)) for px, dy in ((-0.045, -0.12), (0, -0.128), (0.045, -0.12))], 0.012, lip)
    if spec.get("beard"):
        for sd in (-1, 1):
            strand(f"mustache{sd}", [(sd * px, hy + dy, surf(px, dy, 0.012)) for px, dy in ((0.01, -0.085), (0.07, -0.1), (0.12, -0.17))], 0.022, c["beard"])
        L = spec.get("beard_len", 0.55)
        for k, xo in enumerate((-0.1, -0.05, 0.0, 0.05, 0.1)):
            z0 = surf(xo, -0.17, 0)
            strand(f"beard{k}", [(xo, hy - 0.17, z0), (xo * 1.15, hy - 0.32, z0 + 0.14), (xo * 0.9, hy - 0.32 - L * 0.5, 0.43),
                                 (xo * 0.5, hy - 0.32 - L, 0.46 - abs(xo) * 0.3)], 0.045, c["beard"])
    # Tóc phủ đỉnh và sau đầu, chừa trán.
    ellipsoid(f"{name}_hair", (0.255, 0.24, 0.245), c["hair"], at((0, hy + 0.07, -0.06)), seg=20)

    # ---- Mũ ----
    g = spec["headgear"]
    if g in ("lotus", "guan"):
        ellipsoid(f"{name}_bun", (0.1, 0.09, 0.1), c["hair"], at((0, hy + 0.33, -0.04)), seg=12)
        lathe(f"{name}_crown", [(0, 0), (0.11, 0), (0.13, 0.1), (0.09, 0.16), (0, 0.17)], c["hat"], at((0, hy + 0.27, -0.04)), seg=16)
        strand("pin", [(-0.2, hy + 0.36, -0.04), (0.2, hy + 0.36, -0.04)], 0.016, gold)
        if g == "lotus":
            for k in range(6):
                a = -math.pi / 2 + math.pi * k / 5
                ellipsoid(f"{name}_cp{k}", (0.06, 0.11, 0.02), gold, at((math.sin(a) * 0.17, hy + 0.3, -0.04 + math.cos(a) * 0.17), (0.35, a, 0)), seg=8)
    elif g == "official":
        lathe(f"{name}_hat", [(0.27, 0), (0.27, 0.12), (0.22, 0.24), (0.12, 0.3), (0, 0.31)], c["hat"], at((0, hy + 0.1, -0.03)), seg=20)
        for sd in (-1, 1):
            ellipsoid(f"{name}_wing{sd}", (0.24, 0.06, 0.012), c["hat"], at((sd * 0.42, hy + 0.27, -0.16), (0, 0, sd * 0.12)), seg=10)
        ellipsoid(f"{name}_hatgem", (0.05, 0.05, 0.03), gold, at((0, hy + 0.2, 0.25)), seg=8)

    # ---- Hào quang ----
    hz, hcy = -0.42, hy + 0.05
    ellipsoid(f"{name}_halodisc", (0.5, 0.5, 0.015), halo, at((0, hcy, hz)), seg=24)
    strand("haloring", [(math.cos(a) * 0.52, hcy + math.sin(a) * 0.52, hz + 0.02) for a in [i / 32 * 2 * math.pi for i in range(33)]], 0.035, gold)
    for k in range(18):
        a = 2 * math.pi * k / 18
        ellipsoid(f"{name}_flame{k}", (0.045, 0.1, 0.015), flame, at((math.cos(a) * 0.62, hcy + math.sin(a) * 0.62, hz), (0, 0, a - math.pi / 2)), seg=8)

    # ---- Vật cầm tay ----
    it = spec["item"]
    if it == "pearl":
        ellipsoid(f"{name}_pearl", (0.13, 0.13, 0.13), item, at((0, by + 0.8, 0.6)), seg=16)
        lathe(f"{name}_pearlcup", [(0, 0), (0.12, 0), (0.15, 0.06), (0, 0.06)], gold, at((0, by + 0.66, 0.6)), seg=16)
    elif it == "ruyi":
        strand("ruyi", [(0, by + 0.62, 0.58), (0.03, by + 0.9, 0.64), (0, by + 1.08, 0.58)], 0.025, gold)
        ellipsoid(f"{name}_ruyihead", (0.11, 0.08, 0.06), item, at((0, by + 1.13, 0.56), (0.4, 0, 0)), seg=12)
    elif it == "fan":
        # Quạt cầm chếch sang phải để không che râu.
        fx, fy, fz = 0.46, by + 1.08, 0.5
        strand("fanhandle", [(0.1, by + 0.64, 0.56), (0.32, by + 0.86, 0.54), (fx - 0.05, fy - 0.2, fz)], 0.02, gold)
        ellipsoid(f"{name}_fan", (0.21, 0.21, 0.02), item, at((fx, fy, fz), (-0.2, 0.35, 0)), seg=20)
        rim = T((fx, fy, fz), (-0.2, 0.35, 0))
        strand("fanrim", [tuple(rim((math.cos(a) * 0.21, math.sin(a) * 0.21, 0))) for a in [i / 24 * 2 * math.pi for i in range(25)]], 0.012, gold)
    elif it == "ingot":
        ellipsoid(f"{name}_ingot", (0.22, 0.08, 0.13), item, at((0, by + 0.76, 0.6)), seg=16)
        for sd in (-1, 1):
            ellipsoid(f"{name}_ingotend{sd}", (0.08, 0.07, 0.11), item, at((sd * 0.18, by + 0.81, 0.6), (0, 0, sd * 0.5)), seg=10)
        ellipsoid(f"{name}_ingottop", (0.09, 0.08, 0.08), item, at((0, by + 0.83, 0.6)), seg=12)
    elif it == "book_staff":
        p = W((0, by + 0.74, 0.6))
        box(f"{name}_book", 0.32 * s, 0.07 * s, 0.24 * s, p.x, p.y, p.z, item, 0.01 * s)
        strand("staff", [(0.85, 0.3, 0.3), (0.86, by + 1.4, 0.32), (0.84, by + 2.0, 0.3)], 0.03, item)
        ellipsoid(f"{name}_gourd", (0.08, 0.1, 0.08), gold, at((0.84, by + 2.08, 0.3)), seg=10)
        ellipsoid(f"{name}_gourd2", (0.06, 0.07, 0.06), gold, at((0.84, by + 2.22, 0.3)), seg=10)
        red = col("thread", "#e0283a")
        strand("thread", [(0.84, by + 1.98, 0.3), (0.7, by + 1.7, 0.36), (0.52, by + 1.55, 0.42), (0.3, by + 1.0, 0.55)], 0.012, red)


if __name__ == "__main__":
    from common import reset, bake_and_export
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    reset({})
    for i, (k, spec) in enumerate(SPECS.items()):
        build_statue(f"st_{k.replace('-', '_')}", (i - 2) * 2.4, 0, 0, 1.0, spec)
    bake_and_export(argv[0] if argv else "tuong-thu.glb", "statues", ao_floor=0.55, ao_dist=0.8)
