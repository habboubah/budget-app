import { AppData, Category, CategoryKind, Entry, MonthKey } from '../types';
import { MonthBalance, monthKeyOf } from '../logic';
import { budgetOf } from '../data/defaults';

/*
 * Month by month: what came in, what went out, what was kept — the series
 * under the Statistik charts and the averages over finished months.
 *
 * One meaning of "gespart" everywhere (STATISTICS_AND_INSIGHTS.md D1):
 * money put into a savings category (`budget: 'save'`, an ETF plan) is
 * *angelegt* — saved, not spent. So, per month (paid and open):
 *
 *   Ausgaben (spending)  = expenses in need / want categories
 *   Angelegt (invested)  = expenses in save categories
 *   Gespart  (saved)     = Einnahmen − Ausgaben           (includes Angelegt)
 *   Kontoplus (kept)     = Einnahmen − Ausgaben − Angelegt = what the balance moves by
 *
 * Without a savings category, invested is 0 and all of it is what it was.
 */

/** One started month, summed up for the overview charts. */
export interface MonthPoint {
  key: MonthKey;
  income: number;
  /** Every outflow, the account's view (= spending + invested): the month page's expenses. */
  expense: number;
  /** Ausgaben: what was spent (need and want categories). */
  spending: number;
  /** Angelegt: what went into savings categories. */
  invested: number;
  /** Gespart: income − spending (paid and open) — what was put aside included. */
  saved: number;
  /** Kontoplus: income − expense — what the balance moves by. */
  kept: number;
  /** saved / income, or null without income. */
  rate: number | null;
  /** Balance at the month's end. */
  end: number;
  /** Of `income`, what is still expected (not received yet). */
  incomeOpen?: number;
  /** Of `expense`, what is still open (not paid yet). */
  expenseOpen?: number;
  /** Of `spending`, what is still open. */
  spendingOpen?: number;
}

/** What went into savings categories in a month, and how much of it is still open. */
export interface Invested { total: number; open: number }

const NONE: Invested = { total: 0, open: 0 };

/** Every month's *Angelegt* (expenses in `save` categories), in one pass. */
export function investedByMonth(data: Pick<AppData, 'entries' | 'categories'>): (key: MonthKey) => Invested {
  const save = new Set(data.categories.filter(c => c.kind === 'expense' && budgetOf(c) === 'save').map(c => c.id));
  const by = new Map<MonthKey, Invested>();
  if (save.size) {
    for (const e of data.entries) {
      if (!save.has(e.categoryId)) continue;
      const m = by.get(e.month) ?? { total: 0, open: 0 };
      m.total += e.amount;
      if (!e.paid) m.open += e.amount;
      by.set(e.month, m);
    }
  }
  return key => by.get(key) ?? NONE;
}

/**
 * Every started month (or the last `limit` of them), oldest first. Without
 * `invested` (see investedByMonth) nothing counts as put aside — the
 * account's view, as before D1.
 */
export function monthSeries(balances: MonthBalance[], limit?: number, invested: (key: MonthKey) => Invested = () => NONE): MonthPoint[] {
  const pts = balances.filter(b => b.started).map((b): MonthPoint => {
    const income = b.incomePaid + b.incomeOpen;
    const expense = b.expensePaid + b.expenseOpen;
    const put = invested(b.key);
    const spending = expense - put.total;
    const saved = income - spending;
    return {
      key: b.key, income, expense, spending, invested: put.total, saved, kept: income - expense,
      rate: income > 0 ? saved / income : null, end: b.end,
      incomeOpen: b.incomeOpen, expenseOpen: b.expenseOpen, spendingOpen: b.expenseOpen - put.open,
    };
  });
  return limit ? pts.slice(-limit) : pts;
}

/**
 * The months Statistik shows: started months up to the running one. A month
 * started ahead (the next one starts by itself) holds plans, not what
 * happened — it only feeds *Ausblick* (I9).
 */
export function upToNow(points: MonthPoint[], today = new Date()): MonthPoint[] {
  const now = monthKeyOf(today);
  return points.filter(p => p.key <= now);
}

/** A share the way people say it. */
export type Fraction = 'half' | 'third' | 'quarter' | 'fifth' | 'tenth';

/**
 * The common fraction a share is close to — within 3 points, the nearest
 * one — so a headline can say "rund ein Drittel" instead of "31 %". Null
 * when none is that close.
 */
export function nearFraction(share: number): Fraction | null {
  const fractions: [Fraction, number][] = [['half', 1 / 2], ['third', 1 / 3], ['quarter', 1 / 4], ['fifth', 1 / 5], ['tenth', 1 / 10]];
  let best: { name: Fraction; d: number } | null = null;
  for (const [name, value] of fractions) {
    const d = Math.abs(share - value);
    if (d <= 0.03 && (!best || d < best.d)) best = { name, d };
  }
  return best?.name ?? null;
}

/**
 * How the balance at the month's end changed over the months given, first to
 * last — the headline of the balance chart. Null with fewer than two months.
 */
export function balanceChange(points: MonthPoint[]): { from: MonthKey; to: MonthKey; change: number } | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return { from: first.key, to: last.key, change: last.end - first.end };
}

export interface CategoryMatrix {
  /** Categories of the kind that have money in the range, in the user's order. */
  categories: Category[];
  /** month → category → total */
  values: Map<MonthKey, Map<string, number>>;
  max: number;
}

/** Each category's total per month — the grouped bars. */
export function categoryMatrix(entries: Entry[], categories: Category[], months: MonthKey[], kind?: CategoryKind): CategoryMatrix {
  const inRange = new Set(months);
  // No kind: income and expenses together, in the user's category order.
  const ofKind = new Map(categories.filter(c => !kind || c.kind === kind).map(c => [c.id, c]));
  const values = new Map<MonthKey, Map<string, number>>(months.map(m => [m, new Map()]));
  const used = new Set<string>();
  let max = 0;
  for (const e of entries) {
    if (!inRange.has(e.month) || !ofKind.has(e.categoryId)) continue;
    const row = values.get(e.month)!;
    const v = (row.get(e.categoryId) ?? 0) + e.amount;
    row.set(e.categoryId, v);
    if (v > 0) used.add(e.categoryId);
    max = Math.max(max, v);
  }
  return { categories: categories.filter(c => used.has(c.id) && ofKind.has(c.id)), values, max };
}

/** Average per month of every category with money in the range: income first, then expenses, each largest first. */
export function categoryAverages(entries: Entry[], categories: Category[], months: MonthKey[]): { category: Category; average: number }[] {
  if (!months.length) return [];
  const inRange = new Set(months);
  const sums = new Map<string, number>();
  for (const e of entries) if (inRange.has(e.month)) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
  return categories
    .filter(c => (sums.get(c.id) ?? 0) > 0)
    .map(c => ({ category: c, average: Math.round((sums.get(c.id) ?? 0) / months.length) }))
    .sort((a, b) => (a.category.kind === b.category.kind ? b.average - a.average : a.category.kind === 'income' ? -1 : 1));
}

/**
 * Months that are over (before `today`'s month) — the basis for averages that
 * shouldn't be dragged down by a month only half entered. Falls back to the
 * current month when nothing is finished yet.
 */
export function finishedMonths(points: MonthPoint[], today = new Date(), last = 6): MonthPoint[] {
  const now = monthKeyOf(today);
  const done = points.filter(p => p.key < now);
  return (done.length ? done : points.filter(p => p.key === now)).slice(-last);
}

/** The intervals offered for an average over `count` finished months: 3, 6 and 12 where there are more, then all (0). */
export function averageSpans(count: number): number[] {
  return [...[3, 6, 12].filter(n => n < count), 0];
}

/** The last `span` finished months (0 = all of them): what an average per month runs over. */
export function averageMonths(points: MonthPoint[], span: number, today = new Date()): MonthKey[] {
  const done = finishedMonths(points, today, Infinity);
  return (span ? done.slice(-span) : done).map(p => p.key);
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export interface SavingsInsight {
  /** Over the months given: total saved / total income (the Sparquote). */
  rate: number | null;
  /** Ø Gespart (income − spending; what was put aside included). */
  averageSaved: number;
  averageIncome: number;
  /** Ø Ausgaben (spending: need and want, without what was put aside). */
  averageExpense: number;
  /** Ø Angelegt: what went into savings categories. */
  averageInvested: number;
  /** Ø Kontoplus: what the balance moved by. */
  averageKept: number;
  months: number;
}

export function savings(points: MonthPoint[]): SavingsInsight {
  const income = points.reduce((s, p) => s + p.income, 0);
  const saved = points.reduce((s, p) => s + p.saved, 0);
  return {
    rate: income > 0 ? saved / income : null,
    averageSaved: avg(points.map(p => p.saved)),
    averageIncome: avg(points.map(p => p.income)),
    averageExpense: avg(points.map(p => p.spending)),
    averageInvested: avg(points.map(p => p.invested)),
    averageKept: avg(points.map(p => p.kept)),
    months: points.length,
  };
}

/** How many months the balance would cover the average spending (null without spending). */
export function reserveMonths(balance: number, averageExpense: number): number | null {
  if (averageExpense <= 0) return null;
  return Math.max(0, balance) / averageExpense;
}

/** The balance after `months` more months of keeping the average (pass Ø Kontoplus: the account's change). */
export function forecast(balance: number, averageKept: number, months: number): number {
  return balance + averageKept * months;
}

/** Months from `from` to the December of its year (0 in December). */
export const monthsToYearEnd = (from: MonthKey) => 12 - Number(from.slice(5, 7));
