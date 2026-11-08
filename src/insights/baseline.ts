/*
 * What "usual" means (STATISTICS_AND_INSIGHTS.md §6) and how big a
 * difference has to be before it is worth a sentence (§10.4). Named
 * constants, so the rules read the same everywhere and the tests can name
 * them.
 */

/** A difference worth saying, per month: at least this much … */
export const MATERIAL_FLOOR = 2500;
/** … and at least this share of what the household usually spends a month. */
export const MATERIAL_SHARE = 0.015;
/** H3: a category is unusual from 20 % off its usual. */
export const UNUSUAL_SHARE = 0.2;
/** H4 and the change chips: 15 % and 20 € a month. */
export const TREND_SHARE = 0.15;
export const TREND_FLOOR = 2000;
/** P3: a price change from 3 % and 1 €. */
export const PRICE_SHARE = 0.03;
export const PRICE_FLOOR = 100;
/** H1: "im üblichen Rahmen" within max(25 €, 5 % of usual-so-far). */
export const PACE_FLOOR = 2500;
export const PACE_SHARE = 0.05;
/** H1: the comparison starts on day 3; H1 / H7: a week without an entry is stale. */
export const EARLY_DAYS = 3;
export const STALE_DAYS = 7;
/** H1: the usual pace goes day by day when at least 80 % of the history's money has a day. */
export const DATED_SHARE = 0.8;

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

/** The q-quantile (0–1), linearly interpolated between the sorted values (the spreadsheet way). */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const at = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo] + (s[hi] - s[lo]) * (at - lo);
}

export const median = (xs: number[]) => quantile(xs, 0.5);

export interface Usual {
  /** Per month, in cents (rounded). */
  value: number;
  method: 'median' | 'mean';
  /** How many months it stands on. */
  months: number;
}

/**
 * "Üblich" from one value per basis month (up to six finished months before,
 * oldest first): the median when there was money in at least four of them —
 * one 600 € repair doesn't move it — otherwise the mean, so a category that
 * comes every other month isn't "usually 0". Two months: the mean. Fewer:
 * nothing to compare with (null).
 */
export function usual(values: number[]): Usual | null {
  const xs = values.slice(-6);
  if (xs.length < 2) return null;
  const withMoney = xs.filter(v => v > 0).length;
  const method = withMoney >= 4 ? 'median' : 'mean';
  return { value: Math.round(method === 'median' ? median(xs) : mean(xs)), method, months: xs.length };
}

/**
 * How big a "more / less than usual" has to be (MATERIAL): 25 € a month, or
 * 1.5 % of what the household usually spends a month, whichever is more —
 * 37,50 € at 2.500 € a month, 75 € at 5.000 €. Over several months, times as many.
 */
export function materiality(usualMonthlySpending: number, months = 1): number {
  return Math.max(MATERIAL_FLOOR * months, Math.round(usualMonthlySpending * MATERIAL_SHARE * months));
}
