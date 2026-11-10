import { AppData, Category, Entry, MonthKey } from '../types';
import { MonthBalance, computeBalances, dayIndex, daysInMonth, isoDay, monthKeyOf, normalizeName } from '../logic';
import { budgetOf } from '../data/defaults';
import { Bucket } from './rules';
import { MonthPoint, monthSeries } from './series';

/*
 * The book: every entry read once (O(n)) into per-month sums, so Statistik,
 * Planen, the category screen and the reports don't each rescan ten years of
 * entries (I12). Built once per change of the data (`useMemo` in App) and
 * passed down. The older functions in series / rules / hints keep their own
 * signatures; what is new reads the book.
 */

/** Where an entry's money belongs: income, or one of the 50/30/20 parts. */
export type Part = 'income' | Bucket;

/** Money of one part (or one category) in one month — paid and open — and how it repeats. */
export interface Sums {
  total: number;
  /** Of total, what is still open (not paid / not received yet). */
  open: number;
  /** Of total: once (repeat 'none'), monthly, yearly. */
  once: number;
  monthly: number;
  yearly: number;
  count: number;
}

const sums = (): Sums => ({ total: 0, open: 0, once: 0, monthly: 0, yearly: 0, count: 0 });

const add = (s: Sums, e: Entry) => {
  s.total += e.amount;
  if (!e.paid) s.open += e.amount;
  if (e.repeat === 'monthly') s.monthly += e.amount;
  else if (e.repeat === 'yearly') s.yearly += e.amount;
  else s.once += e.amount;
  s.count++;
};

export interface MonthBook {
  key: MonthKey;
  started: boolean;
  income: Sums;
  need: Sums;
  want: Sums;
  save: Sums;
  byCategory: Map<string, Sums>;
  /** Alltagsausgaben — need and want entries that happen once — by day: `daily[d - 1]` is day d. */
  daily: number[];
  /** Alltagsausgaben without a day in the month (see entryDay). */
  undated: number;
  entries: Entry[];
  /** Open entries of either kind, and what the open expenses come to. */
  openCount: number;
  openExpense: number;
}

/** One expense name (normalised: "LIDL" and "Lidl" are one) across the book. */
export interface NameStat {
  key: string;
  /** As last typed. */
  name: string;
  /** The category it was last booked in. */
  categoryId: string;
  count: number;
  total: number;
  /** month → total under this name */
  months: Map<MonthKey, number>;
  /** The first and the last month it was booked in. */
  first: MonthKey;
  last: MonthKey;
  /** Its entries, as read. */
  entries: Entry[];
}

export interface Book {
  data: AppData;
  byId: Map<string, Category>;
  partOf: (categoryId: string) => Part;
  /** Started months, oldest first. */
  months: MonthKey[];
  byMonth: Map<MonthKey, MonthBook>;
  balances: MonthBalance[];
  /** Every started month as Statistik sums it (D1). */
  points: MonthPoint[];
  names: Map<string, NameStat>;
}

/**
 * The day of its month an entry counts on: its date, else when it was ticked
 * off, else when it was entered — each only when it falls inside the
 * entry's month. Null: no day (an old entry, an import of a past month).
 */
export function entryDay(e: Entry): number | null {
  const dated = e.date ? dayIndex(e.date, e.month) : null;
  if (dated !== null) return dated;
  for (const at of [e.paidAt, e.createdAt]) {
    if (at === undefined) continue;
    const d = new Date(at);
    const index = dayIndex(isoDay(d), e.month);
    if (index !== null) return index;
  }
  return null;
}

function emptyMonth(key: MonthKey, started: boolean): MonthBook {
  return {
    key, started, income: sums(), need: sums(), want: sums(), save: sums(), byCategory: new Map(),
    daily: Array.from({ length: daysInMonth(key) }, () => 0), undated: 0, entries: [], openCount: 0, openExpense: 0,
  };
}

export function buildBook(data: AppData, balances: MonthBalance[] = computeBalances(data)): Book {
  const byId = new Map(data.categories.map(c => [c.id, c]));
  const parts = new Map<string, Part>(data.categories.map(c => [c.id, c.kind === 'income' ? 'income' : budgetOf(c)]));
  // An entry whose category is gone counts as an expense, as the balances do.
  const partOf = (id: string): Part => parts.get(id) ?? 'want';
  const months = data.months.map(m => m.key).sort();
  const byMonth = new Map<MonthKey, MonthBook>(months.map(k => [k, emptyMonth(k, true)]));
  const names = new Map<string, NameStat>();
  for (const e of data.entries) {
    // A transfer between accounts is neither income nor spending (plan 30).
    if (e.transfer) continue;
    let m = byMonth.get(e.month);
    if (!m) byMonth.set(e.month, m = emptyMonth(e.month, false));
    m.entries.push(e);
    const part = partOf(e.categoryId);
    add(m[part], e);
    let c = m.byCategory.get(e.categoryId);
    if (!c) m.byCategory.set(e.categoryId, c = sums());
    add(c, e);
    if (!e.paid) {
      m.openCount++;
      if (part !== 'income') m.openExpense += e.amount;
    }
    if (part === 'income') continue;
    if ((part === 'need' || part === 'want') && e.repeat === 'none') {
      const day = entryDay(e);
      if (day === null) m.undated += e.amount; else m.daily[Math.min(day, m.daily.length) - 1] += e.amount;
    }
    if (e.amount === 0) continue;
    const key = normalizeName(e.name);
    let n = names.get(key);
    if (!n) names.set(key, n = { key, name: e.name, categoryId: e.categoryId, count: 0, total: 0, months: new Map(), first: e.month, last: e.month, entries: [] });
    n.entries.push(e);
    n.count++;
    n.total += e.amount;
    n.months.set(e.month, (n.months.get(e.month) ?? 0) + e.amount);
    if (e.month < n.first) n.first = e.month;
    if (e.month >= n.last) { n.last = e.month; n.name = e.name; n.categoryId = e.categoryId; }
  }
  const points = monthSeries(balances, undefined, key => {
    const s = byMonth.get(key)?.save;
    return s ? { total: s.total, open: s.open } : { total: 0, open: 0 };
  });
  return { data, byId, partOf, months, byMonth, balances, points, names };
}

/** A month of the book; an empty one for a month without anything in it. */
export function monthOf(book: Book, key: MonthKey): MonthBook {
  return book.byMonth.get(key) ?? emptyMonth(key, false);
}

/** Ausgaben (need and want, paid and open). */
export const spendingOf = (m: MonthBook) => m.need.total + m.want.total;
/** Alltagsausgaben: need and want entries that happen once. */
export const everydayOf = (m: MonthBook) => m.need.once + m.want.once;
/** Everything that went out (the account's view): Ausgaben + Angelegt. */
export const outflowOf = (m: MonthBook) => m.need.total + m.want.total + m.save.total;

/** Started months before today's month, oldest first; the last `last` of them. */
export function finishedKeys(book: Book, today = new Date(), last = Infinity): MonthKey[] {
  const now = monthKeyOf(today);
  const done = book.months.filter(k => k < now);
  return Number.isFinite(last) ? done.slice(-last) : done;
}
