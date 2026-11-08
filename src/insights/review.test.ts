import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { monthReview, reviewCardMonth, reviewSeason, suggestBudgets, yearReview } from './review';
import { categoryDetail } from './detail';
import { monthTotals } from '../logic';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `r${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: 0, date: `${month}-10`, ...extra };
}
const M = { repeat: 'monthly' as const };
const data = (entries: Entry[], months: string[]): AppData => ({ categories: cats, entries, months: months.map(key => ({ key, startedAt: 0 })) });
const month = (m: string, food = 400) => [
  e(m, 'income', 'Gehalt', 3000, M), e(m, 'fixed', 'Miete', 1000, M), e(m, 'groceries', 'Lidl', food), e(m, 'investment', 'ETF-Sparplan', 200, M),
];
const keys = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

describe('Monatsbericht', () => {
  const entries = [...keys.flatMap(m => month(m)), e('2026-10', 'groceries', 'Rewe', 160), e('2026-10', 'car', 'TÜV', 120, { paid: false })];
  const book = buildBook(data(entries, keys));
  const today = new Date(2026, 10, 12);
  const r = monthReview(book, '2026-10', today);
  it('tells the month with the same figures as Statistik and the month page', () => {
    const t = monthTotals(entries, cats, '2026-10');
    expect(r.point.income).toBe(t.incomePaid + t.incomeOpen);
    // The month page's expenses = Ausgaben + Angelegt; its result = Kontoplus.
    expect(r.point.spending + r.point.invested).toBe(t.expensePaid + t.expenseOpen);
    expect(r.point.kept).toBe(t.incomePaid + t.incomeOpen - t.expensePaid - t.expenseOpen);
    expect(r.point).toEqual(book.points.find(p => p.key === '2026-10'));
    // And the category screen agrees on the month.
    expect(categoryDetail(book, 'groceries', keys, today)!.values.get('2026-10')?.total).toBe(r.categories.find(c => c.category.id === 'groceries')?.amount);
  });
  it('compares with a usual month and says what is still open', () => {
    expect(r.usualSaved).toBe(300000 - 140000);
    expect(r.point.saved).toBe(300000 - 168000);
    expect(r.open).toEqual({ count: 1, expense: 12000, income: 0 });
    expect(r.categories.map(c => [c.category.id, c.amount, c.usual])).toEqual([['fixed', 100000, 100000], ['groceries', 56000, 40000], ['car', 12000, 0]]);
    expect(r.hints[0]).toMatchObject({ kind: 'unusual', categoryId: 'groceries' });
    expect(r.next).toMatchObject({ month: '2026-11', fixed: 120000 });
    expect(r.running).toBe(false);
    expect(monthReview(book, '2026-11', today).running).toBe(true);
    expect(monthReview(book, '2027-03', today).empty).toBe(true);
  });
});

describe('the month-review card', () => {
  const today = new Date(2026, 10, 3);
  it('speaks about last month, from the second finished month on, until seen', () => {
    expect(reviewCardMonth(buildBook(data(keys.flatMap(m => month(m)), keys)), today)).toBe('2026-10');
    expect(reviewCardMonth(buildBook(data(keys.flatMap(m => month(m)), keys)), today, ['2026-10'])).toBeNull();
  });
  it('stays away in the first months and for an empty month', () => {
    const two = ['2026-10', '2026-11'];
    expect(reviewCardMonth(buildBook(data(two.flatMap(m => month(m)), two)), today)).toBeNull();
    const empty = [...['2026-08', '2026-09', '2026-11'].flatMap(m => month(m))];
    expect(reviewCardMonth(buildBook(data(empty, ['2026-08', '2026-09', '2026-10', '2026-11'])), today)).toBeNull();
  });
});

describe('Jahresrückblick', () => {
  it('is in season from 15 December to the end of January', () => {
    expect(reviewSeason(new Date(2026, 11, 14))).toBeNull();
    expect(reviewSeason(new Date(2026, 11, 15))).toBe('2026');
    expect(reviewSeason(new Date(2027, 0, 31))).toBe('2026');
    expect(reviewSeason(new Date(2027, 1, 1))).toBeNull();
  });
  it('adds up the year, against the year before', () => {
    const year = [...['2025-11', '2025-12'], ...Array.from({ length: 11 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)];
    const entries = [...year.flatMap(m => month(m, m.startsWith('2025') ? 300 : 400)), e('2026-05', 'shopping', 'Waschmaschine', 649)];
    const book = buildBook(data(entries, year));
    const y = yearReview(book, '2026', new Date(2026, 11, 20));
    expect(y.months).toHaveLength(11);
    expect(y.income).toBe(11 * 300000);
    expect(y.spending).toBe(11 * 140000 + 64900);
    expect(y.saved).toBe(y.income - y.spending);
    expect(y.invested).toBe(11 * 20000);
    expect(y.top.map(x => [x.category.id, x.amount, x.lastYear])).toEqual([['fixed', 1100000, 200000], ['groceries', 440000, 60000], ['shopping', 64900, 0]]);
    expect(y.biggest?.name).toBe('Waschmaschine');
    expect(y.next.fixedMonthly).toBe(120000);
    // Groceries are one-off spending (a budget fits); rent is recurring (none).
    // Over the twelve finished months, Dec 2025 – Nov 2026: 649 € / 12 ≈ 54 €, rounded up to 55 €.
    expect(y.next.budgets.map(b => [b.category.id, b.amount])).toEqual([['groceries', 40000], ['shopping', 5500]]);
  });
  it('suggests nothing for small or recurring categories', () => {
    const k = ['2026-09', '2026-10'];
    const book = buildBook(data([...k.flatMap(m => month(m)), e('2026-10', 'leisure', 'Kino', 15)], k));
    expect(suggestBudgets(book, k).map(b => b.category.id)).toEqual(['groceries']);
  });
});
