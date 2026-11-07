# 26 · Tags

- **Covers:** F14. Spendee, Money Manager, Outbank, finanzblick and Goodbudget have tags.
- **Depends on:** 00 (search, Statistik)
- **Size:** M
- **Native:** none
- **Schema:** bump (`Entry.tags?`)

## What the user gets

- **Adding tags:** the entry sheet's "+" menu (where *+ Notiz* lives) gets **# Tag**, with suggestions from tags already in use.
- **Searching:** search finds `#urlaub`.
- **Totals:** once any tag exists, *Statistik › Wofür das Geld geht* gets a *Tags* option, e.g. "Urlaub 2026 · 1.840 € · 23 Einträge".
- **CSV export:** gets a tags column.

## Keep it simple

There's no tag field until someone picks *Tag* from the "+" menu. The *Tags* option in *Statistik* only appears once tags exist.

## Design

- **Storage:** `Entry.tags?: string[]`, saved lowercase and without "#".
- **Limits:** at most 5 tags per entry, 30 characters each.
- **Carry-over:** recurring entries keep their tags.
- **Search:** `searchEntries` matches `#tag` exactly; plain words work as today.
- **Totals:** `tagTotals(entries, months)` in `src/insights.ts`.

## Tests and checks

- Normalising tags: case, a leading "#", the limits.
- Search with and without "#".
- `tagTotals` across months.
- Tags in the CSV, including the CSV injection rule from plan 05.

## Done when

- [ ] Tags can be added, searched, totalled and exported.
- [ ] Nothing changes for people who don't use them.
