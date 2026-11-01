import { describe, expect, it } from 'vitest';
import {
  addMonths, amountToInput, averageByCategory, balanceFor, canRemoveFromMonth, carryCandidates, carryOver, categoryBreakdown,
  computeBalances, daysInMonth, formatMoney, history, isOverdue, makeBackup, monthKeyOf, monthLabel, monthsBetween,
  monthCategories, monthTotals, moveEntry, normalizeName, normalizeState, openBefore, parseAmount, parseBackup, previousStarted,
  restoreDefaultCategories, sortEntries, standardCategoryIds, suggestNames, toCsv, topNames,
} from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

const cats = defaultCategories();
let n = 0;
/** A terse entry factory: e('2026-11', 'fixed', 'Miete', 105000, true). */
function e(month: string, categoryId: string, name: string, amount: number, paid: boolean, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `e${n}`, month, categoryId, name, amount, paid, repeat: 'none', seriesId: `s${n}`, createdAt: n, ...extra };
}
const data = (entries: Entry[], months: AppData['months']): AppData => ({ categories: cats, entries, months });

describe('parseAmount', () => {
  it('reads German amounts', () => {
    expect(parseAmount('1.050,50')).toBe(105050);
    expect(parseAmount('1050,5')).toBe(105050);
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('9,99 €')).toBe(999);
    expect(parseAmount('€ 4,95')).toBe(495);
    expect(parseAmount('1.050')).toBe(105000);
    expect(parseAmount('1.000.000')).toBe(100000000);
    expect(parseAmount(',5')).toBe(50);
  });
  it('takes a dot as the decimal point when it cannot be thousands', () => {
    expect(parseAmount('10.5')).toBe(1050);
    expect(parseAmount('1050.50')).toBe(105050);
    expect(parseAmount('1,050.50')).toBe(105050);
  });
  it('reads English amounts with the English locale', () => {
    expect(parseAmount('1,050', 'en-GB')).toBe(105000);
    expect(parseAmount('1.05', 'en-GB')).toBe(105);
  });
  it('rounds a third decimal instead of dropping it', () => {
    expect(parseAmount('12,345')).toBe(1235);
  });
  it('rejects what is not an amount', () => {
    for (const s of ['', ' ', 'abc', '12a', '-5', '1,2,3,4.5,6', '1.2,3.4']) expect(parseAmount(s)).toBeNull();
    expect(parseAmount('999999999999')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats euros in German with a real minus', () => {
    expect(formatMoney(105000, 'de-DE')).toBe('1.050,00 €');
    expect(formatMoney(-1250, 'de-DE')).toBe('−12,50 €');
    expect(formatMoney(77700, 'de-DE', 'always')).toBe('+777,00 €');
  });
  it('writes the edit value without grouping', () => {
    expect(amountToInput(105050, 'de-DE')).toBe('1050,50');
    expect(amountToInput(105050, 'en-GB')).toBe('1050.50');
  });
});

describe('months', () => {
  it('steps across years', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', -12)).toBe('2025-11');
    expect(monthsBetween('2025-11', '2026-11')).toBe(12);
  });
  it('knows month lengths and labels', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(monthKeyOf(new Date(2026, 10, 1))).toBe('2026-11');
    expect(monthLabel('2026-11', 'de-DE')).toBe('November 2026');
  });
  it('finds the previous started month across gaps', () => {
    const months = [{ key: '2026-08', startedAt: 0 }, { key: '2026-10', startedAt: 0 }];
    expect(previousStarted(months, '2026-12')).toBe('2026-10');
    expect(previousStarted(months, '2026-10')).toBe('2026-08');
    expect(previousStarted(months, '2026-08')).toBeUndefined();
  });
});

describe('balances', () => {
  // The October and November 2026 sheets of My_expense.xlsx, reduced to the
  // sums per column. Excel: Oct "Rest in Bank" 23.156,78; Nov "Rest in Bank"
  // (paid only) 26.183,93 and "All Rest in Bank" (incl. column H) 26.523,31.
  const oct = [
    e('2026-10', 'income', 'Gehalt', 69571, true), e('2026-10', 'income', 'Kindergeld', 77700, true),
    e('2026-10', 'income', 'Elterngeld', 208318, true),
    e('2026-10', 'fixed', 'Fixkosten', 144563, true), e('2026-10', 'extra', 'Sonderkosten', 116336, true),
    e('2026-10', 'groceries', 'Einkaufen', 104734, true), e('2026-10', 'car', 'Auto', 61076, true),
  ];
  const nov = [
    e('2026-11', 'income', 'Gehalt', 416459, true), e('2026-11', 'income', 'Kindergeld', 77700, false),
    e('2026-11', 'fixed', 'Miete', 105000, true), e('2026-11', 'fixed', 'Sparkasse', 495, true), e('2026-11', 'fixed', 'O2', 5998, true),
    e('2026-11', 'fixed', 'DFV', 3980, false), e('2026-11', 'fixed', 'Aras Energy', 8300, false), e('2026-11', 'fixed', 'Vodafone', 1999, false),
    e('2026-11', 'fixed', 'Gympod', 2490, false), e('2026-11', 'fixed', 'Apple cloud', 299, false), e('2026-11', 'fixed', 'A.I.Fitness', 10494, false),
    e('2026-11', 'groceries', 'Aktion', 2251, true),
    e('2026-11', 'car', 'DEVK', 5426, false), e('2026-11', 'car', 'Autoversicherung Tiguan', 10774, false),
  ];
  const d = data([...oct, ...nov], [{ key: '2026-10', opening: 2386798, startedAt: 0 }, { key: '2026-11', startedAt: 0 }]);

  it('matches the November 2026 sheet of My_expense.xlsx', () => {
    const [o, nv] = computeBalances(d);
    expect(o.now).toBe(2315678);
    expect(o.end).toBe(2315678);
    expect(nv.openingNow).toBe(2315678);
    expect(nv.now).toBe(2618393);
    expect(nv.end).toBe(2652331);
    expect(nv.expensePaid + nv.expenseOpen).toBe(139055 + 2251 + 16200);
    expect(nv.prevKey).toBe('2026-10');
  });

  it('keeps an open bill in "end" of later months, but not in "now"', () => {
    const b = computeBalances(data(
      [e('2026-10', 'income', 'Gehalt', 300000, true), e('2026-10', 'fixed', 'Miete', 100000, false)],
      [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', startedAt: 0 }],
    ));
    expect(b[0].now).toBe(300000);
    expect(b[0].end).toBe(200000);
    expect(b[1].openingNow).toBe(300000);
    expect(b[1].openingEnd).toBe(200000);
  });

  it('uses a manual opening for "now" and keeps what is outstanding for "end"', () => {
    const b = computeBalances(data(
      [e('2026-10', 'fixed', 'Miete', 100000, false)],
      [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', opening: 500000, startedAt: 0 }],
    ));
    expect(b[1].overridden).toBe(true);
    expect(b[1].openingNow).toBe(500000);
    expect(b[1].openingEnd).toBe(400000);
  });

  it('gives a month that is not started the carry-over of the last started one', () => {
    const b = computeBalances(d);
    const dec = balanceFor(b, '2027-01');
    expect(dec.started).toBe(false);
    expect(dec.prevKey).toBe('2026-11');
    expect(dec.now).toBe(2618393);
    expect(dec.end).toBe(2652331);
    expect(balanceFor([], '2026-11').now).toBe(0);
  });

  it('counts paid expenses for the progress bar', () => {
    const t = monthTotals(nov, cats, '2026-11');
    expect(t.expenseCount).toBe(12);
    expect(t.expensePaidCount).toBe(4);
    expect(t.openCount).toBe(9);
  });

  it('lists open entries left in earlier months', () => {
    expect(openBefore(d, '2026-12').map(x => x.name)).toContain('Vodafone');
    expect(openBefore(d, '2026-11')).toHaveLength(0);
  });
});

describe('carry-over', () => {
  it('copies monthly entries of the previous started month and yearly ones of a year ago', () => {
    const rent = e('2026-10', 'fixed', 'Miete', 105000, true, { repeat: 'monthly', dueDay: 1, seriesId: 'rent' });
    const lidl = e('2026-10', 'groceries', 'Lidl', 4512, true);
    const tax = e('2025-12', 'car', 'Kfz-Steuer', 30400, true, { repeat: 'yearly', seriesId: 'tax' });
    const oldRent = e('2025-12', 'fixed', 'Miete', 99000, true, { repeat: 'monthly', seriesId: 'rent' });
    const d = data([rent, lidl, tax, oldRent], [{ key: '2025-12', startedAt: 0 }, { key: '2026-10', startedAt: 0 }]);
    const c = carryCandidates(d, '2026-12');
    expect(c.map(x => x.name)).toEqual(['Miete', 'Kfz-Steuer']);
    expect(c[0].amount).toBe(105000);

    const copies = carryOver(c, '2026-12', 1000, (() => { let i = 0; return () => `n${++i}`; })());
    expect(copies[0]).toMatchObject({ id: 'n1', month: '2026-12', paid: false, dueDay: 1, seriesId: 'rent', repeat: 'monthly' });
    expect(copies[1]).toMatchObject({ month: '2026-12', paid: false, seriesId: 'tax', repeat: 'yearly' });
  });

  it('never copies a series that is already in the month', () => {
    const rent = e('2026-10', 'fixed', 'Miete', 105000, true, { repeat: 'monthly', seriesId: 'rent' });
    const already = e('2026-11', 'fixed', 'Miete', 105000, false, { repeat: 'monthly', seriesId: 'rent' });
    const phone = e('2026-10', 'fixed', 'O2', 5998, true, { repeat: 'monthly', seriesId: 'o2' });
    const d = data([rent, already, phone], [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', startedAt: 0 }]);
    expect(carryCandidates(d, '2026-11').map(x => x.name)).toEqual(['O2']);
  });
});

describe('entries', () => {
  it('sorts by due day, then in the order entered', () => {
    const a = e('2026-11', 'fixed', 'Vodafone', 1999, false, { dueDay: 18 });
    const b = e('2026-11', 'fixed', 'Miete', 105000, false, { dueDay: 1 });
    const c = e('2026-11', 'fixed', 'Gympod', 2490, false);
    expect(sortEntries([c, a, b]).map(x => x.name)).toEqual(['Miete', 'Vodafone', 'Gympod']);
  });

  it('flags open entries past their due day', () => {
    const today = new Date(2026, 10, 15);
    expect(isOverdue(e('2026-11', 'fixed', 'Miete', 1, false, { dueDay: 1 }), today)).toBe(true);
    expect(isOverdue(e('2026-11', 'fixed', 'Vodafone', 1, false, { dueDay: 18 }), today)).toBe(false);
    expect(isOverdue(e('2026-11', 'fixed', 'Paid', 1, true, { dueDay: 1 }), today)).toBe(false);
    expect(isOverdue(e('2026-10', 'fixed', 'Late', 1, false), today)).toBe(true);
    expect(isOverdue(e('2026-12', 'fixed', 'Future', 1, false, { dueDay: 1 }), today)).toBe(false);
    // Due on the 31st in a 30-day month counts as the 30th.
    expect(isOverdue(e('2026-11', 'fixed', 'End', 1, false, { dueDay: 31 }), new Date(2026, 10, 30))).toBe(false);
  });

  it('folds names for comparison', () => {
    expect(normalizeName('  Roßmann ')).toBe(normalizeName('rossmann'));
    expect(normalizeName('Café')).toBe('cafe');
  });
});

describe('suggestions', () => {
  const entries = [
    e('2026-09', 'groceries', 'Lidl', 3000, true), e('2026-10', 'groceries', 'LIDL', 4000, true),
    e('2026-10', 'groceries', 'Hira', 7332, true), e('2026-11', 'groceries', 'Lidl', 2200, true),
    e('2026-11', 'fixed', 'Miete', 105000, true, { repeat: 'monthly', dueDay: 1 }),
  ];
  it('puts what was entered most first, spelled as last time', () => {
    const s = suggestNames({ entries, categoryId: 'groceries', lang: 'de' });
    expect(s[0]).toMatchObject({ name: 'Lidl', count: 3 });
    expect(s[1]).toMatchObject({ name: 'Hira', count: 1 });
    // Built-in shops follow, without a second Lidl.
    expect(s.filter(x => normalizeName(x.name) === 'lidl')).toHaveLength(1);
    expect(s.some(x => x.name === 'Rewe' && x.count === 0)).toBe(true);
  });
  it('remembers the last amount, repeat and due day', () => {
    const [miete] = suggestNames({ entries, categoryId: 'fixed', lang: 'de' });
    expect(miete).toMatchObject({ name: 'Miete', last: { amount: 105000, repeat: 'monthly', dueDay: 1 } });
  });
  it('filters by what is typed, prefix matches first', () => {
    const s = suggestNames({ entries, categoryId: 'groceries', query: 'ro', lang: 'de' });
    expect(s.map(x => x.name)).toEqual(['Rossmann']);
    expect(suggestNames({ entries, categoryId: 'fixed', query: 'strom', lang: 'de' })).toHaveLength(0);
    expect(suggestNames({ entries, categoryId: 'income', lang: 'en' })[0].name).toBe('Salary');
  });
});

describe('statistics', () => {
  const entries = [
    e('2026-10', 'income', 'Gehalt', 300000, true),
    e('2026-10', 'fixed', 'Miete', 100000, true),
    e('2026-11', 'income', 'Gehalt', 300000, true),
    e('2026-11', 'fixed', 'Miete', 100000, false),
    e('2026-11', 'groceries', 'Lidl', 4000, true), e('2026-11', 'groceries', 'Lidl', 6000, true),
    e('2026-11', 'groceries', 'Rewe', 3000, true), e('2026-11', 'car', 'Tanken', 0, true),
  ];
  const d = data(entries, [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', startedAt: 0 }]);

  it('breaks a month down by category, largest first, empty ones left out', () => {
    const b = categoryBreakdown(entries, cats, '2026-11');
    expect(b.map(s => [s.category.id, s.paid, s.open])).toEqual([['fixed', 0, 100000], ['groceries', 13000, 0]]);
  });

  it('groups expenses by name', () => {
    expect(topNames(entries, cats, '2026-11')).toEqual([
      { name: 'Miete', categoryId: 'fixed', total: 100000, count: 1 },
      { name: 'Lidl', categoryId: 'groceries', total: 10000, count: 2 },
      { name: 'Rewe', categoryId: 'groceries', total: 3000, count: 1 },
    ]);
  });

  it('builds a history, months not started included', () => {
    const h = history(computeBalances(d), '2026-12', 3);
    expect(h.map(p => [p.key, p.started, p.saved, p.end])).toEqual([
      ['2026-10', true, 200000, 200000],
      ['2026-11', true, 187000, 387000],
      ['2026-12', false, 0, 387000],
    ]);
  });

  it('averages each category over the months given', () => {
    const a = averageByCategory(entries, cats, ['2026-10', '2026-11']);
    expect(a.map(x => [x.category.id, x.average])).toEqual([['fixed', 100000], ['groceries', 6500]]);
  });
});

describe('storage', () => {
  it('normalizes garbage into something usable', () => {
    expect(normalizeState(null)).toEqual({ categories: [], entries: [], months: [] });
    const s = normalizeState({
      categories: [{ id: 'fixed', names: { de: 'Fix' }, emoji: '🏠', hue: 'nope', kind: 'expense', repeat: 'weekly' }, { id: 'fixed' }, 'x'],
      entries: [
        { id: 'a', month: '2026-11', categoryId: 'fixed', name: '  Miete  ', amount: -105000.4, paid: true, dueDay: 40 },
        { id: 'b', month: '2026-13', categoryId: 'fixed', name: 'bad month' },
        { id: 'c', month: '2026-09', categoryId: 'gone', name: 'Orphan', amount: 500 },
      ],
      months: [{ key: '2026-11', opening: 12.4 }, { key: '2026-11' }],
    });
    expect(s.categories.map(c => c.id)).toEqual(['fixed', 'other']);
    expect(s.categories[0]).toMatchObject({ hue: 'stone', repeat: 'none' });
    expect(s.entries).toHaveLength(2);
    expect(s.entries[0]).toMatchObject({ name: 'Miete', amount: 105000, paid: true, seriesId: 'a' });
    expect(s.entries[0].dueDay).toBeUndefined();
    expect(s.entries[1].categoryId).toBe('other');
    expect(s.months.map(m => m.key)).toEqual(['2026-09', '2026-11']);
    expect(s.months[1].opening).toBe(12);
  });

  it('round-trips a backup and refuses foreign files', () => {
    const d = data([e('2026-11', 'fixed', 'Miete', 105000, true)], [{ key: '2026-11', startedAt: 1 }]);
    const parsed = parseBackup(JSON.stringify(makeBackup(d)));
    expect(parsed.ok && parsed.data).toEqual(d);
    expect(parseBackup('{"app":"korb","lists":[]}')).toEqual({ ok: false, error: 'backupInvalid' });
    expect(parseBackup('nope')).toEqual({ ok: false, error: 'backupInvalid' });
    expect(parseBackup(JSON.stringify({ ...makeBackup(d), schemaVersion: 99 }))).toEqual({ ok: false, error: 'backupTooNew' });
  });

  it('restores the built-in categories and keeps the user’s own', () => {
    const mine = { id: 'pets', names: { de: 'Haustier' }, emoji: '🐾', hue: 'sand' as const, kind: 'expense' as const, repeat: 'none' as const };
    const renamed = { ...cats[1], names: { de: 'Fix' } };
    const out = restoreDefaultCategories([renamed, mine], defaultCategories());
    expect(out.map(c => c.id)).toEqual([...cats.map(c => c.id), 'pets']);
    expect(out[1].names.de).toBe('Fixkosten');
  });
});

describe('CSV export', () => {
  it('writes semicolon CSV with negative expenses and quoted cells', () => {
    const d = data([
      e('2026-11', 'fixed', 'Miete; warm', 105000, false, { repeat: 'monthly', dueDay: 1 }),
      e('2026-11', 'income', 'Gehalt', 416459, true),
    ], [{ key: '2026-11', startedAt: 0 }]);
    const csv = toCsv(d, 'de', {
      header: ['Monat', 'Kategorie', 'Art', 'Name', 'Betrag', 'Status', 'Wiederholung', 'Fällig am', 'Notiz'],
      income: 'Einnahme', expense: 'Ausgabe', paid: 'bezahlt', open: 'offen',
      repeat: { none: 'einmalig', monthly: 'monatlich', yearly: 'jährlich' },
    });
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[1]).toBe('2026-11;Einkommen;Einnahme;Gehalt;4164,59;bezahlt;einmalig;;');
    expect(lines[2]).toBe('2026-11;Fixkosten;Ausgabe;"Miete; warm";-1050,00;offen;monatlich;1;');
  });
});

describe('categories per month', () => {
  const extra = e('2026-11', 'extra', 'Amazon', 2000, true);
  const base = (months: AppData['months']): AppData => ({ categories: cats, entries: [extra], months });

  it('shows every category in a month from before per-month lists', () => {
    expect(monthCategories(base([{ key: '2026-11', startedAt: 0 }]), '2026-11').map(c => c.id)).toEqual(cats.map(c => c.id));
  });
  it('shows the month’s own list plus anything with entries, in category order', () => {
    const d = base([{ key: '2026-11', startedAt: 0, categories: ['fixed', 'income'] }]);
    expect(monthCategories(d, '2026-11').map(c => c.id)).toEqual(['income', 'fixed', 'extra']);
    expect(canRemoveFromMonth(d, '2026-11', 'fixed')).toBe(true);
    expect(canRemoveFromMonth(d, '2026-11', 'extra')).toBe(false);
  });
  it('knows which categories new months get, and keeps the list through storage', () => {
    expect(standardCategoryIds([{ ...cats[0] }, { ...cats[1], standard: false }])).toEqual(['income']);
    const s = normalizeState({ categories: [{ ...cats[1], standard: false }], months: [{ key: '2026-11', categories: ['fixed', 'fixed', 3] }] });
    expect(s.categories[0].standard).toBe(false);
    expect(s.months[0].categories).toEqual(['fixed']);
  });
});

describe('dragging entries', () => {
  const rent = e('2026-11', 'fixed', 'Miete', 105000, true, { dueDay: 1 });
  const phone = e('2026-11', 'fixed', 'Handy', 1999, true, { dueDay: 18 });
  const gym = e('2026-11', 'fixed', 'Gym', 2490, true);
  const lidl = e('2026-11', 'groceries', 'Lidl', 4000, true);
  const rewe = e('2026-11', 'groceries', 'Rewe', 3000, true);
  const other = e('2026-10', 'fixed', 'Alt', 100, true);
  const all = [rent, phone, gym, lidl, rewe, other];
  const order = (xs: Entry[], cat: string, month = '2026-11') => sortEntries(xs.filter(x => x.categoryId === cat && x.month === month)).map(x => x.name);

  it('reorders inside a category and keeps that order', () => {
    const next = moveEntry(all, gym.id, 'fixed', 0);
    expect(order(next, 'fixed')).toEqual(['Gym', 'Miete', 'Handy']);
    expect(next.find(x => x.id === other.id)).toBe(other); // other months untouched
  });
  it('moves an entry to another category at the spot it was dropped', () => {
    const next = moveEntry(all, phone.id, 'groceries', 1);
    expect(order(next, 'groceries')).toEqual(['Lidl', 'Handy', 'Rewe']);
    expect(order(next, 'fixed')).toEqual(['Miete', 'Gym']);
    expect(next.find(x => x.id === phone.id)?.categoryId).toBe('groceries');
  });
  it('clamps the drop position and puts ordered entries before new ones', () => {
    const next = moveEntry(all, rent.id, 'fixed', 99);
    expect(order(next, 'fixed')).toEqual(['Handy', 'Gym', 'Miete']);
    const added = e('2026-11', 'fixed', 'Neu', 1, true, { dueDay: 1 });
    expect(order([...next, added], 'fixed')).toEqual(['Handy', 'Gym', 'Miete', 'Neu']);
  });
  it('carries the order into the next month', () => {
    const [copy] = carryOver([{ ...gym, repeat: 'monthly', order: 0 }], '2026-12', 1, () => 'c');
    expect(copy.order).toBe(0);
  });
});
