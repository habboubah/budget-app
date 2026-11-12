#!/usr/bin/env python3
"""Checks every exported file against the Apple and Google Play rules in
reference/store-specs.md, plus the headline rules in reference/copywriting.md.

Exits non-zero on the first category of failure, printing file, actual and
expected. Standard library only -- reading a width out of a PNG header or a JPEG
SOF marker is a dozen lines, which is cheaper than a Pillow dependency.
"""
import json
import os
import struct
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.abspath(os.path.join(SKILL, "..", "..", ".."))

CFG = json.load(open(os.path.join(SKILL, "config/screenshots.config.json")))
OUT = os.path.join(ROOT, CFG["outDir"])

# Play: JPEG or 24-bit PNG, no alpha, 320-3840 per side, longest <= 2x shortest,
# 2-8 phone screenshots, under 8 MB each. Apple: 1-10 per device class per locale.
PLAY_MIN, PLAY_MAX = 320, 3840
PLAY_MAX_BYTES = 8 * 1024 * 1024
BANNED = ["download now", "download today", "best app", "#1", "number one",
          "must have", "must-have", "amazing", "revolutionary", "click here"]
MAX_HEADLINE_WORDS = 5

rows = []
errors = []


def png_info(path):
    """(width, height, has_alpha) from the IHDR chunk."""
    with open(path, "rb") as f:
        head = f.read(26)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    width, height = struct.unpack(">II", head[16:24])
    colour_type = head[25]
    return width, height, colour_type in (4, 6)  # 4 = grey+alpha, 6 = RGBA


def jpeg_info(path):
    """(width, height, False) from the first SOF marker. JPEG has no alpha."""
    with open(path, "rb") as f:
        if f.read(2) != b"\xff\xd8":
            raise ValueError("not a JPEG")
        while True:
            marker = f.read(2)
            if len(marker) < 2 or marker[0] != 0xFF:
                raise ValueError("malformed JPEG")
            (length,) = struct.unpack(">H", f.read(2))
            # SOF0..SOF15, skipping the non-frame markers in that range.
            if 0xC0 <= marker[1] <= 0xCF and marker[1] not in (0xC4, 0xC8, 0xCC):
                body = f.read(5)
                height, width = struct.unpack(">HH", body[1:5])
                return width, height, False
            f.seek(length - 2, os.SEEK_CUR)


def measure(path):
    with open(path, "rb") as f:
        magic = f.read(2)
    return png_info(path) if magic == b"\x89P" else jpeg_info(path)


def check(path, store, expect_w, expect_h, expect_fmt, kind):
    rel = os.path.relpath(path, ROOT)
    if not os.path.exists(path):
        errors.append(f"{rel}: missing")
        return
    size = os.path.getsize(path)
    try:
        w, h, alpha = measure(path)
    except ValueError as exc:
        errors.append(f"{rel}: unreadable ({exc})")
        return

    status = "ok"
    fmt = "png" if path.endswith(".png") else "jpeg"

    if (w, h) != (expect_w, expect_h):
        errors.append(f"{rel}: {w}x{h}, expected exactly {expect_w}x{expect_h}")
        status = "FAIL"
    if fmt != expect_fmt:
        errors.append(f"{rel}: format {fmt}, expected {expect_fmt}")
        status = "FAIL"

    if store == "apple" and alpha:
        errors.append(f"{rel}: has an alpha channel; App Store Connect rejects transparency")
        status = "FAIL"

    if store == "play":
        if alpha:
            errors.append(f"{rel}: has an alpha channel; Play needs JPEG or 24-bit PNG")
            status = "FAIL"
        if size > PLAY_MAX_BYTES:
            errors.append(f"{rel}: {size} bytes, Play allows at most {PLAY_MAX_BYTES}")
            status = "FAIL"
        # The side and ratio limits are screenshot rules. The feature graphic is
        # pinned at 1024x500, which is 2.05:1 and would fail them.
        if kind == "screenshot":
            if not (PLAY_MIN <= min(w, h) and max(w, h) <= PLAY_MAX):
                errors.append(f"{rel}: {w}x{h} outside Play's {PLAY_MIN}-{PLAY_MAX} px per side")
                status = "FAIL"
            if max(w, h) > 2 * min(w, h):
                errors.append(f"{rel}: {w}x{h} is {max(w, h) / min(w, h):.2f}:1, Play allows at most 2:1")
                status = "FAIL"

    rows.append((rel, f"{w}x{h}", f"{size:,}", store, kind, "alpha" if alpha else "-", status))


# ---- screenshots -------------------------------------------------------------

for target in CFG["targets"]:
    ext = "jpg" if target["format"] == "jpeg" else "png"
    for locale in CFG["locales"]:
        folder = os.path.join(OUT, target["id"], locale)
        ids = target.get("slides") or [s["id"] for s in CFG["slides"]]
        for i, sid in enumerate(ids, start=1):
            check(os.path.join(folder, f"{i:02d}-{sid}.{ext}"),
                  target["store"], target["width"], target["height"], target["format"], "screenshot")

        count = len(ids)
        if target["store"] == "play" and not 2 <= count <= 8:
            errors.append(f"{target['id']}/{locale}: {count} screenshots, Play allows 2-8")
        if target["store"] == "apple" and not 1 <= count <= 10:
            errors.append(f"{target['id']}/{locale}: {count} screenshots, Apple allows 1-10")

# ---- feature graphic ---------------------------------------------------------

fg = CFG.get("featureGraphic")  # Google Play only; absent for an App Store-only set
for locale in (CFG["locales"] if fg else []):
    check(os.path.join(OUT, "play-feature", locale, "feature-graphic.jpg"),
          "play", fg["width"], fg["height"], fg["format"], "feature")

# ---- copy --------------------------------------------------------------------

for locale in CFG["locales"]:
    copy = json.load(open(os.path.join(SKILL, f"config/copy.{locale}.json")))
    entries = list(copy["slides"].items())
    if fg:
        entries.append(("featureGraphic", copy["featureGraphic"]))
    for slide_id, text in entries:
        head = text["headline"]
        words = len(head.split())
        if words > MAX_HEADLINE_WORDS:
            errors.append(f"copy.{locale}.json[{slide_id}]: headline is {words} words, "
                          f"max {MAX_HEADLINE_WORDS} -- \"{head}\"")
        low = f"{head} {text.get('subline', '')}".lower()
        for phrase in BANNED:
            if phrase in low:
                errors.append(f"copy.{locale}.json[{slide_id}]: contains \"{phrase}\" -- "
                              f"see reference/copywriting.md")

# ---- summary -----------------------------------------------------------------

head = ("file", "size", "bytes", "store", "kind", "channel", "status")
widths = [max(len(str(r[i])) for r in [head] + rows) for i in range(len(head))]
line = lambda r: "  ".join(str(c).ljust(w) for c, w in zip(r, widths)).rstrip()
print(line(head))
print("  ".join("-" * w for w in widths))
for r in rows:
    print(line(r))

if errors:
    print(f"\n✗ {len(errors)} problem(s):", file=sys.stderr)
    for e in errors:
        print(f"  - {e}", file=sys.stderr)
    sys.exit(1)

print(f"\n✓ {len(rows)} files pass Apple and Play checks.")
