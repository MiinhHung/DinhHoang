# Dựng phần kiến trúc một điện bằng Blender (chạy ngầm), bake bóng đổ vào màu đỉnh rồi xuất .glb cho game.
#
#   blender --background --factory-startup --python tools/blender/build_hall.py -- assets/models/tam-thanh.glb tam-thanh
#
# Kích thước khớp với makeHall() trong js/world.js: nền cao 0.6, hàng cột trước ở z = d/2 - 0.2,
# mái dưới bắt đầu ở y = 0.6 + h + 0.1. Tượng, bàn thờ, bảng tên, câu đối, đèn vẫn do game dựng.
# Toạ độ viết theo hệ của three.js (y lên trên, mặt tiền nhìn về +z); P() đổi sang hệ Blender.
import bpy, bmesh, math, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "hall.glb"
KIND = argv[1] if len(argv) > 1 else "tam-thanh"

CFG = {
    "tam-thanh": dict(w=14, d=8, h=4.6, roof="#d6582c", tile_dark="#a83a1c", ridge="#f2b84b", wall="#9a2a20",
                      col="#b3242a", trim="#e7b75a", stone="#ddd5c6", stone_dark="#b9b0a0", floor="#6b3a22", under="#5a2018"),
}
C = CFG[KIND]
W, D, H = C["w"], C["d"], C["h"]
TOP = 0.6
RY = TOP + H + 0.1


def P(x, y, z):
    return Vector((x, -z, y))


def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


# ---------- Cảnh trống ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

MATS = {}


def mat(key):
    if key not in MATS:
        m = bpy.data.materials.new(key)
        m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(C[key]), 1)
        MATS[key] = m
    return MATS[key]


def finish(obj, key, bevel=0.0, cuts=0, smooth=False):
    obj.data.materials.append(mat(key))
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    if cuts:
        mod = obj.modifiers.new("dens", "SUBSURF")
        mod.subdivision_type = "SIMPLE"
        mod.levels = cuts
        mod.render_levels = cuts
    for p in obj.data.polygons:
        p.use_smooth = smooth
    return obj


def box(name, w, h, d, x, y, z, key, bevel=0.03, cuts=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(x, y, z))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, key, bevel, cuts)


def cyl(name, rb, rt, h, x, y, z, key, verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rb, radius2=rt, depth=h, location=P(x, y + h / 2, z))
    o = bpy.context.active_object
    o.name = name
    return finish(o, key, smooth=True)


def tube(name, pts, radius, key, res=10):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*P(*q), 1)
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    return finish(o, key, smooth=True)


# ---------- Mái cong ----------
def roof_height(x, z, rw, rd, rh, edge, lift):
    e = min(rw / 2 - abs(x), rd / 2 - abs(z))
    s = max(0.0, min(1.0, e / edge))
    y = rh * s ** 1.6
    ax, az = abs(x) / (rw / 2), abs(z) / (rd / 2)
    y += lift * (ax ** 5) * (az ** 5) * (1 - s) ** 1.5
    return y, s


def curved_roof(name, rw, rd, rh, edge, base_y, lift=0.75, res=0.15, ripple=0.06, period=0.44):
    nx, nz = int(rw / res), int(rd / res)
    bm = bmesh.new()
    verts = []
    for j in range(nz + 1):
        z = -rd / 2 + rd * j / nz
        row = []
        for i in range(nx + 1):
            x = -rw / 2 + rw * i / nx
            y, s = roof_height(x, z, rw, rd, rh, edge, lift)
            # Rãnh ngói chạy dọc theo chiều dốc của mỗi mặt mái.
            along_x = (rd / 2 - abs(z)) < (rw / 2 - abs(x))
            u = x if along_x else z
            y += ripple * abs(math.sin(math.pi * u / period)) * (1 - s ** 4)
            row.append(bm.verts.new(P(x, base_y + y, z)))
        verts.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.16
    sol.offset = -1
    finish(o, "roof", smooth=True)
    # Gờ góc mái chạy theo đường chéo, đầu đao cong vút ra ngoài.
    for sx in (-1, 1):
        for sz in (-1, 1):
            pts = []
            for k in range(13):
                t = k / 12
                x = sx * (rw / 2 - t * edge)
                z = sz * (rd / 2 - t * edge)
                y, _ = roof_height(x * 0.999, z * 0.999, rw, rd, rh, edge, lift)
                pts.append((x, base_y + y + 0.1, z))
            tip = (sx * (rw / 2 + 0.55), base_y + lift + 0.55, sz * (rd / 2 + 0.55))
            tube(f"{name}_hip", [tip] + pts, 0.11, "ridge")
    return o


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
    for k, (bw, bh) in enumerate(((0.5, 0.16), (0.8, 0.16), (1.1, 0.16))):
        box(f"dougong{i}_{k}", bw, bh, 0.42 + k * 0.12, x, TOP + H + 0.05 + k * 0.16, CZ + 0.05 * k, "trim" if k % 2 == 0 else "col", 0.02)
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
for x in [-W * 0.33 + 0.25 + (W * 0.66 - 0.5) * i / 4 for i in range(5)]:
    cyl(f"upcol{x:.1f}", 0.13, 0.12, 1.1, x, RY + 1.35, D * 0.3 + 0.02, "col", 10)
box("upper_beam", W * 0.66 + 0.2, 0.18, 0.2, 0, RY + 2.35, D * 0.3 + 0.05, "trim", 0.02)
UW, UD = W * 0.66 + 2.2, D * 0.6 + 2.2
curved_roof("roof_up", UW, UD, 1.7, UD / 2, RY + 2.4, lift=0.6)

# Gờ nóc, hai đầu cong như đuôi rồng và hạt châu ở giữa.
ridge_y = RY + 2.4 + 1.7
ridge_len = UW - UD
box("ridge", ridge_len + 0.4, 0.34, 0.32, 0, ridge_y + 0.12, 0, "ridge", 0.06)
box("ridge_band", ridge_len + 0.2, 0.08, 0.36, 0, ridge_y + 0.02, 0, "col", 0.02)
for s in (-1, 1):
    pts = [(s * (ridge_len / 2 + 0.1 - 0.25 * math.sin(a) * 0) + s * 0.55 * (1 - math.cos(a)) - s * 0.0, ridge_y + 0.3 + 0.75 * math.sin(a), 0)
           for a in [k / 10 * math.pi * 0.95 for k in range(11)]]
    tube(f"ridge_curl{s}", pts, 0.14, "ridge")
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.34, segments=20, ring_count=12, location=P(0, ridge_y + 0.62, 0))
finish(bpy.context.active_object, "ridge", smooth=True)
for s in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.07, location=P(s * 0.6, ridge_y + 0.55, 0), rotation=(math.pi / 2, 0, 0))
    finish(bpy.context.active_object, "ridge", smooth=True)

# ---------- Gộp, bake bóng đổ vào màu đỉnh ----------
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = bpy.data.objects["terrace"]
for o in bpy.context.selected_objects:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.objects.active = bpy.data.objects["terrace"]
bpy.ops.object.join()
hall = bpy.context.active_object
hall.name = f"{KIND}-shell"
me = hall.data

scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.device = "CPU"
ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
me.color_attributes.active_color = ao
scene.render.bake.target = "VERTEX_COLORS"
bpy.ops.object.bake(type="AO")

# Màu cuối = màu vật liệu × bóng đổ (nâng sáng cho hợp phong cách hoạt hình).
col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
mat_cols = [lin(C[m.name]) for m in me.materials]
for poly in me.polygons:
    base = mat_cols[poly.material_index]
    for li in poly.loop_indices:
        a = ao.data[li].color[0]
        k = 0.42 + 0.58 * a
        col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
me.color_attributes.remove(me.color_attributes["AO"])
me.color_attributes.active_color = me.color_attributes["Col"]
try:
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
except Exception:
    pass

# Một vật liệu trắng dùng màu đỉnh; game sẽ thay bằng vật liệu Lambert của mình.
me.materials.clear()
vm = bpy.data.materials.new("vertex")
vm.use_nodes = True
nodes, links = vm.node_tree.nodes, vm.node_tree.links
attr = nodes.new("ShaderNodeVertexColor")
attr.layer_name = "Col"
links.new(attr.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
me.materials.append(vm)

stats = (len(me.vertices), len(me.polygons))
kw = dict(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, use_selection=False,
          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
try:
    bpy.ops.export_scene.gltf(export_vertex_color="ACTIVE", **kw)
except TypeError:
    bpy.ops.export_scene.gltf(export_colors=True, **kw)
print(f"EXPORTED {OUT} verts={stats[0]} faces={stats[1]}")
