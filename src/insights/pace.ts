import { MonthKey } from '../types';
import { dayIndex, dayOfMonth, daysInMonth, isoDay, monthKeyOf } from '../logic';
import { Book, entryDay, everydayOf, finishedKeys, monthOf } from './book';
import { DATED_SHARE, EARLY_DAYS, PACE_FLOOR, PACE_SHARE, STALE_DAYS, mean, median, quantile } from './baseline';

/*
 * "November bis heute" (STATISTICS_AND_INSIGHTS.md §9.1, H1): everyday
 * spending so far this month against a usual month at the same day, and
 * where it would end. Fixed costs are left out (D3) — rent on the 1st would
 * make every month look early.
 */

export type PaceVerdict = 'none' | 'early' | 'stale' | 'within' | 'below' | 'above';

export interface Pace {
  month: MonthKey;
  /** Today's day of the month, and how many days the month has. */
  day: number;
  days: number;
  /** Alltagsausgaben so far: dated up to today (a later date is a plan), undated ones counted today. */
  spent: number;
  /** Cumulative, day 1 to today: `actual[d - 1]`. */
  actual: number[];
  /** The usual cumulative pace, day 1 to the month's last; null without a finished month. */
  usual: number[] | null;
  /** The 25th to 75th percentile around it, from four basis months on. */
  band: { lo: number[]; hi: number[] } | null;
  usualToday: number | null;
  usualTotal: number | null;
  /** Spent + (usual at month end − usual today), never below what is spent; null without a usual. */
  projected: number | null;
  /** Day by day when ≥ 80 % of the basis' money has a day; else the month total spread evenly ("ideal pace"). */
  method: 'byDay' | 'linear' | null;
  /** The finished months the usual comes from (up to six with everyday spending). */
  basis: MonthKey[];
  verdict: PaceVerdict;
  /** Spent − usual so far (0 without a usual). */
  diff: number;
  /** For 'stale': days since anything was entered or ticked. */
  staleDays: number;
  /** This month's everyday spending so far by category, largest first. */
  shares: { categoryId: string; amount: number }[];
}

const cumulative = (xs: number[]) => {
  let s = 0;
  return xs.map(x => (s += x));
};

/** Day `d` of a month of `days` days on a basis month of `basisDays`: the same day, its last day at the end. */
const onBasis = (d: number, days: number, basisDays: number) => (d >= days ? basisDays : Math.min(d, basisDays));

export function pace(book: Book, today = new Date()): Pace {
  const month = monthKeyOf(today);
  const days = daysInMonth(month);
  const day = dayOfMonth(today);
  const m = monthOf(book, month);

  const perDay = Array.from({ length: days }, () => 0);
  const byCategory = new Map<string, number>();
  // The newest sign of life: an everyday entry's day, or anything entered or ticked this month.
  let lastSeen = 0;
  const seen = (at: number | undefined) => {
    if (at === undefined) return;
    const d = new Date(at);
    const index = dayIndex(isoDay(d), month);
    if (index !== null && index <= day) lastSeen = Math.max(lastSeen, index);
  };
  for (const e of m.entries) {
    seen(e.paidAt);
    // A carried-over bill was not entered by anyone: only one-off entries say someone was here.
    if (e.repeat !== 'none') continue;
    seen(e.createdAt);
    const d = entryDay(e);
    if (d !== null && d > day) continue;
    lastSeen = Math.max(lastSeen, d ?? 0);
    const part = book.partOf(e.categoryId);
    if (part !== 'need' && part !== 'want') continue;
    perDay[(d ?? day) - 1] += e.amount;
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount);
  }
  const actual = cumulative(perDay).slice(0, day);
  const spent = actual[day - 1] ?? 0;
  const shares = [...byCategory].map(([categoryId, amount]) => ({ categoryId, amount })).filter(s => s.amount > 0).sort((a, b) => b.amount - a.amount);

  const basis = finishedKeys(book, today).filter(k => everydayOf(monthOf(book, k)) > 0).slice(-6);
  let usual: number[] | null = null;
  let band: Pace['band'] = null;
  let method: Pace['method'] = null;
  if (basis.length) {
    const months = basis.map(k => monthOf(book, k));
    const total = months.reduce((s, b) => s + everydayOf(b), 0);
    const dated = months.reduce((s, b) => s + everydayOf(b) - b.undated, 0);
    const centre = (xs: number[]) => (xs.length >= 3 ? median(xs) : mean(xs));
    const day1 = Array.from({ length: days }, (_, i) => i + 1);
    if (total > 0 && dated / total >= DATED_SHARE) {
      method = 'byDay';
      // Each basis month's running total per day, its undated money spread evenly over its days.
      const runs = months.map(b => {
        const spread = b.undated / b.daily.length;
        return cumulative(b.daily.map(x => x + spread));
      });
      const at = (d: number) => runs.map((r, i) => r[onBasis(d, days, months[i].daily.length) - 1]);
      usual = day1.map(d => Math.round(centre(at(d))));
      if (runs.length >= 4) band = { lo: day1.map(d => Math.round(quantile(at(d), 0.25))), hi: day1.map(d => Math.round(quantile(at(d), 0.75))) };
    } else {
      method = 'linear';
      const totals = months.map(everydayOf);
      const usualTotal = centre(totals);
      usual = day1.map(d => Math.round((usualTotal * d) / days));
      if (totals.length >= 4) {
        const lo = quantile(totals, 0.25);
        const hi = quantile(totals, 0.75);
        band = { lo: day1.map(d => Math.round((lo * d) / days)), hi: day1.map(d => Math.round((hi * d) / days)) };
      }
    }
  }

  const usualToday = usual ? usual[day - 1] : null;
  const usualTotal = usual ? usual[days - 1] : null;
  const projected = usual && usualToday !== null && usualTotal !== null ? Math.max(spent, spent + usualTotal - usualToday) : null;
  const diff = usualToday === null ? 0 : spent - usualToday;
  const staleDays = day - lastSeen;
  let verdict: PaceVerdict;
  if (!usual) verdict = 'none';
  else if (day < EARLY_DAYS) verdict = 'early';
  else if (day > STALE_DAYS && staleDays >= STALE_DAYS) verdict = 'stale';
  else if (Math.abs(diff) <= Math.max(PACE_FLOOR, PACE_SHARE * (usualToday ?? 0))) verdict = 'within';
  else verdict = diff < 0 ? 'below' : 'above';

  return { month, day, days, spent, actual, usual, band, usualToday, usualTotal, projected, method, basis, verdict, diff, staleDays, shares };
}
