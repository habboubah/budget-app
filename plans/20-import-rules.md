# 20 · Import rules and other apps

- **Covers:**
  - F9.
  - Requests from reviews: own rules and leaving transfers out (finanzblick); choosing which bookings a category change applies to (Finanzguru).
  - Complaints about transfers counted twice (Finanzguru, finanzblick).
- **Depends on:** 19
- **Size:** M
- **Native:** none
- **Schema:** bump (`AppData.rules?`)

## What the user gets

- **Choosing the scope of a change.** When the user changes the category of an imported entry, a small menu asks once:
  - **Nur diesen**
  - **Auch künftige "REWE"**
  - **Auch alle bisherigen**

  The second and third choices create a rule.
- **The rules list** under *Optionen › Haushaltsbuch › Regeln*, where rules can be edited or deleted. Two examples:
  - "Name enthält 'REWE' → Lebensmittel, Name 'Rewe'"
  - "Verwendungszweck enthält 'Umbuchung' → nicht übernehmen"
- **Import from another app.**
  - A CSV from Finanzguru, Outbank, Money Manager, Monefy, YNAB or Cashew is recognized by its columns.
  - Any other CSV gets a mapping step: which column is the date, the payee, the amount (or debit and credit), the category, the note.

## Keep it simple

- Rules come from the user's own corrections, so nobody has to open the rules list.
- The mapping step only appears for files Spartopf doesn't recognize.

## Design

- **Rule type:** `Rule = { id, match: { field: 'name' | 'purpose' | 'payee', contains: string }, set: { categoryId?, name? } | { skip: true }, createdAt }`.
- **Where rules apply:** in `planStatement()`, before the learned payee mapping and the bank's own category, and to plan 19's inbox as well.
- **Recognizing apps:**
  - `detectColumns(header)`, plus presets stored as data (the column titles of each app's export).
  - Synthetic fixtures per app, built from each app's documented export format. Never real files.
- **Manual mapping:** a step in `StatementImportSheet.tsx`.
- **Categories from another app** map to Spartopf's by name, and through the bank-category table `planStatement()` already uses. Anything unknown goes to *Sonstiges* and is flagged in the review list.

## Tests and checks

- The order in which rules apply.
- `skip` rules.
- The three scopes of a category change.
- Each app preset: signs, dates and decimal marks.
- Mapping an unknown file by hand.

## Done when

- [ ] Rules are created from corrections, apply to every import path and can be edited.
- [ ] Each preset's CSV imports with the right signs and dates, and unknown CSVs can be mapped by hand.
