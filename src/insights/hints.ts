import { Category, CategoryKind, Entry, MonthKey } from '../types';
import { addMonths, monthKeyOf, normalizeName } from '../logic';
import { MonthPoint } from './series';

/*
 * The hints: this month against the usual, what got dearer, what is missing
 * this month, what is new, which categories trend up or down, the biggest
 * expenses, the best and the weakest month. Each says nothing when it has
 * nothing to say.
 */

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
