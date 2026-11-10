# 32 · Month from payday

- **Covers:** F6. Money Manager and MoneyControl let the month start on another day; Finanzguru counts until the next salary.
- **Depends on:** 30 (do this once the account changes have settled), 01 (golden data)
- **Size:** L–XL
- **Native:** none
- **Schema:** bump (a setting plus a migration rule)

## Why

Many households plan from one salary to the next. A month that runs from the 25th to the 24th matches how they budget.

## What the user gets

- **Setting:** *Optionen › Haushaltsbuch › Monat beginnt am*, either the 1st (default) or any day up to the 28th.
- **Naming:** a month is named after the calendar month most of its days fall in. For example, "November" runs from 25 Oct to 24 Nov.
- **Where it shows:** the month title's subline gives the dates.

## Keep it simple

The default stays the calendar month. The setting is one menu row.

## Design

- **Dates are the truth.**
  - `Entry.date` stays as it is.
  - `Entry.month` becomes the period key, computed by `periodOf(date, startDay)`.
  - Entries without a date stay in their month.
- **One function, `periodOf`, replaces calendar maths in:**
  - `monthKeyOf`, `defaultEntryDate`, `isOverdue` and `carryCandidates`
  - `excelImport` and `statementImport`, where a date picks the month
  - budgets (`elapsed`) and `leftPerDay`
- **Changing the start day:**
  - Every dated entry is moved into its new period.
  - A preview comes first, e.g. "38 Einträge wechseln den Monat".
  - It can be undone.
  - Month records and opening balances move along.
- **Feature flag:** keep it behind a flag until the golden data passes with both settings.

## Tests and checks

- With start day 1, the golden data is unchanged.
- With start day 25: every date rule, carry-over, budgets and import.
- Switching back to day 1 restores the original months.
- Months with 28, 29, 30 and 31 days.

## Done when

- [x] With start day 1 nothing changes. (All earlier tests and the golden data pass untouched.)
- [x] With start day 25, every rule follows the period. (`src/period.test.ts`: dates, overdue, carry-over, budgets, pace, left per day, bank import, sorting.)
- [x] Switching back restores the original months. (Golden data from the 1st to the 16th, 25th and 28th and back: the same entries, months and balances.)

## Notes (built)

Where the build differs from the plan above:

- **No feature flag.** The plan kept it behind a flag until the golden data passed with both settings; it does, so the setting is simply there, and off (the 1st) by default.
- **Naming rule, made exact:** a start up to the 15th names the month after the calendar month it starts in, a later one after the next. That is "the month most of its days fall in" without a tie-break in February.
- **A sheet, not a menu:** the row opens a sheet with the days 1–28, the dates the running month would cover and "Einträge, die den Monat wechseln: 80" (worded without a plural, like the other counts). *Sichern* applies it; the toast undoes it.
- **Balances stay.** Changing the day keeps every account's balance from each month on: a manual opening is adjusted by the paid entries that crossed it, the first month's opening moves along if entries land before it, and a month the change emptied is dropped.
- **Entries without a date** stay in their month; a legacy due day (no date) is read inside the period.
- **Excel import** reads months from tab names and has no dates, so nothing changes there.
- **Siri (plan 18):** `amounts.json` now says until which day it holds (`until`), and the intent checks it — one line in `SpartopfIntents.swift`. Around the turn of a calendar month inside a period Siri may ask to open the app once.
- **Widgets (plan 17)**, when built, must take the period from the snapshot, not from the calendar.
