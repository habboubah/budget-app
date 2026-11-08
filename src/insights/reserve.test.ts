import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { yearlyReserve } from './reserve';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `r${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: 0, date: `${month}-10`, ...extra };
}
const M = { repeat: 'monthly' as const };
const Y = { repeat: 'yearly' as const };
const months = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-${String(from + i).padStart(2, '0')}`);
const data = (entries: Entry[], keys: string[], opening = 1_000_00): AppData => ({
  categories: cats, entries, months: keys.map((key, i) => (i === 0 ? { key, opening, startedAt: 0 } : { key, startedAt: 0 })),
});
const month = (m: string) => [e(m, 'income', 'Gehalt', 3000, M), e(m, 'fixed', 'Miete', 1000, M)];
const today = new Date(2026, 6, 15); // mid-July 2026

describe('yearlyReserve (plan 11)', () => {
  it('no card without a yearly entry', () => {
    const keys = months(3, 7);
    expect(yearlyReserve(buildBook(data(keys.flatMap(m => month(m)), keys)), today)).toBeNull();
  });

  it('spreads the yearly total over twelve months, rounded up to whole euros', () => {
    const keys = months(3, 7);
    // Two yearly bills: 304 € and 90 € = 394 € a year → 32,84 → rounded up to 33 €.
    const entries = [
      ...keys.flatMap(m => month(m)),
      e('2026-03', 'car', 'Kfz-Steuer', 304, Y),
      e('2026-05', 'insurance', 'Haftpflicht', 90, Y),
    ];
    const r = yearlyReserve(buildBook(data(entries, keys)), today)!;
    expect(r.monthly).toBe(3300); // ceil(39400 / 12 / 100) * 100
  });

  it('lists the next yearly bills a year on, soonest first', () => {
    const keys = months(3, 7);
    const entries = [
      ...keys.flatMap(m => month(m)),
      e('2026-03', 'car', 'Kfz-Steuer', 304, Y),
      e('2026-05', 'insurance', 'Haftpflicht', 90, Y),
    ];
    const r = yearlyReserve(buildBook(data(entries, keys)), today)!;
    // The bills recur a year on: March and May 2027, in date order.
    expect(r.upcoming.map(u => [u.name, u.month])).toEqual([
      ['Kfz-Steuer', '2027-03'],
      ['Haftpflicht', '2027-05'],
    ]);
    expect(r.upcoming[0].amount).toBe(30400);
  });

  it('reports a shortfall when the account would go negative', () => {
    const keys = months(3, 7);
    // A tiny opening and a big yearly bill → the account dips below zero.
    const entries = [
      ...keys.flatMap(m => month(m)),
      e('2026-04', 'car', 'Großrechnung', 40000, Y),
    ];
    const r = yearlyReserve(buildBook(data(entries, keys, 100)), today)!;
    expect(r.shortfall).toBeTruthy();
    expect(r.shortfall!.amount).toBeGreaterThan(0);
  });

  it('two bills in the same month both count', () => {
    const keys = months(3, 7);
    const entries = [
      ...keys.flatMap(m => month(m)),
      e('2026-03', 'car', 'Kfz-Steuer', 300, Y),
      e('2026-03', 'insurance', 'ADAC', 60, Y),
    ];
    const r = yearlyReserve(buildBook(data(entries, keys)), today)!;
    expect(r.monthly).toBe(3000); // ceil(36000/12/100)*100 = 300 €
    expect(r.upcoming.map(u => u.name).sort()).toEqual(['ADAC', 'Kfz-Steuer']);
  });
});
