# 10 · Match the bank balance

- **Covers:** U6. A MoneyControl reviewer asks for exactly this, and Bluecoins users complain that its reconcile button breaks totals.
- **Depends on:** 00
- **Size:** S
- **Native:** none
- **Schema:** optional `MonthRecord.reconciledAt?`

## Why

Sooner or later, the app's *Kontostand jetzt* and the bank's balance differ: a forgotten coffee, a fee. Today the only fix is changing the month's opening balance, which hides where the difference came from.

## What the user gets

In the month's "⋯" menu: **Mit Bank abgleichen**. It opens one sheet:

1. "Was zeigt deine Bank?" with an amount field.
2. The difference ("23,40 € weniger als in Spartopf"), with two choices:
   - **Als Eintrag buchen** (the default) books a paid "Kontoabgleich" entry for the difference. If the bank shows less, it goes in *Sonstiges*; if the bank shows more, in the first income category.
   - **Anfangsbestand anpassen** moves the month's opening balance instead, for people who'd rather not see an entry.
3. An undo toast either way.

The balance card's details then show "Abgeglichen am 7. Nov.". If there's no difference, the sheet shows "Stimmt überein ✓" and saves the date.

## Keep it simple

One menu item, one sheet, one field. No reconciliation workflow and no ticking entries off against statements.

## Design

- `reconcile(balance, bankBalance)` in `src/logic.ts` returns `{ diff, entry?: EntryDraft, opening?: number }`. Tested.
- The second choice uses the existing opening-balance path (`store.setOpening`).
- Later, the bank connection (36) fills in the field with the bank's real balance.

## Tests and checks

- A positive, a negative and a zero difference.
- A month whose opening balance is overridden.
- Next month's carry-over stays correct (golden data).

## Done when

- [ ] Both choices work and can be undone.
- [ ] Next month's carry-over is correct.

## Not in this plan

Automatic matching with bank data (36).
