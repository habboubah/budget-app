---
name: store-screenshot-studio
description: Turn the raw app captures in screenshots/<locale>/ into polished, store-ready marketing screenshots — device mockup frames, branded backgrounds, benefit headlines — plus the Google Play feature graphic. Use when asked to refresh, restyle or regenerate marketing screenshots, store listing images, App Store or Play Store artwork, headlines on screenshots, or the feature graphic.
---

> Adapted from pizza-driver-log (Fahrtwerk) for Haushaltsbuch Einfach: the ten captures of
> `scripts/screenshots.mjs` per language, the petrol theme, DE / EN copy. App
> Store only so far — the Play targets and feature graphic come back through
> the config (see its `//targets` note) once there is an Android app.


# Store screenshot studio

Raw capture in → marketing slide out. The raw captures come from the
`app-store-screenshots` skill (`npm run screenshots`), which writes plain,
unstyled app screens to `screenshots/de/` and `screenshots/en/`. This skill frames, brands and
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
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide month --locale de --out /tmp/proof.png --scale 1
```

Add `--target play-phone` to see the slide as that target exports it (Android
frame, ribbon, price points). `--scale 1` renders at a third of export size, which is fast and enough to judge.
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

## Ribbon and points

Two things say what the app costs and promises, beside the headline:

- **The ribbon** — the band across the top corner with the copy file's `ribbon`
  word (*Kostenlos* / *Free*). Switched on per target and on the feature graphic
  in `config/screenshots.config.json`: `"ribbon": true` (every slide), `"first"`
  (the first slide only) or `false`. Its colours are `ribbon` in `theme.json`.
- **Points** — the pills with a tick under a slide's subline, from `points` in
  the copy file (a slide's, or the feature graphic's). A point is a string, or
  `{ "text": "Kein Abo", "price": true }` for one that speaks about the price.
  Price points appear only on targets that have the ribbon on.

**Google Play only.** Apple reads "free" on a screenshot as a price reference
and rejects the version for it, so the `iphone-6.3` target has the ribbon off
and shows only the plain points. `validate.py` warns when an App Store target
turns it on. On Play it is allowed, at the cost of being picked for Play's
promotion surfaces less readily. And every one of these words has to be true:
they come off the day a paid Plus is sold. The rules, with their sources, are
in `reference/store-specs.md` › *The ribbon and the price words*.

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
