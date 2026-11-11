import { describe, expect, it } from 'vitest';
import { AppData, Entry } from './types';
import { defaultCategories } from './data/defaults';
import { closeTip, knowGuide, nextTip, readTipState, TipContext, TipState } from './tips';

const today = new Date(2026, 10, 20, 12);
const none: TipState = { done: [] };
const web: TipContext = { today, native: false, daysSinceExport: null, inDeviceBackup: null };
const phone: TipContext = { today, native: true, capture: true, daysSinceExport: 3, inDeviceBackup: true };
let n = 0;
const entry = (over: Partial<Entry>): Entry => ({
  id: `e${++n}`, month: '2026-11', categoryId: 'groceries', name: 'Markt', amount: 1000, paid: true, repeat: 'none', seriesId: `s${n}`,
  createdAt: new Date(2026, 10, 18).getTime(), date: '2026-11-18', ...over,
});
const book = (entries: Entry[], over: Partial<AppData> = {}): AppData =>
  ({ categories: defaultCategories(), months: [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', startedAt: 0 }], entries, ...over });

describe('tips (plan 37)', () => {
  it('an empty or a quiet book gets none', () => {
    expect(nextTip(book([]), none, phone)).toBeNull();
    expect(nextTip(book([entry({ name: 'Miete', categoryId: 'fixed', repeat: 'monthly' })]), none, phone)).toBeNull();
  });

  it('three payments typed in two weeks: automatic capture — on the iPhone, until something was captured', () => {
    const typed = [entry({ name: 'Rewe' }), entry({ name: 'Aral', categoryId: 'car' }), entry({ name: 'Kiosk' })];
    expect(nextTip(book(typed), none, phone)).toEqual({ id: 'capture' });
    expect(nextTip(book(typed), none, web)).toBeNull();
    expect(nextTip(book(typed), none, { ...phone, capture: false })).toBeNull(); // Android: no Shortcuts
    expect(nextTip(book([...typed, entry({ name: 'Lidl', ref: 'inbox:w1' })]), none, phone)).toBeNull();
    const old = typed.map(e => ({ ...e, date: '2026-10-01', month: '2026-10' }));
    expect(nextTip(book(old), none, phone)).toBeNull();
  });

  it('the same entry three times: a favourite, with the amount when it never changed', () => {
    const coffee = [entry({ name: 'Bäckerei', amount: 480 }), entry({ name: 'bäckerei ', amount: 480 }), entry({ name: 'Bäckerei', amount: 480, date: '2026-11-19' })];
    expect(nextTip(book(coffee), none, web)).toEqual({ id: 'favorite', name: 'Bäckerei', categoryId: 'groceries', amount: 480 });
    const fuel = [entry({ name: 'Tanken', categoryId: 'car', amount: 5000 }), entry({ name: 'Tanken', categoryId: 'car', amount: 6200 }), entry({ name: 'Tanken', categoryId: 'car', amount: 5500 })];
    expect(nextTip(book(fuel), none, web)).toEqual({ id: 'favorite', name: 'Tanken', categoryId: 'car' });
    expect(nextTip(book(coffee, { favorites: [{ id: 'f', name: 'Bäckerei', categoryId: 'groceries' }] }), none, web)).toBeNull();
  });

  it('the first yearly bill: the reserve', () => {
    expect(nextTip(book([entry({ name: 'Kfz-Steuer', categoryId: 'car', repeat: 'yearly' })]), none, web)).toEqual({ id: 'reserve' });
  });

  it('last month over a budget: the category that went over by most', () => {
    const categories = defaultCategories().map(c => (c.id === 'groceries' ? { ...c, limit: 30000 } : c.id === 'car' ? { ...c, limit: 10000 } : c));
    const data = book([
      entry({ month: '2026-10', date: '2026-10-05', amount: 32000, repeat: 'monthly' }),
      entry({ month: '2026-10', date: '2026-10-06', amount: 19000, categoryId: 'car', repeat: 'monthly' }),
    ], { categories });
    expect(nextTip(data, none, web)).toMatchObject({ id: 'budget', month: '2026-10', category: { id: 'car' } });
    expect(nextTip({ ...data, entries: data.entries.map(e => ({ ...e, amount: 100 })) }, none, web)).toBeNull();
  });

  it('a month without a copy while the iPhone backup is off: the backup', () => {
    const data = book([entry({ repeat: 'monthly', createdAt: new Date(2026, 8, 1).getTime() })]);
    const off: TipContext = { today, native: true, daysSinceExport: 45, inDeviceBackup: false };
    expect(nextTip(data, none, off)).toEqual({ id: 'backup' });
    expect(nextTip(data, none, { ...off, daysSinceExport: null })).toEqual({ id: 'backup' });
    expect(nextTip(data, none, { ...off, daysSinceExport: 10 })).toBeNull();
    expect(nextTip(data, none, { ...off, inDeviceBackup: true })).toBeNull();
    expect(nextTip(book([entry({ repeat: 'monthly' })]), none, off)).toBeNull(); // a young book
  });

  it('one at a time, the next not within a week, and a closed one never again', () => {
    const data = book([entry({ name: 'Rewe' }), entry({ name: 'Aral', categoryId: 'car' }), entry({ name: 'Kiosk' }), entry({ name: 'Steuer', categoryId: 'car', repeat: 'yearly' })]);
    expect(nextTip(data, none, phone)?.id).toBe('capture');
    const closed = closeTip(none, 'capture', today);
    expect(closed).toEqual({ done: ['capture'], last: '2026-11-20' });
    expect(nextTip(data, closed, phone)).toBeNull();
    expect(nextTip(data, closed, { ...phone, today: new Date(2026, 10, 26, 12) })).toBeNull();
    expect(nextTip(data, closed, { ...phone, today: new Date(2026, 10, 27, 12) })?.id).toBe('reserve');
    expect(closeTip(closed, 'capture', today).done).toEqual(['capture']);
  });

  it('the guide, once, before any other — for whoever hasn’t met it', () => {
    const typed = [entry({ name: 'Rewe' }), entry({ name: 'Aral', categoryId: 'car' }), entry({ name: 'Kiosk' })];
    const asked: TipContext = { ...phone, guide: true };
    // Even a quiet book: the guide is news to everyone who had the app before it.
    expect(nextTip(book([]), none, asked)).toEqual({ id: 'guide' });
    expect(nextTip(book(typed), none, asked)).toEqual({ id: 'guide' });
    // Not where the app doesn't offer it, and not within a week of another tip.
    expect(nextTip(book(typed), none, phone)).toEqual({ id: 'capture' });
    expect(nextTip(book(typed), { done: ['reserve'], last: '2026-11-18' }, asked)).toBeNull();
    // Met another way — Optionen, the tour, the gestures card: done, and no pause for the next tip.
    const known = knowGuide(none);
    expect(known).toEqual({ done: ['guide'] });
    expect(knowGuide(known)).toBe(known);
    expect(nextTip(book(typed), known, asked)).toEqual({ id: 'capture' });
    // Closed on its card: done, and a week's pause like any other.
    const closed = closeTip(none, 'guide', today);
    expect(nextTip(book(typed), closed, asked)).toBeNull();
    expect(nextTip(book(typed), closed, { ...asked, today: new Date(2026, 10, 28, 12) })).not.toEqual({ id: 'guide' });
  });

  it('reads its stored state defensively', () => {
    expect(readTipState(null)).toEqual({ done: [] });
    expect(readTipState({ done: ['budget', 'nonsense', 7], last: 'gestern' })).toEqual({ done: ['budget'] });
    expect(readTipState({ done: ['backup'], last: '2026-11-01' })).toEqual({ done: ['backup'], last: '2026-11-01' });
  });
});
