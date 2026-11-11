import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { firstWeekday, heatLevel, monthDays, weekdayOf, weekdayPattern } from './rhythm';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, day: number | null, extra: Partial<Entry> = {}): Entry {
  n++;
  return {
    id: `r${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `r${n}`, createdAt: 0,
    ...(day ? { date: `${month}-${String(day).padStart(2, '0')}` } : {}), ...extra,
  };
}
const data = (entries: Entry[], months: string[]): AppData => ({ categories: cats, entries, months: months.map(key => ({ key, startedAt: 0 })) });
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10);

describe('weekdays', () => {
  it('counts Monday as 0 and Sunday as 6', () => {
    // 2 November 2026 is a Monday.
    expect(['2026-11-02', '2026-11-07', '2026-11-08'].map(weekdayOf)).toEqual([0, 5, 6]);
  });
  it('starts the week on Monday unless the locale says otherwise, and never throws', () => {
    expect(firstWeekday('de-DE')).toBe(0);
    expect(firstWeekday('not a locale')).toBe(0);
    expect(firstWeekday('en-US')).toBeGreaterThanOrEqual(0);
  });
});

describe('a month day by day', () => {
  const entries = [
    e('2026-10', 'fixed', 'Miete', 1000, 1, { repeat: 'monthly' }),
    e('2026-10', 'groceries', 'Lidl', 40, 3),
    e('2026-10', 'groceries', 'Rewe', 25, 3),
    e('2026-10', 'extra', 'Kino', 30, 10),
    e('2026-10', 'income', 'Gehalt', 3000, 28, { repeat: 'monthly' }),
    e('2026-10', 'groceries', 'Markt', 12, null),
  ];
  const book = buildBook(data(entries, ['2026-10']));
  it('sums everyday spending per day, with the count and the largest entry', () => {
    const m = monthDays(book, '2026-10', at(2026, 11, 5));
    expect(m.days).toHaveLength(31);
    expect(m.days[2]).toMatchObject({ day: 3, date: '2026-10-03', amount: 6500, count: 2, top: 'Lidl', future: false });
    expect(m.days[9].amount).toBe(3000);
    // Rent and salary are not everyday spending.
    expect([m.days[0].amount, m.days[27].amount]).toEqual([0, 0]);
    expect([m.max, m.total, m.undated, m.elapsed]).toEqual([6500, 9500, 1200, 31]);
  });
  it('marks the days after today and keeps them out of the total', () => {
    const m = monthDays(book, '2026-10', at(2026, 10, 5));
    expect(m.elapsed).toBe(5);
    expect(m.days[9]).toMatchObject({ amount: 3000, future: true });
    expect([m.max, m.total]).toEqual([6500, 6500]);
    expect(monthDays(book, '2026-12', at(2026, 10, 5)).elapsed).toBe(0);
  });
  it('agrees with the book', () => {
    const m = monthDays(book, '2026-10', at(2026, 11, 5));
    expect(m.days.map(d => d.amount)).toEqual(book.byMonth.get('2026-10')!.daily);
  });
});

describe('heat levels', () => {
  it('shades by the square root, nothing as 0 and the priciest day as 4', () => {
    expect([0, 100, 700, 3000, 6000, 10000].map(a => heatLevel(a, 10000))).toEqual([0, 1, 2, 3, 4, 4]);
    expect(heatLevel(500, 0)).toBe(0);
  });
});

describe('the average per weekday', () => {
  // Five Saturdays at 60 €, everything else 10 € a day: October 2026 has five Thursdays, Fridays and Saturdays.
  const october = Array.from({ length: 31 }, (_, i) => e('2026-10', 'groceries', 'Lidl', weekdayOf(`2026-10-${String(i + 1).padStart(2, '0')}`) === 5 ? 60 : 10, i + 1));
  it('divides by how often the weekday came up, and names the one that leads', () => {
    const p = weekdayPattern(buildBook(data(october, ['2026-10'])), ['2026-10'], at(2026, 11, 5));
    expect(p.count).toEqual([4, 4, 4, 5, 5, 5, 4]);
    expect(p.average).toEqual([1000, 1000, 1000, 1000, 1000, 6000, 1000]);
    expect(p.top).toBe(5);
  });
  it('names none when the days are alike, or when a weekday has hardly come up', () => {
    const even = Array.from({ length: 31 }, (_, i) => e('2026-10', 'groceries', 'Lidl', 10, i + 1));
    expect(weekdayPattern(buildBook(data(even, ['2026-10'])), ['2026-10'], at(2026, 11, 5)).top).toBeNull();
    // Ten days in: no weekday has come up four times yet.
    expect(weekdayPattern(buildBook(data(october, ['2026-10'])), ['2026-10'], at(2026, 10, 10)).top).toBeNull();
  });
  it('stops at today', () => {
    const p = weekdayPattern(buildBook(data(october, ['2026-10'])), ['2026-10'], at(2026, 10, 10));
    expect(p.count.reduce((a, b) => a + b, 0)).toBe(10);
  });
});
