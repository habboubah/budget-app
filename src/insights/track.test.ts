import { describe, expect, it } from 'vitest';
import { monthTrack } from './track';
import { defaultCategories } from '../data/defaults';
import { ALL_ACCOUNTS, MAIN_ACCOUNT, balanceFor, computeBalances } from '../logic';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, day: number | null, extra: Partial<Entry> = {}): Entry {
  n++;
  return {
    id: `t${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `t${n}`, createdAt: 0,
    ...(day ? { date: `${month}-${String(day).padStart(2, '0')}` } : {}), ...extra,
  };
}
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10);
const book = (entries: Entry[], months: { key: string; opening?: number }[], extra: Partial<AppData> = {}): AppData =>
  ({ categories: cats, entries, months: months.map(m => ({ ...m, startedAt: 0 })), ...extra });
const track = (data: AppData, month: string, today: Date, account = MAIN_ACCOUNT) =>
  monthTrack(data, balanceFor(computeBalances(data, account), month), account, today);

describe('a month day by day', () => {
  const entries = [
    e('2026-11', 'fixed', 'Miete', 1000, 1),
    e('2026-11', 'groceries', 'Lidl', 50, 5),
    e('2026-11', 'fixed', 'Strom', 80, 15, { paid: false }),
    e('2026-11', 'income', 'Gehalt', 3000, 28, { paid: false }),
    e('2026-11', 'extra', 'Geschenk', 30, null, { paid: false }),
  ];
  const data = book(entries, [{ key: '2026-11', opening: 200000 }]);
  const t = track(data, '2026-11', at(2026, 11, 11))!;

  it('starts at the opening and has a value for the end of every day', () => {
    expect(t.values).toHaveLength(31);
    expect(t.values[0]).toBe(200000);
    expect(t.today).toBe(11);
  });
  it('stands at "now" today and at "end" on the last day', () => {
    const b = balanceFor(computeBalances(data), '2026-11');
    expect(t.values[11]).toBe(b.now);
    expect(t.values[30]).toBe(b.end);
  });
  it('books paid entries on their day and open ones on theirs, an undated one at the end', () => {
    expect([t.values[1], t.values[4], t.values[5]]).toEqual([100000, 100000, 95000]);
    expect([t.values[14], t.values[15], t.values[27], t.values[28]]).toEqual([95000, 87000, 87000, 387000]);
    expect(t.values[29] - t.values[30]).toBe(3000);
  });
  it('keeps what is overdue, and what earlier months left open, just ahead of today', () => {
    const late = book([...entries, e('2026-10', 'car', 'Werkstatt', 200, 20, { paid: false }), e('2026-11', 'extra', 'Arzt', 60, 3, { paid: false })],
      [{ key: '2026-10', opening: 0 }, { key: '2026-11', opening: 200000 }]);
    const x = track(late, '2026-11', at(2026, 11, 11))!;
    const b = balanceFor(computeBalances(late), '2026-11');
    expect(x.values[11]).toBe(b.now);
    expect(x.values[11] - x.values[12]).toBe(20000 + 6000);
    expect(x.values[30]).toBe(b.end);
  });
  it('never books a bill ticked early after today', () => {
    const early = book([e('2026-11', 'fixed', 'Miete', 1000, 25)], [{ key: '2026-11', opening: 200000 }]);
    const x = track(early, '2026-11', at(2026, 11, 11))!;
    expect([x.values[10], x.values[11]]).toEqual([200000, 100000]);
  });
  it('is all behind us in a finished month and all ahead in one started early', () => {
    expect(track(data, '2026-11', at(2026, 12, 3))!.today).toBe(30);
    const ahead = track(data, '2026-11', at(2026, 10, 20))!;
    expect(ahead.today).toBe(0);
    expect(ahead.values[1]).toBe(100000);
    expect(ahead.values[30]).toBe(balanceFor(computeBalances(data), '2026-11').end);
  });
  it('says nothing for a month not started, or one in which nothing moves', () => {
    expect(track(data, '2026-12', at(2026, 11, 11))).toBeNull();
    expect(track(book([], [{ key: '2026-11', opening: 5000 }]), '2026-11', at(2026, 11, 11))).toBeNull();
  });
});

describe('with several accounts', () => {
  const accounts = [
    { id: MAIN_ACCOUNT, name: '', kind: 'bank' as const, emoji: '🏦', hue: 'blue' as const, createdAt: 0 },
    { id: 'cash', name: 'Bar', kind: 'cash' as const, emoji: '💶', hue: 'leaf' as const, createdAt: 1 },
  ];
  const pair = (direction: 'out' | 'in', accountId?: string) =>
    e('2026-11', 'transfer', 'Abheben', 200, 4, { transfer: { pairId: 'p1', direction }, ...(accountId ? { accountId } : {}) });
  const data = book(
    [e('2026-11', 'groceries', 'Lidl', 50, 5), e('2026-11', 'groceries', 'Markt', 20, 6, { accountId: 'cash' }), pair('out'), pair('in', 'cash')],
    [{ key: '2026-11', opening: 100000 }], { accounts } as Partial<AppData>,
  );
  it('moves each account by its side of a transfer, and all of them together by nothing', () => {
    const main = track(data, '2026-11', at(2026, 11, 11))!;
    expect([main.values[3], main.values[4], main.values[5]]).toEqual([100000, 80000, 75000]);
    const cash = track(data, '2026-11', at(2026, 11, 11), 'cash')!;
    expect([cash.values[4], cash.values[6]]).toEqual([20000, 18000]);
    const all = track(data, '2026-11', at(2026, 11, 11), ALL_ACCOUNTS)!;
    expect([all.values[4], all.values[6]]).toEqual([100000, 93000]);
    for (const [x, account] of [[main, MAIN_ACCOUNT], [cash, 'cash'], [all, ALL_ACCOUNTS]] as const) {
      const b = balanceFor(computeBalances(data, account), '2026-11');
      expect([x.values[11], x.values[30]]).toEqual([b.now, b.end]);
    }
  });
});
