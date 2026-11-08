/*
 * The statistics beyond plain sums, computed from what the app already knows
 * — all pure, all in cents, tested next to each module and in
 * src/insights.test.ts. `import … from './insights'` keeps working: this file
 * re-exports the folder. The definitions behind every figure are
 * STATISTICS_AND_INSIGHTS.md §6.
 *
 *   book.ts      buildBook(): every entry read once into per-month sums
 *   baseline.ts  usual(), materiality(), quantiles and the named thresholds
 *   series.ts    month by month (D1: Ausgaben, Angelegt, Gespart, Kontoplus), averages
 *   rules.ts     50/30/20 and the commitments
 *   hints.ts     unusual, price changes, missing, new names, trends, biggest, best / worst
 *   pace.ts      "November bis heute": everyday spending against a usual month (H1)
 *   outlook.ts   Ausblick: the balance in the coming twelve months (P2)
 *   health.ts    Grundbedarf and the Finanz-Check (P6)
 *   highlights.ts  hints as ranked data: Das fällt auf, the contract hints, a month's changes
 *   detail.ts    the category screen and the payee sheet
 *   review.ts    Monatsbericht, the month-review card, Jahresrückblick
 *
 * Nothing here builds a sentence: src/insightText.ts turns a hint into words.
 */
export * from './book';
export * from './baseline';
export * from './series';
export * from './rules';
export * from './hints';
export * from './pace';
export * from './outlook';
export * from './health';
export * from './highlights';
export * from './detail';
export * from './review';
