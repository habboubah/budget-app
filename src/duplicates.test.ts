import { describe, expect, it } from 'vitest';
import { duplicateTwins, sameAmount } from './duplicates';
import { Entry } from './types';

let n = 0;
/** e('2026-11', 'groceries', 'Rewe', 2340, { date: '2026-11-03' }) */
function e(month: string, categoryId: string, name: string, amount: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `e${n}`, month, categoryId, name, amount, paid: true, repeat: 'none', seriesId: `s${n}`, createdAt: n, ...extra };
}
const income = new Set(['income']);

describe('duplicateTwins', () => {
  it('flags both entries of a month with the same amount, each naming the other', () => {
    const a = e('2026-11', 'groceries', 'Rewe', 2340, { date: '2026-11-03' });
    const b = e('2026-11', 'restaurants', 'REWE Markt GmbH', 2340, { date: '2026-11-04' });
    const c = e('2026-11', 'groceries', 'Lidl', 1999);
    const twins = duplicateTwins([a, b, c], income);
    expect([...twins.keys()].sort()).toEqual([a.id, b.id].sort());
    expect(twins.get(a.id)).toBe(b);
    expect(twins.get(b.id)).toBe(a);
  });

  it('keeps months, directions, transfers, refunds and empty amounts apart', () => {
    const twins = duplicateTwins([
      e('2026-10', 'groceries', 'Rewe', 2340),
      e('2026-11', 'groceries', 'Rewe', 2340),
      e('2026-11', 'income', 'Erstattung', 5000),
      e('2026-11', 'extra', 'Geschenk', 5000),
      e('2026-11', 'groceries', 'Rückgabe', -1200, { refund: true }),
      e('2026-11', 'groceries', 'Einkauf', 1200),
      e('2026-11', 'transfer', 'Ans Sparkonto', 10000, { transfer: { pairId: 'p', direction: 'out' } }),
      e('2026-11', 'transfer', 'Vom Girokonto', 10000, { transfer: { pairId: 'p', direction: 'in' } }),
      e('2026-11', 'extra', 'Platzhalter', 0),
      e('2026-11', 'extra', 'Platzhalter', 0),
    ], income);
    expect(twins.size).toBe(0);
  });

  it('does not count the parts of one split payment against each other', () => {
    const a = e('2026-11', 'groceries', 'Teil 1', 1500, { splitId: 'x' });
    const b = e('2026-11', 'extra', 'Teil 2', 1500, { splitId: 'x' });
    expect(duplicateTwins([a, b], income).size).toBe(0);
    const c = e('2026-11', 'extra', 'Kino', 1500);
    const twins = duplicateTwins([a, b, c], income);
    expect(twins.get(a.id)).toBe(c);
    expect(twins.get(c.id)).toBe(a);
  });

  it('lets "Ist richtig" take the warning off: one of two clears both, one of three leaves two', () => {
    const a = e('2026-11', 'groceries', 'Kaffee', 250, { date: '2026-11-01' });
    const b = e('2026-11', 'groceries', 'Kaffee', 250, { date: '2026-11-02', distinct: true });
    expect(duplicateTwins([a, b], income).size).toBe(0);
    const c = e('2026-11', 'groceries', 'Kaffee', 250, { date: '2026-11-03' });
    const twins = duplicateTwins([a, b, c], income);
    expect([...twins.keys()].sort()).toEqual([a.id, c.id].sort());
    expect(twins.get(c.id)).toBe(a);
  });

  it('names the earliest other entry, an undated one after the dated', () => {
    const late = e('2026-11', 'extra', 'Spät', 999, { date: '2026-11-20' });
    const none = e('2026-11', 'extra', 'Ohne Datum', 999);
    const early = e('2026-11', 'extra', 'Früh', 999, { date: '2026-11-02' });
    const twins = duplicateTwins([late, none, early], income);
    expect(twins.get(late.id)).toBe(early);
    expect(twins.get(none.id)).toBe(early);
    expect(twins.get(early.id)).toBe(late);
  });
});

describe('sameAmount', () => {
  const a = e('2026-11', 'groceries', 'Rewe', 2340, { date: '2026-11-09' });
  const b = e('2026-11', 'groceries', 'Rewe', 2340, { date: '2026-11-03', distinct: true });
  const other = e('2026-12', 'groceries', 'Rewe', 2340);
  const pay = e('2026-11', 'income', 'Rückzahlung', 2340);
  const all = [a, b, other, pay];

  it('finds the month’s entries with the amount in that direction, earliest first — marked ones too', () => {
    expect(sameAmount(all, { month: '2026-11', amount: 2340, income: false }, income)).toEqual([b, a]);
    expect(sameAmount(all, { month: '2026-11', amount: 2340, income: true }, income)).toEqual([pay]);
    expect(sameAmount(all, { month: '2026-11', amount: 2341, income: false }, income)).toEqual([]);
  });

  it('leaves out the entry being edited, and an empty amount finds nothing', () => {
    expect(sameAmount(all, { month: '2026-11', amount: 2340, income: false, except: b.id }, income)).toEqual([a]);
    expect(sameAmount([e('2026-11', 'extra', 'x', 0)], { month: '2026-11', amount: 0, income: false }, income)).toEqual([]);
  });
});
