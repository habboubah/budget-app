# 11 · Reserve for yearly bills

- **Covers:** F3, like YNAB's "Cost to Be Me". Finanzguru reviewers praise being warned early about the yearly Kfz-Steuer.
- **Depends on:** 06a (*Planen*'s order and `outlook()`)
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
- *Finanz-Check › Vorausgeplant* (plan 06a) links to this card.

## Keep it simple

There's no setting. Like the existing hints, the card appears by itself when it has something to say.

## Design

- `yearlyReserve(data, month, today)` in `src/insights.ts`.
  - It builds on `commitments()`, which already returns `yearly`.
  - It returns `{ monthly, upcoming: { name, month, amount }[], shortfall?: { month, amount } }`.
- The shortfall comes from `outlook()` (plan 06a), so this card and *Ausblick* never disagree.

## Tests and checks

- No yearly entries → no card.
- Bills spread over the year.
- Two bills in the same month.
- A shortfall.
- A bill that's already paid this year.

## Done when

- [x] The card shows for books with yearly entries, and only those.
- [x] Its figures match the tests.

## Notes (built)

- `yearlyReserve(book, today, ahead?)` in `src/insights/reserve.ts` (tested). Built on `commitments()` (the yearly entries → `monthly` = yearly total ÷ 12, rounded **up** to whole euros) and `outlook()`/`bigItems()` (the next yearly bills a year on, and the shortfall), so it never disagrees with *Ausblick*. Returns `{ monthly, upcoming[], shortfall? }`; null without a yearly entry.
- `ReserveCard.tsx` renders on *Planen* in the plan-11 slot, only when `yearlyReserve` is non-null (the view passes the shared `outlook()` so it's computed once). New strings `reserveTitle`/`reserveMonthly`/`reserveShortfall`/`reserveCovered`/`reserveUpcoming` in de/en/ar.
- Note: the plan mentioned a `commitments()` returning `yearly` — that function exists in `rules.ts` and is what this uses.
- **Als Spartopf anlegen** (turn the reserve into a savings goal) and the *Finanz-Check › Vorausgeplant* link wait for plan 12; left out here as that plan notes.
- Still to do: ui-review on device.
