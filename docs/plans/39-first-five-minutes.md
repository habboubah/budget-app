# 39 · The first five minutes

- **Covers:** "a new user must not give up after five minutes because it isn't clear how to use the app" (Ahmad, November 2026). U1 in COMPETITOR_ANALYSIS.md ("the first session decides whether people stay"), and what its reviews say: people stay for years with an app because entering is simple (Monefy), and leave when updates clutter it (Bluecoins, Spendee 6).
- **Depends on:** 37 (its counts, its tip system). Build it **before 38**: the store screenshots, the guide's pictures and the App Review recording all show screens this plan changes.
- **Size:** L — four phases, each shippable by itself
- **Native:** none
- **Schema:** no change. Every feature stays. Only where a feature first appears changes; new state is view preferences only.
- **Status:** built in November 2026, all four phases, with the proposed answer to each of the five decisions — see [What was built](#what-was-built). Open: the test with five people, the App Review recording, the device checks (`docs/TODO.md`).

## The problem, measured

A walk through 1.2.18 (the web build, 393 × 852 like an iPhone 16, German and English, empty storage, 12 November 2026). A count is every tappable element touching the viewport, as in plan 37.

| Moment | What a newcomer sees | Count |
|---|---|---|
| First launch | The month title with ‹ › and "⋯", the search field, the setup card (three steps, *Aus Excel importieren*, *Später*), the *Noch leer* chips, four tabs, + | 21 (DE), 23 (EN) |
| After *Später* | A balance card with four amounts, all 0,00 € — *Kontostand jetzt*, *Am Monatsende*, *Diesen Monat übrig*, *Startguthaben* — then eight category chips | 20 |
| The first entry (+) | Amount, name, three name ideas and *Alle (15)*, three categories and *Alle (21)*, seven pills (*Heute, Bezahlt, Einmalig, Erstattung, Beleg, Notiz, Tag*), ✓, *Sichern*, *Sichern & nächster*, four calculator keys | 25 |
| After one coffee, setup put off | *Kontostand jetzt* −4,50 €, *Am Monatsende* −4,50 €, *Diesen Monat übrig* −4,50 € (two of them red), a ring "1/1 Bezahlt", a line chart, *Startguthaben 0,00 €* — and under it *Gut zu wissen* with three gestures | 5 figures for 1 entry |
| After the whole setup (2.450 on the account, a salary, the rent) | *Kontostand jetzt* 2.450, *Am Monatsende* 2.450, *Diesen Monat übrig* +2.250 with "≈ 118 pro Tag", *Startguthaben* 200 (worked out backwards; between steps 2 and 3 it read −750), the ring, the line | 16–23, 5 figures |
| The month's "⋯" on day one | Nine rows; four are imports, each with a two- or three-line explanation | 9 rows (10 from the second month) |
| *Statistik* on day one | The period picker (3 M … Alle) above a single month with two columns | 16 |
| *Planen* on day one | *Nächste 30 Tage*: "Tiefster Stand: 2.450 € am 12. Nov." over a flat line; budgets; contracts | 12 |
| *Optionen* | 17 rows on the web, about 22 in the iPhone app, 2.5 screens. Debts, trips, the tax list and rules are features, filed under settings | 17–22 rows |
| A filled month (the test data) | 6.3 screens and 167 tappable elements; *Planen* 6.3 screens, *Statistik* 4.2 | 32 in the first viewport |

What it adds up to:

1. **The app shows its whole idea before it holds one number.** The two balances are the reason to use Spartopf. With nothing entered they are four zeros; after the first entry, the same negative amount three times. Nothing on the screen says what the app is going to do for me.
2. **Two figures for "what's left" compete.** *Am Monatsende* is a balance, *Diesen Monat übrig* is income minus spending. They sit side by side, differ by the *Startguthaben*, and neither says which one I may spend.
3. **The short way through the entry sheet is hidden in a long form.** Amount → name → *Sichern* is three steps, as plan 37 asks. It is drawn with 25 controls, so it reads as twenty decisions. There is no *Ausgabe / Einnahme* switch either: income is entered by choosing the category *Einkommen*, which a new book keeps behind *Alle (21)*.
4. **Menus and pages are ordered by when a thing was built.** The "⋯", *Planen* and *Optionen* gained a row or a card per plan.
5. **What is taught unasked is gestures.** Tick, swipe, hold and drag. The idea — enter what is paid and what is still to pay, and see what is left — is explained only in the guide, in *Optionen*.

Plan 37's rule held: none of this comes from accounts, debts or tags, which stay out of sight until used. What is left is the core itself.

## Principles

1. **One answer per screen, the rest one tap down.** The month page answers "how much is left?" with one figure and one line.
2. **The app grows with the book.** A part of a screen appears once the book has something to put in it. Plan 30 set that rule for accounts; here it applies to the balance card, the search, the period picker, the cards of *Planen* and the entry sheet's pills.
3. **Nothing is removed, and a full book looks as it does today.** Every "show more" is remembered. An install that already has a book starts with all of them open (set once, at the update).
4. **Show, then name.** A word is explained where it first matters, in one sentence, once.
5. **No "simple mode".** A mode is a setting to understand before the app is understood, and two interfaces to test. What the book holds decides what shows.
6. **Complexity gets a budget**, checked like the bundle size.

This is Apple's guidance too ([Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)): a flow that is "fast, fun, and optional", learning by doing instead of reading, tips beside the control they are about, a tutorial that can be found again later, and no setup step that can wait.

## Steps

### Phase 1 — The month page and the entry sheet (S–M)

No new screen. It repairs rows 2 to 6 of the table and can ship alone.

1. **Balance card: one figure, one line.**

   ```
   Kontostand jetzt
   2.450,00 €
   Am Monatsende bleiben 1.300,00 €
   3 Posten noch offen               ⌄
   ```

   - **Closed** — how a new book starts: *Kontostand jetzt* large, one line under it, the row that opens the details.
   - **Open:** all of today's card — the month's line, the ring, *pro Tag*, the carry-over, the two meters. Remembered (`spartopf-balance-open`).
   - *Diesen Monat übrig* moves into the details and is named for what it is (*Einnahmen − Ausgaben*), so only one figure says "left".
   - **No balance given yet:** the card claims no *Kontostand*. It shows "Diesen Monat ausgegeben 4,50 €" (and *eingenommen* once there is income) and one row: "Kontostand eintragen – dann siehst du, was am Monatsende bleibt" → `OpeningSheet`. A coffee no longer makes a negative bank balance.
   - The paid ring appears with the first *open* entry, not at 1/1.
2. **Chrome that waits.**
   - The search field (and the pending filter beside it) appears from 15 entries or the second month.
   - *Noch leer*: on a new book one chip, "8 Kategorien ⌄", that opens the row of today. Categories show up with their first entry — the entry sheet already offers them all.
3. **The month's "⋯": four rows.**
   - *Importieren …* — one sheet with the five ways in (photo, CSV, PDF, invoice QR, Excel), each with its icon and its sentence. The explanations move to where they are read.
   - *Kontostand prüfen …* — the opening balance and the bank match in one sheet.
   - *Monatsbericht*
   - *Mehr* — fold all, fetch recurring entries, *Umbuchen*, delete the month.
4. **Entry sheet: three things, then *Mehr*.**

   ```
   ✕        Neue Ausgabe        ✓
   [  Ausgabe  |  Einnahme  ]
   −  4,50 €
   Kaffee
   🍽 Restaurants ✦   🛒   🏠   Alle ⌄
   📅 Heute   ✓ Bezahlt   ↻ Einmalig   ＋ Mehr
   [            Sichern            ]
   ```

   - A switch *Ausgabe | Einnahme* on top. It only picks a category of that kind; no new field in the data.
   - Amount, name and category as today.
   - Three pills — date, paid, repeat — and a fourth, *Mehr*, that opens the others in place: *Erstattung, Beleg, Notiz, Tag, Ende*, and the ones a feature adds (account, trip, tax, debt). A pill that holds a value always shows. Open or closed is remembered (`spartopf-entry-more`).
   - One *Sichern*. *& nächster* becomes the action on the confirmation ("„Kaffee" eingetragen · Noch einer") and stays under *Mehr*. *Als Favorit merken* moves under *Mehr*; plan 37's tip still offers it after the third time.
   - The calculator keys open from one key at the amount's edge; once used, they stay.
   - The first time, one line under the pills: "Noch nicht bezahlt? Tippe auf *Bezahlt* – der Eintrag wartet dann als *offen*."
   - A bug found on the way: the amount's placeholder is a fixed "0,00" (`EntrySheet.tsx`), also in English with dollars. Use `amountToInput(0, t.locale)`, as the setup card does.

   Files: `BalanceCard.tsx`, `MonthView.tsx`, `EmptyCategories.tsx`, `MonthActionsMenu.tsx`, `EntrySheet.tsx`, `store.ts` (the three preferences and their one-time default for a book that exists).

### Phase 2 — A start that leads somewhere (M)

This changes a decision (below): something may come before the month page. Three questions, each one skippable, under a minute, and the answer to them is the app's first screen.

1. **Welcome**, one screen: the icon; one sentence — "Trag ein, was reinkommt und rausgeht. Spartopf zeigt dir, was am Monatsende übrig bleibt."; the promise — "Ohne Konto, ohne Server. Alles bleibt auf diesem Gerät."; *Los geht's*; and two quiet links, *Ich habe schon Daten* (a backup, an Excel sheet) and *Erst mit Beispieldaten ansehen*. Language and currency follow the phone; a small chip in the corner changes them.
2. **Three questions**, one per screen, one large field, *Weiter* and *Überspringen*:
   1. "Wie viel ist gerade auf deinem Konto?"
   2. "Was kommt jeden Monat rein?" — the amount and its day.
   3. "Was geht jeden Monat fest ab?" — Miete, Strom, Handy und Internet, Versicherung, *＋ weitere*: an amount and a day for those that apply.

   Paid or open is not asked. A day up to today is paid, a later one open — so the first month page already shows the idea: "Miete · 28. Nov. · offen".
3. **The payoff:** "Am Monatsende bleiben dir voraussichtlich 1.300 €", counting up, the open items under it, *Zum Haushaltsbuch*. This is the moment the app has to reach within a minute.
4. **Example data from the first screen.** The link calls `addDemoData`; a banner stays on every tab — "Beispieldaten · Entfernen und selbst starten" — until `removeDemoData`, then the three questions.
5. **A slim row instead of a card.** Until done or closed, the month page carries "Erste Schritte · 2 von 4 ›" (balance, income, fixed costs, the first expense). `SetupCard`'s steps and callbacks are reused; the card goes.
6. **Gestures when they apply, one at a time**, through `src/tips.ts` and the tour's mark (`point: true`): the circle at the first open entry, the swipe after the fifth entry, hold and drag once two entries share a category. *Gut zu wissen* goes; the tours and the guide stay.

*Überspringen* at any point leaves a working app: phase 1's card without a balance.

Files: a new `StartFlow.tsx` rendered by `App.tsx` while `introDone` is unset and the book is empty; `SetupCard.tsx`, `tips.ts`, `demo.ts` (unchanged, called earlier).

### Phase 3 — Places named for what you do there (M–L)

Second in priority: a newcomer meets these after the first minutes.

1. ***Optionen* becomes *Mehr*.** One screen instead of 2.5:
   - a search on top — "Was möchtest du tun?" — over features and guide topics (`searchGuide` exists);
   - the two tiles of today: *Anleitung* (with the test data, as now), *Sichern und übertragen*;
   - *Haushaltsbuch*: Kategorien und Budgets, Konten, Favoriten;
   - *Werkzeuge*: Importieren, Schulden und Kredite, Reisen und Projekte, Steuerliste, Regeln, Automatisch erfassen;
   - *Einstellungen* → one pushed screen: Darstellung, Sicherheit und Mitteilungen, Monat beginnt am, Über Spartopf, and *App zurücksetzen* last.

   Rows keep their labels and stay buttons; the scripts find them by text.
2. ***Planen* and *Statistik* open as headlines.** Each card is one row with its finding — "Budgets · 3 von 4 im Rahmen", "Nächste 30 Tage · tiefster Stand 412 € am 27.", "Ausblick · ≈ 9.600 € bis Nov. 2027", "Abos & Verträge · 17 · 1.778 € im Monat" — and opens in place to the card of today. Open cards are remembered. *November bis heute* and *Das fällt auf* start open: they are the answer.
3. **Honest first-month states.** *Statistik* before two finished months: this month's *Wofür das Geld geht* and one line, "Ab dem zweiten Monat siehst du hier den Verlauf" — no period picker, no trend chart. *Planen* on a new book: the headlines that have something to say, and two invitations (*Budget festlegen*, *Sparziel anlegen*).

Files: `SettingsView.tsx`, `App.tsx` (the tab's label and the pushed *Einstellungen*), `InsightsView.tsx`, `StatsView.tsx`, a shared `FoldCard` in `src/ui/`.

### Phase 4 — Words, proof and the guardrail (S–M)

1. **Twelve words.** What a newcomer reads in the first five minutes, in DE, EN and AR: *Kontostand jetzt, Am Monatsende, offen / bezahlt, erwartet / erhalten, Einmalig / Monatlich, Startguthaben / Übertrag, Noch leer, Demnächst fällig, Abgleichen, Rücklage, Spartopf, Ausblick*. One meaning each and the same word everywhere; `docs/plans/glossary.md` follows, and the other eleven languages follow the glossary.
2. **The five-minute test.** Five people who have not seen the app, on a fresh install, no help. Once before phase 1 (the baseline), once after phase 2, once at the end. It takes the place of plan 37's open item 1.
   1. "Finde heraus, wie viel dir am Monatsende bleibt."
   2. "Trag einen Kaffee für 3,50 € ein."
   3. "Trag die Miete ein: 950 €, jeden Monat, noch nicht bezahlt."
   4. "Die Miete ist jetzt bezahlt."
   5. "Wie viel hast du für Lebensmittel ausgegeben?"

   Note where each person stops, and what they say the large number means. The app has no analytics and gets none: this, and the store reviews, are the only measure.
3. **A complexity budget in `npm run check`** — `scripts/simplicity-check.mjs`, on ui-review's fresh-install captures. It counts tappable elements and money figures per state and fails above the budget. Raising one takes a note in the plan that raised it, as with the bundle size.

   | State | Today | Budget |
   |---|---|---|
   | First screen after install | 21–23 | ≤ 6 |
   | Month page of a new book, first viewport | 16–23, 4–5 figures | ≤ 12, at most 2 figures |
   | Entry sheet, new entry | 25 | ≤ 12 |
   | The month's "⋯" | 9–10 rows | ≤ 4 rows |
   | *Mehr* (today *Optionen*) | 17–22 rows, 2.5 screens | ≤ 13 rows, about one screen |
   | *Planen* on a new book, first viewport | 12 | ≤ 8 |

## Where things move

Nothing is removed. Only these change place:

| Today | After |
|---|---|
| Ring, month line, *Diesen Monat übrig*, *pro Tag* on the balance card | The same card, opened (open stays open) |
| Search field and pending filter, always | From 15 entries or the second month |
| Eight *Noch leer* chips | One chip that opens them |
| Photo, CSV, PDF and invoice QR in the month's "⋯"; Excel in *Sichern und übertragen* and the setup card | *Importieren …* in the "⋯", and under *Mehr › Werkzeuge* |
| *Startguthaben* and *Mit Bank abgleichen*, two rows | *Kontostand prüfen …*, one sheet |
| Fold all, fetch recurring, *Umbuchen*, delete month | "⋯" → *Mehr* |
| *Erstattung, Beleg, Notiz, Tag, Ende*, account, trip, tax and debt pills | The entry sheet's *Mehr* (stays open once opened) |
| *Sichern & nächster* | The confirmation's *Noch einer*, and under *Mehr* |
| *Als Favorit merken* | Under *Mehr*, and the tip |
| Calculator row | One key at the amount |
| Setup card | The start, then the row *Erste Schritte* |
| *Gut zu wissen* (three gestures) | Three tips, each at its moment; the tour stays in the guide |
| Test data under *Optionen › Ausprobieren* | Also on the welcome screen; in the guide as now |
| *Optionen*: seven groups | *Mehr*: search, *Haushaltsbuch*, *Werkzeuge*, *Einstellungen* |
| The cards of *Planen* and *Statistik*, all open | Headlines that open (open stays open) |

## The decisions, as taken

Each with its proposed answer (November 2026); they are in `README.md`'s table now.

| # | Decision | Taken | The alternative, not taken |
|---|---|---|---|
| 1 | May something come before the month page? CLAUDE.md and plan 37 said no. | Yes: the welcome and three skippable questions. | The same three questions as the only card on the month page. |
| 2 | The large figure on the closed card | *Kontostand jetzt* — it can be checked against the banking app; *Am Monatsende* is the row under it. | *Am Monatsende* large. |
| 3 | A book that exists at the update | Everything starts open: nothing looks different. | The new, closed defaults for everyone. |
| 4 | The fourth tab's name | *Mehr* | Keep *Optionen* and only reorder. |
| 5 | Phase 3, step 2 (headlines) | Built. | Leave the cards open and do only the first-month states. |

## What was built

On the branch `plan-39-first-five-minutes`, one commit a step. How each part works is in `docs/CLAUDE.md` under *The first five minutes*; what a user sees, in `docs/features.md`.

**Phase 1 — the month page and the entry sheet.** The balance card in three states (no balance given, closed, open), the search and the pending filter from 15 entries or the second month, the empty categories as one chip, the four-row "⋯" with *Importieren* and *Kontostand prüfen* as sheets, and the entry sheet with *Ausgabe | Einnahme*, three pills and the rest behind a "⋯".

**Phase 2 — the start.** `StartFlow` (a chunk of its own): the welcome, the three questions, what is left; `startPlan()` turns the answers into the month's first entries. The test data from the first screen as a trial with a capsule that takes it out again. *Erste Schritte* in place of the setup card, the three gestures as tips at their moment in place of *Gut zu wissen*.

**Phase 3 — the places.** *Mehr* with its search, *Haushaltsbuch*, *Werkzeuge* and the row to *Einstellungen* (a pushed screen). *Planen* and *Statistik* as headlines that open, with one button in the bar for all of them. The first-month states of both.

**Phase 4 — words and the guardrail.** The words a newcomer reads, checked in German, English and Arabic and against the other eleven languages (below); `scripts/simplicity-check.mjs` in `npm run check`; the guide's pages, pictures and tours, `ui-review`, `guide-shots` and the privacy check on the new flows.

### Where it differs from the plan above

- **The ring** on the balance card shows only on the open card (the plan: from the first open entry). The closed card is one figure and one row; a ring beside them was a third thing to read.
- **The entry sheet's *Mehr* is a round "⋯"**, not a pill with the word. As a fourth pill it wrapped onto a line of its own in German and lost the accent's colour; the guide draws it as it looks.
- ***Umbuchen* stays in the "⋯"'s first group** once there are accounts (five rows then). It is what a book with a cash account does most; a new book never sees it.
- **The start asks about five fixed costs by name** and has no *＋ weitere*: a sixth is an entry like any other, and the last screen says so by leading to the month page.
- **The start's link reads *Erst mit Testdaten ansehen*** — the app says *Testdaten* everywhere else — and the banner is a capsule above the tab bar, not a bar across every tab.
- **Name ideas the book has never used** show once the name field has the focus, not with the sheet: they were three more buttons before the first letter.
- **The search of *Mehr*** finds its own rows, what *Einstellungen* holds and the guide's topics (it loads the guide's words when it begins).
- **On *Planen* the bar's button appears from three cards**; with fewer, each opens on its own and a button for all of them is one more thing on a new screen.
- **A backup restored into a new book opens every fold** — whoever kept that book elsewhere finds the app as it was there. The plan only covered the update.
- **The pace card** on a new book leaves out its chart until there is a usual month to compare with (it was one line going up).
- **Phase 4's twelve words** needed two corrections, not a rewrite: *Kontostand prüfen* is now also the title of the sheet it opens (it read *Mit Bank abgleichen*; the guide's topic keeps that name for the task), and English and Arabic say "bank balance" there as on the card. *Weniger* got a string of its own — it had borrowed "Fewer" from the categories, which is wrong for a card in four languages.

### The budget, as recorded

Counted by `scripts/simplicity-check.mjs` on the production build, from a fresh install, in German at 393 × 852: what can be tapped in the first viewport, the four tabs and the add button included (five of every count on a tab's page); with a sheet or a menu open, only what is in it.

| State | Before | Aimed for | Reached | Budget |
|---|---|---|---|---|
| First screen after install | 21–23 | ≤ 6 | 4 | 6 |
| Month page of a new book, everything put off | 16–23, 4–5 amounts | ≤ 12, at most 2 amounts | 13, 1 amount | 13, 2 amounts |
| Entry sheet, new entry | 25 | ≤ 12 | 16 | 16 |
| The month's "⋯" | 9–10 rows | ≤ 4 rows | 4 | 4 |
| *Mehr* (it was *Optionen*) | 17–22 rows, 2.5 screens | ≤ 13 rows, about one screen | 11 rows on the web, 12 in the iPhone app, 1.4 screens | 13 |
| *Planen* in the first month | 12 | ≤ 8 | 9 | 9 |
| *Statistik* in the first month | 16 | — | 8 | 8 |

Three aims were missed, and the budgets say what is there rather than what was hoped:

- **The month page: 13, not 12.** The thirteenth is the ✕ on *Erste Schritte*. Without it the row could only be put away from inside its sheet.
- **The entry sheet: 16, not 12.** Close, save, the switch's two halves, the calculator key, amount and name, three categories and *Alle*, three pills, the "⋯", *Sichern*. Twelve would have meant hiding the categories or the date, and the plan itself draws all of these.
- ***Planen*: 9, not 8.** Four things on the page — the budget invitation, *Nächste 30 Tage*, *Abos & Verträge*, *Für etwas sparen?* — and the tab bar's five.

With the test data (a year), as headlines: *Planen* 1.9 screens instead of 6.4, *Statistik* 2.1 instead of 4.2. The month page with the start answered has no budget: it holds the book's first entries and grows with them.

**Bundle.** The main chunk was 373.9 kB gzip when this plan began (9 % over the recorded 342 kB) and is 380.7 kB with it; `scripts/perf-check.mjs` records 381 kB, with what the 7 kB are. The start is a chunk of its own (3 kB) that only a new book loads. The timings there were measured in a two-core Linux container, not on the Mac.

### What is left

- [ ] **The five-minute test** (phase 4, step 2), once with five people on a fresh install. There is no baseline from before phase 1 — the plan was built in one go — so the walk through 1.2.18 at the top of this file stands in for it.
- [ ] **The App Review recording.** `ios/AppReviewRecorder/scenes.json` was not touched. Its scenes pass through the setup card, *Optionen* and the old "⋯"; `docs/TODO.md` lists what each scene needs.
- [ ] **On the iPhone:** the start with the keyboard, the folds with VoiceOver and at the largest text size, *Mehr*'s search (`docs/TODO.md`).
- [ ] **The guide's pictures on the Mac.** They were taken again in a Linux container, like the ones before them; `npm run guide-shots` on the Mac gives Apple's type and emoji.

## What every phase carries along

- **The App Review submission.** The recording (`ios/AppReviewRecorder/scenes.json`) passes through the month page, the entry sheet and *Optionen*. Start after the approval, or re-record: `npm run rehearse:app-review`, then `npm run record:app-review`.
- Strings in 14 languages, their Android twins (`android.test.ts`), the guide's pages where a label changes (`guide.test.ts`), the glossary. Tab labels stay within 11 letters.
- The tours' marks (`data-tour="search"`, the setup, `MARKS` / `TOUR_STEPS`), then `npm run guide-shots`.
- `scripts/privacy-check.mjs` (it drives the first run), ui-review's `first-run`, `setup-balance` and `tour-fresh`, `scripts/screenshots.mjs` — and plan 38's store screenshots after it.
- The docs: `features.md`, the first-run rule in `CLAUDE.md`, the decisions table in `README.md`, What's New in `store/listing.md`.
- The gates: `npm run check`, ui-review before and after in DE and AR, light and dark, SE and Pro Max, and once at 200 % text.

## Not in this plan

- The length of a filled month page (6.3 screens of category cards). That is a question for people who stayed; ask it after the test.
- New features, and the look: colours, type and motion stay as the second redesign left them.

## Done when

- [x] The five decisions are taken and written into `README.md`.
- [ ] The baseline test is done and its notes are in this file. — Not done: built in one go; the measured walk above is the baseline.
- [x] Phase 1: the closed balance card, the card without a balance, the waiting search and chips, the four-row "⋯", the entry sheet with *Ausgabe | Einnahme* and *Mehr*.
- [x] Phase 2: the start, the example data from the first screen, *Erste Schritte*, the three gesture tips.
- [x] Phase 3: *Mehr*, the headlines, the first-month states.
- [x] Phase 4: the twelve words, `simplicity-check` in `npm run check` with every budget met — the budgets as recorded above, three of them looser than first aimed for.
- [ ] In the last test, four of five people finish tasks 1 to 4 without help, the first expense takes under 30 seconds, and all five can say what the large number means.
- [x] A book from 1.2.18 opens after the update looking as it did — but for the fourth tab's name and order, one row under the open balance card (*Weniger*), one button in the bar of *Planen* and *Statistik*, and the "⋯" menu's four rows.
