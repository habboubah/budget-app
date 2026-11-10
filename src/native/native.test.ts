import { describe, expect, it } from 'vitest';
import { buildAmounts, buildSnapshot, SnapshotPrefs } from './snapshot';
import { INBOX_MAX, inboxReview, inboxToEntries } from './inbox';
import { parseDeepLink } from './deepLink';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const today = new Date(2026, 10, 9, 12, 0, 0); // 9 Nov 2026
let n = 0;
const entry = (name: string, categoryId: string, amount: number, paid: boolean, extra: Partial<Entry> = {}): Entry => {
  n++;
  return { id: `e${n}`, month: '2026-11', categoryId, name, amount, paid, repeat: 'none', seriesId: `s${n}`, createdAt: n, ...extra };
};
const book = (entries: Entry[] = [], extra: Partial<AppData> = {}): AppData => ({
  categories: defaultCategories(),
  entries,
  months: [{ key: '2026-11', startedAt: 1, opening: 200000 }],
  ...extra,
});
const prefs: SnapshotPrefs = { language: 'de', locale: 'de-DE', accent: 'petrol', locked: false, showAmounts: false };
const inbox = (items: Record<string, unknown>[]) => items.map((item, i) => ({ id: String(item.id ?? `i${i}`), item }));
let ids = 0;
const newId = () => `new${++ids}`;

describe('the snapshot (plan 14)', () => {
  const data = book([
    entry('Gehalt', 'income', 320000, true, { date: '2026-11-01' }),
    entry('Miete', 'fixed', 105000, false, { date: '2026-11-03' }),
    entry('Strom', 'fixed', 8500, false, { date: '2026-11-15' }),
    entry('Handy', 'fixed', 2500, true, { date: '2026-11-05' }),
    entry('Kfz-Steuer', 'car', 18000, false, { date: '2026-11-20' }),
    entry('Kita', 'children', 20000, false, { date: '2026-11-28' }),
    entry('Kindergeld', 'income', 25500, false, { date: '2026-11-25' }),
  ], { favorites: [{ id: 'f1', name: 'Bäcker', categoryId: 'restaurants', amount: 450 }, { id: 'f2', name: 'Tanken', categoryId: 'car' }] });

  it('with amounts hidden, has no amount anywhere — only counts, names and dates', () => {
    const s = buildSnapshot(data, prefs, today);
    expect(s.amountsHidden).toBe(true);
    const keys: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
    };
    walk(s);
    for (const money of ['amount', 'balance', 'now', 'end', 'perDay']) expect(keys).not.toContain(money);
    expect(JSON.stringify(s)).not.toMatch(/105000|8500|320000|450\b/);
    expect(s.paid).toEqual({ paid: 1, total: 5 });
    expect(s.favorites.map(f => [f.name, f.hasAmount])).toEqual([['Bäcker', true], ['Tanken', false]]);
  });

  it('carries the next three open bills — overdue first, no income — and every category by its name', () => {
    const s = buildSnapshot(data, prefs, today);
    expect(s.bills.map(b => [b.name, b.overdue])).toEqual([['Miete', true], ['Strom', false], ['Kfz-Steuer', false]]);
    expect(s.categories.find(c => c.id === 'fixed')).toMatchObject({ name: 'Wohnen', kind: 'expense' });
    expect(buildSnapshot(data, { ...prefs, language: 'en' }, today).categories.find(c => c.id === 'fixed')?.name).toBe('Home');
    expect(s).toMatchObject({ v: 1, month: '2026-11', currency: 'EUR', locale: 'de-DE', locked: false });
  });

  it('with amounts shown, has the balances and each amount', () => {
    const s = buildSnapshot(data, { ...prefs, showAmounts: true }, today);
    expect(s.amountsHidden).toBe(false);
    expect(s.balance).toMatchObject({ now: 200000 + 320000 - 2500, end: 200000 + 320000 + 25500 - 105000 - 8500 - 2500 - 18000 - 20000 });
    expect(s.bills[0].amount).toBe(105000);
    expect(s.favorites[0].amount).toBe(450);
  });
  it('what Siri may say (plan 18): the two balances and the open bills with their amounts, nothing else of the book', () => {
    const a = buildAmounts(data, { language: 'de', locale: 'de-DE', accent: 'petrol' }, today);
    expect(a).toMatchObject({ v: 1, month: '2026-11', locale: 'de-DE', currency: 'EUR', now: 517500, end: 391500, open: 4 });
    expect(a.bills.map(b => [b.name, b.amount, b.overdue])).toEqual([['Miete', 105000, true], ['Strom', 8500, false], ['Kfz-Steuer', 18000, false]]);
    expect(Object.keys(a).sort()).toEqual(['bills', 'currency', 'end', 'locale', 'month', 'now', 'open', 'until', 'v', 'writtenAt']);
  });
});

describe('the inbox (plan 14)', () => {
  it('books an item as a paid entry, with the user’s own name and category for a payee they know', () => {
    const data = book([entry('Aral Tankstelle', 'car', 6000, true, { date: '2026-11-02' })]);
    const r = inboxToEntries(inbox([{ id: 'a1', source: 'wallet', createdAt: today.getTime(), amount: 5240, name: 'Aral Tankstelle', date: '2026-11-08' }]), data, { today, newId });
    expect(r.add).toHaveLength(1);
    expect(r.add[0]).toMatchObject({ name: 'Aral Tankstelle', categoryId: 'car', amount: 5240, paid: true, date: '2026-11-08', month: '2026-11', ref: 'inbox:a1' });
    expect(r.done).toEqual(['a1']);
  });

  it('skips duplicates: the same id twice, and an item already booked before (its ref)', () => {
    const item = { id: 'dup', source: 'siri', createdAt: today.getTime(), amount: 1200, name: 'Tanken', categoryId: 'car' };
    const once = inboxToEntries(inbox([item, item]), book(), { today, newId });
    expect(once.add).toHaveLength(1);
    const again = inboxToEntries(inbox([item]), book(once.add), { today, newId });
    expect(again.add).toHaveLength(0);
    expect(again.done).toEqual(['dup']); // it still leaves the inbox
  });

  it('a category chosen by voice wins; an open entry with the same amount and name is ticked off instead of doubled', () => {
    const open = entry('Strom', 'fixed', 8500, false, { date: '2026-11-15' });
    const r = inboxToEntries(inbox([
      { id: 's1', source: 'siri', createdAt: 1, amount: 8500, name: 'Strom' },
      { id: 's2', source: 'siri', createdAt: 2, amount: 1250, name: 'Pizza', categoryId: 'restaurants' },
    ]), book([open]), { today, newId });
    expect(r.pay).toEqual([open.id]);
    expect(r.add.map(e => [e.name, e.categoryId])).toEqual([['Pizza', 'restaurants']]);
  });

  it('a favourite from a widget brings its name, category and amount; one without an amount goes unbooked', () => {
    const data = book([], { favorites: [{ id: 'f1', name: 'Bäcker', categoryId: 'restaurants', amount: 450 }, { id: 'f2', name: 'Tanken', categoryId: 'car' }] });
    const r = inboxToEntries(inbox([
      { id: 'w1', source: 'widget', createdAt: 1, favoriteId: 'f1' },
      { id: 'w2', source: 'widget', createdAt: 2, favoriteId: 'f2' },
      { id: 'w3', source: 'widget', createdAt: 3, favoriteId: 'gone' },
    ]), data, { today, newId });
    expect(r.add.map(e => [e.name, e.categoryId, e.amount])).toEqual([['Bäcker', 'restaurants', 450]]);
    expect(r.done.sort()).toEqual(['w1', 'w2', 'w3']);
  });

  it('checks every field: bad items go without being booked, a text without a payment goes too, "not paid" stays open', () => {
    const r = inboxToEntries([
      { id: 'b1', item: { source: 'hacker', amount: 100, name: 'x' } },
      { id: 'b2', item: { source: 'siri', amount: -5, name: 'Minus' } },
      { id: 'b3', item: { source: 'siri', amount: 1.5, name: 'Bruch' } },
      { id: 'b4', item: { source: 'siri', amount: 1e15, name: 'Riesig' } },
      { id: 'b5', item: 'not an object' },
      { id: '../../etc', item: { source: 'siri', amount: 100 } },
      { id: 'n1', item: { source: 'notification', createdAt: 1, text: 'Ihre TAN lautet 123456' } },
      { id: 'o1', item: { source: 'siri', createdAt: 2, amount: 3000, name: 'Arzt', paid: false, date: 'gestern', categoryId: '<script>' } },
    ], book(), { today, newId });
    expect(r.add).toHaveLength(1);
    expect(r.add[0]).toMatchObject({ name: 'Arzt', amount: 3000, paid: false, date: '2026-11-09' }); // no date, no plausible time: today
    expect(r.add[0].paidAt).toBeUndefined();
    expect(r.done.sort()).toEqual(['b1', 'b2', 'b3', 'b4', 'b5', 'n1', 'o1']); // the bad path is never touched
  });

  it(`books at most ${INBOX_MAX} at a time; the rest wait`, () => {
    const many = Array.from({ length: INBOX_MAX + 5 }, (_, i) => ({ id: `m${i}`, source: 'siri', createdAt: i + 1, amount: 100, name: `Posten ${i}` }));
    const r = inboxToEntries(inbox(many), book(), { today, newId });
    expect(r.add).toHaveLength(INBOX_MAX);
    expect(r.done).toHaveLength(INBOX_MAX);
  });

  it('a banking push becomes an entry: the amount, the user’s name for the payee, paid (plan 19)', () => {
    const r = inboxToEntries(inbox([
      { id: 'n1', source: 'notification', createdAt: today.getTime(), text: 'Sparkasse\nKartenzahlung 52,40 € bei ARAL TANKSTELLE' },
      { id: 'n2', source: 'notification', createdAt: today.getTime(), text: 'Bank\nIhre TAN lautet 123456' },
      { id: 'n3', source: 'notification', createdAt: today.getTime(), text: 'Wallet Karte\nBäckerei Muster\n3,80 €' },
    ]), book(), { today, newId });
    expect(r.add.map(e => [e.name, e.amount, e.paid, e.ref])).toEqual([['Aral Tankstelle', 5240, true, 'inbox:n1'], ['Bäckerei Muster', 380, true, 'inbox:n3']]);
    expect(r.done.sort()).toEqual(['n1', 'n2', 'n3']);
    expect(JSON.stringify(r.add)).not.toContain('Kartenzahlung');
  });

  it('an Apple Pay payment: the amount however Shortcuts writes it, the merchant as the name (plan 19)', () => {
    const pay = (id: string, text: string) => ({ id, source: 'wallet', createdAt: today.getTime(), name: 'Aral Tankstelle', card: 'Girocard', text });
    const r = inboxToEntries(inbox([pay('w1', '52,40 €'), pay('w2', '€7.50'), pay('w3', '12.4'), pay('w4', 'US$1,234.56'), pay('w5', 'abc')]), book(), { today, newId });
    expect(r.add.map(e => e.amount)).toEqual([5240, 750, 1240, 123456]);
    expect(r.add.every(e => e.name === 'Aral Tankstelle' && e.paid)).toBe(true);
    expect(r.done).toContain('w5');
  });

  it('Erst prüfen: captured payments wait in the inbox, Siri’s are booked; the review takes the rest', () => {
    const items = inbox([
      { id: 's1', source: 'siri', createdAt: today.getTime(), amount: 450, name: 'Kaffee' },
      { id: 'w1', source: 'wallet', createdAt: today.getTime(), amount: 5240, name: 'Aral Tankstelle' },
      { id: 'n1', source: 'notification', createdAt: today.getTime(), text: 'Bank\nGutschrift: 20,00 EUR von Kim Beispiel' },
      { id: 'n2', source: 'notification', createdAt: today.getTime(), text: 'Bank\nNeues Angebot' },
    ]);
    const r = inboxToEntries(items, book(), { today, newId, hold: true });
    expect(r.add.map(e => e.name)).toEqual(['Kaffee']);
    expect(r.done).toEqual(['s1']);
    expect(r.held).toBe(3);
    const review = inboxReview(items, book(), { today });
    expect(review.rows.map(x => [x.name, x.found.amount, x.found.income])).toEqual([['Aral Tankstelle', 5240, false], ['Kim Beispiel', 2000, true]]);
    expect(review.ids.sort()).toEqual(['n1', 'n2', 'w1']);
  });
});

describe('deep links (plan 14)', () => {
  it('reads the three kinds', () => {
    expect(parseDeepLink('spartopf://add?category=car&amount=12.50&name=Tanken')).toEqual({ kind: 'add', categoryId: 'car', amount: 1250, name: 'Tanken' });
    expect(parseDeepLink('spartopf://add?amount=12,50')).toEqual({ kind: 'add', amount: 1250 });
    expect(parseDeepLink('spartopf://add')).toEqual({ kind: 'add' });
    expect(parseDeepLink('spartopf://month/2026-11')).toEqual({ kind: 'month', month: '2026-11' });
    expect(parseDeepLink('spartopf://entry/abc-123_x')).toEqual({ kind: 'entry', id: 'abc-123_x' });
    expect(parseDeepLink('spartopf://add?name=B%C3%A4cker%20M%C3%BCller')).toEqual({ kind: 'add', name: 'Bäcker Müller' });
  });

  it('ignores what it doesn’t know, and drops a bad part instead of trusting it', () => {
    expect(parseDeepLink('spartopf://add?amount=12&utm_source=x&evil=1')).toEqual({ kind: 'add', amount: 1200 });
    expect(parseDeepLink('spartopf://add?amount=-5&category=../x&name=%00%01')).toEqual({ kind: 'add' });
    expect(parseDeepLink('spartopf://add?amount=99999999999')).toEqual({ kind: 'add' });
    expect(parseDeepLink(`spartopf://add?name=${'x'.repeat(500)}`)).toEqual({ kind: 'add', name: 'x'.repeat(80) });
  });

  it('is no link at all for anything else', () => {
    for (const bad of [
      'https://spartopf.app/add', 'javascript:alert(1)', 'spartopf://delete', 'spartopf://month/2026-13', 'spartopf://month/2026-11/x',
      'spartopf://entry/', 'spartopf://entry/a%2Fb', 'spartopf://add/extra', 'not a url', '', 'spartopf:' + 'x'.repeat(3000),
    ]) expect(parseDeepLink(bad), bad).toBeNull();
  });
});
