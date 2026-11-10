import { describe, expect, it } from 'vitest';
import { annuityPayment, debtPayments, debtPlan, debtSchedule, debtsOverview, paymentSeries } from './debts';
import { AppData, Debt, Entry } from '../types';
import { defaultCategories } from '../data/defaults';
import { makeBackup, normalizeState, parseBackup } from '../logic';

/* Debts and loans, and money lent (plan 31). */
const cats = defaultCategories();
let n = 0;
const e = (month: string, amount: number, extra: Partial<Entry> = {}): Entry => {
  n++;
  return { id: `d${n}`, month, categoryId: 'fixed', name: 'Rate', amount, paid: true, repeat: 'monthly', seriesId: 'loan', createdAt: n, ...extra };
};
const loan = (extra: Partial<Debt> = {}): Debt => ({ id: 'L', name: 'Autokredit', direction: 'owe', principal: 1_000_000, start: '2026-01', createdAt: 0, ...extra });
/** The 15th of a month, mid-morning. */
const on = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 15, 10);
const months = (from: string, count: number) => Array.from({ length: count }, (_, i) => {
  const d = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

describe('the annuity', () => {
  it('matches the published tables', () => {
    // 10.000 € at 5 % over 3 years: 299,71 € a month; 200.000 € at 6 % over 30 years: 1.199,10 €.
    expect(annuityPayment(1_000_000, 5, 36)).toBe(29971);
    expect(annuityPayment(20_000_000, 6, 360)).toBe(119910);
    expect(annuityPayment(1_200_000, 0, 12)).toBe(100000);
  });

  it('pays the loan off in its term, with the interest the tables give', () => {
    const plan = debtSchedule(loan({ rate: 5 }), new Map(), 29971, on('2026-01'));
    expect(plan.payoff).toBe('2029-01');
    expect(plan.rows.filter(r => r.planned)).toHaveLength(36);
    // 36 × 299,71 € = 10.789,56 €, the last payment a few cents short of a full one.
    expect(plan.interestLeft).toBeGreaterThan(78_940);
    expect(plan.interestLeft).toBeLessThan(78_960);
    expect(plan.never).toBe(false);
  });

  it('as paid: three years of payments leave nothing', () => {
    const paid = new Map(months('2026-02', 36).map(m => [m, 29971]));
    const plan = debtSchedule(loan({ rate: 5 }), paid, 29971, on('2029-02'));
    expect(plan.done).toBe(true);
    expect(plan.left).toBe(0);
    expect(plan.payoff).toBe('2029-01');
    expect(plan.interestPaid).toBeGreaterThan(78_940);
    expect(plan.interestPaid).toBeLessThan(78_960);
  });
});

describe('a debt in the book', () => {
  it('without interest: twelve payments from the month after it started', () => {
    const plan = debtSchedule(loan({ principal: 120_000 }), new Map(), 10_000, on('2026-01'));
    expect(plan.payoff).toBe('2027-01');
    expect(plan.interestLeft).toBe(0);
  });

  it('counts the linked series and extra payments, open ones and earlier ones not', () => {
    const debt = loan({ principal: 120_000, seriesId: 'loan' });
    const entries = [
      e('2025-12', 10_000), // before it started
      e('2026-02', 10_000),
      e('2026-03', 10_000),
      e('2026-03', 20_000, { seriesId: 'x1', repeat: 'none', debtId: 'L', name: 'Sondertilgung' }),
      e('2026-04', 10_000, { paid: false }),
      e('2026-03', 5_000, { seriesId: 'loan', debtId: 'L' }), // both links: counted once
    ];
    expect([...debtPayments(entries, debt)]).toEqual([['2026-02', 10_000], ['2026-03', 35_000]]);
    const data: AppData = { categories: cats, entries, months: [], debts: [debt] };
    const plan = debtPlan(data, debt, on('2026-03'));
    expect(plan.left).toBe(75_000);
    expect(plan.paid).toBe(45_000);
    // The monthly payment comes from the series' latest entry; 7½ payments to go from April.
    expect(plan.monthly).toBe(10_000);
    expect(plan.payoff).toBe('2026-11');
  });

  it('money lent: paid back by entries carrying its id', () => {
    const lent: Debt = { id: 'P', name: 'Papa', direction: 'owed', principal: 50_000, start: '2026-01', createdAt: 0 };
    const entries = [
      e('2026-02', 10_000, { categoryId: 'income', seriesId: 'p1', repeat: 'none', debtId: 'P' }),
      e('2026-03', 10_000, { categoryId: 'income', seriesId: 'p2', repeat: 'none', debtId: 'P' }),
    ];
    const data: AppData = { categories: cats, entries, months: [], debts: [lent] };
    const plan = debtPlan(data, lent, on('2026-03'));
    expect(plan.left).toBe(30_000);
    expect(plan.payoff).toBeNull();
    expect(plan.interestLeft).toBeNull();
    expect(debtPlan({ ...data, debts: [{ ...lent, payment: 10_000 }] }, { ...lent, payment: 10_000 }, on('2026-03')).payoff).toBe('2026-06');
    expect(debtsOverview(data, on('2026-03'))).toMatchObject({ owe: 0, owed: 30_000 });
  });

  it('never ends when the payment doesn’t cover the interest', () => {
    const plan = debtSchedule(loan({ rate: 12 }), new Map(), 5_000, on('2026-01'));
    expect(plan.never).toBe(true);
    expect(plan.payoff).toBeNull();
    expect(plan.interestLeft).toBeNull();
  });

  it('this month’s payment not made yet is the first planned one', () => {
    const plan = debtSchedule(loan({ principal: 30_000 }), new Map([['2026-02', 10_000]]), 10_000, on('2026-03'));
    expect(plan.left).toBe(20_000);
    expect(plan.rows.filter(r => r.planned).map(r => r.month)).toEqual(['2026-03', '2026-04']);
    expect(plan.payoff).toBe('2026-04');
  });
});

describe('debts in storage', () => {
  it('normalises them, and an entry’s link to a debt that isn’t there goes', () => {
    const d = normalizeState({
      categories: cats, months: [],
      entries: [e('2026-02', 100, { debtId: 'L' }), e('2026-02', 100, { debtId: 'gone' })],
      debts: [
        { ...loan(), rate: 4.25, payment: 29971.4, seriesId: 'loan', name: '  Auto\nkredit  ' },
        { id: 'bad', name: 'x', direction: 'owe', principal: -5, start: '2026-01' },
        { id: 'P', direction: 'sideways', principal: 100, start: '2026-13' },
        { ...loan(), id: 'L2', direction: 'owed', rate: -1 },
      ],
    });
    expect(d.debts!.map(x => x.id)).toEqual(['L', 'L2']);
    expect(d.debts![0]).toMatchObject({ name: 'Auto kredit', rate: 4.25, payment: 29971, seriesId: 'loan' });
    expect(d.debts![1]).toMatchObject({ direction: 'owed' });
    expect(d.debts![1]).not.toHaveProperty('rate');
    expect(d.entries.map(x => x.debtId)).toEqual(['L', undefined]);
  });

  it('a backup carries them', () => {
    const data = normalizeState({ categories: cats, months: [{ key: '2026-02', startedAt: 0 }], entries: [e('2026-02', 100, { debtId: 'L' })], debts: [loan({ rate: 5 })] });
    const again = parseBackup(JSON.stringify(makeBackup(data)));
    expect(again.ok && again.data).toEqual(data);
  });
});

describe('what a debt can be paid with', () => {
  it('lists each monthly series once, by its newest entry', () => {
    const data: AppData = {
      categories: cats, months: [],
      entries: [
        e('2026-01', 25_000, { name: 'Kredit alt' }),
        e('2026-02', 26_000, { name: 'Autokredit' }),
        e('2026-02', 300_000, { categoryId: 'income', seriesId: 'pay', name: 'Gehalt' }),
        e('2026-02', 4_000, { seriesId: 'once', repeat: 'none', name: 'Pizza' }),
      ],
    };
    expect(paymentSeries(data).map(s => [s.name, s.amount, s.income])).toEqual([['Autokredit', 26_000, false], ['Gehalt', 300_000, true]]);
  });
});
