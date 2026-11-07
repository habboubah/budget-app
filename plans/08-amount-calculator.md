# 08 · Calculator in the amount field

- **Covers:** F4. Monefy and Money Manager have one.
- **Depends on:** 00 (entry sheet v2, amount first)
- **Size:** S
- **Native:** none
- **Schema:** no change

## Why

A receipt with three items, a bill split in half, a refund taken off: today that's mental maths before typing. The iOS decimal pad has no + or −, so the app has to offer them itself.

## What the user gets

- While the amount field is focused, a slim row of keys sits above the keyboard: `+  −  ×  ÷`.
- Typing `12,50+4,80` shows "= 17,30 €" next to the field.
- Saving stores the result, 17,30 €.

## Keep it simple

The row only appears while an amount is being typed. Typing a plain amount works exactly as before.

## Design

- **`evalAmount(text, locale): number | null` in `src/logic.ts`:**
  - Operands go through `parseAmount()`, so "1.050,50", Arabic digits and the currency symbol all work.
  - Operators: `+ - × ÷ * /`, with normal precedence and no parentheses.
  - At most 12 operands. The result is rounded to cents.
  - Returns null for a negative result, a division by zero or anything unparseable.
  - No `eval` and no `Function`.
- **`EntrySheet.tsx`:**
  - The key row sits on the bottom of the visual viewport, the same way the sheet itself follows the keyboard.
  - Keys are 44 pt, with `aria-label`s "plus", "minus", "mal" and "geteilt durch".
  - The live result is announced politely (`aria-live="polite"`) after a short pause, not on every keystroke.
- **Editing an existing entry:** the field shows the stored amount, never an old expression.

## Tests and checks

- Precedence: `2+3×4` = 14.
- German and English decimal and thousands marks; Arabic digits.
- A trailing operator waits for the next digit.
- Invalid input keeps the save button disabled.
- ui-review keyboard captures (`-kb`) on SE: the key row doesn't cover the amount.

## Done when

- [ ] Expressions work with every number format the field already accepts.
- [ ] The row works with VoiceOver and hides nothing on SE.

## Not in this plan

A full calculator with memory or percentages.
