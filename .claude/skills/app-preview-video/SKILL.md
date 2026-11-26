---
name: app-preview-video
description: Make, change or re-export the App Store app preview video of Spartopf (npm run app-preview) — the running app is filmed from a storyboard, then captions, a light on a part of the screen, touch dots and an end card with the icon are laid over it, and an 886 × 1920 MP4 per language (de, en, ar) comes out, checked against App Store Connect's specification. Use when asked for an app preview, a preview / promo / marketing video or trailer, "a video of the app" for the App Store or Google Play listing, to change the video's captions, chapters, length, music or poster frame, or after a screen or flow the video passes through has changed. Not the App Review screen recording on a real iPhone (app-review-recording) and not the store screenshots (store-screenshot-studio).
---

# App preview video

The app preview is the short video that plays, muted, in front of the
screenshots on the App Store listing and in search results. Spartopf's is
built like Bildklar's (`../photo-filter-app`, where this skill came from on 26
November 2026) and the shopping list's, after Bring!'s listing: a line of
text on the dimmed screen, then the app doing what the line says — four times
— and the icon at the end. About 28 seconds, in German, English and Arabic,
in the store set's petrol and Nunito, so it sits next to the store
screenshots as one set. It runs on the store screenshots' household: six
invented months with salary, rent, groceries and four budgets
(`scripts/lib/shots.mjs` › `sampleData`), so nothing personal is in it.

It is made in three steps, by one command:

| Step | Script | What it does | Writes |
|---|---|---|---|
| film | `scripts/film.mjs` | Builds the app, seeds it, plays the storyboard's chapters with real taps while Chromium hands over every frame it draws | `build/app-preview/<lang>/`: the frames and `footage.json` |
| compose | `scripts/compose.mjs` | Lays the chapters on one timeline, draws every frame on a stage (`templates/stage.*`) — footage, veil and caption, light, touch dots, status bar, end card — and encodes it with ffmpeg | `screenshots/store/app-preview/app-preview-<lang>.mp4`, `poster-<lang>.png`; `plan.json` and a still every half second in `build/` |
| validate | `scripts/validate.mjs` | Asks ffprobe what is really in the file and compares it with Apple's specification | a table; the run fails when a file would be refused at upload |

and `scripts/sheet.mjs` lays the stills out as
`screenshots/store/app-preview/contact-sheet-<lang>.png` — the way to look at
a video without playing it.

| File | What it is |
|---|---|
| `config/storyboard.mjs` | The film: the video's size, the household at the start, the chapters (caption, how long it stands, what is tapped). The one file about this app's flow |
| `config/copy.<lang>.json` | The words: one caption per chapter, the name and the points on the end card |
| `config/theme.json` | The dress: veil, caption type, light, touch dot, end card — the store set's colours |
| `scripts/`, `templates/`, `assets/fonts.css` | The machine. Knows nothing about this app (shared with photo-filter-app: change it in step in both) |
| `reference/app-preview-specs.md` | What Apple takes (the file, the sizes, what a preview may show), how it is uploaded, and Google Play |
| `reference/storytelling.md` | What makes a preview work, the pace in numbers, the checklist for the contact sheet |

## Ground rules

- **Every frame is the running app.** Nothing in it is drawn, edited or
  generated, and no screen is shown that the app does not have. Only what
  explains goes on top: captions, the light, the touch dots, the status bar,
  the end card. That is Apple's rule for previews.
- **No price, no call to action, no superlative** in a caption or on the end
  card — compose refuses them (also in Arabic: مجاني, اشتراك, سعر). "Kostenlos"
  and "Kein Abo" on App Store artwork get a version rejected; they belong on
  Google Play's screenshots only.
- **The upload is filmed on the Mac**: Apple's emoji and system font, and a
  smooth film. A run in a Linux container is a proof to look at; say so
  whenever you show one, and never hand it over as the upload.
- **Uploading is Ahmad's call**: `npm run store:listing -- --ios` sends the
  videos with the rest of the listing (poster frame included), only with his
  explicit go. Submitting for review stays a click in App Store Connect.

## What the film is and is not

It is the app's web build at an iPhone Pro Max's size (443 × 960 pt, two
pixels a point) — the same code the iPhone runs in its web view, filmed the
way `npm run screenshots` photographs it. The safe area (59 pt at the top,
34 at the bottom) is given to Chromium (`Emulation.setSafeAreaInsetsOverride`)
so the app keeps room for the drawn status bar and home indicator. No
keyboard comes up while the film types; haptics, the share sheet, the camera
and system alerts do not exist here — keep chapters inside the app's own
screens. Never call it a device recording; that is `app-review-recording`.

## Run it

```bash
npx playwright install chromium     # once per Mac
brew install ffmpeg                 # once per Mac (ffmpeg and ffprobe)

npm run app-preview                 # film → compose → contact sheet → validate, de + en + ar
npm run app-preview -- --lang de    # one language
npm run app-preview -- --compose    # keep the footage, make the video again
```

`--compose` is the quick one: use it after changing a caption, a `hold`, the
theme or the end card. Anything that changes what happens on screen — a step,
a pause, the app itself — needs the film again.

## Workflow

1. **Look, then plan.** Read `config/storyboard.mjs` and the copy files, look
   at the last contact sheets, read `reference/storytelling.md` before
   changing what the video tells.
2. **Propose it — approval gate.** A new or changed chapter: show Ahmad a
   table (chapter, caption in de / en / ar, what happens, seconds) and wait
   for his yes. A changed caption alone needs only the result shown.
3. **Film one language and look** (`--lang de`), go through the checklist at
   the end of `reference/storytelling.md`, fix, rerun.
4. **Show it — approval gate**: the video, the contact sheet and the
   validator's line. Say whether it is a container proof.
5. **Every language, then report** the validator's table, each poster frame's
   time, and what is left for Ahmad.

## The storyboard

The four chapters (26 November 2026):

| Chapter | Caption (de) | On screen |
|---|---|---|
| `balance` | Sieh, was am Monatsende bleibt | the month page, the balance card lit — the poster frame |
| `entry` | Ausgabe in Sekunden notiert | + → 47,85 → the "Lidl" suggestion (it picks the category) → Sichern |
| `stats` | Sieh, wohin dein Geld geht | Statistik → *Wofür das Geld geht* → Lebensmittel's page, its three figures lit |
| `next` | Neuer Monat mit einem Tipp | back on the month → › → the toast "… gestartet – 10 Posten übernommen" lit |
| `end` | — | the icon, "Spartopf", two points |

A chapter:

```js
{
  id: 'stats',
  caption: 'stats',        // copy.<lang>.json › captions.stats
  hold: 2.0,               // seconds the caption stands on the frozen screen
  setup: async a => {},    // optional, off camera; the video dissolves to where it leaves the app
  run: async (a, w) => {   // what is filmed after the caption
    await goTo(a, 1);
    await a.scrollTo('where', { block: 'start' });
    await a.tap('where-groceries');
    await a.spotlight('figures', 1.4);
  },
},
```

`w` is the language being filmed (`scripts/lib/shots.mjs` › `words`): `w.t`
the app's strings, `w.category(id)` a category's name, `w.amount` / `w.chip`
what the entry types and taps. **Every label a tap needs is built from these**,
never written out — one storyboard films every language, and a renamed button
stops the run instead of filming the wrong thing.

What `a` can do (`scripts/film.mjs` › `Actor`); a target is a mark's name, a
selector or a Playwright locator:

| Verb | What it does |
|---|---|
| `a.tap(target, { at, dot })` | A tap, with a touch dot a quarter second before the finger. Scrolls to a target that is off screen first |
| `a.type(target, text)` | Taps the field and types letter by letter (the entry sheet's amount has the focus already: `a.page.keyboard.type`) |
| `a.pause(seconds)` / `a.see(target)` | Lets the film run / waits until something is on screen |
| `a.scrollTo(target, { block })` / `a.scrollBy(dy)` | Scrolls like a thumb, eased |
| `a.spotlight(targets, seconds)` | Dims everything but these parts |
| `a.zoom(target, scale, seconds)` | Moves in on a part and back out (1.1–1.25, rare) |
| `a.poster()` | Marks this moment as the poster frame |
| `a.page` | The Playwright page |

**Marks**: every mark of the store screenshots (`SCREENS` in
`scripts/lib/shots.mjs`: `balance`, `amount`, `figures`, `started` …) plus the
film's own in `marks` (`add`, `save`, `next`, `where`, `where-groceries`).
`goTo(a, n)` gets to a page (0 Monat, 1 Statistik) through the tab bar, or
through ☰ and its tile once the menu has replaced it.

Things this app does that a chapter has to allow for:

- The round **+** sits above the tab bar, outside `nav`, and only on the
  month page's root.
- After saving an entry a toast ("„Lidl“ eingetragen · Noch einer") stays a
  few seconds and runs into the next chapter's first frames.
- Statistik → a category is a pushed screen; `goTo` backs out of it.
- The next month's toast needs a moment: `a.see('started')` before lighting it.

## The words

`config/copy.<lang>.json`: **five words at most**, long enough on screen
(compose names the `hold` a caption needs), no price words, calls to action or
superlatives. Take the store screenshots' headlines where a chapter shows the
same thing (`store-screenshot-studio/config/copy.<lang>.json`); write each
language rather than translating it. Arabic sets `"dir": "rtl"`.

## The dress

`config/theme.json`: the store set's dark petrol as the veil, white captions,
Nunito at 900 (`font.displayWeight`) from the app's own file, the icon's petrol
on the end card. Arabic is not in Nunito's file and falls back to the
system's Arabic face (on the Mac, Apple's).

## Length

`video.maxSeconds` is 29.5 (Apple: 30). When the whole comes out longer, the
filmed parts are played up to 15 % faster; past that the run stops — take a
step out or shorten pauses.

## When it stops

| What the run says | What to do |
|---|---|
| `ffmpeg is not installed` | `brew install ffmpeg` on the Mac |
| `Chromium did not start` | `npx playwright install chromium`; in a container `CHROME_PATH=/usr/bin/google-chrome` |
| `✗ de, chapter "entry": tap: "…" is not on the screen` | The flow or a label changed. `build/app-preview/fail-de.png` is the screen at that moment; mend the chapter or the mark |
| `"…" stands 1.5 s — too short to read` | Raise that chapter's `hold` |
| `the film is 31.2 s … too much to play faster` | Take a step out, shorten pauses |
| `! this machine films it choppily` | Expected in a container. On the Mac: close what else is running, film again |
| `The built app could not be served on port 4319` | A screenshot run or another film is going in this folder; wait for it |

## Status

Filmed end to end in a Linux container on 26 November 2026: de, en and ar
pass the validator (27.7–27.9 s, poster frame 0:02.2). The first Mac run is
still to come — then check that the film says `by screencast` at 50 or more
frames a second, Apple's emoji and San Francisco in the status bar, the
contact sheets, and one video played on an iPhone, and replace this section
with the date.
