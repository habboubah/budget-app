import { describe, expect, it } from 'vitest';
import { budgetStatus, monthBudgets, roundBudget, suggestLimit } from './budgets';
import { formatMoneyShort, makeBackup, normalizeState, parseBackup, restoreDefaultCategories, upgradeData } from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Category, Entry } from './types';

let n = 0;
function e(month: string, categoryId: string, euros: number, paid = true, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `b${n}`, month, categoryId, name: `x${n}`, amount: Math.round(euros * 100), paid, repeat: 'none', seriesId: `b${n}`, createdAt: n, ...extra };
}
const withLimit = (id: string, euros: number | undefined): Category[] =>
  defaultCategories().map(c => (c.id === id ? { ...c, limit: euros === undefined ? undefined : euros * 100 } : c));
const nov7 = new Date(2026, 10, 7, 12);

describe('a budget in a month', () => {
  const cats = withLimit('groceries', 650);
  const groceries = cats.find(c => c.id === 'groceries')!;

  it('counts what is paid and what is still open against the limit', () => {
    const s = budgetStatus([e('2026-11', 'groceries', 200), e('2026-11', 'groceries', 26.6), e('2026-11', 'groceries', 50, false),
      e('2026-10', 'groceries', 999), e('2026-11', 'car', 999)], groceries, '2026-11', nov7)!;
    expect(s).toMatchObject({ limit: 65000, paid: 22660, open: 5000, spent: 27660, left: 37340 });
  });

  it('knows where the month is: today counts as gone', () => {
    expect(budgetStatus([], groceries, '2026-11', nov7)!.elapsed).toBeCloseTo(7 / 30);
    expect(budgetStatus([], groceries, '2026-10', nov7)!.elapsed).toBe(1);
    expect(budgetStatus([], groceries, '2026-12', nov7)!.elapsed).toBe(0);
  });

  it('spreads what is left over the days to come, in the running month only', () => {
    // 650 € − 226,60 € = 423,40 € over 24 days = 17,64 €.
    expect(budgetStatus([e('2026-11', 'groceries', 226.6)], groceries, '2026-11', nov7)!.perDay).toBe(1764);
    expect(budgetStatus([e('2026-10', 'groceries', 226.6)], groceries, '2026-10', nov7)!.perDay).toBeNull();
    expect(budgetStatus([e('2026-11', 'groceries', 700)], groceries, '2026-11', nov7)!.perDay).toBeNull();
  });

  it('is over once spending passes the limit', () => {
    const s = budgetStatus([e('2026-11', 'groceries', 650), e('2026-11', 'groceries', 50.04, false)], groceries, '2026-11', nov7)!;
    expect(s.left).toBe(-5004);
    expect(s.ahead).toBe(false);
  });

  it('is ahead when more than ten points of it are paid beyond the pace', () => {
    // 7 of 30 days gone = 23 %. 35 % paid is ahead; 33 % isn't yet.
    expect(budgetStatus([e('2026-11', 'groceries', 227.5)], groceries, '2026-11', nov7)!.ahead).toBe(true);
    expect(budgetStatus([e('2026-11', 'groceries', 214.5)], groceries, '2026-11', nov7)!.ahead).toBe(false);
    // A bill entered early but not paid isn't spending early.
    expect(budgetStatus([e('2026-11', 'groceries', 300, false)], groceries, '2026-11', nov7)!.ahead).toBe(false);
    // Only the running month has a pace.
    expect(budgetStatus([e('2026-10', 'groceries', 600)], groceries, '2026-10', nov7)!.ahead).toBe(false);
  });

  it('takes a recurring bill off the budget before measuring the pace', () => {
    const family = { ...defaultCategories().find(c => c.id === 'family')!, limit: 30000 };
    const kita = e('2026-11', 'family', 180, true, { repeat: 'monthly' });
    // Kita paid on the 5th: 60 % of the budget gone, but not ahead — nothing else is spent.
    expect(budgetStatus([kita], family, '2026-11', nov7)!.ahead).toBe(false);
    // 120 € are left for the rest; 50 € of shoes by the 7th is 42 % of that — ahead.
    expect(budgetStatus([kita, e('2026-11', 'family', 50)], family, '2026-11', nov7)!.ahead).toBe(true);
    // A budget the recurring bills already use up has no pace to keep.
    expect(budgetStatus([{ ...kita, amount: 30000 }], family, '2026-11', nov7)!.ahead).toBe(false);
  });

  it('has none without a limit, or for income', () => {
    const plain = defaultCategories().find(c => c.id === 'car')!;
    const income = { ...defaultCategories().find(c => c.id === 'income')!, limit: 100000 };
    expect(budgetStatus([], plain, '2026-11', nov7)).toBeNull();
    expect(budgetStatus([], income, '2026-11', nov7)).toBeNull();
  });

  it('lists a month’s budgets and counts those within them', () => {
    const categories = defaultCategories().map(c => (c.id === 'groceries' ? { ...c, limit: 65000 } : c.id === 'extra' ? { ...c, limit: 15000 } : c));
    const data: AppData = { categories, months: [{ key: '2026-11', startedAt: 0 }], entries: [e('2026-11', 'groceries', 100), e('2026-11', 'extra', 200)] };
    const b = monthBudgets(data, '2026-11', categories, nov7);
    expect(b.items.map(x => x.category.id)).toEqual(['extra', 'groceries']);
    expect(b.within).toBe(1);
  });
});

describe('a budget to start from', () => {
  const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map(key => ({ key, startedAt: 0 }));
  const data = (entries: Entry[]): AppData => ({ categories: defaultCategories(), months, entries });

  it('is the last three finished months’ average, rounded up', () => {
    const d = data([
      e('2026-07', 'groceries', 2000), // too long ago
      e('2026-08', 'groceries', 600), e('2026-09', 'groceries', 640), e('2026-10', 'groceries', 600.5),
      e('2026-11', 'groceries', 900), // still running
    ]);
    expect(suggestLimit(d, 'groceries', nov7)).toEqual({ amount: 62000, average: 61350, months: 3 });
  });

  it('counts a month without spending as nothing', () => {
    expect(suggestLimit(data([e('2026-10', 'restaurants', 90)]), 'restaurants', nov7)).toEqual({ amount: 3000, average: 3000, months: 3 });
  });

  it('has nothing to say without finished months or spending', () => {
    expect(suggestLimit(data([]), 'groceries', nov7)).toBeNull();
    expect(suggestLimit({ ...data([e('2026-11', 'groceries', 50)]), months: [{ key: '2026-11', startedAt: 0 }] }, 'groceries', nov7)).toBeNull();
  });

  it('rounds the way a person would', () => {
    expect([roundBudget(4710), roundBudget(10000), roundBudget(61350), roundBudget(123400)]).toEqual([5000, 10000, 62000, 125000]);
  });
});

describe('budgets in storage', () => {
  it('keeps a valid limit on spending categories and drops anything else', () => {
    const raw = {
      categories: [
        { id: 'a', names: { de: 'A' }, kind: 'expense', limit: 40000 },
        { id: 'b', names: { de: 'B' }, kind: 'expense', limit: 123.4 },
        { id: 'c', names: { de: 'C' }, kind: 'expense', limit: -5 },
        { id: 'd', names: { de: 'D' }, kind: 'expense', limit: '400' },
        { id: 'e', names: { de: 'E' }, kind: 'income', limit: 40000 },
      ],
      entries: [], months: [],
    };
    expect(normalizeState(raw).categories.map(c => c.limit)).toEqual([40000, 123, undefined, undefined, undefined]);
  });

  it('leaves data saved before budgets (schema 8) as it was', () => {
    const before: AppData = {
      categories: defaultCategories(),
      months: [{ key: '2026-10', startedAt: 0, categories: ['income', 'fixed'] }, { key: '2026-11', startedAt: 0 }],
      entries: [e('2026-10', 'fixed', 1050, true, { repeat: 'monthly', date: '2026-10-01' }), e('2026-11', 'groceries', 20)],
    };
    const loaded = normalizeState(JSON.parse(JSON.stringify(before)));
    expect(upgradeData(loaded, 8, nov7)).toEqual(before);
  });

  it('travels in a backup', () => {
    const d: AppData = { categories: withLimit('groceries', 650), entries: [], months: [] };
    const back = parseBackup(JSON.stringify(makeBackup(d)));
    expect(back.ok && back.data.categories.find(c => c.id === 'groceries')?.limit).toBe(65000);
  });

  it('survives restoring the default categories', () => {
    const restored = restoreDefaultCategories(withLimit('groceries', 650).map(c => ({ ...c, names: { de: 'Umbenannt' } })), defaultCategories());
    expect(restored.find(c => c.id === 'groceries')).toMatchObject({ limit: 65000, names: defaultCategories().find(c => c.id === 'groceries')!.names });
  });

  it('shows without cents when it has none', () => {
    expect(formatMoneyShort(40000, 'de-DE')).toBe('400\u00a0€');
    expect(formatMoneyShort(21288, 'de-DE')).toBe('212,88\u00a0€');
    expect(formatMoneyShort(40000, 'en-GB')).toBe('€400');
  });
});
