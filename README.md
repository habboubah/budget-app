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
  to choose from in Optionen — and every category brings its own: its tile,
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
  *Optionen → Kategorien und Budgets → (a category) → In jedem neuen Monat*; an empty category can
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
  work: `1.050,00`, `45,12`, `12.5`). A row of **+ − × ÷** keys sits above the
  keyboard while you type the amount, so `12,50+4,80` adds up to `17,30` on
  save — no mental maths for a receipt or a split bill. Name suggestions come from every entry in
  every month (this category's first, then the built-in ideas, then other
  categories') and narrow with each letter typed; tapping "Miete" fills in last
  month's amount and due day, and a name from another category ("Lidl") moves
  the entry there. All of this month's categories show at once, the rest behind
  *Weitere*. "Sichern & nächster" for a stack of receipts (keeps the date).
  Deleting is undoable.
- **Tags.** Give an entry free tags from the sheet's "+" menu (*# Tag*). Search
  finds `#urlaub`, and once any tag exists *Statistik → Wofür das Geld geht*
  gains a **Tags** view ("Urlaub · 1.840 € · 23 Einträge"); the CSV export has a
  tags column. Nothing changes if you never use them.
- **Favourites.** Pin the small daily entries (Bäcker, Tanken, Kantine) with
  *Als Favorit merken*; they appear as chips at the top of a new entry. One tap
  adds the entry (dated today, paid, undoable); a long press opens it to change
  something first. Reorder and remove them in *Optionen → Haushaltsbuch →
  Favoriten*. Up to eight.
- **Carry-over.** Mark entries **monatlich** or **jährlich**. Starting the next
  month shows exactly which ones come along and copies them in as *open*. The
  balance is carried over automatically — set it by hand for the first month or
  when the real account has drifted ("⋯" → Kontostand am Monatsanfang). Open
  entries left in earlier months are flagged with a link to them.
- **Match the bank.** "⋯" → *Mit Bank abgleichen*: type what your bank shows,
  and Spartopf books the difference as a "Kontoabgleich" entry (so you see
  where it came from) or, if you prefer, moves the month's opening balance.
  Undoable; the balance card then notes "Abgeglichen am …".
- **Budgets.** Give a spending category a monthly budget (with a suggestion
  from what it cost on average): its card shows paid and open against it, a
  tick for today, "noch 212,88 €" or "50,04 € drüber". *Diesen Monat übrig*
  says what is left per day.
- **Demnächst fällig** on the running month: what is due next, overdue first,
  ticked off right there; *Alle* lists it day by day, with what next month
  brings along.
- **Search every month** from the month page, grouped by month.
- **Reminders and a lock** (iPhone app): a notification before an open bill is
  due and a week before a contract's last day to cancel — without amounts
  unless you want them; Face ID (or the passcode) when opening Spartopf.
- **Statistics** — *how did it go?* First **Das fällt auf**: at most three
  ranked hints, each with a next step (a category above its usual, a trend, a
  better or weaker month, a record, a month with items still open or a week
  without entries, one big expense) — "⋯" hides one, *Wie berechnet?* explains
  it. Then **Verlauf**, over 6 or 12 months or all: the average income,
  spending and savings of the finished months, one chart of income and
  spending with what each month kept (still open or expected is hatched), the
  balance at each month's end, where the money goes by category (Ø, share,
  how it moved against the months before, the budget as a tick) or by payee,
  and the table — a month opens its **Monatsbericht**. A category opens its own
  screen: its months with the Ø and its budget, so far / Ø / this year, the
  budget kept, where its money goes, its biggest entries and fixed costs. A
  payee opens a sheet with its months and *Alle Einträge*. Money put into a
  savings category (an ETF plan in *Geldanlage*) counts as saved, not spent,
  everywhere in the statistics. From 15 December to January, the
  **Jahresrückblick**: the year in numbers, budgets for the next year to take
  over in one step, and a picture to share — without amounts unless you want
  them.
- **Planen** — *how is it going, what's coming?* **November bis heute**:
  everyday spending so far against a usual month at the same day, where it
  would end, and where it goes. The month's **budgets**. **Ausblick**: the
  balance at the end of each of the next twelve months, with yearly bills in
  their month and a range from calm to pricey months. **Rücklage für jährliche
  Kosten** (when the book has a yearly bill): how much to set aside a month,
  the next bills coming up, and whether the account covers them. **Spartöpfe**:
  savings goals with a progress ring and "noch 97 € im Monat bis Juni"; a
  "Sparen"-Eintrag can be put into a pot, recurring ones fill it by themselves.
  **Abos & Verträge**:
  every recurring cost with its next payment, price changes (with what they do
  in a year) and notice deadlines, new subscriptions, and regular payments
  still missing this month — one tap enters them. **Finanz-Check**: more in
  than out (the savings rate and 50/30/20), bills on time, and the reserve in
  months of basic needs (3–6 is a rule of thumb). Every key figure has an ⓘ
  that shows how it is worked out, with your own numbers.
- **Monatsbericht** for any month — from the month's "⋯", Planen or the table:
  what it saved against a usual month, budgets kept, what changed, where the
  money went, what is still open, and the month after. At the start of a
  month a card on the month page sums up the one before.
- **Optionen.** Categories and budgets — besides the eight above, the usual categories of a
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
- **Currency.** A new install picks the currency from the phone's region (CHF,
  GBP, USD, SAR and more); *Optionen → Darstellung → Währung* changes it. It
  only relabels the amounts — nothing is converted — and existing books stay in
  EUR.
- **Import from Excel.** *Optionen → Sichern und übertragen → Aus Excel
  importieren* (or the link in the first month's setup card) reads a budget sheet laid out like
  `My_expense.xlsx`: one tab per month ("11.2026"), the categories in row 1,
  each with name · paid · open columns. A preview shows every month, how the
  columns map onto categories and what gets replaced before anything is written.
  "Before" becomes the starting balance (and a hand correction in a later month
  is kept), a day in brackets like `Vodafone(18)` becomes the due day, what comes
  back every month is marked *monatlich*, and a tab with a year typo ("08.2025"
  between July and September 2026) lands in the right month. Undoable.
- **Backup.** Export everything as one file (share sheet on iPhone → Files /
  iCloud Drive / AirDrop) and import it again, or export every entry as **CSV for
  Excel**. The backup is **encrypted with a password by default** (AES-GCM, done
  on the device); one switch makes a readable `.json` instead, and old plain
  backups still import. There is no cloud: back up now and then.
- **Automatic backups (iPhone).** Spartopf keeps its own history on the device:
  a version a day, the last 14 days and one per month for a year. *Optionen →
  Sichern und übertragen → Automatische Sicherungen* lists them; restoring one
  takes a tap, shows a preview and is undoable, and the crash screen can restore
  the latest. After 90 days without a copy leaving the phone, a dismissable card
  reminds you to export one.

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
**Optionen → Sichern und übertragen** to move months between them.

## Publish on the App Store

`npm run release` builds Spartopf and uploads it straight to App Store Connect /
TestFlight, the same way Fahrtwerk and Korb ship. The full first-time checklist
(API key, app record, privacy policy, screenshots, listing texts, review) is in
**[APP_STORE_RELEASE.md](APP_STORE_RELEASE.md)**.

## Project layout

| Path | What |
|---|---|
| `src/App.tsx` | Tabs, pushed screens (no router), sheets, toasts |
| `src/store.ts` | All state; view preferences in `localStorage` |
| `src/storage.ts` | The household book on disk: a checksummed file written atomically in the iPhone app, `localStorage` on the web (tested in `storage.test.ts`) |
| `src/logic.ts` | Pure logic — money parsing/formatting, months, the two balances, carry-over, statistics, storage validation, CSV (tested in `logic.test.ts`) |
| `src/insights/` | Statistik and Planen, pure and tested next to each module: the book (every entry read once), "usual" and the thresholds, the series (D1), 50/30/20, the hints and their ranking, pace, Ausblick, Finanz-Check, the category and payee details, the month report and the year review (`insights.test.ts` too) |
| `src/insightText.ts` | A hint in words, in every language (tested) |
| `src/budgets.ts`, `src/contracts.ts`, `src/due.ts` | Monthly budgets and their pace, subscriptions & contracts with notice deadlines, what is due next (each with its tests) |
| `src/reminders.ts`, `src/notify.ts`, `src/lock.ts` | The reminder plan (pure, tested), scheduling it on the iPhone, the Face ID lock |
| `src/fixtures/` | What older versions stored and backed up, and a demo year with its golden values; `compat.test.ts` and `golden.test.ts` load them |
| `src/xlsx.ts`, `src/excelImport.ts` | Reading an .xlsx on the device, and turning a budget sheet into months (tested in `excelImport.test.ts`) |
| `src/data/defaults.ts` | Built-in categories, name suggestions, emoji |
| `src/translations.ts` | All UI text, `de`, `en` and `ar` |
| `src/components/` | Screens (`*View`) and sheets (`*Sheet`), the charts |
| `src/ui/` | Shared primitives from shopping-list: Screen, Sheet, Button, Field, Toast, TabBar … |
| `ios/` | Capacitor iOS project (Swift Package Manager, UIScene lifecycle) |
| `scripts/` | `release.js` (App Store upload), `screenshots.mjs` (store screenshots) |
| `store/` | App Store texts and the privacy policy |
| `.claude/skills/` | Design / UX / animation / release skills from shopping-list and pizza-driver-log |

See `CLAUDE.md` for the conventions and `PLAN.md` for the concept and the money
rules.
