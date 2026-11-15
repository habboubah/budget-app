# store-screenshot-studio

Turns the raw app captures in `screenshots/<locale>/` into store-ready marketing
screenshots — one flat brand colour, a big headline, a large phone, pieces of
the screen lifted out of it, stickers that run from slide to slide — plus the
Google Play feature graphic and a contact sheet per store.

## Prerequisites

- `npm install` (Playwright is already a devDependency of this repo)
- Chromium, once per machine: `npx playwright install chromium --only-shell`
- Python 3 for the validator — **standard library only**, nothing to install
- Raw captures present, with their marks: `npm run screenshots` (it writes
  `<capture>.marks.json` next to each capture — where the amount field, a
  category's card, the month report's summary … is — and the call-outs are
  found by those names)

No other dependencies. See "Dependencies" below for why.

## One command

```bash
npm run store-screenshots
```

Runs export → feature graphic → contact sheet → validate. Exits non-zero if any
file misses a store spec.

Individual steps, for iterating:

```bash
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide budgets --locale de --out /tmp/proof.png --scale 1
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide budgets --locale en --target play-phone --out /tmp/proof-play.png
node .claude/skills/store-screenshot-studio/scripts/export.mjs
node .claude/skills/store-screenshot-studio/scripts/feature_graphic.mjs
node .claude/skills/store-screenshot-studio/scripts/preview.mjs
python3 .claude/skills/store-screenshot-studio/scripts/validate.py
```

## Output

```
screenshots/store/
  iphone-6.3/{de,en}/01-month.png … 10-plan.png        1206×2622 PNG
  play-phone/{de,en}/01-month.jpg … 08-plan.jpg        1080×1920 JPEG, the ribbon on the first
  play-feature/{de,en}/feature-graphic.jpg             1024×500 JPEG, with the ribbon
  contact-sheet.png                                    the iPhone set
  contact-sheet-play-phone.png                         the Play set and the feature graphics
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
| `config/screenshots.config.json` | Slides (layout, phone, call-outs), stickers, targets, feature graphic |
| `config/theme.json` | Colours (lifted from `src/index.css` and the icon), fonts, backgrounds, the frame's colour |
| `config/copy.<locale>.json` | Headlines, sublines and points per language, plus `dir` for RTL |
| `templates/slide.html` + `slide.css` | The one template; layout switches on a data attribute |
| `assets/fonts/fonts.css` | The app's own fonts, loaded from `src/assets/fonts/` (Nunito; SIL OFL 1.1, licence next to it) |
| `assets/stickers/` | Twelve original drawings (SVG) for the seams between slides |
| `assets/frames/README.md` | Why the device frame is CSS, not a PNG |
| `scripts/render.mjs` | One slide; also the shared renderer |
| `scripts/export.mjs` | Every slide × locale × target |
| `scripts/feature_graphic.mjs` | 1024×500 Play feature graphic |
| `scripts/preview.mjs` | Contact sheets, one per target |
| `scripts/validate.py` | Store compliance, headline rules, composition rules |
| `reference/` | Composition (what makes a set look designed), store size tables, copywriting rules |

Outside the skill: `scripts/screenshots.mjs` names the marks (`marks` on each
screen) and `npm run screenshots` measures them.

## Adding a slide

1. Add to `slides` in `config/screenshots.config.json`:
   ```json
   { "id": "goals", "raw": "11-goals.png", "layout": "bottom", "device": "iphone", "background": "petrol",
     "callouts": [ { "mark": "goal", "scale": 1.16 } ] }
   ```
2. Name the mark on that screen in `scripts/screenshots.mjs`
   (`marks: { goal: '[data-tour="goal"]' }`) and capture it:
   `npm run screenshots -- --only 11-goals`.
3. Add `"goals": { "headline": "…", "subline": "…" }` to **every**
   `config/copy.<locale>.json`.
4. Move the stickers on its seams (`stickers`), rerun, look at both contact
   sheets. Array order is store order and sets the filename index. Ten is App
   Store Connect's maximum per slot, and the set has ten: drop one first.

Missing copy, a missing raw file, an unknown background, a mark the capture
does not have, a sticker that is not in `assets/stickers/` — each stops the run
with a message naming the slide. Nothing is skipped silently.

## Adding a language

Add `config/copy.<locale>.json` and the code to `locales`, and capture the
language (`L` in `scripts/screenshots.mjs`). `"dir": "rtl"` turns the
set round — the copy and the ribbon by logical properties, the phones' lean,
a call-out's shift and the strip of stickers in the renderer — so there is no
mirrored sheet to maintain.

RTL was verified in shopping-list's copy of this skill by rendering a throwaway
Arabic locale; it has not been rendered here. Before an Arabic set, add an
Arabic face to `assets/fonts/fonts.css`: the app's bundled Nunito file is Latin
only, and a headline without a Latin letter in it never loads it, so
`render.mjs` stops with "the font did not load". Then: copy `copy.en.json` to
`copy.ar.json`, set `"dir": "rtl"`, translate, capture the language, add `ar`
to `locales` and run `render.mjs --locale ar`.

## Dependencies

Only Playwright, which this repo already had for capturing the raw screenshots.
Deliberately **not** added:

- **Pillow** — the validator needs image *dimensions*, which is a fixed-offset read
  in a PNG header and one marker scan in a JPEG. Roughly 25 lines of stdlib.
- **An image-generation API** — it would break determinism and would repaint the app
  UI it was supposed to preserve.
- **fastlane / frameit** — needs Ruby and ImageMagick, and this project does not use
  fastlane.
- **A web font at render time** — the fonts are files in this repo (the app's own),
  so a render works offline and cannot change when Google Fonts ships a new version.
- **Emoji or stock art for decoration** — Apple's and Google's emoji are not ours to
  put on artwork, and they differ per machine. The stickers are SVG drawn for this set.

## Prior art

Architecture ideas (not code) taken from:
`gitethanwoo/app-store-screenshot-studio` (MIT) — reference docs split out from the
skill, validation as a hard gate. `adamlyttleapps/claude-skill-aso-appstore-screenshots`
(MIT) — deterministic scaffold first, contact sheet. `ranahaani/claude-playstore-screenshots-generator`
(MIT) — derive brand colours from the app rather than inventing them.
`hypersocialinc/shots` (no licence declared — ideas only, nothing copied) — panoramic
background spanning a set. `anthropics/skills` (Apache 2.0) — SKILL.md frontmatter.

Composition ideas (not assets) by way of shopping-list's copy of this skill,
which took them from the listings that do well in its category, Bring!'s above
all: one flat brand colour, a headline sized for a thumbnail, UI lifted out of
the phone, drawings across the seams. What was taken and why is in
`reference/composition.md`.
