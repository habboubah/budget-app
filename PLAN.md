# Spartopf – build plan

A simple, private household budget book for iPhone and the browser, built
after Ahmad's `My_expense.xlsx`: one sheet per month, income at the top, then
fixed costs, car, extras, groceries, family — and two numbers that matter, the
money on the account now and what is left at the end of the month.

No account, no server: everything lives on the device. Same stack and
conventions as `pizza-driver-log` and `shopping-list` (React 19 + TypeScript,
Vite 6, Tailwind 4, `motion`, `lucide-react`, Capacitor 8 for the iOS shell,
`vite-plugin-pwa` for the installable web app, vitest for the pure logic).
One bank account only, on purpose.

## What the Excel sheet does (and the app keeps)

| Excel | App |
|---|---|
| One sheet per month (`10.2026`, `11.2026`) | One **month** per page, ‹ › to switch |
| Columns *Einkommen, Fixed Kosten, Sonder Kosten, Einkaufen, Auto, Family* | Default **categories** (editable in Settings); *Einkaufen* is *Lebensmittel und Drogerie*, plus the usual banking-app categories, off for new months by default |
| Two columns per category: paid (G) and still to pay (H) | Every **entry** is *paid* or *open* (planned) — one tap toggles |
| `Before` = last month's *Rest in Bank* | **Carry-over** is computed from the previous month, automatically |
| *Rest in Bank* (paid only) vs *All Rest in Bank* (incl. open) | **Jetzt auf dem Konto** vs **Am Monatsende** |
| Copying last month's sheet keeps rent, insurances … | Entries marked **monatlich** (or **jährlich**) are carried into the next month as open |
| Due dates in the name: `Vodafone(18.06)`, `DEVK(14)` | Optional **due day**; open entries past it are flagged |

## Concepts

| Concept | What it is | Example |
|---|---|---|
| **Category** (`Category`) | Income or expense, with a name, emoji and colour, and whether its new entries repeat by default. Ordered: the month page follows this order. | 💰 Einkommen, 🏠 Wohnen, 🚗 Auto |
| **Entry** (`Entry`) | One line in a month: name, amount, category, paid or open, repeat (none / monthly / yearly), optional due day and note. | Miete · 1.050,00 € · open · monatlich · am 1. |
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
  every *yearly* entry of the same month a year earlier — as open entries, same
  amount, same due day. Nothing is copied twice (series).

## Screens (no router — tabs + a `pushed` stack in `App.tsx`)

1. **Monat** (entries) – month switcher, the dark balance card (*Jetzt* ·
   *Monatsende*, carry-over, income / expenses, how much is paid), then one
   card per category in order with its entries; tap the ring to mark paid, tap
   the row to edit, "+" to add. A month that hasn't been started offers to
   start it and carry over the recurring entries.
2. **Entry sheet** – amount first (big, decimal keypad), name with suggestions
   from earlier months, category, paid / open, repeat, due day, note.
3. **Statistik** – the month: income, expenses, saved, savings rate; where the
   money went (by category and by shop/name); the last 12 months: income vs
   expenses, the balance at each month's end, average per category.
4. **Einstellungen** – categories (add, edit, reorder, delete with undo,
   restore defaults), language (DE/EN), theme, backup export / import, CSV
   export for Excel, delete all data, about.

## Steps (one commit each)

1. Project setup, skills copied from shopping-list / pizza-driver-log, docs, design tokens, icon
2. Data model, local storage, default categories, balance & carry-over logic + tests
3. Month screen: balance card and starting balance, category sections, add / edit / delete entries, paid toggle
4. Months: switch, start a month with carry-over, month actions, open items from earlier months, first-run intro
5. Statistics tab (and the tab bar)
6. Settings: categories, language, theme, backup / CSV
7. iOS project, App Store release pipeline, store listing, screenshots
8. Polish, empty states, README; final check on iPhone width + desktop
9. Import from Excel: month tabs → months, with a preview and undo

## Ideas for later

- A home-screen widget with "Jetzt" and "Monatsende".
- Arabic (`dir: 'rtl'`) as a third language.
