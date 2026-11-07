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

- [ ] With start day 1 nothing changes.
- [ ] With start day 25, every rule follows the period.
- [ ] Switching back restores the original months.
