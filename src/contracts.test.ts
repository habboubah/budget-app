import { describe, expect, it } from 'vitest';
import { contractItems, contractTotals, daysUntil, nextDeadline, shiftDay } from './contracts';
import { normalizeState, parseBackup, makeBackup } from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `c${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: n, ...extra };
}
const M = { repeat: 'monthly' as const };
const Y = { repeat: 'yearly' as const };

describe('dates of a contract', () => {
  it('moves a day by whole months, inside its month', () => {
    expect(shiftDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', -1)).toBe('2026-11-30');
    expect(shiftDay('2027-01-01', -3)).toBe('2026-10-01');
    expect(shiftDay('2024-02-29', 12)).toBe('2025-02-28');
  });
  it('counts days to a date', () => {
    const today = new Date(2026, 10, 7);
    expect(daysUntil('2026-11-07', today)).toBe(0);
    expect(daysUntil('2026-11-30', today)).toBe(23);
    expect(daysUntil('2026-11-01', today)).toBe(-6);
  });
  it('finds the last day to cancel, and rolls on to the renewed end once it has passed', () => {
    const today = new Date(2026, 10, 7);
    // Car insurance: ends 31 Dec, one month's notice → by 30 Nov.
    expect(nextDeadline({ end: '2026-12-31', notice: 1 }, today)).toEqual({ endsOn: '2026-12-31', cancelBy: '2026-11-30' });
    // Notice already missed: the next year's end.
    expect(nextDeadline({ end: '2026-12-31', notice: 3 }, today)).toEqual({ endsOn: '2027-12-31', cancelBy: '2027-09-30' });
    // Monthly renewal, counted from the first end so the 31st stays the 31st.
    expect(nextDeadline({ end: '2026-01-31', renews: 1 }, today)).toEqual({ endsOn: '2026-11-30', cancelBy: '2026-11-30' });
    expect(nextDeadline({ end: '2026-01-31', renews: 1 }, new Date(2026, 11, 1))).toEqual({ endsOn: '2026-12-31', cancelBy: '2026-12-31' });
    expect(nextDeadline({ notice: 1 }, today)).toBeNull();
  });
});

describe('the contracts of a month', () => {
  const entries = [
    e('2026-09', 'fixed', 'Handy', 20, M), e('2026-10', 'fixed', 'Handy', 20, M), e('2026-11', 'fixed', 'Handy', 25, { ...M, paid: false, date: '2026-11-18' }),
    e('2026-10', 'fixed', 'Miete', 1050, M), e('2026-11', 'fixed', 'Miete', 1050, { ...M, date: '2026-11-01' }),
    e('2026-03', 'car', 'Kfz-Versicherung', 612, { ...Y, date: '2026-03-01' }),
    e('2025-02', 'car', 'Kfz-Steuer', 304, Y),
    e('2026-11', 'groceries', 'Lidl', 40),
    e('2026-10', 'fixed', 'Zeitung', 30, M), // stopped: not in November
    e('2026-11', 'income', 'Gehalt', 3000, M),
  ];
  const data: AppData = {
    categories: cats, entries, months: [],
    contracts: { 's-Kfz-Versicherung': { end: '2026-12-31', notice: 1 }, 's-Miete': { note: 'Staffelmiete' } },
  };
  const today = new Date(2026, 10, 7);
  const items = contractItems(data, '2026-11', today);

  it('lists the month’s monthly series and the year’s yearly ones, spending only', () => {
    expect(items.map(i => i.name).sort()).toEqual(['Handy', 'Kfz-Versicherung', 'Miete']);
  });
  it('puts a deadline in the next 90 days first, then the dearest', () => {
    expect(items.map(i => i.name)).toEqual(['Kfz-Versicherung', 'Miete', 'Handy']);
    expect(items[0].deadline).toEqual({ endsOn: '2026-12-31', cancelBy: '2026-11-30' });
  });
  it('knows the next payment and the last change of the amount', () => {
    const handy = items.find(i => i.name === 'Handy')!;
    expect(handy.next).toEqual({ month: '2026-11', date: '2026-11-18', open: true });
    expect(handy.change).toEqual({ by: 500, since: '2026-11' });
    const rent = items.find(i => i.name === 'Miete')!;
    expect(rent.next).toEqual({ month: '2026-12', date: '2026-12-01', open: false });
    expect(rent.change).toBeUndefined();
    expect(rent.contract).toEqual({ note: 'Staffelmiete' });
    const car = items.find(i => i.name === 'Kfz-Versicherung')!;
    expect(car.next).toEqual({ month: '2027-03', date: '2027-03-01', open: false });
    expect([car.monthly, car.yearly]).toEqual([5100, 61200]);
  });
  it('adds them up per month and per year', () => {
    expect(contractTotals(items)).toEqual({ monthly: 2500 + 105000 + 5100, yearly: 30000 + 1260000 + 61200 });
  });
});

describe('contracts in stored data', () => {
  it('keeps sound contract details and drops the rest', () => {
    const d = normalizeState({
      categories: cats, entries: [], months: [],
      contracts: {
        a: { end: '2026-12-31', notice: 1, renews: 12, note: '  Kundennr. 42  ' },
        b: { end: '31.12.2026', notice: 1.5, renews: 0 },
        c: 'nonsense',
        d: {},
      },
    });
    expect(d.contracts).toEqual({ a: { end: '2026-12-31', notice: 1, renews: 12, note: 'Kundennr. 42' } });
    expect(normalizeState({ categories: cats, entries: [], months: [] }).contracts).toBeUndefined();
  });
  it('round-trips through a backup', () => {
    const data: AppData = { categories: cats, entries: [], months: [], contracts: { a: { end: '2026-12-31', notice: 1 } } };
    const back = parseBackup(JSON.stringify(makeBackup(data)));
    expect(back.ok && back.data.contracts).toEqual({ a: { end: '2026-12-31', notice: 1 } });
  });
});
