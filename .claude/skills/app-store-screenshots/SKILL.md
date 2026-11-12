---
name: app-store-screenshots
description: Regenerate the raw App Store screenshots of Haushaltsbuch Einfach (npm run screenshots → screenshots/<de|en>/, ten screens per language). Use when asked to update, refresh or regenerate store screenshots, or to add, drop or reorder a screen in the set. The framed, captioned upload set is the store-screenshot-studio skill.
---

# App Store screenshots (raw captures)

`scripts/screenshots.mjs` builds the app, seeds it with demo data and captures
**ten screens per language** — the most App Store Connect takes per slot — as
plain app screens. `store-screenshot-studio` (`npm run store-screenshots`) then
frames and captions them at the size App Store Connect asks for. Upload those,
not these: the raw size (1290 × 2796) fits no required slot.

## Run it

```bash
npx playwright install chromium        # once per Mac
npm run screenshots                    # all ten, DE and EN
npm run screenshots -- --only 08-category,10-plan    # just these, e.g. after a fix
npm run store-screenshots              # the framed upload set from these
```

Run it on the Mac, so the emoji and system font are Apple's own.

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
maximum per slot — to add one, drop one. Every screen also needs a slide in
`store-screenshot-studio` (its `config/screenshots.config.json` and both
`config/copy.*.json`), and its headline may only claim what the capture shows.

## Leftovers

`capture.mjs`, `compare.mjs`, `config.json` and `config.redesign.json` in this
folder came over from pizza-driver-log (Fahrtwerk) and are not used by
`npm run screenshots`.
