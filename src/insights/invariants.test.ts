import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Book, buildBook, finishedKeys, monthOf } from './book';
import { budgetRule } from './rules';
import { pace } from './pace';
import { outlook } from './outlook';
import { financeCheck, grundbedarf } from './health';
import { contractHints, highlights, monthHints } from './highlights';
import { categoryDetail, payeeDetail, whereRows } from './detail';
import { monthReview, yearReview } from './review';
import { upToNow } from './series';
import { addMonths, computeBalances, monthTotals } from '../logic';
import { loadStored } from '../storage';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry, MonthRecord } from '../types';

/*
 * What must hold on any book (STATISTICS_AND_INSIGHTS.md §12): books from a
 * seeded generator, edge cases, the fixtures of every older version, and
 * ten years of entries against the speed budget.
 */

const cats = defaultCategories();

/** A book of `months` months ending in `last`, from a seed: salary, rent, an ETF plan, shopping on random days, open and undated entries, now and then an opening override and a yearly bill. */
function generated(seed: number, months = 18, last = '2026-11', perMonth = 14): AppData {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const keys = Array.from({ length: months }, (_, i) => addMonths(last, i - months + 1));
  const entries: Entry[] = [];
  let id = 0;
  const add = (month: string, categoryId: string, name: string, cents: number, extra: Partial<Entry> = {}) => {
    id++;
    const day = 1 + Math.floor(rnd() * 28);
    entries.push({
      id: `x${id}`, month, categoryId, name, amount: Math.max(0, Math.round(cents)), paid: rnd() > 0.1, repeat: 'none', seriesId: `x${id}`,
      createdAt: Date.UTC(2020, 0, 1) + id, ...(rnd() > 0.15 ? { date: `${month}-${String(day).padStart(2, '0')}` } : {}), ...extra,
    });
  };
  const shops = ['Lidl', 'Rewe', 'Aldi', 'dm', 'Kino', 'Tanken', 'Amazon'];
  const spend = ['groceries', 'groceries', 'leisure', 'extra', 'car', 'restaurants', 'clothing'];
  for (const m of keys) {
    add(m, 'income', 'Gehalt', 280000 + rnd() * 60000, { repeat: 'monthly', seriesId: 'gehalt', date: `${m}-27` });
    add(m, 'fixed', 'Miete', 105000, { repeat: 'monthly', seriesId: 'miete', date: `${m}-01` });
    if (rnd() > 0.3) add(m, 'investment', 'ETF', 15000 + rnd() * 10000, { repeat: 'monthly', seriesId: 'etf' });
    if (m.endsWith('-03')) add(m, 'car', 'Kfz-Steuer', 14000, { repeat: 'yearly', seriesId: 'kfz' });
    for (let i = 0; i < perMonth; i++) {
      const k = Math.floor(rnd() * spend.length);
      add(m, spend[k], shops[k], 500 + rnd() * 9000);
    }
    if (rnd() > 0.9) add(m, 'shopping', 'Waschmaschine', 64900);
  }
  const monthsOut: MonthRecord[] = keys.map((key, i) => (i === 0 || rnd() > 0.93 ? { key, startedAt: 0, opening: Math.round(rnd() * 500000) } : { key, startedAt: 0 }));
  return { categories: cats, entries, months: monthsOut };
}

/** Every number in a result is finite (no NaN or Infinity anywhere). */
function finite(x: unknown, path = '$'): string[] {
  if (typeof x === 'number') return Number.isFinite(x) ? [] : [path];
  if (x instanceof Map) return [...x.entries()].flatMap(([k, v]) => finite(v, `${path}.${String(k)}`));
  if (x instanceof Set) return [];
  if (Array.isArray(x)) return x.flatMap((v, i) => finite(v, `${path}[${i}]`));
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([k, v]) => (k === 'data' ? [] : finite(v, `${path}.${k}`)));
  return [];
}

/** Every new figure on a book, as one object. */
function everything(book: Book, today: Date) {
  const view = upToNow(book.points, today).map(p => p.key).slice(-6);
  const finished = finishedKeys(book, today);
  const last = finished[finished.length - 1];
  const someCategory = book.data.categories.find(c => c.kind === 'expense')?.id ?? 'extra';
  const someName = book.names.keys().next().value;
  return {
    points: book.points,
    pace: pace(book, today),
    outlook: outlook(book, today),
    check: financeCheck(book, today),
    grundbedarf: grundbedarf(book, today),
    highlights: highlights(book, today, [], 99),
    contracts: contractHints(book, today),
    where: whereRows(book, view, today),
    category: categoryDetail(book, someCategory, view, today),
    payee: someName ? payeeDetail(book, someName, today) : null,
    report: last ? monthReview(book, last, today) : null,
    reportHints: last ? monthHints(book, last, today, 99) : [],
    year: yearReview(book, String(today.getFullYear()), today),
    rule: budgetRule(book.data.entries, book.data.categories, finished.slice(-6)),
  };
}

const today = new Date(2026, 10, 15, 10);

describe('invariants on generated books', () => {
  for (const seed of [3, 7, 11, 23, 42, 99]) {
    it(`hold for seed ${seed}`, () => {
      const data = generated(seed);
      const book = buildBook(data);
      const all = everything(book, today);
      expect(finite(all)).toEqual([]);

      // Gespart = Einnahmen − Ausgaben = Kontoplus + Angelegt; the month page's expenses = Ausgaben + Angelegt.
      for (const p of book.points) {
        expect(p.saved).toBe(p.income - p.spending);
        expect(p.saved).toBe(p.kept + p.invested);
        const t = monthTotals(data.entries, data.categories, p.key);
        expect(p.spending + p.invested).toBe(t.expensePaid + t.expenseOpen);
      }
      // The month-end balance moves by Kontoplus from one month to the next without an override.
      const overridden = new Set(data.months.filter(m => m.opening !== undefined).map(m => m.key));
      for (let i = 1; i < book.points.length; i++) {
        if (overridden.has(book.points[i].key)) continue;
        expect(book.points[i].end - book.points[i - 1].end).toBe(book.points[i].kept);
      }
      // Category shares add up to 100 %.
      if (all.where.rows.length) expect(all.where.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 9);
      // The pace never goes down; the band holds the usual.
      const p = all.pace;
      for (const curve of [p.actual, p.usual ?? []]) for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
      if (p.band && p.usual) p.usual.forEach((u, i) => { expect(p.band!.lo[i]).toBeLessThanOrEqual(u + 1); expect(p.band!.hi[i]).toBeGreaterThanOrEqual(u - 1); });
      expect(p.projected ?? p.spent).toBeGreaterThanOrEqual(p.spent);
      // Ausblick: calm ≥ middle ≥ pricey.
      for (const m of all.outlook?.months ?? []) { expect(m.lo).toBeLessThanOrEqual(m.mid); expect(m.hi).toBeGreaterThanOrEqual(m.mid); }
      // No category twice among the highlights, and every action points at something that exists.
      const top = highlights(book, today);
      expect(top.length).toBeLessThanOrEqual(3);
      const subjects = top.map(i => i.categoryId ?? `${i.kind}:${i.months[0]}`);
      expect(new Set(subjects).size).toBe(subjects.length);
      for (const i of [...all.highlights, ...all.reportHints]) {
        if (!i.action) continue;
        const { kind, target } = i.action;
        if (kind === 'category' || kind === 'budget') expect(book.byId.has(target)).toBe(true);
        if (kind === 'month' || kind === 'report') expect(book.months).toContain(target);
      }
      // The report, the category screen and the series agree on a month.
      if (all.report && all.category) {
        const key = all.report.month;
        expect(all.report.point).toEqual(book.points.find(x => x.key === key));
        const cat = all.category.category.id;
        if (all.category.values.has(key)) expect(all.category.values.get(key)!.total).toBe(monthOf(book, key).byCategory.get(cat)?.total ?? 0);
      }
    });
  }
});

describe('edge cases', () => {
  const run = (data: AppData) => {
    const all = everything(buildBook(data), today);
    expect(finite(all)).toEqual([]);
    return all;
  };
  const e = (month: string, categoryId: string, amount: number, extra: Partial<Entry> = {}): Entry =>
    ({ id: `${month}-${categoryId}-${amount}-${Math.random()}`, month, categoryId, name: categoryId, amount, paid: true, repeat: 'none', seriesId: `${categoryId}-${amount}`, createdAt: 0, date: `${month}-05`, ...extra });
  const months = (keys: string[]): MonthRecord[] => keys.map(key => ({ key, startedAt: 0 }));
  const keys = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

  it('a book without income', () => {
    const all = run({ categories: cats, entries: keys.map(k => e(k, 'groceries', 30000)), months: months(keys) });
    expect(all.check?.plus.rate).toBeNull();
    expect(all.points.every(p => p.rate === null)).toBe(true);
  });
  it('every month in the red', () => {
    const all = run({ categories: cats, entries: keys.flatMap(k => [e(k, 'income', 100000), e(k, 'fixed', 150000, { repeat: 'monthly' })]), months: months(keys) });
    expect(all.points.every(p => p.saved < 0)).toBe(true);
    expect(all.outlook?.headline.kind).toBe('neg');
  });
  it('only yearly categories, and one huge entry', () => {
    const all = run({ categories: cats, entries: [...keys.map(k => e(k, 'income', 300000)), e('2026-07', 'insurance', 90000, { repeat: 'yearly' }), e('2026-09', 'shopping', 2500000)], months: months(keys) });
    expect(all.highlights.some(i => i.kind === 'unusual' && i.categoryId === 'insurance')).toBe(false);
  });
  it('an entry whose category is gone, and a started future month', () => {
    const future = [...keys, '2026-12'];
    run({ categories: cats, entries: [...future.map(k => e(k, 'income', 300000)), e('2026-08', 'deleted', 5000), e('2026-12', 'groceries', 9000)], months: months(future) });
    expect(upToNow(buildBook({ categories: cats, entries: [], months: months(future) }).points, today).map(p => p.key)).not.toContain('2026-12');
  });
  it('a running month with one entry, and a first month', () => {
    run({ categories: cats, entries: [e('2026-11', 'groceries', 1200)], months: months(['2026-11']) });
    run({ categories: cats, entries: [], months: [] });
  });
  it('a category moved from need to want counts in 50/30/20 where it is now', () => {
    const entries = keys.map(k => e(k, 'groceries', 40000)).concat(keys.map(k => e(k, 'income', 300000)));
    const need = budgetRule(entries, cats, keys.slice(0, 5)).parts[0].amount;
    const moved = cats.map(c => (c.id === 'groceries' ? { ...c, budget: 'want' as const } : c));
    expect(need).toBe(40000);
    expect(budgetRule(entries, moved, keys.slice(0, 5)).parts.map(p => p.amount).slice(0, 2)).toEqual([0, 40000]);
  });
});

describe('old data', () => {
  for (const name of ['storage-v1.json', 'storage-v3.json', 'storage-v6.json', 'storage-v9.json']) {
    it(`${name} gives finite numbers in every new figure`, () => {
      const raw = JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')) as Record<string, unknown>;
      const data = loadStored(key => raw[key]);
      const book = buildBook(data, computeBalances(data));
      expect(finite(everything(book, today))).toEqual([]);
      expect(finite(everything(book, new Date(2026, 0, 20)))).toEqual([]);
    });
  }
});

describe('speed', () => {
  it('builds ten years of entries and every Statistik and Planen figure in under 50 ms', () => {
    const data = generated(5, 120, '2026-11', 148);
    expect(data.entries.length).toBeGreaterThan(18000);
    // Warm up once (the first call compiles), then the fastest of five runs:
    // vitest runs test files side by side, and the fastest run is the one the
    // others disturbed least. (Not process.cpuUsage(): it counts every thread
    // of the process and, on Windows, ticks in 15.6 ms steps.)
    everything(buildBook(data), today);
    const runs = [0, 1, 2, 3, 4].map(() => {
      const t0 = performance.now();
      everything(buildBook(data), today);
      return performance.now() - t0;
    });
    const best = Math.min(...runs);
    console.log(`ten years, ${data.entries.length} entries: ${best.toFixed(1)} ms (runs ${runs.map(r => r.toFixed(1)).join(', ')})`);
    expect(best).toBeLessThan(50);
  });
});
