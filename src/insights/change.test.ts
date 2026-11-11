import { describe, expect, it } from 'vitest';
import { MonthPoint, periodChange } from './series';
import { Outlook, outlookLowest } from './outlook';

const point = (key: string, income: number, spending: number): MonthPoint => ({
  key, income, expense: spending, spending, invested: 0, saved: income - spending, kept: income - spending,
  rate: income > 0 ? (income - spending) / income : null, end: 0,
});

describe('a period against the months before', () => {
  const all = [
    point('2026-01', 300000, 200000), point('2026-02', 300000, 200000), point('2026-03', 300000, 200000),
    point('2026-04', 330000, 180000), point('2026-05', 330000, 180000), point('2026-06', 330000, 180000),
  ];
  it('compares the averages with as many finished months just before', () => {
    const c = periodChange(all, all.slice(3))!;
    expect(c.before).toEqual(['2026-01', '2026-02', '2026-03']);
    // Income 3.000 → 3.300, spending 2.000 → 1.800, saved 1.000 → 1.500.
    expect([c.income, c.spending, c.saved]).toEqual([10, -10, 50]);
  });
  it('says nothing with fewer months before than the period has', () => {
    expect(periodChange(all, all.slice(2))).toBeNull();
    expect(periodChange(all, [])).toBeNull();
  });
  it('has no percentage without something to compare with', () => {
    const lean = [point('2026-01', 0, 100000), point('2026-02', 200000, 100000)];
    const c = periodChange(lean, lean.slice(1))!;
    // Nothing came in before, and the month before saved nothing.
    expect([c.income, c.spending, c.saved]).toEqual([null, 0, null]);
  });
});

describe('the outlook\'s lowest point', () => {
  const month = (key: string, mid: number) => ({ key, mid, lo: mid, hi: mid, fixed: 0, started: false, big: [] });
  const outlook = (start: number, mids: number[]): Outlook => ({
    from: { key: '2026-11', end: start }, months: mids.map((m, i) => month(`2027-0${i + 1}`, m)),
    everyday: { mid: 0, lo: 0, hi: 0 }, basis: [], ranged: false, grundbedarf: 0, headline: { kind: 'normal', month: '2027-03', amount: 0 },
  });
  it('is the month the line dips to, the first of equals', () => {
    expect(outlookLowest(outlook(5000, [4000, 1000, 1000, 6000]))).toEqual({ key: '2027-02', amount: 1000 });
  });
  it('is where the line starts when it only rises', () => {
    expect(outlookLowest(outlook(5000, [6000, 7000]))).toEqual({ key: '2026-11', amount: 5000 });
  });
});
