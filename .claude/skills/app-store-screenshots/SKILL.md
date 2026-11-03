---
name: app-store-screenshots
description: Regenerate the App Store and Google Play marketing screenshots for Spartopf. Use when asked to update, refresh, or regenerate store screenshots, listing images, or marketing shots, or to add a screen/device/locale to the screenshot set.
---

> Copied from pizza-driver-log (Fahrtwerk). The scripts are generic, but the
> settings in this folder (`config*.json`, copy texts, theme) still describe
> Fahrtwerk's screens and wording — adapt them to Spartopf (its screens, the
> demo data in `scripts/screenshots.mjs`, DE / EN / AR copy, the petrol accent)
> before the first run, and treat any remaining "Fahrtwerk" as Spartopf.


# App Store screenshots

Seeds the app with a demo dataset, walks every screen in a headless browser and
shoots each one at every store resolution.

## Running it

```bash
npm run screenshots
```

That is the whole pipeline: `vite build` → serve `dist/` → seed `localStorage` →
click through every screen → write PNGs to `screenshots/`. Takes ~30s for the
current one-device set. Nothing is left running afterwards.

Prerequisites: `npm install`, plus the browser binary once per machine:

```bash
npx playwright install chromium --only-shell
```

## What comes out

`screenshots/raw/<index>-<screen>.png`, e.g. `01-today.png`. These are the plain
app captures; `store-screenshot-studio` turns them into the polished marketing
set. **One shot per screen**:
13 screens, English only, 1284×2778 (the 6.5" slot). A `-<locale>` or `-<device>`
suffix appears only once `config.json` lists more than one of them, so nothing
can overwrite anything.

App Store Connect accepts **1242×2688 or 1284×2778** portrait for this listing —
those are the 6.5" sizes. Anything else is rejected on upload, so keep the device
entry on one of them.
Each run deletes the previous generated files first (only ones matching
`<digits>-*.png`; anything hand-made in `screenshots/` is left alone).

To swap or add a size, edit the `devices` row in `config.json`:

| device id | width | height | scale | pixels | slot |
|---|---|---|---|---|---|
| `iphone65` | 428 | 926 | 3 | 1284×2778 | 6.5" — **the current one**, accepted by App Store Connect |
| `iphone65alt` | 414 | 896 | 3 | 1242×2688 | 6.5" — the other size App Store Connect accepts |
| `iphone17promax` | 440 | 956 | 3 | 1320×2868 | 6.9" (17 Pro Max) |
| `iphone17pro` | 402 | 874 | 3 | 1206×2622 | 6.3" (17 / 17 Pro — same panel, identical output) |
| `iphone69` | 430 | 932 | 3 | 1290×2796 | 6.9" (15/16 Pro Max) |
| `android` | 360 | 640 | 3 | 1080×1920 | Play phone — inside Play's 2:1 ratio limit |

Play and the App Store cannot share one file: no size satisfies both the 6.5"
requirement and Play's ratio limit. Add the `android` row when you upload there.

Adding `"de"` to `locales` renders the German set alongside the English one.
Every added locale or device multiplies the file count by one more full pass.

## Files

- `config.json` — screens, devices, locales, theme, output folder, frozen clock.
- `capture.mjs` — the whole pipeline. Reads `config.json`; no screen names in the code.
- `screenshots/fixtures/demo-data.json` — the seed dataset (8 work days, 130 trips,
  3 refuellings, €-settings). Plausible amounts, no personal data, no empty states.

## Determinism

Same fixture in → same pixels out. Three things make that hold, all in `config.json`:

- **Frozen clock** (`freezeAt`). The app derives "Today" and every statistics window
  from `Date.now()`. The clock is pinned to `2026-07-29T21:45+02:00` in
  `Europe/Berlin`. Its date part **must** equal the newest `workDay` in the fixture
  or Today stops saying "Today" — the run aborts if they drift apart.
- **Fresh `localStorage` per page load.** Seeding clears storage first, so a rerun
  can't inherit anything. `pizza-driver-last-backup` is seeded too, which suppresses
  the "time to back up" nag banner on Today.
- **Pixel-stable shots.** Screens cross-fade via `AnimatePresence`, so a fixed wait
  captured blank pages. Each shot is retaken until two consecutive frames are
  byte-identical.

Service workers are blocked (a cached SW would serve the previous build), CSS
transitions are disabled per page, the browser runs with `reducedMotion: 'reduce'`,
and text rasterisation is pinned via launch flags.

What is **not** byte-stable: Chromium's anti-aliasing of thin SVG icon strokes
varies by up to 3/255 on roughly 0.1% of pixels between runs. It is invisible, it
survives every raster/GPU flag combination tried, and it does not move a single
number, glyph or layout box. Compare reruns by eye, not by checksum.

## Adding a screen

The app has **no router** — `App.tsx` holds nav state in `useState`, so every screen
is reached by clicking. Add an entry to `screens` in `config.json`:

```json
{ "name": "settings", "steps": ["nav[aria-label='Primary'] button >> nth=3", "main button >> nth=1"], "scrollY": 600 }
```

- `steps` — Playwright selectors, clicked in order from a fresh load of `/`.
- `scrollY` — optional, scrolls before the shot (for long screens like Settings).
- Order in the array sets the filename index. Reordering is free; no script changes.

Useful locale-independent handles (aria-labels are translated, so avoid them):

| target | selector |
|---|---|
| tab bar | `nav[aria-label='Primary'] button >> nth=0..3` (Today/History/Stats/More) |
| list rows on a screen | `main button >> nth=N` |
| the FAB | `button.fixed.rounded-full` |
| header overflow "…" | `header button >> nth=-1` |

If a selector doesn't resolve, the run **stops** and names the screen, device,
locale and step. It never skips a screen quietly.

## Changing the demo data

Edit `screenshots/fixtures/demo-data.json` — it is a plain backup-format payload
(`workDays` / `fuelEntries` / `settings`), the same shape the app's own import
accepts. If you change the newest day, update `freezeAt` in `config.json` to match.
