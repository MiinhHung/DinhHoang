# Render ảnh xem trước một file .glb (nhìn chéo từ trên xuống) để kiểm tra mô hình mà không cần mở game.
#
#   blender --background --factory-startup --python tools/blender/preview.py -- assets/models/boc-dich.glb preview.png [top]
import bpy, math, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
top = len(argv) > 2 and argv[2] == "top"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
lo = Vector((min(min((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs), min(min((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs), 0))
hi = Vector((max(max((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs), max(max((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs), max(max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
center = (lo + hi) / 2
size = max(hi.x - lo.x, hi.y - lo.y, hi.z)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
bpy.context.scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = size * 1.15
if top:
    cam.location = (center.x, center.y, hi.z + 20)
    cam.rotation_euler = (0, 0, 0)
else:
    # Nhìn từ phía nam (mặt tiền, -Y trong Blender) chếch xuống 35°.
    d = size * 2
    cam.location = (center.x, center.y - d * math.cos(math.radians(35)), center.z + d * math.sin(math.radians(35)))
    cam.rotation_euler = (math.radians(55), 0, 0)
bpy.context.scene.camera = cam
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "VERTEX"
sc.render.resolution_x = sc.render.resolution_y = 900
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("PREVIEW", out)
