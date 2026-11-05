# Dựng một điện đi vào được (ngoại thất + nội thất + tượng thần) bằng Blender, bake bóng đổ vào màu đỉnh, xuất .glb.
#
#   blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tam-thanh-v2.glb tam-thanh
#
# Kích thước khớp với HALL trong js/map.js và makeHall() trong js/world.js:
#   nền cao `base`, tường ba mặt, tường cửa ở z = d/2 - 0.6 chừa lối giữa rộng 2 × door, hiên cột ở z = d/2 + 0.9,
#   hai hàng cột trong (interiorColumns), bệ thờ ở cuối điện sâu d × 0.3, trần ở y = base + h + 0.6.
# Bảng chữ, câu đối, bàn thờ, nến, lư hương và đèn vẫn do game dựng.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from common import reset, box, cyl, sphere, ring, curved_roof, ridge, bake_and_export, P, finish, mat
from statue import build_statue, SPECS

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "hall.glb"
KIND = argv[1] if len(argv) > 1 else "tam-thanh"

BASE = dict(col="#b3242a", stone="#ddd5c6", stone_dark="#b9b0a0", floor_a="#8a5a3a", floor_b="#6b3a22",
            gold="#e7b75a", panel="#2c5a6e", wood="#4a2618", skin="#ecc79c", white="#f4f1ea", silk="#c8202a", lotus="#f2b8c8")
CFG = {
    "tam-thanh": dict(w=34, d=24, h=11, base=0.8, cols=10, door=7, roof="#d6582c", ridge="#f2b84b", wall="#9a2a20", trim="#e7b75a",
                      under="#5a2018", halo="#ffe8a0",
                      statues=[(-5.8, "linh-bao"), (0, "nguyen-thuy"), (5.8, "dao-duc")]),
    "tai-than": dict(w=22, d=16, h=8.5, base=0.6, cols=7, door=5, roof="#e9b02c", ridge="#ffd86a", wall="#8a3a14", trim="#ffd36b",
                     under="#5a3010", halo="#ffd86a", statues=[(0, "tai-than")]),
    "nguyet-lao": dict(w=22, d=16, h=8.5, base=0.6, cols=7, door=5, roof="#de5a88", ridge="#ffd0dc", wall="#a3304e", trim="#f7c6d4",
                       under="#5a1a30", halo="#ffc8d8", statues=[(0, "nguyet-lao")]),
}
C = {**BASE, **CFG[KIND]}
W, D, H, TOP, DOOR = C["w"], C["d"], C["h"], C["base"], C["door"]
BIG = W > 20
RY = TOP + H + 0.6
FZ = D / 2
reset({k: v for k, v in C.items() if isinstance(v, str)})

# ---------- Nền, bậc, sàn lát ô ----------
box("terrace", W + 3, TOP, D + 3, 0, TOP / 2, 0, "stone", 0.05, 1)
box("plinth", W + 3.4, 0.2, D + 3.4, 0, 0.1, 0, "stone_dark", 0.04, 1)
for i in range(3):
    sh = TOP * (3 - i) / 3
    box(f"step{i}", W * 0.5 + 0.3 * (2 - i), sh, 0.7, 0, sh / 2, FZ + 1.5 + 0.7 * (i + 0.5), "stone", 0.03)
# Sàn trong điện: ô vuông hai màu (một lưới, mỗi ô một vật liệu).
bm = bmesh.new()
nx, nz = int(W / 1.2), int(D / 1.2)
vs = [[bm.verts.new(P(-W / 2 + W * i / nx, TOP + 0.03, -D / 2 + D * j / nz)) for i in range(nx + 1)] for j in range(nz + 1)]
idx = []
for j in range(nz):
    for i in range(nx):
        bm.faces.new((vs[j + 1][i], vs[j + 1][i + 1], vs[j][i + 1], vs[j][i]))  # mặt hướng lên
        idx.append((i + j) % 2)
me = bpy.data.meshes.new("floor")
bm.to_mesh(me)
bm.free()
fo = bpy.data.objects.new("floor", me)
bpy.context.scene.collection.objects.link(fo)
me.materials.append(mat("floor_a"))
me.materials.append(mat("floor_b"))
for p, k in zip(me.polygons, idx):
    p.material_index = k
box("carpet", 2.6, 0.04, D - D * 0.3 - 0.6, 0, TOP + 0.06, D * 0.15 - 0.1, "col", 0)
for s in (-1, 1):
    box(f"carpet_edge{s}", 0.12, 0.05, D - D * 0.3 - 0.6, s * 1.3, TOP + 0.07, D * 0.15 - 0.1, "gold", 0)

# ---------- Tường, cửa, hiên ----------
WT = 0.4
box("wall_back", W, H, WT, 0, TOP + H / 2, -D / 2, "wall", 0.02, 2)
for s in (-1, 1):
    box(f"wall_side{s}", WT, H, D, s * W / 2, TOP + H / 2, 0, "wall", 0.02, 2)
    box(f"wainscot{s}", WT + 0.06, 1.3, D - 0.4, s * W / 2, TOP + 0.65, 0, "wood", 0.02)
box("wainscot_back", W - 0.4, 1.3, WT + 0.06, 0, TOP + 0.65, -D / 2, "wood", 0.02)
# Ô viền vàng trên tường trong (gợi tranh tường).
for s in (-1, 1):
    n = max(2, int(D / 3))
    for k in range(n):
        z = -D / 2 + D * (k + 0.5) / n
        box(f"wallpanel{s}_{k}", 0.05, H * 0.45, D / n - 0.6, s * (W / 2 - WT / 2 - 0.03), TOP + 1.6 + H * 0.25, z, "gold", 0.01)
        box(f"wallpanel_in{s}_{k}", 0.06, H * 0.45 - 0.25, D / n - 0.85, s * (W / 2 - WT / 2 - 0.04), TOP + 1.6 + H * 0.25, z, "panel", 0.01)
# Tường cửa phía trước: hai bên lối vào là cửa bức bàn chấn song.
for s in (-1, 1):
    x0, x1 = DOOR, W / 2
    box(f"front_wall{s}", x1 - x0, H, 0.3, s * (x0 + x1) / 2, TOP + H / 2, FZ - 0.6, "col", 0.02, 1)
    npan = max(1, round((x1 - x0) / 2.2))
    for k in range(npan):
        cx = s * (x0 + (x1 - x0) * (k + 0.5) / npan)
        pw, ph = (x1 - x0) / npan - 0.4, H * 0.62
        for j in range(1, 7):
            box(f"lat_v{s}{k}{j}", 0.05, ph, 0.12, cx - pw / 2 + pw * j / 7, TOP + 1.2 + ph / 2, FZ - 0.43, "gold", 0)
        for j in range(1, 8):
            box(f"lat_h{s}{k}{j}", pw, 0.05, 0.12, cx, TOP + 1.2 + ph * j / 8, FZ - 0.43, "gold", 0)
box("door_head", DOOR * 2, H * 0.24, 0.32, 0, TOP + H - H * 0.12, FZ - 0.6, "trim", 0.02)

col_x = [-W / 2 + 0.3 + (W - 0.6) * i / (C["cols"] - 1) for i in range(C["cols"])]
for i, x in enumerate(col_x):
    cyl(f"vcol{i}", 0.3, 0.26, H, x, TOP, FZ + 0.9, "col")
    cyl(f"vbase{i}", 0.44, 0.4, 0.26, x, TOP, FZ + 0.9, "stone_dark", 12)
    box(f"vcap{i}", 0.6, 0.2, 0.6, x, TOP + H - 0.06, FZ + 0.9, "trim", 0.03)
    for k, bw in enumerate((0.6, 0.95, 1.3)):
        box(f"dg{i}_{k}", bw, 0.18, 0.5 + k * 0.14, x, TOP + H + 0.08 + k * 0.18, FZ + 0.95 + 0.05 * k, "trim" if k % 2 == 0 else "col", 0.02)
box("beam_front", W + 0.8, 0.5, 0.55, 0, TOP + H + 0.15, FZ + 0.9, "trim", 0.03)
box("beam_front_red", W + 0.6, 0.24, 0.58, 0, TOP + H - 0.22, FZ + 0.9, "col", 0.02)

# ---------- Nội thất: hai hàng cột lớn, xà, dải lụa ----------
xs = [-DOOR, DOOR, -W * 0.36, W * 0.36] if BIG else [-DOOR, DOOR]
zs = [-0.18 * D, 0.12 * D] if BIG else [0.0]
RC = 0.5 if BIG else 0.36
for x in xs:
    for z in zs:
        cyl(f"icol{x:.1f}{z:.1f}", RC + 0.04, RC, H, x, TOP, z, "col", 20)
        cyl(f"ibase{x:.1f}{z:.1f}", RC + 0.3, RC + 0.12, 0.35, x, TOP, z, "stone", 16)
        for hy in (0.35, H * 0.38, H - 0.5):
            bpy.ops.mesh.primitive_torus_add(major_radius=RC + 0.04, minor_radius=0.07, major_segments=24, minor_segments=6, location=P(x, TOP + hy, z))
            finish(bpy.context.active_object, "gold", smooth=True)
        # Dải lụa đỏ treo trước cột, đuôi viền vàng.
        box(f"silk{x:.1f}{z:.1f}", 0.8, H * 0.45, 0.04, x, TOP + H * 0.7, z + RC + 0.1, "silk", 0.01)
        box(f"silkhem{x:.1f}{z:.1f}", 0.84, 0.16, 0.05, x, TOP + H * 0.47, z + RC + 0.1, "gold", 0.01)
for x in xs:
    box(f"lbeam{x:.1f}", 0.4, 0.5, D - 0.6, x, TOP + H + 0.15, 0, "col", 0.02)
for z in zs:
    box(f"xbeam{z:.1f}", W - 0.6, 0.45, 0.4, 0, TOP + H + 0.12, z, "trim", 0.02)

# ---------- Trần ô cờ và vòm tảo tỉnh ----------
HOLE = 6.4 if BIG else 4.4
CY = TOP + H + 0.5
CZ = -0.5 if BIG else 0.6
for (x, z, w, d) in ((0, (-D / 2 + CZ - HOLE / 2) / 2, W, CZ - HOLE / 2 + D / 2), (0, (D / 2 + CZ + HOLE / 2) / 2, W, D / 2 - CZ - HOLE / 2),
                     (-(W / 2 + HOLE / 2) / 2, CZ, W / 2 - HOLE / 2, HOLE), ((W / 2 + HOLE / 2) / 2, CZ, W / 2 - HOLE / 2, HOLE)):
    box(f"ceil{x:.1f}{z:.1f}", w, 0.2, d, x, CY, z, "panel", 0, 1)
step = 2.4
for k in range(int(W / step) + 1):
    box(f"coffer_x{k}", 0.16, 0.18, D, -W / 2 + k * step, CY - 0.15, 0, "gold", 0)
for k in range(int(D / step) + 1):
    box(f"coffer_z{k}", W, 0.18, 0.16, 0, CY - 0.15, -D / 2 + k * step, "gold", 0)
rr = HOLE / 2 * 1.08
for k, key in enumerate(("gold", "col", "gold", "panel")):
    ring(f"caisson{k}", rr - k * 0.5, rr - (k + 1) * 0.5, 0, CY - 0.1 + k * 0.38, 0.38, CZ, key)
cyl("caisson_top", rr - 1.9, rr - 1.9, 0.12, 0, CY + 1.42, CZ, "panel", 8)
sphere("pearl", 0.35 if BIG else 0.26, 0, CY + 0.5, CZ, "gold")

# ---------- Bệ thờ, bình phong, khám thờ ----------
DH, DD = (1.4 if BIG else 1.0), D * 0.3
DW = W * 0.64
for k in range(3):
    hh = DH * (k + 1) / 3
    dd = DD - k * 0.45
    box(f"dais{k}", DW - k * 0.6, hh, dd, 0, TOP + hh / 2, -D / 2 + 0.2 + dd / 2, "col" if k == 2 else "wood", 0.03)
box("dais_trim", DW + 0.05, 0.14, 0.1, 0, TOP + DH / 3 - 0.07, -D / 2 + 0.2 + DD + 0.02, "gold", 0)
box("screen", DW * 0.92, H * 0.74, 0.2, 0, TOP + DH + H * 0.37, -D / 2 + 0.45, "col", 0.02, 1)
box("screen_frame", DW * 0.96, H * 0.78, 0.12, 0, TOP + DH + H * 0.38, -D / 2 + 0.36, "gold", 0.02)
for k in range(5):
    sphere(f"sun{k}", 0.22, -DW * 0.36 + DW * 0.72 * k / 4, TOP + DH + H * 0.66, -D / 2 + 0.6, "gold")
for s in (-1, 1):
    cyl(f"canopy_post{s}", 0.16, 0.14, H * 0.78, s * DW * 0.44, TOP + DH, -D / 2 + DD - 0.2, "col", 12)
box("canopy_beam", DW * 0.92, 0.3, 0.3, 0, TOP + DH + H * 0.78, -D / 2 + DD - 0.2, "gold", 0.02)


SC = 2.5 if W > 30 else 2.0
for i, (sx, key) in enumerate(C["statues"]):
    build_statue(f"st{i}", sx, TOP + DH, -D / 2 + DD * 0.5, SC, SPECS[key])

# ---------- Mái hai tầng ----------
box("eave_ceiling", W + 4.2, 0.08, D + 4.2, 0, RY + 0.03, 0, "under", 0)
curved_roof("roof_low", W + 4.6, D + 4.6, 1.8, (D + 4.6 - D * 0.6) / 2, RY, lift=0.9 if BIG else 0.75, res=0.26 if BIG else 0.2)
box("upper_wall", W * 0.66, 1.4, D * 0.6, 0, RY + 2.3, 0, "wall", 0.02, 1)
nu = 7 if BIG else 5
for k in range(nu):
    x = -W * 0.33 + 0.3 + (W * 0.66 - 0.6) * k / (nu - 1)
    cyl(f"upcol{k}", 0.15, 0.13, 1.4, x, RY + 1.6, D * 0.3 + 0.02, "col", 10)
box("upper_beam", W * 0.66 + 0.2, 0.2, 0.22, 0, RY + 3.0, D * 0.3 + 0.05, "trim", 0.02)
UW, UD = W * 0.66 + 2.4, D * 0.6 + 2.4
curved_roof("roof_up", UW, UD, 2.0, UD / 2, RY + 2.9, lift=0.75 if BIG else 0.6, res=0.24 if BIG else 0.18)
ridge("ridge", UW - UD, RY + 2.9 + 2.0, curl=0.55 if BIG else 0.42, pearl=0.42 if BIG else 0.3)

bake_and_export(OUT, f"{KIND}-shell", ao_floor=0.5, ao_dist=2.5)
