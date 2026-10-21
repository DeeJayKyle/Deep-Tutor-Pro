"""Draw the Deep Tutor Pro app icon (indigo square, white graduation cap + "DT").

Usage:
    python3 packaging/icons/make_icon.py [OUTPUT_DIR]

Writes, into OUTPUT_DIR (default: this folder):
    icon.png             1024x1024 full icon (Windows installer, web, legacy Android)
    icon-only.png        same as icon.png (name expected by @capacitor/assets)
    icon-foreground.png  white mark on transparent, inside the adaptive-icon safe zone
    icon-background.png  solid indigo background for Android adaptive icons

Only icon.png is committed; the others are generated in CI. Requires Pillow.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
INDIGO = (79, 70, 229, 255)  # #4f46e5
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
SUPERSAMPLE = 4


def _font(px):
    candidates = [
        "DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=px)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def draw_mark(img, scale):
    """Draw the white mark centred on img; scale=1.0 fills the full icon area."""
    s = img.size[0]
    d = ImageDraw.Draw(img)
    c = s / 2

    def p(x, y):  # coordinates in a 1024 design grid, scaled about the centre
        return (c + (x - 512) * scale * s / SIZE, c + (y - 512) * scale * s / SIZE)

    # Mortarboard (diamond) and cap body.
    d.polygon([p(512, 170), p(860, 320), p(512, 470), p(164, 320)], fill=WHITE)
    d.polygon([p(312, 400), p(712, 400), p(712, 520), p(512, 590), p(312, 520)], fill=WHITE)
    # Tassel.
    w = max(1, round(22 * scale * s / SIZE))
    d.line([p(820, 337), p(820, 500)], fill=WHITE, width=w)
    r = 34 * scale * s / SIZE
    tx, ty = p(820, 520)
    d.ellipse([tx - r, ty - r, tx + r, ty + r], fill=WHITE)
    # "DT" lettering.
    font = _font(max(8, round(260 * scale * s / SIZE)))
    x, y = p(512, 790)
    d.text((x, y), "DT", font=font, fill=WHITE, anchor="mm")


def render(background, scale, corner=0):
    big = SIZE * SUPERSAMPLE
    img = Image.new("RGBA", (big, big), CLEAR)
    if background is not None:
        bg = ImageDraw.Draw(img)
        if corner:
            bg.rounded_rectangle([0, 0, big - 1, big - 1], radius=corner * SUPERSAMPLE, fill=background)
        else:
            bg.rectangle([0, 0, big, big], fill=background)
    draw_mark(img, scale)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
    out.mkdir(parents=True, exist_ok=True)
    full = render(INDIGO, 0.9)
    full.save(out / "icon.png", optimize=True)
    full.save(out / "icon-only.png", optimize=True)
    # Adaptive icons crop to the central ~66%, so shrink the mark to fit.
    render(None, 0.6).save(out / "icon-foreground.png", optimize=True)
    Image.new("RGBA", (SIZE, SIZE), INDIGO).save(out / "icon-background.png", optimize=True)
    for name in ("icon.png", "icon-only.png", "icon-foreground.png", "icon-background.png"):
        print(f"{out / name}: {(out / name).stat().st_size} bytes")


if __name__ == "__main__":
    main()
