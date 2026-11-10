# Spartopf — implementation plans

These plans take today's app to the best household budget book on the App Store and Google Play. The app stays private, secure, free and simple.

There is one plan per feature, built strictly in order. The plans draw on three sources:
- [COMPETITOR_ANALYSIS.md](../COMPETITOR_ANALYSIS.md): the gaps, user requests and complaints.
- [REDESIGN.md](../REDESIGN.md): the redesign, built in plan 00.
- [STATISTICS_AND_INSIGHTS.md](../STATISTICS_AND_INSIGHTS.md): what Statistik and Planen show, and how (plans 06a and 13).

## Ground rules (every plan)

1. **Everything stays on the device.**
   - No server, no account, no analytics, no crash reporter, and no SDK that phones home.
   - The app makes no network requests. The one exception is the opt-in connection to the user's own bank (plan 36).
   - No sync. Data moves to another phone as a backup file the user carries over (plans 03, 04).
2. **Secure by default.**
   - Files from outside are checked before they're read.
   - Exports are encrypted.
   - The app can be locked.
   - Lock screen, widgets and notifications show no amounts unless the user turns that on.
3. **Free for everyone, no ads.** No in-app purchases, no "Pro" and no paywalled features, ever.
4. **Simple for new users.** A new user sees what the redesign shows: first run, the month page and the add button. Every new feature:
   - stays hidden until it's relevant, or lives where people already look (a "⋯" menu, the entry sheet's "+", *Planen*, *Optionen*);
   - adds no required field and no first-run step;
   - has a default that works, and an undo.
5. **The maths is never wrong.**
   - Money rules are pure, tested functions in `src/logic.ts`, `src/insights.ts` and `src/budgets.ts`.
   - Old data always loads (`normalizeState`, `SCHEMA_VERSION`; bump to the next free number, optional fields only).
6. **CLAUDE.md applies:** tokens only, logical properties (RTL), 44 pt targets, VoiceOver labels, Dynamic Type, reduced motion, and strings in de/en/ar (tr from plan 25).

## How to work through them

- Start at 00 and go in order. A plan starts only once the plans it depends on are done.
- First read the plan and the files it names, because the code may have moved on since it was written. Then build it in small commits.
- **New dependencies:**
  - Pin exact versions.
  - Vet each one (maintenance, licence, code) and note it in the plan.
  - Anything that touches secrets or financial data gets our own small native plugin, not a third-party one.
- Ask before changing `ios/` or `android/` and before committing, as CLAUDE.md and REDESIGN.md do.
- Tick the plan off in [Status](#status) and keep notes in the plan file.

## Gates (end of every plan)

- **Checks:** `npm run check` (since plan 01).
- **Colours:** `npm run audit:contrast` when a colour changed.
- **UI review:** `node scripts/ui-review.mjs --only <changed screens>`, before and after.
  - No new small targets, overflow or truncation in DE + AR, light + dark, on SE and Pro Max.
  - New screens also get a pass with `--text 2`.
- **Old data:** `localStorage` data and backups from earlier versions still load (plan 01's fixtures).
- **Native plans:** tested on a real iPhone, and on Android devices from plan 23 on.
- **User-visible changes:** update docs/features.md (features), CLAUDE.md (rules) and the What's New text in `store/listing.md`.
- **Simplicity:** run plan 37's checklist after plans 06a, 13, 21 and 32 as well.

## Decisions already taken

Change them here if you disagree, before the plan that depends on them starts.

| Decision | Why | Plans |
|---|---|---|
| No iCloud or CloudKit, and no sync. A new phone gets the book from a backup file. | Everything stays local. | 03, 04 |
| The data file is part of the phone's own backup by default; one switch leaves it out. | Lost data is the angriest complaint about competitors, and the OS backup is under the user's control. | 02, 06, 23 |
| Bank connection only via on-device FinTS, opt-in, after a feasibility check. | No aggregator server. | 36 |
| Cash and savings accounts get built, but stay invisible until a second account exists. | Users ask to track cash. PLAN.md's "one account" stays the default view. | 30 |
| A month that starts on payday is optional and off by default. | Requested, but it touches every date rule. | 32 |
| No paid tier. | Free for all users. | all |
| Notifications, widgets, the lock screen and a shared year review show no amounts by default. | People can read them over your shoulder. | 00, 13, 14 |
| Exports are encrypted by default. Plain export is one switch away. | Financial data in a mail attachment or a shared folder. | 04 |
| In every statistic, money put into a savings category counts as saved, not spent. The month page keeps the account view. | Sparquote and 50/30/20 must agree (STATISTICS_AND_INSIGHTS.md D1). | 06a, 13 |
| Statistik looks back, Planen looks ahead. At most three hints per screen, ranked, each with a next step. | One time scope per section, and hints that lead somewhere (D2). | 06a, 13 |
| No financial health score: *Finanz-Check* shows the indicators themselves. | A single score is opaque and judgmental (D4). | 06a, 11, 12 |
| Forecasts are ranges, rounded, and name their basis; *Ausblick* replaces *Prognose*. | A forecast with cents reads as a promise (D6). | 06a, 11 |

## Order

Only the plans still open have a file here. A finished plan's file is deleted once it is built (November 2026: 00–15, 06a, 18, 20, 21, 26–32); what it built is described in `docs/CLAUDE.md` and `docs/features.md`, its one-line result is under [Status](#status) below, and the file itself is in the git history (`git log --diff-filter=D -- plans/`).

### Phase 3 — native foundation and store presence
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 16 | [Store listing, accessibility labels, permission texts](16-store-listing.md) | S1, S2, S5 | 00 | S | iOS strings |

### Phase 4 — capture without typing
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 19 | [Apple Pay, bank notifications, "Teilen an Spartopf"](19-automatic-capture.md) | F8 | 14, 18 | M–L | iOS |

### Phase 5 — reach
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 23 | [Android app](23-android.md) | F20 | 02, 05, 06 | L | Android |
| 24 | [Android capture and widgets](24-android-capture.md) | F8, F18 on Android | 23, 19 | L | Android |
| 25 | [Turkish and more languages](25-languages.md) | F27 | 07, 16 | M per language | strings |

### Phase 8 — bank connection without a server
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 36 | [On-device bank connection (FinTS)](36-fints.md) | F11 | 05, 06, 10, 20, 30 | XL | iOS/Android |

### Phase 9 — launch
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 37 | [Simplicity review](37-simplicity-review.md) | simplicity | all | M | — |
| 38 | [Screenshots, story and release](38-release.md) | S4 | 37 | M | — |

F/U/S numbers refer to sections 7 and 8 of COMPETITOR_ANALYSIS.md.

## What users ask for → plan

From COMPETITOR_ANALYSIS.md §4 (reviews of the 13 competitors).

| Request or complaint | Plan |
|---|---|
| Capture without typing (bank messages, Apple Pay) | 18, 19, 24 |
| Budgets per category | 00 (step 4) |
| Reminders for bills | 00 (step 11) |
| App lock | 00 (step 12), 06 |
| Contracts and notice periods | 00 (step 9) |
| Lost data, broken backups, failed restores on a new phone | 02, 03, 04 |
| Track cash | 30 |
| Adjust to the real bank balance | 10 |
| Other currencies (CHF and others) | 07 |
| Own rules, leave transfers out, choose which bookings a category change hits | 20, 30 |
| Item-level tracking | 21 |
| Budgeting as a couple | not planned (34 was dropped) |
| Bank sync (and complaints that it keeps breaking) | 36, with CSV/screenshot/Apple Pay as fallbacks |
| Wrong totals | 01 (golden data), 06a (one meaning of *gespart*), 30 (transfers) |
| Looking ahead: a warning before a yearly bill, what's left until the month ends | 06a (*Ausblick*, *November bis heute*), 11 |
| Updates that make the app slower or cluttered | 01 (performance budgets), 37 |
| More languages | 25 |
| Android | 23 |
| Savings goals, yearly bills, debts, receipts, tags, PDF, payday month | 12, 11, 31, 27, 26, 28, 32 |
| Spending by shop | already there (payee card); a payee sheet in 06a |
| Subscriptions and lost purchases | not applicable: free, nothing to buy |

## Known issues → plan

| Issue | Where | Plan |
|---|---|---|
| All data in the web view's `localStorage`, which iOS may clear | `src/store.ts` | 02 |
| No automatic backup | — | 03 |
| Backups are readable plain JSON | `BackupGroup.tsx` | 04 |
| CSV export can run formulas (CSV injection) | `toCsv()` in `src/logic.ts` | 05 |
| `.xlsx` unzipped without a size limit (zip bomb) | `readXlsx()` in `src/xlsx.ts` | 05 |
| No size limits on imports | importers | 05 |
| No Content-Security-Policy | `index.html` | 05 |
| Currency hard-coded to EUR | `moneyFormat()` and friends in `src/logic.ts` | 07 |
| Permission prompts in English only | `ios/App/App/Info.plist` | 16 |
| Store listing and App Review note out of date | `store/listing.md` | 16 |
| Arabic € placement inconsistent (REDESIGN.md §9) | translations | 16 |
| No Android app | — | 23 |
| Sparquote and 50/30/20 disagree once a savings category is used | `monthSeries` / `budgetSplit` in `src/insights.ts` | 06a |
| *Notgroschen* divides today's balance by all spending | `InsightsView.tsx` | 06a |
| "Usual" is a plain mean, yearly bills look unusual, the forecast shows cents | `unusual()`, `forecast()` in `src/insights.ts` | 06a |
| Statistik can show a started future month as if it were real | `StatsView.tsx` | 06a |
| German chart axes mix "4000" and "20.000" | `compact()` in `Charts.tsx` | 06a |

## Status

- [x] 00 Finish the redesign — built and checked in the browser; reminders and the lock still to be tried on an iPhone (see the plan's notes)
- [x] 01 Quality and privacy gates — `npm run check` passes locally; CI not run yet (nothing pushed)
- [x] 02 Durable storage — built and tested; the iPhone test (wipe WebKit data, relaunch) is still to do
- [x] 03 Automatic backups and restore — built and `npm run check` passes; snapshots, pruning and restore are tested. The on-device test (move the clock forward, restore, undo) is still to do on an iPhone, and the 90-day card's "OS backup is off" half waits for plan 06 (it shows on the 90-day rule alone for now)
- [x] 04 Encrypted backup files — built, `npm run check` passes, crypto round-trip/tamper tested; the on-device AirDrop test and the SE timing check are still to do
- [x] 05 Security hardening — built, `npm run check` passes (now also `check:security`); CSV injection, zip bomb and import limits tested, CSP ships on builds and OCR works under it, deps pinned + audited (fflate → 0.8.3), `SECURITY.md` added. The iOS on-device CSP/OCR check and "links open in the system browser" are still to confirm
- [x] 06 Data protection at rest — built, `npm run check` passes. *Beträge verbergen* (a switch in `logic.ts` every money formatter follows, the eye on the balance card, the app-switcher cover), *Im iPhone-Backup sichern* (the book moves between Library and Library/NoCloud, file by file; tested with a move stopped at every step), Data Protection class Complete (entitlement + `protectBookFiles()`), and failed writes retried on resume. Still to do on an iPhone: the protection log and a locked read, a Finder-backup listing after each switch, VoiceOver, and the encryption spike (two iPhones), whose result goes into `SECURITY.md`
- [x] 06a Statistics and insights — built with plan 13, `npm run check` passes; VoiceOver, the SE's long tasks, the usability test and a native Arabic read are still to do (see the plan's notes)
- [x] 07 Currency — built, `npm run check` passes; regional default + a Darstellung setting, formatters/parse/CSV/import all follow it, schema 11 (optional `AppData.currency`), tested. ui-review in CHF/GBP/SAR still to do
- [x] 08 Calculator in the amount field — built, `npm run check` passes; `evalAmount` tested (precedence, formats, Arabic digits, caps), operator key row above the keyboard. On-device SE keyboard capture still to do
- [x] 09 Favourites — built, `npm run check` passes; pin from the entry sheet, one-tap add (with undo) via chips, manage screen (reorder/remove), schema 12, normalization tested. ui-review on device still to do
- [x] 10 Match the bank balance — built, `npm run check` passes; `reconcile()` tested (less/more/equal/overridden/date), book-entry or adjust-opening with undo, "Abgeglichen am" on the card. ui-review on device still to do
- [x] 11 Reserve for yearly bills — built, `npm run check` passes; `yearlyReserve()` tested, card on Planen shown only with a yearly entry. "Als Spartopf anlegen" waits for plan 12. ui-review on device still to do
- [x] 12 Savings goals — built, `npm run check` passes; schema 13 (`goals`, `Entry.goalId`), `goalProgress` tested, Planen card + pushed Spartöpfe screen (create/edit/withdraw/close/delete, all undoable), goal pill on Sparen entries, plan 11's "Als Spartopf anlegen". Skipped the first-goal "pick a Sparen category" prompt (Geldanlage already ships as save); ui-review/VoiceOver on device still to do
- [x] 13 Month report and year review — built with 06a (before 07–12; the goal line waits for plan 12)
- [x] 14 Native bridge — built, `npm run check` passes. `MainViewController` + our own plugin `SpartopfShared` (App Group snapshot and inbox, `completeUntilFirstUserAuthentication`), the `spartopf://` scheme, and `src/native/` with `buildSnapshot` (no amount fields unless allowed), `inboxToEntries` (checked, booked through the import path, refs against doubles) and `parseDeepLink`, all tested. Swift not compiled yet. Still to do on an iPhone: the App Group on the App ID, the debug round trip, an inbox item with the app closed, and the links
- [x] 15 Ratings and feedback — built, `npm run check` passes. `shouldAskForReview` (14 days, 30 own entries, a good moment, no trouble this session, 120 days between asks; tested), Apple's prompt via `SpartopfShared.requestReview`, and *Über Spartopf* with *Spartopf bewerten*, *Feedback senden* and *Datenschutz* (`src/links.ts`). Still to do on an iPhone: the prompt with a development build, the three rows, and the review link once the app is live
- [ ] 16 Store listing, accessibility labels, permission texts — listing (DE/EN/AR), review note, privacy policy and permission prompts (14 languages) done; accessibility labels (device check) and the Arabic € placement still open
- [x] 18 Siri and Shortcuts — built, compiled with release 1.2.7: three App Intents in the app target, phrases and answers in DE / EN / AR, entries through the inbox (`source: "siri"`), amounts from a Complete-protected `amounts.json` written only while the app lock is off. Device check still to do
- [ ] 19 Apple Pay, bank notifications, "Teilen an Spartopf" — steps 1, 2 and 4 built, `npm run check` passes: two Shortcuts actions (Swift, not compiled yet), `parseNotificationText` (tested with made-up samples), *Gleich buchen* / *Erst prüfen* with *Neu: n* on the month, the guide under *Optionen › Automatisch erfassen*. Open: the share extension (a new Xcode target), real notification texts, the device check
- [x] 20 Import rules and other apps — built, `npm run check` passes; schema 15 (`AppData.rules`), rule engine in `planStatement` (set/skip, order) tested, scope menu on a correction, Regeln screen, other-app columns recognised + auto-mapping fallback (`csvForMapping`/`parseMappedCsv` tested). Plan-19 inbox is native (n/a here); an interactive mapping sheet is a noted follow-up. Also stabilised the flaky 10-year perf test with `retry`
- [x] 21 Split a payment — built, `npm run check` passes; schema 16 (`Entry.splitId`), `splitParts`/carry-over/import-match tested, "Aufteilen" in the editor → SplitSheet, parts share a splitId (balances unchanged). Delete-scope prompt + richer caption are noted follow-ups; perf baseline raised to 280 kB with a note
- Dropped (decided November 2026): 17 widgets, 22 iPad and wide screens, 33 device-to-device transfer, 34 nearby sync and household sharing, 35 Apple Watch. Spartopf stays a phone app (Android: plan 23) whose data moves by backup file; the plan files and the two-column layout built for 22 are removed.
- [ ] 23 Android app — steps 1 and 2 built, `npm run check` passes and Gradle builds a debug APK and a release bundle: `android/` (Capacitor 8.6), its own native plugin (links, PDF through the print dialog, FLAG_SECURE with the lock), backup rules for `files/spartopf/` only, Android's wording in 14 languages, Nunito for amounts, the system back, Pixel sizes in ui-review, `release-android.js`, the Play listing. **Never run on a device.** Open: two phones, the upload key, the Play Console (`docs/ANDROID_RELEASE.md`, TODO.md)
- [ ] 24 Android capture and widgets
- [ ] 25 Turkish and more languages
- [x] 26 Tags — built, `npm run check` passes; schema 14 (`Entry.tags`), `normalizeTags`/`tagTotals` tested, `#tag` search, entry-sheet "# Tag", Statistik Tags breakdown, CSV tags column (injection-guarded). ui-review on device still to do
- [x] 27 Receipts and documents — built for the web and iPhone, `npm run check` passes (it now attaches a photo with EXIF and checks that none is stored): schema 22 (`Entry.files`), files beside the book, photos re-encoded, *Beleg* in the entry sheet with viewer and *Betrag vom Beleg lesen*, receipts inside the backup, removed with *Alle Daten löschen*. Android follows with plan 23; device check still to do
- [x] 28 PDF report — built, `npm run check` passes. *Bericht teilen* under the Monatsbericht and the Jahresrückblick: `PrintReport` (the shared report bodies, an optional entries table, a footer; light, with amounts even when hidden on screen), the print stylesheet, `SpartopfShared.makePdf` (UIPrintPageRenderer → share sheet) and `window.print()` on the web. Checked through Chromium's print-to-PDF in DE, AR and a long year. Still to do on an iPhone: the PDF from the share sheet and a paper print
- [x] 29 Periods and year comparison — core built, `npm run check` passes; `periodSeries`/`compareYears`/`bookYears` tested, a year picker + a "Mit Vorjahr vergleichen" line in Statistik. The faint last-year chart outlines and the Wofür change-vs-last-year chips are a noted follow-up (Charts.tsx surgery); ui-review on device still to do
- [x] 30 Cash and savings accounts — built, `npm run check` passes; schema 20 (`AppData.accounts`, `Entry.accountId`, `Entry.transfer`, `MonthRecord.openings`), balances per account and for all, transfers as linked pairs outside every total, *Optionen › Konten*, the balance card's switch, *Umbuchen*, the entry sheet's account pill, Planen's *Vermögen*, imports into the shown account. Goals pointing at a savings account are a noted follow-up; device check still to do
- [x] 31 Debts and loans — built, `npm run check` passes; schema 21 (`AppData.debts`, `Entry.debtId`), `debtSchedule`/`annuityPayment` tested against the published tables, *Optionen › Schulden und Kredite*, the debt sheet, Planen's *Schulden* card (only with a debt), the entry sheet's debt pill. The reminder for money lent is a noted follow-up; device check still to do
- [x] 32 Month from payday — built, `npm run check` passes; schema 23 (`AppData.monthStart`), `periodOf`/`periodRange`/`changeMonthStart` tested (golden data round trip 1 → 16/25/28 → 1), *Optionen › Haushaltsbuch › Monat beginnt am* with a preview and undo, dates under the month title. iPhone check in TODO.md.
- [ ] 36 On-device bank connection (FinTS)
- [ ] 37 Simplicity review — checkpoint after plan 32 done, `npm run check` passes: the feature table, the first-viewport counts, *Optionen › Haushaltsbuch* reordered, and the tip system (`src/tips.ts`, five tips, one a week, tested). Open: the three-people test, VoiceOver / large text, speed on old phones (TODO.md)
- [ ] 38 Screenshots, story and release
