import { AppData, Category, CategoryKind, Entry, MonthKey } from './types';
import { MonthBalance, addMonths, monthKeyOf, normalizeName } from './logic';
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
 *   - this month against the usual, per category;
 *   - hints in the same spirit: what got dearer, what is missing this month,
 *     what is new, which categories trend up or down, the biggest expenses.
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
  /** Of `income`, what is still expected (not received yet). */
  incomeOpen?: number;
  /** Of `expense`, what is still open (not paid yet). */
  expenseOpen?: number;
}

/** Every started month (or the last `limit` of them), oldest first. */
export function monthSeries(balances: MonthBalance[], limit?: number): MonthPoint[] {
  const pts = balances.filter(b => b.started).map(b => {
    const income = b.incomePaid + b.incomeOpen;
    const expense = b.expensePaid + b.expenseOpen;
    return {
      key: b.key, income, expense, saved: income - expense, rate: income > 0 ? (income - expense) / income : null, end: b.end,
      incomeOpen: b.incomeOpen, expenseOpen: b.expenseOpen,
    };
  });
  return limit ? pts.slice(-limit) : pts;
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

export type Bucket = 'need' | 'want' | 'save';

export interface RulePart {
  bucket: Bucket;
  /** The rule's share of income: 50, 30, 20. */
  target: number;
  /** Per month on average: needs or wants spent, or what was saved (income − needs − wants). */
  amount: number;
  /** The target share of the average income, in cents. */
  budget: number;
  /** amount / income in %, or null without income. */
  share: number | null;
  /** Needs and wants within their share, saving at least its share. */
  ok: boolean;
  /** Its biggest categories, per month on average (for saving: the "save" ones, an ETF plan). */
  top: { category: Category; amount: number }[];
}

export interface RuleCheck {
  income: number;
  parts: RulePart[];
  /** How many of the three the average month meets. */
  met: number;
  /** Each month with income: how many of the three it met. */
  months: { key: MonthKey; met: number }[];
}

const TARGETS: [Bucket, number][] = [['need', 50], ['want', 30], ['save', 20]];

function ruleParts(split: BudgetSplit, top: (b: Bucket) => RulePart['top'] = () => []): RulePart[] {
  const amounts: Record<Bucket, number> = { need: split.needs, want: split.wants, save: split.saved };
  return TARGETS.map(([bucket, target]) => {
    const amount = amounts[bucket];
    const budget = Math.round((split.income * target) / 100);
    const ok = split.income > 0 && (bucket === 'save' ? amount >= budget : amount <= budget);
    return { bucket, target, amount, budget, share: split.income > 0 ? (amount / split.income) * 100 : null, ok, top: top(bucket) };
  });
}

/**
 * How the average month (over `months`) keeps to 50/30/20: each part against
 * its share of income — in % and in euros — with its biggest categories, how
 * many of the three it meets, and the same count month by month.
 */
export function budgetRule(entries: Entry[], categories: Category[], months: MonthKey[]): RuleCheck {
  const split = budgetSplit(entries, categories, months);
  const inRange = new Set(months);
  const n = Math.max(1, months.length);
  const sums = new Map<string, number>();
  for (const e of entries) if (inRange.has(e.month)) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
  const top = (b: Bucket) => categories
    .filter(c => c.kind === 'expense' && budgetOf(c) === b && (sums.get(c.id) ?? 0) > 0)
    .map(c => ({ category: c, amount: Math.round((sums.get(c.id) ?? 0) / n) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const parts = ruleParts(split, top);
  const perMonth = months
    .map(key => ({ key, split: budgetSplit(entries, categories, [key]) }))
    .filter(m => m.split.income > 0)
    .map(m => ({ key: m.key, met: ruleParts(m.split).filter(p => p.ok).length }));
  return { income: split.income, parts, met: parts.filter(p => p.ok).length, months: perMonth };
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
 * Expense categories where a month (or several, `months`) differs from the up
 * to six months before by at least 20 % and 25 € a month — "Einkaufen: 31 %
 * mehr als üblich". Over several months `usual` is what as many usual months
 * cost. The current month is still filling up, so while it is part of the
 * period only "more than usual" counts.
 */
export function unusual(entries: Entry[], categories: Category[], months: MonthKey | MonthKey[], before: MonthKey[], today = new Date()): Unusual[] {
  const period = Array.isArray(months) ? months : [months];
  const prior = unusualBasis(period, before);
  if (!period.length || prior.length < 2) return [];
  const running = period.some(m => m >= monthKeyOf(today));
  const totals = (keys: MonthKey[]) => {
    const set = new Set(keys);
    const m = new Map<string, number>();
    for (const e of entries) if (set.has(e.month)) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount);
    return m;
  };
  const now = totals(period);
  const past = totals(prior);
  return categories
    .filter(c => c.kind === 'expense')
    .map(c => {
      const total = now.get(c.id) ?? 0;
      const usual = Math.round(((past.get(c.id) ?? 0) / prior.length) * period.length);
      return { category: c, total, usual, diff: total - usual };
    })
    .filter(u => u.usual > 0 && Math.abs(u.diff) >= Math.max(2500 * period.length, u.usual * 0.2) && (!running || u.diff > 0))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);
}

/** The months "usual" is measured on: up to six before the period starts. */
export function unusualBasis(period: MonthKey[], before: MonthKey[]): MonthKey[] {
  return period.length ? before.filter(m => m < period[0]).slice(-6) : [];
}

/* ------------------------------------------------- hints, like "unusual" */

/** A name as people type it, grouped: "LIDL", "Lidl " → one. */
const keyOf = (e: Entry) => normalizeName(e.name);
const kinds = (categories: Category[]) => new Map(categories.map(c => [c.id, c.kind]));
const isExpense = (k: Map<string, CategoryKind>, e: Entry) => (k.get(e.categoryId) ?? 'expense') === 'expense';

export interface PriceChange {
  name: string;
  categoryId: string;
  before: number;
  now: number;
  diff: number;
}

/**
 * Monthly bills that cost something else than last month — "Aras Energy
 * 83,00 € → 95,00 €". Only names booked once in each of the two months and
 * repeating monthly, by at least 1 € and 3 %; largest change first.
 */
export function priceChanges(entries: Entry[], categories: Category[], month: MonthKey): PriceChange[] {
  const k = kinds(categories);
  const prev = addMonths(month, -1);
  const once = (m: MonthKey) => {
    const by = new Map<string, Entry[]>();
    for (const e of entries) if (e.month === m && isExpense(k, e)) by.set(keyOf(e), [...(by.get(keyOf(e)) ?? []), e]);
    return new Map([...by].filter(([, xs]) => xs.length === 1).map(([key, xs]) => [key, xs[0]]));
  };
  const before = once(prev);
  return [...once(month)]
    .filter(([key, e]) => e.repeat === 'monthly' && before.has(key))
    .map(([key, e]) => ({ name: e.name, categoryId: e.categoryId, before: before.get(key)!.amount, now: e.amount, diff: e.amount - before.get(key)!.amount }))
    .filter(c => Math.abs(c.diff) >= Math.max(100, c.before * 0.03))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5);
}

export interface MissingRegular {
  name: string;
  categoryId: string;
  /** Average over the months it was there. */
  usual: number;
}

/**
 * What came in or went out in each of the three months before but is not in
 * `month` yet — "Vodafone, usually 19,99 €": a bill not entered, a payment
 * that stopped. Only for a month that has entries of its own.
 */
export function missingRegulars(entries: Entry[], month: MonthKey): MissingRegular[] {
  if (!entries.some(e => e.month === month)) return [];
  const prior = [1, 2, 3].map(i => addMonths(month, -i));
  const seen = new Map<string, { last: Entry; months: Set<MonthKey>; sum: number; n: number }>();
  for (const e of entries) {
    if (!prior.includes(e.month)) continue;
    const g = seen.get(keyOf(e)) ?? { last: e, months: new Set<MonthKey>(), sum: 0, n: 0 };
    g.months.add(e.month);
    g.sum += e.amount;
    g.n++;
    if (e.month >= g.last.month) g.last = e;
    seen.set(keyOf(e), g);
  }
  const now = new Set(entries.filter(e => e.month === month).map(keyOf));
  return [...seen]
    .filter(([key, g]) => g.months.size === 3 && !now.has(key))
    .map(([, g]) => ({ name: g.last.name, categoryId: g.last.categoryId, usual: Math.round(g.sum / g.n) }))
    .sort((a, b) => b.usual - a.usual)
    .slice(0, 5);
}

/**
 * Expenses of `month` under a name never booked before — a new shop, a new
 * subscription. Largest first; nothing when there is no earlier month to
 * compare with.
 */
export function newNames(entries: Entry[], categories: Category[], month: MonthKey): Entry[] {
  const k = kinds(categories);
  const earlier = entries.filter(e => e.month < month);
  if (!earlier.length) return [];
  const known = new Set(earlier.map(keyOf));
  return entries
    .filter(e => e.month === month && isExpense(k, e) && !known.has(keyOf(e)))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

export interface Trend {
  category: Category;
  /** Average of the last three months, and of the three before. */
  recent: number;
  earlier: number;
  diff: number;
}

/**
 * Expense categories moving in one direction: the average of the last three
 * months against the three before, by at least 15 % and 20 €. Needs six
 * months; give it finished ones, oldest first.
 */
export function categoryTrends(entries: Entry[], categories: Category[], months: MonthKey[]): Trend[] {
  if (months.length < 6) return [];
  const last = months.slice(-3);
  const before = months.slice(-6, -3);
  const avgOf = (keys: MonthKey[], id: string) =>
    Math.round(entries.filter(e => e.categoryId === id && keys.includes(e.month)).reduce((s, e) => s + e.amount, 0) / keys.length);
  return categories
    .filter(c => c.kind === 'expense')
    .map(c => {
      const recent = avgOf(last, c.id);
      const earlier = avgOf(before, c.id);
      return { category: c, recent, earlier, diff: recent - earlier };
    })
    .filter(x => x.earlier > 0 && Math.abs(x.diff) >= Math.max(2000, x.earlier * 0.15))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4);
}

/** The largest expense entries of a month (or several), with their share of all its expenses. */
export function biggestExpenses(entries: Entry[], categories: Category[], months: MonthKey | MonthKey[], count = 3): { entry: Entry; share: number }[] {
  const k = kinds(categories);
  const period = new Set(Array.isArray(months) ? months : [months]);
  const mine = entries.filter(e => period.has(e.month) && isExpense(k, e));
  const total = mine.reduce((s, e) => s + e.amount, 0);
  if (!total) return [];
  return [...mine].sort((a, b) => b.amount - a.amount).slice(0, count).map(entry => ({ entry, share: entry.amount / total }));
}

/** The months that saved the most and the least (needs at least two). */
export function bestWorst(points: MonthPoint[]): { best: MonthPoint; worst: MonthPoint } | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => b.saved - a.saved);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
