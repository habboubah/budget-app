# Spartopf – Haushaltsbuch 🪙

A simple, private budget book for iPhone and the browser — the monthly Excel
sheet, made easy to fill in with one thumb. One bank account, one page per
month, and the two numbers that matter: **what is on the account now** and
**what will be left at the end of the month**.
**No sign-up, no server, no ads** — everything stays on your device.

## What it does

- **One month per page.** ‹ › switch months; "Zum aktuellen Monat" jumps back.
  The month reads in the order money moves: **Einkommen** first, then
  **Fixkosten**, **Auto**, **Sonderkosten**, **Einkaufen**, **Familie** — each a
  card with its total and what is still open. Each month has its own set of
  categories: a new month gets the ones switched on under *Einstellungen →
  Kategorien → In jedem neuen Monat*; an empty category can be removed from a
  month (undoable), and *Kategorie hinzufügen* brings any category in. A
  category with entries always stays. Tap a card's header to fold it
  down to that one line (remembered per category, in every month); "⋯" folds
  or unfolds them all.
- **Two balances.** *Jetzt auf dem Konto* counts what is paid / received.
  *Am Monatsende* also counts everything still open. Below them: how many of the
  month's bills are paid, and the carry-over, income and expenses that add up to
  the end balance.
- **Paid or open.** Every entry has a ring in front: dashed = still open (rent
  not paid yet, salary expected), filled = paid. One tap toggles it. With a due
  day ("am 14."), open entries turn **überfällig** once the day has passed.
- **Fast entry.** The amount comes first (German or English number format both
  work: `1.050,00`, `45,12`, `12.5`). Name suggestions come from earlier months
  and a built-in list per category; tapping "Miete" fills in last month's amount
  and due day. "Sichern & nächster" for a stack of receipts. Deleting is undoable.
- **Carry-over.** Mark entries **monatlich** or **jährlich**. Starting the next
  month shows exactly which ones come along and copies them in as *open*. The
  balance is carried over automatically — set it by hand for the first month or
  when the real account has drifted ("⋯" → Kontostand am Monatsanfang). Open
  entries left in earlier months are flagged with a link to them.
- **Statistics.** From the long view down to one month:
  - *all months* (last 12, or all): income vs. expenses, the balance at each
    month's end, the average per category, and every category per month as
    grouped columns (tap the legend to hide one; switch to income) — hover /
    tap for values, or open the table;
  - *insights* (Auswertung): savings rate, emergency reserve in months of
    spending (3–6 is the usual advice), a forecast for the year's end and 12
    months out, the 50/30/20 rule (needs / wants / saved — set per category
    whether it counts as needs), fixed commitments per month and per year,
    what was unusual this month, and the best and weakest month;
  - *one month in detail*: what was saved and where the money went, by
    category (paid vs. open) or by payee ("Lidl · 6×").
- **Settings.** Categories — create (income or expense, default repeat, emoji,
  colour), edit, drag to reorder, delete (undoable; asks first if entries go with
  it), *Standard wiederherstellen*. Deutsch / English, light / dark / automatic.
- **Import from Excel.** *Einstellungen → Excel → Aus Excel importieren* (or the
  button on the first month) reads a budget sheet laid out like
  `My_expense.xlsx`: one tab per month ("11.2026"), the categories in row 1,
  each with name · paid · open columns. A preview shows every month, how the
  columns map onto categories and what gets replaced before anything is written.
  "Before" becomes the starting balance (and a hand correction in a later month
  is kept), a day in brackets like `Vodafone(18)` becomes the due day, what comes
  back every month is marked *monatlich*, and a tab with a year typo ("08.2025"
  between July and September 2026) lands in the right month. Undoable.
- **Backup.** Export everything as a JSON file (share sheet on iPhone → Files /
  iCloud Drive / AirDrop) and import it again, or export every entry as **CSV for
  Excel**. There is no cloud: back up now and then.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3002 — also reachable from your phone on the same Wi-Fi
```

Other commands: `npm run lint` (type-check), `npm test` (unit tests),
`npm run build:web` (production build to `dist/`), `npm run preview`.

## Put it on your iPhone

### Option A — as a real app via Xcode (recommended)

Needs a Mac with Xcode.

```bash
npm install
npm run build:ios          # builds, syncs into ios/ and opens Xcode
```

In Xcode: select the **App** target → *Signing & Capabilities* → your Team
(already set to Ahmad Habboubah) → plug in the iPhone (or pick it over Wi-Fi) →
▶ Run. The bundle id is `com.habboubah.spartopf`.

After changing web code, `npm run build:ios` again (or `npm run build:web &&
npx cap sync ios`). Icons and splash come from `assets/` — regenerate with
`npm run assets:generate`.

### Option B — as a web app on the home screen

Host `dist/` on any HTTPS host (e.g. Cloudflare like pizza-driver-log:
`npm run build:web && npx wrangler pages deploy dist`), open it in Safari on the
iPhone → Share → **Add to Home Screen**. It then opens full-screen and works
offline.

Home-screen web apps and the Xcode app keep separate data. Use
**Einstellungen → Datensicherung** to move months between them.

## Publish on the App Store

`npm run release` builds Spartopf and uploads it straight to App Store Connect /
TestFlight, the same way Fahrtwerk and Korb ship. The full first-time checklist
(API key, app record, privacy policy, screenshots, listing texts, review) is in
**[APP_STORE_RELEASE.md](APP_STORE_RELEASE.md)**.

## Project layout

| Path | What |
|---|---|
| `src/App.tsx` | Tabs, pushed screens (no router), sheets, toasts |
| `src/store.ts` | All state, persisted to `localStorage` (`spartopf-*` keys) |
| `src/logic.ts` | Pure logic — money parsing/formatting, months, the two balances, carry-over, statistics, storage validation, CSV (tested in `logic.test.ts`) |
| `src/insights.ts` | Savings rate, reserve, forecast, 50/30/20, commitments, unusual months (tested in `insights.test.ts`) |
| `src/xlsx.ts`, `src/excelImport.ts` | Reading an .xlsx on the device, and turning a budget sheet into months (tested in `excelImport.test.ts`) |
| `src/data/defaults.ts` | Built-in categories, name suggestions, emoji |
| `src/translations.ts` | All UI text, `de` and `en` |
| `src/components/` | Screens (`*View`) and sheets (`*Sheet`), the charts |
| `src/ui/` | Shared primitives from shopping-list: Screen, Sheet, Button, Field, Toast, TabBar … |
| `ios/` | Capacitor iOS project (Swift Package Manager, UIScene lifecycle) |
| `scripts/` | `release.js` (App Store upload), `screenshots.mjs` (store screenshots) |
| `store/` | App Store texts and the privacy policy |
| `.claude/skills/` | Design / UX / animation / release skills from shopping-list and pizza-driver-log |

See `CLAUDE.md` for the conventions and `PLAN.md` for the concept and the money
rules.
