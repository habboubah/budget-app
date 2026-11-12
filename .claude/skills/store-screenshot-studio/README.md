# store-screenshot-studio

Turns the raw app captures in `screenshots/<locale>/` into store-ready marketing
screenshots — device frame, branded background, benefit headline — plus the
Google Play feature graphic and a contact sheet.

## Prerequisites

- `npm install` (Playwright is already a devDependency of this repo)
- Chromium, once per machine: `npx playwright install chromium --only-shell`
- Python 3 for the validator — **standard library only**, nothing to install
- Raw captures present: `npm run screenshots`

No other dependencies. See "Dependencies" below for why.

## One command

```bash
npm run store-screenshots
```

Runs export → feature graphic → contact sheet → validate. Exits non-zero if any
file misses a store spec.

Individual steps, for iterating:

```bash
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide month --locale de --out /tmp/proof.png --scale 1
node .claude/skills/store-screenshot-studio/scripts/export.mjs
node .claude/skills/store-screenshot-studio/scripts/feature_graphic.mjs
node .claude/skills/store-screenshot-studio/scripts/preview.mjs
python3 .claude/skills/store-screenshot-studio/scripts/validate.py
```

## Output

```
screenshots/store/
  iphone-6.3/{de,en}/01-month.png … 10-plan.png        1206×2622 PNG
  play-phone/{de,en}/01-month.jpg … 08-plan.jpg        1080×1920 JPEG, with the ribbon
  play-feature/{de,en}/feature-graphic.jpg             1024×500 JPEG, with the ribbon
  contact-sheet.png                                    the iPhone set
  contact-sheet-play-phone.png                         the Play set
```

`iphone-6.3` is the set for App Store Connect's required *iPhone with Dynamic
Island (medium display)* slot; `play-phone` and `play-feature` are Google
Play's. Each run deletes and rewrites only the folders this script makes,
including ones from older configs (`apple-6.9`, `apple-6.5`); files next to
them (`play-icon-512.png`) are left alone.

The Play set carries the *Kostenlos* / *Free* ribbon and the price points
("Kein Abo"); the App Store set does not, because Apple rejects price words on
screenshots. See *Ribbon and points* in `SKILL.md`.

## Layout of the skill

| Path | What |
|---|---|
| `SKILL.md` | Trigger description and the workflow with its approval gates |
| `config/screenshots.config.json` | Slides, layouts, targets, feature graphic |
| `config/theme.json` | Colours (lifted from `src/index.css`), font, backgrounds, frame geometry |
| `config/copy.<locale>.json` | Headlines and sublines per language, plus `dir` for RTL |
| `templates/slide.html` + `slide.css` | The one template; layout switches on a data attribute |
| `assets/fonts/` | Space Grotesk, vendored (SIL OFL 1.1, `OFL.txt`) |
| `assets/frames/README.md` | Why the device frame is CSS, not a PNG |
| `scripts/render.mjs` | One slide; also the shared renderer |
| `scripts/export.mjs` | Every slide × locale × target |
| `scripts/feature_graphic.mjs` | 1024×500 Play feature graphic |
| `scripts/preview.mjs` | Contact sheets, one per target |
| `scripts/validate.py` | Store compliance + headline rules |
| `reference/` | Store size tables, copywriting rules |

## Adding a slide

1. Add to `slides` in `config/screenshots.config.json`:
   ```json
   { "id": "history", "raw": "08-history.png", "layout": "standard", "device": "iphone", "background": "warm" }
   ```
2. Add `"history": { "headline": "…", "subline": "…" }` to **every**
   `config/copy.<locale>.json`.
3. Rerun. Array order is store order and sets the filename index.

Missing copy, a missing raw file or an unknown background each stop the run with a
message naming the slide. Nothing is skipped silently.

## Adding a language

Add `config/copy.<locale>.json` and the code to `locales`. `"dir": "rtl"` flips the
layout — the stylesheet uses logical properties, so there is no mirrored sheet to
maintain, and the panoramic background reverses direction with the text.

RTL was verified by rendering a throwaway Arabic locale, not just asserted. To
repeat it: copy `copy.en.json` to `copy.ar.json`, set `"dir": "rtl"`, translate one
slide, and run `render.mjs --locale ar`.

## Dependencies

Only Playwright, which this repo already had for capturing the raw screenshots.
Deliberately **not** added:

- **Pillow** — the validator needs image *dimensions*, which is a fixed-offset read
  in a PNG header and one marker scan in a JPEG. Roughly 25 lines of stdlib.
- **An image-generation API** — it would break determinism and would repaint the app
  UI it was supposed to preserve.
- **fastlane / frameit** — needs Ruby and ImageMagick, and this project does not use
  fastlane.
- **A web font at render time** — the font is vendored so a render works offline and
  cannot change when Google Fonts ships a new version.

## Prior art

Architecture ideas (not code) taken from:
`gitethanwoo/app-store-screenshot-studio` (MIT) — reference docs split out from the
skill, validation as a hard gate. `adamlyttleapps/claude-skill-aso-appstore-screenshots`
(MIT) — deterministic scaffold first, contact sheet. `ranahaani/claude-playstore-screenshots-generator`
(MIT) — derive brand colours from the app rather than inventing them.
`hypersocialinc/shots` (no licence declared — ideas only, nothing copied) — panoramic
background spanning a set. `anthropics/skills` (Apache 2.0) — SKILL.md frontmatter.
