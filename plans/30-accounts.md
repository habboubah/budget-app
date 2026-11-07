# 30 · Cash and savings accounts

- **Covers:**
  - F5. Every competitor has multiple accounts.
  - Requests to track cash (Finanzguru reviewers).
  - Transfers counted twice is a top complaint, so this has to get them right.
- **Depends on:** 00, 20, 21
- **Size:** L
- **Native:** none
- **Schema:** bump (`AppData.accounts?`, `Entry.accountId?`, `Entry.transfer?`)

## Decision

PLAN.md says "One bank account only, on purpose". The new goal is every feature users ask for, kept simple. So the rule becomes: one account by default, more only when the user adds them. Update PLAN.md and CLAUDE.md as part of this plan.

## What the user gets

- **Adding an account:** *Optionen › Haushaltsbuch › Konten* has **Bargeld hinzufügen**, **Sparkonto hinzufügen**, or any other account.
- **Once a second account exists:**
  - The balance card gets a small account switch ("Giro ▾"), with *Alle Konten* for the total.
  - The entry sheet gets an account pill. It defaults to the main account.
  - **Umbuchen** ("100 € vom Giro aufs Bargeld") moves money between accounts. A transfer is neither income nor expense.
  - *Planen* shows the total, e.g. "Vermögen: 12.480 € auf 3 Konten".

## Keep it simple

Nobody sees accounts until they add one. Single-account books look and behave exactly as today, and the golden data proves it.

## Design

- **Types:**
  - `Account = { id, name, kind: 'bank' | 'cash' | 'savings', emoji, hue, main?: true }`.
  - `Entry.accountId?`: unset means the main account.
  - `Entry.transfer?: { pairId, direction: 'out' | 'in' }`: a transfer is two linked entries.
- **Balances:** `computeBalances()` runs per account. Today's two balances are the main account's.
- **Opening balances** are kept per account and month (`MonthRecord.openings?`).
- **Transfers are left out of** `monthTotals()`, *Statistik*, budgets and the 50/30/20 split.
- **Goals** (12) can point to a savings account.
- **Imports** go to the main account, or to one the user picks. Rules (20) can `skip` the bank's own side of a transfer.
- **Carry-over and recurring entries** keep their account.

## Tests and checks

- Single-account books: golden data unchanged.
- Balances per account and in total.
- Transfers count in neither income nor expense.
- Opening balances per account.
- Carry-over keeps the account.
- Imports go into the chosen account.
- Old data loads as one account.

## Done when

- [ ] Single-account books are unchanged.
- [ ] Multi-account books balance per account and in total.
- [ ] Transfers never count as income or expense.
