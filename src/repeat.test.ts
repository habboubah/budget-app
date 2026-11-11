import { describe, expect, it } from 'vitest';
import { carryCandidates, carryOver, comesBackIn, intervalOf, laterCopies, latestPeriodic, normalizeState } from './logic';
import { commitments } from './insights/rules';
import { contractItems } from './contracts';
import { buildBook, outlook } from './insights';
import { defaultCategories } from './data/defaults';
import { AppData, Entry, MonthKey } from './types';

/*
 * Schema 24: a yearly entry may come back every 2, 3 or 6 months (`every`),
 * and a recurring entry may end (`until`).
 */
const cats = defaultCategories();
let n = 0;
function e(month: MonthKey, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `r${n}`, month, categoryId: 'fixed', name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: n, ...extra };
}
const months = (...keys: MonthKey[]) => keys.map((key, i) => ({ key, startedAt: i + 1 }));
const book = (entries: Entry[], keys: MonthKey[]): AppData => ({ categories: cats, entries, months: months(...keys) });
const Q = { repeat: 'yearly' as const, every: 3 as const };

describe('intervals', () => {
  it('reads how many months lie between two copies', () => {
    expect(intervalOf({ repeat: 'none' })).toBe(0);
    expect(intervalOf({ repeat: 'monthly' })).toBe(1);
    expect(intervalOf({ repeat: 'yearly' })).toBe(12);
    expect(intervalOf({ repeat: 'yearly', every: 3 })).toBe(3);
  });

  it('carries a quarterly bill into the month three months on, and no other', () => {
    const data = book([e('2026-01', 'Rundfunkbeitrag', 55.08, Q)], ['2026-01', '2026-02', '2026-03']);
    expect(carryCandidates(data, '2026-03')).toEqual([]);
    expect(carryCandidates(data, '2026-04').map(x => x.name)).toEqual(['Rundfunkbeitrag']);
    expect(carryCandidates(data, '2026-05')).toEqual([]);
    const [copy] = carryOver(carryCandidates(data, '2026-04'), '2026-04', 99);
    expect(copy).toMatchObject({ month: '2026-04', repeat: 'yearly', every: 3, paid: false });
  });

  it('still carries a yearly bill a year on', () => {
    const data = book([e('2026-01', 'Kfz-Steuer', 180, { repeat: 'yearly' })], ['2026-01']);
    expect(carryCandidates(data, '2026-07')).toEqual([]);
    expect(carryCandidates(data, '2027-01')).toHaveLength(1);
  });

  it('puts a half-yearly bill into the started months it falls in', () => {
    const entry = e('2026-01', 'Versicherung', 240, { repeat: 'yearly', every: 6 });
    const keys = ['2026-01', '2026-02', '2026-07', '2026-08', '2027-01'];
    expect(laterCopies(book([entry], keys), entry, 1).map(x => x.month)).toEqual(['2026-07', '2027-01']);
  });

  it('spreads a quarterly bill over the year in the fixed costs and the contracts', () => {
    const data = book([e('2026-10', 'Rundfunkbeitrag', 55.08, Q), e('2026-11', 'Miete', 950, { repeat: 'monthly' })], ['2026-10', '2026-11']);
    const quarter = commitments(data, '2026-11').items.find(i => i.name === 'Rundfunkbeitrag')!;
    expect(quarter).toMatchObject({ monthly: 1836, yearly: 22032 });
    const item = contractItems(data, '2026-11', new Date(2026, 10, 11)).find(i => i.name === 'Rundfunkbeitrag')!;
    expect(item).toMatchObject({ every: 3, monthly: 1836, yearly: 22032 });
    expect(item.next.month).toBe('2027-01');
  });

  it('keeps `every` only on a yearly entry, and only 2, 3 or 6', () => {
    const data = normalizeState({ categories: cats, months: months('2026-01'), entries: [
      { ...e('2026-01', 'a', 1, { repeat: 'yearly' }), every: 3 },
      { ...e('2026-01', 'b', 1, { repeat: 'monthly' }), every: 3 },
      { ...e('2026-01', 'c', 1, { repeat: 'yearly' }), every: 5 },
    ] });
    expect(data.entries.map(x => x.every)).toEqual([3, undefined, undefined]);
  });
});

describe('a recurring entry that ends', () => {
  const rate = (month: MonthKey) => e(month, 'Sofa-Rate', 50, { repeat: 'monthly', until: '2026-03' });

  it('is carried up to its last month and not beyond', () => {
    const data = book([rate('2026-02')], ['2026-01', '2026-02']);
    expect(carryCandidates(data, '2026-03')).toHaveLength(1);
    expect(carryOver(carryCandidates(data, '2026-03'), '2026-03', 9)[0].until).toBe('2026-03');
    expect(carryCandidates(book([rate('2026-03')], ['2026-03']), '2026-04')).toEqual([]);
  });

  it('goes into the started months up to its end only', () => {
    const entry = rate('2026-01');
    expect(laterCopies(book([entry], ['2026-01', '2026-02', '2026-03', '2026-04']), entry, 1).map(x => x.month)).toEqual(['2026-02', '2026-03']);
  });

  it('drops an end before the entry itself, and an end on a one-off', () => {
    const data = normalizeState({ categories: cats, months: months('2026-05'), entries: [
      { ...e('2026-05', 'a', 1, { repeat: 'monthly' }), until: '2026-04' },
      { ...e('2026-05', 'b', 1), until: '2026-09' },
      { ...e('2026-05', 'c', 1, { repeat: 'monthly' }), until: '2026-09' },
    ] });
    expect(data.entries.map(x => x.until)).toEqual([undefined, undefined, '2026-09']);
  });

  it('comes back every interval, never past its end', () => {
    const q = { ...e('2026-01', 'q', 1, Q), until: '2026-07' };
    expect(['2026-02', '2026-04', '2026-07', '2026-10'].map(k => comesBackIn(q, k))).toEqual([false, true, true, false]);
  });
});

describe('the outlook', () => {
  const today = new Date(2026, 10, 11);
  const keys: MonthKey[] = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const base = keys.flatMap(k => [
    e(k, 'Gehalt', 3000, { categoryId: 'income', repeat: 'monthly' }),
    e(k, 'Miete', 1000, { repeat: 'monthly' }),
  ]);

  it('projects a quarterly bill every three months from its newest entry', () => {
    const data = book([...base, e('2026-10', 'Rundfunkbeitrag', 55.08, Q)], keys);
    const ahead = outlook(buildBook(data), today)!;
    const due = ahead.months.filter(m => m.big.some(b => b.name === 'Rundfunkbeitrag')).map(m => m.key);
    expect(due).toEqual(['2027-01', '2027-04', '2027-07', '2027-10']);
    expect(latestPeriodic(data.entries).map(x => x.name)).toEqual(['Rundfunkbeitrag']);
  });

  it('stops counting a monthly bill after its last month', () => {
    const data = book([...base, ...keys.map(k => e(k, 'Sofa-Rate', 50, { repeat: 'monthly', until: '2027-01' }))], keys);
    const ahead = outlook(buildBook(data), today)!;
    const fixed = (k: MonthKey) => ahead.months.find(m => m.key === k)!.fixed;
    expect(fixed('2027-01')).toBe(195000);
    expect(fixed('2027-02')).toBe(200000);
  });
});
