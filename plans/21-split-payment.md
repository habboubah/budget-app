# 21 · Split a payment

- **Covers:** item-level tracking, which Cashew reviewers ask for; one supermarket receipt that covers both food and household goods
- **Depends on:** 00, 20
- **Size:** M
- **Native:** none
- **Schema:** bump (`Entry.splitId?`)

## What the user gets

- **Aufteilen** in an entry's "⋯" menu turns "Lidl 48,20 €" into "Lebensmittel 35,10 € · Drogerie 13,10 €".
- Each part sits in its own category card with a small line, "Teil von Lidl 48,20 €".
- Tapping that line opens the split.

## Keep it simple

It's only in the menu. A payment stays one entry until someone splits it.

## Design

- **Parts** are normal entries that share a `splitId`, so every total, budget and chart stays right without any changes.
- **The sheet** shows how much is still unassigned. The parts must add up to the original amount.
- **Bank import:** an imported payment keeps its `ref` on every part. `planStatement()` treats a split group as one booking when matching: the sum of the parts equals the bank amount.
- **Deleting a part** asks: only this part (the rest stays), or the whole payment. Both can be undone.
- **Carry-over:** a split monthly payment carries all its parts into the next month.

## Tests and checks

- Splitting and editing.
- Deleting one part, deleting all parts.
- A CSV import that matches a split payment.
- Carry-over of a split monthly payment.
- Balances unchanged (golden data).

## Done when

- [ ] Splitting, editing, deleting and importing against a split payment all work, and balances don't change.
