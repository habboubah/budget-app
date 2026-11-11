import { MonthKey } from '../types';
import { addMonths, balanceFor, comesBackIn, latestPeriodic, monthKeyOf } from '../logic';
import { Book, finishedKeys, monthOf } from './book';
import { mean, median, quantile } from './baseline';
import { grundbedarf } from './health';

/*
 * Ausblick (§9.5, P2; replaces Prognose, D6): the account at the end of each
 * of the next twelve months — account-based, so Kontoplus: what is promised
 * (monthly series still running, the yearly ones a year on, a month already
 * started with its own entries) plus a usual month of everything else, with
 * a range from calm to pricey months. Salary changes, inflation and new
 * contracts are not in it; the explainer says so.
 */

export interface OutlookItem {
  name: string;
  categoryId: string;
  /** Cents; an expense as a positive amount, like an entry. */
  amount: number;
  income: boolean;
  /** A yearly bill a year on, or an entry already in a started month. */
  kind: 'yearly' | 'planned';
}

export interface OutlookMonth {
  key: MonthKey;
  /** The month-end balance: in the middle, and from pricey (lo) to calm (hi) months. */
  mid: number;
  lo: number;
  hi: number;
  /** What is known for the month (income − expenses), before the everyday part. */
  fixed: number;
  started: boolean;
  /** Yearly bills and planned one-offs that month, largest first. */
  big: OutlookItem[];
}

export interface Outlook {
  /** Where it starts: the running month's projected end (*Am Monatsende*). */
  from: { key: MonthKey; end: number };
  months: OutlookMonth[];
  /** A usual month's one-off income − one-off outflow: the median, the 25th and the 75th percentile. */
  everyday: { mid: number; lo: number; hi: number };
  /** The finished months the everyday part comes from (up to twelve). */
  basis: MonthKey[];
  /** From four basis months on there is a range; before, lo = mid = hi. */
  ranged: boolean;
  /** One month of Grundbedarf: below it, "knapp". */
  grundbedarf: number;
  headline: { kind: 'normal' | 'warn' | 'neg'; month: MonthKey; amount: number };
}

/** Ausblick needs three finished months; null before. */
export function outlook(book: Book, today = new Date(), horizon = 12): Outlook | null {
  const basis = finishedKeys(book, today, 12);
  if (basis.length < 3) return null;
  const now = monthKeyOf(today);
  // The latest started month up to today: what runs every month runs from there.
  const latest = [...book.months].reverse().find(k => k <= now);
  if (!latest) return null;
  const startKey = book.months.includes(now) ? now : latest;
  const start = balanceFor(book.balances, startKey).end;

  const sign = (categoryId: string) => (book.partOf(categoryId) === 'income' ? 1 : -1);
  const monthly = new Map<string, { amount: number; categoryId: string; until?: MonthKey }>();
  for (const e of monthOf(book, latest).entries) if (e.repeat === 'monthly') monthly.set(e.seriesId, { amount: e.amount, categoryId: e.categoryId, until: e.until });
  // What runs every month, for a month ahead: a series that has ended by then (schema 24) no longer counts.
  const monthlyNet = (key: MonthKey) => [...monthly.values()].reduce((s, x) => s + (x.until && key > x.until ? 0 : sign(x.categoryId) * x.amount), 0);
  // The bills outside the monthly run, each from its newest entry: yearly, half-yearly, quarterly.
  const periodic = latestPeriodic(book.data.entries);

  const nets = basis.map(k => {
    const m = monthOf(book, k);
    return m.income.once - m.need.once - m.want.once - m.save.once;
  });
  const ranged = nets.length >= 4;
  const mid = Math.round(nets.length >= 3 ? median(nets) : mean(nets));
  const everyday = { mid, lo: ranged ? Math.round(quantile(nets, 0.25)) : mid, hi: ranged ? Math.round(quantile(nets, 0.75)) : mid };

  const months: OutlookMonth[] = [];
  let at = { mid: start, lo: start, hi: start };
  const last = addMonths(now, horizon);
  for (let key = addMonths(startKey, 1); key <= last; key = addMonths(key, 1)) {
    const own = book.byMonth.get(key);
    const started = !!own?.started;
    let fixed = 0;
    const big: OutlookItem[] = [];
    if (started && own) {
      for (const e of own.entries) {
        fixed += sign(e.categoryId) * e.amount;
        if (e.repeat !== 'monthly') big.push({ name: e.name, categoryId: e.categoryId, amount: e.amount, income: sign(e.categoryId) > 0, kind: e.repeat === 'yearly' ? 'yearly' : 'planned' });
      }
    } else {
      fixed = monthlyNet(key);
      for (const e of periodic) {
        if (!comesBackIn(e, key)) continue;
        fixed += sign(e.categoryId) * e.amount;
        big.push({ name: e.name, categoryId: e.categoryId, amount: e.amount, income: sign(e.categoryId) > 0, kind: 'yearly' });
      }
    }
    at = { mid: at.mid + fixed + everyday.mid, lo: at.lo + fixed + everyday.lo, hi: at.hi + fixed + everyday.hi };
    months.push({ key, ...at, fixed, started, big: big.sort((a, b) => b.amount - a.amount) });
  }

  const need = grundbedarf(book, today)?.value ?? 0;
  const neg = months.find(m => m.mid < 0);
  const warn = months.find(m => m.mid < need);
  const end = months[months.length - 1];
  const headline = neg ? { kind: 'neg' as const, month: neg.key, amount: neg.mid }
    : warn ? { kind: 'warn' as const, month: warn.key, amount: warn.mid }
      : { kind: 'normal' as const, month: end?.key ?? startKey, amount: end?.mid ?? start };
  return { from: { key: startKey, end: start }, months, everyday, basis, ranged, grundbedarf: need, headline };
}

/**
 * Where the outlook's middle line is lowest — the running month's end, where
 * it starts, included (the first, when several are): where it gets tightest.
 */
export function outlookLowest(o: Outlook): { key: MonthKey; amount: number } {
  return o.months.reduce((b, m) => (m.mid < b.amount ? { key: m.key, amount: m.mid } : b), { key: o.from.key, amount: o.from.end });
}

/** The yearly bills and planned one-offs of the coming months, in order: *Große Posten*. */
export function bigItems(o: Outlook): (OutlookItem & { month: MonthKey })[] {
  return o.months.flatMap(m => m.big.filter(b => !b.income).map(b => ({ ...b, month: m.key })));
}
