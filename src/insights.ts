import { AppData, Category, CategoryKind, Entry, MonthKey } from './types';
import { MonthBalance, addMonths, monthKeyOf } from './logic';
import { budgetOf } from './data/defaults';

/*
 * The statistics beyond plain sums — the few numbers personal-finance guides
 * keep coming back to, computed from what the app already knows:
 *
 *   - savings rate: what share of income is left over;
 *   - emergency reserve ("Notgroschen"): how many months of spending the
 *     account would cover — 3 to 6 months is the usual recommendation;
 *   - 50/30/20: of net income, ~50 % for needs, ~30 % for wants, ~20 % saved;
 *   - a forecast from the recent average;
 *   - recurring commitments per month and per year;
 *   - this month against the usual, per category.
 *
 * All pure, all in cents, tested in insights.test.ts.
 */

/** One started month, summed up for the overview charts. */
export interface MonthPoint {
  key: MonthKey;
  income: number;
  expense: number;
  /** income − expense (paid and open). */
  saved: number;
  /** saved / income, or null without income. */
  rate: number | null;
  /** Balance at the month's end. */
  end: number;
}

/** Every started month (or the last `limit` of them), oldest first. */
export function monthSeries(balances: MonthBalance[], limit?: number): MonthPoint[] {
  const pts = balances.filter(b => b.started).map(b => {
    const income = b.incomePaid + b.incomeOpen;
    const expense = b.expensePaid + b.expenseOpen;
    return { key: b.key, income, expense, saved: income - expense, rate: income > 0 ? (income - expense) / income : null, end: b.end };
  });
  return limit ? pts.slice(-limit) : pts;
}

export interface CategoryMatrix {
  /** Categories of the kind that have money in the range, in the user's order. */
  categories: Category[];
  /** month → category → total */
  values: Map<MonthKey, Map<string, number>>;
  max: number;
}

/** Each category's total per month — the grouped bars. */
export function categoryMatrix(entries: Entry[], categories: Category[], months: MonthKey[], kind: CategoryKind): CategoryMatrix {
  const inRange = new Set(months);
  const ofKind = new Map(categories.filter(c => c.kind === kind).map(c => [c.id, c]));
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

/** Average per month of every category (of either kind) with money in the range. */
export function categoryAverages(entries: Entry[], categories: Category[], months: MonthKey[]): { category: Category; average: number }[] {
  if (!months.length) return [];
  const inRange = new Set(months);
  const sums = new Map<string, number>();
  for (const e of entries) if (inRange.has(e.month)) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
  return categories
    .filter(c => (sums.get(c.id) ?? 0) > 0)
    .map(c => ({ category: c, average: Math.round((sums.get(c.id) ?? 0) / months.length) }))
    .sort((a, b) => (a.category.kind === b.category.kind ? b.average - a.average : a.category.kind === 'expense' ? -1 : 1));
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

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export interface SavingsInsight {
  /** Over the months given: total saved / total income. */
  rate: number | null;
  averageSaved: number;
  averageIncome: number;
  averageExpense: number;
  months: number;
}

export function savings(points: MonthPoint[]): SavingsInsight {
  const income = points.reduce((s, p) => s + p.income, 0);
  const saved = points.reduce((s, p) => s + p.saved, 0);
  return {
    rate: income > 0 ? saved / income : null,
    averageSaved: avg(points.map(p => p.saved)),
    averageIncome: avg(points.map(p => p.income)),
    averageExpense: avg(points.map(p => p.expense)),
    months: points.length,
  };
}

/** How many months the balance would cover the average spending (null without spending). */
export function reserveMonths(balance: number, averageExpense: number): number | null {
  if (averageExpense <= 0) return null;
  return Math.max(0, balance) / averageExpense;
}

/** The balance after `months` more months of saving the average. */
export function forecast(balance: number, averageSaved: number, months: number): number {
  return balance + averageSaved * months;
}

/** Months from `from` to the December of its year (0 in December). */
export const monthsToYearEnd = (from: MonthKey) => 12 - Number(from.slice(5, 7));

export interface BudgetSplit {
  income: number;
  needs: number;
  wants: number;
  /** income − needs − wants (money moved into savings counts here); negative when more went out than came in. */
  saved: number;
}

/** 50/30/20: the average month split into needs, wants and what was left or put aside. */
export function budgetSplit(entries: Entry[], categories: Category[], months: MonthKey[]): BudgetSplit {
  const inRange = new Set(months);
  const byId = new Map(categories.map(c => [c.id, c]));
  let income = 0;
  let needs = 0;
  let wants = 0;
  for (const e of entries) {
    if (!inRange.has(e.month)) continue;
    const c = byId.get(e.categoryId);
    if (!c) continue;
    if (c.kind === 'income') income += e.amount;
    else if (budgetOf(c) === 'need') needs += e.amount;
    else if (budgetOf(c) === 'want') wants += e.amount;
    // 'save' (an ETF plan, a savings account): not spent — it stays in `saved`.
  }
  const n = Math.max(1, months.length);
  const out = { income: Math.round(income / n), needs: Math.round(needs / n), wants: Math.round(wants / n) };
  return { ...out, saved: out.income - out.needs - out.wants };
}

export interface Commitment {
  name: string;
  categoryId: string;
  /** Per month (a yearly one spread over twelve). */
  monthly: number;
  yearly: number;
  repeat: 'monthly' | 'yearly';
}

/**
 * Recurring expenses: every monthly entry of `month` and every yearly entry
 * of the twelve months up to it — what is promised before the month begins.
 */
export function commitments(data: AppData, month: MonthKey): { items: Commitment[]; monthly: number; yearly: number } {
  const kind = new Map(data.categories.map(c => [c.id, c.kind]));
  const from = addMonths(month, -11);
  const items: Commitment[] = [];
  const seen = new Set<string>();
  for (const e of data.entries) {
    if (kind.get(e.categoryId) !== 'expense' || seen.has(e.seriesId)) continue;
    if (e.repeat === 'monthly' && e.month === month) {
      seen.add(e.seriesId);
      items.push({ name: e.name, categoryId: e.categoryId, monthly: e.amount, yearly: e.amount * 12, repeat: 'monthly' });
    } else if (e.repeat === 'yearly' && e.month >= from && e.month <= month) {
      seen.add(e.seriesId);
      items.push({ name: e.name, categoryId: e.categoryId, monthly: Math.round(e.amount / 12), yearly: e.amount, repeat: 'yearly' });
    }
  }
  items.sort((a, b) => b.yearly - a.yearly);
  return { items, monthly: items.reduce((s, i) => s + i.monthly, 0), yearly: items.reduce((s, i) => s + i.yearly, 0) };
}

export interface Unusual {
  category: Category;
  total: number;
  /** Average of the months before. */
  usual: number;
  diff: number;
}

/**
 * Expense categories where `month` differs from the months before it by at
 * least 20 % and 25 € — "Einkaufen: 31 % mehr als üblich". The current month
 * is still filling up, so for it only "more than usual" counts.
 */
export function unusual(entries: Entry[], categories: Category[], month: MonthKey, before: MonthKey[], today = new Date()): Unusual[] {
  const prior = before.filter(m => m < month).slice(-6);
  if (prior.length < 2) return [];
  const running = month >= monthKeyOf(today);
  const totals = (keys: MonthKey[]) => {
    const set = new Set(keys);
    const m = new Map<string, number>();
    for (const e of entries) if (set.has(e.month)) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount);
    return m;
  };
  const now = totals([month]);
  const past = totals(prior);
  return categories
    .filter(c => c.kind === 'expense')
    .map(c => {
      const total = now.get(c.id) ?? 0;
      const usual = Math.round((past.get(c.id) ?? 0) / prior.length);
      return { category: c, total, usual, diff: total - usual };
    })
    .filter(u => u.usual > 0 && Math.abs(u.diff) >= Math.max(2500, u.usual * 0.2) && (!running || u.diff > 0))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);
}

/** The months that saved the most and the least (needs at least two). */
export function bestWorst(points: MonthPoint[]): { best: MonthPoint; worst: MonthPoint } | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => b.saved - a.saved);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
