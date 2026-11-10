# 31 · Debts and loans

- **Covers:** F7: YNAB's Loan Planner, and debt tracking in Goodbudget, Wallet and Money Manager
- **Depends on:** 00, 30
- **Size:** M
- **Native:** none
- **Schema:** bump (`AppData.debts?`)

## What the user gets

*Planen › Schulden* appears once the first debt exists. For a loan or debt it shows:
- what's still left to pay;
- the monthly payment;
- the payoff month, e.g. "schuldenfrei im August 2028";
- with an interest rate entered, the interest still to pay.

Money lent to family or friends appears as "Mir geschuldet".

## Keep it simple

The card doesn't exist until the user adds a debt.

## Design

- **The debt:** `Debt = { id, name, direction: 'owe' | 'owed', principal, start: MonthKey, rate?, payment?, seriesId? }`.
- **Payments** come from the linked recurring entry (`seriesId`).
- **The maths:** `debtSchedule(debt, payments, today)` in `src/insights.ts`, an annuity with monthly compounding.
- **Optional reminder** for "Mir geschuldet", as a source in plan 00's reminder scheduler.

## Tests and checks

- The schedule against published annuity tables.
- A loan without interest.
- Extra payments.
- Money lent to someone.

## Done when

- [x] Schedules match the reference calculations. (`annuityPayment`: 10.000 € at 5 % over 36 months is 299,71 €, 200.000 € at 6 % over 30 years 1.199,10 €; the schedule pays the first off in exactly 36 months with the interest the tables give.)
- [x] The card only exists for users who have debts.

## Notes (built)

- **Data (schema 21):** `Debt { id, name, direction, principal, start, rate?, payment?, seriesId?, createdAt }` in `AppData.debts`, and `Entry.debtId`. The plan's design had no `debtId`; it is added so that extra payments and money paid back can be linked from the entry sheet. `normalizeState` drops a link to a debt that isn't there. Fixture `storage-v21.json`.
- **The maths** is in `src/insights/debts.ts`, not `src/insights.ts` (that file became a folder). Interest runs from the month after `start`, compounded monthly and rounded to the cent; then the month's payments come off. Ahead of today the monthly payment is projected (the debt's own, else the linked series' latest amount). This month's payment counts as the first planned one if it hasn't been made. More than 50 years, or a payment below the interest, gives `never`.
- **Screens:** *Optionen › Haushaltsbuch › Schulden und Kredite* (the way in for the first one; empty state, then *Ich schulde* and *Mir geschuldet* with totals). `DebtSheet` shows the summary on top when editing. Planen's `DebtsCard` (in plan 13's slot), the entry sheet's *Zu einer Schuld* pill.
- **Not done yet:** the optional reminder for money lent (a source in the reminder scheduler).
- **Still to do on an iPhone:** see TODO.md.
