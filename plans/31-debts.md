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

- [ ] Schedules match the reference calculations.
- [ ] The card only exists for users who have debts.
