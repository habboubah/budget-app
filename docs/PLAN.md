# Spartopf – concept and money rules

What the app is and the rules its numbers follow. What it does feature by
feature is in [features.md](features.md); how the code is built, in
[CLAUDE.md](CLAUDE.md).

A simple, private household budget book for iPhone, Android and the browser, built
after Ahmad's `My_expense.xlsx`: one sheet per month, income at the top, then
fixed costs, car, extras, groceries, family — and two numbers that matter, the
money on the account now and what is left at the end of the month.

No account, no server: everything lives on the device. Same stack and
conventions as `pizza-driver-log` and `shopping-list` (React 19 + TypeScript,
Vite 6, Tailwind 4, `motion`, `lucide-react`, Capacitor 8 for the iOS and Android shells,
`vite-plugin-pwa` for the installable web app, vitest for the pure logic).
One account by default, on purpose: cash or a savings account show up only
once the user adds one (plan 30), and a book with one account looks as it
always did.

## What the Excel sheet does (and the app keeps)

| Excel | App |
|---|---|
| One sheet per month (`10.2026`, `11.2026`) | One **month** per page, ‹ › to switch |
| Columns *Einkommen, Fixed Kosten, Sonder Kosten, Einkaufen, Auto, Family* | Default **categories** (editable in Settings); *Einkaufen* is *Lebensmittel und Drogerie*, plus the usual banking-app categories, off for new months by default |
| Two columns per category: paid (G) and still to pay (H) | Every **entry** is *paid* or *open* (planned) — one tap toggles |
| `Before` = last month's *Rest in Bank* | **Carry-over** is computed from the previous month, automatically |
| *Rest in Bank* (paid only) vs *All Rest in Bank* (incl. open) | **Jetzt auf dem Konto** vs **Am Monatsende** |
| Copying last month's sheet keeps rent, insurances … | Entries marked **monatlich** (or every 2, 3 or 6 months, or **jährlich**) are carried into the month they come back in, as open |
| Due dates in the name: `Vodafone(18.06)`, `DEVK(14)` | Optional **due day**; open entries past it are flagged |

## Concepts

| Concept | What it is | Example |
|---|---|---|
| **Category** (`Category`) | Income or expense, with a name, emoji and colour, and whether its new entries repeat by default. Ordered: the month page follows this order. | 💰 Einkommen, 🏠 Wohnen, 🚗 Auto |
| **Entry** (`Entry`) | One line in a month: name, amount, category, paid or open, repeat (none / monthly / every 2, 3 or 6 months / yearly, optionally until a last month), date, optional due day, note, tags and receipts. A **refund** is an entry in an expense category with a negative amount. | Miete · 1.050,00 € · open · monatlich · am 1. |
| **Month** (`MonthRecord`) | A started month (`2026-11`). Optionally a manual opening balance that overrides the carry-over (to match the real bank). | November 2026 |
| **Series** (`seriesId`) | The thread that links "Miete" in October to "Miete" in November, so carrying over never duplicates and statistics can follow one cost over time. | |

## Money rules (pure logic, unit-tested)

- Amounts are integer **cents**. Income adds, expenses subtract.
- Two running balances, chained month to month:
  - `now(m)` = opening(m) + income received − expenses paid
  - `end(m)` = opening*(m) + all income − all expenses (paid or open)
  - opening(m) = `now` of the previous started month; opening*(m) = `end` of it.
    An open bill from October therefore still lowers November's *Monatsende*,
    but not *Jetzt* — until it is ticked as paid.
- A manual opening balance for a month replaces the carry-over for `now` and
  keeps the outstanding difference for `end`.
- **Starting a month** copies every *monthly* entry of the last started month and
  every entry that repeats every 2, 3, 6 or 12 months and comes back in this
  month — as open entries, same amount, same due day. A recurring entry with
  an end stops after its last month. Nothing is copied twice (series).
- **Refunds** count against their category (its total, its budget, the
  statistics go down) and add to the account; they are never income.
- **More accounts** (cash, savings): each has its own opening balance and the
  two balances. A transfer between them is neither income nor expense.
- **Money put into a savings category** counts as saved, not spent, in every
  statistic; the month page keeps the account's view.

## Screens (no router — tabs + a `pushed` stack in `App.tsx`)

1. **Monat** – month switcher, the balance card (*Kontostand jetzt* ·
   *Am Monatsende*, carry-over, income / expenses, how much is paid),
   *Demnächst fällig*, then one card per category in order with its entries;
   tap the ring to mark paid, tap the row to edit, "+" to add. A month that
   hasn't been started offers to start it and carry over the recurring
   entries. Search runs over every month.
2. **Entry sheet** – amount first (big, decimal keypad with + − × ÷), name
   with suggestions, category, then a row of pills: date, paid / open,
   repeat, note, and the optional ones (account, refund, receipt, tag, trip,
   tax, debt).
3. **Statistik** – how it went: ranked hints (*Das fällt auf*), then
   *Verlauf* over 3 / 6 / 9 / 12 months, a year or all — averages, income vs
   spending, the balance at each month's end, where the money goes, the
   table; category and payee screens, the month report, the year review.
4. **Planen** – how it is going and what's coming: *November bis heute*,
   budgets, *Ausblick* with *Kann ich mir das leisten?*, the reserve for
   yearly bills, savings pots, subscriptions and contracts, debts, trips and
   projects, *Finanz-Check*.
5. **Optionen** – security and notifications (lock, hide amounts, reminders,
   backup on the device), display (language, appearance, colour, currency),
   the budget book (categories and budgets, accounts, debts, trips, tax list,
   rules, favourites, month start, automatic capture, backup and transfer),
   test data, about, reset.

## How it was built

The first version came in nine steps (project, data model, month screen,
months, Statistik, Optionen, iOS and the release pipeline, polish, Excel
import). Since then every feature has been a numbered plan in
[plans/](plans/README.md) — a finished plan's file is deleted, its result
lives in [features.md](features.md) and [CLAUDE.md](CLAUDE.md) — plus two
redesigns of the whole app (November 2026). The plan files and the redesign
write-ups are in the git history.

A home-screen widget, an iPad and an Apple Watch version, and syncing between
devices were considered and dropped.
