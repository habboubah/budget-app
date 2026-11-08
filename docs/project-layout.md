# Project layout

Where the code lives.

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
| `plans/` | Numbered feature plans; `plans/README.md` has the order and the rules for finishing one |
| `docs/` | This documentation |
| `.claude/skills/` | Design / UX / animation / release skills from shopping-list and pizza-driver-log |

See [CLAUDE.md](../CLAUDE.md) for the conventions and [PLAN.md](../PLAN.md) for the
concept and the money rules.
