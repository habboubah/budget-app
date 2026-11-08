# CLAUDE.md

Steering file for AI assistants working in this repository. See `PLAN.md` for
the product concept and the money rules, `README.md` for running and installing,
`STATISTICS_AND_INSIGHTS.md` for what Statistik and Planen show, and why.

## What this app is
Spartopf: a client-only React + Capacitor household budget book, modelled on
Ahmad's monthly Excel sheet. One month per page, entries per category, each
entry paid or still open, recurring entries carried into the next month, and
two balances: *Jetzt auf dem Konto* and *Am Monatsende*. One bank account.
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
  - **The localStorage mirror** (`spartopf-categories` etc.) is written with
    every save for two releases as the way back: the release after 1.4 removes
    it (and its read in `hydrate()`); until then it is also how an install from
    before plan 02 moves over on its first launch.
  - Web / PWA: localStorage is the store, plus `navigator.storage.persist()`.
  - **Automatic snapshots (plan 03, iPhone only).** `Library/spartopf/backups/`
    holds one snapshot a day (`YYYY-MM-DD.json`, the same envelope). The saver
    writes one on the first save of a day and on resume; `snapshotsToKeep()`
    (pure, tested) keeps the last 14 days and the newest of each of the last
    12 months. *Automatische Sicherungen* (pushed under *Sichern und
    übertragen*, `BackupsView.tsx`) restores one with a preview and an undo,
    writing `pre-restore.json` first; the crash screen's *Letzte Sicherung
    wiederherstellen* calls `restoreLatestToData()`. The last-export date
    (`spartopf-last-export`) drives a dismissable 90-day nudge card.
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
    reminders, lock) stay in localStorage in `store.ts`: losing them costs
    nothing, and a failed write of one doesn't raise the banner.
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
    undoable), then *Verlauf* with 6 / 12 / Alle (the range lives in App:
    the category screen follows it): the averages with ⓘ and "davon Ø …
    angelegt", income vs. spending (Angelegt in the tooltip), balance,
    *Wofür* (rows → `CategoryView`, payees → `PayeeSheet`), the table (an
    *Angelegt* column when any; a month → its report).
  - **`InsightsView`** (Planen, id `insights`): `PaceCard` (*November bis
    heute*), `BudgetsCard`, `OutlookCard` (from three finished months),
    `ContractsCard` (+ new subscriptions, missing payments with *Eintragen* —
    the entry sheet prefilled and open — and a price change's yearly effect),
    slots for plans 11 / 12 / 31, `FinanceCheckCard` (rows with details: the
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
  category; `set` reclassifies/renames, `skip` drops a transfer) — all optional,
  nothing to migrate, all in backups. What
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
  category, and picking one from elsewhere moves the entry there.
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
- **Money is integer cents** everywhere (`Entry.amount`). Convert only at the
  edges: `parseAmount()` for input, `formatMoney()` for display.
- **Currency (plan 07, `src/currency.ts`).** `AppData.currency` (ISO 4217,
  schema 11, optional, unset = EUR, in backups). Only two-minor-digit currencies
  are offered (`CURRENCIES`). `logic.ts` holds a module-level active currency
  (`setActiveCurrency`, set by the store from the book); every money formatter
  reads it, so there's no call-site churn — tests set it explicitly. A new book
  picks the currency from the region (`currencyForLocale`); changing it in
  *Darstellung → Währung* only relabels, never converts. CSV export appends a
  `Währung` column; a bank CSV row in another currency shows "andere Währung"
  and starts unticked.
- **Months are `YYYY-MM` strings** (`MonthKey`); use `addMonths()` /
  `monthKeyOf()` from `logic.ts`, never `Date` arithmetic in components.
- **Default categories** live in `src/data/defaults.ts` (names in every
  language, emoji, hue, default repeat, name suggestions). Add there, not in
  components.
- Data from storage or a backup goes through `normalizeState()` first. Add new
  fields as optional; bump `SCHEMA_VERSION` and migrate in `normalizeState`
  when a shape changes.
- IDs are generated with `uid()` from `logic.ts` by callers, never by the store.
- Destructive actions are **undoable** (toast with *Rückgängig*); a `Confirm`
  dialog only where undo is impossible (delete all data, import a backup) or
  where a lot goes at once (a category with entries).

## i18n
- `src/translations.ts`: one flat object per language (`de`, `en`, `ar`).
  Default `de`; first run follows the device language. Add every key to every
  block.
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
- Access via `const t = translations[language]`. Never inline
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
- Keep `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` on the same
  version, ≥ 8.5.
- Native plugins are pinned to an exact version. After adding one, run
  `npx cap update ios` (it rewrites `ios/App/CapApp-SPM/Package.swift`; works
  on Windows too) and commit that file.
  - **Reminders:** `@capacitor/local-notifications` (official, MIT).
    `src/reminders.ts` plans (pure, tested), `src/notify.ts` swaps what is
    pending for the plan. Every pending notification is a reminder: syncing
    cancels them all first. Texts carry no amounts unless the user turns them on.
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
    the app from the app-switcher snapshot.
  - `localStorage['spartopf-dev-native'] = '1'` shows these settings in a dev
    build on the web (for screenshots); nothing is scheduled or locked there.

## Accessibility
- Text 4.5:1, icons 3:1. `text-fg-faint` only for placeholders.
- Every icon button has a label naming its row: `${t.markPaid} — ${name}`.
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
