"""Every icon file the repo ships, from one transparent 3D render.

python3 make_assets.py render.png outdir
Writes outdir/<repo path> for: iOS AppIcon, Capacitor source icon, web/PWA icons,
public/icon.svg (the in-app icon), Android launcher icons at every density, the
Play listing icon and the two splash screens.
"""
import base64
import io
import os
import sys

from PIL import Image, ImageDraw

from compose import background

SRC, OUT = sys.argv[1], sys.argv[2]
ART = Image.open(SRC).convert("RGBA")  # 1024, transparent, art centred


def tile(n, scale=1.0, dy=0):
    """Square opaque icon: teal background with the art at `scale` of full size."""
    bg = background(1024)
    s = round(1024 * scale)
    art = ART.resize((s, s), Image.LANCZOS)
    bg.alpha_composite(art, ((1024 - s) // 2, (1024 - s) // 2 + dy))
    return bg.convert("RGB").resize((n, n), Image.LANCZOS)


def save(img, rel, **kw):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, **kw)
    print(rel, img.size, img.mode)


def rounded(img, radius, margin=0, canvas=None):
    n = canvas or img.width
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    out.paste(img, (margin, margin), m)
    return out


full = tile(1024)
save(full, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
save(full, "assets/icon-only.png")
save(tile(180), "public/apple-touch-icon.png")
save(tile(192), "public/icon-192.png")
# maskable: keep the art inside the central 80 % circle
save(tile(512, 0.78), "public/icon-512.png")
play = tile(512)
save(play.convert("RGBA"), "screenshots/store/play-icon-512.png")

# In-app icon (Optionen card, lock screen, start flow, favicon): an SVG wrapping a
# 288 px JPEG, so the components keep pointing at /icon.svg.
buf = io.BytesIO()
tile(288).save(buf, "JPEG", quality=88, optimize=True, progressive=True)
b64 = base64.b64encode(buf.getvalue()).decode()
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024">\n'
    "  <!-- Haushaltsbuch Einfach: the 3D household book, open: entries ticked off as paid or still open,\n"
    "       the month's bars rising and a stack of euro coins, on the hero teal. Rendered in Blender from\n"
    "       scripts/icon/scene.py; regenerate with scripts/icon/README.md. -->\n"
    f'  <image width="1024" height="1024" href="data:image/jpeg;base64,{b64}"/>\n'
    "</svg>\n"
)
p = os.path.join(OUT, "public/icon.svg")
os.makedirs(os.path.dirname(p), exist_ok=True)
open(p, "w").write(svg)
print("public/icon.svg", len(svg), "bytes")

# Android: legacy square (8/192 margin), round, and the adaptive foreground
# (opaque, full bleed, art inside the 66/108 safe zone; background colour #076070).
dens = {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for d, n in dens.items():
    big = 4 * n
    m = round(big * 8 / 192)
    sq = rounded(tile(big - 2 * m), radius=round(big * 0.09), margin=m, canvas=big)
    save(sq.resize((n, n), Image.LANCZOS), f"android/app/src/main/res/mipmap-{d}/ic_launcher.png")
    rd = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((m, m, big - m - 1, big - m - 1), fill=255)
    rd.paste(tile(big, 0.86), (0, 0), mask)
    save(rd.resize((n, n), Image.LANCZOS), f"android/app/src/main/res/mipmap-{d}/ic_launcher_round.png")
    fg = round(n * 108 / 48)
    save(tile(fg, 0.54), f"android/app/src/main/res/mipmap-{d}/ic_launcher_foreground.png")

# Splash: the icon as a 600 px rounded tile in the middle of the 2732 px canvas.
for name, bgc in (("splash.png", (245, 244, 240)), ("splash-dark.png", (14, 17, 18))):
    c = Image.new("RGBA", (2732, 2732), bgc + (255,))
    t = rounded(tile(600), radius=120)
    c.alpha_composite(t, (1066, 1066))
    save(c.convert("RGB"), f"assets/{name}")
