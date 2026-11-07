# 11 · Reserve for yearly bills

- **Covers:** F3, like YNAB's "Cost to Be Me". Finanzguru reviewers praise being warned early about the yearly Kfz-Steuer.
- **Depends on:** 00 (*Planen*)
- **Size:** S
- **Native:** none
- **Schema:** no change

## Why

Yearly bills (Kfz-Steuer, insurance, the ADAC membership) make one month look terrible, and the other months look better than they really are.

## What the user gets

A card on *Planen*, **Rücklage für jährliche Kosten**, shown only when the book has a yearly entry:

- "Leg 42 € im Monat zurück": the yearly total ÷ 12, rounded up to whole euros.
- The next three yearly bills, e.g. "Kfz-Steuer · März · 304 €".
- Whether the coming months' *Am Monatsende* covers them, or e.g. "im März fehlen 120 €".
- Once plan 12 is done, **Als Spartopf anlegen** turns the reserve into a savings goal.

## Keep it simple

There's no setting. Like the existing hints, the card appears by itself when it has something to say.

## Design

- `yearlyReserve(data, month, today)` in `src/insights.ts`.
  - It builds on `commitments()`, which already returns `yearly`.
  - It returns `{ monthly, upcoming: { name, month, amount }[], shortfall?: { month, amount } }`.
- The shortfall uses the same average-saved logic as `forecast()`.

## Tests and checks

- No yearly entries → no card.
- Bills spread over the year.
- Two bills in the same month.
- A shortfall.
- A bill that's already paid this year.

## Done when

- [ ] The card shows for books with yearly entries, and only those.
- [ ] Its figures match the tests.
