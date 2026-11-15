# Composition

What makes a set of store screenshots look designed rather than generated, and
how each of those things is set in this skill. Written for shopping-list after
taking apart the listings that convert in its category — Bring!'s first of all
(App Store, Germany, 15 November 2026) — and brought to Spartopf the same day,
whose set had the same faults: pale gradient, small type, a small phone in the
middle of every slide. The ideas are theirs and everybody's; no picture,
colour or drawing is.

Assume the reader sees three thumbnails in a search result, each the width of
a thumb, for about a second. Every rule below exists for that reader.

## 1. One colour, flat

A saturated brand colour with nothing in it — no gradient, no blur — makes the
row of slides one block and the app's screens the lightest thing on it.

- The set's colour is a `backgrounds` preset in `config/theme.json`:
  **petrol**, the icon's own colour and the app's accent, with white type
  (6:1) and the gold of the icon's coin for the ribbon. **mist**, the same hue
  as a light canvas with petrol ink (11:1), is the quieter alternative. Pick
  one for the whole set.
- **night** is for a screen shown in dark mode only (the set has none today):
  a dark screen on mist looks like a hole.
- The app's hero cards are a darker petrol. In the phone they stand on the
  light page; lifted out of it they have only their shadow to stand off the
  canvas. So the pieces this set lifts are the light ones (§4).
- Shadows are mixed from the preset's `shade` (a darker tone of the same
  colour), never from grey: grey shadows on a colour look dirty.

## 2. A headline for a thumbnail

- Nunito Black at 10.8 % of the canvas width, two or three lines, centred,
  balanced. At thumbnail size that is still a readable word; the old 7.4 %
  semibold was not.
- At most five words (`reference/copywriting.md`), and no subline: a thumbnail
  has room for one message. The opening slide is the exception (§6).
  `"sublines": true` in the config's `style` brings them back for a set that
  needs them; one slide can ask with `"subline": true`.
- A headline that would need a fourth line, or has a word wider than the
  slide (German), is stepped down in size until it fits — it is never cut and
  never wraps mid-word. If it had to shrink below about 80 %, shorten the
  headline instead.
- A dash stays with the word before it; no line starts with "– ganz einfach".

## 3. A phone you can read

- The phone is 39 % of the canvas height wide — about 85 % of the App Store
  canvas's width — and taller than the room it has. It runs off the canvas at
  the far end from the copy. A whole phone in the middle of a slide is a
  picture of a phone; a cut one is a picture of the app.
- **`top`** (copy above) shows the upper part of the screen, **`bottom`** (copy
  below) the lower part. Choose by where the slide's subject is, then alternate
  where the screens allow it: three slides in a row with the copy in the same
  place read as a template (`validate.py` warns).
- The frame is thin, dark and drawn (`assets/frames/README.md`). The captures
  have no status bar, so the frame adds a band for the island, painted with the
  capture's own first row of pixels.
- A tilt (`phone.tilt`, a few degrees) is for the one slide that has nothing to
  lift — here the last one, *Planen*, whose subject is a hero card (§4). A
  second phone (`second`) is for the opening slide.

## 4. A call-out: lift the piece the headline is about

The strongest thing these listings do: the search field, the sort button, a
tile — the one control the headline names — comes out of the phone, larger than
the phone, with a shadow under it. The eye goes headline → that piece, and the
slide has said its sentence.

- It is the capture's own pixels through a window (`.callout` in
  `templates/slide.css`), so nothing is invented and App Review has nothing to
  object to.
- It starts where the piece is on the screen. Scaled about its centre it covers
  its own original, so there is never a doubled element.
- **Wider than the phone.** A lifted card that ends inside the frame looks like
  a selected row. 1.12 and up takes a full-width card past the bezel.
- **Sharp.** The capture is 1290 px wide and the phone shows it at about 990;
  a piece scaled past 1.3× the capture's own pixels goes soft next to the
  screen (`validate.py` warns, per target).
- **No half-covered text.** A lifted piece covers its neighbours. A line of
  text half under its edge looks like a mistake; a line wholly covered, or
  wholly clear, does not. Fix with `anchor`, `shift` or a little more `scale`,
  and check both languages — rows wrap differently.
- **One subject.** One call-out per slide; two small tiles tilted apart for a
  slide about many things. Not on the opening slide, where two phones already
  compete.
- **A piece, not half the screen.** A chart card takes 40 % of the screen.
  Lifted, it hides the phone under it, and on the App Store canvas it reaches
  both seams over a third of the height, so no sticker fits beside it. One
  slide lifts its chart (the history: the balance at each month's end); the
  others lift the sentence about the chart: *Das fällt auf* with its first
  hint, a category's three figures.
- **Light on petrol.** A white card, a page-coloured panel or the near-black
  toast stand off the canvas by themselves. A hero card is the canvas's own
  colour, so none is lifted: on *Planen*, where the hero is the subject, the
  phone leans instead.
- **Named, not measured.** A call-out names a mark from
  `<capture>.marks.json`. The marks are measured in the running app by the
  capture script, per language, with each element's corner radius — so the
  piece is right in English when German was the one looked at, and stays right
  when the screen changes. A selector that no longer matches stops the capture
  run with the mark's name.

## 5. Stickers on the seams

A listing is swiped. A drawing that sits on the border between two slides is
half on each, so the row reads as one strip and the next slide is already
begun.

- `x: 1.0` on a slide is its seam to the next. The renderer gives each slide
  its own stickers and its neighbours' spill, per target — Play's eight slides
  are their own strip.
- Twelve drawings in `assets/stickers/`: flat shapes in the manner of the icon
  (two of them are its household book and its coin), each with a paper edge so
  it holds on petrol, mist and night alike. They are original; emoji are not used (Apple's and Google's are
  not ours to put on artwork), nor is anything downloaded.
- One per seam, alternating high and low where the seam allows it, `y` roughly
  between 0.3 and 0.7 so it is clear of the copy on both layouts. On the App
  Store canvas the phone and a full-width call-out leave about 6 % at each
  edge, so a seam is clear only where neither neighbour has a call-out or copy
  at that height: next to a call-out that sits high, the sticker sits low. A
  sticker beside a headline is fine when the headline is narrower than the
  slide (budgets → next month). A sticker may overlap a phone's edge
  — that is what ties it to the picture — but not a call-out, not the control
  the slide is about, and never the headline.
- 0.27–0.36 of the canvas width. Smaller reads as confetti.

## 6. The opening slide

Most people see only this one.

- It says what the app is, in the app's own words: the month in front (the
  balance now, what is left at month end), the categories with their budgets
  behind it.
- Its subline is on (`"subline": true`): what the app does, in one line.
  Ahmad asked for the first screenshot to say what the app is, what it can do
  and why to pick it.
- It carries the promise as points: *Keine Werbung*, *Sicher, Privatsphäre
  zuerst*, *Daten bleiben auf dem Gerät* (and *Kein Abo* on Play). Facts, each
  provable in the app.
- On Play it also carries the ribbon.

## The feature graphic

1024 × 500, seen at the top of the Play listing and in promotions, often with a
play button over its centre: what the app is at the start edge in two lines,
the points under it, the phone leaning in from the end edge and running off
the bottom, one sticker between them. Nothing important in the middle. With
four points the block is three rows tall and would climb under the ribbon; the
template moves it down by what it lacks (`--ribbon-clear`), which leaves no
room for a subline there.

## Sizes and units

Everything hangs on the canvas height, so a slide is the same composition on
every target (`templates/slide.css`): on the App Store's 9 : 19.5 it fills the
width; on Play's 9 : 16 the same picture stands in the middle with more margin.
Type alone uses some of Play's extra width. Consequences for the config:

| value | unit |
|---|---|
| `phone.width` | percent of the canvas height |
| `phone.nudge`, sticker `size` | App Store canvas widths (x), canvas heights (y) |
| sticker `x` / `y` | slide widths from the leading edge / slide heights from the top |
| call-out `shift` | screen widths |
| call-out `pad`, `radius`, `crop` | fractions of the capture |

## Checklist for the contact sheet

Both sheets, every language:

1. Does the row read as one strip — one colour, stickers crossing the seams?
2. Can each headline be read with the sheet at arm's length? Did any have to
   shrink?
3. On each slide, is it obvious within a second which piece of the screen the
   headline is about?
4. Is every call-out sharp, wider than the phone, and free of half-covered
   text at its edges?
5. Is any sticker on a headline, a call-out or the slide's subject?
6. Copy on top, then below, then on top?
7. Does the first slide alone say what the app is?
8. Is everything shown true of the app as it is today — the name on its
   screens, the points, the ribbon?
