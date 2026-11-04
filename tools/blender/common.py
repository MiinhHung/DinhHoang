# Công cụ dùng chung cho các script dựng mô hình: vật liệu theo bảng màu, hình khối, mái cong ngói,
# gờ nóc đuôi rồng, bake bóng đổ vào màu đỉnh và xuất .glb nén Draco.
# Toạ độ viết theo hệ của three.js (y lên trên, mặt tiền nhìn về +z); P() đổi sang hệ Blender.
import bpy, bmesh, math
from mathutils import Vector

PALETTE = {}
MATS = {}


def P(x, y, z):
    return Vector((x, -z, y))


def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def reset(palette):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PALETTE.clear()
    PALETTE.update(palette)
    MATS.clear()


def mat(key):
    if key not in MATS:
        m = bpy.data.materials.new(key)
        m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(PALETTE[key]), 1)
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


def box(name, w, h, d, x, y, z, key, bevel=0.03, cuts=0, yaw=0.0, tilt=0.0):
    """Khối hộp; yaw xoay quanh trục đứng (radian, theo hệ three.js), tilt nghiêng quanh trục ngang x."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(x, y, z))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, d, h)
    o.rotation_euler = (tilt, 0, yaw)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, key, bevel, cuts)


def cyl(name, rb, rt, h, x, y, z, key, verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rb, radius2=rt, depth=h, location=P(x, y + h / 2, z))
    o = bpy.context.active_object
    o.name = name
    return finish(o, key, smooth=True)


def sphere(name, r, x, y, z, key):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=20, ring_count=12, location=P(x, y, z))
    o = bpy.context.active_object
    o.name = name
    return finish(o, key, smooth=True)


def tube(name, pts, radius, key):
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
    bpy.context.scene.collection.objects.link(o)
    for other in bpy.context.selected_objects:
        other.select_set(False)
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


def curved_roof(name, rw, rd, rh, edge, base_y, lift=0.75, res=0.15, ripple=0.06, period=0.44, cx=0.0, cz=0.0, hips=True):
    """Mái chảy bốn mặt, lõm dần về phía hiên, bốn góc cong vút; rãnh ngói là gợn thật trên bề mặt."""
    nx, nz = max(8, int(rw / res)), max(8, int(rd / res))
    bm = bmesh.new()
    verts = []
    for j in range(nz + 1):
        z = -rd / 2 + rd * j / nz
        row = []
        for i in range(nx + 1):
            x = -rw / 2 + rw * i / nx
            y, s = roof_height(x, z, rw, rd, rh, edge, lift)
            along_x = (rd / 2 - abs(z)) < (rw / 2 - abs(x))
            u = x if along_x else z
            y += ripple * abs(math.sin(math.pi * u / period)) * (1 - s ** 4)
            row.append(bm.verts.new(P(cx + x, base_y + y, cz + z)))
        verts.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.16
    sol.offset = -1
    finish(o, "roof", smooth=True)
    if hips:
        for sx in (-1, 1):
            for sz in (-1, 1):
                pts = []
                for k in range(13):
                    t = k / 12
                    x = sx * (rw / 2 - t * edge)
                    z = sz * (rd / 2 - t * edge)
                    y, _ = roof_height(x * 0.999, z * 0.999, rw, rd, rh, edge, lift)
                    pts.append((cx + x, base_y + y + 0.1, cz + z))
                tip = (cx + sx * (rw / 2 + 0.5), base_y + lift + 0.5, cz + sz * (rd / 2 + 0.5))
                tube(f"{name}_hip{sx}{sz}", [tip] + pts, 0.1, "ridge")
    return o


def ridge(name, length, y, cx=0.0, cz=0.0, curl=0.42, pearl=0.32):
    """Gờ nóc dày, hai đầu cuộn xoắn ốc kiểu đuôi rồng, hạt châu ở giữa."""
    box(f"{name}_beam", length + 0.4, 0.34, 0.32, cx, y + 0.12, cz, "ridge", 0.06)
    box(f"{name}_band", length + 0.2, 0.08, 0.36, cx, y + 0.02, cz, "col", 0.02)
    for s in (-1, 1):
        ox, oy = cx + s * (length / 2 + 0.15), y + 0.2 + curl
        pts = []
        for k in range(29):
            a = -math.pi / 2 + k / 28 * math.pi * 1.75
            r = curl * (1 - 0.45 * k / 28)
            pts.append((ox + s * r * math.cos(a), oy + r * math.sin(a), cz))
        tube(f"{name}_curl{s}", [(ox - s * 0.25, y + 0.2, cz)] + pts, 0.12, "ridge")
    if pearl:
        sphere(f"{name}_pearl", pearl, cx, y + 0.3 + pearl, cz, "ridge")
        for s in (-1, 1):
            bpy.ops.mesh.primitive_torus_add(major_radius=pearl * 0.9, minor_radius=0.06, location=P(cx + s * (pearl + 0.25), y + 0.3 + pearl * 0.8, cz), rotation=(math.pi / 2, 0, 0))
            finish(bpy.context.active_object, "ridge", smooth=True)


# ---------- Gộp, bake, xuất ----------
def bake_and_export(out, name, ao_floor=0.42, samples=48):
    scene = bpy.context.scene
    objs = [o for o in scene.objects if o.type == "MESH"]
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    me = obj.data

    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.device = "CPU"
    ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = ao
    scene.render.bake.target = "VERTEX_COLORS"
    bpy.ops.object.bake(type="AO")

    # Màu cuối = màu vật liệu × bóng đổ (nâng sáng cho hợp phong cách hoạt hình).
    col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    # Ô vật liệu rỗng (ví dụ mặt cắt của phép boolean) lấy màu vật liệu đầu tiên.
    first = next(m for m in me.materials if m)
    mat_cols = [lin(PALETTE[(m or first).name]) for m in me.materials]
    for poly in me.polygons:
        base = mat_cols[poly.material_index]
        for li in poly.loop_indices:
            k = ao_floor + (1 - ao_floor) * ao.data[li].color[0]
            col.data[li].color = (base[0] * k, base[1] * k, base[2] * k, 1)
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.active_color = me.color_attributes["Col"]
    try:
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
    except Exception:
        pass

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
    kw = dict(filepath=out, export_format="GLB", export_apply=True, export_yup=True, use_selection=False,
              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
    try:
        bpy.ops.export_scene.gltf(export_vertex_color="ACTIVE", **kw)
    except TypeError:
        bpy.ops.export_scene.gltf(export_colors=True, **kw)
    print(f"EXPORTED {out} verts={stats[0]} faces={stats[1]}")
