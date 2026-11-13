import { describe, expect, it } from 'vitest';
import { Entry } from './types';
import { activeSeries } from './recurring';

let n = 0;
const e = (seriesId: string, month: string, paid: boolean, extra: Partial<Entry> = {}): Entry =>
  ({ id: `e${++n}`, seriesId, month, categoryId: 'fixed', name: seriesId, amount: 1000, paid, repeat: 'monthly', createdAt: n, ...extra });

describe('the recurring entries still running', () => {
  it('takes one per series, with where it last happened and when it comes next', () => {
    const list = activeSeries([
      e('Miete', '2026-10', true), e('Miete', '2026-11', false),
      e('Kfz-Steuer', '2026-03', true, { repeat: 'yearly' }),
      e('Wasser', '2026-08', true, { repeat: 'yearly', every: 3 }),
      e('Einmal', '2026-11', true, { repeat: 'none' }),
    ]);
    expect(list.map(s => [s.seriesId, s.last.month, s.next, s.every])).toEqual([
      ['Miete', '2026-10', '2026-11', 1],
      ['Wasser', '2026-08', '2026-11', 3],
      ['Kfz-Steuer', '2026-03', '2027-03', 12],
    ]);
  });
  it('leaves out a series that has ended, and one switched to once', () => {
    expect(activeSeries([
      e('Kredit', '2026-09', true, { until: '2026-09' }),
      e('Abo', '2026-09', true), e('Abo', '2026-10', true, { repeat: 'none' }),
      e('Transfer', '2026-11', true, { transfer: { pairId: 'p' } as unknown as Entry['transfer'] }),
    ])).toEqual([]);
  });
  it('points at the newest entry when none is paid yet', () => {
    const [s] = activeSeries([e('Neu', '2026-11', false)]);
    expect([s.last.month, s.next]).toEqual(['2026-11', '2026-11']);
  });
});
