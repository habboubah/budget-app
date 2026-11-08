import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { bigItems, outlook } from './outlook';
import { financeCheck, grundbedarf } from './health';
import { computeBalances } from '../logic';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `o${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: 0, date: `${month}-10`, ...extra };
}
const M = { repeat: 'monthly' as const };
const months = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-${String(from + i).padStart(2, '0')}`);
const data = (entries: Entry[], keys: string[], opening = 100000): AppData => ({
  categories: cats, entries, months: keys.map((key, i) => (i === 0 ? { key, opening, startedAt: 0 } : { key, startedAt: 0 })),
});
/** Salary 3000, rent 1000, and `food` euros of one-off groceries. */
const month = (m: string, food = 500) => [e(m, 'income', 'Gehalt', 3000, M), e(m, 'fixed', 'Miete', 1000, M), e(m, 'groceries', 'Lidl', food)];
const today = new Date(2026, 6, 15);

describe('Ausblick', () => {
  it('needs three finished months', () => {
    expect(outlook(buildBook(data(months(5, 7).flatMap(m => month(m)), months(5, 7))), today)).toBeNull();
  });
  it('adds what runs every month and a usual everyday month; the range collapses when every month is the same', () => {
    const keys = months(3, 7);
    const o = outlook(buildBook(data(keys.flatMap(m => month(m)), keys)), today)!;
    expect(o.from).toEqual({ key: '2026-07', end: 100000 + 5 * 150000 });
    expect(o.months).toHaveLength(12);
    expect(o.months[0]).toMatchObject({ key: '2026-08', fixed: 200000, started: false });
    expect(o.everyday).toEqual({ mid: -50000, lo: -50000, hi: -50000 });
    expect(o.ranged).toBe(true);
    expect(o.months.every(m => m.lo === m.mid && m.hi === m.mid)).toBe(true);
    expect(o.months[11]).toMatchObject({ key: '2027-07', mid: o.from.end + 12 * 150000 });
    expect(o.headline).toEqual({ kind: 'normal', month: '2027-07', amount: o.months[11].mid });
  });
  it('spreads from calm to pricey months when they differ', () => {
    const keys = months(3, 7);
    const food = [300, 500, 700, 900];
    const o = outlook(buildBook(data(keys.flatMap((m, i) => month(m, food[i] ?? 500)), keys)), today)!;
    expect(o.everyday.lo).toBeLessThan(o.everyday.mid);
    expect(o.everyday.hi).toBeGreaterThan(o.everyday.mid);
    expect(o.months[11].lo).toBeLessThan(o.months[11].hi);
  });
  it('puts a yearly bill into its month a year on', () => {
    const keys = months(1, 7);
    const entries = [...keys.flatMap(m => month(m)), e('2026-03', 'car', 'Kfz-Steuer', 240, { repeat: 'yearly' })];
    const o = outlook(buildBook(data(entries, keys)), today)!;
    const march = o.months.find(m => m.key === '2027-03')!;
    expect(march.fixed).toBe(200000 - 24000);
    expect(march.big).toEqual([{ name: 'Kfz-Steuer', categoryId: 'car', amount: 24000, income: false, kind: 'yearly' }]);
    expect(bigItems(o)).toEqual([{ name: 'Kfz-Steuer', categoryId: 'car', amount: 24000, income: false, kind: 'yearly', month: '2027-03' }]);
  });
  it('takes a month already started with its own entries', () => {
    const keys = [...months(3, 7), '2026-08'];
    const entries = [...months(3, 7).flatMap(m => month(m)), e('2026-08', 'fixed', 'Miete', 1000, { ...M, paid: false }), e('2026-08', 'travel', 'Urlaub', 1500, { paid: false })];
    const o = outlook(buildBook(data(entries, keys)), today)!;
    expect(o.months[0]).toMatchObject({ key: '2026-08', started: true, fixed: -250000 });
    expect(o.months[0].big.map(b => [b.name, b.kind])).toEqual([['Urlaub', 'planned']]);
    expect(o.months[1]).toMatchObject({ key: '2026-09', started: false, fixed: 200000 });
  });
  it('warns before the account gets tight, and before it goes below zero', () => {
    const keys = months(3, 7);
    const tight = keys.flatMap(m => [e(m, 'income', 'Gehalt', 2000, M), e(m, 'fixed', 'Miete', 1000, M), e(m, 'groceries', 'Lidl', 1100)]);
    const o = outlook(buildBook(data(tight, keys, 160000)), today)!;
    // −100 € a month from 1.100 €: below one month of Grundbedarf (2.100 €) at once, below zero in the 12th month.
    expect(o.headline.kind).toBe('neg');
    expect(o.headline.month).toBe('2027-07');
    // From 2.600 € at the end of July: below 2.100 € in the sixth month, never below zero.
    const close = outlook(buildBook(data(tight.filter(x => x.month !== '2026-03'), months(4, 7), 300000)), today)!;
    expect(close.headline).toEqual({ kind: 'warn', month: '2027-01', amount: 200000 });
  });
});

describe('Grundbedarf and Finanz-Check', () => {
  const keys = months(1, 7);
  const entries = [
    ...keys.flatMap(m => month(m)),
    ...keys.map(m => e(m, 'leisure', 'Kino', 200)),
    e('2026-03', 'car', 'Kfz-Steuer', 240, { repeat: 'yearly' }),
    e('2026-06', 'fixed', 'Strom', 50, { paid: false, date: '2026-06-03' }),
  ];
  const book = buildBook(data(entries, keys));
  it('averages the need spending without yearly bills, plus the yearly ones per month', () => {
    const g = grundbedarf(book, today)!;
    // Miete 1000 + Lidl 500 every month, Strom 50 once in six months; Kfz-Steuer 240 / 12.
    expect(g.months).toEqual(months(1, 6));
    expect(g.yearly).toBe(2000);
    expect(g.value).toBe(Math.round(150000 + 5000 / 6 + 2000));
  });
  it('checks more in than out, bills on time and the reserve', () => {
    const c = financeCheck(book, today)!;
    expect(c.plus.months).toEqual(months(1, 6));
    expect(c.plus.plusMonths).toBe(6);
    expect(c.plus.ok).toBe(true);
    expect(c.onTime).toEqual({ count: 1, sum: 5000, ok: false });
    const end = computeBalances(data(entries, keys)).at(-1)!.end;
    expect(c.reserve?.balance).toBe(end);
    expect(c.reserve?.months).toBeCloseTo(end / grundbedarf(book, today)!.value);
    expect(financeCheck(buildBook(data(month('2026-07'), ['2026-07'])), today)).toBeNull();
  });
  it('has no reserve before three finished months', () => {
    const two = buildBook(data(months(5, 7).flatMap(m => month(m)), months(5, 7)));
    expect(financeCheck(two, today)?.reserve).toBeNull();
  });
});
