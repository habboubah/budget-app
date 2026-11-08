/*
 * The statistics beyond plain sums, computed from what the app already knows
 * — all pure, all in cents, tested in src/insights.test.ts.
 * `import … from './insights'` keeps working: this file re-exports the folder.
 *
 *   series.ts  month by month, averages over finished months
 *   rules.ts   50/30/20 and the commitments
 *   hints.ts   unusual, price changes, missing, new names, trends, biggest, best / worst
 */
export * from './series';
export * from './rules';
export * from './hints';
