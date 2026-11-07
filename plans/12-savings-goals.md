# 12 · Savings goals ("Spartöpfe")

- **Covers:** F2 (YNAB, Copilot, Outbank, MoneyControl and Monefy all have goals), and the app's own name
- **Depends on:** 06a (*Planen*), 11
- **Size:** M
- **Native:** none
- **Schema:** bump (`AppData.goals?`, `Entry.goalId?`)

## Why

The app is called "savings pot" and has no pots. Goals are what bring people back to a budget app when nothing is due.

## What the user gets

- ***Planen › Spartöpfe*:** one card per goal, with emoji, name, a progress ring, "620 von 1.200 €" and "noch 97 € im Monat bis Juni".
- **Spartopf anlegen:** name, emoji, target, and optionally "bis wann" and "schon gespart".
- **Putting money in:** in the entry sheet, a category marked *Sparen* (`budget: 'save'`) shows a **Für: Urlaub** pill.
  - A monthly entry with a goal carries over like any other, so a standing order fills the pot by itself.
- **Reaching the target:** a short haptic and "Geschafft 🎉" on the card. The goal can then be closed (it stays in the history) or raised.

## Keep it simple

- No goal exists until the user makes one.
- *Planen* shows one quiet row under *Finanz-Check* (plan 06a): "Für etwas sparen?". It's not a big empty card.
- The goal pill only appears for *Sparen* categories.

## Design

- **The goal:** `Goal = { id, name, emoji, hue, target, due?: MonthKey, start?: number, createdAt, closedAt? }`.
- **Saved so far:** `start` plus the paid entries with that `goalId`.
- **Taking money out:** **Geld entnommen** in the goal's menu books an amount out of the goal.
- **No savings category yet:** if no category has `budget: 'save'`, creating the first goal asks once:
  - switch on the built-in *Geldanlage*, or
  - create a *Sparen* category (expense, `budget: 'save'`, not standard).
- **Deleting a goal** keeps its entries (they stay savings) and only removes the link.
- **`goalProgress(data, goal, today)` in `src/insights.ts`:** saved, left, monthly need, on track or not.

## Steps

1. Types, normalising, backups, schema bump; `goalProgress` with tests.
2. The *Planen* card and a pushed *Spartöpfe* screen: list, create, edit, close.
3. The goal pill in the entry sheet.
4. Plan 11's **Als Spartopf anlegen**.
5. de/en/ar strings; ui-review.

## Tests and checks

- Progress with a starting amount.
- A recurring contribution.
- Money taken out.
- A deleted goal.
- A goal past its date.
- Balances unchanged (golden data).

## Done when

- [ ] Goals can be created, filled by entries (recurring ones too), reached, closed and deleted, and balances never change because of it.

## Not in this plan

Goal reminders. They can be added later as a source in plan 00's reminder scheduler.
