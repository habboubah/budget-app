import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { pace } from './pace';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, day: number | null, extra: Partial<Entry> = {}): Entry {
  n++;
  return {
    id: `p${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `p${n}`, createdAt: 0,
    ...(day ? { date: `${month}-${String(day).padStart(2, '0')}` } : {}), ...extra,
  };
}
const data = (entries: Entry[], months: string[]): AppData => ({ categories: cats, entries, months: months.map(key => ({ key, startedAt: 0 })) });
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10);

/** A month with 10 € of groceries every day (rent on the 1st, which pace leaves out). */
const steady = (month: string, days: number, euros = 10) => [
  e(month, 'fixed', 'Miete', 1000, 1, { repeat: 'monthly' }),
  ...Array.from({ length: days }, (_, i) => e(month, 'groceries', 'Lidl', euros, i + 1)),
];

describe('pace, day by day', () => {
  const history = [...steady('2026-07', 31), ...steady('2026-08', 31), ...steady('2026-09', 30)];
  it('compares everyday spending so far with a usual month at the same day', () => {
    const now = [...history, e('2026-10', 'fixed', 'Miete', 1000, 1, { repeat: 'monthly' }), e('2026-10', 'groceries', 'Lidl', 120, 3), e('2026-10', 'groceries', 'Rewe', 70, 10)];
    const p = pace(buildBook(data(now, ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 10));
    expect(p.method).toBe('byDay');
    expect(p.basis).toEqual(['2026-07', '2026-08', '2026-09']);
    expect([p.spent, p.usualToday, p.diff]).toEqual([19000, 10000, 9000]);
    expect(p.verdict).toBe('above');
    // The usual month ends at 300 € (310, 310 and 300: the median); 190 € + (310 − 100) = 400 €.
    expect(p.usualTotal).toBe(31000);
    expect(p.projected).toBe(19000 + 31000 - 10000);
    expect(p.actual).toHaveLength(10);
    expect(p.shares).toEqual([{ categoryId: 'groceries', amount: 19000 }]);
  });
  it('calls it usual within 25 € or 5 %, and says below when less went out', () => {
    const within = [...history, e('2026-10', 'groceries', 'Lidl', 110, 9)];
    expect(pace(buildBook(data(within, ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 10)).verdict).toBe('within');
    const below = [...history, e('2026-10', 'groceries', 'Lidl', 40, 9)];
    const p = pace(buildBook(data(below, ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 10));
    expect([p.verdict, p.diff]).toEqual(['below', -6000]);
    // Never projected below what is spent.
    expect(p.projected).toBeGreaterThanOrEqual(p.spent);
  });
  it('lets a plan dated later wait, and never goes down', () => {
    const now = [...history, e('2026-10', 'groceries', 'Lidl', 50, 4), e('2026-10', 'extra', 'Urlaub', 900, 25, { paid: false })];
    const p = pace(buildBook(data(now, ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 10));
    expect(p.spent).toBe(5000);
    for (const curve of [p.actual, p.usual!]) for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
  });
  it('maps a short month onto a long one: its last day is the usual month end', () => {
    const febHistory = [...steady('2026-11', 30), ...steady('2026-12', 31), ...steady('2027-01', 31)];
    const p = pace(buildBook(data([...febHistory, e('2027-02', 'groceries', 'Lidl', 10, 1)], ['2026-11', '2026-12', '2027-01', '2027-02'])), at(2027, 2, 14));
    expect(p.days).toBe(28);
    expect(p.usual![27]).toBe(31000);
    expect(p.usual![13]).toBe(14000);
  });
  it('draws a band from four basis months on', () => {
    const four = [...history, ...steady('2026-10', 31, 20)];
    const p = pace(buildBook(data([...four, e('2026-11', 'groceries', 'Lidl', 10, 2)], ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])), at(2026, 11, 12));
    expect(p.band).not.toBeNull();
    expect(p.band!.lo[11]).toBeLessThanOrEqual(p.usual![11]);
    expect(p.band!.hi[11]).toBeGreaterThanOrEqual(p.usual![11]);
    expect(pace(buildBook(data(history, ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 12)).band).toBeNull();
  });
});

describe('pace, linear', () => {
  it('spreads the usual month evenly when the history has no days', () => {
    const undated = ['2026-07', '2026-08', '2026-09'].flatMap(m => [e(m, 'groceries', 'Lidl', 310, null)]);
    const p = pace(buildBook(data([...undated, e('2026-10', 'groceries', 'Lidl', 50, 5)], ['2026-07', '2026-08', '2026-09', '2026-10'])), at(2026, 10, 10));
    expect(p.method).toBe('linear');
    expect(p.usualToday).toBe(10000);
    expect(p.usualTotal).toBe(31000);
  });
});

describe('pace, what it says', () => {
  const history = [...steady('2026-08', 31), ...steady('2026-09', 30)];
  const months = ['2026-08', '2026-09', '2026-10'];
  it('waits until day 3 before it compares', () => {
    const p = pace(buildBook(data([...history, e('2026-10', 'groceries', 'Lidl', 30, 1)], months)), at(2026, 10, 2));
    expect([p.verdict, p.spent]).toEqual(['early', 3000]);
  });
  it('says when nothing was entered for a week, instead of a verdict', () => {
    const p = pace(buildBook(data([...history, e('2026-10', 'groceries', 'Lidl', 30, 5)], months)), at(2026, 10, 20));
    expect([p.verdict, p.staleDays]).toEqual(['stale', 15]);
    // Ticking off a bill is a sign of life too.
    const ticked = e('2026-10', 'fixed', 'Miete', 1000, 1, { repeat: 'monthly', paidAt: at(2026, 10, 18).getTime() });
    expect(pace(buildBook(data([...history, e('2026-10', 'groceries', 'Lidl', 30, 5), ticked], months)), at(2026, 10, 20)).verdict).not.toBe('stale');
  });
  it('has only this month without a finished one', () => {
    const p = pace(buildBook(data([e('2026-10', 'groceries', 'Lidl', 30, 5)], ['2026-10'])), at(2026, 10, 12));
    expect([p.verdict, p.usual, p.projected, p.spent]).toEqual(['none', null, null, 3000]);
  });
});
