"""Every icon file the repo ships, from one square icon.

python3 make_assets.py source.png outdir      (in this folder: python3 make_assets.py source.png ../..)

`source.png` is the icon itself: 1024 px, square, opaque, full bleed (iOS and
Android round the corners themselves) on a flat navy. Writes outdir/<repo path>
for: the iOS AppIcon, the Capacitor source icon, the web/PWA icons,
public/icon.svg (the in-app icon), the Android launcher icons at every density,
the Play listing icon, the two splash sources, and swaps the icon tile in every
native splash screen (iOS Splash.imageset, Android drawable*/splash.png).
"""
import base64
import glob
import io
import os
import sys

from PIL import Image, ImageChops, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
ICON = Image.open(SRC).convert("RGB").resize((1024, 1024), Image.LANCZOS)
# The flat background, read off the icon's edges — the Android adaptive icon's
# background colour (res/values/ic_launcher_background.xml) is the same.
EDGE = [ICON.getpixel(p) for p in ((512, 4), (4, 512), (1019, 512), (512, 1019))]
NAVY = tuple(round(sum(c[i] for c in EDGE) / len(EDGE)) for i in range(3))


def tile(n, scale=1.0):
    """Square opaque icon of n px: the icon at `scale`, on its own navy (for safe zones)."""
    if scale == 1.0:
        return ICON.resize((n, n), Image.LANCZOS)
    bg = Image.new("RGB", (1024, 1024), NAVY)
    s = round(1024 * scale)
    bg.paste(ICON.resize((s, s), Image.LANCZOS), ((1024 - s) // 2, (1024 - s) // 2))
    return bg.resize((n, n), Image.LANCZOS)


def path(rel):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(img, rel, **kw):
    img.save(path(rel), optimize=True, **kw)
    print(rel, img.size, img.mode)


def rounded(img, radius, margin=0, canvas=None):
    n = canvas or img.width
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    out.paste(img, (margin, margin), m)
    return out


full = tile(1024)
save(full, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")  # no alpha: App Store rule
save(full, "assets/icon-only.png")
save(tile(180), "public/apple-touch-icon.png")
save(tile(192), "public/icon-192.png")
save(tile(512, 0.8), "public/icon-512.png")  # maskable: the art inside the central 80 % circle
save(tile(512).convert("RGBA"), "screenshots/store/play-icon-512.png")

# In-app icon (the menu's app card, lock screen, start flow, favicon): an SVG wrapping a
# 288 px JPEG, so the components keep pointing at /icon.svg.
buf = io.BytesIO()
tile(288).save(buf, "JPEG", quality=88, optimize=True, progressive=True)
b64 = base64.b64encode(buf.getvalue()).decode()
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024">\n'
    "  <!-- Haushaltsbuch Einfach: a coin dropping into a green money pot with a rising-chart mark,\n"
    "       on navy. From scripts/icon/source.png; regenerate with scripts/icon/README.md. -->\n"
    f'  <image width="1024" height="1024" href="data:image/jpeg;base64,{b64}"/>\n'
    "</svg>\n"
)
open(path("public/icon.svg"), "w").write(svg)
print("public/icon.svg", len(svg), "bytes")

# Android: legacy square (8/192 margin), round, and the adaptive foreground
# (opaque, full bleed, the art inside the 66/108 safe zone; background NAVY).
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
    save(tile(fg, 0.7), f"android/app/src/main/res/mipmap-{d}/ic_launcher_foreground.png")

colour = "#%02X%02X%02X" % NAVY
xml = path("android/app/src/main/res/values/ic_launcher_background.xml")
open(xml, "w").write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    f'    <color name="ic_launcher_background">{colour}</color>\n</resources>\n'
)
print("ic_launcher_background", colour)

# Splash sources: the icon as a 600 px rounded tile in the middle of the 2732 px canvas.
for name, bgc in (("splash.png", (245, 244, 240)), ("splash-dark.png", (14, 17, 18))):
    c = Image.new("RGBA", (2732, 2732), bgc + (255,))
    c.alpha_composite(rounded(tile(600), radius=120), (1066, 1066))
    save(c.convert("RGB"), f"assets/{name}")

# Native splash screens: find the icon tile on each (whatever differs from the
# background colour) and put the new one in its place, same size and spot.
natives = glob.glob(path("ios/App/App/Assets.xcassets/Splash.imageset/*.png")) + glob.glob(
    path("android/app/src/main/res/drawable*/splash.png"))
for f in sorted(natives):
    im = Image.open(f).convert("RGB")
    bgc = im.getpixel((0, 0))
    box = ImageChops.difference(im, Image.new("RGB", im.size, bgc)).convert("L").point(lambda v: 255 if v > 12 else 0).getbbox()
    if not box:
        continue
    w = max(box[2] - box[0], box[3] - box[1])
    x = (box[0] + box[2] - w) // 2
    y = (box[1] + box[3] - w) // 2
    ImageDraw.Draw(im).rectangle((x - 2, y - 2, x + w + 1, y + w + 1), fill=bgc)
    canvas = im.convert("RGBA")
    canvas.alpha_composite(rounded(tile(w), radius=round(w * 0.2)), (x, y))
    canvas.convert("RGB").save(f, optimize=True)
    print(os.path.relpath(f, OUT), im.size, "tile", w)
