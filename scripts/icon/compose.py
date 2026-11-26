"""Put a transparent 3D render on the brand teal background (full-bleed square icon).

python3 compose.py render.png out.png [scale] [dx] [dy]
"""
import sys

from PIL import Image, ImageDraw, ImageFilter


def background(n):
    """Diagonal teal gradient (#0F8496 -> #076070 -> #043944) with a soft top-right sheen."""
    stops = [(0.0, (0x12, 0x8F, 0xA2)), (0.5, (0x07, 0x60, 0x70)), (1.0, (0x03, 0x33, 0x3D))]
    g = Image.new("RGB", (n, n))
    px = g.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            for (a, ca), (b, cb) in zip(stops, stops[1:]):
                if a <= t <= b:
                    u = (t - a) / (b - a)
                    px[x, y] = tuple(round(ca[i] + (cb[i] - ca[i]) * u) for i in range(3))
                    break
    glow = Image.new("L", (n, n), 0)
    ImageDraw.Draw(glow).ellipse((-n * 0.25, -n * 0.45, n * 0.85, n * 0.55), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(n * 0.12))
    g = Image.composite(Image.new("RGB", (n, n), (255, 255, 255)), g, glow)
    return g.convert("RGBA")


def compose(render_path, out_path, scale=1.0, dx=0, dy=0, n=1024, transparent=False):
    r = Image.open(render_path).convert("RGBA")
    if scale != 1.0:
        s = round(r.width * scale)
        r = r.resize((s, s), Image.LANCZOS)
    base = Image.new("RGBA", (n, n), (0, 0, 0, 0)) if transparent else background(n)
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    layer.paste(r, ((n - r.width) // 2 + dx, (n - r.height) // 2 + dy), r)
    out = Image.alpha_composite(base, layer)
    if not transparent:
        out = out.convert("RGB")
    out.save(out_path)
    return out


if __name__ == "__main__":
    a = sys.argv
    compose(a[1], a[2], float(a[3]) if len(a) > 3 else 1.0, int(a[4]) if len(a) > 4 else 0,
            int(a[5]) if len(a) > 5 else 0)
