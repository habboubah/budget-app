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

- [x] Single-account books are unchanged. (The golden year and every older fixture come to the same values; `accountView` hands such a book back as it is.)
- [x] Multi-account books balance per account and in total. (`accounts.test.ts`, the v20 fixture in `compat.test.ts`.)
- [x] Transfers never count as income or expense. (`monthTotals`, `buildBook`, `topNames`, budgets — all tested.)

## Notes (built)

- **Data (schema 20):** `Account { id, name, kind, emoji, hue, createdAt }` in `AppData.accounts`, the main account (id `main`) first. It is written down only with the first extra account, unnamed so that it reads *Girokonto* in every language. Deleting the last extra account takes the list away again, unless the main one was renamed. `Entry.accountId` (unset = main), `Entry.transfer { pairId, direction }`, `MonthRecord.openings` (the other accounts' openings). The plan's `main?: true` flag became the fixed id. `normalizeState` moves entries and openings on an unknown account to the main one. It never sends a transfer to *Sonstiges*. Fixture `storage-v20.json`.
- **Balances:** `computeBalances(data, account)`, with transfers as `transferPaid` / `transferOpen`. `'all'` adds the accounts up month by month. Old callers get the main account, so nothing else changed.
- **Who reads what:** the month page shows the account picked on the balance card (a view preference, `spartopf-account`). Statistik, Planen, the reports, budgets and *Demnächst fällig* count every account: a budget belongs to the category, wherever the money was paid from. On a side account, a category with only a budget gets no card.
- **Screens:** *Optionen › Haushaltsbuch › Konten* (each account with today's balance, *Vermögen* under them, *Bargeld / Sparkonto / Anderes Konto hinzufügen*). `AccountSheet` asks a new account for today's balance, which becomes this month's opening for it; delete appears only once the account is empty. The balance card's switch (with *Alle Konten*, where opening and bank match aren't offered). `TransfersCard` under the categories. *Umbuchen* in the month's "⋯" and on the card (`TransferSheet`: amount, from, to, name, day, done or not, every month). The account pill in the entry sheet. Planen's *Vermögen* row.
- **Imports:** a bank CSV or photo goes into the account shown (the main one for *Alle Konten*), matched against that account; the review sheet names it. An Excel import replaces only the main account's own entries in its months. Rules can already `skip` the bank's side of a transfer (plan 20).
- **CSV:** a *Konto* column only once there are accounts; a transfer is negative on its outgoing side.
- **Not done yet:** goals pointing to a savings account (plan 12's pots stay as they are), and a transfer's day moving it to another month (the sheet keeps it in its month). The reconciled date stays per month, not per account.
- **Bundle:** 321.8 kB gzip (310 kB recorded, 341 kB allowed). No baseline change.
- **Still to do on an iPhone:** see TODO.md.
