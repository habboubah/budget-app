import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { Insight, STATISTIK_CAP, contractHints, highlights, monthHints, rank } from './highlights';
import { categoryDetail, payeeDetail } from './detail';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `h${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: 0, date: `${month}-10`, ...extra };
}
const M = { repeat: 'monthly' as const };
const keys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const data = (entries: Entry[], months = keys): AppData => ({ categories: cats, entries, months: months.map(key => ({ key, startedAt: 0 })) });
/** Salary 3000, rent 1000, groceries 400, cinema 100 — every month the same. */
const usual = (m: string) => [
  e(m, 'income', 'Gehalt', 3000, M), e(m, 'fixed', 'Miete', 1000, M), e(m, 'groceries', 'Lidl', 400), e(m, 'leisure', 'Kino', 100),
  e(m, 'fixed', 'Vodafone', 20, { ...M, date: `${m}-05` }),
];
const today = new Date(2026, 9, 20);

describe('ranking', () => {
  const ins = (id: string, impact: number, categoryId?: string, kind: Insight['kind'] = 'unusual'): Insight =>
    ({ id, kind, variant: 'more', home: 'statistik', months: ['2026-09'], categoryId, tone: 'warn', impact, confidence: 1, values: {}, score: impact });
  it('puts the most at stake first, one per category, and stops at the cap', () => {
    const r = rank([ins('a', 100, 'x'), ins('b', 300, 'x'), ins('c', 200, 'y'), ins('d', 50, 'z'), ins('e', 10, 'w')], STATISTIK_CAP);
    expect(r.map(i => i.id)).toEqual(['b', 'c', 'd']);
  });
  it('leaves out what was dismissed', () => {
    expect(rank([ins('a', 100, 'x'), ins('c', 200, 'y')], 3, ['c']).map(i => i.id)).toEqual(['a']);
  });
  it('ranks a 120 € grocery jump above a 9 € new subscription', () => {
    const entries = [...keys.slice(0, -1).flatMap(usual), ...usual('2026-10'), e('2026-10', 'groceries', 'Rewe', 120), e('2026-10', 'leisure', 'Disney+', 8.99, M)];
    const hints = monthHints(buildBook(data(entries)), '2026-10', new Date(2026, 10, 20));
    expect(hints.map(h => h.kind)).toEqual(['unusual', 'newRecurring']);
    expect(hints[0]).toMatchObject({ categoryId: 'groceries', values: { total: 52000, usual: 40000 } });
  });
});

describe('Das fällt auf', () => {
  it('names the running month’s category that is already over its usual whole month', () => {
    const entries = [...keys.slice(0, -1).flatMap(usual), ...usual('2026-10'), e('2026-10', 'groceries', 'Rewe', 200, { date: '2026-10-12' })];
    const h = highlights(buildBook(data(entries)), today);
    const groceries = h.find(i => i.categoryId === 'groceries')!;
    expect(groceries).toMatchObject({ kind: 'unusual', variant: 'running', tone: 'warn', values: { total: 60000, usual: 40000 } });
    // No budget yet: the next step is to set one.
    expect(groceries.action).toEqual({ kind: 'budget', target: 'groceries' });
  });
  it('flags a finished month with open entries left', () => {
    const entries = [
      ...keys.slice(0, -2).flatMap(usual), ...usual('2026-09').filter(x => x.name !== 'Kino'), ...usual('2026-10'),
      e('2026-09', 'fixed', 'Strom', 80, { paid: false }),
      e('2026-10', 'groceries', 'Lidl', 1, { date: '2026-10-19' }),
    ];
    const h = highlights(buildBook(data(entries)), today);
    expect(h.find(i => i.kind === 'dataCheck')).toMatchObject({ variant: 'open', months: ['2026-09'], values: { count: 1, sum: 8000 }, action: { kind: 'month', target: '2026-09' } });
    expect(h.length).toBeLessThanOrEqual(STATISTIK_CAP);
    expect(new Set(h.map(i => i.categoryId ?? i.id)).size).toBe(h.length);
  });
  it('says nothing about a quiet book', () => {
    const entries = [...keys.flatMap(usual), e('2026-10', 'groceries', 'Lidl', 1, { date: '2026-10-19' })];
    expect(highlights(buildBook(data(entries)), today)).toEqual([]);
  });
  it('points every action at something that exists', () => {
    const entries = [
      ...keys.slice(0, -1).flatMap(usual), ...usual('2026-10'),
      e('2026-09', 'groceries', 'Waschmaschine', 649), e('2026-10', 'clothing', 'Mantel', 300), e('2026-09', 'fixed', 'Strom', 80, { paid: false }),
    ];
    const book = buildBook(data(entries));
    const all = [...highlights(book, today, [], 99), ...monthHints(book, '2026-09', today, 99)];
    expect(all.length).toBeGreaterThan(0);
    for (const i of all) {
      if (!i.action) continue;
      const { kind, target } = i.action;
      if (kind === 'category' || kind === 'budget') expect(book.byId.has(target)).toBe(true);
      if (kind === 'month' || kind === 'report') expect(book.months).toContain(target);
    }
  });
});

describe('Abos & Verträge hints', () => {
  it('lists a new subscription, and a regular payment missing once its day has passed', () => {
    const entries = [
      ...keys.slice(0, -1).flatMap(usual),
      ...usual('2026-10').filter(x => x.name !== 'Vodafone'),
      e('2026-10', 'leisure', 'Disney+', 8.99, M),
    ];
    const h = contractHints(buildBook(data(entries)), today);
    expect(h.fresh.map(i => [i.name, i.values.amount])).toEqual([['Disney+', 899]]);
    expect(h.missing.map(i => [i.name, i.values.usual, i.action])).toEqual([['Vodafone', 2000, { kind: 'add', target: 'Vodafone' }]]);
    // On the 5th, Vodafone's day (two days' grace), it isn't missing yet.
    expect(contractHints(buildBook(data(entries)), new Date(2026, 9, 6)).missing).toEqual([]);
  });
});

describe('the category screen and the payee sheet', () => {
  const entries = [
    ...keys.flatMap(usual),
    e('2026-08', 'groceries', 'Rewe', 60), e('2026-09', 'groceries', 'Rewe', 40), e('2026-09', 'groceries', 'LIDL', 50),
  ];
  const book = buildBook(data(entries));
  it('sums the category over the months in view, with its payees and biggest entries', () => {
    const d = categoryDetail(book, 'groceries', keys.slice(-6), today)!;
    expect(d.months).toEqual(keys.slice(-6));
    expect(d.finished).toEqual(keys.slice(-6, -1));
    expect(d.average).toBe(Math.round((5 * 40000 + 6000 + 9000) / 5));
    expect(d.soFar).toBe(40000);
    // "LIDL" and "Lidl" are one payee.
    expect(d.payees.map(p => [p.name, p.count, p.total])).toEqual([['Lidl', 7, 245000], ['Rewe', 2, 10000]]);
    expect(d.biggest[0].amount).toBe(40000);
    expect(d.share).toBeCloseTo(d.average * 5 / (5 * 152000 + 6000 + 9000));
    expect(categoryDetail(book, 'gone', keys, today)).toBeNull();
  });
  it('counts the months a budget held', () => {
    const withLimit = buildBook({ ...data(entries), categories: cats.map(c => (c.id === 'groceries' ? { ...c, limit: 42000 } : c)) });
    expect(categoryDetail(withLimit, 'groceries', keys.slice(-6), today)!.budget).toEqual({ limit: 42000, kept: 3, months: 5 });
  });
  it('follows one payee across the book', () => {
    const p = payeeDetail(book, 'rewe', today)!;
    expect([p.count, p.total, p.average, p.first, p.last]).toEqual([2, 10000, 5000, '2026-08', '2026-09']);
    expect(p.months.at(-1)).toEqual({ key: '2026-10', total: 0 });
    expect(p.recent.map(x => x.month)).toEqual(['2026-09', '2026-08']);
  });
});
