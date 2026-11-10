import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  carryCandidates, carryOver, changeMonthStart, computeBalances, dateAt, dayInMonth, dayIndex, dayOfMonth, daysInMonth, defaultEntryDate, isOverdue,
  leftPerDay, monthKeyOf, normalizeState, periodOf, periodRange, setMonthStart, validMonthStart, sortEntries,
} from './logic';
import { buildBook, pace } from './insights';
import { budgetStatus } from './budgets';
import { applyStatement, planStatement } from './statementImport';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

/* Month from payday (plan 32): a month can start on any day up to the 28th. */
afterEach(() => setMonthStart(1));
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10);
const golden = (): AppData => normalizeState(JSON.parse(readFileSync(new URL('./fixtures/demo-year.json', import.meta.url), 'utf8')));

describe('which month a day belongs to', () => {
  it('is the calendar month by default', () => {
    expect(periodOf('2026-11-25', 1)).toBe('2026-11');
    expect(periodRange('2026-02', 1)).toEqual({ first: '2026-02-01', last: '2026-02-28', days: 28 });
    expect(validMonthStart(0)).toBe(1);
    expect(validMonthStart(29)).toBe(1);
    expect(validMonthStart(25.5)).toBe(1);
    expect(validMonthStart(25)).toBe(25);
  });

  it('from the 25th: named after the month most of it lies in — the next one', () => {
    expect(periodOf('2026-10-24', 25)).toBe('2026-10');
    expect(periodOf('2026-10-25', 25)).toBe('2026-11');
    expect(periodOf('2026-11-24', 25)).toBe('2026-11');
    expect(periodOf('2026-12-31', 25)).toBe('2027-01');
    expect(periodRange('2026-11', 25)).toEqual({ first: '2026-10-25', last: '2026-11-24', days: 31 });
  });

  it('from the 10th: named after the month it starts in', () => {
    expect(periodOf('2026-11-09', 10)).toBe('2026-10');
    expect(periodOf('2026-11-10', 10)).toBe('2026-11');
    expect(periodOf('2027-01-05', 10)).toBe('2026-12');
    expect(periodRange('2026-11', 10)).toEqual({ first: '2026-11-10', last: '2026-12-09', days: 30 });
  });

  it('covers every day once, in months of 28, 29, 30 and 31 days', () => {
    for (const start of [2, 10, 15, 16, 25, 28]) {
      // Two years, a leap year among them: each day is in exactly the month whose range holds it.
      const seen = new Map<string, number>();
      for (let d = new Date(2027, 0, 1); d < new Date(2029, 0, 1); d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const key = periodOf(iso, start);
        const range = periodRange(key, start);
        expect(iso >= range.first && iso <= range.last, `${iso} in ${key} from the ${start}.`).toBe(true);
        const index = dayIndex(iso, key, start)!;
        expect(dateAt(key, index, start)).toBe(iso);
        expect(index).toBeLessThanOrEqual(range.days);
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      for (const [key, count] of seen) {
        if (key === [...seen.keys()][0] || key === [...seen.keys()].at(-1)) continue; // cut off by the two years
        expect(count, `${key} from the ${start}.`).toBe(periodRange(key, start).days);
      }
      expect(periodRange('2028-03', 25).days).toBe(29); // 25 Feb – 24 Mar in a leap year
      expect(periodRange('2027-03', 25).days).toBe(28);
    }
  });
});

describe('the month rules, with months from the 25th', () => {
  it('today, the default date, the day of the month and what is left per day follow the period', () => {
    setMonthStart(25);
    expect(monthKeyOf(at(2026, 10, 26))).toBe('2026-11');
    expect(dayOfMonth(at(2026, 10, 26))).toBe(2);
    expect(daysInMonth('2026-11')).toBe(31);
    expect(defaultEntryDate('2026-11', at(2026, 10, 26))).toBe('2026-10-26');
    expect(defaultEntryDate('2026-12', at(2026, 10, 26))).toBe('2026-11-26');
    expect(dayInMonth('2026-11', 3)).toBe('2026-11-03');
    expect(dayInMonth('2026-11', 31)).toBe('2026-10-31');
    expect(dayInMonth('2026-12', 31)).toBe('2026-11-30');
    // 31 days, day 2: thirty days left, today included.
    expect(leftPerDay(30000, '2026-11', at(2026, 10, 26))).toBe(1000);
    expect(leftPerDay(30000, '2026-10', at(2026, 10, 26))).toBeNull();
  });

  it('carry-over copies an entry to the same day a month on, inside the next period', () => {
    setMonthStart(25);
    const rent: Entry = { id: 'r', month: '2026-11', categoryId: 'fixed', name: 'Miete', amount: 90000, paid: true, repeat: 'monthly', seriesId: 'r', createdAt: 1, date: '2026-10-28' };
    const late: Entry = { ...rent, id: 'l', seriesId: 'l', name: 'Strom', date: '2026-11-03' };
    const data: AppData = { categories: defaultCategories(), months: [{ key: '2026-11', startedAt: 0 }], entries: [rent, late], monthStart: 25 };
    const copies = carryOver(carryCandidates(data, '2026-12'), '2026-12', 5)
      .sort((x, y) => x.name.localeCompare(y.name));
    expect(copies.map(e => [e.name, e.date, e.month])).toEqual([['Miete', '2026-11-28', '2026-12'], ['Strom', '2026-12-03', '2026-12']]);
    expect(isOverdue({ ...copies[0], paid: false }, at(2026, 11, 29))).toBe(true);
    expect(isOverdue({ ...copies[1], paid: false }, at(2026, 11, 29))).toBe(false);
  });

  it('a month’s entries are listed from its first day on: the 28th before the 3rd', () => {
    setMonthStart(25);
    const e = (id: string, date?: string, dueDay?: number): Entry => ({ id, month: '2026-11', categoryId: 'fixed', name: id, amount: 100, paid: false, repeat: 'none', seriesId: id, createdAt: 1, date, dueDay });
    expect(sortEntries([e('nov3', '2026-11-03'), e('due1', undefined, 1), e('oct28', '2026-10-28'), e('due26', undefined, 26)]).map(x => x.id))
      .toEqual(['due26', 'oct28', 'due1', 'nov3']);
  });

  it('a budget’s elapsed share and the pace count the period’s days', () => {
    setMonthStart(25);
    const cats = defaultCategories().map(c => (c.id === 'groceries' ? { ...c, limit: 31000 } : c));
    const food = (id: string, date: string): Entry => ({ id, month: periodOf(date), categoryId: 'groceries', name: 'Markt', amount: 1000, paid: true, repeat: 'none', seriesId: id, createdAt: 1, date });
    const data: AppData = { categories: cats, months: [{ key: '2026-11', startedAt: 0 }], entries: [food('a', '2026-10-25'), food('b', '2026-10-27')], monthStart: 25 };
    const today = at(2026, 10, 27); // day 3 of 31
    const status = budgetStatus(data.entries, cats.find(c => c.id === 'groceries')!, '2026-11', today)!;
    expect(status.elapsed).toBeCloseTo(3 / 31);
    expect(status.perDay).toBe(Math.floor(29000 / 29));
    const p = pace(buildBook(data), today);
    expect([p.month, p.days, p.day]).toEqual(['2026-11', 31, 3]);
    expect(p.spent).toBe(2000);
  });

  it('a bank import files each row by its date’s period', () => {
    setMonthStart(25);
    const data: AppData = { categories: defaultCategories(), months: [], entries: [], monthStart: 25 };
    const rows = planStatement([
      { name: 'Rewe', raw: 'Rewe', amount: 2000, income: false, date: '2026-10-24' },
      { name: 'Lidl', raw: 'Lidl', amount: 3000, income: false, date: '2026-10-25' },
    ], data, at(2026, 10, 27));
    expect(applyStatement(rows, 1).add.map(e => e.month)).toEqual(['2026-10', '2026-11']);
  });

  it('a book keeps its start day, and a date outside its period is dropped', () => {
    const raw = {
      categories: defaultCategories(), months: [{ key: '2026-11', startedAt: 0 }], monthStart: 25,
      entries: [
        { id: 'a', month: '2026-11', categoryId: 'fixed', name: 'A', amount: 1, paid: true, repeat: 'none', seriesId: 'a', createdAt: 1, date: '2026-10-25' },
        { id: 'b', month: '2026-11', categoryId: 'fixed', name: 'B', amount: 1, paid: true, repeat: 'none', seriesId: 'b', createdAt: 1, date: '2026-11-25' },
      ],
    };
    const d = normalizeState(raw);
    expect(d.monthStart).toBe(25);
    expect(d.entries.map(e => e.date)).toEqual(['2026-10-25', undefined]);
    expect(normalizeState({ ...raw, monthStart: 1 })).not.toHaveProperty('monthStart');
    expect(normalizeState({ ...raw, monthStart: 31 })).not.toHaveProperty('monthStart');
  });
});

describe('changing the day the months start on', () => {
  const data = golden();
  const last = (d: AppData) => { const b = computeBalances(d); return [b.at(-1)!.now, b.at(-1)!.end]; };

  it('with the 1st, the golden year is untouched', () => {
    const same = changeMonthStart(data, 1);
    expect(same.moved).toBe(0);
    expect(same.data).toEqual(data);
  });

  for (const start of [5, 15, 16, 25, 28]) {
    it(`from the ${start}.: every dated entry is in its period, and the balance of the last month stays`, () => {
      const { data: moved, moved: count } = changeMonthStart(data, start, 1);
      expect(count).toBeGreaterThan(0);
      expect(moved.monthStart).toBe(start);
      for (const e of moved.entries) if (e.date) expect(periodOf(e.date, start)).toBe(e.month);
      const keys = new Set(moved.months.map(m => m.key));
      for (const e of moved.entries) expect(keys.has(e.month)).toBe(true);
      // The same book once normalised: nothing in it breaks its own rules.
      expect(normalizeState(moved)).toEqual(moved);
      expect(last(moved)).toEqual(last(data));
    });

    it(`from the ${start}. and back to the 1st: the original months again`, () => {
      const there = changeMonthStart(data, start, 1).data;
      const back = changeMonthStart(there, 1, 1).data;
      expect(back.entries).toEqual(data.entries);
      expect(back).not.toHaveProperty('monthStart');
      expect(computeBalances(back).map(b => [b.key, b.now, b.end])).toEqual(computeBalances(data).map(b => [b.key, b.now, b.end]));
    });
  }

  it('an opening balance set by hand keeps every later balance where it was', () => {
    const e = (id: string, date: string, amount: number, categoryId = 'fixed'): Entry =>
      ({ id, month: date.slice(0, 7), categoryId, name: id, amount, paid: true, repeat: 'none', seriesId: id, createdAt: 1, date });
    const book: AppData = {
      categories: defaultCategories(),
      months: [{ key: '2026-10', startedAt: 0, opening: 100000 }, { key: '2026-11', startedAt: 0, opening: 50000 }, { key: '2026-12', startedAt: 0 }],
      entries: [e('a', '2026-10-05', 1000), e('b', '2026-10-27', 2000), e('c', '2026-11-03', 4000), e('d', '2026-11-26', 8000), e('pay', '2026-12-01', 300000, 'income')],
    };
    // As entered: November opens at 500 whatever October did; December ends at 500 − 40 − 80 + 3.000.
    expect(computeBalances(book).at(-1)!.now).toBe(50000 - 4000 - 8000 + 300000);
    for (const start of [10, 25]) {
      const moved = changeMonthStart(book, start, 1).data;
      expect(computeBalances(moved).at(-1)!.now, `from the ${start}.`).toBe(338000);
      expect(computeBalances(changeMonthStart(moved, 1, 1).data).map(b => [b.key, b.now])).toEqual(computeBalances(book).map(b => [b.key, b.now]));
    }
  });
});
