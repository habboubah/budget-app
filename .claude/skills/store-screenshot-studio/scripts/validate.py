#!/usr/bin/env python3
"""Checks every exported file against the Apple and Google Play rules in
reference/store-specs.md, the headline rules in reference/copywriting.md, and
the composition rules in reference/composition.md that can be checked from the
config (layouts, call-outs, stickers).

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
THEME = json.load(open(os.path.join(SKILL, "config/theme.json")))
OUT = os.path.join(ROOT, CFG["outDir"])

# Play: JPEG or 24-bit PNG, no alpha, 320-3840 per side, longest <= 2x shortest,
# 2-8 phone screenshots, under 8 MB each. Apple: 1-10 per device class per locale.
PLAY_MIN, PLAY_MAX = 320, 3840
PLAY_MAX_BYTES = 8 * 1024 * 1024
BANNED = ["download now", "download today", "best app", "#1", "number one",
          "must have", "must-have", "amazing", "revolutionary", "click here"]
MAX_HEADLINE_WORDS = 5
# The ribbon's band shows about a dozen letters, its long form (two words,
# "Free · No Ads") about twenty; a point is one pill on one line.
MAX_RIBBON_CHARS = 20
MAX_POINT_CHARS = 28
MAX_POINTS = 5
# Composition (reference/composition.md).
LAYOUTS = ("top", "bottom")
MAX_CALLOUTS = 3
MIN_SCALE, MAX_SCALE = 1.0, 2.0
# How far a lifted piece may be blown up past the capture's own pixels before
# it looks soft next to the rest of the screen.
MAX_UPSCALE = 1.3
# The phone's default width, in percent of the canvas height, and how much of
# that the screen takes (templates/slide.css: --dw and the bezel).
PHONE_WIDTH_VH, SCREEN_SHARE = 39, 0.966

rows = []
errors = []
warnings = []


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
        # A dash or "&" on its own is not a word ("Haushaltsbuch & Finanzplaner" is 2).
        words = sum(1 for w in head.split() if any(c.isalnum() for c in w))
        if words > MAX_HEADLINE_WORDS:
            errors.append(f"copy.{locale}.json[{slide_id}]: headline is {words} words, "
                          f"max {MAX_HEADLINE_WORDS} -- \"{head}\"")

        # Points: a string, or {"text": ..., "price": true} for a price word.
        points = text.get("points", [])
        texts = []
        if not isinstance(points, list):
            errors.append(f"copy.{locale}.json[{slide_id}]: \"points\" has to be a list")
            points = []
        for point in points:
            label = point if isinstance(point, str) else (point or {}).get("text") if isinstance(point, dict) else None
            if not isinstance(label, str) or not label.strip():
                errors.append(f"copy.{locale}.json[{slide_id}]: a point needs a \"text\"")
                continue
            texts.append(label)
            if len(label) > MAX_POINT_CHARS:
                errors.append(f"copy.{locale}.json[{slide_id}]: point \"{label}\" is {len(label)} "
                              f"characters, max {MAX_POINT_CHARS} -- it has to fit one pill")
        if len(points) > MAX_POINTS:
            errors.append(f"copy.{locale}.json[{slide_id}]: {len(points)} points, max {MAX_POINTS}")

        low = " ".join([head, text.get("subline", "")] + texts).lower()
        for phrase in BANNED:
            if phrase in low:
                errors.append(f"copy.{locale}.json[{slide_id}]: contains \"{phrase}\" -- "
                              f"see reference/copywriting.md")

    # The ribbon's word, wherever a target or the feature graphic asks for it.
    if any(t.get("ribbon") for t in CFG["targets"]) or (fg or {}).get("ribbon"):
        word = copy.get("ribbon", "")
        if not isinstance(word, str) or not word.strip():
            errors.append(f"copy.{locale}.json: no \"ribbon\" word, but a target has the ribbon on")
        elif len(word) > MAX_RIBBON_CHARS:
            errors.append(f"copy.{locale}.json: ribbon \"{word}\" is {len(word)} characters, "
                          f"max {MAX_RIBBON_CHARS} -- the band is cut off at the edges")

# ---- composition ---------------------------------------------------------------

slide_ids = [sl["id"] for sl in CFG["slides"]]
stickers_dir = os.path.join(SKILL, "assets", "stickers")


def raw_file(name, locale, raw_dir=None):
    return os.path.join(ROOT, (raw_dir or CFG["rawDir"]).replace("{locale}", locale), name)


def raw_dirs(sid):
    """Every capture folder a slide is framed from: the set's, and that of each target showing it with its own (Play: the Android captures)."""
    dirs = [CFG["rawDir"]]
    for target in CFG["targets"]:
        if target.get("rawDir") and sid in target.get("slides", slide_ids) and target["rawDir"] not in dirs:
            dirs.append(target["rawDir"])
    return dirs


def marks_of(name, locale, raw_dir=None):
    """The marks `npm run screenshots` wrote next to a capture, or None."""
    path = os.path.splitext(raw_file(name, locale, raw_dir))[0] + ".marks.json"
    if not os.path.exists(path):
        return None
    return json.load(open(path)).get("marks", {})


for i, sl in enumerate(CFG["slides"]):
    sid = sl["id"]
    if sl.get("layout") not in LAYOUTS:
        errors.append(f"slide {sid}: layout {sl.get('layout')!r}; use {' or '.join(LAYOUTS)}")
    if sl.get("background") not in THEME["backgrounds"]:
        errors.append(f"slide {sid}: background {sl.get('background')!r} is not in theme.json")

    callouts = sl.get("callouts", [])
    if len(callouts) > MAX_CALLOUTS:
        warnings.append(f"slide {sid}: {len(callouts)} call-outs. Past {MAX_CALLOUTS} nothing stands out "
                        f"any more -- see reference/composition.md")
    for n, c in enumerate(callouts):
        where = f"slide {sid}, call-out {n + 1}"
        scale = c.get("scale", 1.25)
        if not isinstance(scale, (int, float)) or not MIN_SCALE <= scale <= MAX_SCALE:
            errors.append(f"{where}: scale {scale!r}; use {MIN_SCALE}-{MAX_SCALE}")
            continue
        if "mark" in c:
            for raw_dir in raw_dirs(sid):
                for locale in CFG["locales"]:
                    folder = os.path.basename(os.path.dirname(raw_file(sl["raw"], locale, raw_dir)))
                    marks = marks_of(sl["raw"], locale, raw_dir)
                    if marks is None:
                        errors.append(f"{where}: no marks next to {folder}/{sl['raw']} -- run `npm run screenshots`")
                    elif c["mark"] not in marks:
                        errors.append(f"{where}: mark {c['mark']!r} is not in {folder}/{sl['raw']}'s marks "
                                      f"({', '.join(sorted(marks)) or 'none'})")
        elif not (isinstance(c.get("crop"), list) and len(c["crop"]) == 4):
            errors.append(f"{where}: needs a \"mark\" or a \"crop\" of [x, y, w, h]")
        elif len(CFG["locales"]) > 1:
            warnings.append(f"{where}: a fixed \"crop\" is the same spot in every language, and the screens "
                            f"differ. Name a mark in scripts/lib/shots.mjs instead")

        # A lifted piece is the capture's own pixels, enlarged. Too far and it
        # goes soft beside the screen it was lifted from.
        raw = raw_file(sl["raw"], CFG["locales"][0])
        if os.path.exists(raw):
            raw_w = png_info(raw)[0]
            width_vh = (sl.get("phone") or {}).get("width", PHONE_WIDTH_VH)
            for target in CFG["targets"]:
                shown = target["height"] * width_vh / 100 * SCREEN_SHARE * scale
                if shown / raw_w > MAX_UPSCALE:
                    warnings.append(f"{where}: on {target['id']} it is drawn at {shown / raw_w:.2f}x the capture's "
                                    f"pixels and will look soft. Lower its scale (now {scale})")

    # Copy on top, then below, then on top: three in a row in the same place
    # and the set reads as a template.
    if i >= 2 and all(CFG["slides"][j].get("layout") == sl.get("layout") for j in (i - 1, i - 2)):
        warnings.append(f"slides {slide_ids[i - 2]}, {slide_ids[i - 1]}, {sid}: three in a row with the copy "
                        f"on the same side ({sl.get('layout')}). Alternate -- see reference/composition.md")

# One colour for the set. A preset marked "night" in theme.json is the canvas
# for a screen shown in dark mode and does not count as a second colour.
used = {sl.get("background") for sl in CFG["slides"]}
night = {name for name, preset in THEME["backgrounds"].items() if preset.get("night")}
if len(used - night) > 1:
    warnings.append(f"the set uses {len(used)} backgrounds ({', '.join(sorted(used))}). One colour makes it "
                    f"read as one strip; a night preset is for a dark screen only")

for n, st in enumerate(CFG.get("stickers", []) + (fg or {}).get("stickers", [])):
    where = f"sticker {n + 1} ({st.get('art')})"
    if not os.path.exists(os.path.join(stickers_dir, f"{st.get('art')}.svg")):
        errors.append(f"{where}: no assets/stickers/{st.get('art')}.svg")
    if "slide" in st and st["slide"] not in slide_ids:
        errors.append(f"{where}: slide {st['slide']!r} is not a slide id")
    for key in ("x", "y", "size"):
        if not isinstance(st.get(key), (int, float)):
            errors.append(f"{where}: \"{key}\" has to be a number")

# ---- the ribbon and the stores ---------------------------------------------------

for target in CFG["targets"]:
    if target.get("ribbon") not in (None, False, True, "first"):
        errors.append(f"{target['id']}: \"ribbon\" is {target['ribbon']!r}; use true, \"first\" or false")
    if target["store"] == "apple" and target.get("ribbon"):
        warnings.append(f"{target['id']}: the ribbon and the price points are on for an App Store set. "
                        f"App Review reads \"free\" on a screenshot as a price reference and rejects "
                        f"the version for it (guideline 2.3.7) -- see reference/store-specs.md")

# ---- summary -----------------------------------------------------------------

head = ("file", "size", "bytes", "store", "kind", "channel", "status")
widths = [max(len(str(r[i])) for r in [head] + rows) for i in range(len(head))]
line = lambda r: "  ".join(str(c).ljust(w) for c, w in zip(r, widths)).rstrip()
print(line(head))
print("  ".join("-" * w for w in widths))
for r in rows:
    print(line(r))

for w in warnings:
    print(f"\n⚠ {w}")

if errors:
    print(f"\n✗ {len(errors)} problem(s):", file=sys.stderr)
    for e in errors:
        print(f"  - {e}", file=sys.stderr)
    sys.exit(1)

print(f"\n✓ {len(rows)} files pass Apple and Play checks.")
