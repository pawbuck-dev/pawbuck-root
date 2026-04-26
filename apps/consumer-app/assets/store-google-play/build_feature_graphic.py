#!/usr/bin/env python3
"""One-off builder for Google Play feature graphic (1024x500). Run from repo root or any cwd."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
# Prefer the Play-sized export so we never load the multi-megapixel source icon in CI/Linux.
SOURCE_ICON = ROOT / "app-icon-512.png"
FALLBACK_ICON = ROOT.parent / "images" / "icon.png"
OUT = ROOT / "feature-graphic-1024x500.png"

W, H = 1024, 500


def main() -> None:
    # Vertical gradient strip scaled to full width (top #2BA89E → bottom #1a6b66)
    top = (43, 168, 158)
    bot = (26, 107, 102)
    strip = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1) if H > 1 else 0.0
        strip.putpixel(
            (0, y),
            (
                int(top[0] * (1 - t) + bot[0] * t),
                int(top[1] * (1 - t) + bot[1] * t),
                int(top[2] * (1 - t) + bot[2] * t),
            ),
        )
    bg = strip.resize((W, H), Image.Resampling.NEAREST)

    src = SOURCE_ICON if SOURCE_ICON.exists() else FALLBACK_ICON
    if src == FALLBACK_ICON:
        from PIL import Image as PILImage

        PILImage.MAX_IMAGE_PIXELS = None  # source icon can be very large
    icon = Image.open(src).convert("RGBA")
    icon_side = 340
    icon = icon.resize((icon_side, icon_side), Image.Resampling.LANCZOS)
    ix = 56
    iy = (H - icon_side) // 2
    bg.paste(icon, (ix, iy), icon)

    draw = ImageDraw.Draw(bg)
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 62)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 28)
    except OSError:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    tx = ix + icon_side + 44
    title = "Pawbuck"
    sub = "Pet health · records · care team"

    # Soft text shadow for contrast on teal
    shadow = (15, 60, 58)
    for dx, dy in ((2, 2), (1, 1)):
        draw.text((tx + dx, 168 + dy), title, fill=shadow, font=font_title)
        draw.text((tx + dx, 248 + dy), sub, fill=shadow, font=font_sub)

    draw.text((tx, 168), title, fill=(255, 255, 255), font=font_title)
    draw.text((tx, 248), sub, fill=(232, 252, 250), font=font_sub)

    # Subtle bottom edge strip (brand ring hint)
    draw.rectangle((0, H - 6, W, H), fill=(18, 82, 78))

    bg.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
