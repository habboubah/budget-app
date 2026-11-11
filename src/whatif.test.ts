import { describe, expect, it } from 'vitest';
import { buildBook, extraPayment, outlook, whatIf, whatIfRange } from './insights';
import { defaultCategories } from './data/defaults';
import { AppData, Debt, Entry, MonthKey } from './types';

/* "Kann ich mir das leisten?": a plan laid over the Ausblick, an extra payment over a debt. */
const cats = defaultCategories();
let n = 0;
function e(month: MonthKey, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `w${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: n, ...extra };
}
const today = new Date(2026, 10, 11);
const keys: MonthKey[] = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
// 3.000 in, 2.000 fixed, 500 everyday: 500 over every month. July opens with 1.000.
const entries = keys.flatMap(k => [
  e(k, 'income', 'Gehalt', 3000, { repeat: 'monthly' }),
  e(k, 'fixed', 'Miete', 2000, { repeat: 'monthly' }),
  e(k, 'groceries', `Einkauf ${k}`, 500, { seriesId: `g-${k}` }),
]);
const data: AppData = { categories: cats, entries, months: keys.map((key, i) => ({ key, startedAt: i + 1, ...(i === 0 ? { opening: 100000 } : {}) })) };
const ahead = outlook(buildBook(data), today)!;

describe('a plan over the Ausblick', () => {
  it('starts from the Ausblick as it is', () => {
    expect(ahead.from).toEqual({ key: '2026-11', end: 350000 });
    expect(ahead.months[0]).toMatchObject({ key: '2026-12', mid: 400000 });
    expect(whatIfRange(ahead)).toEqual({ min: '2026-11', max: '2027-11' });
  });

  it('takes a purchase off from its month on', () => {
    const w = whatIf(ahead, { once: { amount: 300000, month: '2027-02' } })!;
    expect(w.months.find(m => m.key === '2027-01')).toMatchObject({ before: 450000, after: 450000 });
    expect(w.months.find(m => m.key === '2027-02')).toMatchObject({ before: 500000, after: 200000 });
    expect(w.low).toEqual({ before: { month: '2026-12', amount: 400000 }, after: { month: '2027-02', amount: 200000 } });
    expect(w.end).toEqual({ month: '2027-11', before: 950000, after: 650000 });
    expect(w.cost).toBe(300000);
  });

  it('counts a purchase in the running month from the first month ahead', () => {
    const w = whatIf(ahead, { once: { amount: 100000, month: '2026-11' } })!;
    expect(w.months[0]).toMatchObject({ key: '2026-12', after: 300000 });
  });

  it('adds a monthly cost up month by month', () => {
    const w = whatIf(ahead, { monthly: { amount: 60000, from: '2027-01' } })!;
    expect(w.months.slice(0, 3).map(m => m.after)).toEqual([400000, 390000, 380000]);
    // 500 a month come in, 600 go out: eleven months of it by November.
    expect(w.cost).toBe(11 * 60000);
    expect(w.end.after).toBe(950000 - 660000);
  });

  it('says whether it fits: above a month of basic needs, tight, or short', () => {
    expect(ahead.grundbedarf).toBe(250000);
    expect(whatIf(ahead, { once: { amount: 100000, month: '2026-12' } })!.verdict).toBe('ok');
    expect(whatIf(ahead, { once: { amount: 200000, month: '2026-12' } })).toMatchObject({ verdict: 'tight', first: '2026-12' });
    expect(whatIf(ahead, { once: { amount: 520000, month: '2027-01' } })).toMatchObject({ verdict: 'short', first: '2027-01' });
  });
});

describe('an extra payment on a debt', () => {
  const debt: Debt = { id: 'car', name: 'Autokredit', direction: 'owe', principal: 1200000, start: '2026-11', rate: 6, payment: 30000, createdAt: 1 };
  const book: AppData = { ...data, debts: [debt] };

  it('ends it sooner and saves interest', () => {
    const x = extraPayment(book, debt, 10000, today)!;
    expect(x.monthly).toBe(40000);
    expect(x.before && x.after && x.after < x.before).toBe(true);
    expect(x.monthsEarlier).toBeGreaterThan(8);
    expect(x.interestSaved).toBeGreaterThan(0);
  });

  it('has nothing to say without an extra amount', () => {
    expect(extraPayment(book, debt, 0, today)).toBeNull();
  });

  it('says so when even more doesn’t cover the interest', () => {
    const heavy: Debt = { ...debt, rate: 60, payment: 10000 };
    expect(extraPayment({ ...data, debts: [heavy] }, heavy, 1000, today)).toMatchObject({ before: null, after: null, monthsEarlier: null });
  });
});
