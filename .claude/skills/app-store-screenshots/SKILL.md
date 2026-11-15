---
name: app-store-screenshots
description: Regenerate the raw store screenshots of Spartopf (npm run screenshots → screenshots/<de|en>/, ten screens per language, each with its marks). Use when asked to update, refresh or regenerate store screenshots, to add, drop or reorder a screen in the set, or to mark a part of a screen for a call-out. The composed, captioned upload set is the store-screenshot-studio skill.
---

# Store screenshots (raw captures)

`scripts/screenshots.mjs` builds the app, seeds it with demo data and captures
**ten screens per language** — the most App Store Connect takes per slot — as
plain app screens, and next to each one where its parts are
(`<screen>.marks.json`). `store-screenshot-studio`
(`npm run store-screenshots`) then composes and captions them at the sizes the
App Store and Google Play ask for, and lifts the marked parts out of the phone.
Upload those, not these: the raw size (1290 × 2796) fits no required slot.

## Run it

```bash
npx playwright install chromium        # once per Mac
npm run screenshots                    # all ten, DE and EN
npm run screenshots -- --only 08-category,10-plan    # just these, e.g. after a fix
npm run store-screenshots              # the composed upload set from these
```

Run it on the Mac, so the emoji and system font are Apple's own. The marks are
measured in the same run, so they always belong to the capture beside them: a
capture taken on one machine and marks from another do not fit (the system
font sets where a line breaks).

## What comes out

`screenshots/de/` and `screenshots/en/`, 1290 × 2796 PNG (430 × 932 pt @3x):

| # | file | screen | how it is reached |
|---|---|---|---|
| 1 | `01-month` | the running month, both balances | start screen |
| 2 | `02-entry` | new entry, 47,85 € at Lidl | groceries' add row → type → suggestion chip |
| 3 | `03-backup` | Sichern und übertragen: "Alles bleibt auf diesem Gerät, es gibt keine Cloud" | Einstellungen → that row |
| 4 | `04-budgets` | Auto, Sonstiges, Lebensmittel with their budgets | month scrolled to the car card |
| 5 | `05-next-month` | next month, not started, what it carries over | › in the header |
| 6 | `06-stats` | Statistik: *Das fällt auf* | tab 2 |
| 7 | `07-history` | Statistik: *Verlauf* | tab 2, scrolled to `#history-title` |
| 8 | `08-category` | Lebensmittel's own page | Statistik → *Wofür das Geld geht* → its row |
| 9 | `09-report` | Monatsbericht of last month | ‹ → ⋯ → Monatsbericht |
| 10 | `10-plan` | Planen: *{Monat} bis heute*, budgets | tab 3 |

A full run empties both folders first, so a screen dropped from the list can't
linger. A screen that can't be reached is reported by name (`✗ de/08-category: …`),
the others are still taken, and the run exits non-zero.

## The marks

The store set lifts pieces of a screen out of the phone — the amount field, a
category's card, the month report's summary (the studio's call-outs). It finds
them by name in `screenshots/<de|en>/<screen>.marks.json`, which this run
writes with each capture: every mark's box in fractions of the screen, and its
corner radius, measured in the running app in that language.

Each screen names its marks in `SCREENS` (`scripts/screenshots.mjs`):

```js
marks: { amount: `${sheet} [data-tour="entry-amount"]`, name: `${sheet} [data-tour="entry-name"]` },
```

a name and a selector. The selectors are the app's own handles — `data-tour`
(the guide's marks), a category's id, the page's structure — never its words,
so one selector is right in German and in English.

| screen | marks |
|---|---|
| `01-month` | `balance`, `month-end`, `left`, `search` |
| `02-entry` | `amount`, `name`, `category`, `details` |
| `03-backup` | `backup`, `backup-note` (the card with the sentence under it), `excel` |
| `04-budgets` | `budget-car`, `budget-extra`, `budget-groceries-head` |
| `05-next-month` | `started` (the toast), `balance`, `month-end`, `left` |
| `06-stats` | `range`, `summary`, `stands-out` (*Das fällt auf* with its first hint) |
| `07-history` | `income-expenses`, `balance-trend` |
| `08-category` | `average`, `figures`, `figure-1` … `figure-3`, `budget` |
| `09-report` | `summary`, `income`, `spending`, `saved`, `rate`, `budgets`, `changes` |
| `10-plan` | `pace` |

- **The names are the contract** with the studio's config (`"mark": "amount"`).
  When a screen changes, mend the selector and keep the name.
- A mark has to be wholly on the screen when the capture is taken. One that is
  missing or cut off stops that screen (`✗ de/04-budgets: mark "budget-car" is
  not on the screen …`) — no capture is written with stale marks.
- The corner radius is the element's own, or that of the first thing in it when
  it has none.
- **A list of selectors** marks the box around all of them, for a part that
  has no element of its own (`stands-out`: the card's heading and the first
  hint under it). Such a mark has no corner; the call-out gives it one.

## The demo data

Six months ending in the running month (`sampleData`, the same as
`scripts/ui-review.mjs`): salary, child benefit, rent and other fixed costs,
fuel, groceries at five shops, extras, Kita — partly paid in the running month,
generated relative to today so the first screen always says *Dieser Monat*.
Plus the shipped categories (loaded through Vite from `src/data/defaults.ts`)
with four budgets: Lebensmittel 650 €, Auto 400 €, Sonstiges 150 €, Restaurants
120 €. English uses English names and UK shops.

## Adding, dropping or reordering a screen

Edit `SCREENS` in `scripts/screenshots.mjs`. Each entry is a `name` (its
filename; the number is the store order) and an optional `run(page, l)` that
gets there from a fresh load of `/` on the running month. The app has no router,
so every screen is reached by clicking. Labels the clicks need per language live
in `L`. Handles that have proved stable (also used by `scripts/ui-review.mjs`):

| target | selector |
|---|---|
| tab bar (Monat, Statistik, Planen, Einstellungen) | `nav button:not(.hero)` nth 0–3 — the `tab(page, n)` helper |
| a category's card on the month | `main section[data-drop-category="<id>"]` |
| month ‹ › | `button[aria-label="<prev/next label>"]` |
| month ⋯ menu | `header button` last, then `getByRole('menuitem', { name })` |
| a row of *Wofür das Geld geht* | `main li[data-hue] > button` |
| an open sheet | `[role="dialog"]` |

Find a card by its category **id**, not its display name: names change (a
rename of "Einkaufen" once broke this script). Ten is App Store Connect's
maximum per slot — to add one, drop one; Google Play takes eight (the Play
target lists its eight in the studio's config). Every screen also needs a
slide in `store-screenshot-studio` (its `config/screenshots.config.json` and
both `config/copy.*.json`), its headline may only claim what the capture shows,
and the part the slide lifts needs a mark (above).

## Leftovers

`capture.mjs`, `compare.mjs`, `config.json` and `config.redesign.json` in this
folder came over from pizza-driver-log (Fahrtwerk) and are not used by
`npm run screenshots`.
