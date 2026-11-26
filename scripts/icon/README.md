# The app icon (3D)

The icon is a real 3D scene rendered with Blender's Python module (`bpy`, Cycles on
the CPU): the household book lies open — on the left page entries ticked off as
paid (green ticks) and one still open (coral dot), on the right page the month's
bars rising and a stack of euro coins with one coin standing up, a coral ribbon
hanging out of the gutter — on the hero teal (`#076070`).

| File | What |
|---|---|
| `scene.py` | The scene. Concept `B` is the shipped icon; `A` (upright book with a coin on the cover) and `C` (book behind growing coin stacks) are the alternatives |
| `compose.py` | Puts the transparent render on the teal gradient |
| `make_assets.py` | Writes every icon file the repo ships from one render |

## Regenerate

```sh
pip install bpy==5.3.0 pillow          # Python 3.13; bpy is ~400 MB
cd scripts/icon
python3 scene.py B /tmp/icon.png 1024 128   # ~3–4 min on 2 CPU cores
python3 make_assets.py /tmp/icon.png ../..  # writes into the repo
```

`make_assets.py` writes: the iOS `AppIcon-512@2x.png`, `assets/icon-only.png`
(the source for `npm run assets:generate` and the store screenshots' opening
slide), `assets/splash*.png`, the PWA icons in `public/` (the 512 px one keeps
the art inside the maskable circle), `public/icon.svg` (the in-app icon: an SVG
wrapping a 288 px JPEG, so the components keep pointing at `/icon.svg`), the
Android launcher icons at every density (adaptive foreground inside the safe
zone on `#076070`, legacy square, round) and `screenshots/store/play-icon-512.png`.

The native splash screens (iOS `Splash.imageset`, Android `drawable*/splash.png`)
carry the icon as a tile; after a new icon, swap the tile in them (or run
`npm run assets:generate` for iOS).
