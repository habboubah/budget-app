---
name: store-screenshot-studio
description: Turn the raw app captures in screenshots/<locale>/ into polished, store-ready marketing screenshots — one bold colour, a big headline, a large phone, pieces of the screen lifted out of it (call-outs), stickers that run from slide to slide — plus the Google Play feature graphic. Use when asked to refresh, restyle, improve or regenerate marketing screenshots, store listing images, App Store or Play Store artwork, headlines, call-outs or stickers on screenshots, or the feature graphic.
---

> Spartopf's store set. Since 15 November 2026 it is composed the way
> shopping-list's is (Ahmad pointed at Bring!'s listing there and asked for the
> same here): the ten captures of `scripts/screenshots.mjs` per language, the
> icon's petrol, DE / EN / AR copy, an App Store target and a Google Play target
> with its feature graphic. Since 26 November 2026 (ported from photo-filter-app):
> Arabic, Google Play framed from the Android captures (`rawDir`), the app's
> icon above the opening headline, `npm run store-screenshots` takes missing
> captures by itself (`scripts/ensure-captures.mjs`), and `npm run
> store:listing` uploads the set (both stores). The skill came from pizza-driver-log (Fahrtwerk).


# Store screenshot studio

Raw capture in → marketing slide out. The raw captures come from the
`app-store-screenshots` skill (`npm run screenshots`), which writes plain,
unstyled app screens to `screenshots/<de|en|ar>/` — one set for both stores,
framed in an iPhone for the App Store and in a Pixel for Google Play — and,
next to each, where its parts are (`<capture>.marks.json`). This skill composes them:
colour, headline, phone, call-outs, stickers.

**Never edit the pixels of the app.** What is inside the phone is the untouched
capture, and a call-out is a window onto that same capture, enlarged — never a
redrawn button, never a screen that does not exist. That is both an Apple
review rule and the reason the set can be trusted.

## What a slide is made of

Six things, each for a reason (`reference/composition.md` has the reasons and
the numbers — read it before changing a composition):

1. **One flat colour** for the whole set, the icon's own, so the row of slides
   reads as one brand block next to the icon.
2. **A headline you can read in a search result**: Nunito Black, as big as the
   slide allows, two or three short lines. No subline by default (the opening
   slide shows its own: what the app does, in one line).
3. **A phone big enough to read**, running off the canvas. The copy is on top
   on one slide and below on the next (`layout`: `top` / `bottom`).
4. **A call-out**: the one piece of the screen the headline is about, lifted
   out of the phone and enlarged past its frame.
5. **Stickers on the seams**: a drawing placed on the border between two slides
   shows half on each, so the listing reads as one strip when swiped.
6. **The opening slide says what the app is** and carries the promise (the
   points); most people never swipe past it.

## Run it

```bash
npm run screenshots          # only when the app's screens changed: captures + marks
npm run store-screenshots    # missing captures first → export → feature graphic → contact sheets → validate
npm run store:listing -- --android   # then: upload the Play set, the feature graphic and the texts (store:listing:dry checks first)
```

The run fails loudly if any exported file misses its store spec, a call-out
names a mark its capture does not have, or a font or picture did not load.

## Workflow (follow this, in order)

### 1. Look, then plan the set

Read `config/screenshots.config.json` and **look at every raw capture** it
points at. For each slide decide, in this order: what the one message is; which
piece of the screen proves it (that is the call-out); whether that piece is in
the upper or the lower part of the screen (that decides `top` or `bottom` — the
phone is cut at the far end). Alternate `top` and `bottom` where the screens
allow it.

### 2. Propose copy — approval gate

Rule 3 in `reference/copywriting.md`: a headline may only claim what its own
screenshot shows. Present the proposed headline per slide as a table and
**wait for the user to confirm or edit** before rendering anything. Write the
agreed text to `config/copy.<locale>.json`.

### 3. Render one slide — approval gate

```bash
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide budgets --locale de --out /tmp/proof.png --scale 1
```

Add `--target play-phone` to see the slide as that target exports it (Android
frame, ribbon, price points, Play's canvas). `--scale 1` renders at a third of
export size, which is fast and enough to judge. **Show the user the image and
wait for approval.** Iterate on `templates/slide.css` and `config/theme.json`
here, not later.

### 4. That slide is the style template

Once approved, the colour, the type, the frame and the shadows are settled for
the whole set. Do not restyle individual slides afterwards — a set that drifts
slide to slide looks unfinished. What varies per slide is composition only:
`layout`, the phone's placement, its call-outs, and the stickers.

### 5. Render everything and look at it

```bash
node .claude/skills/store-screenshot-studio/scripts/export.mjs
node .claude/skills/store-screenshot-studio/scripts/feature_graphic.mjs
node .claude/skills/store-screenshot-studio/scripts/preview.mjs
```

Open **both** contact sheets (`screenshots/store/contact-sheet.png` and
`…-play-phone.png`) and go through the checklist at the end of
`reference/composition.md`, in every language: no text cut in half by a
call-out's edge, no sticker on a headline or on the thing a slide is about,
every call-out sharp and wider than the phone. A composition is right when it
is right in German *and* English, on the App Store canvas *and* on Play's.

### 6. Validate and report

```bash
python3 .claude/skills/store-screenshot-studio/scripts/validate.py
```

Then show the user the contact sheets **and** the validator's summary table
(file, size, bytes, store, status) with its warnings. If validation fails, fix
and rerun — never hand over files that did not pass.

## Layouts and the phone

| `layout` | what it does | when |
|---|---|---|
| `top` | Headline on top, the phone below it, running off the bottom edge | What matters is in the upper part of the screen |
| `bottom` | The phone on top, running off the top edge, headline below it | What matters is in the lower part: a dock, a sheet's content |

A slide may place its phone: `"phone": { "width": 39, "tilt": 4, "nudge": [0.1, 0] }`
— width in percent of the canvas height (39 fills the App Store canvas with a
small margin), tilt in degrees, nudge in canvas widths / heights. `"second"`
puts another capture behind it as a second phone (the opening slide: the month
in front, the categories with their budgets behind). Keep both for a reason: a tilted phone on every slide
is noise.

## Call-outs

```json
"callouts": [ { "mark": "amount", "scale": 1.2 } ]
```

A call-out lifts one piece of the slide's own capture out of the phone: it
starts exactly where that piece is on the screen, grows about its centre (or
the edge named by `anchor`) and may reach past the frame. **It names a mark,
not coordinates**: the marks are measured from the running app by
`npm run screenshots` (`marks` in `scripts/lib/shots.mjs`) and stored next to
each capture, so a call-out is right in every language and still right after
the screen has changed. Listing them:

```bash
cat screenshots/de/04-budgets.marks.json
```

- **One per slide**, the piece the headline is about; two small ones (tiles)
  at most three. `validate.py` warns past that.
- `scale` 1.1–1.2 for a card as wide as the screen, up to 1.5 for a small tile.
  `validate.py` warns when a piece is blown up past the capture's own pixels.
- `tilt` (degrees) and `shift` (in screen widths) only for small pieces — a
  full-width card stays straight.
- `anchor: "bottom"` keeps what is under the piece whole (the next hint under
  *Das fällt auf*), `"top"` what is above it; then check what its other edge
  now covers. Text half under an
  edge is the one thing that makes a call-out look like a mistake: cover the
  line whole (`shift`, `scale`) or not at all.
- A piece with no card of its own (the backup card with the sentence under it,
  a card's heading with its first row) takes `pad` and a `radius` and becomes
  a panel.
- **Light pieces.** The canvas is the petrol of the app's own hero cards, so a
  lifted hero has only its shadow to stand off it. Lift the white card, the
  panel, the near-black toast, and leave a hero in the phone. Where the hero
  is the slide's whole subject (*Planen*), nothing is lifted and the phone
  leans instead.
- **Not half the screen.** A chart card is 40 % of the screen: lifted, it hides
  the phone and leaves no clear height on its seams for a sticker. One slide
  may (the history's balance chart); on the others lift the sentence about the
  chart — the first hint, the three figures.
- **Edges in the gaps.** A full-width card grows over its neighbours. Between
  two cards that is fine (16 px of gap, then the neighbour's own padding); next
  to a bare heading it is not — the heading is cut in half. Choose the scale,
  `anchor` and `shift` so each edge lands in a gap, or covers the heading
  whole (the backup slide does both).
- **A part that is not marked yet**: add it to that screen's `marks` in
  `scripts/lib/shots.mjs` (a name and a selector built from the app's own
  handles — `data-tour`, a category's id; a list of selectors marks the box
  around them all), rerun `npm run screenshots -- --only <screen>`, then use the name.
  Never fall back to a hand-measured `"crop"` for a set with two languages.

## Stickers

```json
{ "art": "coin", "slide": "month", "x": 1.0, "y": 0.47, "size": 0.32, "rotate": -8 }
```

Twelve drawings in `assets/stickers/` (coin, coins, banknote, piggy, wallet,
receipt, calculator, calendar, chart, padlock, book, pencil): original, flat,
with a paper edge, so they stand on any background. The coin and the book are
the icon's own. A sticker is anchored to a slide;
`x: 1.0` is the seam to the next one. Rules of thumb: one per seam; alternate
high and low; keep `y` roughly between 0.3 and 0.7 (clear of the copy on both
layouts); never on a call-out or on the control a slide is about; never two of
the same in a row. Pick the drawing by what the slide says: the padlock next
to the slide about the data, the calendar next to the new month. On the App
Store canvas the phone and its call-out fill the width, so a seam has only a
few clear heights — where neither neighbour has copy or a call-out at that
edge; beside a headline that is narrower than the slide is fine. To add one, draw it in the same manner (see the
comment in any of the files) — no emoji (the platforms' are not ours to ship),
no downloaded clip-art.

## Colour and type

`config/theme.json`. Three backgrounds: **petrol** (the icon's colour and the
app's accent, with white type and the coin's gold for the ribbon — the set's
colour), **mist** (the same hue as a light canvas with petrol ink, quieter)
and **night** (the app's dark page as a canvas — only for a screen shown in
dark mode; the set has none today). Change the set's colour by changing every
slide's `background`; do not mix petrol and mist. Type is the app's own
bundled face, loaded from the app's file (`assets/fonts/fonts.css` →
`src/assets/fonts/`): Nunito — Black for headlines and the ribbon
(`font.displayWeight`), ExtraBold for points and sublines.

## Ribbon and points

Two things say what the app costs and promises, beside the headline:

- **The ribbon** — the band across the top corner with the copy file's `ribbon`
  word (*Kostenlos* / *Free*). Switched on per target and on the feature graphic
  in `config/screenshots.config.json`: `"ribbon": true` (every slide), `"first"`
  (the first slide only) or `false`. `"ribbonStyle"`: `"corner"` (default, a
  sash across the leading top corner) or `"banner"` (a red band across the
  whole top edge — Google Play's first slide has it, to catch the eye in the
  row of screenshots). Its colours come with the background (`ribbon` /
  `ribbonInk`, `banner` / `bannerInk` in `theme.json`).
- **Points** — the pills with a tick under a slide's headline, from `points` in
  the copy file (a slide's, or the feature graphic's). A point is a string, or
  `{ "text": "Kein Abo", "price": true }` for one that speaks about the price.
  Price points appear only on targets that have the ribbon on.

**Google Play only.** Apple reads "free" on a screenshot as a price reference
and rejects the version for it, so the `iphone` target has the ribbon off
and shows only the plain points. `validate.py` warns when an App Store target
turns it on. On Play it is allowed, at the cost of being picked for Play's
promotion surfaces less readily. And every one of these words has to be true:
they come off the day a paid Plus is sold (`docs/MONETIZATION.md`). The rules, with their sources, are
in `reference/store-specs.md` › *The ribbon and the price words*.

## Adding things

- **A slide** — add an entry to `slides` in `config/screenshots.config.json` and a
  matching entry in every `config/copy.<locale>.json` (ten is App Store
  Connect's maximum, and the set has ten: drop one first). Order in the array is the
  store order and drives the filename index. Give it a call-out (mark the part
  first if it has no mark) and move the stickers on its seams.
- **A language** — add `config/copy.<locale>.json` and the code to `locales`,
  and capture it (`LANGS`, `LOCALE` and `NAMES` in `scripts/lib/shots.mjs`). Set `"dir": "rtl"`
  for RTL: the copy, the ribbon, the phones' lean and the strip of stickers all
  turn round.
- **A device size** — add an entry to `targets`. `validate.py` picks it up from the
  same config, so the new size is checked automatically. Every length hangs on
  the canvas height, so a new shape gets the same composition with more or
  less margin — look at its contact sheet all the same.

None of these need a script change.

## Reference

- `reference/composition.md` — what makes a set look designed, the numbers, and
  the checklist for the contact sheet.
- `reference/store-specs.md` — the exact sizes and formats both stores accept.
- `reference/copywriting.md` — headline rules, banned phrases, good/bad examples.
- `assets/frames/README.md` — why the device frame is CSS and not a PNG.

## Determinism

Same config + same raw captures = same output. The renderer waits for the page
to say it is done (fonts loaded, pictures decoded, headline fitted) rather than
sleeping, the fonts are the repo's own files instead of fetched, the stickers
are SVG, and Chromium runs with pinned rasterisation flags. There is no AI
generation step anywhere in the pipeline: an image model cannot produce the
same pixels twice, and it would alter the app UI it was asked to preserve.
