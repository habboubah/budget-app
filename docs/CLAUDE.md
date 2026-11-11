# CLAUDE.md

Steering file for AI assistants working in this repository. See `PLAN.md` for
the product concept and the money rules, `README.md` for running and installing,
`STATISTICS_AND_INSIGHTS.md` for what Statistik and Planen show, and why.

## What this app is
Spartopf: a client-only React + Capacitor household budget book, modelled on
Ahmad's monthly Excel sheet. One month per page, entries per category, each
entry paid or still open, recurring entries carried into the next month, and
two balances: *Jetzt auf dem Konto* and *Am Monatsende*. One bank account by
default; cash and savings accounts only once the user adds them (plan 30).
**No backend, no account — everything stays on the device** (a file in the
iPhone app, `localStorage` on the web; `src/storage.ts`).

## Stack
- React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `lucide-react`, `motion`.
- Capacitor 8 wraps `dist/` into the `ios/` native project. `vite-plugin-pwa`
  makes the web build installable and offline.
- npm only.
- **Dependencies are pinned to exact versions** (no `^`/`~`). `npm run check`
  runs `npm audit --omit=dev --audit-level=high`. Before adding one: prefer the
  platform (WebCrypto, not a crypto library) and what's already here; read the
  package's recent releases, open issues, maintainer count and licence, and
  skim the code it ships; pin the exact version and note why in the plan file.
  Anything that touches secrets or financial data gets our own small native
  plugin, not a third-party one.
- **Security (plan 05).** `src/limits.ts` caps every import (bytes + count);
  `readXlsx` rejects zip bombs; `toCsv` neutralises formula cells; a CSP ships
  on production builds (`vite.config.ts`); `src/crypto.ts` (WebCrypto) encrypts
  exports; `wipeAll()`/`onWipe()` in `storage.ts` erase everything on *Alle
  Daten löschen*; no `console.*` in app source (`check:security`). See
  `SECURITY.md` for the threat model.

## Architecture rules (mirrors pizza-driver-log and shopping-list)
- **No router.** `App.tsx` holds the active tab plus one state per pushed
  screen. The `pushed` array is the nav's single source of truth (back
  gesture, scroll reset) and must match the render ternary.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`. Immutable updates only.
- **`src/storage.ts` is the only module that reads or writes the user's
  data** (categories, entries, months, contracts). `main.tsx` awaits
  `hydrate()` before the first render; the store's one effect hands every
  change to `saver.save()` (debounced 300 ms, serialised), and `flush()`
  runs on `pagehide`, hidden and app background.
  - iPhone app: one file, `Library/spartopf/data.json`
    (`{ app, schemaVersion, savedAt, sha256, data }`), written atomically:
    `data.json.tmp`, the old file moved to `data.prev.json`, the temp moved
    into place — never a rename onto an existing file. On load the newest of
    the three whose SHA-256 matches wins; else the localStorage mirror; else
    (files broken, no mirror) the crash screen with *Daten retten*, whose
    dump includes the raw files.
  - **Two folders (plan 06).** The book (data, `data.prev.json`, snapshots)
    lives in `Library/spartopf/` — part of the phone's backup — or, with
    *Im iPhone-Backup sichern* off, in `Library/NoCloud/spartopf/`
    (`capacitorFsNoBackup`; the file system plugin marks NoCloud as excluded
    from backup). Where the files are *is* the setting: no preference to lose.
    `hydrate()` picks the folder with the newest copy (a tie, which only a move
    cut short leaves, counts as the backed-up one), tells the saver
    (`adoptLocation`) before anything can fail, and `tidyAfterMove()` clears the
    other folder. The switch calls `setInDeviceBackup()` → `saver.relocate()`:
    what is waiting is written first, then `moveBook()` copies every file and
    reads it back, and only then removes `data.json` from the old folder (the
    moment the move counts); a failure before that undoes the copies and
    rejects. `storage.test.ts` stops a move at every step, both ways, and the
    next launch must find the whole book. Snapshot, restore and rescue
    functions default to the book's folder (`appFs()`); *Alle Daten löschen*
    empties both. A write that fails (Data Protection, phone locked) is kept
    and written again on resume (`saver.retry()`).
  - **The localStorage mirror** (`DATA_KEYS`: one key per part of `AppData` —
    since schema 17 also currency, favourites, goals, rules and the test
    data's record, which the web lost on a reload before) is written with
    every save for two releases as the way back: the release after 1.4 removes
    it (and its read in `hydrate()`); until then it is also how an install from
    before plan 02 moves over on its first launch. Not while the book is kept
    out of the backup (plan 06): the web view's storage is part of the phone's
    backup, so `relocate` clears the mirror and the saver stops writing it.
  - Web / PWA: localStorage is the store, plus `navigator.storage.persist()`.
  - **Automatic snapshots (plan 03, iPhone only).** `Library/spartopf/backups/`
    holds one snapshot a day (`YYYY-MM-DD.json`, the same envelope). The saver
    writes one on the first save of a day and on resume; `snapshotsToKeep()`
    (pure, tested) keeps the last 14 days and the newest of each of the last
    12 months. *Automatische Sicherungen* (pushed under *Sichern und
    übertragen*, `BackupsView.tsx`) restores one with a preview and an undo,
    writing `pre-restore.json` first; the crash screen's *Letzte Sicherung
    wiederherstellen* calls `restoreLatestToData()`. The last-export date
    (`spartopf-last-export`) drives a dismissable 90-day nudge card, shown
    only while the book is kept out of the phone's backup (plan 06).
  - **Encrypted export (plan 04, `src/crypto.ts`).** A backup leaves the
    device locked by default. File (UTF-8 JSON, base64 fields):
    `{ app:'spartopf', format:'spartopf-encrypted', v:1, kdf:{ name:'PBKDF2',
    hash:'SHA-256', iterations, salt }, cipher:{ name:'AES-GCM', iv }, data }`.
    AES-GCM-256; the key is PBKDF2-HMAC-SHA-256 (600k iterations, read from the
    file so a later version can raise it) from a random 16-byte salt; a random
    12-byte IV; the whole header is GCM additional data. A wrong password and a
    tampered file both raise `BackupLockedError` (one message). Encrypted files
    are `.spartopf`; plain is `.json`. Import (`BackupGroup.tsx`) detects the
    envelope (`isEncryptedBackup`) and asks for the password before
    `parseBackup()`; old plain backups still import. All WebCrypto, no library.
  - *Alle Daten löschen* calls `saver.forget()` first, so `data.prev.json`
    (and the snapshots) keep no copy of the old book.
  - View preferences (language, theme, accent, folded cards, intro, tips,
    reminders, lock, hidden amounts) stay in localStorage in `store.ts`: losing
    them costs nothing, and a failed write of one doesn't raise the banner.
  - Debug: `localStorage['spartopf-debug'] = '1'` (Safari Web Inspector on a
    device) shows *WebKit-Daten löschen* in *Sichern und übertragen* — what
    iOS does when it reclaims web storage; after a relaunch the file has it all.
- **Screens** live in `src/components/XxxView.tsx`; forms shown in a bottom
  sheet are `XxxSheet.tsx`. Named exports, `Props` interface above.
- **Shared primitives** live in `src/ui/` (`Screen`, `Sheet`, `Button`,
  `IconButton`, `Field`, `Segmented`, `Toast`, `TabBar`, `haptics`…).
  Compose them instead of hand-rolling markup.
- **Pure logic** goes in `src/logic.ts` (money, months, balances, carry-over,
  statistics, storage validation) and is tested in `src/logic.test.ts`;
  Statistik and Planen in `src/insights/`. Components never do balance
  arithmetic themselves.
- **Excel import** is two layers: `src/xlsx.ts` unzips the file (fflate) and
  reads cell values with string matching — no spreadsheet library — and
  `src/excelImport.ts` plans the import as pure data (`planExcelImport`) that
  the preview sheet shows and `applyExcelImport` writes. Tests build their own
  .xlsx in memory; never commit a real one (it is someone's finances).
- **Statistik and Planen** (`STATISTICS_AND_INSIGHTS.md`, plans 06a and 13;
  its definitions §6 and decisions §14 apply to every figure). Statistik looks
  back, Planen looks ahead; at most three hints per screen, ranked, each with a
  next step; no score; estimates rounded (`formatMoneyEstimate`, "≈") with
  their basis named.
  - **The engine** is `src/insights/` (`index.ts` re-exports, so
    `import … from './insights'` works), pure and tested next to each module:
    `book.ts` (`buildBook(data, balances)` reads every entry once; App builds
    it in a `useMemo` per data change and passes it down — new figures read
    the book, never rescan entries), `baseline.ts` (`usual()`: the median of
    the up to six finished months before when four had money, else the mean;
    `materiality()`; the named thresholds), `series.ts` (D1: `spending` =
    *Ausgaben* (need + want), `invested` = *Angelegt* (`save` categories),
    `saved` = income − spending, `kept` = *Kontoplus*, `expense` stays every
    outflow; `upToNow` — Statistik stops at the running month), `rules.ts`
    (50/30/20, commitments), `hints.ts` (`unusual` with the robust usual and
    no yearly entries, trends without yearly entries, …), `pace.ts`,
    `outlook.ts`, `health.ts` (Grundbedarf, Finanz-Check), `highlights.ts`
    (hints as `Insight` data: ranked by impact × confidence × kind weight, one
    per category, `rank`; `highlights` for Statistik, `contractHints` for
    Planen, `monthHints` for a report), `detail.ts` (category screen, payee
    sheet, *Wofür* rows), `review.ts` (Monatsbericht, the review card's month,
    Jahresrückblick, `suggestBudgets`). Nothing there builds a sentence:
    `src/insightText.ts` turns an Insight into words (tested in every
    language). Every function takes `today`.
  - **`StatsView`**: the year card (15 Dec – 31 Jan, ≥ 6 months),
    *Das fällt auf* (`HintRows.tsx`; "⋯" → *Wie berechnet?* / *Ausblenden*,
    undoable), then *Verlauf* with 3 / 6 / 9 / 12 / Alle ("3 M", read out as
    "3 Monate"; the range lives in App:
    the category screen follows it): the averages with ⓘ and "davon Ø …
    angelegt", income vs. spending (Angelegt in the tooltip), balance,
    *Wofür* (rows → `CategoryView`, payees → `PayeeSheet`), the table (an
    *Angelegt* column when any; a month → its report).
  - **`InsightsView`** (Planen, id `insights`): `PaceCard` (*November bis
    heute*), `BudgetsCard`, `OutlookCard` (from three finished months),
    `ContractsCard` (+ new subscriptions, missing payments with *Eintragen* —
    the entry sheet prefilled and open — and a price change's yearly effect),
    the slots for plans 11 / 12, *Vermögen* (plan 30), `DebtsCard` (plan 31), `FinanceCheckCard` (rows with details: the
    savings-rate chart and 50/30/20, the due list, the reserve meter).
  - Key figures carry an ⓘ (`ExplainButton`) that opens `ExplainSheet`
    (*So berechnet*: definition, the user's own numbers, the months, what is
    left out).
  - Pushed screens with a parameter — `category`, `monthReport`,
    `yearReview` — go on the tab they're opened from (`HOME` in App has the
    fixed ones); their parameter is App state. The month-review card
    (`ReviewCard`) sits on the running month about the month before, from the
    second finished month on, until ✕ or opened.
  - View preferences, not in backups, no amounts: `spartopf-hints-hidden`
    (dismissed hint ids), `spartopf-reviews-seen` (months and years whose card
    was dismissed or opened), both capped at 200.
  - The year review's picture (`shareImage.ts`, `export.shareImage`) is drawn
    on the device only on tap, without amounts unless switched on.
    `localStorage['spartopf-dev-season'] = '1'` shows the year card out of
    season (ui-review uses it).
  - Averages use *finished* months, never the running one. Percentages go
    through `formatPercent()`; axis amounts through `compactMoney()`
    ("4.000" beside "20.000").
- **Charts** (`components/Charts.tsx`) share one `ChartFrame` for any slots
  — months, or days (`PaceChart`), where `groups` give VoiceOver week
  targets and a finger scrubs every day; labels inside a plot get
  `chart-halo`. They follow the dataviz skill. Series
  colours are tokens: `chart-in` / `chart-out` / `chart-save` / `chart-line` / `chart-want`
  (saved columns stand above the zero line, an overspend hangs below it in
  `neg`; in the 50/30/20 bars *saved* is `chart-in`, as `chart-save` sits too
  close to `chart-want`). Every legend with two or more series is
  `LegendToggles`: aria-pressed chips that hide a series, and the axis
  rescales to what is left,
  and per category `bg-hue-chart` / `fill-hue-chart` under `data-hue` — one
  OKLCH step per hue and theme (`--t-<hue>-chart`). Amber (`chart-save` /
  `warn`) means "open" everywhere; what a month kept is a label, not a column.
  Review a chart change with the `roast-my-chart` skill and run
  `npm run audit:contrast` (the `validate_palette.js` once cited here isn't in
  the repo). No pies, donuts or Sankeys on the phone. A projection is a dashed
  line with a hollow end point and "≈"; a baseline ("üblich") is a thin
  `fg-mute` line (`STATISTICS_AND_INSIGHTS.md` §9.9).
- **Categories per month:** `MonthRecord.categories` lists what a month
  shows; `monthCategories()` adds anything with entries, so money never
  vanishes. Unset (months from before, Excel imports) = the standard ones. New
  months take `standardCategoryIds()` (categories with `standard !== false`).
  Of the 21 built-ins eight are standard — the six from the Excel sheet plus
  `restaurants` (after `groceries`) and `children` (after `family`); the banking-app ones (`clothing` …
  `taxes`) ship with `standard: false` — keep it that way, or every month
  fills up with empty cards. Only an empty category can be taken
  out of a month (`canRemoveFromMonth`).
- **Schema 2** added those built-ins; **schema 3** gives built-ins still named
  as shipped their Arabic names; **schema 4** (`upgradeData`, `MERGED_V4` /
  `SHIPPED_V3`) folds "Wohnen und Garten" into `fixed` (now *Wohnen*) and the
  old "Sonstiges" into `extra` (now *Sonstiges*), entries and month lists
  included, and renames *Absicherung und Vorsorge* to *Versicherungen*;
  **schema 5** and **schema 8** (`NEW_MAIN`) add *Restaurants* after the
  groceries and *Kinder* after the family — skipped if the user already has a
  category of that name — and into the running and later started months'
  lists; earlier months without a list get the old
  standard ones frozen in (`upgradeData(data, from, today)`); **schema 6**
  (`SHIPPED_V5`) gives *Einkommen* 💰 instead of 💶 where unchanged; **schema 7**
  dates entries that only had a due day, and adds the optional `Entry.ref`
  (an imported bank transaction's fingerprint); **schema 9** adds
  `Category.limit` (a spending category's monthly budget, cents) and
  **schema 10** `AppData.contracts` (end, notice, renewal, note per recurring
  series); **schema 11** `AppData.currency` (plan 07); **schema 12**
  `AppData.favorites` (plan 09: pinned entries, name + category required, a
  deleted category falls to `extra`, capped at `MAX_FAVORITES`); **schema 13**
  `AppData.goals` + `Entry.goalId` (plan 12: savings pots; saved = a goal's
  `start` offset plus its paid entries; deleting a goal keeps the entries and
  drops the link; `src/insights/goals.ts` `goalProgress`); **schema 14**
  `Entry.tags` (plan 26: `normalizeTags`, `#tag` search, `tagTotals`, a Tags
  column in the CSV); **schema 15** `AppData.rules` (plan 20: import rules —
  `ruleFor` applied in `planStatement` before the learned payee and bank
  category; `set` reclassifies/renames, `skip` drops a transfer); **schema 16**
  `Entry.splitId` (plan 21: a split payment's parts are normal entries sharing
  it; `splitParts`); **schema 17** `AppData.demo` (the test data's record,
  `src/demo.ts`); **schema 20** accounts and transfers (plan 30, below);
  **schema 21** `AppData.debts` + `Entry.debtId` (plan 31, below);
  **schema 22** `Entry.files` (plan 27, below);
  **schema 23** `AppData.monthStart` (plan 32, below);
  **schema 24** `Entry.every` and `Entry.until` (below);
  **schema 25** `Category.limitPer`, `rollover`, `rolloverFrom` (below);
  **schema 26** `Entry.refund` (below) — all
  optional, nothing to migrate, all in backups. What
  older
  versions stored and backed up is kept in `src/fixtures/` (`storage-v*.json`,
  `backup-schema-*.json`; `compat.test.ts`: they load, keep what they held,
  and come to the same balances). A new schema version adds its fixture. Ids
  stay as history: `fixed` = Wohnen, `extra` = Sonstiges (also where orphaned
  entries go). `upgradeCategories()` (run once by
  `loadInitial` for storage below version 2, and by `parseBackup` for older
  backups) appends the missing ones and applies renamed names / emoji
  (`SHIPPED_V1` in `defaults.ts`) only where the user kept what v1 shipped.
  Future changes to built-ins follow the same pattern with a new version.
- **New months carry the recurring entries:** the running month and the
  next one start by themselves (App's auto-start effect) as soon as the month
  before is started, with `carryCandidates()` copied in open; further ahead
  the start card stays. A month created implicitly (an entry or an opening
  balance put into it — `ensureMonth`) carries them too. A recurring entry
  added to, or made recurring in, an earlier month is copied into the months
  already started after it (`laterCopies`).
- **Intervals and an end (schema 24).** There are still three repeats; a
  `yearly` entry may carry `every` (2, 3 or 6 months, `INTERVALS`) and any
  recurring entry `until` (its last month). **Never compare a repeat with
  twelve months by hand:** `intervalOf(e)` is the distance in months,
  `comesBackIn(e, key)` whether it returns in a later month (interval and end
  both), `seriesEnded(e, key)` the end alone, `latestPeriodic(entries)` the
  newest entry of every yearly-kind series — what the outlook and the month
  report project from. A quarterly bill stays "yearly" for every insight (out
  of trends, in the reserve); `commitments` and `contractItems` spread it by
  its interval. Labels come from `src/repeatLabel.ts` (`repeatName`,
  `perShort`, `REPEAT_CHOICES` for the entry sheet's menu). Weekly isn't
  offered: a series has one entry a month everywhere.
- **Budgets (schema 25, `src/budgets.ts`).** `Category.limit` is a plain
  monthly budget; with `limitPer: 'year'` it is the calendar year's, with
  `rollover` + `rolloverFrom` a monthly one whose rest (or overspend) since
  that month moves on — never both, and neither without a limit
  (`normalizeCategory`, `store.updateCategory`). `budgetStatus` answers for
  all three: `limit` is what the bar is measured against (the month's budget
  with what was carried, or the year's), `base` the amount as set, `period`,
  `carried`. **Read a budget through `budgetStatus`, and a per-month figure
  through `monthlyLimit(c)`** (a twelfth of a year's) — never `c.limit` by
  itself. Words: `src/budgetLabel.ts`. Set in `BudgetSheet` (*Pro Monat / Pro
  Jahr*, the rollover switch); the category sheet edits the amount only.
- **Entry order:** `Entry.order` is set once the user drags entries in a
  category (`moveEntry()` renumbers the source and target category of that
  month); `sortEntries()` puts ordered entries first, the rest by due day, then
  as entered. Carry-over copies `order`; changing an entry's category in the
  editor drops it. The gesture is `ui/useEntryDrag.ts` (long press on touch,
  drag with a mouse, auto-scroll near the edges); it finds the drop spot via
  `data-drop-category` / `data-entry-row`, so keep those on the cards and rows.
- **Entry date:** `Entry.date` (YYYY-MM-DD, always inside `month`) defaults to
  today (`defaultEntryDate`), carries over to the same day of the next month,
  and goes out as the last CSV column. It is also when an open entry is due:
  `isOverdue()` compares it with today and `sortEntries()` sorts by its day.
  `dueDay` is legacy — no longer shown or asked for; **schema 7** turned it
  into the date of entries that had none (only entries without a date still
  fall back to it).
- **Entry sheet order:** the amount first (focused for a new entry, decimal
  pad), then the name with its suggestions — three, the rest behind *Alle
  (n)* — then the category (three from `topCategories()`: same kind, this
  month's, most used, the chosen one always among them; every category behind
  *Alle (n)*), then one row of pills: date, paid ↔ open, repeat (a menu),
  note. A new entry — income or expense — starts paid / received and once; a
  picked suggestion doesn't change that (the first run's steps preset a name
  and "monthly" through `EntrySheetMode.preset`). A category's own `repeat` is
  no longer offered in the category sheet (the field stays in the data).
- **Category sheet:** name, kind, *Budget pro Monat* (spending only, with the
  suggestion from `suggestLimit`), *In jedem neuen Monat* (the switch lives
  here only), *Zählt als*, picture, colour. The Kategorien screen lists them
  with a subline and the entry count; *Bearbeiten* shows grips and ⊖, a swipe
  deletes (undoable).
- **Name suggestions** (`suggestNames`) come from every entry of every month:
  this category's names, then other categories' names of the same kind (pass
  `categories`), and only then its built-in ideas; each remembers its
  category, and picking one from elsewhere moves the entry there. That is the
  list before anything is typed; once a name is typed, see the next point.
- **Smarter entering (plan 32, `src/keywords.ts`, pure and tested).**
  `buildKeywordIndex()` (once per change of categories or entries — the sheet
  memoises it on what matters, as App passes fresh arrays) reads every
  category's keywords (`keywordsOf`: `Category.keywords`, else what a built-in
  ships with in `src/data/keywords.ts`, the app language's words first), each
  category's names in every language, and the earlier entries' names.
  `guessCategories()` ranks the categories a typed name points to — an earlier
  entry of that name (130) beats a keyword phrase (100 + length; "Aldi Talk"
  beats "Aldi"), a category name (90), a compound (80: a keyword of ≥ 4
  letters at a word's start, ≥ 5 at its end, the rest ≥ 3 letters), a typo
  (`editDistance`, OSA: 1 edit up to 7 letters, 2 from 8; a four-letter word
  only by a swap or a missing/extra letter — "Aldi" is not "Audi") and the
  start of what is still typed; ties go to the month's categories, then the
  most used. Sure matches only, within 15 points of the best, when any; else
  the likely ones from three letters. `completeNames()` and `correctTypo()`
  feed the sheet's chips and *Meintest du …?*. The entry sheet takes a sure
  guess for a new entry until a category or a name chip is tapped (and only
  with the view preference `spartopf-auto-category`, switched in
  *Kategorien und Budgets*; off: only marked), and goes back to the category
  it opened with when the name is emptied; an edited entry is never moved.
  Guessed chips lead the row with a ✦ and `suggest-pop` (index.css).
  **Schema 18** adds `Category.keywords` — unset = what ships (so new shipped
  words reach the user), set once edited in the category sheet
  (`KeywordEditor`), even to `[]`; `isShippedList` turns a list equal to the
  shipped one back into unset; `normalizeKeywords` (logic.ts) trims, dedupes
  by `keywordKey`, caps at 40 characters and 120 words. Keep a shipped keyword
  in one category unless it really is both, and mind what it starts or ends
  ("Super" would catch "Supermarkt").
- **Favourites in the entry sheet** fill it in (name, category, amount,
  repeat; the amount focused and selected) — nothing is saved before *Sichern*.
- **Search** (month page): `SearchField` sits in `Screen`'s `accessory` slot
  under the title. `searchEntries()` (logic.ts) keeps this month's entries
  whose name, note or category name contains every word, or whose amount
  contains a typed number ("80" finds 39,80 €; digits typed without a
  separator only from the start); `foldForSearch()` makes it case-, accent- and
  Arabic-letter-form-blind, `highlightRanges()` maps hits back for
  `ui/Highlight` (`bg-mark`, always `text-fg`) — names, notes and amounts. Results reuse
  `CategorySection` with `search` set: no fold, add row, filter, totals or
  drag — the hits are summed above the cards (`monthTotals`).
- **Pending filter:** each card's own (`openOnly` per category) and, beside
  the search field, one for the whole page (`allOpen` in MonthView): every
  card shows only its pending entries and cards without any are hidden.
  Turning one card's filter off while the page filter is on keeps the others
  filtered.
- **Bank import** (month "⋯" → *Kontoumsätze importieren (CSV)* / *Umsätze aus
  Foto übernehmen*): `src/statementImport.ts` is pure and tested —
  `parseBankCsv()` (finds the header row by column titles: Sparkasse
  CSV-CAMT, ING-style Soll/Haben, English exports; Windows-1252 or UTF-8 via
  `readTextFile`), `parseStatementText()` (the text of a banking-app
  screenshot), `cleanPayee()` (payee → name), `planStatement()` (the user's
  own name and category for a known payee, else the bank's category, income
  always in an income category; `exists` / `pay` / `new` against what is
  entered, by `Entry.ref` or same month + amount + name / date ±3 days) and
  `applyStatement()`. `StatementImportSheet` shows the plan; nothing is
  written before the user confirms (`store.importEntries`, undoable;
  months it needs start empty — the bank's list is what happened). Photos are
  read on the device by tesseract.js (`src/ocr.ts`): worker, SIMD core and
  the German model are copied into `public/ocr/` by `scripts/copy-ocr.mjs`
  (a Vite plugin runs it for dev and every build; generated, gitignored, not
  precached by the PWA). Never commit a real bank export or screenshot.
  iOS needs `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`.
- **Accounts and transfers (plan 30).** A book has its main account (id
  `main`, `MAIN_ACCOUNT`) and nothing else until the user adds cash, a savings
  account or another under *Optionen › Konten*; `AppData.accounts` (schema 20)
  is unset until then, and `hasAccounts()` is what every screen asks before
  showing anything about accounts. With the first extra account the main one
  is written down too (unnamed, so it reads *Girokonto* in every language;
  `accountName`). `Entry.accountId` unset = main; `MonthRecord.openings` holds
  the other accounts' opening balances (`opening` stays the main one's). A
  **transfer** is two entries sharing `transfer.pairId` (`direction` out / in),
  filed under `TRANSFER_CATEGORY` — not a real category, so `normalizeState`
  never moves it to *Sonstiges*; it is neither income nor expense:
  `monthTotals`, `buildBook`, `topNames` and `suggestNames` skip it, and
  `computeBalances(data, account)` adds it to its account as `transferPaid` /
  `transferOpen`. `computeBalances(data)` is the main account's;
  `'all'` (`ALL_ACCOUNTS`) sums every account month by month, where transfers
  come to nothing. App keeps the shown account (`store.accountView`, view
  preference `spartopf-account`): the month page reads `accountView(data,
  account)` (its entries, transfers left out) and the account's balances;
  Statistik, Planen, reports, budgets and *Demnächst fällig* read every
  account (`accountView(data, 'all')`, a budget is the category's wherever it
  was paid from). The balance card gets a switch (*Alle Konten* too), the
  month a `TransfersCard`, the "⋯" *Umbuchen* (`TransferSheet`), the entry
  sheet an account pill, Planen a *Vermögen* row (`accountTotals`). An opening
  and the bank match are one account's, so *Alle Konten* offers neither. Bank
  imports go into the shown account (`intoAccount`, matched against it); an
  Excel import replaces only the main account's own entries. Carry-over keeps
  the account, and a carried transfer gets a new shared pair id
  (`carryOver`, `laterTransferCopies`). An account can be deleted only once
  nothing is booked on it (`canDeleteAccount`); the main one stays. With
  accounts the CSV gets a *Konto* column, and a transfer's sign is its side.
- **Receipts and documents (plan 27).** `Entry.files` (schema 22) lists what
  is attached — `{ id, name, type, size }`, at most five, `image/jpeg` or
  `application/pdf` (`normalizeAttachments`); the file itself is kept by
  storage.ts (`fileStore()`): in the app as base64 text in
  `spartopf/files/<id>` beside the book — same folder and Data Protection,
  moved with it by `moveBook` / `tidyAfterMove` — and in IndexedDB
  (`spartopf-files`) on the web. Ids are checked against `FILE_ID` everywhere,
  so one can never be a path. `src/receipts.ts` takes a file in
  (`addAttachment`): a photo is drawn onto a canvas of at most 1600 px and
  saved again as a JPEG (80 %), which drops its location and all other EXIF;
  a PDF is kept as it came, up to 5 MB. Nothing goes to the photo library.
  The entry sheet's *Beleg* pill attaches (camera, or a photo / PDF), the
  chips open `ReceiptViewer` or remove one, and *Betrag vom Beleg lesen* runs
  the on-device OCR through `readReceipt` (pure, tested: the total by its
  line, else the largest amount; the shop's first line). A row shows a
  paperclip. Files a book no longer points to go at the next launch
  (`sweepFiles` in main.tsx) — so deleting an entry stays undoable; a sheet
  left without saving drops what it stored at once; *Alle Daten löschen*
  removes them all. A backup carries them as `files` (id → base64) beside the
  book — still one JSON, encrypted as before, up to 150 MB; an import writes
  them first and keeps only the receipts that are really there
  (`backupFiles`, `keepAttachments`). Daily snapshots hold the list, not the
  files. Carry-over doesn't copy receipts. `privacy-check.mjs` attaches a
  photo with EXIF and fails if any of it is stored.
- **Android (plan 23, `android/`, `docs/ANDROID_RELEASE.md`).** The same
  web app in Capacitor's Android shell. `platform.ts`: `isNative()` is either
  app, `isIos()` / `isAndroid()` tell them apart — **anything that needs Siri,
  Shortcuts or the App Group is `isIos()`** (the capture guide and its tip).
  What differs:
  - *Storage:* on Android the file plugin's `Library` and `LibraryNoCloud` are
    the same folder, so `capacitorFsNoBackup` is `files/no-backup/` there;
    `res/xml/data_extraction_rules.xml` and `backup_rules.xml` let a backup
    take `files/spartopf/` only. Keep every data path under `spartopf/`.
  - *Wording:* `src/i18n/android.ts` (its own chunk, loaded in `main.tsx`
    only on Android) lays Android's wording over every string that names
    the iPhone, iOS, iCloud, Face ID or Touch ID, in all 14 languages
    (`setPlatformStrings`). **A new string that names an Apple thing needs
    its Android twin there** — `android.test.ts` fails otherwise.
  - *Native:* `SpartopfSharedPlugin.java` answers the same bridge as the
    Swift plugin: `open`, `system`, `makePdf` (the print dialog), and
    `setSecure` (FLAG_SECURE while the lock is on, re-applied by
    `MainActivity` at a cold start); the snapshot, inbox and Siri calls are
    no-ops until plan 24.
  - *Lock:* fingerprint maps to the `touchId` kind, face / iris to `faceId`.
  - *Look:* amounts in bundled Nunito (`html[data-platform="android"]`,
    `assets/fonts/`); no iOS edge swipe; the system back closes the topmost
    sheet or menu first, then pops, then leaves.
  - *No Google services*, no exact alarms, portrait only. Version name and
    code come from `package.json` (`android/app/build.gradle`).
  - `localStorage['spartopf-dev-platform'] = 'android'` (dev only) gives the
    browser Android's wording and face: `ui-review.mjs --devices pixel,android360`.
- **Tips (plan 37, `src/tips.ts`, pure and tested).** `nextTip(data, state,
  ctx)` gives at most one tip — capture, favourite, reserve, budget, backup,
  in that order — shown as `HintCard` in the month page's setup slot, only on
  the running month and after the setup and gestures cards. Closing or using
  it puts it in `store.tipState.done` for good (a device pref) and starts a
  seven-day pause. A new feature gets a tip here rather than anything on the
  first screens; `plans/37-simplicity-review.md` has the table of where each
  feature first appears and the first-viewport counts to compare with.
- **Automatic capture (plan 19, iPhone).** Two more App Intents in
  `SpartopfIntents.swift` for Shortcuts automations — `LogPaymentIntent`
  (the *Transaction* trigger: merchant, amount, card) and
  `LogNotificationIntent` (iOS 27's *Notification* trigger: title, subtitle,
  text). Both take plain text and only leave an inbox item (`source:
  'wallet' | 'notification'`, the text in `text`, lines kept apart).
  `parseNotificationText` (statementImport.ts, tested in
  `notification.test.ts` with made-up samples only) reads the amount (the
  first with a currency that isn't a balance), the payee and whether money
  came in; the text is never stored. `inboxToEntries(…, { hold })`: with
  *Erst prüfen* (`store.captureReview`, a device pref) the `CAPTURE_SOURCES`
  stay in the inbox, App shows *Neu: n* on the running month, and
  `inboxReview` opens them in `StatementImportSheet` (`source: 'inbox'`);
  confirmed, they leave the inbox. `CaptureView` (*Optionen › Automatisch
  erfassen*, native only) is the guide and the mode switch. The share
  extension (*Teilen an Spartopf*) needs its own Xcode target — not built.
- **Month from payday (plan 32, `src/period.test.ts`).** `AppData.monthStart`
  (2–28; absent = the 1st, schema 23) is the day the book's month begins. A
  month is then a *period*: with the 25th, "2026-11" runs 25 Oct – 24 Nov — a
  start up to the 15th names the period after the month it starts in, a later
  one after the next. Dates stay the truth: `Entry.month` is
  `periodOf(entry.date)`, and entries without a date stay where they are. The
  day lives in logic.ts as a module-level switch like the currency
  (`setMonthStart`, set by the store before anything computes), so **never do
  calendar maths on a month key**: use `periodOf`, `periodRange` (first/last
  day, days), `dayIndex`/`dateAt` (n-th day of the month), `dayOfMonth(today)`,
  `daysInMonth` and `dayInMonth` (all period-aware); `dayInCalendarMonth` is
  the calendar one (contract dates). `changeMonthStart(data, day)` moves every
  dated entry to its new month, keeps each account's balance from every month
  on where it was (manual openings are adjusted by what crossed them), drops
  months it emptied, and says how many entries moved — the sheet's preview
  (`MonthStartSheet`, *Optionen › Haushaltsbuch › Monat beginnt am*); the
  change is undone as a whole (`store.changeStart` returns the book before).
  The month title's subline shows the dates while the start isn't the 1st.
  Siri's `amounts.json` carries `until`, the period's last day.
- **Debts and loans (plan 31, `src/insights/debts.ts`, pure and tested).**
  `Debt { name, direction: 'owe' | 'owed', principal, start, rate?, payment?,
  seriesId? }` in `AppData.debts` (schema 21). What is paid back comes from the
  book (`debtPayments`): the paid entries of the linked monthly series and any
  paid entry carrying `Entry.debtId` (the entry sheet's pill, shown once a debt
  exists — an extra payment, money a friend paid back), from `start` on.
  `debtSchedule` runs the months as they went (interest from the month after
  `start`, monthly compounding, rounded to the cent, then the month's
  payments), then projects the monthly payment (`payment`, else the series'
  latest amount; this month's if none was made yet) until nothing is left:
  `left`, `paid`, `interestPaid`, `interestLeft`, `payoff`, `never` (the
  payment doesn't cover the interest). `annuityPayment` is checked against the
  published tables. *Optionen › Schulden und Kredite* (`DebtsView`, the way in
  for the first one), `DebtSheet`, and Planen's `DebtsCard`, which exists only
  once there is a debt. Deleting a debt keeps its entries and drops the link
  (undoable).
- **Money is integer cents** everywhere (`Entry.amount`). Convert only at the
  edges: `parseAmount()` for input, `formatMoney()` for display.
- **Refunds (schema 26).** `Entry.refund` marks money back in an expense
  category; its `amount` is then **negative** — the one case — so every sum
  over a category, a month or a budget goes down by it without knowing about
  refunds, and the account goes up. Hence: sum amounts as they are, never
  `Math.abs` them in a total; where one entry's amount is *shown*, a refund
  reads "+12,50 €" in `text-pos` with *erwartet / erhalten* (`CategorySection`,
  `DueSoonRail`); the entry sheet types it positive and negates on save.
  `normalizeEntry` keeps a minus sign only with the flag, and `normalizeState`
  turns a refund in an income category into plain income. Bank import: money
  in from a payee known under an expense category stays there and
  `applyStatement(…, categories)` books it as a refund; matching compares
  `Math.abs(amount)` with income-or-refund. Refunds are left out of name
  suggestions' "last amount", favourites and splits.
- **Currency (plan 07, `src/currency.ts`).** `AppData.currency` (ISO 4217,
  schema 11, optional, unset = EUR, in backups). Only two-minor-digit currencies
  are offered (`CURRENCIES`). `logic.ts` holds a module-level active currency
  (`setActiveCurrency`, set by the store from the book); every money formatter
  reads it, so there's no call-site churn — tests set it explicitly. A new book
  picks the currency from the region (`currencyForLocale`); changing it in
  *Darstellung → Währung* only relabels, never converts. CSV export appends a
  `Währung` column; a bank CSV row in another currency shows "andere Währung"
  and starts unticked.
- **Hidden amounts (plan 06).** *Beträge verbergen* (view preference
  `spartopf-hide-amounts`, kept by *Alle Daten löschen*) works like the
  currency: one module-level switch in `logic.ts` (`setAmountsHidden`, set by
  App on every render before its screens) makes every money formatter —
  `formatMoney*`, `compactMoney`, the charts' `savedLabel` — write the locale's
  layout with "••••" for the figure and no sign ("•••• €", "€••••"). So a new
  screen hides its amounts by itself, as long as money goes through those
  formatters: never format cents with a bare `Intl.NumberFormat`. Shown anyway,
  through `withAmounts(() => …)`: what is being typed (the calculator's "=",
  a split's remainder, a reconcile difference), reminders with their own
  amounts switch on, the year picture shared with amounts. Fields being typed
  into, CSV and backups never go through the formatters. VoiceOver labels and
  `sr-only` twins wrap the amount in `spoken(text, t.amountHidden)` ("Betrag
  verborgen"). The eye on the balance card shows them for 30 s (`PEEK_MS`) or
  until the app leaves the screen; with hiding on, the app-switcher cover
  shows too. Percentages, counts and a "+" set by hand stay.
- **Months are `YYYY-MM` strings** (`MonthKey`); use `addMonths()` /
  `monthKeyOf()` from `logic.ts`, never `Date` arithmetic in components.
- **Default categories** live in `src/data/defaults.ts` (names in every
  language, emoji, hue, default repeat, name suggestions). Add there, not in
  components.
- Data from storage or a backup goes through `normalizeState()` first. Add new
  fields as optional; bump `SCHEMA_VERSION` and migrate in `normalizeState`
  when a shape changes.
- IDs are generated with `uid()` from `logic.ts` by callers, never by the store.
- **Test data** (*Optionen → Ausprobieren*, `src/demo.ts`, tested in
  `demo.test.ts`): `addDemoData(data, { today, language })` puts a realistic
  year — twelve finished months and the running one, paid up to today, the
  rest open, one bill overdue — beside the user's own data, never instead of
  it; `removeDemoData` takes exactly it out again. Everything it adds carries
  the `demo-` prefix (entries by `seriesId`, so copies carried into a later
  month go too; favourites, goals and contract keys by id), and `AppData.demo`
  (schema 17) records the rest: the months it started (they go unless the user
  put entries in one), the first month's opening, the budgets it set on
  categories without one (cleared only while unchanged) and the built-ins it
  brought back. Seeded per month, so the same day gives the same data. Adding
  is undoable; removing asks first and is undoable. Its names are German
  when the app is in German and English in every other language.
- Destructive actions are **undoable** (toast with *Rückgängig*); a `Confirm`
  dialog only where undo is impossible (delete all data, import a backup) or
  where a lot goes at once (a category with entries).

## i18n
- **Fourteen languages** (plan 25): `de`, `en`, `ar` in `src/translations.ts`
  (main bundle; `en` is the fallback), and `tr`, `pl`, `cs`, `sv`, `nb`, `da`,
  `fr`, `it`, `es`, `nl`, `pt` each in `src/i18n/xx.ts`, loaded on demand
  (`loadLanguage`, one ~15 kB chunk each) — the main bundle carries none of
  them. `languages` is the picker's order (by own name, Arabic last) and
  `LANGUAGE_NAMES` its labels. main.tsx loads the first language before the
  first render; `store.setLanguage` loads before it switches. Read strings
  with `stringsFor(lang)` where a language may not be loaded (English then).
  Default `de`; first run follows the device's preferred languages
  (`languageForTag`: nb/no/nn → `nb`, pt-BR → `pt`). The iOS Info.plist lists
  them all in `CFBundleLocalizations` (App Store languages, per-app language).
- **Permission prompts** (plan 16). The English text is in `Info.plist`; every
  language, English included, has it in `ios/App/App/<lang>.lproj/InfoPlist.strings`.
  A new `NS…UsageDescription` key goes into Info.plist and all fourteen files,
  and the review note and privacy policy (`store/`) say what it is for.
- **Adding a language** (`src/translations.test.ts` checks most of it):
  1. `src/i18n/xx.ts`: every key (the `Strings` type enforces it), the same
     placeholders as German, `locale`, `dir`, a 10-column `csvHeader`, and
     `suggestionNames` (the entry sheet's suggestions, keyed by the German
     one in `NAME_SUGGESTIONS`). Keep “Before” in `excelHint`/`excelOpening`:
     it is the row the Excel import reads.
  2. A loader in `translations.ts`, the code in `languages` and
     `LANGUAGE_NAMES`, and in Info.plist's `CFBundleLocalizations`.
     The permission prompts: `ios/App/App/xx.lproj/InfoPlist.strings` with
     every `NS…UsageDescription` key, added to the `InfoPlist.strings`
     variant group and to `knownRegions` in `project.pbxproj`.
  3. Category names in `src/data/names.ts`, plus a schema bump so built-ins
     still named as shipped get them (`upgradeCategories`, as schema 19 did) —
     no category's name may equal another's in any language (keyword index).
  4. Tab labels at most ~11 letters (they truncate on an iPhone SE). Run
     ui-review on `se` in the language; a native speaker reviews before release.
- **Plurals:** `plural()` picks between two forms. Where a language has more
  (Polish, Czech: 1 / 2–4 / 5+), the count goes after a colon or beside an
  abbreviation ("Pozycje: 5", "3 mies."), as in Arabic. A `…One` string may
  still use `{n}`.
- **Month names** are lower case in most languages ("listopad 2026");
  `fmt()` capitalises a string that opens with `{month}`/`{since}`/`{span}`/
  `{from}`, and titles go through `capitalize()`.
- **Search** folds ı→i, ø→o, æ→ae, œ→oe, ł→l, đ→d besides accents
  (`foldChar`); **amounts** read with the locale's decimal mark
  (`decimalMark`: a lone dot groups thousands in tr/it/es/nl/pt/da, as in
  German; fr/pl/cs/sv/nb group with spaces).
- **Arabic is right to left.** `store.ts` sets `<html dir lang>`; write layout
  with logical classes only (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`,
  `text-start`/`text-end`, `rtl:rotate-180` on chevrons) — never `left`/`right`.
  Amounts stay left to right: `num` / `rounded-num` force `direction: ltr`, so
  put them only on pure amounts; text that contains words gets `tabular-nums`
  instead, or an Arabic word reads backwards. The scrolling charts are
  `dir="ltr"` (time runs left to right). Arabic uses Western digits
  (`ar-u-nu-latn`); input goes through `normalizeDigits()` so ٤٥٫١٢ from an
  Arabic keyboard reads as 45.12. Arabic strings avoid count-dependent plurals
  ("البنود: {n}"). No letter-spacing on Arabic (index.css resets it).
- Access via `const t = stringsFor(language)`. Never inline
  `language === 'de' ? …`.
- Built-in categories carry a name per language (`names`); user-created ones
  carry only the name typed, and `displayName()` falls back sensibly.
- Money and dates are formatted with `t.locale` (`de-DE` → `1.050,00 €`).
- Long German compounds get `wrap-compound`, never `truncate`.

## Styling — native iOS, vivid
- The look is today's iOS: grouped grey background with white cards (black
  with graphite cards at night), large titles, a floating capsule tab bar,
  round floating nav buttons, swipe actions — with colour from two sources:
  the user's **accent** and each category's **hue**. Read the `apple-design`
  skill before changing interaction or motion.
- Tailwind utilities inline. **All colours come from tokens in
  `src/index.css`** — never a literal hex in a component (`text-on-color` is
  the white ink on saturated fills).
- Surfaces `bg-bg` / `bg-surface` / `bg-surface-2`, text `text-fg` /
  `text-fg-mute` / `text-fg-faint`, action `text-accent` / `bg-accent-fill`
  + `text-accent-fill-ink`. Cards are `rounded-md bg-surface card-edge` — no
  border, no shadow. Floating chrome (tab bar, nav buttons) is `float-chrome`.
- **Accent** = `data-accent` on `<html>` (store `accent`, key
  `spartopf-accent`, a view preference — not in backups; picked in Optionen →
  Darstellung → Farbe). Eight in `ACCENTS` (`types.ts`); each `[data-accent]`
  block in index.css sets `--acc-l` (day) / `--acc-d` + `--acc-ink-d` (night)
  and three gradient stops `--hero-1..3`. The theme blocks map `--t-accent*`
  and `--t-chart-line` onto them. After touching any colour, run
  `npm run audit:contrast` (`scripts/contrast-audit.mjs`): every accent ×
  theme, the hero and its panel, the paid ticks — it must pass.
- **The hero** (`hero` + `hero-glow`): the accent's gradient with a sheen and a
  glow of its own colour. It carries the balance card, the statistics' month
  summary, the add button and primary `Button`s. Ink on it: `text-on-hero`,
  `text-on-hero-mute` (captions on the gradient); on its frosted `hero-panel`
  also `text-on-hero-soft` / `-pos` / `-warn` / `-neg` — those four only on the
  panel. Never `text-pos` / `text-neg` / `text-fg` on the hero.
- The page top is lit in the accent (`accent-wash`, in `Screen`) only while the
  page rests at the top; the bar is see-through there and turns solid as the
  wash fades — keep the two in step, or a seam shows.
- Type is Apple's system font: `display` for titles (large title
  `text-title`, sections `text-title2`, card headings `text-heading
  font-semibold`); `rounded-num` (SF Rounded, tabular) for money read at a
  glance — the balance, category totals, the amount being typed, key figures
  in the statistics. `eyebrow` is a sentence-case caption, not uppercase.
- Rows: status in words in the grey detail line (*offen*, *erwartet*,
  *überfällig*), never pill badges; open amounts `text-fg-mute`, like a pending
  card payment. Swipe actions come from `ui/SwipeRow` (touch only — the mouse
  drags to sort); everything a swipe does must also be reachable without it.
- Navigation: tapping the month's name opens `MonthPickerSheet`; ‹ › sit in
  one floating capsule. The add button lives in the tab bar (`TabBar add`).
- Money colours mean one thing each: `text-pos` income / plus, `text-neg`
  a negative balance or overdue, `text-warn` (+ `bg-warn-dim`) *open*. Expenses
  themselves are plain `text-fg` — a bill is not an error.
- A category's colour: `data-hue={category.hue}` on an element, then paint
  with `bg-hue-bg` / `text-hue-ink`. Its hue is identity — the emoji tile, the
  bar under the category's name (paid so far; with a budget, paid + open
  against the budget, red when over, a tick for today — `BudgetBar`) and the paid ticks
  (`bg-hue-chart` + `text-chart-label`), the bars in the statistics; cards stay
  `bg-surface` + `card-edge`.
- Motion: big money runs to a new value (`useCountUp` / `ui/CountingMoney`,
  with the final amount in an `sr-only` twin); a month's cards come in with
  `stagger` / `rise` (`ui/stagger.ts`), keyed by month — the balance card
  stays outside so its numbers run between months. All of it collapses
  under reduced motion.
- Amounts use the `num` utility (tabular, LTR); big amounts the `display` face.
- Type scale in rem (follows Dynamic Type); touch targets in px
  (`min-h-control`, `h-tap`, `w-tap`).
- Emoji always through the `emoji` utility (or `ui/Picture`).
- No `hover:` styles (sticky on touch). `backdrop-filter` only on floating
  chrome — the tab bar, round bar buttons, sheet toolbar buttons, menus —
  through `glass-chrome` / `glass-menu` (a static blur with solid fallbacks
  for Reduce Transparency, Increase Contrast and no support); never on
  scrolling content, cards or sheet bodies, never animated. A gradient fade
  (`edge-fade-top` / `edge-fade-bottom`) stands in for iOS's blurred scroll
  edges; no `filter: blur` on scrolling content.
- Layout margins are physical (`px-[16px]`, `gap-[12px]` in `Screen`, `Row`,
  `Card`, the tab bar): iOS keeps its margins when text grows, so at 200 %
  the words get the room. Type and vertical padding stay in rem.
- Anything fixed to the bottom pads with `safe-bottom`; the tab bar is fixed,
  so tab screens use `<Screen tabbed>`.

## Native iOS
- The app uses the **UIScene lifecycle** (`ios/App/App/SceneDelegate.swift` +
  `UIApplicationSceneManifest` in `Info.plist` + the scene hook in
  `AppDelegate.swift`), copied from shopping-list. Built with the iOS 27 SDK,
  an app without it is killed at launch. Never remove it; `scripts/release.js`
  refuses to ship without it.
- Keep `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` and
  `@capacitor/cli` on the same version, ≥ 8.5.
- Native plugins are pinned to an exact version. After adding one, run
  `npx cap update ios` (it rewrites `ios/App/CapApp-SPM/Package.swift`; works
  on Windows too) and commit that file.
  - **Reminders:** `@capacitor/local-notifications` (official, MIT).
    `src/reminders.ts` plans (pure, tested), `src/notify.ts` swaps what is
    pending for the plan. Every pending notification is a reminder: syncing
    cancels them all first. Texts carry no amounts unless the user turns them on.
    The daily nudge (`nudgePlan`, `prefs.nudge` / `nudgeTime`) is planned
    `NUDGE_DAYS` ahead beside the sources and independent of `prefs.on`;
    today's goes once an entry of the user's own (`seriesId === id`) was
    made today. The in-app budget note is `budgetCrossing` (budgets.ts) +
    `budgetNote` in App, behind the view preference `spartopf-budget-notes`.
  - **Face ID lock:** `@aparajita/capacitor-biometric-auth` (MIT), chosen over
    `@capgo/capacitor-native-biometric` (MPL-2.0): its iOS side is one small
    file using only LocalAuthentication (`.deviceOwnerAuthentication` with
    `allowDeviceCredential`, so the passcode is the fallback), no network, and
    it checks `NSFaceIDUsageDescription` instead of crashing. The capgo plugin
    also stores credentials in the Keychain, which the app doesn't need. Its
    drawbacks: one maintainer, and it lists the Capacitor packages as
    dependencies, not peers (it pulls in `@capacitor/android`). `src/lock.ts`
    wraps it; `Info.plist` has `NSFaceIDUsageDescription`.
  - While locked, `App` renders only `LockScreen` — no amount in the DOM.
    Away more than a minute locks again; while inactive, a plain cover hides
    the app from the app-switcher snapshot (also with *Beträge verbergen* on,
    plan 06 — a cover rather than a blur).
  - **Data Protection (plan 06):** `ios/App/App/App.entitlements`
    (`CODE_SIGN_ENTITLEMENTS`, both configurations) sets
    `com.apple.developer.default-data-protection` to `NSFileProtectionComplete`:
    the book can't be read while the phone is locked. `AppDelegate`'s
    `protectBookFiles()` brings files written before that up to the same class
    at launch, and a debug build logs each file's class — the device check.
    The saver flushes on background, before the phone locks; a write that
    still fails is retried on resume. App Group files for widgets (plan 14)
    use `completeUntilFirstUserAuthentication`, written by our own Swift.
  - **The native bridge (plan 14).** `SceneDelegate` makes
    `MainViewController` (a `CAPBridgeViewController`, in
    `ios/App/App/SpartopfShared.swift`) the root; its `capacitorDidLoad()`
    registers our own plugin `SpartopfShared` — our code, not a third party's,
    as it handles financial data. It shares the App Group
    `group.com.habboubah.spartopf` (`App.entitlements`; every extension gets
    it too) with widgets and intents: `snapshot.json` (written
    atomically, then `WidgetCenter.reloadAllTimelines()`) and `inbox/<id>.json`
    (one file per item, so writers never race), both
    `completeUntilFirstUserAuthentication`, size-capped, JSON passed through as
    text. Methods: `writeSnapshot`, `readSnapshot` (debug), `readInbox` →
    `{ id, json }[]`, `removeInbox`, `clear` (registered with `onWipe`).
    Plan 15 added `requestReview` (StoreKit's `AppStore.requestReview(in:)`,
    `SKStoreReviewController` before iOS 16), `open` (hands a link to iOS —
    https to `apps.apple.com` / `habboubah.github.io` and mailto: only) and
    `system` (the iOS version for the feedback mail); plan 18 `writeAmounts` /
    `removeAmounts` (below); plan 28 added `makePdf`
    (the page as printed, via `UIPrintPageRenderer` on A4 with 40 pt margins,
    into a temporary PDF offered in the share sheet and deleted after).
  - **Siri and Shortcuts (plan 18, `ios/App/App/SpartopfIntents.swift`).** App
    Intents in the app target (iOS 16+; the app still runs on 15), listed by
    `SpartopfShortcuts` with phrases in English (code) and German / Arabic
    (`de.lproj` / `ar.lproj` `AppShortcuts.strings`; titles and answers in
    `Localizable.strings`, the English text as key). *Eintrag hinzufügen*
    (`AddEntryIntent`: amount, name, `CategoryEntity` from the snapshot's
    categories, date, paid) writes an inbox item with `source: "siri"` — booked
    by the app at launch or on resume like any inbox item; the book's currency
    wins over the one said. *Was bleibt am Monatsende?* and *Offene Rechnungen*
    read `amounts.json` (`buildAmounts` in `snapshot.ts`: the main account's two
    balances, the next open bills with amounts, how many are open) — class
    Complete, written with the snapshot only while the app lock is off (removed
    otherwise), and only for the running month; both have
    `authenticationPolicy = .requiresAuthentication`. Without it they answer
    "Öffne Spartopf". A new phrase or answer goes into both `.strings` files.
  - **PDF report (plan 28).** *Bericht teilen* under the Monatsbericht and the
    Jahresrückblick opens `ReportPdfSheet` (one switch: every entry or not).
    `PrintReport` draws the report a second time, as a portal on `<body>`
    with `data-theme="light"`: `MonthReportBody` / `YearReviewBody` (the
    screens and the print share them), an entries table, a footer. The print
    stylesheet (index.css, end) shows only `.print-root`, hides its buttons and
    switches, prints its backgrounds (the hero, the bars) and keeps sections
    whole. Tailwind resolves the `--color-*` tokens at the root, so
    `.print-root` declares them again (`index.test.ts` keeps the list in step
    with `@theme`). The PDF always has its amounts: an `AmountsShown` pair
    around the print copy lifts *Beträge verbergen* for it alone. Web:
    `window.print()`.
  - **Ratings and feedback (plan 15).** *Optionen › Über Spartopf*: *Spartopf
    bewerten* (iPhone app only; `REVIEW_URL` with `APP_STORE_ID`),
    *Feedback senden* (Mail with the app's and the system's version, nothing
    else — `feedbackMail`), *Datenschutz* (`privacyUrl`: German, else
    English) — all in `src/links.ts`, written out whole because the privacy
    check reads the bundle's URLs as text (and allows these two). Apple's own
    prompt follows a local rule, `shouldAskForReview` (logic.ts, tested):
    14 days since `spartopf-first-use`, 30 entries of one's own (test data
    left out), a good moment (`monthSaved`: the report of the month just
    closed, which saved money; `goalReached`: a savings pot reaching its
    target; `bigImport`: 10 or more entries imported), no trouble this session
    (an error, a failed import, or any *Rückgängig* — App's `show` marks it),
    and 120 days since `spartopf-review-asked`. No dialog of our own.
    The web side is `src/native/`: `bridge.ts` (typed calls, no-ops on the web,
    failures let go) and three pure, tested functions (`native.test.ts`):
    - `buildSnapshot(data, prefs, today)` — month, the paid ring's counts, the
      next three open bills, favourites (`hasAmount`), categories named in the
      app's language, currency, locale, accent, `locked`. With
      `showAmounts` off it has **no amount field at all** (`balance`,
      `amount` left out — not zeros). App passes `false` (there is no
      switch for it), and must keep passing `false` while *Beträge verbergen*
      is on.
    - `inboxToEntries(raw, data)` — checks every field (`readInboxItem`:
      source list, integer cents ≤ `MAX_CENTS`, ids `[A-Za-z0-9_-]{1,64}`, ISO
      dates), then books through `planStatement`/`applyStatement` (the
      user's names, rules, an open entry ticked off instead of doubled); a
      chosen category wins; `favoriteId` takes the favourite's name, category
      and amount (so the snapshot needn't carry amounts); `paid: false` stays
      open; at most `INBOX_MAX` per read. Each entry gets `ref: "inbox:<id>"`,
      so an item read twice is "already there". Text-only items (a
      notification) wait in the inbox for plan 19's parser.
    - `parseDeepLink(url)` — `spartopf://add?category=&amount=&name=`,
      `spartopf://month/YYYY-MM`, `spartopf://entry/<id>`; anything else is
      null, unknown parameters are ignored. Any app can open these, so none
      saves anything: "add" only fills the entry sheet.
    App writes the snapshot after every change (debounced like the save), on
    resume and at midnight; reads the inbox at launch and on resume once
    unlocked (one undo toast; items leave the inbox after `saver.flush()`);
    handles `appUrlOpen` (a cold start's link is kept by the App plugin until
    the listener is there), holding a link while locked. URL scheme in
    `Info.plist` (`CFBundleURLTypes`). Debug: *Widget-Daten testen* in
    *Sichern und übertragen* round-trips the snapshot.
  - `localStorage['spartopf-dev-native'] = '1'` shows these settings in a dev
    build on the web (for screenshots); nothing is scheduled or locked there.

## Accessibility
- Text 4.5:1, icons 3:1. `text-fg-faint` only for placeholders.
- Every icon button has a label naming its row: `${t.markPaid} — ${name}`.
- An amount in a label or `sr-only` text goes through `spoken()`, so it is read
  as "Betrag verborgen" while amounts are hidden (plan 06).
- The paid toggle is a real checkbox for VoiceOver (`role="checkbox"`,
  `aria-checked`), never colour alone: open entries also say *offen*.
- Pinch-zoom stays enabled. Motion respects reduced motion (`MotionConfig`).

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:3002 |
| Type-check | `npm run lint` |
| Unit tests | `npm test` |
| **All the gates** (before a release, in CI) | `npm run check` |
| Privacy check / performance budgets alone | `npm run check:privacy` / `npm run check:perf` |
| Re-record the golden year (a money rule changed on purpose) | `npx vitest run src/golden.test.ts -u` |
| Web build | `npm run build:web` |
| Build + open Xcode | `npm run build:ios` |
| Regenerate icons/splash | `npm run assets:generate` |
| App Store screenshots (DE + EN, 1290×2796) | `npm run screenshots` |
| Upload to App Store Connect / TestFlight | `npm run release` (first time: `npm run release:first`; preview: `npm run release:dry`) |
| App Review screen recording: check the scenes against the code / record on the connected iPhone | `npm run rehearse:app-review` / `npm run record:app-review` (`ios/AppReviewRecorder/README.md`) |

A change to a screen, a label or a flow that the App Review recording passes
through means a change to `ios/AppReviewRecorder/scenes.json`; run
`npm run rehearse:app-review` after it.

## Releasing (only when explicitly asked)
Same pipeline as pizza-driver-log and shopping-list: `scripts/release.js`
gates on `npm run check`, bumps `package.json` and the Xcode project's
`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` together, builds,
`cap sync ios`, archives and uploads via `ios/App/ExportOptions.plist`, then
commits and tags. Credentials live in the gitignored `.env.release` — never
print or commit them. Submitting for review is manual. Full checklist:
`APP_STORE_RELEASE.md`; skill: `.claude/skills/app-store-release`.

## Before calling a change done
1. `npm run check` — it runs, in order:
   - `lint`;
   - `check:security` (`scripts/no-console.mjs` + `npm audit --omit=dev
     --audit-level=high`): no `console.*` in app source, no known high
     vulnerability in a shipped dependency;
   - `test`, which includes `compat.test.ts` (what every older
     version stored or backed up still loads, with the same balances) and
     `golden.test.ts` (a frozen demo year against `fixtures/golden.json`: the
     balances, per day, budgets, savings rate, 50/30/20, contracts, reminders);
   - `vite build`;
   - `check:privacy` (`scripts/privacy-check.mjs`): drives the built app in
     Chromium — first run, an entry, every tab, a bank CSV, an OCR read, a
     backup — and fails on any request to another origin; every URL in
     `dist/` must be on its allowlist, with the reason it is harmless;
   - `check:perf` (`scripts/perf-check.mjs`): no long task while typing an
     amount, a month switch painted within 150 ms, the main bundle at most
     10 % over its recorded gzip size (raise the baseline only with a note in
     the plan that grew it);
   - `audit:contrast`.
   A money rule changed on purpose: re-record the golden year and say why in
   the commit. A new schema version: add its `storage-v*.json` fixture.
2. `npm run dev` and exercise the change at iPhone width (375–430px) and on desktop.
3. If a screen changed: `node scripts/ui-review.mjs` before and after.

## Commit style
Short, imperative, feature-focused summaries, no conventional-commit prefixes
(same as pizza-driver-log and shopping-list).
