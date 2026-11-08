import { MonthKey } from '../types';
import { addMonths, monthKeyOf, normalizeName } from '../logic';
import { Book, entryDay, everydayOf, finishedKeys, monthOf, spendingOf } from './book';
import { materiality, mean, median } from './baseline';
import { bestWorst, biggestExpenses, categoryTrends, missingRegulars, priceChanges, unusual } from './hints';
import { pace } from './pace';

/*
 * Hints as data (§10.3): each finding is an Insight with what it is about,
 * how much is at stake per month and how sure it is — ranked, one per
 * category, at most three on Statistik (*Das fällt auf*) and five in a
 * Monatsbericht. The words come from translations in the view
 * (insights/text.ts); nothing here builds a sentence.
 */

export type InsightKind = 'unusual' | 'trend' | 'betterMonth' | 'record' | 'dataCheck' | 'bigExpense' | 'priceChange' | 'newRecurring' | 'missing';

export type InsightAction = { kind: 'category' | 'budget' | 'month' | 'report' | 'add' | 'contracts'; target: string };

export interface Insight {
  /** kind:subject:period — stable, for dismissing and deduping. */
  id: string;
  kind: InsightKind;
  /** Which sentence of the kind: 'more' / 'less' / 'running', 'up' / 'down', 'better' / 'worse', 'best' / 'worst', 'open' / 'stale'. */
  variant: string;
  home: 'statistik' | 'planen' | 'report';
  /** What it is about, oldest first. */
  months: MonthKey[];
  /** What it is compared with (the usual's months, the three months before a trend). */
  basis?: MonthKey[];
  categoryId?: string;
  name?: string;
  tone: 'pos' | 'neutral' | 'warn';
  /** Cents per month at stake, for ranking. */
  impact: number;
  /** 0–1: how many months it stands on, whether the month is still running, a sparse category. */
  confidence: number;
  /** For the sentence, in cents (or days, a count). */
  values: Record<string, number>;
  action?: InsightAction;
  score: number;
}

/** How much each kind counts when ranking: a stale month first, a record or one big expense last. */
export const KIND_WEIGHT: Record<InsightKind, number> = {
  dataCheck: 1.2, unusual: 1.0, priceChange: 1.0, newRecurring: 1.0, trend: 0.9, betterMonth: 0.8, missing: 0.8, record: 0.5, bigExpense: 0.4,
};

/** Statistik shows three, a Monatsbericht five. */
export const STATISTIK_CAP = 3;
export const REPORT_CAP = 5;
/** One expense of at least a quarter of a month's spending is worth a line (H8). */
export const BIG_SHARE = 0.25;

type Draft = Omit<Insight, 'score'>;

const scored = (d: Draft): Insight => ({ ...d, score: d.impact * d.confidence * KIND_WEIGHT[d.kind] });

/** What a row is about, for "never the same thing twice": its category, else its month. */
const subject = (i: Insight) => i.categoryId ?? (i.kind === 'dataCheck' ? `data:${i.months[0]}` : `month:${i.months[0]}`);

/** Best first, one per category (or month), at most `cap`. */
export function rank(list: Insight[], cap: number, hidden: Iterable<string> = []): Insight[] {
  const gone = new Set(hidden);
  const best = new Map<string, Insight>();
  for (const i of list) {
    if (gone.has(i.id) || !(i.score > 0)) continue;
    const key = subject(i);
    const had = best.get(key);
    if (!had || i.score > had.score) best.set(key, i);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1)).slice(0, cap);
}

/** The usual of a few signed values: the median from four on, else the mean; null with fewer than two. */
const usualSigned = (xs: number[]) => (xs.length < 2 ? null : Math.round(xs.length >= 4 ? median(xs) : mean(xs)));

/** H3: a category against its usual, in `month` (only "more" while it runs). */
function unusualIn(book: Book, month: MonthKey, today: Date): Draft[] {
  const running = month === monthKeyOf(today);
  return unusual(book.data.entries, book.data.categories, month, finishedKeys(book, today), today).map(u => ({
    id: `unusual:${u.category.id}:${month}`,
    kind: 'unusual',
    variant: running ? 'running' : u.diff > 0 ? 'more' : 'less',
    home: 'statistik',
    months: [month],
    basis: u.basis,
    categoryId: u.category.id,
    tone: u.diff > 0 ? 'warn' : 'pos',
    impact: Math.abs(u.diff),
    confidence: Math.min(1, u.basis.length / 6) * (running ? 0.8 : 1) * (u.method === 'mean' ? 0.8 : 1),
    values: { total: u.total, usual: u.usual, diff: u.diff, pct: Math.round((Math.abs(u.diff) / Math.max(1, u.usual)) * 100), material: u.material },
    action: u.diff > 0 && !u.category.limit ? { kind: 'budget', target: u.category.id } : { kind: 'category', target: u.category.id },
  }));
}

/** H4: categories trending over the last six finished months. */
function trends(book: Book, today: Date): Draft[] {
  const six = finishedKeys(book, today, 6);
  if (six.length < 6) return [];
  return categoryTrends(book.data.entries, book.data.categories, six).map(x => ({
    id: `trend:${x.category.id}:${six[5]}`,
    kind: 'trend',
    variant: x.diff > 0 ? 'up' : 'down',
    home: 'statistik',
    months: six.slice(3),
    basis: six.slice(0, 3),
    categoryId: x.category.id,
    tone: x.diff > 0 ? 'warn' : 'pos',
    impact: Math.abs(x.diff),
    confidence: 1,
    values: { recent: x.recent, earlier: x.earlier, diff: x.diff },
    action: { kind: 'category', target: x.category.id },
  }));
}

/** H5 and H6: the last finished month against a usual one, and whether it is a record. */
function monthResult(book: Book, today: Date): Draft[] {
  const done = finishedKeys(book, today, 13);
  const last = done[done.length - 1];
  if (!last) return [];
  const point = book.points.find(p => p.key === last);
  if (!point || (!point.income && !point.spending)) return [];
  const out: Draft[] = [];
  const before = done.slice(0, -1).slice(-6);
  const pts = book.points.filter(p => before.includes(p.key));
  const usualSaved = usualSigned(pts.map(p => p.saved));
  const usualSpending = usualSigned(pts.map(p => p.spending)) ?? 0;
  if (usualSaved !== null) {
    const diff = point.saved - usualSaved;
    const material = materiality(usualSpending);
    if (Math.abs(diff) >= material) {
      out.push({
        id: `betterMonth:${last}`, kind: 'betterMonth', variant: diff > 0 ? 'better' : 'worse', home: 'statistik',
        months: [last], basis: before, tone: diff > 0 ? 'pos' : 'warn', impact: Math.abs(diff), confidence: Math.min(1, before.length / 6),
        values: { saved: point.saved, usual: usualSaved, diff, material }, action: { kind: 'report', target: last },
      });
    }
  }
  const year = book.points.filter(p => done.slice(-12).includes(p.key));
  const bw = year.length >= 4 ? bestWorst(year) : null;
  // Only a record when no other month ties it.
  const others = year.filter(p => p.key !== last);
  const isBest = !!bw && others.every(p => p.saved < point.saved);
  const isWorst = !!bw && others.every(p => p.saved > point.saved);
  if (isBest || isWorst) {
    const best = isBest;
    const typical = median(year.map(p => p.saved));
    out.push({
      id: `record:${last}`, kind: 'record', variant: best ? 'best' : 'worst', home: 'statistik',
      months: [last], basis: year.map(p => p.key), tone: 'neutral', impact: Math.abs(point.saved - typical), confidence: Math.min(1, year.length / 12),
      values: { saved: point.saved, n: year.length }, action: { kind: 'report', target: last },
    });
  }
  return out;
}

/** H7: a finished month with open entries left, or a running month nobody has entered anything in for a week. */
function dataChecks(book: Book, today: Date): Draft[] {
  const out: Draft[] = [];
  const done = finishedKeys(book, today);
  const leftover = [...done].reverse().find(k => monthOf(book, k).openCount > 0);
  if (leftover) {
    const m = monthOf(book, leftover);
    const sum = m.entries.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0);
    out.push({
      id: `dataCheck:open:${leftover}`, kind: 'dataCheck', variant: 'open', home: 'statistik', months: [leftover], tone: 'neutral',
      impact: sum, confidence: 1, values: { count: m.openCount, sum }, action: { kind: 'month', target: leftover },
    });
  }
  const p = pace(book, today);
  if (p.verdict === 'stale') {
    const usualMonth = p.usualTotal ?? (done.length ? everydayOf(monthOf(book, done[done.length - 1])) : 0);
    out.push({
      id: `dataCheck:stale:${p.month}`, kind: 'dataCheck', variant: 'stale', home: 'statistik', months: [p.month], tone: 'neutral',
      impact: Math.round((usualMonth * p.staleDays) / p.days), confidence: 1, values: { days: p.staleDays }, action: { kind: 'month', target: p.month },
    });
  }
  return out;
}

/** H8: one one-off expense that was at least a quarter of a month's spending. */
function bigOnes(book: Book, month: MonthKey, home: Insight['home']): Draft[] {
  const m = monthOf(book, month);
  const spending = spendingOf(m);
  if (spending <= 0) return [];
  const once = m.entries.filter(e => e.repeat === 'none' && book.partOf(e.categoryId) !== 'income' && book.partOf(e.categoryId) !== 'save');
  const top = biggestExpenses(once, book.data.categories, month, 1)[0];
  if (!top) return [];
  // A habit isn't news: not a name booked in two of the three months before (the monthly shop in one entry).
  const stat = book.names.get(normalizeName(top.entry.name));
  if (stat && [1, 2, 3].filter(i => stat.months.has(addMonths(month, -i))).length >= 2) return [];
  const share = top.entry.amount / spending;
  if (share < BIG_SHARE) return [];
  return [{
    id: `bigExpense:${top.entry.id}`, kind: 'bigExpense', variant: 'one', home, months: [month], categoryId: top.entry.categoryId, name: top.entry.name,
    tone: 'neutral', impact: top.entry.amount, confidence: 1, values: { amount: top.entry.amount, pct: Math.round(share * 100) },
    action: { kind: 'month', target: month },
  }];
}

/** P3: monthly bills with a new price in `month`, with what it does in a year. */
function prices(book: Book, month: MonthKey, home: Insight['home']): Draft[] {
  return priceChanges(book.data.entries, book.data.categories, month).map(c => ({
    id: `priceChange:${normalizeName(c.name)}:${month}`, kind: 'priceChange', variant: c.diff > 0 ? 'up' : 'down', home, months: [month],
    categoryId: c.categoryId, name: c.name, tone: c.diff > 0 ? 'warn' : 'pos', impact: Math.abs(c.diff), confidence: 1,
    values: { before: c.before, now: c.now, diff: c.diff, yearly: c.diff * 12 }, action: { kind: 'contracts', target: 'contracts' },
  }));
}

/**
 * P4: a monthly expense under a name never seen before (`newNames`, read off
 * the book: the name's first month is this one, and the book is older).
 */
function newRecurring(book: Book, month: MonthKey, home: Insight['home']): Draft[] {
  if (!book.months.length || book.months[0] >= month) return [];
  const fresh = monthOf(book, month).entries
    .filter(e => e.repeat === 'monthly' && e.amount > 0 && book.partOf(e.categoryId) !== 'income' && book.names.get(normalizeName(e.name))?.first === month)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  return fresh.map(e => ({
    id: `newRecurring:${normalizeName(e.name)}:${month}`, kind: 'newRecurring', variant: 'one', home, months: [month], categoryId: e.categoryId, name: e.name,
    tone: 'neutral', impact: e.amount, confidence: 1, values: { amount: e.amount }, action: { kind: 'contracts', target: 'contracts' },
  }));
}

/**
 * P5: what came once in each of the three months before and isn't in the
 * running month yet — only once its usual day has passed (two days' grace),
 * so the weekly shop isn't "missing" on the 3rd.
 */
function missing(book: Book, today: Date): Draft[] {
  const now = monthKeyOf(today);
  const prior = [1, 2, 3].map(i => monthOf(book, addMonths(now, -i)).entries);
  const found = missingRegulars(book.data.entries, now);
  const out: Draft[] = [];
  for (const x of found) {
    const key = normalizeName(x.name);
    const hits = prior.map(list => list.filter(e => normalizeName(e.name) === key));
    if (hits.some(h => h.length !== 1)) continue;
    const days = hits.map(h => entryDay(h[0])).filter((d): d is number => d !== null);
    const usualDay = days.length ? Math.round(median(days)) : 1;
    if (today.getDate() < usualDay + 2) continue;
    const income = book.partOf(x.categoryId) === 'income';
    out.push({
      id: `missing:${key}:${now}`, kind: 'missing', variant: income ? 'income' : 'expense', home: 'planen', months: [now], categoryId: x.categoryId,
      name: x.name, tone: 'warn', impact: x.usual, confidence: 1, values: { usual: x.usual, day: usualDay },
      action: { kind: 'add', target: x.name },
    });
  }
  return out;
}

/**
 * Das fällt auf (Statistik): the recent findings — the running month and the
 * last finished one against their usual, trends, a better or worse month, a
 * record, data to check, one big expense — ranked, one per category, three
 * at most. Dismissed ids (a view preference) stay away.
 */
export function highlights(book: Book, today = new Date(), hidden: Iterable<string> = [], cap = STATISTIK_CAP): Insight[] {
  const now = monthKeyOf(today);
  const last = finishedKeys(book, today).at(-1);
  const drafts: Draft[] = [
    ...(book.months.includes(now) ? unusualIn(book, now, today) : []),
    ...(last ? unusualIn(book, last, today) : []),
    ...trends(book, today),
    ...monthResult(book, today),
    ...dataChecks(book, today),
    ...(last ? bigOnes(book, last, 'statistik') : []),
  ];
  return rank(drafts.map(scored), cap, hidden);
}

/** For Abos & Verträge (Planen): new subscriptions this month or last (P4) and regular payments still missing (P5). */
export function contractHints(book: Book, today = new Date(), hidden: Iterable<string> = []): { fresh: Insight[]; missing: Insight[] } {
  const now = monthKeyOf(today);
  const fresh = [...newRecurring(book, now, 'planen'), ...newRecurring(book, addMonths(now, -1), 'planen')];
  const seen = new Set<string>();
  const gone = new Set(hidden);
  const uniq = fresh.map(scored).filter(i => !gone.has(i.id) && !seen.has(i.name!) && seen.add(i.name!));
  return { fresh: uniq.sort((a, b) => b.score - a.score).slice(0, 3), missing: missing(book, today).map(scored).filter(i => !gone.has(i.id)).slice(0, 3) };
}

/** What changed in one month (its Monatsbericht): unusual categories, trends, one big expense, new prices, new subscriptions. */
export function monthHints(book: Book, month: MonthKey, today = new Date(), cap = REPORT_CAP): Insight[] {
  const report = (d: Draft): Draft => ({ ...d, home: 'report' });
  const drafts: Draft[] = [
    ...unusualIn(book, month, today).map(report),
    ...(finishedKeys(book, today).at(-1) === month ? trends(book, today).map(report) : []),
    ...bigOnes(book, month, 'report'),
    ...prices(book, month, 'report'),
    ...newRecurring(book, month, 'report'),
  ];
  return rank(drafts.map(scored), cap);
}

