import os
from PIL import Image, ImageDraw

def render_vector_fello_logo(size=1024, fill_color=(13, 62, 2, 255), bg_color=None, padding_ratio=0.04):
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), bg_color or (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    pad = canvas_size * padding_ratio
    s = (canvas_size - 2 * pad) / 100.0
    
    def pt(x, y):
        return (pad + x * s, pad + y * s)
    
    # 1. Top bar: smooth winged stroke
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
    
    # 2. Middle bar + Stem
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

def main():
    assets_dir = os.path.abspath(r"mobile\assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    emerald_green = (13, 62, 2, 255)  # #0D3E02 Signature Green
    yellow = (253, 191, 30, 255)      # #FDBF1E Signature Yellow
    white = (255, 255, 255, 255)      # Pure White
    
    # 1. Primary fello-logo.png now in emerald green with transparent background
    logo_green_512 = render_vector_fello_logo(512, fill_color=emerald_green)
    logo_green_512.save(os.path.join(assets_dir, "fello-logo.png"))
    logo_green_512.save(os.path.join(assets_dir, "fello-logo-green.png"))

    logo_green_1024 = render_vector_fello_logo(1024, fill_color=emerald_green)
    logo_green_1024.save(os.path.join(assets_dir, "fello-logo@2x.png"))
    logo_green_1024.save(os.path.join(assets_dir, "fello-logo-green@2x.png"))

    logo_green_1536 = render_vector_fello_logo(1536, fill_color=emerald_green)
    logo_green_1536.save(os.path.join(assets_dir, "fello-logo@3x.png"))
    logo_green_1536.save(os.path.join(assets_dir, "fello-logo-green@3x.png"))

    # 2. Keep yellow variants
    logo_yellow_512 = render_vector_fello_logo(512, fill_color=yellow)
    logo_yellow_512.save(os.path.join(assets_dir, "fello-logo-yellow.png"))

    logo_yellow_1024 = render_vector_fello_logo(1024, fill_color=yellow)
    logo_yellow_1024.save(os.path.join(assets_dir, "fello-logo-yellow@2x.png"))

    # 3. White variant
    logo_white_512 = render_vector_fello_logo(512, fill_color=white)
    logo_white_512.save(os.path.join(assets_dir, "fello-logo-white.png"))

    # 4. App icon (emerald green mark on 100% transparent background)
    app_icon = render_vector_fello_logo(1024, fill_color=emerald_green, padding_ratio=0.10)
    app_icon.save(os.path.join(assets_dir, "icon.png"))

    # 5. Android adaptive icon foreground (emerald green on transparent)
    android_fg = render_vector_fello_logo(432, fill_color=emerald_green, padding_ratio=0.18)
    android_fg.save(os.path.join(assets_dir, "android-icon-foreground.png"))

    # 6. Splash icon (emerald green on transparent)
    splash = render_vector_fello_logo(512, fill_color=emerald_green, padding_ratio=0.05)
    splash.save(os.path.join(assets_dir, "splash-icon.png"))

    # 7. Favicon (emerald green on transparent)
    favicon = render_vector_fello_logo(64, fill_color=emerald_green, padding_ratio=0.05)
    favicon.save(os.path.join(assets_dir, "favicon.png"))

    # 8. SVG vector in green
    svg_green = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" fill="none">
  <!-- Fello Iconic Winged-F Green Mark (Zero Background) -->
  <polygon points="11.5,13.5 80.5,13.5 85.5,16.5 86.5,20.5 72.5,38.5 68.5,41.5 64.5,41.5 11.5,41.5" fill="#0D3E02"/>
  <polygon points="11.5,48.5 72.5,48.5 77.5,51.5 78.5,55.5 64.5,73.0 60.0,76.0 38.0,76.0 38.0,86.0 37.0,91.0 24.0,95.5 14.0,91.5 11.5,85.5" fill="#0D3E02"/>
</svg>'''
    with open(os.path.join(assets_dir, "fello-logo.svg"), "w", encoding="utf-8") as f:
        f.write(svg_green)
    with open(os.path.join(assets_dir, "fello-logo-green.svg"), "w", encoding="utf-8") as f:
        f.write(svg_green)

    print("All green logo assets generated with 100% transparent backgrounds!")

if __name__ == "__main__":
    main()
