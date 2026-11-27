import { describe, expect, it } from 'vitest';
import { lastEntryUpdate, updatedLabel } from './lastUpdate';
import { Entry } from './types';

const at = (iso: string, h = 12) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`).getTime();

const entry = (id: string, over: Partial<Entry> = {}): Entry => ({
  id, month: '2026-11', categoryId: 'food', name: id, amount: 1000, paid: false,
  repeat: 'none', seriesId: id, createdAt: at('2026-11-01'), ...over,
});

describe('lastEntryUpdate', () => {
  it('is the stored time once the book keeps one', () => {
    expect(lastEntryUpdate({ entries: [entry('a')], lastEdit: at('2026-11-20') })).toBe(at('2026-11-20'));
  });

  it('is the day the entry was made, not the date it is for', () => {
    const e = entry('a', { date: '2026-11-03', createdAt: at('2026-11-25') });
    expect(lastEntryUpdate({ entries: [e] })).toBe(at('2026-11-25'));
  });

  it('counts ticking an entry off as paid', () => {
    const e = entry('a', { createdAt: at('2026-11-02'), paid: true, paidAt: at('2026-11-18') });
    expect(lastEntryUpdate({ entries: [e] })).toBe(at('2026-11-18'));
  });

  it('leaves out what the app carried into a new month, and the test data', () => {
    const rent = entry('rent', { repeat: 'monthly', createdAt: at('2026-10-01') });
    const copy = entry('rent-copy', { repeat: 'monthly', seriesId: 'rent', createdAt: at('2026-11-27') });
    const demo = entry('demo-2026-11-1', { createdAt: at('2026-11-26') });
    expect(lastEntryUpdate({ entries: [rent, copy, demo] })).toBe(at('2026-10-01'));
  });

  it('counts the parts of a split', () => {
    const part = entry('p', { seriesId: 'other', splitId: 's', createdAt: at('2026-11-21') });
    expect(lastEntryUpdate({ entries: [part] })).toBe(at('2026-11-21'));
  });

  it('is nothing for an empty book', () => {
    expect(lastEntryUpdate({ entries: [] })).toBeUndefined();
  });
});

describe('updatedLabel', () => {
  const now = new Date(at('2026-11-27', 13));

  it('says today and yesterday in the language', () => {
    expect(updatedLabel(at('2026-11-27', 8), 'de-DE', now)).toBe('heute');
    expect(updatedLabel(at('2026-11-26', 23), 'de-DE', now)).toBe('gestern');
    expect(updatedLabel(at('2026-11-26'), 'en-GB', now)).toBe('yesterday');
  });

  it('gives an earlier day as a date, with the year once it is another year', () => {
    expect(updatedLabel(at('2026-11-20'), 'en-GB', now)).toBe('20 Nov');
    expect(updatedLabel(at('2025-12-30'), 'en-GB', now)).toBe('30 Dec 2025');
  });

  it('never says tomorrow', () => {
    expect(updatedLabel(at('2026-11-28'), 'de-DE', now)).toBe('heute');
  });
});
