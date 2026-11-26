# The app icon

A gold coin dropping into a green money pot with a rising-chart mark, on navy
(`#051D38`). `source.png` is the icon itself: 1024 px, square, opaque and full
bleed — iOS and Android round the corners themselves, so it must not carry
rounded corners or transparency.

| File | What |
|---|---|
| `source.png` | The icon, the one picture every other icon file is made from |
| `make_assets.py` | Writes every icon file the repo ships from `source.png` |

## Regenerate

```sh
pip install pillow
cd scripts/icon
python3 make_assets.py source.png ../..   # writes into the repo
```

`make_assets.py` writes: the iOS `AppIcon-512@2x.png`, `assets/icon-only.png`
(the source for `npm run assets:generate`, the store screenshots' opening slide
and the app preview's end card), `assets/splash*.png`, the PWA icons in
`public/` (the 512 px one keeps the art inside the maskable circle),
`public/icon.svg` (the in-app icon: an SVG wrapping a 288 px JPEG, so the
components keep pointing at `/icon.svg`), the Android launcher icons at every
density (adaptive foreground inside the safe zone on the navy, which it also
writes to `res/values/ic_launcher_background.xml`; legacy square; round),
`screenshots/store/play-icon-512.png`, and the icon tile in every native splash
screen (iOS `Splash.imageset`, Android `drawable*/splash.png`).

To change the icon: replace `source.png` (same rules) and run the command above.
