import { describe, expect, it } from 'vitest';
import { buildBook, entryDay, everydayOf, finishedKeys, monthOf, outflowOf, spendingOf } from './book';
import { budgetSplit, investedByMonth, monthSeries, savings } from '.';
import { computeBalances, monthTotals } from '../logic';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `b${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: 0, ...extra };
}
const M = { repeat: 'monthly' as const };
const book = (entries: Entry[], months: string[], opening?: number): AppData => ({
  categories: cats, entries, months: months.map((key, i) => (i === 0 && opening !== undefined ? { key, opening, startedAt: 0 } : { key, startedAt: 0 })),
});

// Salary 3000, rent 1000 (need), food (need), cinema (want), an ETF plan (save) of 300.
const entries = [
  e('2026-09', 'income', 'Gehalt', 3000, M), e('2026-09', 'fixed', 'Miete', 1000, M), e('2026-09', 'groceries', 'Lidl', 400, { date: '2026-09-04' }),
  e('2026-09', 'leisure', 'Kino', 200, { date: '2026-09-20' }), e('2026-09', 'investment', 'ETF-Sparplan', 300, M),
  e('2026-10', 'income', 'Gehalt', 3000, M), e('2026-10', 'fixed', 'Miete', 1000, M), e('2026-10', 'groceries', 'Lidl', 500, { date: '2026-10-31' }),
  e('2026-10', 'leisure', 'Kino', 100), e('2026-10', 'investment', 'ETF-Sparplan', 300, { ...M, paid: false }),
  e('2026-10', 'car', 'Kfz-Steuer', 240, { repeat: 'yearly', date: '2026-10-09' }),
];
const data = book(entries, ['2026-09', '2026-10'], 100000);

describe('the book', () => {
  const b = buildBook(data);
  it('sums each month by part, in one pass, the way monthTotals does', () => {
    for (const key of data.months.map(m => m.key)) {
      const t = monthTotals(entries, cats, key);
      const m = monthOf(b, key);
      expect(m.income.total).toBe(t.incomePaid + t.incomeOpen);
      expect(outflowOf(m)).toBe(t.expensePaid + t.expenseOpen);
      expect(m.income.open + m.need.open + m.want.open + m.save.open).toBe(t.incomeOpen + t.expenseOpen);
    }
    const oct = monthOf(b, '2026-10');
    expect([oct.need.total, oct.want.total, oct.save.total, oct.save.open]).toEqual([174000, 10000, 30000, 30000]);
    expect([oct.need.once, oct.need.monthly, oct.need.yearly]).toEqual([50000, 100000, 24000]);
    expect(oct.byCategory.get('groceries')?.total).toBe(50000);
    expect(spendingOf(oct)).toBe(184000);
  });
  it('keeps everyday spending by day, and what has no day apart', () => {
    const sep = monthOf(b, '2026-09');
    expect(sep.daily[3]).toBe(40000);
    expect(sep.daily[19]).toBe(20000);
    expect(everydayOf(sep)).toBe(60000);
    // Kino in October has no date and no time in October: no day. Rent and the yearly tax are not everyday spending.
    const oct = monthOf(b, '2026-10');
    expect(oct.undated).toBe(10000);
    expect(oct.daily[30]).toBe(50000);
    expect(oct.daily.reduce((s, x) => s + x, 0) + oct.undated).toBe(everydayOf(oct));
  });
  it('knows every expense name, where it was booked and how often', () => {
    const lidl = b.names.get('lidl')!;
    expect([lidl.count, lidl.total, lidl.first, lidl.last, lidl.months.get('2026-10')]).toEqual([2, 90000, '2026-09', '2026-10', 50000]);
    expect(b.names.has('gehalt')).toBe(false);
  });
  it('lists the finished months', () => {
    expect(finishedKeys(b, new Date(2026, 9, 15))).toEqual(['2026-09']);
    expect(finishedKeys(b, new Date(2026, 11, 1), 1)).toEqual(['2026-10']);
  });
  it('gives an empty month for one without anything', () => {
    expect(monthOf(b, '2027-01')).toMatchObject({ started: false, entries: [], undated: 0 });
  });
});

describe('which day an entry counts on', () => {
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
  it('is its date, else when it was ticked, else when it was entered — inside its month', () => {
    expect(entryDay(e('2026-10', 'groceries', 'A', 1, { date: '2026-10-07' }))).toBe(7);
    expect(entryDay(e('2026-10', 'groceries', 'B', 1, { paidAt: at(2026, 10, 12), createdAt: at(2026, 10, 2) }))).toBe(12);
    expect(entryDay(e('2026-10', 'groceries', 'C', 1, { paidAt: at(2026, 11, 2), createdAt: at(2026, 10, 3) }))).toBe(3);
    expect(entryDay(e('2026-10', 'groceries', 'D', 1, { createdAt: at(2026, 12, 3) }))).toBeNull();
  });
});

describe('one meaning of "gespart" (D1)', () => {
  const points = monthSeries(computeBalances(data), undefined, investedByMonth(data));
  it('counts money put into a savings category as saved, not spent', () => {
    expect(points.map(p => [p.key, p.income, p.spending, p.invested, p.saved, p.kept, p.expense])).toEqual([
      ['2026-09', 300000, 160000, 30000, 140000, 110000, 190000],
      ['2026-10', 300000, 184000, 30000, 116000, 86000, 214000],
    ]);
    expect(points[1].spendingOpen).toBe(0);
    expect(points[1].expenseOpen).toBe(30000);
  });
  it('agrees with the 50/30/20 split on what was saved', () => {
    const keys = points.map(p => p.key);
    const split = budgetSplit(entries, cats, keys);
    expect(savings(points).averageSaved).toBe(split.saved);
    expect(savings(points).rate).toBeCloseTo(split.saved / split.income);
  });
  it('moves the month-end balance by Kontoplus', () => {
    expect(points[1].end - points[0].end).toBe(points[1].kept);
    expect(points.every(p => p.saved === p.income - p.spending && p.saved === p.kept + p.invested)).toBe(true);
  });
  it('changes nothing for a book without savings categories', () => {
    const plain = book(entries.filter(x => x.categoryId !== 'investment'), ['2026-09', '2026-10'], 100000);
    const before = monthSeries(computeBalances(plain));
    const after = monthSeries(computeBalances(plain), undefined, investedByMonth(plain));
    expect(after).toEqual(before);
    expect(after.map(p => [p.saved, p.kept, p.expense, p.spending])).toEqual(before.map(p => [p.income - p.expense, p.income - p.expense, p.expense, p.expense]));
    // And the book gives the same series.
    expect(buildBook(plain).points).toEqual(after);
  });
  it('gives the book the same series', () => {
    expect(buildBook(data).points).toEqual(points);
  });
});
