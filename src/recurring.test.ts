import { describe, expect, it } from 'vitest';
import { Entry } from './types';
import { activeSeries, stopSeries } from './recurring';

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

describe('removing a recurring entry', () => {
  it('drops its open entries from the running month on and ends it on what stays', () => {
    const entries = [
      e('Gym', '2026-09', true), e('Gym', '2026-10', false), e('Gym', '2026-11', false), e('Gym', '2026-12', false),
      e('Miete', '2026-11', false),
    ];
    const { remove, end } = stopSeries(entries, 'Gym', '2026-11');
    expect(remove.map(id => entries.find(x => x.id === id)!.month)).toEqual(['2026-11', '2026-12']);
    expect(end).toEqual({ id: entries[1].id, until: '2026-10' });
  });
  it('keeps a paid entry of the running month and ends the series there', () => {
    const entries = [e('Abo', '2026-10', true), e('Abo', '2026-11', true)];
    const out = stopSeries(entries, 'Abo', '2026-11');
    expect(out).toEqual({ remove: [], end: { id: entries[1].id, until: '2026-11' } });
    const ended = entries.map(x => (x.id === out.end!.id ? { ...x, until: out.end!.until } : x));
    expect(activeSeries(ended)).toEqual([]);
  });
  it('removes a series that only ever had an open entry this month', () => {
    const entries = [e('Neu', '2026-11', false, { repeat: 'yearly', every: 2 })];
    expect(stopSeries(entries, 'Neu', '2026-11')).toEqual({ remove: [entries[0].id], end: null });
  });
});

describe('the order of the list', () => {
  it('goes from monthly to yearly', () => {
    const list = activeSeries([
      e('Jahr', '2026-01', true, { repeat: 'yearly' }),
      e('Halb', '2026-06', true, { repeat: 'yearly', every: 6 }),
      e('Zwei', '2026-10', true, { repeat: 'yearly', every: 2 }),
      e('Quartal', '2026-09', true, { repeat: 'yearly', every: 3 }),
      e('Monat', '2026-11', true),
    ]);
    expect(list.map(s => s.every)).toEqual([1, 2, 3, 6, 12]);
  });
});
