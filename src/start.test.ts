import { describe, expect, it } from 'vitest';
import { startPlan } from './start';
import { computeBalances } from './logic';
import { defaultCategories } from './data/defaults';
import { Entry } from './types';

const today = new Date(2026, 10, 12, 12); // 12 November 2026

describe('the start’s three answers (plan 39)', () => {
  it('nothing answered: nothing to write', () => {
    expect(startPlan({ fixed: [] }, '2026-11', 'Gehalt', today)).toEqual({ entries: [] });
  });

  it('a day up to today is paid, a later one open, none counts from the first', () => {
    const plan = startPlan({
      income: { amount: 320000, day: 28 },
      fixed: [{ name: 'Miete', amount: 95000, day: 1 }, { name: ' Strom ', amount: 8000 }, { name: 'Handy', amount: 2000, day: 20 }, { name: 'Gas', amount: 0 }, { name: '', amount: 500 }],
    }, '2026-11', 'Gehalt', today);
    expect(plan.entries).toEqual([
      { kind: 'income', name: 'Gehalt', amount: 320000, date: '2026-11-28', paid: false },
      { kind: 'expense', name: 'Miete', amount: 95000, date: '2026-11-01', paid: true },
      { kind: 'expense', name: 'Strom', amount: 8000, date: '2026-11-01', paid: true },
      { kind: 'expense', name: 'Handy', amount: 2000, date: '2026-11-20', paid: false },
    ]);
    expect(plan.opening).toBeUndefined();
    expect(plan.end).toBeUndefined();
  });

  it('a day past the month’s end is its last day; today itself is paid', () => {
    const plan = startPlan({ fixed: [{ name: 'Miete', amount: 1, day: 31 }, { name: 'Strom', amount: 1, day: 12 }] }, '2026-11', 'Gehalt', today);
    expect(plan.entries.map(e => [e.date, e.paid])).toEqual([['2026-11-30', false], ['2026-11-12', true]]);
  });

  it('with a balance: the opening that leads to it, and what is left once the open entries are settled', () => {
    const answers = {
      balance: 245000,
      income: { amount: 320000, day: 28 },
      fixed: [{ name: 'Miete', amount: 95000, day: 1 }, { name: 'Handy', amount: 2000, day: 20 }],
    };
    const plan = startPlan(answers, '2026-11', 'Gehalt', today);
    // The rent is in the balance already: the month opened 950 higher.
    expect(plan.opening).toBe(245000 + 95000);
    expect(plan.end).toBe(245000 + 320000 - 2000);

    // The book it makes says the same.
    const entries: Entry[] = plan.entries.map((e, i) => ({
      id: `e${i}`, seriesId: `e${i}`, month: '2026-11', categoryId: e.kind === 'income' ? 'income' : 'fixed', name: e.name,
      amount: e.amount, paid: e.paid, repeat: 'monthly', date: e.date, createdAt: 0,
    }));
    const [b] = computeBalances({ categories: defaultCategories(), entries, months: [{ key: '2026-11', startedAt: 0, opening: plan.opening }] });
    expect(b.now).toBe(245000);
    expect(b.end).toBe(plan.end);
  });

  it('an overdrawn account stays overdrawn', () => {
    const plan = startPlan({ balance: -5000, fixed: [{ name: 'Miete', amount: 95000, day: 28 }] }, '2026-11', 'Gehalt', today);
    expect(plan.opening).toBe(-5000);
    expect(plan.end).toBe(-100000);
  });
});
