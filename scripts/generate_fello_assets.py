import os
from PIL import Image, ImageDraw, ImageFont

def main():
    assets_dir = os.path.abspath(r"mobile\assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    # 1. Base extracted mark
    base_mark = Image.open(os.path.join(assets_dir, "extracted_fello_mark.png")).convert("RGBA")
    
    # Clean the gap: ensure any row between y=190 and y=212 has 0 alpha
    for y in range(190, 213):
        for x in range(base_mark.width):
            r, g, b, a = base_mark.getpixel((x, y))
            if a > 0:
                base_mark.putpixel((x, y), (r, g, b, 0))

    # Crop tightly to non-transparent bounding box
    bbox = base_mark.getbbox()
    cropped_mark = base_mark.crop(bbox) # approx 400x420
    
    # Brand colors
    fello_yellow = (253, 191, 30, 255) # #FDBF1E
    fello_green = (13, 62, 2, 255)      # #0D3E02
    white = (255, 255, 255, 255)
    
    def create_centered_mark(canvas_size, mark_ratio=0.72, color=fello_yellow, bg_color=None):
        canvas = Image.new("RGBA", (canvas_size, canvas_size), bg_color or (0, 0, 0, 0))
        # Determine mark dimensions
        max_dim = int(canvas_size * mark_ratio)
        aspect = cropped_mark.width / cropped_mark.height
        if aspect > 1:
            mw = max_dim
            mh = int(mw / aspect)
        else:
            mh = max_dim
            mw = int(mh * aspect)
            
        scaled_mark = cropped_mark.resize((mw, mh), Image.Resampling.LANCZOS)
        
        # Colorize if not default yellow
        if color != fello_yellow:
            colored = Image.new("RGBA", scaled_mark.size, (0, 0, 0, 0))
            for y in range(mh):
                for x in range(mw):
                    a = scaled_mark.getpixel((x, y))[3]
                    if a > 0:
                        colored.putpixel((x, y), (color[0], color[1], color[2], a))
            scaled_mark = colored
            
        ox = (canvas_size - mw) // 2
        oy = (canvas_size - mh) // 2
        canvas.paste(scaled_mark, (ox, oy), scaled_mark)
        return canvas

    # 1. fello-logo.png (512x512)
    logo_512 = create_centered_mark(512, mark_ratio=0.85)
    logo_512.save(os.path.join(assets_dir, "fello-logo.png"))

    # 2. fello-logo@2x.png (1024x1024)
    logo_1024 = create_centered_mark(1024, mark_ratio=0.85)
    logo_1024.save(os.path.join(assets_dir, "fello-logo@2x.png"))

    # 3. fello-logo-white.png (512x512)
    logo_white = create_centered_mark(512, mark_ratio=0.85, color=white)
    logo_white.save(os.path.join(assets_dir, "fello-logo-white.png"))

    # 4. icon.png (1024x1024 app launcher icon with #0D3E02 dark emerald background)
    app_icon = create_centered_mark(1024, mark_ratio=0.62, bg_color=fello_green)
    app_icon.save(os.path.join(assets_dir, "icon.png"))

    # 5. android-icon-foreground.png (432x432 transparent adaptive foreground)
    android_fg = create_centered_mark(432, mark_ratio=0.55)
    android_fg.save(os.path.join(assets_dir, "android-icon-foreground.png"))

    # 6. android-icon-background.png (432x432 solid #0D3E02)
    android_bg = Image.new("RGBA", (432, 432), fello_green)
    android_bg.save(os.path.join(assets_dir, "android-icon-background.png"))

    # 7. android-icon-monochrome.png (432x432 monochrome white on transparent)
    android_mono = create_centered_mark(432, mark_ratio=0.55, color=white)
    android_mono.save(os.path.join(assets_dir, "android-icon-monochrome.png"))

    # 8. splash-icon.png (256x256 transparent)
    splash_icon = create_centered_mark(256, mark_ratio=0.75)
    splash_icon.save(os.path.join(assets_dir, "splash-icon.png"))

    # 9. favicon.png (48x48)
    favicon = create_centered_mark(48, mark_ratio=0.85, bg_color=fello_green)
    favicon.save(os.path.join(assets_dir, "favicon.png"))

    # 10. Generate the header combo logo: [Yellow Logo] + [Fello Text]
    # We create two versions:
    # A) For dark green backgrounds (White text)
    # B) For light backgrounds (Emerald green text)
    # Load Google Sans or system font if available, or PIL default
    font_path = None
    possible_fonts = [
        r"C:\Windows\Fonts\ProductSans-Bold.ttf",
        r"C:\Windows\Fonts\GoogleSans-Bold.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\seguiui.ttf",
    ]
    for fp in possible_fonts:
        if os.path.exists(fp):
            font_path = fp
            break

    def create_header_logo(text_color, bg_color=None):
        # Height 120, width 420
        H = 120
        W = 440
        canvas = Image.new("RGBA", (W, H), bg_color or (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        
        # Mark size 76x76
        mark_size = 76
        scaled_mark = cropped_mark.resize((int(mark_size * (cropped_mark.width / cropped_mark.height)), mark_size), Image.Resampling.LANCZOS)
        
        mark_x = 16
        mark_y = (H - mark_size) // 2
        canvas.paste(scaled_mark, (mark_x, mark_y), scaled_mark)
        
        # Draw text 'Fello'
        text = "Fello"
        font_size = 62
        try:
            fnt = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
        except Exception:
            fnt = ImageFont.load_default()
            
        text_x = mark_x + scaled_mark.width + 16
        text_y = (H - font_size) // 2 - 4
        draw.text((text_x, text_y), text, fill=text_color, font=fnt)
        
        return canvas

    header_white = create_header_logo(white)
    header_white.save(os.path.join(assets_dir, "fello-header-white.png"))

    header_green = create_header_logo(fello_green)
    header_green.save(os.path.join(assets_dir, "fello-header-green.png"))

    print("All Fello assets generated with 100% precision!")

if __name__ == "__main__":
    main()
