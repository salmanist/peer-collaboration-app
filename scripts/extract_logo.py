import math
import os
from PIL import Image, ImageDraw

def main():
    # Load original image
    src_path = r"C:\Users\Syed Shayan Hussian\.gemini\antigravity\brain\9f2e646e-effc-4cc8-9a1d-95861d22f46a\.user_uploaded\media_1792532464760_d128f5ab.png"
    im = Image.open(src_path).convert("RGBA")
    
    # Yellow color
    yellow_color = (253, 191, 30, 255) # #FDBF1E
    green_bg = (13, 62, 2, 255)         # #0D3E02
    
    # 1. Output clean SVG
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Fello Iconic Winged-F Logo Mark -->
  <!-- Top Bar -->
  <path d="M 14 16 L 76 16 C 83 16, 87 20, 85 26 L 71 39 C 69 41, 66 42, 63 42 L 14 42 C 12 42, 11 41, 11 39 L 11 19 C 11 17, 12 16, 14 16 Z" fill="#FDBF1E" />
  <!-- Middle Bar + Lower Stem -->
  <path d="M 14 50 L 70 50 C 76 50, 80 54, 78 60 L 64 73 C 62 75, 59 76, 56 76 L 39 76 L 39 82 C 39 88, 36 93, 31 95 C 27 97, 21 95, 17 91 C 13 87, 11 82, 11 76 L 11 53 C 11 51, 12 50, 14 50 Z" fill="#FDBF1E" />
</svg>"""

    os.makedirs(r"mobile\assets", exist_ok=True)
    with open(r"mobile\assets\fello-logo.svg", "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("SVG generated.")

    # 2. Render high resolution PNGs using PIL drawing with anti-aliasing
    # To get ultra crisp anti-aliasing, render at 4x and supersample down.
    def render_logo(size, bg_color=None, padding_ratio=0.15):
        scale = 4
        canvas_size = size * scale
        canvas = Image.new("RGBA", (canvas_size, canvas_size), bg_color or (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        
        # We draw the two shapes:
        # Canvas dimensions: canvas_size
        pad = canvas_size * padding_ratio
        w = canvas_size - 2 * pad
        h = canvas_size - 2 * pad
        
        def pt(x, y):
            return (pad + (x / 100.0) * w, pad + (y / 100.0) * h)
        
        # Path 1: Top Bar
        # Polygon with smooth rounded corners
        top_pts = [
            pt(14, 16), pt(76, 16), pt(86, 25), pt(70, 41), pt(14, 41)
        ]
        draw.polygon(top_pts, fill=yellow_color)
        
        # Path 2: Middle bar and stem
        # Middle bar extends from (14, 50) to (70, 50) -> (80, 59) -> (64, 75) -> (39, 75)
        # Stem goes down from (39, 75) to (39, 86) -> (28, 95) -> (14, 88) -> (14, 50)
        bot_pts = [
            pt(14, 50), pt(70, 50), pt(79, 59), pt(63, 75), pt(39, 75),
            pt(39, 86), pt(28, 95), pt(14, 88), pt(14, 50)
        ]
        draw.polygon(bot_pts, fill=yellow_color)
        
        # Downsample with high-quality Lanczos resampling
        return canvas.resize((size, size), Image.Resampling.LANCZOS)

    # Generate app assets
    # 1. fello-logo.png (512x512 transparent)
    logo_512 = render_logo(512)
    logo_512.save(r"mobile\assets\fello-logo.png")
    
    # 2. icon.png (1024x1024 app icon with #0D3E02 dark emerald background)
    icon_1024 = render_logo(1024, bg_color=green_bg, padding_ratio=0.22)
    icon_1024.save(r"mobile\assets\icon.png")

    # 3. android-icon-foreground.png (432x432 transparent)
    fg_432 = render_logo(432, padding_ratio=0.25)
    fg_432.save(r"mobile\assets\android-icon-foreground.png")

    # 4. android-icon-background.png (432x432 solid #0D3E02)
    bg_img = Image.new("RGBA", (432, 432), green_bg)
    bg_img.save(r"mobile\assets\android-icon-background.png")

    # 5. android-icon-monochrome.png (432x432 monochrome white logo on transparent)
    def render_monochrome(size):
        scale = 4
        canvas_size = size * scale
        canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        pad = canvas_size * 0.25
        w = canvas_size - 2 * pad
        h = canvas_size - 2 * pad
        def pt(x, y):
            return (pad + (x / 100.0) * w, pad + (y / 100.0) * h)
        top_pts = [pt(14, 16), pt(76, 16), pt(86, 25), pt(70, 41), pt(14, 41)]
        draw.polygon(top_pts, fill=(255, 255, 255, 255))
        bot_pts = [pt(14, 50), pt(70, 50), pt(79, 59), pt(63, 75), pt(39, 75), pt(39, 86), pt(28, 95), pt(14, 88), pt(14, 50)]
        draw.polygon(bot_pts, fill=(255, 255, 255, 255))
        return canvas.resize((size, size), Image.Resampling.LANCZOS)
    
    mono_img = render_monochrome(432)
    mono_img.save(r"mobile\assets\android-icon-monochrome.png")

    # 6. splash-icon.png (transparent 256x256)
    splash_img = render_logo(256, padding_ratio=0.1)
    splash_img.save(r"mobile\assets\splash-icon.png")

    # 7. favicon.png (48x48)
    favicon_img = render_logo(48, bg_color=green_bg, padding_ratio=0.12)
    favicon_img.save(r"mobile\assets\favicon.png")

    print("All image assets created successfully!")

if __name__ == "__main__":
    main()
