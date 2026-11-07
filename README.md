# Spartopf – Haushaltsbuch 🪙

A simple, private budget book for iPhone and the browser — the monthly Excel
sheet, made easy to fill in with one thumb. One bank account, one page per
month, and the two numbers that matter: **what is on the account now** and
**what will be left at the end of the month**.
**No sign-up, no server, no ads** — everything stays on your device.

## What it does

- **Looks and feels like an iPhone app.** Apple's own font (SF Pro, with SF
  Rounded for the money), the grouped grey background with white cards, a
  floating tab bar with the add button beside it, swipe actions, light and
  dark mode. The balance sits on a gradient card in the app's colour — eight
  to choose from in Settings — and every category brings its own: its tile,
  a bar for how much of it is paid, its ticks. Amounts run to their new value
  when something is ticked.
- **Bank transactions in, without typing.** Import the CSV file from your
  online banking (Sparkasse and others), or take a photo / screenshot of the
  banking app — the text is read on the phone itself. Every transaction is
  shown to check first: new ones, ones already entered, and open bills they
  pay (those get ticked off).
- **One month per page.** ‹ › switch months, or tap the month's name to pick
  any month (each shown with what it ended on); "Zum aktuellen Monat" jumps
  back.
  The month reads in the order money moves: **Einkommen** first, then
  **Wohnen** (rent, utilities, phone …), **Auto**, **Sonstiges**, **Lebensmittel und Drogerie**,
  **Restaurants**, **Familie**, **Kinder** — each a card with what is paid so far and, small and yellow
  below it, the total including what is still open. Each month
  has its own set of categories: a new month gets the ones switched on under
  *Einstellungen → Kategorien → In jedem neuen Monat*; an empty category can
  be removed from a month (undoable), and *Kategorie hinzufügen* brings any
  category in — as does picking it when entering something. A category with
  entries always stays. Tap a card's header to fold it
  down to that one line (remembered per category, in every month); "⋯" folds
  or unfolds them all. The filter button on a card shows only what is still
  open there.
- **Drag to sort.** Press and hold an entry (with a mouse: just drag it) and
  move it — within its card to change the order, or onto another card to move
  it there (undoable). A line shows where it lands, and the page scrolls along
  near the edges. The order is kept per month and comes along with recurring
  entries. Keyboard: Alt + ↑ / ↓.
- **Two balances.** *Kontostand jetzt* — the bank balance, counting what is
  paid / received — with a ring for how many of the month's bills are paid and,
  small beneath it, what was carried over (tap to correct it). Below, income
  and expenses in two columns, *Bezahlt* and *Offen*, down to *Am Monatsende*
  in both columns, and the two together: what is left once everything open is
  settled.
- **Paid or open.** Every entry has a circle in front: empty = still open (rent
  not paid yet, salary expected), filled = paid. One tap toggles it — or swipe
  the entry to the right. Swipe left to delete (undoable). Every entry has a
  **date** (today unless you pick another day of the month), shown on its row.
  With a due day ("fällig am 14."), open entries turn **überfällig** once the
  day has passed. How often an entry repeats shows in the editor only.
- **Fast entry.** The amount comes first (German or English number format both
  work: `1.050,00`, `45,12`, `12.5`). Name suggestions come from every entry in
  every month (this category's first, then the built-in ideas, then other
  categories') and narrow with each letter typed; tapping "Miete" fills in last
  month's amount and due day, and a name from another category ("Lidl") moves
  the entry there. All of this month's categories show at once, the rest behind
  *Weitere*. "Sichern & nächster" for a stack of receipts (keeps the date).
  Deleting is undoable.
- **Carry-over.** Mark entries **monatlich** or **jährlich**. Starting the next
  month shows exactly which ones come along and copies them in as *open*. The
  balance is carried over automatically — set it by hand for the first month or
  when the real account has drifted ("⋯" → Kontostand am Monatsanfang). Open
  entries left in earlier months are flagged with a link to them.
- **Statistics.** The long view (last 12 months, or all): income vs.
  expenses, the balance at each month's end, income and expenses as lines,
  saved and overspent, the average per category over the last 3 / 6 / 12 / all
  finished months, every category per month as grouped columns (tap the
  legend to hide one, or show / hide all), and where the money went by payee
  over this month or the last 2, 3, 6 or 12 ("Lidl · 6× · 12 %") — hover / tap
  for values, or open the table.
- **Insights** (Analyse), a tab of their own: the savings rate month by month
  against the 20 % target, the 50/30/20 rule (needs / wants / saved — each
  against its share, in euros, with its biggest categories, how many of the
  three targets are met and in which months; set per category whether it
  counts as *Bedarf*, *Wünsche* or *Sparen*, so an ETF plan in *Geldanlage* is
  saved, not spent), emergency reserve in months of spending (3–6 is the usual
  advice), a forecast for the year's end and 12 months out, fixed commitments,
  trends, the best and weakest month — and hints for one month: what was
  unusual and the biggest expenses (also over the last 2, 3 or 6 months), new
  names, missing regulars, new prices.
- **Settings.** Categories — besides the six above, the usual categories of a
  German banking app are built in, switched off for new months until you want
  them: *Bekleidung, Einkäufe, Telekommunikation, Mobilität, Reisen, Freizeit
  und Unterhaltung, Sport und Hobby, Gesundheit und Wellness, Bildung und
  Erziehung, Geldanlage, Versicherungen, Bargeld, Steuern und Gebühren*, each
  with its own name suggestions. Create your own
  (income or expense, default repeat, emoji, colour), edit, drag to reorder,
  delete (undoable; asks first if entries go with it), *Standard
  wiederherstellen*. Deutsch / English / العربية (right to left, with Arabic
  category names; amounts typed with Arabic digits are understood), light /
  dark / automatic.
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
`npm run audit:contrast` (checks every colour pairing of every accent in both
themes), `npm run build:web` (production build to `dist/`), `npm run preview`.

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
| `src/insights.ts` | Savings rate, reserve, forecast, 50/30/20 check, commitments, unusual months, hints (tested in `insights.test.ts`) |
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
