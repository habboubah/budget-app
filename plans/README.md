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
   - Devices sync with each other directly (plans 33–34), never through a cloud.
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
- **User-visible changes:** update README.md (features), CLAUDE.md (rules) and the What's New text in `store/listing.md`.
- **Simplicity:** run plan 37's checklist after plans 06a, 13, 21 and 32 as well.

## Decisions already taken

Change them here if you disagree, before the plan that depends on them starts.

| Decision | Why | Plans |
|---|---|---|
| No iCloud or CloudKit. Devices sync directly, by file or over the local network. | Everything stays local. | 33, 34 |
| The data file is part of the phone's own backup by default; one switch leaves it out. | Lost data is the angriest complaint about competitors, and the OS backup is under the user's control. | 02, 06, 23 |
| Bank connection only via on-device FinTS, opt-in, after a feasibility check. | No aggregator server. | 36 |
| Cash and savings accounts get built, but stay invisible until a second account exists. | Users ask to track cash. PLAN.md's "one account" stays the default view. | 30 |
| A month that starts on payday is optional and off by default. | Requested, but it touches every date rule. | 32 |
| No paid tier. | Free for all users. | all |
| Notifications, widgets, the lock screen and a shared year review show no amounts by default. | People can read them over your shoulder. | 00, 13, 14, 17 |
| Exports are encrypted by default. Plain export is one switch away. | Financial data in a mail attachment or a shared folder. | 04 |
| In every statistic, money put into a savings category counts as saved, not spent. The month page keeps the account view. | Sparquote and 50/30/20 must agree (STATISTICS_AND_INSIGHTS.md D1). | 06a, 13 |
| Statistik looks back, Planen looks ahead. At most three hints per screen, ranked, each with a next step. | One time scope per section, and hints that lead somewhere (D2). | 06a, 13 |
| No financial health score: *Finanz-Check* shows the indicators themselves. | A single score is opaque and judgmental (D4). | 06a, 11, 12 |
| Forecasts are ranges, rounded, and name their basis; *Ausblick* replaces *Prognose*. | A forecast with cents reads as a promise (D6). | 06a, 11 |

## Order

### Phase 0 — finish what's in flight
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 00 | [Finish the redesign](00-finish-redesign.md) | F1, F12, F13, F16, F17, U1, U3 | — | L | iOS |

### Phase 1 — trust, safety, security
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 01 | [Quality and privacy gates](01-quality-and-privacy-gates.md) | regressions, privacy proof | 00 | M | — |
| 02 | [Durable storage](02-durable-storage.md) | F23 | 01 | M | config |
| 03 | [Automatic backups and restore](03-automatic-backups.md) | F23 | 02 | M | — |
| 04 | [Encrypted backup files](04-encrypted-backups.md) | security | 03 | S–M | — |
| 05 | [Security hardening](05-security-hardening.md) | security issues found | 04 | M | — |
| 06 | [Data protection at rest](06-data-protection-at-rest.md) | security, privacy | 02, 00 | M | iOS |

### Phase 2 — everyday wins
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 06a | [Statistics and insights](06a-statistics-and-insights.md) | U4; STATISTICS_AND_INSIGHTS.md phases 0–3 | 00, 01 | L | — |
| 07 | [Currency](07-currency.md) | F26 | 00 | S–M | — |
| 08 | [Calculator in the amount field](08-amount-calculator.md) | F4 | 00 | S | — |
| 09 | [Favourites](09-favourites.md) | U5 | 00 | S–M | — |
| 10 | [Match the bank balance](10-match-bank-balance.md) | U6 | 00 | S | — |
| 11 | [Reserve for yearly bills](11-yearly-reserve.md) | F3 | 06a | S | — |
| 12 | [Savings goals (Spartöpfe)](12-savings-goals.md) | F2 | 11 | M | — |
| 13 | [Month report and year review](13-month-review.md) | U2; STATISTICS_AND_INSIGHTS.md phase 4 | 06a, 12 | M | — |

### Phase 3 — native foundation and store presence
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 14 | [Native bridge](14-native-bridge.md) | groundwork | 02, 06 | M | iOS |
| 15 | [Ratings and feedback](15-ratings-and-feedback.md) | S3 | 14 | S | iOS |
| 16 | [Store listing, accessibility labels, permission texts](16-store-listing.md) | S1, S2, S5 | 00 | S | iOS strings |

### Phase 4 — capture without typing
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 17 | [Widgets and controls](17-widgets.md) | F18 | 14, 09 | L | iOS |
| 18 | [Siri and Shortcuts](18-siri-shortcuts.md) | F19 | 14, 09 | M | iOS |
| 19 | [Apple Pay, bank notifications, "Teilen an Spartopf"](19-automatic-capture.md) | F8 | 14, 18 | M–L | iOS |
| 20 | [Import rules and other apps](20-import-rules.md) | F9 | 19 | M | — |
| 21 | [Split a payment](21-split-payment.md) | user request | 20 | M | — |

### Phase 5 — reach
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 22 | [iPad and wide screens](22-ipad.md) | F21 | 17 | M | iOS |
| 23 | [Android app](23-android.md) | F20 | 02, 05, 06 | L | Android |
| 24 | [Android capture and widgets](24-android-capture.md) | F8, F18 on Android | 23, 19 | L | Android |
| 25 | [Turkish and more languages](25-languages.md) | F27 | 07, 16 | M per language | strings |

### Phase 6 — deeper money features
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 26 | [Tags](26-tags.md) | F14 | 00 | M | — |
| 27 | [Receipts and documents](27-receipts.md) | F10 | 02, 04, 06 | M–L | — |
| 28 | [PDF report](28-pdf-report.md) | F15 | 13, 14 | S–M | iOS/Android |
| 29 | [Periods and year comparison](29-periods.md) | U7 | 06a, 13 | M | — |
| 30 | [Cash and savings accounts](30-accounts.md) | F5 | 20, 21 | L | — |
| 31 | [Debts and loans](31-debts.md) | F7 | 30 | M | — |
| 32 | [Month from payday](32-payday-month.md) | F6 | 30 | L–XL | — |

### Phase 7 — more devices, still local
| # | Plan | Covers | Depends on | Size | Native |
|---|---|---|---|---|---|
| 33 | [Device-to-device transfer](33-device-transfer.md) | F24 (local) | 04, 30 | L | iOS/Android |
| 34 | [Nearby sync and household sharing](34-nearby-sync.md) | F24, F25 (local) | 33 | XL | iOS/Android |
| 35 | [Apple Watch](35-apple-watch.md) | F22 | 14, 17 | L | watchOS |

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
| Capture without typing (bank messages, Apple Pay) | 17, 18, 19, 24 |
| Budgets per category | 00 (step 4) |
| Reminders for bills | 00 (step 11) |
| App lock | 00 (step 12), 06 |
| Contracts and notice periods | 00 (step 9) |
| Lost data, broken backups, failed restores on a new phone | 02, 03, 04, 33 |
| Track cash | 30 |
| Adjust to the real bank balance | 10 |
| Other currencies (CHF and others) | 07 |
| Own rules, leave transfers out, choose which bookings a category change hits | 20, 30 |
| Item-level tracking | 21 |
| Budgeting as a couple | 34 |
| Bank sync (and complaints that it keeps breaking) | 36, with CSV/screenshot/Apple Pay as fallbacks |
| Wrong totals | 01 (golden data), 06a (one meaning of *gespart*), 30 (transfers) |
| Looking ahead: a warning before a yearly bill, what's left until the month ends | 06a (*Ausblick*, *November bis heute*), 11 |
| Updates that make the app slower or cluttered | 01 (performance budgets), 37 |
| More languages | 25 |
| iPad, Android, Watch | 22, 23, 35 |
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
| iPhone only | `TARGETED_DEVICE_FAMILY = 1` | 22 |
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
- [ ] 05 Security hardening
- [ ] 06 Data protection at rest
- [x] 06a Statistics and insights — built with plan 13, `npm run check` passes; VoiceOver, the SE's long tasks, the usability test and a native Arabic read are still to do (see the plan's notes)
- [ ] 07 Currency
- [ ] 08 Calculator in the amount field
- [ ] 09 Favourites
- [ ] 10 Match the bank balance
- [ ] 11 Reserve for yearly bills
- [ ] 12 Savings goals
- [x] 13 Month report and year review — built with 06a (before 07–12; the goal line waits for plan 12)
- [ ] 14 Native bridge
- [ ] 15 Ratings and feedback
- [ ] 16 Store listing, accessibility labels, permission texts
- [ ] 17 Widgets and controls
- [ ] 18 Siri and Shortcuts
- [ ] 19 Apple Pay, bank notifications, "Teilen an Spartopf"
- [ ] 20 Import rules and other apps
- [ ] 21 Split a payment
- [ ] 22 iPad and wide screens
- [ ] 23 Android app
- [ ] 24 Android capture and widgets
- [ ] 25 Turkish and more languages
- [ ] 26 Tags
- [ ] 27 Receipts and documents
- [ ] 28 PDF report
- [ ] 29 Periods and year comparison
- [ ] 30 Cash and savings accounts
- [ ] 31 Debts and loans
- [ ] 32 Month from payday
- [ ] 33 Device-to-device transfer
- [ ] 34 Nearby sync and household sharing
- [ ] 35 Apple Watch
- [ ] 36 On-device bank connection (FinTS)
- [ ] 37 Simplicity review
- [ ] 38 Screenshots, story and release
