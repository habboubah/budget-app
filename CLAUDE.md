# CLAUDE.md

Steering file for AI assistants working in this repository. See `PLAN.md` for
the product concept and the money rules, `README.md` for running and installing.

## What this app is
Spartopf: a client-only React + Capacitor household budget book, modelled on
Ahmad's monthly Excel sheet. One month per page, entries per category, each
entry paid or still open, recurring entries carried into the next month, and
two balances: *Jetzt auf dem Konto* and *Am Monatsende*. One bank account.
**No backend, no account — everything is `localStorage`.**

## Stack
- React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `lucide-react`, `motion`.
- Capacitor 8 wraps `dist/` into the `ios/` native project. `vite-plugin-pwa`
  makes the web build installable and offline.
- npm only.

## Architecture rules (mirrors pizza-driver-log and shopping-list)
- **No router.** `App.tsx` holds the active tab plus one state per pushed
  screen. The `pushed` array is the nav's single source of truth (back
  gesture, scroll reset) and must match the render ternary.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`, mirrored to `localStorage` (`spartopf-*` keys) via
  `useEffect`. Immutable updates only.
- **Screens** live in `src/components/XxxView.tsx`; forms shown in a bottom
  sheet are `XxxSheet.tsx`. Named exports, `Props` interface above.
- **Shared primitives** live in `src/ui/` (`Screen`, `Sheet`, `Button`,
  `IconButton`, `Field`, `Segmented`, `Toast`, `TabBar`, `haptics`…).
  Compose them instead of hand-rolling markup.
- **Pure logic** goes in `src/logic.ts` (money, months, balances, carry-over,
  statistics, storage validation) and is tested in `src/logic.test.ts`.
  Components never do balance arithmetic themselves.
- **Excel import** is two layers: `src/xlsx.ts` unzips the file (fflate) and
  reads cell values with string matching — no spreadsheet library — and
  `src/excelImport.ts` plans the import as pure data (`planExcelImport`) that
  the preview sheet shows and `applyExcelImport` writes. Tests build their own
  .xlsx in memory; never commit a real one (it is someone's finances).
- **Statistics** beyond sums (savings rate, reserve, forecast, 50/30/20,
  commitments, unusual months, and the hints beside them — `biggestExpenses`,
  `newNames`, `missingRegulars`, `priceChanges`, `categoryTrends`; a hint card
  only shows when it has something to say) live in `src/insights.ts`, pure
  and tested.
  In the 50/30/20 split a category counts as `need`, `want` or `save`
  (`budgetOf`); `save` expenses stay in *saved*.
  Averages use *finished* months (`finishedMonths`), never the running one.
- **Charts** (`components/Charts.tsx`) follow the dataviz skill. Series
  colours are tokens: `chart-in` / `chart-out` / `chart-save` / `chart-line` / `chart-want`
  (saved columns stand above the zero line, an overspend hangs below it in
  `neg`),
  and per category `bg-hue-chart` / `fill-hue-chart` under `data-hue` — one
  OKLCH step per hue and theme (`--t-<hue>-chart`). The default categories'
  colours pass `validate_palette.js`; re-run it when changing them.
- **Categories per month:** `MonthRecord.categories` lists what a month
  shows; `monthCategories()` adds anything with entries, so money never
  vanishes. Unset (months from before, Excel imports) = the standard ones. New
  months take `standardCategoryIds()` (categories with `standard !== false`).
  Of the 20 built-ins seven are standard — the six from the Excel sheet plus
  `restaurants` (after `groceries`); the banking-app ones (`clothing` …
  `taxes`) ship with `standard: false` — keep it that way, or every month
  fills up with empty cards. Only an empty category can be taken
  out of a month (`canRemoveFromMonth`).
- **Schema 2** added those built-ins; **schema 3** gives built-ins still named
  as shipped their Arabic names; **schema 4** (`upgradeData`, `MERGED_V4` /
  `SHIPPED_V3`) folds "Wohnen und Garten" into `fixed` (now *Wohnen*) and the
  old "Sonstiges" into `extra` (now *Sonstiges*), entries and month lists
  included, and renames *Absicherung und Vorsorge* to *Versicherungen*;
  **schema 5** (`NEW_IN_V5`) adds *Restaurants* after the groceries — skipped
  if the user already has a category of that name — and into the running and
  later started months' lists; earlier months without a list get the old
  standard ones frozen in (`upgradeData(data, from, today)`); **schema 6**
  (`SHIPPED_V5`) gives *Einkommen* 💰 instead of 💶 where unchanged; **schema 7**
  dates entries that only had a due day, and adds the optional `Entry.ref`
  (an imported bank transaction's fingerprint). Ids
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
- **Entry sheet order:** date, then the name field (label hidden, focused
  first), its suggestions — three, the rest behind *Alle (n)* — then the
  category (three from `topCategories()`: same kind, this month's, most used,
  the chosen one always among them; every category behind *Alle (n)*), the
  amount, status, repeat, note. A new entry — income or expense — starts
  paid / received and once; a picked suggestion doesn't change that. A
  category's own `repeat` is no longer offered in the category sheet (the
  field stays in the data).
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
- **Money is integer cents** everywhere (`Entry.amount`). Convert only at the
  edges: `parseAmount()` for input, `formatMoney()` for display.
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
  `spartopf-accent`, a view preference — not in backups; picked in Settings →
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
  paid progress bar under the category's name and the paid ticks
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
- No `hover:` styles (sticky on touch), no `backdrop-filter` (a gradient
  fade — `edge-fade-top` / `edge-fade-bottom` — stands in for iOS's blurred
  scroll edges), no `filter: blur` on scrolling content.
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
| Web build | `npm run build:web` |
| Build + open Xcode | `npm run build:ios` |
| Regenerate icons/splash | `npm run assets:generate` |
| App Store screenshots (DE + EN, 1290×2796) | `npm run screenshots` |
| Upload to App Store Connect / TestFlight | `npm run release` (first time: `npm run release:first`; preview: `npm run release:dry`) |

## Releasing (only when explicitly asked)
Same pipeline as pizza-driver-log and shopping-list: `scripts/release.js`
gates on lint + tests, bumps `package.json` and the Xcode project's
`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` together, builds,
`cap sync ios`, archives and uploads via `ios/App/ExportOptions.plist`, then
commits and tags. Credentials live in the gitignored `.env.release` — never
print or commit them. Submitting for review is manual. Full checklist:
`APP_STORE_RELEASE.md`; skill: `.claude/skills/app-store-release`.

## Before calling a change done
1. `npm run lint` and `npm test`.
2. `npm run dev` and exercise the change at iPhone width (375–430px) and on desktop.
3. If the data shape changed: old `localStorage` payloads still load.
4. If a colour changed: `npm run audit:contrast`.

## Commit style
Short, imperative, feature-focused summaries, no conventional-commit prefixes
(same as pizza-driver-log and shopping-list).
