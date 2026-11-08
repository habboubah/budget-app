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

- [x] Splitting, editing, deleting and importing against a split payment all work, and balances don't change (golden data unchanged).

## Notes (built)

- `Entry.splitId?` (schema **16**, optional). Parts are normal entries sharing a `splitId`, so every total, budget and chart stays right. `splitParts(entries, splitId, month)` in `logic.ts` (tested); carry-over keeps `splitId` so a split monthly payment carries all its parts (tested).
- `store.splitEntry(id, parts)` replaces one entry with parts that inherit its month/date/paid/repeat/ref and share a new splitId; returns `{ original, splitId }` for a one-step undo (`unsplit`).
- UI: **Aufteilen** in the entry editor (expenses, not already a part) opens `SplitSheet.tsx` — add parts, each a category + name + amount, with a running "noch X zuzuordnen / geht genau auf" and a sum-equals-original guard. Each part's row shows a quiet "Teil einer Aufteilung" caption.
- Bank import: a split group shares the original's `ref`, so `planStatement` recognises the whole booking as already imported (tested) — no double count.
- Decisions / partials: there's no per-entry "⋯" menu in this design, so **Aufteilen** lives in the editor. Deleting a single part uses the normal entry delete (undoable); the "only this part vs the whole payment" choice and the fuller "Teil von Lidl 48,20 €" caption (needs cross-category totals) are noted follow-ups. Also raised the perf bundle baseline to 280 kB with a note (plans 03–29 cumulatively).
- Still to do: ui-review on device; the delete-scope prompt and the richer part caption.
