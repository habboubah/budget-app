---
name: store-screenshot-studio
description: Turn the raw app captures in screenshots/raw/ into polished, store-ready marketing screenshots — device mockup frames, branded backgrounds, benefit headlines — plus the Google Play feature graphic. Use when asked to refresh, restyle or regenerate marketing screenshots, store listing images, App Store or Play Store artwork, headlines on screenshots, or the feature graphic.
---

> Copied from pizza-driver-log (Fahrtwerk). The scripts are generic, but the
> settings in this folder (`config*.json`, copy texts, theme) still describe
> Fahrtwerk's screens and wording — adapt them to Spartopf (its screens, the
> demo data in `scripts/screenshots.mjs`, DE / EN / AR copy, the petrol accent)
> before the first run, and treat any remaining "Fahrtwerk" as Spartopf.


# Store screenshot studio

Raw capture in → marketing slide out. The raw captures come from the
`app-store-screenshots` skill (`npm run screenshots`), which writes plain,
unstyled app screens to `screenshots/raw/`. This skill frames, brands and
captions them.

**Never edit the pixels inside the device frame.** The app UI in a slide must be
the untouched capture — that is both an Apple review rule and the reason the set
can be trusted.

## Run it

```bash
npm run store-screenshots
```

Export → feature graphic → contact sheet → validate, in that order. The run fails
loudly if any exported file misses its store spec.

## Workflow (follow this, in order)

### 1. Propose copy — approval gate

Read `config/theme.json`, the slides in `config/screenshots.config.json`, and the
raw captures they point at. **Look at each raw capture before writing its
headline** — rule 3 in `reference/copywriting.md` is that a headline may only
claim what its own screenshot shows.

Present the proposed headline + subline per slide as a table and **wait for the
user to confirm or edit** before rendering anything. Write the agreed text to
`config/copy.<locale>.json`.

### 2. Render one slide — approval gate

```bash
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide wallet --locale en --out /tmp/proof.png --scale 1
```

`--scale 1` renders at a third of export size, which is fast and enough to judge.
**Show the user the image and wait for approval.** Iterate on
`templates/slide.css` and `config/theme.json` here, not later.

### 3. That slide is the style template

Once approved, the background, type scale, frame and spacing are settled for the
whole set. Do not restyle individual slides afterwards — a set that drifts slide
to slide looks unfinished. Per-slide variation is limited to `layout`
(`standard` / `full-bleed` / `angled` / `zoom`).

### 4. Render everything

```bash
node .claude/skills/store-screenshot-studio/scripts/export.mjs
node .claude/skills/store-screenshot-studio/scripts/feature_graphic.mjs
node .claude/skills/store-screenshot-studio/scripts/preview.mjs
```

### 5. Validate and report

```bash
python3 .claude/skills/store-screenshot-studio/scripts/validate.py
```

Then show the user the contact sheet **and** the validator's summary table (file,
size, bytes, store, status). If validation fails, fix and rerun — never hand over
files that did not pass.

## Layouts

| layout | what it does | when |
|---|---|---|
| `standard` | Headline above, device centred below | Default; most slides |
| `full-bleed` | Larger device, cropped by the bottom edge | Busy screens that reward a closer look |
| `angled` | Device in perspective, rotated | Break up a run of identical slides |
| `zoom` | Magnifies one region of the capture; needs `focus` | Call out a single control or figure |

`zoom` crops horizontally at any scale above 1. Aim `focus` at a band whose content
is centred, keep `scale` near 1.2, and check the result — full-width body text gets
cut at the edges above roughly 1.3.

## Adding things

- **A slide** — add an entry to `slides` in `config/screenshots.config.json` and a
  matching entry in every `config/copy.<locale>.json`. Order in the array is the
  store order and drives the filename index.
- **A language** — add `config/copy.<locale>.json` and the code to `locales`. Set
  `"dir": "rtl"` for RTL; the template uses logical properties, so it just works.
- **A device size** — add an entry to `targets`. `validate.py` picks it up from the
  same config, so the new size is checked automatically.

None of these need a script change.

## Reference

- `reference/store-specs.md` — the exact sizes and formats both stores accept.
- `reference/copywriting.md` — headline rules, banned phrases, good/bad examples.
- `assets/frames/README.md` — why the device frame is CSS and not a PNG.

## Determinism

Same config + same raw captures = same output. The renderer waits for
`document.fonts.ready` and image decode rather than sleeping, the font is vendored
(`assets/fonts/`, SIL OFL 1.1) instead of fetched, and Chromium runs with pinned
rasterisation flags. There is no AI generation step anywhere in the pipeline: an
image model cannot produce the same pixels twice, and it would alter the app UI it
was asked to preserve.
