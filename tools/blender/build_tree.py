# Dựng cây đa cổ thụ giữa sân tầng 2 bằng Blender rồi xuất .glb cho game.
#
#   blender --background --factory-startup --python tools/blender/build_tree.py -- assets/models/cay-da.glb
#
# Gốc toạ độ ở mặt sân, tâm gốc cây. Bồn đá tròn bán kính 5.15 (cao 0.55), bàn hương đá phía trước (+z).
# Thân: rễ bạnh toả trên mặt bồn, thân to xoắn, các cành lớn vươn ngang rồi cong lên; rễ phụ buông từ cành
# (dáng cây đa sân đình). Tán lá là các chùm khối phồng lõm. Dải lụa đỏ quấn thân, dải lụa và thẻ gỗ cầu nguyện
# treo dưới cành thấp. Đèn lồng (sáng về đêm) do game treo thêm.
import math, os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, box, cyl, sphere, tube, bake_and_export, P, finish, mat
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "cay-da.glb"
random.seed(11)
rnd = random.random

reset(dict(bark="#6e5e4c", root="#64553f", leaf="#3d7434", leaf2="#4b8638", leaf3="#5c9440", leaf_dark="#2f5f2c",
           stone="#d4cbbb", stone_dark="#aea493", soil="#5a6a38", red="#c4262c", red2="#de4a36", gold="#e2b04a",
           wood="#b08050", ink="#3a2a20"))

G = 0.5  # mặt đất trong bồn (mặt sân + 0.5)

# ---------- Bồn đá và bàn hương ----------
def ring(name, r_out, r_in, y0, h, key, seg=72):
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r_out, depth=h, location=P(0, y0 + h / 2, 0))
    outer = bpy.context.active_object
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r_in, depth=h + 0.2, location=P(0, y0 + h / 2, 0))
    inner = bpy.context.active_object
    mod = outer.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier="cut")
    bpy.data.objects.remove(inner)
    outer.name = name
    return finish(outer, key, bevel=0.03)

ring("bon", 5.0, 4.55, 0, 0.5, "stone")
ring("bon_mui", 5.15, 4.45, 0.5, 0.1, "stone_dark")
cyl("dat", 4.6, 4.6, G - 0.02, 0, 0, 0, "soil", verts=64)
# Bàn hương đá trước gốc cây, lư hương nhỏ.
box("ban_chan", 1.2, 0.7, 0.6, 0, 0.35, 6.0, "stone_dark", bevel=0.04)
box("ban_mat", 1.7, 0.12, 0.9, 0, 0.76, 6.0, "stone", bevel=0.03)
cyl("lu", 0.22, 0.28, 0.24, 0, 0.82, 6.0, "gold", verts=20)
cyl("lu_mieng", 0.3, 0.3, 0.05, 0, 1.06, 6.0, "gold", verts=20)
# Vài viên đá cuội trên mặt đất trong bồn.
for i in range(9):
    a = rnd() * math.tau
    r = 2.6 + rnd() * 1.6
    s = sphere(f"cuoi{i}", 0.18 + rnd() * 0.16, math.cos(a) * r, G + 0.05, math.sin(a) * r, "stone_dark", seg=10)
    s.scale = (1.3, 1.0, 0.6)

# ---------- Bộ khung thân, rễ, cành (dựng bằng Skin modifier) ----------
verts, edges, radii = [], [], []
tips = []          # đầu cành (đặt chùm lá)
limb_pts = []      # điểm trên cành lớn (treo rễ phụ, dải lụa)


def add(p, r, parent=None):
    verts.append(Vector(p))
    radii.append(r)
    i = len(verts) - 1
    if parent is not None:
        edges.append((parent, i))
    return i


# Thân: to ở gốc, hơi nghiêng và xoắn.
trunk = []
prev = None
for k, (y, r) in enumerate([(G - 0.3, 1.9), (G + 0.6, 1.62), (G + 1.8, 1.42), (G + 3.2, 1.32), (G + 4.4, 1.22), (G + 5.4, 1.1), (G + 6.3, 0.95), (G + 7.3, 0.78), (G + 8.6, 0.55)]):
    x = 0.25 * math.sin(y * 0.6) + 0.1 * k * 0.1
    z = 0.2 * math.cos(y * 0.5)
    prev = add((x, y, z), r, prev)
    trunk.append(prev)

# Rễ bạnh: toả từ thân xuống mặt đất, gồ lên rồi chìm dần.
for i in range(8):
    a = i / 8 * math.tau + (rnd() - 0.5) * 0.4
    ca, sa = math.cos(a), math.sin(a)
    p = trunk[1]
    for d, y, r in [(1.6, G + 0.25, 0.62), (2.6, G + 0.05, 0.4), (3.6, G - 0.05, 0.24), (4.3, G - 0.12, 0.12)]:
        d *= 0.85 + rnd() * 0.25
        p = add((ca * d, y, sa * d), r, p)


# Cành: đoạn nối đoạn, hướng ngả dần theo trọng lực rồi cong lên ở đầu cành.
def branch(start, d, length, r0, r1, depth, segs=4):
    p, pos = start, Vector(verts[start])
    d = d.normalized()
    for s in range(1, segs + 1):
        t = s / segs
        # Cong: nửa đầu hơi chúc xuống, nửa sau ngóc lên.
        bend = Vector((0, -0.12 if t < 0.5 else 0.22, 0))
        d = (d + bend + Vector(((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25))).normalized()
        pos = pos + d * (length / segs)
        p = add(tuple(pos), r0 + (r1 - r0) * t, p)
        if depth == 0:
            limb_pts.append((tuple(pos), r0 + (r1 - r0) * t))
        if depth < 2 and s in (2, 3) and rnd() < 0.85:
            side = Vector((-d.z, 0, d.x)) * (1 if rnd() < 0.5 else -1)
            nd = (d * 0.5 + side * 0.8 + Vector((0, 0.35 + rnd() * 0.3, 0))).normalized()
            branch(p, nd, length * (0.42 + rnd() * 0.15), max(0.12, (r0 + (r1 - r0) * t) * 0.6), 0.07, depth + 1, 3)
    tips.append((tuple(pos), depth))
    if depth < 2:
        for k in range(2):
            side = Vector((-d.z, 0, d.x)) * (1 if k else -1)
            nd = (d + side * 0.6 + Vector((0, 0.5, 0))).normalized()
            branch(p, nd, length * 0.3, max(0.08, r1 * 0.7), 0.05, 2, 2)


# Cành lớn từ các độ cao khác nhau trên thân, toả đều quanh cây.
LIMBS = 7
for i in range(LIMBS):
    a = i / LIMBS * math.tau + (rnd() - 0.5) * 0.5
    elev = 0.4 + rnd() * 0.3
    d = Vector((math.cos(a), elev, math.sin(a)))
    start = trunk[4 + i % 4]
    branch(start, d, 7.0 + rnd() * 2.0, 0.78 - (i % 4) * 0.07, 0.22, 0, 5)
# Ngọn giữa.
branch(trunk[-1], Vector((0.1, 1, 0.05)), 4.5, 0.5, 0.15, 1, 3)

me = bpy.data.meshes.new("than")
me.from_pydata([P(*v) for v in verts], edges, [])
skel = bpy.data.objects.new("than", me)
bpy.context.scene.collection.objects.link(skel)
skin = skel.modifiers.new("skin", "SKIN")
skin.branch_smoothing = 0.6
sk = me.skin_vertices[0].data
for i, r in enumerate(radii):
    sk[i].radius = (r, r)
sk[0].use_root = True
sub = skel.modifiers.new("sub", "SUBSURF")
sub.levels = 1
sub.render_levels = 1
# Vỏ cây sần: dời bề mặt theo nhiễu dọc thớ.
tex = bpy.data.textures.new("vo", "STUCCI")
tex.noise_scale = 0.35
disp = skel.modifiers.new("vo", "DISPLACE")
disp.texture = tex
disp.strength = 0.08
finish(skel, "bark", smooth=True)

# Rễ phụ buông từ cành lớn: dây mảnh rủ thẳng xuống, cái chạm đất, cái lơ lửng.
for i, (p, r) in enumerate(random.sample(limb_pts, min(30, len(limb_pts)))):
    x, y, z = p
    hd = math.hypot(x, z)
    if hd < 1.8 or y < G + 3.5:
        continue
    reach = G - 0.05 if hd < 4.3 and rnd() < 0.7 else y - (1.5 + rnd() * 3.0)
    pts, yy = [], y - r * 0.6
    wob = rnd() * 6
    while yy > reach:
        pts.append((x + 0.06 * math.sin(yy * 1.7 + wob), yy, z + 0.06 * math.cos(yy * 1.3 + wob)))
        yy -= 0.6
    pts.append((x, reach, z))
    if len(pts) >= 2:
        tube(f"re_phu{i}", pts, 0.035 + rnd() * 0.05, "root")

# ---------- Tán lá ----------
leaf_keys = ["leaf", "leaf2", "leaf3", "leaf_dark"]
blobs = []
# Chùm lá dẹt, thưa: mỗi đầu cành một chùm (bỏ bớt chùm ở cành con), chừa khe hở thấy cành và trời.
for (x, y, z), depth in tips:
    if depth == 2 and rnd() < 0.45:
        continue
    for k in range(1):
        r = (2.5 if depth < 2 else 1.8) + rnd() * 0.8
        bx, by, bz = x + (rnd() - 0.5) * 1.0, y + 0.6 + rnd() * 0.6, z + (rnd() - 0.5) * 1.0
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=P(bx, by, bz))
        o = bpy.context.active_object
        o.scale = (1.25, 1.25, 0.55)
        key = leaf_keys[2 if by > 14 else (1 if rnd() < 0.5 else (0 if by > 11 else 3))]
        blobs.append((o, key))
# Mỗi màu lá gộp thành một khối rồi dời bề mặt theo nhiễu cho lởm chởm như chùm lá.
leaf_tex = bpy.data.textures.new("la", "CLOUDS")
leaf_tex.noise_scale = 0.55
for key in leaf_keys:
    objs = [o for o, k in blobs if k == key]
    if not objs:
        continue
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = "la_" + key
    d = o.modifiers.new("la", "DISPLACE")
    d.texture = leaf_tex
    d.strength = 0.75
    d.mid_level = 0.5
    finish(o, key, smooth=False)

# ---------- Trang trí: lụa đỏ quấn thân, dải lụa và thẻ gỗ cầu nguyện ----------
for h, w in [(G + 1.3, 0.42)]:
    bpy.ops.mesh.primitive_torus_add(major_radius=1.47, minor_radius=0.09, major_segments=64, minor_segments=8, location=P(0.25 * math.sin(h * 0.6), h, 0.2 * math.cos(h * 0.5)))
    o = bpy.context.active_object
    o.scale = (1.05, 1.0, w / 0.18)
    finish(o, "red", smooth=True)
# Nút thắt và hai vạt lụa buông trước thân.
sphere("nut", 0.2, 0.0, G + 1.25, 1.75, "red2", seg=12)
for s in (-1, 1):
    box(f"vat{s}", 0.16, 1.3, 0.03, s * 0.18, G + 0.6, 1.78, "red2", bevel=0.0, tilt=0.0, yaw=s * 0.15)

hang = [p for p, r in limb_pts if G + 4.5 < p[1] < G + 8.5 and math.hypot(p[0], p[2]) > 2.2]
random.shuffle(hang)
for i, (x, y, z) in enumerate(hang[:46]):
    L = 0.9 + rnd() * 0.9
    x += (rnd() - 0.5) * 0.3
    z += (rnd() - 0.5) * 0.3
    top = y - 0.25
    yaw = rnd() * math.pi
    box(f"lua{i}", 0.09, L, 0.012, x, top - L / 2, z, "red" if i % 3 else "red2", bevel=0.0, yaw=yaw)
    if i % 2 == 0:
        box(f"the{i}", 0.2, 0.32, 0.03, x, top - L - 0.16, z, "wood", bevel=0.01, yaw=yaw)
        box(f"chu{i}", 0.08, 0.2, 0.034, x, top - L - 0.16, z, "ink", bevel=0.0, yaw=yaw)

bake_and_export(OUT, "cay-da", ao_floor=0.38, samples=40, ao_dist=4.0)
print("TIPS", len(tips), "LIMBPTS", len(limb_pts))
