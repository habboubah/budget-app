import { Category, Entry, MonthKey } from '../types';
import { addMonths, monthKeyOf, normalizeName } from '../logic';
import { monthBudgets, roundBudget } from '../budgets';
import { Book, finishedKeys, monthOf } from './book';
import { mean, median } from './baseline';
import { Insight, monthHints } from './highlights';
import { MonthPoint } from './series';

/*
 * The rituals (§9.7, plan 13): one month told as a story — the
 * *Monatsbericht* — and, around New Year, the year (*Jahresrückblick*).
 * Both read the same book and series as Statistik, so their figures agree.
 */

export interface MonthReview {
  month: MonthKey;
  /** The running month ("läuft noch"). */
  running: boolean;
  /** Nothing booked: no report to tell. */
  empty: boolean;
  point: MonthPoint;
  /** Gespart in a usual month (the up to six finished months before): the median from four on, else the mean. */
  usualSaved: number | null;
  basis: MonthKey[];
  budgets: { within: number; total: number; over: { category: Category; over: number }[] };
  hints: Insight[];
  /** Ausgaben by category, largest first, each with its usual (median or mean of the months before). */
  categories: { category: Category; amount: number; usual: number | null }[];
  /** Open entries: how many, what is still to pay, what is still to come in — kept apart, never netted. */
  open: { count: number; expense: number; income: number };
  /** The month after: what is fixed (recurring expenses) and the yearly bills in it. */
  next: { month: MonthKey; fixed: number; yearly: { name: string; categoryId: string; amount: number }[] };
}

const EMPTY_POINT = (key: MonthKey): MonthPoint => ({ key, income: 0, expense: 0, spending: 0, invested: 0, saved: 0, kept: 0, rate: null, end: 0 });

const usualOf = (xs: number[]) => (xs.length < 2 ? null : Math.round(xs.length >= 4 ? median(xs) : mean(xs)));

export function monthReview(book: Book, month: MonthKey, today = new Date()): MonthReview {
  const now = monthKeyOf(today);
  const m = monthOf(book, month);
  const point = book.points.find(p => p.key === month) ?? EMPTY_POINT(month);
  const basis = finishedKeys(book, today).filter(k => k < month).slice(-6);
  const usualSaved = usualOf(book.points.filter(p => basis.includes(p.key)).map(p => p.saved));

  // Only this month's entries matter to its budgets.
  const b = monthBudgets({ ...book.data, entries: m.entries }, month, book.data.categories, today);
  const over = b.items.filter(x => x.status.left < 0).map(x => ({ category: x.category, over: -x.status.left }));

  const categories = book.data.categories
    .filter(c => c.kind === 'expense' && book.partOf(c.id) !== 'save')
    .map(c => ({
      category: c,
      amount: m.byCategory.get(c.id)?.total ?? 0,
      usual: usualOf(basis.map(k => monthOf(book, k).byCategory.get(c.id)?.total ?? 0)),
    }))
    .filter(x => x.amount > 0)
    .sort((a, b2) => b2.amount - a.amount);

  const open = { count: m.openCount, expense: m.openExpense, income: m.income.open };

  const nextKey = addMonths(month, 1);
  const nextBook = book.byMonth.get(nextKey);
  let fixed = 0;
  const yearly: MonthReview['next']['yearly'] = [];
  if (nextBook?.started) {
    for (const e of nextBook.entries) {
      if (book.partOf(e.categoryId) === 'income' || e.repeat === 'none') continue;
      if (e.repeat === 'monthly') fixed += e.amount; else yearly.push({ name: e.name, categoryId: e.categoryId, amount: e.amount });
    }
  } else {
    for (const e of m.entries) if (e.repeat === 'monthly' && book.partOf(e.categoryId) !== 'income') fixed += e.amount;
    for (const e of monthOf(book, addMonths(nextKey, -12)).entries) {
      if (e.repeat === 'yearly' && book.partOf(e.categoryId) !== 'income') yearly.push({ name: e.name, categoryId: e.categoryId, amount: e.amount });
    }
  }

  return {
    month, running: month === now, empty: m.entries.length === 0, point, usualSaved, basis,
    budgets: { within: b.within, total: b.items.length, over },
    hints: monthHints(book, month, today),
    categories, open, next: { month: nextKey, fixed, yearly: yearly.sort((a, b2) => b2.amount - a.amount) },
  };
}

/**
 * The month the month-review card on the running month speaks about: the
 * month before it — once there are two finished months, when it has
 * entries, and until it was dismissed or opened (`seen`). Null otherwise.
 */
export function reviewCardMonth(book: Book, today = new Date(), seen: Iterable<MonthKey> = []): MonthKey | null {
  const now = monthKeyOf(today);
  const prev = addMonths(now, -1);
  if (new Set(seen).has(prev) || !book.months.includes(now) || !book.months.includes(prev)) return null;
  if (finishedKeys(book, today).length < 2 || monthOf(book, prev).entries.length === 0) return null;
  return prev;
}

/* ------------------------------------------------------------ the year */

export interface YearReview {
  year: string;
  /** Its started months up to now. */
  months: MonthKey[];
  running: boolean;
  income: number;
  spending: number;
  invested: number;
  saved: number;
  rate: number | null;
  points: MonthPoint[];
  /** The five dearest spending categories, each with the year before (null without that year). */
  top: { category: Category; amount: number; lastYear: number | null }[];
  payees: { name: string; categoryId: string; total: number; count: number }[];
  biggest: Entry | null;
  best: MonthPoint | null;
  /** *Für {year + 1}*. */
  next: {
    /** The recurring costs per month as they run now. */
    fixedMonthly: number;
    /** The yearly bills of the year, and what they ask a month. */
    yearly: number;
    reserveMonthly: number;
    /** A budget per category from the twelve months' average (see suggestBudgets). */
    budgets: { category: Category; amount: number; current?: number }[];
  };
}

/** The Jahresrückblick's season: from 15 December (this year) to 31 January (the year before); else null. */
export function reviewSeason(today = new Date()): string | null {
  const m = today.getMonth();
  if (m === 11 && today.getDate() >= 15) return String(today.getFullYear());
  if (m === 0) return String(today.getFullYear() - 1);
  return null;
}

/** Budget suggestions do not go below this a month. */
export const BUDGET_SUGGEST_MIN = 2000;

/**
 * Budgets to start the next year with: for need and want categories whose
 * twelve months were mostly one-off spending (a rent needs no budget) and
 * came to at least 20 € a month, the average rounded up the way a person
 * sets one (`roundBudget`); at most six, the dearest first.
 */
export function suggestBudgets(book: Book, months: MonthKey[]): { category: Category; amount: number; current?: number }[] {
  if (!months.length) return [];
  const out: { category: Category; amount: number; current?: number }[] = [];
  for (const c of book.data.categories) {
    const part = book.partOf(c.id);
    if (c.kind !== 'expense' || (part !== 'need' && part !== 'want')) continue;
    let total = 0;
    let once = 0;
    for (const k of months) {
      const s = monthOf(book, k).byCategory.get(c.id);
      if (s) { total += s.total; once += s.once; }
    }
    const average = total / months.length;
    if (average < BUDGET_SUGGEST_MIN || once * 2 < total) continue;
    out.push({ category: c, amount: roundBudget(Math.round(average)), ...(c.limit ? { current: c.limit } : {}) });
  }
  return out.sort((a, b) => b.amount - a.amount).slice(0, 6);
}

/* ------------------------------------------- periods and comparison (29) */

/** The years the book has started months in, newest first — the year picker's options. */
export function bookYears(book: Book): string[] {
  const years = new Set<string>();
  for (const k of book.months) years.add(k.slice(0, 4));
  return [...years].sort().reverse();
}

/**
 * The points for a period of Statistik's Verlauf (plan 29): a year ("2025"),
 * the last 6 or 12 months, or all — up to the running month. Finished-only is
 * left to the caller (averages), as elsewhere.
 */
export function periodSeries(points: MonthPoint[], range: string, today = new Date()): MonthPoint[] {
  const now = monthKeyOf(today);
  const upto = points.filter(p => p.key <= now);
  if (/^\d{4}$/.test(range)) return upto.filter(p => p.key.startsWith(`${range}-`));
  if (range === 'all') return upto;
  const n = Number(range);
  return Number.isFinite(n) && n > 0 ? upto.slice(-n) : upto;
}

export interface YearCompare {
  year: string;
  prev: string;
  /** This year and last, over the months both have in common up to today (finished months only). */
  income: { now: number; last: number };
  spending: { now: number; last: number };
  saved: { now: number; last: number };
  /** Spending change in %, or null without last-year spending. */
  spendingChange: number | null;
}

/**
 * This year against the one before (plan 29), over finished months only.
 * Null when the book has no month in the previous year. The percentage is
 * spending now vs last year.
 */
export function compareYears(book: Book, year: string, today = new Date()): YearCompare | null {
  const prev = String(Number(year) - 1);
  if (!book.months.some(k => k.startsWith(`${prev}-`))) return null;
  const now = monthKeyOf(today);
  const sum = (y: string, pick: (p: MonthPoint) => number) =>
    book.points.filter(p => p.key.startsWith(`${y}-`) && p.key < now).reduce((s, p) => s + pick(p), 0);
  const income = { now: sum(year, p => p.income), last: sum(prev, p => p.income) };
  const spending = { now: sum(year, p => p.spending), last: sum(prev, p => p.spending) };
  const saved = { now: income.now - spending.now, last: income.last - spending.last };
  const spendingChange = spending.last > 0 ? Math.round(((spending.now - spending.last) / spending.last) * 100) : null;
  return { year, prev, income, spending, saved, spendingChange };
}

export function yearReview(book: Book, year: string, today = new Date()): YearReview {
  const now = monthKeyOf(today);
  const months = book.months.filter(k => k.startsWith(`${year}-`) && k <= now);
  const points = book.points.filter(p => months.includes(p.key));
  const income = points.reduce((s, p) => s + p.income, 0);
  const spending = points.reduce((s, p) => s + p.spending, 0);
  const invested = points.reduce((s, p) => s + p.invested, 0);
  const saved = income - spending;

  const prevYear = String(Number(year) - 1);
  const hadPrev = book.months.some(k => k.startsWith(`${prevYear}-`));
  const sumIn = (y: string, id: string) => book.months.filter(k => k.startsWith(`${y}-`) && k <= now)
    .reduce((s, k) => s + (monthOf(book, k).byCategory.get(id)?.total ?? 0), 0);
  const top = book.data.categories
    .filter(c => c.kind === 'expense' && book.partOf(c.id) !== 'save')
    .map(c => ({ category: c, amount: sumIn(year, c.id), lastYear: hadPrev ? sumIn(prevYear, c.id) : null }))
    .filter(x => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const inYear = new Set(months);
  const names = new Map<string, { name: string; categoryId: string; total: number; count: number }>();
  let biggest: Entry | null = null;
  for (const e of book.data.entries) {
    if (!inYear.has(e.month)) continue;
    const part = book.partOf(e.categoryId);
    if (part === 'income' || part === 'save' || !e.amount) continue;
    const key = normalizeName(e.name);
    const n = names.get(key) ?? { name: e.name, categoryId: e.categoryId, total: 0, count: 0 };
    n.total += e.amount;
    n.count++;
    names.set(key, n);
    if (e.repeat === 'none' && (!biggest || e.amount > biggest.amount)) biggest = e;
  }
  const payees = [...names.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  const finished = points.filter(p => p.key < now);
  const best = finished.length >= 2 ? [...finished].sort((a, b) => b.saved - a.saved)[0] : null;

  // For the next year: what runs every month now, the yearly bills of the last twelve months.
  const latest = [...book.months].reverse().find(k => k <= now);
  let fixedMonthly = 0;
  if (latest) for (const e of monthOf(book, latest).entries) if (e.repeat === 'monthly' && book.partOf(e.categoryId) !== 'income') fixedMonthly += e.amount;
  let yearly = 0;
  for (let i = 0; i < 12; i++) for (const e of monthOf(book, addMonths(now, -i)).entries) if (e.repeat === 'yearly' && book.partOf(e.categoryId) !== 'income') yearly += e.amount;
  const twelve = finishedKeys(book, today, 12);

  return {
    year, months, running: months.includes(now), income, spending, invested, saved, rate: income > 0 ? saved / income : null, points,
    top, payees, biggest, best,
    next: { fixedMonthly, yearly, reserveMonthly: Math.ceil(yearly / 12 / 100) * 100, budgets: suggestBudgets(book, twelve) },
  };
}

