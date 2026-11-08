import { describe, expect, it } from 'vitest';
import { tagTotals, tagsInUse } from './tags';
import { defaultCategories } from '../data/defaults';
import { Entry } from '../types';

const cats = defaultCategories();
let n = 0;
const e = (month: string, categoryId: string, amount: number, tags?: string[]): Entry => ({
  id: `t${++n}`, month, categoryId, name: 'x', amount, paid: true, repeat: 'none', seriesId: `s${n}`, createdAt: 0, ...(tags ? { tags } : {}),
});

describe('tagTotals (plan 26)', () => {
  it('sums spending per tag over the months, largest first', () => {
    const entries = [
      e('2026-01', 'groceries', 2000, ['urlaub']),
      e('2026-01', 'leisure', 5000, ['urlaub', 'italien']),
      e('2026-02', 'groceries', 1000, ['italien']),
      e('2026-01', 'income', 300000, ['urlaub']), // income is left out
    ];
    const totals = tagTotals(entries, cats, ['2026-01', '2026-02']);
    expect(totals).toEqual([
      { tag: 'urlaub', amount: 7000, count: 2 },
      { tag: 'italien', amount: 6000, count: 2 },
    ]);
  });

  it('only counts the months in range', () => {
    const entries = [e('2026-01', 'groceries', 2000, ['x']), e('2026-02', 'groceries', 3000, ['x'])];
    expect(tagTotals(entries, cats, ['2026-02'])).toEqual([{ tag: 'x', amount: 3000, count: 1 }]);
  });

  it('tagsInUse ranks by frequency', () => {
    const entries = [e('2026-01', 'groceries', 1, ['a']), e('2026-01', 'groceries', 1, ['a', 'b'])];
    expect(tagsInUse(entries)).toEqual(['a', 'b']);
  });
});
