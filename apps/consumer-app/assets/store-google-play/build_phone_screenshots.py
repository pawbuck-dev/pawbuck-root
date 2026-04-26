#!/usr/bin/env python3
"""
Build Google Play phone screenshots (portrait 1080×1920, RGB, ≤8 MB each).

Uses repo assets where possible. For strict “actual UI” store compliance, replace
these with captures from an Android emulator (1080×1920 or similar 9:16).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT.parent / "images"
ICON = ROOT / "app-icon-512.png"
SPLASH_BG = ASSETS / "splash-bg.png"
SPLASH_LOGO = ASSETS / "splash-logo.png"
OUT_DIR = ROOT / "phone-screenshots"

W, H = 1080, 1920

# Brand (light theme teal / shell)
TEAL = (43, 168, 158)
TEAL_DARK = (26, 107, 102)
SHELL = (245, 247, 248)
CARD = (238, 244, 244)
FG = (29, 36, 51)
MUTED = (97, 110, 130)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "Arial Bold.ttf" if bold else "Arial.ttf"
    path = Path("/System/Library/Fonts/Supplemental") / name
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


def gradient_bg(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    strip = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1) if H > 1 else 0.0
        strip.putpixel(
            (0, y),
            (
                int(top[0] * (1 - t) + bottom[0] * t),
                int(top[1] * (1 - t) + bottom[1] * t),
                int(top[2] * (1 - t) + bottom[2] * t),
            ),
        )
    return strip.resize((W, H), Image.Resampling.NEAREST)


def paste_fit_cover(base: Image.Image, img: Image.Image) -> None:
    """Scale img to cover base, center-crop, paste onto base."""
    bw, bh = base.size
    iw, ih = img.size
    scale = max(bw / iw, bh / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (nw - bw) // 2
    y = (nh - bh) // 2
    crop = img.crop((x, y, x + bw, y + bh))
    base.paste(crop, (0, 0))


def fake_status_bar(draw: ImageDraw.ImageDraw, title: str) -> None:
    draw.rectangle((0, 0, W, 88), fill=(255, 255, 255))
    draw.rectangle((0, 88, W, 89), fill=(217, 224, 224))
    ft = load_font(28, bold=True)
    fs = load_font(22)
    draw.text((40, 48), title, fill=FG, font=ft)
    draw.text((W - 120, 52), "9:41", fill=MUTED, font=fs)


def card(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, title: str, lines: list[str]) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=20, fill=CARD, outline=(217, 224, 224), width=2)
    ft = load_font(32, bold=True)
    fl = load_font(26)
    draw.text((x + 28, y + 24), title, fill=FG, font=ft)
    yy = y + 78
    for line in lines:
        draw.text((x + 28, yy), line, fill=MUTED, font=fl)
        yy += 40


def slide_01_hero() -> Image.Image:
    img = Image.new("RGB", (W, H), SHELL)
    if SPLASH_BG.exists():
        bg = Image.open(SPLASH_BG).convert("RGB")
        paste_fit_cover(img, bg)
        # soften with overlay
        overlay = Image.new("RGBA", (W, H), (255, 255, 255, 115))
        img = img.convert("RGBA")
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    logo_y = 520
    if SPLASH_LOGO.exists():
        lg = Image.open(SPLASH_LOGO).convert("RGBA")
        side = 280
        lg = lg.resize((side, side), Image.Resampling.LANCZOS)
        lx = (W - side) // 2
        img.paste(lg, (lx, logo_y), lg)
        logo_y += side + 60
    elif ICON.exists():
        lg = Image.open(ICON).convert("RGBA")
        side = 280
        lg = lg.resize((side, side), Image.Resampling.LANCZOS)
        lx = (W - side) // 2
        img.paste(lg, (lx, logo_y), lg)
        logo_y += side + 60

    draw = ImageDraw.Draw(img)
    t1 = load_font(52, bold=True)
    t2 = load_font(30)
    draw.text((W // 2, logo_y + 20), "Pawbuck", fill=FG, font=t1, anchor="mm")
    draw.text(
        (W // 2, logo_y + 90),
        "Pet health records, care team, and smart help",
        fill=MUTED,
        font=t2,
        anchor="mm",
    )
    return img


def slide_02_health_hub() -> Image.Image:
    img = gradient_bg((245, 250, 249), (230, 242, 241))
    draw = ImageDraw.Draw(img)
    fake_status_bar(draw, "Health")
    card(draw, 40, 140, W - 80, 200, "Health records", ["Vaccinations, medications, labs, and exams in one place."])
    card(draw, 40, 380, W - 80, 220, "This week", ["Upcoming vaccine reminders", "Recent journal notes"])
    card(draw, 40, 640, W - 80, 280, "Quick actions", ["Add a record", "Message your care team"])
    return img


def slide_03_vaccines() -> Image.Image:
    img = gradient_bg(SHELL, CARD)
    draw = ImageDraw.Draw(img)
    fake_status_bar(draw, "Vaccinations")
    y = 140
    for name, due in [
        ("Rabies", "Next due · tracked"),
        ("DHPP", "Up to date"),
        ("Bordetella", "Due in 30 days"),
    ]:
        card(draw, 40, y, W - 80, 160, name, [due])
        y += 190
    draw.rounded_rectangle((40, H - 200, W - 40, H - 80), radius=28, fill=TEAL)
    ft = load_font(30, bold=True)
    draw.text((W // 2, H - 140), "Add vaccination", fill=(255, 255, 255), font=ft, anchor="mm")
    return img


def slide_04_messages() -> Image.Image:
    img = gradient_bg(SHELL, (238, 244, 244))
    draw = ImageDraw.Draw(img)
    fake_status_bar(draw, "Messages")
    y = 140
    for title, sub in [
        ("Dr. Riverdale Vet", "Lab results attached · 2d ago"),
        ("Review Inbox", "1 item needs a quick look"),
        ("Groomer — Sparkle Paws", "Appointment confirmed"),
    ]:
        card(draw, 40, y, W - 80, 170, title, [sub])
        y += 200
    return img


def slide_05_milo() -> Image.Image:
    img = gradient_bg((240, 249, 248), TEAL_DARK)
    draw = ImageDraw.Draw(img)
    fake_status_bar(draw, "Milo")
    # chat card
    draw.rounded_rectangle((48, 160, W - 48, 420), radius=24, fill=(255, 255, 255))
    ft = load_font(28)
    draw.text((80, 200), "### Summary", fill=TEAL_DARK, font=load_font(30, bold=True))
    draw.text((80, 250), "From your records, Benji's latest rabies dose is logged.", fill=FG, font=ft)
    draw.text((80, 320), "Please consult your veterinarian for…", fill=MUTED, font=ft)
    # suggested chip row
    chip_y = 500
    chips = [("Try asking…", 48), ("Wellness tips", 400)]
    for label, x0 in chips:
        tw = 340
        draw.rounded_rectangle((x0, chip_y, x0 + tw, chip_y + 56), radius=22, fill=(255, 255, 255))
        draw.text((x0 + 18, chip_y + 14), label, fill=FG, font=load_font(22))
    return img


def slide_06_activity() -> Image.Image:
    img = gradient_bg(SHELL, (236, 252, 250))
    draw = ImageDraw.Draw(img)
    fake_status_bar(draw, "Activity")
    card(draw, 40, 140, W - 80, 320, "Pawthon", ["Weekly distance goal", "Streak: 4 days", "Tap to start a walk"])
    draw.rounded_rectangle((40, 500, W - 40, 620), radius=24, fill=TEAL)
    draw.text((W // 2, 560), "Start walk", fill=(255, 255, 255), font=load_font(32, bold=True), anchor="mm")
    return img


def save_rgb(path: Path, im: Image.Image) -> None:
    if im.mode != "RGB":
        im = im.convert("RGB")
    im.save(path, format="PNG", optimize=True)
    sz = path.stat().st_size
    if sz > 8 * 1024 * 1024:
        raise SystemExit(f"{path.name} exceeds 8 MB ({sz})")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    slides = [
        ("01-hero.png", slide_01_hero),
        ("02-health-hub.png", slide_02_health_hub),
        ("03-vaccinations.png", slide_03_vaccines),
        ("04-messages.png", slide_04_messages),
        ("05-milo.png", slide_05_milo),
        ("06-activity.png", slide_06_activity),
    ]
    for name, fn in slides:
        out = OUT_DIR / name
        im = fn()
        save_rgb(out, im)
        print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")
    print(f"Done. Upload the PNGs in {OUT_DIR} to Play Console → Phone screenshots.")


if __name__ == "__main__":
    main()
