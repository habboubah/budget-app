# 29 · Periods and year comparison

- **Covers:** U7. Cashew lets users compare periods.
- **Depends on:** 06a (Statistik's *Verlauf* section), 13 (the year model)
- **Size:** M
- **Native:** none
- **Schema:** no change

## What the user gets

- **A year picker** in the control of Statistik's *Verlauf* section ("2025"), next to 6 / 12 months and *Alle*.
- **Mit Vorjahr vergleichen**, a switch that adds last year to each part of *Statistik*:
  - the KPI row shows the change, e.g. "+8 % Ausgaben ggü. 2025";
  - the in-vs-out chart draws last year's months as faint outlines;
  - *Wofür das Geld geht*'s change chips (plan 06a) compare with last year.

## Keep it simple

- The comparison is one switch, and it's off by default.
- It only appears once the book has 13 or more months.

## Design

- **Functions:** `periodSeries(balances, range)` and `compareYears(data, year)` in `src/insights/` (plan 06a), next to plan 13's `yearReview`.
- **Months counted:** finished months only, the same rule as the redesign's averages.
- **Chart:** last year is a second series drawn as outlines, using a token colour, not a new hue. `LegendToggles` can hide it.

## Tests and checks

- A year with missing months.
- The running month left out.
- Comparing two years that aren't the same length.
- Golden data.

## Done when

- [ ] Years and comparisons are correct.
- [ ] They're readable in DE and AR.
