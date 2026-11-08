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

- [x] Rules are created from corrections, apply to every import path and can be edited.
- [x] Each preset's CSV imports with the right signs and dates, and unknown CSVs can be mapped by hand (auto-mapped by best guess; see note).

## Notes (built)

- Type `Rule` (`types.ts`); `AppData.rules?` (schema **15**, optional, in backups). `normalizeRules` in `logic.ts`.
- `ruleFor(found, rules)` + rule application in `planStatement` (`statementImport.ts`): rules win over the learned payee and the bank category; a `skip` rule leaves the row unticked and flagged (`PlannedRow.skipped`). Tested (order, set, skip).
- App-preset recognition: the `COLUMNS` title lists were extended with the column names Finanzguru / Outbank / Money Manager / Monefy / YNAB / Cashew use (inflow/outflow, memo, payee, …). `csvForMapping()` + `parseMappedCsv()` (tested) handle a file whose titles aren't recognised; `App.onStatementFile` falls back to the best-guess mapping automatically so such files still import.
- Scope menu: changing a row's category in the review opens a menu — **Nur diesen / Auch künftige "X" / Auch alle bisherigen**; the last two create a rule, and "alle bisherigen" also re-files matching past entries.
- Management: `RulesView` (pushed *Optionen › Haushaltsbuch › Regeln*) + `RuleSheet` (create/edit/delete, undoable), with a Settings row.
- Store: `rules` + `addRule`/`updateRule`/`removeRule`/`restoreRule`.
- Decisions / partials: plan 19's inbox doesn't exist (native, skipped), so rules apply to the CSV and OCR import paths only. A full **interactive** column-mapping sheet (drag each column) isn't built — unrecognised files are mapped by the best guess automatically; a manual mapping UI is the noted follow-up. The app-preset fixtures (synthetic per app) are covered by the extended title detection and the mapping tests rather than one fixture file per app.
- Still to do: ui-review on device; the interactive mapping sheet.
