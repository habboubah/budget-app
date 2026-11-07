# Product: Spartopf – Haushaltsbuch

A private household budget book for iPhone (Capacitor app, bundle id `com.habboubah.spartopf`) and the browser (installable, offline PWA). It digitises Ahmad's monthly Excel sheet (`My_expense.xlsx`): one bank account, one page per month, and two numbers that matter. Concept and money rules: `PLAN.md`. Features in full: `README.md`.

## Core model
- Month (`MonthKey`, `YYYY-MM`): one page each. Entries only live in started months; a new month carries the recurring entries in as open copies.
- Category: income or expense, with emoji, hue, optional monthly budget (`limit`, cents) and a 50/30/20 role (`need` / `want` / `save`). Each month has its own category list.
- Entry: name, amount, date, paid or open (planned / expected), repeat `none` / `monthly` / `yearly`. Copies of one recurring entry share a `seriesId`, so nothing is carried twice.
- Two balances, chained month to month:
  - Jetzt auf dem Konto (`now`) = opening + income received − expenses paid
  - Am Monatsende (`end`) = opening* + all income − all expenses, paid or open
  - A manual opening balance on a month replaces the carry-over (to match the real bank).

## Tabs (id in code)
- Monat (`month`): balance card, one card per category, search across months, Demnächst fällig, bank import.
- Statistik (`stats`): how it went over 6 / 12 months / all; averages use finished months only, never the running one.
- Planen (`insights`): budgets, Abos & Verträge (contracts with notice deadlines), trends, hints, savings rate, 50/30/20, reserve, forecast.
- Optionen (`settings`): categories and budgets, language, theme, accent colour, backup / Excel / CSV, reminders and Face ID lock (native only).

## Data in and out
Excel import, bank CSV import (Sparkasse, ING-style, English exports), OCR of banking-app screenshots on the device, JSON backup and CSV export. Every import shows a preview first and is undoable.

## Product principles (non-negotiable)
1. Everything stays on the device: no server, account, analytics, crash reporter or SDK that phones home. The app makes no request to another origin (`npm run check:privacy` enforces it).
2. Secure by default: outside files are checked before reading; notifications, widgets and the lock screen show no amounts unless the user turns that on.
3. Free for everyone: no ads, no in-app purchases, no paywalled features.
4. Simple for new users: a new feature stays hidden until relevant or lives where people already look ("⋯" menus, Planen, Optionen), adds no required field or first-run step, and has a working default and an undo.
5. The maths is never wrong: money rules are pure, tested functions, and data from every older version still loads.

## Language and glossary
German first (default `de`), plus English and Arabic (right to left). Code, UI and docs use German domain words:

| German | Meaning |
|---|---|
| Einkommen | income |
| Wohnen / Sonstiges | housing / miscellaneous (category ids `fixed` / `extra`) |
| bezahlt / erhalten, offen / erwartet | paid / received, open / expected |
| überfällig | overdue |
| Kontostand, Monatsende | account balance, end of month |
| Abos & Verträge, Kündigungsfrist | subscriptions & contracts, notice period |
| Bedarf / Wünsche / Sparen | need / want / save (50/30/20) |
| Rückgängig | undo |

## Roadmap
Planned work is one file per feature in `plans/` (00–38), built strictly in order; ground rules, decisions and status are in `plans/README.md`. Research and design background: `COMPETITOR_ANALYSIS.md`, `STATISTICS_AND_INSIGHTS.md`, `REDESIGN.md`.
