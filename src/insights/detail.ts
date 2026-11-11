import { Category, Entry, MonthKey } from '../types';
import { addMonths, monthKeyOf, normalizeName } from '../logic';
import { monthlyLimit, suggestLimit } from '../budgets';
import { Book, Part, finishedKeys, monthOf, spendingOf } from './book';
import { Trend, categoryTrends } from './hints';
import { TREND_FLOOR, TREND_SHARE } from './baseline';

/*
 * Drill-down (§9.4, phase 3): one category's months, budget, payees and
 * biggest entries — the *Kategorie* screen — and one payee across the book
 * (the payee sheet).
 */

export interface PayeeRow {
  name: string;
  /** The normalised name, for the payee sheet. */
  key: string;
  count: number;
  total: number;
  /** Per entry. */
  average: number;
}

export interface CategoryDetail {
  category: Category;
  part: Part;
  /** The months in view (up to the running one), oldest first, and each one's total and open part. */
  months: MonthKey[];
  values: Map<MonthKey, { total: number; open: number }>;
  /** The finished months among them: what the average runs over. */
  finished: MonthKey[];
  /** Per month over the finished months in view (all months in view when none is finished). */
  average: number;
  /** Of all spending (or income) over the same months, 0–1; null when there is none. */
  share: number | null;
  /** Its trend over the last six finished months, if it has one, and the month the recent three start with. */
  trend: Trend | null;
  trendSince: MonthKey | null;
  /** The running month so far, and the year up to now. */
  soFar: number;
  yearToDate: number;
  /** The same months a year earlier, from 13 months of history on. */
  lastYear: number | null;
  /** With a budget: in how many of the finished months in view it stayed within. */
  budget: { limit: number; kept: number; months: number } | null;
  suggestion: { amount: number; average: number; months: number } | null;
  payees: PayeeRow[];
  /** The five largest entries in view, largest first. */
  biggest: Entry[];
  /** Its recurring series, as their latest entry up to the running month. */
  fixed: Entry[];
}

/** One category over `months` (Statistik's period); null for a category that is gone. */
export function categoryDetail(book: Book, categoryId: string, months: MonthKey[], today = new Date()): CategoryDetail | null {
  const category = book.byId.get(categoryId);
  if (!category) return null;
  const now = monthKeyOf(today);
  const inView = months.filter(k => k <= now);
  const part = book.partOf(categoryId);
  const values = new Map<MonthKey, { total: number; open: number }>();
  for (const k of inView) {
    const s = monthOf(book, k).byCategory.get(categoryId);
    values.set(k, { total: s?.total ?? 0, open: s?.open ?? 0 });
  }
  const finished = inView.filter(k => k < now);
  const over = finished.length ? finished : inView;
  const total = over.reduce((s, k) => s + (values.get(k)?.total ?? 0), 0);
  const average = over.length ? Math.round(total / over.length) : 0;
  const whole = over.reduce((s, k) => { const m = monthOf(book, k); return s + (part === 'income' ? m.income.total : spendingOf(m) + m.save.total); }, 0);
  const share = whole > 0 ? total / whole : null;

  const six = finishedKeys(book, today, 6);
  const trend = category.kind === 'expense' ? categoryTrends(book.data.entries, [category], six)[0] ?? null : null;
  const trendSince = trend ? six[3] : null;

  const of = (k: MonthKey) => monthOf(book, k).byCategory.get(categoryId)?.total ?? 0;
  const soFar = of(now);
  const year = now.slice(0, 4);
  let yearToDate = 0;
  for (let k = `${year}-01`; k <= now; k = addMonths(k, 1)) yearToDate += of(k);
  let lastYear: number | null = null;
  if (book.months.length && book.months[0] <= addMonths(inView[0] ?? now, -12)) {
    lastYear = inView.reduce((s, k) => s + of(addMonths(k, -12)), 0);
  }

  // A year's budget is shown per month here (a twelfth), like the averages beside it.
  const limit = category.kind === 'expense' ? monthlyLimit(category) ?? null : null;
  const budget = limit ? { limit, kept: finished.filter(k => of(k) <= limit).length, months: finished.length } : null;
  const suggestion = category.kind === 'expense' ? suggestLimit(book.data, categoryId, today) : null;

  const inRange = new Set(inView);
  const mine = book.data.entries.filter(e => e.categoryId === categoryId && inRange.has(e.month));
  const byName = new Map<string, PayeeRow>();
  for (const e of mine) {
    if (!e.amount) continue;
    const key = normalizeName(e.name);
    const row = byName.get(key) ?? { name: e.name, key, count: 0, total: 0, average: 0 };
    row.count++;
    row.total += e.amount;
    byName.set(key, row);
  }
  const payees = [...byName.values()].map(r => ({ ...r, average: Math.round(r.total / r.count) })).sort((a, b) => b.total - a.total);
  const biggest = [...mine].sort((a, b) => b.amount - a.amount || (a.month < b.month ? 1 : -1)).slice(0, 5);

  const latest = new Map<string, Entry>();
  for (const e of book.data.entries) {
    if (e.categoryId !== categoryId || e.repeat === 'none' || e.month > now) continue;
    const had = latest.get(e.seriesId);
    if (!had || e.month > had.month) latest.set(e.seriesId, e);
  }
  // Still running: a monthly one in the latest month up to now, a yearly one within the last twelve.
  const latestMonth = [...book.months].reverse().find(k => k <= now) ?? now;
  const fixed = [...latest.values()]
    .filter(e => (e.repeat === 'monthly' ? e.month === latestMonth : e.month > addMonths(now, -12)))
    .sort((a, b) => b.amount - a.amount);

  return { category, part, months: inView, values, finished, average, share, trend, trendSince, soFar, yearToDate, lastYear, budget, suggestion, payees, biggest, fixed };
}

export interface WhereRow {
  category: Category;
  /** Per month over the months given. */
  average: number;
  /** Of all spending over those months (0–1); the rows add up to 1. */
  share: number;
  /** Against as many finished months just before, when it moved by TREND (15 % and 20 € a month). */
  change: { pct: number; diff: number } | null;
}

/**
 * *Wofür das Geld geht* (§9.3): every spending category (need and want —
 * what goes into savings is saved, D1) with its average over `months`, its
 * share, and how it moved against as many finished months just before.
 */
export function whereRows(book: Book, months: MonthKey[], today = new Date()): { rows: WhereRow[]; before: MonthKey[] } {
  if (!months.length) return { rows: [], before: [] };
  const earlier = finishedKeys(book, today).filter(k => k < months[0]);
  const before = earlier.length >= months.length ? earlier.slice(-months.length) : [];
  const sumOver = (keys: MonthKey[], id: string) => keys.reduce((s, k) => s + (monthOf(book, k).byCategory.get(id)?.total ?? 0), 0);
  const spendIn = book.data.categories.filter(c => c.kind === 'expense' && book.partOf(c.id) !== 'save');
  const totals = spendIn.map(c => ({ category: c, total: sumOver(months, c.id) })).filter(x => x.total > 0);
  const all = totals.reduce((s, x) => s + x.total, 0);
  const rows = totals.map(({ category, total }): WhereRow => {
    const average = Math.round(total / months.length);
    let change: WhereRow['change'] = null;
    if (before.length) {
      const was = sumOver(before, category.id) / before.length;
      const diff = average - was;
      if (was > 0 && Math.abs(diff) >= TREND_FLOOR && Math.abs(diff) >= was * TREND_SHARE) change = { pct: Math.round((Math.abs(diff) / was) * 100), diff: Math.round(diff) };
    }
    return { category, average, share: all > 0 ? total / all : 0, change };
  });
  return { rows: rows.sort((a, b) => b.average - a.average), before };
}

export interface PayeeDetail {
  name: string;
  categoryId: string;
  count: number;
  total: number;
  /** Per entry. */
  average: number;
  first: MonthKey;
  last: MonthKey;
  /** The last twelve months up to now: total per month. */
  months: { key: MonthKey; total: number }[];
  /** Its last few entries, newest first. */
  recent: Entry[];
}

/** One payee across the whole book (a normalised name); null when nothing is booked under it. */
export function payeeDetail(book: Book, nameKey: string, today = new Date()): PayeeDetail | null {
  const stat = book.names.get(nameKey);
  if (!stat) return null;
  const now = monthKeyOf(today);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(now, i - 11)).map(key => ({ key, total: stat.months.get(key) ?? 0 }));
  const recent = [...stat.entries]
    .sort((a, b) => (a.month === b.month ? (b.date ?? '').localeCompare(a.date ?? '') || b.createdAt - a.createdAt : a.month < b.month ? 1 : -1))
    .slice(0, 5);
  return {
    name: stat.name, categoryId: stat.categoryId, count: stat.count, total: stat.total, average: Math.round(stat.total / Math.max(1, stat.count)),
    first: stat.first, last: stat.last, months, recent,
  };
}
