import { describe, expect, it } from 'vitest';
import { carryOver, normalizeState } from './logic';
import { taxYear, taxYears } from './insights';
import { defaultCategories } from './data/defaults';
import { AppData, Entry, TaxKind } from './types';

/* The tax list (schema 29): expenses the user marked, by kind and year. */
const cats = defaultCategories();
let n = 0;
function e(date: string, categoryId: string, name: string, euros: number, tax?: TaxKind, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `t${n}`, month: date.slice(0, 7), date, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `t${n}`, createdAt: n, ...(tax ? { tax } : {}), ...extra };
}
const data: AppData = { categories: cats, months: [], entries: [
  e('2026-03-10', 'fixed', 'Heizungswartung', 180, 'craftsman'),
  e('2026-09-02', 'fixed', 'Maler', 640, 'craftsman'),
  e('2026-01-05', 'children', 'Kita Januar', 250, 'childcare'),
  e('2026-02-05', 'children', 'Kita Februar', 250, 'childcare'),
  e('2026-02-20', 'children', 'Kita Erstattung', -40, 'childcare', { refund: true }),
  e('2026-12-01', 'extra', 'Spende', 50, 'donation'),
  e('2026-12-20', 'extra', 'Spende (zugesagt)', 100, 'donation', { paid: false }),
  e('2025-11-11', 'extra', 'Spende 2025', 30, 'donation'),
  e('2026-05-05', 'groceries', 'Einkauf', 80),
  e('2026-06-01', 'income', 'Gehalt', 3000, 'work'),
] };

describe('the year’s list', () => {
  it('groups what is marked and paid by kind, in the kinds’ order, each by date', () => {
    const y = taxYear(data, '2026');
    expect(y.groups.map(g => [g.kind, g.total, g.entries.map(x => x.name)])).toEqual([
      ['craftsman', 82000, ['Heizungswartung', 'Maler']],
      ['childcare', 46000, ['Kita Januar', 'Kita Februar', 'Kita Erstattung']],
      ['donation', 5000, ['Spende']],
    ]);
    expect(y).toMatchObject({ year: '2026', total: 133000, count: 6 });
  });

  it('leaves out what is still open, what isn’t marked, and income', () => {
    const names = taxYear(data, '2026').groups.flatMap(g => g.entries.map(x => x.name));
    expect(names).not.toContain('Spende (zugesagt)');
    expect(names).not.toContain('Einkauf');
    expect(names).not.toContain('Gehalt');
  });

  it('knows the years with something on them, newest first, and an empty year', () => {
    expect(taxYears(data)).toEqual(['2026', '2025']);
    expect(taxYear(data, '2024')).toEqual({ year: '2024', groups: [], total: 0, count: 0 });
  });

  it('goes by the day it was paid on, not the month it is filed in', () => {
    const payday: AppData = { ...data, entries: [{ ...e('2025-12-29', 'extra', 'Spende zum Jahresende', 20, 'donation'), month: '2026-01' }] };
    expect(taxYears(payday)).toEqual(['2025']);
  });
});

describe('the mark on an entry', () => {
  it('survives a reload when it is a kind the app knows, and follows a recurring entry', () => {
    const back = normalizeState({ categories: cats, months: [], entries: [
      e('2026-01-05', 'children', 'Kita', 250, 'childcare'),
      { ...e('2026-01-05', 'children', 'x', 1), tax: 'yacht' },
    ] });
    expect(back.entries.map(x => x.tax)).toEqual(['childcare', undefined]);
    expect(carryOver([e('2026-01-05', 'children', 'Kita', 250, 'childcare', { repeat: 'monthly' })], '2026-02', 1)[0].tax).toBe('childcare');
  });
});
