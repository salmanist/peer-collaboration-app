import os
from PIL import Image

src_path = r"C:/Users/Syed Shayan Hussian/.gemini/antigravity/brain/9f2e646e-effc-4cc8-9a1d-95861d22f46a/.user_uploaded/media_1792559311817_057fe643.png"
assets_dir = r"mobile/assets"

print("Loading master image from:", src_path)
master_img = Image.open(src_path).convert("RGBA")
W, H = master_img.size
print(f"Master image dimensions: {W} x {H}")

# 1. Helper function to create color variants while preserving exact anti-aliased alpha
def create_color_variant(im, rgb_color):
    r_target, g_target, b_target = rgb_color
    var_im = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src_pixels = im.load()
    var_pixels = var_im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = src_pixels[x, y]
            if a > 0:
                var_pixels[x, y] = (r_target, g_target, b_target, a)
    return var_im

# 2. Helper to center an image on a transparent canvas
def place_centered(im, canvas_size, target_height):
    cw, ch = canvas_size
    target_width = round(target_height * (im.size[0] / im.size[1]))
    scaled = im.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    x_offset = (cw - target_width) // 2
    y_offset = (ch - target_height) // 2
    canvas.paste(scaled, (x_offset, y_offset), scaled)
    return canvas

# Generate color variants of master (868 x 1024)
yellow_master = master_img
print("Generating green variant (#0D3E02)...")
green_master = create_color_variant(yellow_master, (13, 62, 2))
print("Generating white variant (#FFFFFF)...")
white_master = create_color_variant(yellow_master, (255, 255, 255))

# 3. Save scaled variants (@1x: 434x512, @2x: 868x1024, @3x: 1302x1536)
scales = [
    ("", (434, 512)),
    ("@2x", (868, 1024)),
    ("@3x", (1302, 1536)),
]

for suffix, dims in scales:
    # Yellow
    res_yellow = yellow_master if dims == (W, H) else yellow_master.resize(dims, Image.Resampling.LANCZOS)
    res_yellow.save(os.path.join(assets_dir, f"fello-logo{suffix}.png"), "PNG", optimize=True)
    res_yellow.save(os.path.join(assets_dir, f"fello-logo-yellow{suffix}.png"), "PNG", optimize=True)
    
    # Green
    res_green = green_master if dims == (W, H) else green_master.resize(dims, Image.Resampling.LANCZOS)
    res_green.save(os.path.join(assets_dir, f"fello-logo-green{suffix}.png"), "PNG", optimize=True)
    
    # White
    res_white = white_master if dims == (W, H) else white_master.resize(dims, Image.Resampling.LANCZOS)
    res_white.save(os.path.join(assets_dir, f"fello-logo-white{suffix}.png"), "PNG", optimize=True)
    print(f"Saved {dims[0]}x{dims[1]} variants for scale '{suffix}'")

# Also save un-suffixed white logo
white_master.resize((434, 512), Image.Resampling.LANCZOS).save(os.path.join(assets_dir, "fello-logo-white.png"), "PNG", optimize=True)

# 4. Generate App Icons
print("Generating App Icons...")
# icon.png (1024x1024, height 720)
icon_1024 = place_centered(yellow_master, (1024, 1024), 720)
icon_1024.save(os.path.join(assets_dir, "icon.png"), "PNG", optimize=True)

# splash-icon.png (512x512, height 380)
splash_512 = place_centered(yellow_master, (512, 512), 380)
splash_512.save(os.path.join(assets_dir, "splash-icon.png"), "PNG", optimize=True)

# favicon.png (64x64, height 52)
fav_64 = place_centered(yellow_master, (64, 64), 52)
fav_64.save(os.path.join(assets_dir, "favicon.png"), "PNG", optimize=True)

# android-icon-foreground.png (432x432, height 260)
android_fg = place_centered(yellow_master, (432, 432), 260)
android_fg.save(os.path.join(assets_dir, "android-icon-foreground.png"), "PNG", optimize=True)

# android-icon-monochrome.png (432x432, height 260, white)
android_mono = place_centered(white_master, (432, 432), 260)
android_mono.save(os.path.join(assets_dir, "android-icon-monochrome.png"), "PNG", optimize=True)

# android-icon-background.png (432x432, transparent)
android_bg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
android_bg.save(os.path.join(assets_dir, "android-icon-background.png"), "PNG", optimize=True)

print("All raster icon assets generated!")

# 5. Generate exact SVG vector paths
def rdp(points, epsilon):
    if len(points) < 3:
        return points
    x1, y1 = points[0]
    x2, y2 = points[-1]
    dx = x2 - x1
    dy = y2 - y1
    denom = (dx*dx + dy*dy)**0.5
    dmax = 0
    index = 0
    for i in range(1, len(points) - 1):
        x, y = points[i]
        d = ((x - x1)**2 + (y - y1)**2)**0.5 if denom == 0 else abs(dy*x - dx*y + x2*y1 - y2*x1) / denom
        if d > dmax:
            dmax = d
            index = i
    if dmax > epsilon:
        rec1 = rdp(points[:index+1], epsilon)
        rec2 = rdp(points[index:], epsilon)
        return rec1[:-1] + rec2
    else:
        return [points[0], points[-1]]

top_poly = []
for x in range(0, W):
    if master_img.getpixel((x, 0))[3] > 128:
        top_poly.append((x, 0))
for y in range(1, 314):
    pts = [x for x in range(W) if master_img.getpixel((x, y))[3] > 128]
    if pts:
        top_poly.append((max(pts), y))
for x in range(top_poly[-1][0]-1, -1, -1):
    if master_img.getpixel((x, 313))[3] > 128:
        top_poly.append((x, 313))
for y in range(312, 0, -1):
    top_poly.append((0, y))

bot_poly = []
for x in range(0, W):
    if master_img.getpixel((x, 410))[3] > 128:
        bot_poly.append((x, 410))
for y in range(411, 723):
    pts = [x for x in range(W) if master_img.getpixel((x, y))[3] > 128]
    if pts:
        bot_poly.append((max(pts), y))
bot_poly.append((313, 723))
bot_poly.append((313, 1023))
for y in range(1023, 722, -1):
    pts = [x for x in range(W) if master_img.getpixel((x, y))[3] > 128]
    if pts:
        bot_poly.append((min(pts), y))
for y in range(722, 410, -1):
    bot_poly.append((0, y))

top_s = rdp(top_poly, 1.0)
bot_s = rdp(bot_poly, 1.0)

top_pts_str = " ".join(f"{x},{y}" for x, y in top_s)
bot_pts_str = " ".join(f"{x},{y}" for x, y in bot_s)

def make_svg(color):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" height="100%" fill="none">
  <!-- Exact Fello Logo Master -->
  <polygon points="{top_pts_str}" fill="{color}" />
  <polygon points="{bot_pts_str}" fill="{color}" />
</svg>
"""

svg_yellow = make_svg("#F4B73F")
with open(os.path.join(assets_dir, "fello-logo.svg"), "w", encoding="utf-8") as f:
    f.write(svg_yellow)
with open(os.path.join(assets_dir, "fello-logo-yellow.svg"), "w", encoding="utf-8") as f:
    f.write(svg_yellow)

svg_green = make_svg("#0D3E02")
with open(os.path.join(assets_dir, "fello-logo-green.svg"), "w", encoding="utf-8") as f:
    f.write(svg_green)

print("SVG assets generated!")
print("Done all logo replacements successfully!")
