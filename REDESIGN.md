# Spartopf iPhone redesign — plan

Status: **approved; being built** — progress in §10 (steps 1–7 committed).
Scope picked at Checkpoint 1: redesign + features 1–7 below (web only, no Swift
of our own), the three new skills, the `.claude/settings.json` clean-up.

## 0. How this was made

- **Captures:** `node scripts/ui-review.mjs` (new). It starts Vite in-process,
  seeds six months of demo data, and opens 23 screens and sheets at iPhone SE
  (375 × 667), 16 (393 × 852), 17 Pro (402 × 874) and 17 Pro Max (440 × 956)
  with their real safe areas (Chrome DevTools Protocol), in DE and AR, light
  and dark. That's 368 captures, plus an automated audit (targets under 44 px,
  horizontal overflow, truncated text, text under 11 px), contact sheets and
  DOM snapshots. Output goes to `screenshots/ui-redesign/before/`, which is
  gitignored and takes about 4 minutes to regenerate.
- **Mockups:** `screenshots/ui-redesign/mockups/*.html` are written on the
  app's own compiled CSS (`app.css`, taken from the dev server) and its
  tokens. `node screenshots/ui-redesign/mockups/render.mjs` writes
  `after/*.png` and the before/after sheets in `compare/*.png`, at 393 × 852.
  They're throwaway review material; Step 4 rebuilds the approved parts in
  `src/`.
- **Skills used:**
  - `impeccable`: ios.md, audit.native, adapt.native, operate, critique
    heuristics.
  - `apple-design`: materials, gestures, the eight principles.
  - `web-interface-guidelines` (new): code pass.
  - `fixing-motion-performance` (new): motion code.
  - `roast-my-chart` (new): Statistik and Analyse charts.
  - `ui-ux-pro-max`: touch and accessibility checklists.
- **What I looked at:** contact sheets for 14 of the 23 screens (sizes and/or
  DE/AR × light/dark), full-page Statistik and Analyse, and the audit for 9
  screens in all 16 contexts. The rest are captured but I didn't inspect them
  one by one.
- **Not verified:**
  - Type. This machine renders Segoe UI instead of SF Pro / SF Rounded, so
    text widths are close to the iPhone's but not exact.
  - Anything that needs a device: the real keyboard, `backdrop-filter` cost
    in WKWebView, haptics, VoiceOver.
  - The 200 % text-size pass. That's in the last build step.

## 1. Verdict

**Keep:**
- The token system: no hex colours in components, no `hover:`, no physical
  `left`/`right`.
- RTL. Mirrored correctly everywhere: tab bar, back chevron, balance table,
  legend chips. Amounts stay LTR and charts run left to right.
- Safe areas, undo, VoiceOver labels on the paid toggle, Dynamic Type via
  rem, reduced motion, and a first-class dark mode.
- The audit found **no horizontal overflow, no truncated text and no text
  under 11 px** on any screen in any of the 16 contexts.

**What holds it back:**
1. **The first viewport is the balance card.** It shows 9 amounts in 317 px.
   On iPhone SE no entry is visible at all, because the first category header
   sits under the tab bar. The "paid" and "with open items" columns differ
   only by colour, since their headers are `sr-only` (WCAG 1.4.1).
2. **The entry sheet hides the amount behind the keyboard.** With the
   keyboard up, the amount (the one required field) and the status are below
   the fold on SE, 16 and 17 Pro, and only half visible on Pro Max. The top
   slot goes to a full-width date field that defaults to today.
3. **The chrome is a generation behind.**
   - Floating pieces are solid. iOS 26/27 draws its navigation layer in
     Liquid Glass.
   - Sheets use text buttons.
   - "⋯" opens a full sheet instead of a menu.
   - Pushed screens have no edge-swipe back.
4. **Touch targets under 44 px:**
   - Every segmented control (38): status, repeat, language, appearance,
     kind.
   - Name suggestions (36) and category chips (40).
   - The per-card "Nur offene" button (36 × 36).
   - The month title (40 high) and the carry-over chip (30).
   - Chart legend chips (36), Analyse month chips (32), category drag grips
     (36 wide).
5. **Statistik repeats itself and misleads a little.**
   - Income and expenses appear in three charts.
   - Amber "Gespart" looks like amber "offen".
   - Axes say "4k" in German and Arabic.
   - Its averages include the running month, while Analyse excludes it.
   - Analyse names November, which is still running, "Bester Monat".
6. **Optionen mixes three container styles,** and its title "Einstellungen"
   doesn't match the tab label "Optionen".

## 2. Problems per screen

| Screen | Problem | Evidence |
|---|---|---|
| Month | Hero card takes 37 % of the iPhone 16 viewport and ~48 % of SE's. 9 figures. Columns told apart by colour only. Ring count drops to 9–11 px fixed sizes. | `before/sheets/month-sizes.png`, `BalanceCard.tsx` (PaidRing `text-[9px]`) |
| Month | ‹ › ⋯ and search sit in the top 15 % of the screen. That's a stretch one-handed on 17 Pro Max (y ≈ 130–170 of 956). | `month-sizes.png` |
| Month | Each card header has a 36 × 36 filter icon plus a chevron; empty cards add a trash icon. Two empty categories take ~220 px at the end. | audit `month`, `month-end-variants.png` |
| Month | Carry-over chip is 30 px tall. The month title button is 40 px. | audit `month` |
| Entry sheet | With the keyboard up, amount and status are hidden (SE: even the category chips). After a name suggestion is picked, the amount is focused with `preventScroll`, so it may stay under the keyboard. Needs a device check. | `entry-new-kb-sizes.png`, `EntrySheet.tsx:201,225` |
| Entry sheet | 9 blocks stacked vertically, with segmented controls at 38 px. The amount input has `outline-none` and no focus style but the caret. | audit `entry-new`, `EntrySheet.tsx:309` |
| Month actions | A full bottom sheet for 6 actions; on iOS this is a pull-down menu. | `month-actions-sizes.png` |
| Search | Searches only the month shown, and nothing says so. | `search-variants.png` |
| Statistik | Same income/expense data in 3 charts. 3 series plus 36 category bars. Titles describe instead of saying something. Amber reused. Axes say "4k". Averages include November. | `stats-full.png`, roast below |
| Analyse | Opens on a static list (fixed costs). "Bester Monat" = the running month. Planning things (budgets, contracts) have no home. | `insights-sizes.png`, `insights-full.png` |
| Optionen | Segmented controls float on the background, colours sit in a card, rows sit in another card. Title ≠ tab label. | `settings-variants.png` |
| Kategorien | Every row has a grip, a switch and a trash icon, and the switch's meaning is only in the intro text. The switch duplicates the one in the category sheet. Grips are 36 wide. | `categories-variants.png`, audit `categories` |
| First run | A hero full of zeros, then 5 paragraphs of instructions; the action (starting balance) is at the end, behind the tab bar on SE and Pro Max. | `first-run-sizes.png` |
| All pushed screens | No interactive edge-swipe back (impeccable ios.md: "edge-swipe back stays alive"). | `App.tsx` (only the Android `backButton` listener) |

**Code pass** (web-interface-guidelines, fixing-motion-performance):
- `src/index.css:535` — body `overscroll-behavior-y: none`. Where WebKit
  applies it to the page, it switches off iOS's rubber-band bounce. Check on
  the device whether that's intended.
- `src/index.css` base — no `touch-action: manipulation` on buttons. Tapping
  › twice quickly can zoom the page, because pinch-zoom stays on (correctly).
- `src/components/CategorySection.tsx:205` — folding a card animates
  `height: auto` on the whole body, which reflows everything below it every
  frame. Use transform/opacity or FLIP. Row add/remove (`:96`) is small and
  fine.
- `src/ui/Screen.tsx:44` — the scroll listener only flips two booleans at
  thresholds, which is acceptable; an IntersectionObserver sentinel is
  cheaper.
- `src/ui/useEntryDrag.ts:69` — `getBoundingClientRect` in a loop during a
  drag. Check it for read/write interleaving when touching it.
- `src/components/OpeningSheet.tsx:59`, `CategorySheet.tsx:67` — `autoFocus`
  in sheets, although the `ui/Field.tsx:16` note says it scrolls the page
  behind. Verify on the device.

**Charts** (roast-my-chart, 61 caveats against Statistik and Analyse; flagged
are 🟠 hard to read, 🟡 polish):
- 🟠 *Too many colors kill the story.* "Kategorien pro Monat" shows 6 hues ×
  6 months.
- 🟠 *Keep colors consistent across charts.* Amber is "saved" here and "open"
  on the month page.
- 🟠 *Stacked/grouped charts are hard to read.* 3 bars per month.
- 🟡 *Make the title say something.*
- 🟡 *Declutter.* Two line charts repeat the bar chart.
- 🟡 *Round your numbers.* Axes should use locale formatting, not "4k".

What works: shared x-axis and month selection across charts, direct labels on
the last point, a legend toggle that rescales, a value table for every chart.

Couldn't check: colour-vision separation of the 13 category hues. The
`validate_palette.js` that CLAUDE.md cites isn't in the repo.

## 3. Design direction

**Same app, iOS 27 native.** Keep the identity: accent hero, category hues,
SF Rounded money, grouped cards, one month per page, open/paid. Change two
things: chrome moves to the current platform language, and the first viewport
shrinks to the answers people open the app for — *Kontostand jetzt*, *am
Monatsende*, *übrig*, *was kommt*.

Modern iOS elements to adopt:
1. **Liquid Glass floating layer** for the tab bar capsule, round nav buttons,
   sheet toolbar buttons and menus. Cards and lists stay solid, as Apple's HIG
   says ("don't use Liquid Glass in the content layer"). Needs a rule
   exception; see §6.
2. **Scroll edge effect:** keep today's gradient fade under the bar. It's
   already the soft-edge style without the blur.
3. **iOS 26 sheet toolbar:** round ✕ (glass) on the leading side, filled ✓ in
   the accent on the trailing side, title centred. VoiceOver keeps
   "Abbrechen" / "Sichern".
4. **Pull-down menus** from every "⋯": the month actions and a new per-card
   menu. Anchored, glass, 44 pt items, destructive item in red.
5. **Interactive edge-swipe back** on pushed screens: 1:1 tracking and
   velocity hand-off (apple-design §2, §5).
6. **44 pt segmented controls;** settings rows with native menus instead of
   segmented controls.
7. **Swipe the balance card** to change month, with a haptic tick, as in
   Calendar. ‹ › stay for accessibility. Not on the list, because rows already
   use horizontal swipe actions.
8. **Decimal pad first** in the entry sheet, with date, status and repeat as
   compact pills.
9. **Fallbacks:** `prefers-reduced-transparency` and `prefers-contrast: more`
   make glass solid.

Not adopting:
- iOS 26's search tab: the trailing circle stays the add button, the app's
  primary action.
- Widgets, Live Activities, Siri: they need Swift, which is out of this
  round's scope.

## 4. The proposal, screen by screen

Mockups are at 393 × 852, DE, with a status bar and Dynamic Island drawn on
both sides: `screenshots/ui-redesign/compare/*.png`.

### Month — `compare/month.png`, `month-budgets.png`, `month-dark.png`
- **Balance card v2:** big *Kontostand jetzt* plus the ring, then two frosted
  panels: *Am Monatsende* ("nach 6 offenen") and *Diesen Monat übrig*
  ("≈ 72 € pro Tag", feature 2). A full-width *Details* row holds the
  carry-over and the income/expense table, which expand inline; the
  opening-balance sheet opens from there. It's about 85 px shorter, and no
  column relies on colour alone.
- **Demnächst fällig** (feature 5): a rail of open entries in date order,
  overdue first. Each card opens the entry and can be ticked off. *Alle 6*
  pushes a *Demnächst* screen grouped by day, with next month's recurring
  entries as a preview.
- **Card header v2:**
  - Name and total on line 1, the bar, then a subline.
  - One 44 px "⋯" menu replaces the 36 px filter icon and the trash on empty
    cards. It holds *Nur offene*, *Einklappen*, *Budget…* and *Aus Monat
    entfernen*.
  - Tapping the header still folds the card.
- **Budget state** (feature 1):
  - The bar shows paid (solid) plus open (light) against the budget, with a
    tick for today's share of the month.
  - The subline reads "Budget 400 € · noch 212,88 €", or "50,04 € drüber" in
    `text-neg`.
  - Categories without a budget keep today's paid-of-total bar.
- **Empty categories** become one "Noch leer" chip row.
- **Search** across all months (feature 7), results grouped by month, this
  month first.
- **iPhone SE:** a compact hero variant so the first card clears the tab bar.
  Check at 375 × 667.

### Entry sheet — `compare/entry.png` (both sides with the keyboard up)
- Toolbar: ✕ · title · ✓.
- **Amount first** (focused, decimal pad). Then the name field and 3
  suggestions; a pick sets the category and, for recurring names, fills an
  empty amount, as today. Then the category chips. Last comes one row of
  pills: date ("Heute"), status ("Bezahlt"), repeat ("Einmalig"),
  "+ Notiz". Each pill opens a small menu or the native date picker.
- On iPhone 16 everything fits above the decimal pad. Verify on SE, where
  about 407 pt stay visible.
- This changes a CLAUDE.md rule (§6.2). PLAN.md originally had amount first.
  **Alternative:** keep the name focused first, with the amount directly
  under the suggestions and the same pills. That fixes the keyboard problem
  too.

### Statistik — `compare/stats.png`
- "6 Monate | 12 Monate | Alle" always shown as a segmented control.
- **Three numbers first:** Ø Einnahmen 3.798 €, Ø Ausgaben 2.557 €,
  Ø gespart +1.241 €. They come from finished months, the same rule Analyse
  uses.
- **One** in-vs-out chart with what was saved written above each month; the
  running month is hatched (income still expected). It replaces the bar chart
  and two line charts.
- **Titles that say something:** "Du sparst jeden Monat rund ein Drittel",
  "Dein Konto wächst: +6.672 € seit Juni".
- **Axes:** locale numbers ("4.000").
- **"Wofür das Geld geht":** one card with a *Kategorien | Empfänger*
  switch. It merges three cards: Ø per category, categories per month, and
  where the money went.
- The value table stays.

### Analyse → Planen — `compare/planen.png`
- The tab becomes **Planen** (piggy-bank icon). It opens on:
  - **Budgets** (feature 1): the month's budgets with "3 von 4 im Rahmen",
    "≈ 18 € pro Tag" per budget, and suggestions from the 3-month average.
  - **Abos & Verträge** (feature 6): fixed costs grown into a list with the
    next date, notice period, switch deadline ("Kfz-Versicherung wechselbar
    bis 30. Nov.") and price changes. *Alle 9* pushes a full screen.
- Then the existing hints and *Sparen und Reserve*, unchanged.
- **Fix:** best/weakest month only from finished months.
- Rule change in §6.3. **Alternative:** keep "Analyse" and just add the two
  cards at the top.

### Optionen — `compare/settings.png`
- Title = tab label.
- **Sicherheit und Mitteilungen:**
  - *Mit Face ID sperren* (feature 4).
  - *An offene Posten erinnern* (feature 3). It pushes a screen for time,
    lead time and "Beträge zeigen", which is off by default.
- **Darstellung:** *Sprache* and *Erscheinungsbild* as native menu rows;
  *Farbe* with the swatches inline.
- **Haushaltsbuch:**
  - *Kategorien und Budgets*.
  - *Sichern und übertragen*, which pushes backup, Excel and CSV.
- Then *Alle Daten löschen* and *Über*.

### Kategorien, menus, first run (no mockup)
- **Kategorien:**
  - Rows show emoji, name and a subline ("in jedem Monat · Budget 400 €").
  - *Bearbeiten* in the bar reveals grips and delete; swipe to delete with
    undo, as on the month page.
  - The standard switch lives only in the category sheet, which gets a
    budget field with "Vorschlag: 650 € (Ø 3 Monate)".
- **Month actions** become a menu. The month picker stays a sheet; its rich
  list works.
- **First run:**
  - Replace the hero of zeros and the 5 steps with a setup card: *Wie viel
    ist gerade auf deinem Konto?* (amount inline), then *Gehalt eintragen*,
    then *Feste Kosten eintragen*.
  - Excel import becomes a secondary link.
  - The tips move to one dismissible card (impeccable onboard: activation
    over explanation).

## 5. Mapping onto `src/ui` and tokens

| Element | Where | Change |
|---|---|---|
| Glass material | `src/index.css` | New utility `glass-chrome` plus tokens `--t-glass`, `--t-glass-rim`, `--t-glass-edge` per theme. It replaces `float-chrome` on floating chrome only. Solid fallback under `prefers-reduced-transparency`, `prefers-contrast: more` and `@supports not (backdrop-filter)`. The contrast audit gets a "glass over white / black content" case. |
| Tab bar | `ui/TabBar.tsx` | Glass; *Planen* tab with `PiggyBank`. |
| Screen shell | `ui/Screen.tsx` | Edge-swipe back for pushed screens (new `ui/useEdgeSwipeBack.ts`); IntersectionObserver sentinel instead of the scroll listener. |
| Menus | new `ui/Menu.tsx` | Popover anchored to its button, glass, `role="menu"`, roving focus, Escape, 44 pt items. Used by month actions and card "⋯". |
| Sheet toolbar | `ui/Sheet.tsx` | ✕ / ✓ icon buttons with the existing labels as `aria-label`. |
| Segmented | `ui/Field.tsx` | `min-h-control`-style 44 px. |
| Small chips | `src/index.css` | `hit-44` utility (a `::before` that extends the hit area) for suggestions, category, legend and month chips. |
| Balance card | `components/BalanceCard.tsx` | v2 layout; ring count from `text-caption` up, never px. |
| Per-day figure | `logic.ts` | `leftPerDay(balance, today)`, tested. |
| Card header | `components/CategorySection.tsx` | v2, budget bar, "⋯" menu; fold without `height` animation. |
| Budgets | `types.ts`, `logic.ts`, `CategorySheet.tsx` | `Category.limit?: number` (cents per month; `budget` is already need/want/save). `budgetStatus()` plus a pace figure. |
| Demnächst | new `components/DueSoonRail.tsx`, `DueSoonView.tsx` (pushed) | `dueSoon(data, today)` in `logic.ts`. |
| Search | `logic.ts` `searchEntries` | All months, grouped, newest first, capped at 50 with "Mehr". |
| Entry sheet | `components/EntrySheet.tsx` | New order; pill row (new `ui/Pill.tsx`). |
| Statistik | `StatsView.tsx`, `Charts.tsx` | KPI row; `IncomeExpenseChart` with saved labels and a hatch pattern (token fills); drop `IncomeExpenseLines` and `SavedLines`; one `WhereCard`; `formatAxis()` with `Intl`. |
| Planen | `InsightsView.tsx` → `PlanView.tsx` | Budgets card and Contracts card first; `bestWorst` over finished months; new `ContractsView.tsx` (pushed). |
| Optionen | `SettingsView.tsx`, `BackupGroup.tsx` | Grouped rows; `MenuPicker` row variant; *Sichern und übertragen* pushed. |
| Kategorien | `CategoriesView.tsx` | Edit mode. |
| First run | `IntroCard.tsx` → `SetupCard.tsx` | Setup steps. |
| Lock | new `components/LockScreen.tsx` | Overlay on launch and on return; also covers the app-switcher snapshot. |
| Touch | `src/index.css` base | `button { touch-action: manipulation }`. |

Colours: no new ones apart from glass. Amber goes back to meaning only
"open": the savings-rate bars in Planen move from `chart-save` to `chart-in`.
`npm run audit:contrast` after each colour step.

## 6. CLAUDE.md rules this plan changes (each needs your OK)

1. **"No `backdrop-filter`"** (Styling). Allow it on floating chrome only:
   tab bar, round nav buttons, sheet toolbar buttons, menus.
   - *Why:* Liquid Glass is the iOS 26/27 navigation layer; solid capsules
     read as an older iOS.
   - *Limits:* never on scrolling content, cards or sheet bodies; a static
     blur ≤ 16 px, never animated; solid fallbacks as in §5.
   - *Gate:* scroll a long month on the slowest iPhone you support with
     Safari's Web Inspector timeline. If frames drop, keep `float-chrome`.
2. **"Entry sheet order"** (date first, name focused first) → amount first,
   date/status/repeat as pills. Or keep name-first (§4).
3. **"Statistics and Insights are two tabs"** and the Insights description
   → the tab becomes *Planen* with Budgets and *Abos & Verträge* on top;
   best/weakest month uses finished months.
4. **The category's bar** ("the paid progress bar under the category's
   name"). With a budget it shows spent (paid + open) against the budget,
   plus the pace tick.
5. **Charts "follow the dataviz skill … validate_palette.js".** Neither is in
   the repo. Point the rule to `roast-my-chart` plus `audit:contrast`, and
   restore `validate_palette.js` if you still have it.
6. **Descriptions of the balance card and of "Settings → Darstellung →
   Farbe"** get rewritten for the new structure. The hero ink and token rules
   stay as they are.
7. **Data shape → `SCHEMA_VERSION` 9:**
   - `Category.limit?` (budgets, part of backups).
   - `AppData.contracts?: Record<seriesId, Contract>` (notice period,
     end/switch date, note; part of backups).
   - Lock and reminder preferences stay out of backups, like `accent`.
   - Old payloads load unchanged, since every new field is optional.

Unchanged: no `hover:`, no blur on scrolling content, tokens only, logical
properties, undo first, money as integer cents, the RTL rules.

## 7. Where each approved feature goes

| # | Feature | Where | Data / logic | Native |
|---|---|---|---|---|
| 1 | Category budgets | Month card header; *Planen › Budgets*; category sheet field with a suggestion from `categoryAverages` (3 finished months) | `Category.limit`; `budgetStatus()`; tests | — |
| 2 | Left per day | Balance card: *Diesen Monat übrig · ≈ x € pro Tag* (running month only); per budget in *Planen* | `leftPerDay()`: settled month net ÷ days left, including today; tests | — |
| 3 | Bill reminders | *Optionen › Erinnerungen*. Local notifications for open entries due from today, nearest first (iOS keeps 64 pending), rescheduled on change and resume. Text without amounts by default; a tap opens that month. | `reminderPlan(data, prefs, now)`; tests | `@capacitor/local-notifications` 8.3.1 (official, MIT), exact version, `cap sync ios` — changes `ios/`, asked first. Hidden on the web. |
| 4 | Face ID lock | *Optionen › Sicherheit*. Overlay on launch and after more than 1 min in the background; also blanks the app-switcher snapshot. | lock state in `store.ts` (view preference) | Biometric plugin: I'll vet `@capgo/capacitor-native-biometric` 8.9.1 and `@aparajita/capacitor-biometric-auth` 10.0.0 (maintenance, licence, code) before picking one; `NSFaceIDUsageDescription` in Info.plist — changes `ios/`, asked first. **Security note:** this locks the UI. The data in WKWebView storage isn't encrypted by the app (iOS file protection still applies). |
| 5 | Upcoming bills | Month: *Demnächst fällig* rail + pushed *Demnächst* screen | `dueSoon(data, today)`; tests | — |
| 6 | Abos & Verträge | *Planen* card + pushed screen; reminders before notice deadlines via #3 | `commitments()` + `priceChanges()` + `AppData.contracts`; tests | — |
| 7 | Search all months | Month search field | `searchEntries` over all months, grouped; tests | — |

## 8. Build order (Step 4)

One screen or feature at a time. Each step runs `npm run lint`, `npm test`,
`npm run audit:contrast` if colours changed, `node scripts/ui-review.mjs`
before and after (4 sizes × DE/AR × light/dark), a desktop check, and a check
that old `localStorage` loads.

1. **Foundation, no new look:**
   - 44 px targets.
   - `touch-action: manipulation`.
   - Ring text floor.
   - Localised axes.
   - Finished-month averages in Statistik and the best/weakest month fix.
   - Card fold without `height` animation.
2. **Platform chrome:** glass with fallbacks (after your OK and the device
   check), the sheet toolbar, `ui/Menu`, edge-swipe back.
3. **Month page:** balance card v2 with *pro Tag* (#2), card header v2, the
   empty-category chips.
4. **Budgets (#1):** schema 9, logic and tests, category sheet, card header,
   *Planen* card.
5. **Entry sheet v2,** after your call on §6.2.
6. **Demnächst (#5).**
7. **Search all months (#7).**
8. **Statistik restructure.**
9. ***Planen* tab and *Abos & Verträge* (#6).**
10. ***Optionen* regroup and *Kategorien* edit mode.**
11. **Bill reminders (#3).** Native plugin; I'll ask before touching `ios/`.
12. **Face ID lock (#4).** Native plugin; I'll ask before touching `ios/`.
13. **First run.**
14. **Final pass:**
    - Full matrix into `after/`, plus a 200 % text pass.
    - Contrast audit.
    - A VoiceOver checklist for you to run on the iPhone.
    - Update CLAUDE.md, PLAN.md and README.

Nothing gets committed without asking.

## 9. Incidental findings (not design)

- Analyse *Bester und schwächster Monat* picks the running month (November
  +1.749,86 €, with its salary still expected).
- Statistik's Ø includes the running month (3.792,83 = six months);
  Analyse's doesn't.
- In Arabic sentences the € sits left of the number ("€ 12,600.00 سنويًا"),
  while pure amounts force it right ("255.00 €"). That's correct bidi, but
  inconsistent. Worth a look by an Arabic reader before deciding anything.

## 10. Progress (Step 4)

Decisions taken with the approval (the plan's recommendations): glass on the
floating chrome, amount first in the entry sheet, *Analyse* becomes *Planen*,
"pro Tag" = the month's settled net ÷ days left (today included), one budget per
category for every month (no rollover), reminders without amounts by default.

- [x] **1 · Foundation** — `hit-44` utility (44 px hit areas for chips and
  segments; the audit counts it), `touch-action: manipulation` on controls,
  Segmented 40 px thumbs in a 44 px track, title button and category grips
  44 px, paid ring in rem with a caption floor (share once "x/y" no longer
  fits), chart axes in `Intl` compact notation with a measured axis width,
  Statistik averages over finished months, best/weakest month over finished
  months, card fold without a height animation (cards below glide via FLIP).
  Audit after: 0 targets under 44 px on entry sheet, Statistik, Analyse,
  Optionen, Kategorien; the carry-over chip and the card filter go in step 3.
  `scripts/ui-review.mjs` gained `--devices desktop` and `--text 2`.
- [x] **2 · Platform chrome** — `glass-chrome` / `glass-menu` utilities with
  solid fallbacks (Reduce Transparency, Increase Contrast, no backdrop-filter)
  on the tab bar, bar buttons and sheet toolbar; sheets get ✕ / ✓ icon
  buttons (labels kept as accessible names); new `ui/Menu.tsx` (anchored
  pull-down, focus inside, arrow keys, tap outside closes) — the month's "⋯"
  is now `MonthActionsMenu`; navigation is one pushed screen per tab
  (`stack`, `PARENT`) and pushed screens get the iOS edge swipe back
  (`ui/useEdgeSwipeBack.ts`, parent drawn underneath, no double transition).
  `audit:contrast` gained glass checks (658 pass); the menu glass is denser
  by day (0.92) so red "Löschen" stays ≥ 4.5:1 over the hero.
  Checked by script: menu opens with focus inside, closes on an outside tap;
  sheet toolbar names; a long edge swipe goes back, a short one springs home.
  **Needs the device:** glass cost while scrolling (Web Inspector timeline).
- [x] **3 · Month page** — balance card v2: *Kontostand jetzt* and the ring,
  then two panels, *Am Monatsende* ("nach 6 offenen Posten") and *Diesen Monat
  übrig* with "≈ 72 € pro Tag" (`leftPerDay`, `formatMoneyApprox`, tested);
  a 44 px row opens the details — the carry-over (to the opening sheet) and
  the income / expense table with visible column names, which stacks into
  rows when its columns don't fit (measured, so 200 % text and long amounts
  work). Swiping the card turns the month (touch only, follows the finger,
  slides out and in; taps and vertical scrolls pass through). Card header v2:
  name and paid amount, the bar, "2 erwartet / 3 offen · 1 überfällig /
  alles bezahlt", "· eingeklappt" when folded; one 44 px "⋯" menu (add, only
  open, fold) replaces the filter icon, the chevron and the trash; a filtered
  card ends in "2 erledigte Einträge ausgeblendet · Alle zeigen". Empty
  categories are one *Noch leer* chip row (menu: add, remove from the month),
  and the chips take dropped entries — the dragged row shows "nach
  Restaurants" because it covers the chip. Kept the dashed *Kategorie
  hinzufügen* button below the chips instead of the mockup's "+ Kategorie"
  chip, so it doesn't change place with the month's state.
  Also fixed: the large title broke "November" letter by letter at 200 %
  text (`wrap-compound` → year wraps instead); `ms-auto` on `num` amounts
  pointed the wrong way in Arabic (their own box is LTR), now on a wrapper;
  the step-2 swipe-back shade and shadow use the scrim / shadow tokens.
  `scripts/ui-review.mjs`: `--text 2` works (it threw before `<html>` existed),
  new screens `month-details`, `card-menu`, `empty-menu`.
  Audit after: no small targets, overflow or truncation on month,
  month-details, card-menu, empty-menu, first-run (the 30 px carry-over chip
  and the 36 px filter are gone); at 200 % only the tab labels truncate.
  Checked by script: details toggle, filter + footer, fold from the menu,
  chips (add picks the category, remove + undo), drop on a chip, swipe
  forward/back in DE and AR, short swipe springs back, vertical drag scrolls,
  a tap still opens the details (a swipe used to leave a fling in Chromium
  that ate the next tap: the card now owns its touchmoves while swiping).
  **For step 14:** tab labels at 200 %; a six-figure balance wraps on SE
  (BigMoney); first run still shows the hero full of zeros (step 13).
- [x] **4 · Budgets (#1)** — schema 9: `Category.limit` (cents a month,
  spending categories only; `normalizeState` keeps whole positive cents and
  drops the rest; part of backups; restoring the default categories keeps
  budgets). `src/budgets.ts`: `budgetStatus` (paid + open against the limit,
  left, elapsed share of the month, per day, "ahead" = one-off spending paid
  more than ten points ahead of the month — recurring bills are taken off
  first, so the Kita on the 5th doesn't count as overspending),
  `monthBudgets`, `suggestLimit` (last three finished months, rounded up to
  5 / 10 / 50 € steps) — 17 tests. New `BudgetSheet` (amount, tap-to-take
  suggestion, remove), reached from a card's "⋯", an empty category's chip
  and the Analyse card; saving or removing is undoable. Card header with a
  budget: `BudgetBar` (paid solid, open lighter, red when over, a tick for
  today), "Budget 400 € · noch 212,88 €" and at the end "50,04 € drüber" /
  "etwas schneller als geplant" / "1 offen". A category with a budget keeps
  its card even while empty. *Analyse* opens with a **Budgets** card
  ("3 von 4 im Rahmen", left per budget, ≈ per day, "Budget festlegen" →
  a menu of the spending categories without one, each with its suggestion);
  it moves into *Planen* in step 9. `scripts/ui-review.mjs` seeds four demo
  budgets (`--no-budgets` to leave them out) and gained `budget-sheet`,
  `month-budgets`. Audit: clean on month, card-menu, budget-sheet, insights.
  Checked by script: suggestion shown and taken, card text within / over,
  undo, Analyse count and "Budget festlegen" list, stored after a reload,
  removal. **For step 14:** at 200 % text, entry rows and card headers get
  narrow on SE (names break — the amount stays beside them; stack them as
  iOS lists do).
- [x] **5 · Entry sheet v2** — amount first and focused for a new entry
  (decimal pad; *Sichern & nächster* returns to it), then the name with its
  suggestions (the picked one ticked), the category chips, and one row of
  44 px pills: the date ("Heute" / "5. Nov.", the system picker through an
  invisible date input), paid ↔ open (a switch for VoiceOver), repeat (a menu
  with the old hints as sub-lines, the current one ticked) and "+ Notiz"
  (opens the field; shown at once when editing a note). Editing focuses
  nothing. `useDialog` now keeps a stack of open dialogs, so Escape in a menu
  over a sheet closes the menu, not the sheet. Fit with the keyboard up
  (captures `entry-new-kb`): 16, 17 Pro and Pro Max show everything up to the
  pills (Pro Max even *Sichern*); on **SE the pills are below the fold** — the
  sheet scrolls; amount, name, suggestions and categories are visible.
  Audit clean (entry-new, also at 200 %). Checked by script: focus on open,
  suggestion moves the category and keeps the amount, status switch, repeat
  menu and Escape, date, note, the saved entry, editing.
- [x] **6 · Demnächst fällig (#5)** — `src/due.ts`: `dueSoon` (open entries
  up to the running month — earlier months' are overdue — overdue first, then
  by day, undated last), `dueGroups` (Überfällig / Heute / Morgen / day by
  day / Ohne Datum), `nextMonthDue` (the next month's open entries once
  started, else a preview of the recurring ones it will copy in, on their
  day), `dueTotals` — 5 tests. On the running month a rail of cards under the
  balance card (date, picture and name, amount, "offen" / "erwartet" /
  "überfällig"; the card opens the entry, its circle ticks it off with an
  undoable toast); the "aus früheren Monaten noch offen" banner steps aside
  while the rail shows them. *Alle n* pushes **Demnächst fällig** (new pushed
  screen `dueSoon` on the month tab, edge swipe included): totals to pay and
  expected, day groups with the rows of the month page (circle first), and
  "Kommt mit Dezember" with the preview (dashed circles, nothing to tick).
  Also fixed on the way: an undo built on `togglePaid` from a toast would read
  stale state — undo now sets the old value. Audit clean (month, due-soon).
  Checked by script: order, tick + undo, card opens its entry, the pushed list
  and its groups, back.
- [x] **7 · Search all months (#7)** — the month's search field ("In allen
  Monaten suchen") searches every entry; `searchByMonth` (tested) groups the
  hits: the month on screen first, then newest first, 50 at a time
  (*Mehr zeigen (n weitere)*). The summary says "9 Treffer in 6 Monaten" with
  the sums; each month has a heading that opens it (and ends the search), then
  the hits in their category cards as before (tick, swipe, edit, marks).
  Checked by script: placeholder, count, order, 50 + Mehr, opening a month.
- [x] **8 · Statistik** — the period is always a segmented control (6 Monate |
  12 Monate | Alle, 6 by default; the eyebrow names the months). Three numbers
  first: Ø Einnahmen, Ø Ausgaben, Ø gespart over the finished months in view
  ("Durchschnitt Juni – Oktober 2026 · November läuft noch"); they wrap under
  each other at large text. **One** income/expense chart: the saved column is
  gone (amber means "open" again); what each month kept is written over its
  pair ("+1.283", "−320" in red; the running month muted, "≈" where there is
  room), only where a month's slot is ≥ 40 px — the tooltip and table always
  have it; the part of a column still open or expected is hatched
  (`MonthPoint.incomeOpen` / `expenseOpen`), with a one-line key under the
  chart. Titles say something: "Du sparst im Schnitt rund ein Drittel deines
  Einkommens" (`nearFraction`: half / third / quarter / fifth / tenth within
  3 points, else "{p} %", "mehr raus als rein", "so viel raus wie rein"),
  "Dein Konto wächst: +6.672 € seit Juni" (`balanceChange`); the balance line
  is dashed into the running month and its point hollow (a projection).
  `IncomeExpenseLines`, `SavedLines` and `CategoryMonthChart` are gone; **Wofür
  das Geld geht** is one card with Kategorien | Empfänger: categories as Ø bars
  (spending only), a tap opens that category's months as one series in its
  hue (`CategoryTrendChart`); payees as before with their own period menu.
  The value table stays. New `monthLabel(…, 'name')` (the month alone, for
  sentences). Tests: `nearFraction`, `balanceChange`, open parts in
  `monthSeries` (143 pass). `scripts/ui-review.mjs` gained `stats-category`,
  `stats-payees`. Audit clean on stats (SE, 16 × DE/AR × light/dark).
- [x] **9 · Planen and Abos & Verträge (#6)** — the tab is **Planen** / Plan /
  التخطيط with the piggy bank (its id stays `insights`); the title is the tab
  label. It opens on the Budgets card, then **Abos & Verträge**, which
  replaces *Feste Kosten*. `src/contracts.ts`: `contractItems` turns the
  recurring spending series into contracts, as the fixed costs count them
  (monthly series with an entry in the month, yearly ones with one in the last
  twelve months): what one payment costs, per month and per year, the next
  payment (still open in its month, or the coming one on its day), the last
  price change within twelve months ("+1,00 € seit Mai"); deadlines within
  90 days first, then the dearest per year. `nextDeadline`: end − notice;
  once that day has passed, the end it renews to (`renews` months, 12 unless
  set), counted from the first end so the day doesn't drift (31 Jan → 28 Feb
  → 31 Mar) — 9 tests. **Schema 10:** `AppData.contracts`, keyed by
  `Entry.seriesId` (`end`, `notice`, `renews`, `note`), its own storage key,
  part of backups, normalised on load and import, cleared by *Alle Daten
  löschen*. The card: "9 feste Kosten · … im Monat · … im Jahr", the share of
  the average income, the first four rows, *Alle (n)* pushes the whole list
  (pushed screen `contracts`, edge swipe). A row: picture, name, "13,99 €
  mtl.", then "kündbar bis 30. Nov." (amber within 60 days) or "fällig am /
  nächste am …", and the price change. New `ContractSheet`: *Läuft bis*
  (date), *Kündigungsfrist* (Keine, 1, 2, 3, 6, 12 Monate), *Verlängert sich
  um* (1, 3, 6, 12, 24 Monate), a note (customer number), the result in one
  sentence ("Kündige bis spätestens Montag, 30. November 2026, dann endet der
  Vertrag am …"), *Vertragsdaten entfernen*; saving and removing are
  undoable. The savings-rate bars are `chart-in` now, so amber means "open"
  on both tabs. `scripts/ui-review.mjs` gained `contract-sheet`, `contracts`.
  152 tests pass; audit clean on insights, contract-sheet, contracts (SE, 16
  × DE/AR × light/dark). **For step 11 (reminders):** the cancel-by day is
  the natural second reminder source after open bills.
- [x] **10 · Optionen and Kategorien** — the title is the tab label
  (Optionen / Settings / الإعدادات). Grouped rows, as iOS Settings has them:
  **Darstellung** — *Sprache* and *Erscheinungsbild* as pop-up rows (new
  `MenuRow` in `ui/Screen`: label, value, ⌃⌄; a native select lies over the
  row, so the system picker opens and VoiceOver reads one pop-up button; the
  value moves under the label when both don't fit), *Farbe* with its name at
  the end and the swatches under it (one line of eight where each still gets
  44 px — a container query at 352 px — else two lines of four; 32 px, not
  scaled with text); **Haushaltsbuch** — *Kategorien und Budgets* (count ›)
  and *Sichern und übertragen* (new pushed screen `transfer`: backup, Excel,
  CSV — `TransferView` around `BackupGroup`), "Alles bleibt auf diesem Gerät"
  under them; then *Alle Daten löschen* and *Über*. *Standard
  wiederherstellen* lives on the Kategorien screen only. *Sicherheit und
  Mitteilungen* opens with steps 11 and 12. **Kategorien und Budgets:** a row
  is picture, name, a subline ("Einnahme · in jedem Monat", "in jedem Monat ·
  Budget 400 €", "nicht in neuen Monaten") and the entry count at its end; a
  tap opens the sheet, a swipe toward the start deletes (empty: undo toast;
  with entries: asks first), as on the month page. *Bearbeiten* in the bar
  (new `BarButton`, a glass capsule) shows ⊖ and a grip on every row (drag,
  or ↑ / ↓ on the grip); *Fertig* hides them. The every-month switch is in
  the category sheet only; the sheet gained *Budget pro Monat* (optional,
  with the "Vorschlag: 390 € (Ø 3 Monate)" chip — `BudgetSuggestion`, shared
  with `BudgetSheet`), *Art* moved above it, and an income category drops its
  budget. The rows draw their focus ring inside (the row clips).
  `scripts/ui-review.mjs` gained `transfer`, `categories-edit`. Audit clean on
  settings, transfer, categories, categories-edit, category-edit (SE, 16 ×
  DE/AR × light/dark). Checked by script: both menus (English and back, dark),
  a swatch, transfer and back, edit mode on and off, ↓ on a grip, ⊖ on an
  empty category and undo, ⊖ on one with entries asks, swipe delete and undo,
  a budget set, shown, removed, suggested, refused when not a number, dropped
  for income, the every-month switch in the sheet. **For step 14:** at 200 %
  text, `Row` labels ("Kategorien und Budgets") break into syllables on SE —
  the rem paddings double; stack the trailing value under the label there.
- [x] **11 · Bill reminders (#3)** — written and checked in the browser;
  **not yet run on an iPhone.** `@capacitor/local-notifications` 8.3.1, exact;
  `npx cap update ios` added it to `CapApp-SPM/Package.swift`. One scheduler,
  `reminderPlan(data, prefs, t, now, sources)` in `src/reminders.ts` (15
  tests): a source says what to remind of, how early, what it says and where a
  tap goes — open bills (the running month from today, and the next month: its
  open entries, or the recurring ones starting it will copy in) and the
  contracts' last days to cancel (a week ahead, opens *Abos & Verträge*);
  plans 03, 12, 13, 31 add theirs. Items of one kind and day share one
  notification ("Morgen fällig: Miete, Strom und 1 weitere"), at the chosen
  time `lead` days ahead — or the next slot still to come, if that has passed
  and the day hasn't; soonest first, at most 60 (iOS keeps 64). No amounts
  unless *Beträge zeigen* is on. Ids are a hash of kind and day, so a
  reschedule replaces. `src/notify.ts`: permission, swapping all pending
  notifications for the plan (800 ms after a change, and on every return to
  the app), a tap opens the month or the contracts. Optionen gains
  **Sicherheit und Mitteilungen** (iPhone app only): *An offene Posten
  erinnern* with its setting as the subline ("Am Vortag · 09:00" / "Aus")
  pushes **Erinnerungen** (new pushed screen `reminders`): the switch (asks
  for permission; a denied one gets a note pointing to the iOS settings),
  *Uhrzeit*, *Wann* (Am Fälligkeitstag, Am Vortag, 2 / 3 Tage, 1 Woche),
  *Beträge zeigen* with why it's off, and *Als Nächstes*: the next five as they
  will go off. Settings of the device, not data: not in backups, kept by
  *Alle Daten löschen* (whose emptied book then cancels everything pending).
- [x] **12 · Face ID lock (#4)** — written; **not yet run on an iPhone.**
  Plugin vetted (code, licence, upkeep; choice and reasons in CLAUDE.md):
  `@aparajita/capacitor-biometric-auth` 10.0.0 (MIT) — one small Swift file on
  LocalAuthentication, the passcode as fallback (`allowDeviceCredential`), no
  network — over `@capgo/capacitor-native-biometric` 8.9.1 (MPL-2.0, Keychain
  credentials the app doesn't need). `NSFaceIDUsageDescription` in
  `Info.plist`. `src/lock.ts`: what can lock here (Face ID, Touch ID, or only
  the passcode — the row's name follows) and `authenticate()`. Switching the
  lock on asks once. Locked from the first render of a cold start (the flag is
  read synchronously), and then **only** `LockScreen` renders — no amount in
  the DOM or under VoiceOver; it asks for Face ID by itself, the button is for
  a second try. More than a minute away locks again (the Face ID prompt's own
  inactive moment doesn't count, nor do two prompts overlap). While the app is
  inactive with the lock on, `PrivacyCover` (the icon on the background)
  covers it for the app-switcher snapshot. `localStorage['spartopf-dev-native']
  = '1'` shows both settings in a dev build (captures `settings-native`,
  `reminders`; audit clean on SE, 16 × DE/AR × light/dark); production drops
  it. 167 tests pass, the web build works. **On the device (Ahmad):**
  `npm run build:ios`, then check: the permission prompt; a reminder at the
  chosen time and its tap (month / contracts); the lock on cold start (no
  flash of the book), after more than a minute away, not after a short
  switch; the passcode fallback; the app-switcher snapshot shows the cover —
  if the snapshot still catches the book, the cover has to move to
  `SceneDelegate.sceneWillResignActive` (native), since the web view may paint
  too late.
- [x] **13 · First run** — the first month opens on a setup card instead of a
  balance card full of zeros and five paragraphs (`SetupCard.tsx`; the old
  `IntroCard` is gone): ① *Wie viel ist gerade auf deinem Konto?* typed into
  the card (an overdrawn account takes a minus), ② *Gehalt eintragen* (the
  entry sheet on the income category, named "Gehalt", monthly — a new
  `preset` on the sheet's new mode; the repeat stays for *Sichern & nächster*),
  ③ *Feste Kosten eintragen* (Wohnen, monthly). Each step ticks itself off
  (an income entry; a monthly spending entry, "2 eingetragen – tippe für
  weitere"). *Aus Excel importieren* is the secondary way in; *Später* puts
  the setup off, and once the balance is in it reads *Fertig* (filled when all
  three are done). The balance card appears as soon as there is a balance or
  an entry. **The balance asked is "now", the model's opening is the start of
  the month:** while the setup runs, what is entered as already paid happened
  before that look at the bank, so it moves the month's opening, not
  *Kontostand jetzt* (App keeps opening = balance given − the month's settled
  part; it stops with *Fertig* / *Später*, a reload, or an opening set by
  hand). Rent paid on the 1st, entered during the setup, leaves the balance at
  what the bank says and makes the month start 1.050 € higher. After the setup
  — once the month has entries — one dismissible **Gut zu wissen** card with
  the three gestures (circle, swipe right / left — mirrored in Arabic — and
  hold to drag; `TipsCard`, its own `spartopf-tips-done`, which starts as done
  for whoever had dismissed the old intro). No currency step (plan 07).
  `scripts/ui-review.mjs`: screens can seed extra storage (`storage`), new
  `setup-balance`, `tips`. Audit clean on first-run, setup-balance, tips, month
  (SE, 16 × DE/AR × light/dark). Checked by script: no hero at first, the
  inline balance, salary and fixed-cost sheets preset, the balance kept while
  paid rent is entered and the opening derived (2.284,56 €), *Fertig* → tips,
  ticking afterwards moves the balance, tips gone for good, *Später*,
  *Ändern* and a negative balance, an upgrade from the old intro shows no tips.
