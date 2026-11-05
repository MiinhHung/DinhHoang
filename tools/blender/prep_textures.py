# Chuẩn bị texture Poly Haven (CC0) cho game: nhỏ gọn, cân độ sáng để nhân với màu có sẵn.
#
#   blender --background --factory-startup --python tools/blender/prep_textures.py
#
# Nguồn (assets/textures/src, tải từ https://polyhaven.com):
#   clay_roof_tiles_02 — ngói ống, tác giả Amal Kumar   → roof_tiles.jpg (xám, sáng trung bình ≈ 1 để nhân với màu mái)
#   rectangular_paving — đá lát chữ nhật, Dimitrios Savva → paving.jpg (giữ màu, kéo về tông kem ấm của sân)
import os
import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets", "textures", "src")
OUT = os.path.join(ROOT, "assets", "textures")


def load(name):
    img = bpy.data.images.load(os.path.join(SRC, name))
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    return img, px


def save(img, px, name, size, quality):
    h, w = px.shape[:2]
    img.pixels[:] = np.clip(px, 0, 1).ravel()
    img.scale(size, size)
    img.file_format = "JPEG"
    img.save(filepath=os.path.join(OUT, name), quality=quality)
    print("SAVED", name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")


# Ngói: lấy độ sáng, chia cho trung bình để màu nhân vào giữ nguyên tông, tăng tương phản nhẹ.
img, px = load("clay_roof_tiles_02.jpg")
lum = px[..., 0] * 0.3 + px[..., 1] * 0.59 + px[..., 2] * 0.11
lum = lum / lum.mean()
# Ảnh sRGB được giải mã sang tuyến tính khi nhân màu, nên giữ nền sáng (≈ 0.88) và tăng tương phản khe ngói.
lum = 0.88 + (lum - 1.0) * 1.15
px[..., 0] = px[..., 1] = px[..., 2] = np.clip(lum, 0, 1)
save(img, px, "roof_tiles.jpg", 512, 82)

# Vân chi tiết cho địa hình (ảnh xám, sáng trung bình ≈ 1 sau khi nhân, game nhân với màu cỏ/đá của đỉnh):
#   leafy_grass — cỏ lá nhỏ (Poly Haven)  → grass_detail.jpg
#   cliff_side  — vách đá phân tầng        → rock_detail.jpg
for src_name, out_name, contrast in (("leafy_grass.jpg", "grass_detail.jpg", 1.1), ("cliff_side.jpg", "rock_detail.jpg", 1.25)):
    img, px = load(src_name)
    lum = px[..., 0] * 0.3 + px[..., 1] * 0.59 + px[..., 2] * 0.11
    lum = lum / lum.mean()
    lum = np.clip(0.62 + (lum - 1.0) * 0.5 * contrast, 0, 1)
    px[..., 0] = px[..., 1] = px[..., 2] = lum
    save(img, px, out_name, 512, 82)

# Đá lát: giữ biến thiên từng tấm, kéo màu trung bình về kem ấm (giống mặt sân cũ).
img, px = load("rectangular_paving.jpg")
target = np.array([0.80, 0.75, 0.66], dtype=np.float32)
mean = px[..., :3].reshape(-1, 3).mean(axis=0)
px[..., :3] = px[..., :3] / mean * target
save(img, px, "paving.jpg", 1024, 80)
