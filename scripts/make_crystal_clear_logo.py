import os
from PIL import Image, ImageDraw

def render_vector_fello_logo(size=1024, fill_color=(253, 191, 30, 255), bg_color=None, padding_ratio=0.04):
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), bg_color or (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    pad = canvas_size * padding_ratio
    s = (canvas_size - 2 * pad) / 100.0
    
    def pt(x, y):
        return (pad + x * s, pad + y * s)
    
    # 1. Top bar: smooth winged geometric stroke
    top_poly = [
        pt(11.5, 13.5),
        pt(80.5, 13.5),
        pt(85.5, 16.5),
        pt(86.5, 20.5),
        pt(72.5, 38.5),
        pt(68.5, 41.5),
        pt(64.5, 41.5),
        pt(11.5, 41.5),
    ]
    draw.polygon(top_poly, fill=fill_color)
    
    # 2. Middle bar + Stem: smooth lower wing and vertical stem
    bot_poly = [
        pt(11.5, 48.5),
        pt(72.5, 48.5),
        pt(77.5, 51.5),
        pt(78.5, 55.5),
        pt(64.5, 73.0),
        pt(60.0, 76.0),
        pt(38.0, 76.0),
        pt(38.0, 86.0),
        pt(37.0, 91.0),
        pt(24.0, 95.5),
        pt(14.0, 91.5),
        pt(11.5, 85.5),
    ]
    draw.polygon(bot_poly, fill=fill_color)
    
    return img.resize((size, size), Image.Resampling.LANCZOS)

def safe_save(img, path):
    tmp = path + ".tmp.png"
    img.save(tmp, "PNG")
    if os.path.exists(path):
        os.remove(path)
    os.rename(tmp, path)

def main():
    assets_dir = os.path.abspath(r"mobile\assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    yellow = (253, 191, 30, 255)  # #FDBF1E Signature Yellow
    white = (255, 255, 255, 255)   # Pure White
    
    # ALL ASSETS HAVE ZERO GREEN AND 100% TRANSPARENT BACKGROUNDS
    
    # 1. Standard logo transparent (512x512)
    logo_512 = render_vector_fello_logo(512, fill_color=yellow, bg_color=None, padding_ratio=0.04)
    safe_save(logo_512, os.path.join(assets_dir, "fello-logo.png"))
    safe_save(logo_512, os.path.join(assets_dir, "fello-logo-yellow.png"))
    
    # 2. Retina @2x (1024x1024)
    logo_1024 = render_vector_fello_logo(1024, fill_color=yellow, bg_color=None, padding_ratio=0.04)
    safe_save(logo_1024, os.path.join(assets_dir, "fello-logo@2x.png"))
    safe_save(logo_1024, os.path.join(assets_dir, "fello-logo-yellow@2x.png"))
    
    # 3. Super-retina @3x (1536x1536)
    logo_1536 = render_vector_fello_logo(1536, fill_color=yellow, bg_color=None, padding_ratio=0.04)
    safe_save(logo_1536, os.path.join(assets_dir, "fello-logo@3x.png"))

    # 4. White logo transparent (512x512)
    logo_white = render_vector_fello_logo(512, fill_color=white, bg_color=None, padding_ratio=0.04)
    safe_save(logo_white, os.path.join(assets_dir, "fello-logo-white.png"))

    # 5. App launcher icon (1024x1024 pure transparent yellow logo)
    app_icon = render_vector_fello_logo(1024, fill_color=yellow, bg_color=None, padding_ratio=0.10)
    safe_save(app_icon, os.path.join(assets_dir, "icon.png"))

    # 6. Android adaptive foreground (432x432 transparent)
    android_fg = render_vector_fello_logo(432, fill_color=yellow, bg_color=None, padding_ratio=0.18)
    safe_save(android_fg, os.path.join(assets_dir, "android-icon-foreground.png"))

    # 7. Android adaptive background (432x432 transparent)
    android_bg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    safe_save(android_bg, os.path.join(assets_dir, "android-icon-background.png"))

    # 8. Android monochrome icon (432x432 transparent)
    android_mono = render_vector_fello_logo(432, fill_color=white, bg_color=None, padding_ratio=0.18)
    safe_save(android_mono, os.path.join(assets_dir, "android-icon-monochrome.png"))

    # 9. Splash icon (512x512 transparent)
    splash = render_vector_fello_logo(512, fill_color=yellow, bg_color=None, padding_ratio=0.05)
    safe_save(splash, os.path.join(assets_dir, "splash-icon.png"))

    # 10. Favicon (64x64 transparent)
    favicon = render_vector_fello_logo(64, fill_color=yellow, bg_color=None, padding_ratio=0.05)
    safe_save(favicon, os.path.join(assets_dir, "favicon.png"))

    # 11. SVG vector string (pure transparent)
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" fill="none">
  <!-- Fello Iconic Winged-F Yellow Mark (Zero Background) -->
  <polygon points="11.5,13.5 80.5,13.5 85.5,16.5 86.5,20.5 72.5,38.5 68.5,41.5 64.5,41.5 11.5,41.5" fill="#FDBF1E"/>
  <polygon points="11.5,48.5 72.5,48.5 77.5,51.5 78.5,55.5 64.5,73.0 60.0,76.0 38.0,76.0 38.0,86.0 37.0,91.0 24.0,95.5 14.0,91.5 11.5,85.5" fill="#FDBF1E"/>
</svg>'''
    with open(os.path.join(assets_dir, "fello-logo.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    with open(os.path.join(assets_dir, "fello-logo-yellow.svg"), "w", encoding="utf-8") as f:
        f.write(svg)

    print("All yellow logo assets generated with safe_save!")

if __name__ == "__main__":
    main()
