import { describe, expect, it } from 'vitest';
import {
  addMonths, amountToInput, averageByCategory, balanceFor, canRemoveFromMonth, carryCandidates, carryOver, categoryBreakdown,
  computeBalances, daysInMonth, formatMoney, history, isOverdue, makeBackup, monthKeyOf, monthLabel, monthsBetween,
  monthCategories, monthTotals, moveEntry, normalizeName, normalizeState, openBefore, parseAmount, parseBackup, previousStarted,
  restoreDefaultCategories, sortEntries, standardCategoryIds, suggestNames, toCsv, topNames, monthsEnding, monthSpanLabel, formatPercent, upgradeCategories,
  normalizeDigits, upgradeData, foldForSearch, searchEntries, highlightRanges, monthLeft, monthSettled, topCategories, laterCopies,
  leftPerDay, formatMoneyApprox, formatMoneyWhole, SCHEMA_VERSION, searchByMonth, formatMoneyEstimate, compactMoney, evalAmount, MAX_FAVORITES, reconcile,
} from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Category, Entry } from './types';

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
    // Income never gets expense names (and back), so a fresh income starts with the ideas.
    expect(suggestNames({ entries, categoryId: 'income', lang: 'en', categories: cats })[0].name).toBe('Salary');
  });
  it('offers the user’s own names from every month before the built-in ideas', () => {
    const s = suggestNames({ entries, categoryId: 'restaurants', lang: 'de', categories: cats }).map(x => x.name);
    // No restaurant history yet: the other expenses come first, the ideas after.
    expect(s.slice(0, 3)).toEqual(['Lidl', 'Miete', 'Hira']);
    expect(s.indexOf('Restaurant')).toBeGreaterThan(s.indexOf('Hira'));
  });
  it('suggests names from every category, this one first, and remembers where a name belongs', () => {
    const all = [e('2026-09', 'groceries', 'Lidl', 3000, true), e('2026-10', 'groceries', 'Lidl', 4000, true), e('2026-10', 'extra', 'Libri', 1500, true)];
    const s = suggestNames({ entries: all, categoryId: 'extra', query: 'li', lang: 'de' });
    // Starting with "li": this category's own first, then other categories'; "Online-Kurs" (contains it) after.
    expect(s.map(x => [x.name, x.categoryId])).toEqual([['Libri', 'extra'], ['Lidl', 'groceries'], ['Online-Kurs', 'extra']]);
    expect(s[1].last?.amount).toBe(4000);
    expect(suggestNames({ entries: all, categoryId: 'extra', lang: 'de', limit: 40 }).length).toBeGreaterThan(5);
  });
});

describe('a recurring entry added to an earlier month', () => {
  const months = ['2026-10', '2026-11', '2026-12'].map(key => ({ key, startedAt: 0 }));
  it('goes into every later started month (monthly) or a year on (yearly), open', () => {
    const rent = e('2026-10', 'fixed', 'Strom', 8300, true, { repeat: 'monthly' });
    let k = 0;
    const copies = laterCopies(data([rent], months), rent, 1000, () => `c${++k}`);
    expect(copies.map(c => [c.month, c.paid, c.seriesId, c.amount])).toEqual([['2026-11', false, rent.seriesId, 8300], ['2026-12', false, rent.seriesId, 8300]]);
    const yearly = e('2025-12', 'car', 'Kfz-Steuer', 30400, true, { repeat: 'yearly' });
    expect(laterCopies(data([yearly], months), yearly, 1000).map(c => c.month)).toEqual(['2026-12']);
  });
  it('leaves months that already have it, and once-only entries, alone', () => {
    const rent = e('2026-10', 'fixed', 'Strom', 8300, true, { repeat: 'monthly' });
    const there = { ...rent, id: 'x', month: '2026-11' };
    expect(laterCopies(data([rent, there], months), rent, 1000).map(c => c.month)).toEqual(['2026-12']);
    expect(laterCopies(data([], months), e('2026-10', 'extra', 'Amazon', 100, true), 1000)).toEqual([]);
  });
});

describe('the entry sheet’s three categories', () => {
  const used = [
    e('2026-10', 'groceries', 'Lidl', 100, true), e('2026-10', 'groceries', 'Rewe', 100, true), e('2026-11', 'groceries', 'Aldi', 100, true),
    e('2026-10', 'car', 'Tanken', 100, true), e('2026-11', 'car', 'Tanken', 100, true), e('2026-11', 'income', 'Gehalt', 100, true),
    e('2026-11', 'income', 'Kindergeld', 100, true), e('2026-11', 'income', 'Elterngeld', 100, true), e('2026-11', 'cash', 'Automat', 100, true),
  ];
  const ids = (selectedId: string, featured?: string[]) => topCategories({ categories: cats, entries: used, selectedId, featured }).map(c => c.id);
  it('picks the most used of the same kind, in the user’s order', () => {
    expect(ids('groceries')).toEqual(['car', 'groceries', 'cash']);
    // Income first for an income; the rest still by use.
    expect(ids('income')).toEqual(['income', 'car', 'groceries']);
  });
  it('puts this month’s categories first, and always shows the chosen one', () => {
    expect(ids('groceries', ['fixed', 'groceries', 'family'])).toEqual(['fixed', 'groceries', 'family']);
    expect(ids('taxes', ['fixed', 'groceries', 'family'])).toEqual(['fixed', 'groceries', 'taxes']);
  });
});

describe('what a month leaves over', () => {
  it('is income less expenses, ticked and pending apart, without the carry-over', () => {
    const entries = [
      e('2026-11', 'income', 'Gehalt', 416459, true), e('2026-11', 'income', 'Kindergeld', 77700, false),
      e('2026-11', 'fixed', 'Miete', 105000, true), e('2026-11', 'fixed', 'Strom', 8300, false),
    ];
    expect(monthLeft(monthTotals(entries, cats, '2026-11'))).toEqual({ paid: 311459, open: 69400, total: 380859 });
    expect(monthLeft(monthTotals([], cats, '2026-11'))).toEqual({ paid: 0, open: 0, total: 0 });
    expect(monthSettled(monthTotals(entries, cats, '2026-11'))).toEqual({ income: 494159, expense: 113300, net: 380859 });
    expect(monthSettled(monthTotals([], cats, '2026-11'))).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it('spreads what is left over the days still to come, today included', () => {
    // 7 November: 24 of 30 days to go. 1.749,86 € / 24 = 72,91 €.
    const nov7 = new Date(2026, 10, 7, 15, 30);
    expect(leftPerDay(174986, '2026-11', nov7)).toBe(7291);
    // The last day still counts as a whole day; the first counts them all.
    expect(leftPerDay(5000, '2026-11', new Date(2026, 10, 30, 23, 59))).toBe(5000);
    expect(leftPerDay(3000, '2026-11', new Date(2026, 10, 1))).toBe(100);
    expect(leftPerDay(2800, '2027-02', new Date(2027, 1, 1))).toBe(100);
    // Rounded down: never a cent more than there is.
    expect(leftPerDay(100, '2026-11', nov7)).toBe(4);
  });

  it('has no per-day figure when nothing is left, or for another month', () => {
    const nov7 = new Date(2026, 10, 7);
    expect(leftPerDay(0, '2026-11', nov7)).toBeNull();
    expect(leftPerDay(-5000, '2026-11', nov7)).toBeNull();
    expect(leftPerDay(174986, '2026-10', nov7)).toBeNull();
    expect(leftPerDay(174986, '2026-12', nov7)).toBeNull();
  });

  it('rounds averages to whole euros, with a sign when asked', () => {
    expect(formatMoneyWhole(379849, 'de-DE')).toBe('3.798\u00a0€');
    expect(formatMoneyWhole(124150, 'de-DE', 'exceptZero')).toBe('+1.242\u00a0€');
    expect(formatMoneyWhole(-20049, 'de-DE', 'exceptZero')).toBe('−200\u00a0€');
    expect(formatMoneyWhole(30, 'de-DE', 'exceptZero')).toBe('0\u00a0€');
  });

  it('rounds "about" amounts down to whole euros from 10 € up', () => {
    expect(formatMoneyApprox(7291, 'de-DE')).toBe('72\u00a0€');
    expect(formatMoneyApprox(123499, 'de-DE')).toBe('1.234\u00a0€');
    expect(formatMoneyApprox(840, 'de-DE')).toBe('8,40\u00a0€');
    expect(formatMoneyApprox(7291, 'en-GB')).toBe('€72');
  });

  it('rounds estimates the way a person says them: 100 € from 10.000 €, 10 € from 1.000 €', () => {
    expect(formatMoneyEstimate(1739592, 'de-DE')).toBe('17.400\u00a0€');
    expect(formatMoneyEstimate(2_879_550, 'de-DE')).toBe('28.800\u00a0€');
    expect(formatMoneyEstimate(123499, 'de-DE')).toBe('1.230\u00a0€');
    expect(formatMoneyEstimate(98049, 'de-DE')).toBe('980\u00a0€');
    expect(formatMoneyEstimate(840, 'de-DE')).toBe('8\u00a0€');
    expect(formatMoneyEstimate(-38049, 'de-DE')).toBe('−380\u00a0€');
    expect(formatMoneyEstimate(-40, 'de-DE')).toBe('0\u00a0€');
    expect(formatMoneyEstimate(18000, 'de-DE', 'exceptZero')).toBe('+180\u00a0€');
    expect(formatMoneyEstimate(1739592, 'en-GB')).toBe('€17,400');
  });

  it('writes axis amounts short, and groups German thousands the same way throughout', () => {
    expect(compactMoney(400000, 'de-DE')).toBe('4.000');
    expect(compactMoney(2000000, 'de-DE')).toBe('20.000');
    expect(compactMoney(150000000, 'de-DE')).toBe('1,5\u00a0Mio.');
    expect(compactMoney(-50000, 'de-DE')).toBe('−500');
    expect(compactMoney(400000, 'en-GB')).toBe('4k');
    expect(compactMoney(0, 'de-DE')).toBe('0');
  });
});

describe('search', () => {
  const nameOf = (id: string) => cats.find(c => c.id === id)!.names.de;
  const month = [
    e('2026-11', 'fixed', 'Miete', 105000, true),
    e('2026-11', 'fixed', 'DFV Zahnversicherung', 3980, false, { note: 'Familie' }),
    e('2026-11', 'fixed', 'Straßenreinigung', 1225, false),
    e('2026-11', 'car', 'Kfz-Steuer', 13900, false),
    e('2026-11', 'groceries', 'Rewe', 4512, true),
    e('2026-11', 'groceries', 'Gebühr Rückgabe', 250, true),
    e('2026-11', 'income', 'أحمد راتب', 416459, true),
  ];
  const find = (q: string, locale = 'de-DE') => searchEntries(month, q, { categoryName: nameOf, locale }).map(x => x.name);

  it('finds by name, note and category, ignoring case and accents', () => {
    expect(find('miete')).toEqual(['Miete']);
    expect(find('familie')).toEqual(['DFV Zahnversicherung']);
    expect(find('auto')).toEqual(['Kfz-Steuer']);
    expect(find('strasse')).toEqual(['Straßenreinigung']);
    expect(find('GEBUHR')).toEqual(['Gebühr Rückgabe']);
    expect(find('')).toHaveLength(month.length);
  });
  it('needs every word, in any field', () => {
    expect(find('wohnen versicherung')).toEqual(['DFV Zahnversicherung']);
    expect(find('wohnen rewe')).toEqual([]);
  });
  it('finds amounts, however they are written', () => {
    expect(find('80')).toEqual(['DFV Zahnversicherung']);
    expect(find('3980')).toEqual(['DFV Zahnversicherung']);
    expect(find('12')).toEqual(['Straßenreinigung', 'Rewe']);
    expect(find(',50')).toEqual(['Gebühr Rückgabe']);
    expect(searchEntries([e('2026-11', 'fixed', 'O2', 5998, true)], '99', { categoryName: nameOf, locale: 'de-DE' })).toEqual([]);
    expect(find('39,8')).toEqual(['DFV Zahnversicherung']);
    expect(find('39.80')).toEqual(['DFV Zahnversicherung']);
    expect(find('1.050')).toEqual(['Miete']);
    expect(find('1050,00 €')).toEqual(['Miete']);
    expect(find('-45,12')).toEqual(['Rewe']);
    expect(find('139')).toEqual(['Kfz-Steuer']);
    expect(find('4,164.59', 'en-GB')).toEqual(['أحمد راتب']);
  });
  it('reads Arabic letter forms and digits the same', () => {
    expect(foldForSearch('أَحْمَد')).toBe('احمد');
    expect(find('احمد')).toEqual(['أحمد راتب']);
    expect(find('٤١٦٤')).toEqual(['أحمد راتب']);
  });
  it('marks where the words are, in the original text', () => {
    expect(highlightRanges('Aras Energy', 'en')).toEqual([[5, 7]]);
    expect(highlightRanges('Straßenreinigung', 'strasse')).toEqual([[0, 6]]);
    expect(highlightRanges('Rewe Rewe', 'rewe')).toEqual([[0, 4], [5, 9]]);
    expect(highlightRanges('Zahnversicherung', 'zahn versich')).toEqual([[0, 11]]);
    // The vowel marks stay with their letters.
    expect(highlightRanges('أَحْمَد راتب', 'احمد')).toEqual([[0, 7]]);
    expect(highlightRanges('Miete', '')).toEqual([]);
  });
  it('groups hits from every month: the month on screen first, then newest first', () => {
    const hits = [
      e('2026-09', 'groceries', 'Lidl', 100, true), e('2026-11', 'groceries', 'Lidl', 200, true),
      e('2026-10', 'groceries', 'Lidl', 300, true), e('2026-11', 'groceries', 'Lidl', 400, true), e('2026-12', 'groceries', 'Lidl', 500, false),
    ];
    const r = searchByMonth(hits, '2026-10');
    expect(r.groups.map(g => [g.month, g.entries.map(x => x.amount)])).toEqual([
      ['2026-10', [300]], ['2026-12', [500]], ['2026-11', [200, 400]], ['2026-09', [100]],
    ]);
    expect([r.total, r.shown]).toEqual([5, 5]);
  });
  it('stops at the limit, inside a month if need be', () => {
    const hits = Array.from({ length: 7 }, (_, i) => e(`2026-${String(1 + (i % 3)).padStart(2, '0')}`, 'extra', 'Amazon', 100 + i, true));
    const r = searchByMonth(hits, '2026-11', 4);
    expect(r.groups.map(g => [g.month, g.entries.length])).toEqual([['2026-03', 2], ['2026-02', 2]]);
    expect([r.total, r.shown]).toEqual([7, 4]);
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
    expect(topNames(entries, cats, ['2026-11'])).toEqual([
      { name: 'Miete', categoryId: 'fixed', total: 100000, count: 1 },
      { name: 'Lidl', categoryId: 'groceries', total: 10000, count: 2 },
      { name: 'Rewe', categoryId: 'groceries', total: 3000, count: 1 },
    ]);
    expect(topNames(entries, cats, ['2026-11'], 1).map(x => x.name)).toEqual(['Miete']);
    expect(topNames(entries, cats, ['2026-08'])).toEqual([]);
  });

  it('lists the months ending with one, oldest first', () => {
    expect(monthsEnding('2026-11', 1)).toEqual(['2026-11']);
    expect(monthsEnding('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('names a run of months', () => {
    expect(monthSpanLabel(['2026-08', '2026-09', '2026-10'], 'de-DE')).toBe('August – Oktober 2026');
    expect(monthSpanLabel(['2026-10'], 'en-GB')).toBe('October 2026');
    expect(monthSpanLabel(['2025-12', '2026-01'], 'de-DE')).toBe('Dez. 25 – Jan. 26');
    expect(monthSpanLabel([], 'de-DE')).toBe('');
  });

  it('writes percentages the locale\'s way', () => {
    expect(formatPercent(40, 'de-DE')).toBe('40\u00a0%');
    expect(formatPercent(23.4, 'en-GB')).toBe('23%');
    expect(formatPercent(-55, 'en-GB')).toBe('−55%');
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
    expect(s.categories.map(c => c.id)).toEqual(['fixed', 'extra']);
    expect(s.categories[0]).toMatchObject({ hue: 'stone', repeat: 'none' });
    expect(s.entries).toHaveLength(2);
    expect(s.entries[0]).toMatchObject({ name: 'Miete', amount: 105000, paid: true, seriesId: 'a' });
    expect(s.entries[0].dueDay).toBeUndefined();
    expect(s.entries[1].categoryId).toBe('extra');
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
    expect(out[1].names.de).toBe('Wohnen');
  });
});

describe('CSV export', () => {
  it('writes semicolon CSV with negative expenses and quoted cells', () => {
    const d = data([
      e('2026-11', 'fixed', 'Miete; warm', 105000, false, { repeat: 'monthly', dueDay: 1 }),
      e('2026-11', 'income', 'Gehalt', 416459, true),
    ], [{ key: '2026-11', startedAt: 0 }]);
    const csv = toCsv(d, 'de', {
      header: ['Monat', 'Kategorie', 'Art', 'Name', 'Betrag', 'Status', 'Wiederholung', 'Fällig am', 'Notiz', 'Datum'],
      income: 'Einnahme', expense: 'Ausgabe', paid: 'bezahlt', open: 'offen',
      repeat: { none: 'einmalig', monthly: 'monatlich', yearly: 'jährlich' }, currency: 'Währung',
    });
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    // A trailing currency column (EUR) is appended after the date (plan 07).
    expect(lines[0].endsWith(';Währung')).toBe(true);
    expect(lines[1]).toBe('2026-11;Einkommen;Einnahme;Gehalt;4164,59;bezahlt;einmalig;;;;EUR');
    expect(lines[2]).toBe('2026-11;Wohnen;Ausgabe;"Miete; warm";-1050,00;offen;monatlich;1;;;EUR');
  });

  it('neutralises formula cells so a hostile payee name cannot run in Excel', () => {
    const d = data([
      e('2026-11', 'extra', '=HYPERLINK("http://evil","klick")', 1000, true),
      e('2026-11', 'extra', 'PayPal', 2000, true, { note: '+49 123' }),
      e('2026-11', 'extra', '-Rabatt', 3000, true),
    ], [{ key: '2026-11', startedAt: 0 }]);
    const csv = toCsv(d, 'de', {
      header: ['Monat', 'Kategorie', 'Art', 'Name', 'Betrag', 'Status', 'Wiederholung', 'Fällig am', 'Notiz', 'Datum'],
      income: 'Einnahme', expense: 'Ausgabe', paid: 'bezahlt', open: 'offen',
      repeat: { none: 'einmalig', monthly: 'monatlich', yearly: 'jährlich' }, currency: 'Währung',
    });
    const lines = csv.replace('', '').trim().split('\r\n');
    // Each dangerous text cell gets a leading apostrophe; the cell is then quoted only if it needs it.
    expect(lines.some(l => l.includes(`"'=HYPERLINK(`))).toBe(true);
    expect(lines.some(l => l.includes(`'+49 123`))).toBe(true);
    expect(lines.some(l => l.includes(`'-Rabatt`))).toBe(true);
    // The amount column keeps its real leading minus — it is not a formula.
    expect(lines.some(l => /;-\d/.test(l))).toBe(true);
  });
});

describe('categories per month', () => {
  const extra = e('2026-11', 'extra', 'Amazon', 2000, true);
  const base = (months: AppData['months']): AppData => ({ categories: cats, entries: [extra], months });

  it('shows the standard categories (and any with entries) in a month without its own list', () => {
    const ids = monthCategories(base([{ key: '2026-11', startedAt: 0 }]), '2026-11').map(c => c.id);
    expect(ids).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children']);
    const withCash = { ...base([{ key: '2026-11', startedAt: 0 }]), entries: [extra, e('2026-11', 'cash', 'Geldautomat', 5000, true)] };
    expect(monthCategories(withCash, '2026-11').map(c => c.id)).toEqual([...ids, 'cash']);
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

describe('upgrading categories saved before schema 2', () => {
  // What a first launch of version 1 stored.
  const v1 = (): Category[] => [
    { id: 'income', names: { de: 'Einkommen', en: 'Income' }, emoji: '💶', hue: 'leaf' as const, kind: 'income' as const, repeat: 'monthly' as const, builtin: true },
    { id: 'fixed', names: { de: 'Fixkosten', en: 'Fixed costs' }, emoji: '🏠', hue: 'sky' as const, kind: 'expense' as const, repeat: 'monthly' as const, budget: 'need' as const, builtin: true },
    { id: 'extra', names: { de: 'Sonderkosten', en: 'Extras' }, emoji: '🛍️', hue: 'lavender' as const, kind: 'expense' as const, repeat: 'none' as const, budget: 'want' as const, builtin: true },
    { id: 'groceries', names: { de: 'Einkaufen', en: 'Groceries' }, emoji: '🛒', hue: 'lime' as const, kind: 'expense' as const, repeat: 'none' as const, budget: 'need' as const, builtin: true },
  ];

  it('adds the new built-ins, not in new months, and updates what the user left as shipped', () => {
    const up = upgradeData({ categories: v1(), entries: [], months: [] }).categories;
    expect(up.slice(0, 4).map(c => c.id)).toEqual(['income', 'fixed', 'extra', 'groceries']);
    expect(up.find(c => c.id === 'groceries')!.names).toEqual({ de: 'Lebensmittel und Drogerie', en: 'Groceries & drugstore', ar: 'البقالة والعناية الشخصية' });
    expect(up.find(c => c.id === 'fixed')!.names).toEqual({ de: 'Wohnen', en: 'Home', ar: 'المنزل' });
    expect(up.find(c => c.id === 'extra')!.names.de).toBe('Sonstiges');
    expect(up.find(c => c.id === 'extra')!.emoji).toBe('📦');
    expect(up.find(c => c.id === 'insurance')!.names.en).toBe('Insurance');
    expect(up.map(c => c.id).slice(4)).toEqual([
      'restaurants', 'clothing', 'shopping', 'telecom', 'mobility', 'travel', 'leisure', 'sport', 'health', 'education',
      'investment', 'insurance', 'cash', 'taxes', 'children',
    ]);
    expect(standardCategoryIds(up)).toEqual(['income', 'fixed', 'extra', 'groceries', 'restaurants', 'children']);
    expect(up.find(c => c.id === 'investment')!.budget).toBe('save');
  });
  it('keeps what the user renamed or repainted, and the user’s own categories', () => {
    const mine = v1();
    mine[3] = { ...mine[3], names: { de: 'Supermarkt' } };
    mine[2] = { ...mine[2], emoji: '✨' };
    const own = { id: 'pets', names: { de: 'Haustier' }, emoji: '🐾', hue: 'sand' as const, kind: 'expense' as const, repeat: 'none' as const };
    const up = upgradeCategories([...mine, own]);
    expect(up.find(c => c.id === 'groceries')!.names).toEqual({ de: 'Supermarkt' });
    expect(up.find(c => c.id === 'extra')!.emoji).toBe('✨');
    expect(up[4]).toEqual(own);
  });
  it('puts the new ones before an existing “Sonstiges”, and is a no-op the second time', () => {
    const fallback = { id: 'other', names: { de: 'Sonstiges', en: 'Other' }, emoji: '📦', hue: 'stone' as const, kind: 'expense' as const, repeat: 'none' as const };
    const up = upgradeCategories([...v1(), fallback]);
    expect(up[up.length - 1].id).toBe('other');
    expect(up.filter(c => c.id === 'other')).toHaveLength(1);
    expect(upgradeCategories(up)).toEqual(up);
    expect(upgradeCategories([])).toEqual([]);
    // …and schema 4 then folds it into the new "Sonstiges".
    expect(upgradeData({ categories: [...v1(), fallback], entries: [], months: [] }).categories.some(c => c.id === 'other')).toBe(false);
  });
  it('runs on a backup from version 1, not on a current one', () => {
    const old = { app: 'spartopf', schemaVersion: 1, categories: v1(), entries: [], months: [] };
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.ok && parsed.data.categories.length).toBe(19);
    // From version 2 on, only the restaurants (schema 5) and the children (schema 8) are still to come.
    const v2 = parseBackup(JSON.stringify({ ...old, schemaVersion: 2 }));
    expect(v2.ok && v2.data.categories.map(c => c.id)).toEqual(['income', 'fixed', 'extra', 'groceries', 'restaurants', 'children']);
    const current = parseBackup(JSON.stringify({ ...old, schemaVersion: 8 }));
    expect(current.ok && current.data.categories.length).toBe(4);
  });
});

describe('Arabic', () => {
  it('gives built-ins still named as shipped their Arabic names (schema 3), and leaves renamed ones alone', () => {
    const v2: Category[] = defaultCategories().slice(0, 3).map(c => ({ ...c, names: { de: c.names.de, en: c.names.en } }));
    v2[1] = { ...v2[1], names: { de: 'Miete & Nebenkosten' } };
    const up = upgradeCategories(v2, 2);
    expect(up.map(c => c.names.ar)).toEqual(['الدخل', undefined, 'السيارة']);
    expect(up[1].names).toEqual({ de: 'Miete & Nebenkosten' });
    expect(up).toHaveLength(3);
    expect(upgradeCategories(up, SCHEMA_VERSION)).toBe(up);
  });
  it('reads amounts typed on an Arabic keyboard', () => {
    expect(normalizeDigits('١٬٠٥٠٫٥٠')).toBe('1,050.50');
    expect(parseAmount('١٬٠٥٠٫٥٠', 'ar-u-nu-latn')).toBe(105050);
    expect(parseAmount('١٢٫٥', 'ar-u-nu-latn')).toBe(1250);
    expect(parseAmount('۴۵', 'ar-u-nu-latn')).toBe(4500);
    expect(parseAmount('12.50', 'ar-u-nu-latn')).toBe(1250);
    expect(parseAmount('1,050.00', 'ar-u-nu-latn')).toBe(105000);
    expect(normalizeDigits('١٨')).toBe('18');
  });
  it('formats money with Western digits, and the minus as a true minus', () => {
    const s = formatMoney(-105050, 'ar-u-nu-latn');
    expect(s).toMatch(/1,050\.50/);
    expect(s).toContain('−');
    expect(s).not.toMatch(/[٠-٩]/);
  });
});

describe('schema 4: Wohnen and Sonstiges', () => {
  const shipped = new Map(defaultCategories().map(c => [c.id, c]));
  const cat = (id: string, names: Category['names'], extra: Partial<Category> = {}): Category =>
    ({ ...(shipped.get(id) ?? shipped.get('clothing')!), id, names, ...extra });
  const v3 = (): AppData => ({
    categories: [
      cat('income', { de: 'Einkommen', en: 'Income', ar: 'الدخل' }),
      cat('fixed', { de: 'Fixkosten', en: 'Fixed costs', ar: 'التكاليف الثابتة' }),
      cat('extra', { de: 'Sonderkosten', en: 'Extras', ar: 'مصاريف إضافية' }, { emoji: '🧾' }),
      cat('home', { de: 'Wohnen und Garten', en: 'Home & garden', ar: 'المنزل والحديقة' }, { emoji: '🏡', standard: false }),
      cat('insurance', { de: 'Absicherung und Vorsorge', en: 'Insurance & pensions', ar: 'التأمين والتقاعد' }),
      cat('other', { de: 'Sonstiges', en: 'Other', ar: 'أخرى' }, { standard: false }),
    ],
    entries: [
      e('2026-11', 'home', 'IKEA', 120, true, { order: 0 }),
      e('2026-11', 'other', 'Post', 5, true),
      e('2026-11', 'fixed', 'Miete', 1050, false, { order: 0 }),
    ],
    months: [{ key: '2026-11', startedAt: 0, categories: ['income', 'fixed', 'home', 'other'] }],
  });

  it('folds "Wohnen und Garten" into Wohnen and the old "Sonstiges" into Sonstiges, entries and months too', () => {
    const up = upgradeData(v3(), 3, new Date(2026, 10, 7));
    // (Schemas 5 and 8 then add the restaurants and the children: no neighbours here, so at the end.)
    expect(up.categories.map(c => c.id)).toEqual(['income', 'fixed', 'extra', 'insurance', 'restaurants', 'children']);
    expect(up.categories.map(c => c.names.de)).toEqual(['Einkommen', 'Wohnen', 'Sonstiges', 'Versicherungen', 'Restaurants', 'Kinder']);
    expect(up.categories.find(c => c.id === 'extra')!.emoji).toBe('📦');
    expect(up.entries.map(x => [x.name, x.categoryId, x.order])).toEqual([['IKEA', 'fixed', undefined], ['Post', 'extra', undefined], ['Miete', 'fixed', 0]]);
    expect(up.months[0].categories).toEqual(['income', 'fixed', 'extra', 'restaurants', 'children']);
    expect(upgradeData(up, SCHEMA_VERSION)).toBe(up);
  });
  it('keeps a name the user chose', () => {
    const d = v3();
    d.categories[1] = { ...d.categories[1], names: { de: 'Miete & Co' } };
    expect(upgradeData(d, 3).categories[1].names).toEqual({ de: 'Miete & Co' });
  });
});

describe('schema 5: Restaurants', () => {
  const shipped = new Map(defaultCategories().map(c => [c.id, c]));
  const v4 = (): AppData => ({
    categories: ['income', 'fixed', 'car', 'extra', 'groceries', 'family', 'cash'].map(id => ({ ...shipped.get(id)! })),
    entries: [e('2026-10', 'groceries', 'Rewe', 4500, true)],
    months: [
      { key: '2026-09', startedAt: 0 },
      { key: '2026-10', startedAt: 0, categories: ['income', 'fixed', 'groceries'] },
      { key: '2026-11', startedAt: 0, categories: ['income', 'fixed', 'car', 'extra', 'groceries', 'family'] },
      { key: '2026-12', startedAt: 0 },
    ],
  });
  const today = new Date(2026, 10, 7);

  it('is a main category of a fresh start, beside the groceries', () => {
    const ids = defaultCategories().map(c => c.id);
    expect(ids.indexOf('restaurants')).toBe(ids.indexOf('groceries') + 1);
    expect(standardCategoryIds(defaultCategories())).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children']);
    expect(suggestNames({ entries: [], categoryId: 'restaurants', lang: 'de' }).map(s => s.name)).toContain('Lieferando');
  });
  it('arrives after the groceries, in the running month and later ones; earlier months stay as they were', () => {
    const up = upgradeData(v4(), 4, today);
    expect(up.categories.map(c => c.id)).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children', 'cash']);
    const shown = (key: string) => monthCategories(up, key).map(c => c.id);
    expect(shown('2026-09')).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'family']);
    expect(shown('2026-10')).toEqual(['income', 'fixed', 'groceries']);
    expect(shown('2026-11')).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children']);
    expect(up.months.find(m => m.key === '2026-12')!.categories).toBeUndefined();
    expect(shown('2026-12')).toContain('restaurants');
    expect(upgradeData(up, SCHEMA_VERSION, today)).toBe(up);
  });
  it('leaves it out when the user already has one of their own', () => {
    const d = v4();
    d.categories.push({ id: 'c-own', names: { de: 'Restaurant' }, emoji: '🍕', hue: 'tomato', kind: 'expense', repeat: 'none' });
    const up = upgradeData(d, 4, today);
    expect(up.categories.some(c => c.id === 'restaurants')).toBe(false);
    expect(up.months.find(m => m.key === '2026-11')!.categories).not.toContain('restaurants');
  });
});

describe('schema 6: the income picture', () => {
  it('swaps the banknote for the money bag, unless the user chose another', () => {
    const shipped = defaultCategories().find(c => c.id === 'income')!;
    const d = (emoji: string): AppData => ({ categories: [{ ...shipped, emoji }], entries: [], months: [] });
    expect(upgradeData(d('💶'), 5).categories[0].emoji).toBe('💰');
    expect(upgradeData(d('🏦'), 5).categories[0].emoji).toBe('🏦');
    expect(upgradeData(d('💶'), 8).categories[0].emoji).toBe('💶');
  });
});

describe('schema 7: the date says when it is due', () => {
  it('gives entries that only had a due day that day as their date', () => {
    const d: AppData = { categories: cats, months: [{ key: '2026-11', startedAt: 0 }], entries: [
      e('2026-11', 'car', 'DEVK', 5426, false, { dueDay: 14 }), e('2026-11', 'fixed', 'Miete', 105000, false, { dueDay: 31, date: '2026-11-01' }),
      e('2026-02', 'fixed', 'Handy', 1999, false, { dueDay: 30 }),
    ] };
    expect(upgradeData(d, 6).entries.map(x => x.date)).toEqual(['2026-11-14', '2026-11-01', '2026-02-28']);
  });
  it('is overdue once the date has passed, and sorts by it', () => {
    const today = new Date(2026, 10, 7);
    expect(isOverdue(e('2026-11', 'car', 'DEVK', 1, false, { date: '2026-11-14', dueDay: 1 }), today)).toBe(false);
    expect(isOverdue(e('2026-11', 'car', 'Strom', 1, false, { date: '2026-11-03' }), today)).toBe(true);
    expect(isOverdue(e('2026-11', 'car', 'Heute', 1, false, { date: '2026-11-07' }), today)).toBe(false);
    const a = e('2026-11', 'fixed', 'Spät', 1, false, { date: '2026-11-20' });
    const b = e('2026-11', 'fixed', 'Früh', 1, false, { date: '2026-11-02' });
    expect(sortEntries([a, b]).map(x => x.name)).toEqual(['Früh', 'Spät']);
  });
  it('keeps an imported entry’s fingerprint through storage', () => {
    const s = normalizeState({ entries: [{ ...e('2026-11', 'fixed', 'Lidl', 100, true), ref: '2026-11-03|-100|lidl|' }] });
    expect(s.entries[0].ref).toBe('2026-11-03|-100|lidl|');
  });
});

describe('schema 8: Kinder', () => {
  it('arrives after the family, unless the user has one of their own', () => {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    const v7: AppData = {
      categories: ['income', 'fixed', 'groceries', 'restaurants', 'family', 'cash'].map(id => ({ ...shipped.get(id)! })),
      entries: [], months: [{ key: '2026-11', startedAt: 0, categories: ['income', 'family'] }],
    };
    const up = upgradeData(v7, 7, new Date(2026, 10, 7));
    expect(up.categories.map(c => c.id)).toEqual(['income', 'fixed', 'groceries', 'restaurants', 'family', 'children', 'cash']);
    expect(up.months[0].categories).toEqual(['income', 'family', 'children']);
    const own = { ...v7, categories: [...v7.categories, { id: 'k1', names: { de: 'Kinder' }, emoji: '👶', hue: 'sand' as const, kind: 'expense' as const, repeat: 'none' as const }] };
    expect(upgradeData(own, 7, new Date(2026, 10, 7)).categories.some(c => c.id === 'children')).toBe(false);
  });
});

describe('evalAmount — the amount-field calculator', () => {
  it('adds and subtracts money amounts (German)', () => {
    expect(evalAmount('12,50+4,80', 'de-DE')).toBe(1730);
    expect(evalAmount('20-4,50', 'de-DE')).toBe(1550);
  });

  it('honours precedence: × and ÷ before + and −', () => {
    expect(evalAmount('2+3×4', 'de-DE')).toBe(1400); // 2 + 12 = 14,00
    expect(evalAmount('2+3*4', 'de-DE')).toBe(1400);
  });

  it('multiplies and divides', () => {
    expect(evalAmount('3×9,99', 'de-DE')).toBe(2997);
    expect(evalAmount('10÷4', 'de-DE')).toBe(250); // 2,50
    expect(evalAmount('10/4', 'de-DE')).toBe(250);
  });

  it('reads English marks and Arabic digits', () => {
    expect(evalAmount('1,050.50+9.50', 'en-GB')).toBe(106000);
    expect(evalAmount('١٢٫٥٠+٤٫٨٠', 'de-DE')).toBe(1730);
  });

  it('returns null for a plain number (the field handles that)', () => {
    expect(evalAmount('12,50', 'de-DE')).toBeNull();
  });

  it('waits on a trailing operator and rejects the unparseable', () => {
    expect(evalAmount('12,50+', 'de-DE')).toBeNull();
    expect(evalAmount('+12,50', 'de-DE')).toBeNull();
    expect(evalAmount('abc', 'de-DE')).toBeNull();
  });

  it('refuses a negative result and a division by zero', () => {
    expect(evalAmount('4-10', 'de-DE')).toBeNull();
    expect(evalAmount('10÷0', 'de-DE')).toBeNull();
  });

  it('caps the number of operands', () => {
    expect(evalAmount(Array(13).fill('1').join('+'), 'de-DE')).toBeNull();
    expect(evalAmount(Array(12).fill('1').join('+'), 'de-DE')).toBe(1200);
  });
});

describe('favourites (plan 09)', () => {
  const cats = defaultCategories();
  it('keeps good favourites and drops the rest', () => {
    const state = normalizeState({
      categories: cats,
      entries: [],
      months: [],
      favorites: [
        { id: 'a', name: 'Bäcker', categoryId: 'groceries', amount: 480, repeat: 'none' },
        { id: 'b', name: '', categoryId: 'groceries' },           // no name → dropped
        { id: 'c', name: 'Tanken', categoryId: 'car' },           // no amount is fine
        { name: 'Kantine', categoryId: 'extra', amount: -5 },     // bad amount → amount left off, id generated
        'nope',                                                   // not an object → dropped
      ],
    });
    const favs = state.favorites ?? [];
    expect(favs.map(f => f.name)).toEqual(['Bäcker', 'Tanken', 'Kantine']);
    expect(favs[0]).toMatchObject({ amount: 480, repeat: 'none' });
    expect(favs[1].amount).toBeUndefined();
    expect(favs[2].amount).toBeUndefined(); // the -5 was rejected
    expect(favs[2].id).toBeTruthy();
  });

  it('sends a favourite of a deleted category to Sonstiges (extra)', () => {
    const state = normalizeState({
      categories: cats,
      entries: [],
      months: [],
      favorites: [{ id: 'x', name: 'Altes', categoryId: 'does-not-exist', amount: 100 }],
    });
    expect(state.favorites?.[0].categoryId).toBe('extra');
  });

  it('caps the number of favourites', () => {
    const many = Array.from({ length: MAX_FAVORITES + 3 }, (_, i) => ({ id: `f${i}`, name: `F${i}`, categoryId: 'extra' }));
    const state = normalizeState({ categories: cats, entries: [], months: [], favorites: many });
    expect(state.favorites?.length).toBe(MAX_FAVORITES);
  });

  it('travels through a backup', () => {
    const d: AppData = { categories: cats, entries: [], months: [], favorites: [{ id: 'a', name: 'Bäcker', categoryId: 'groceries', amount: 480 }] };
    const back = parseBackup(JSON.stringify(makeBackup(d)));
    expect(back.ok && back.data.favorites?.[0]).toMatchObject({ name: 'Bäcker', amount: 480 });
  });
});

describe('reconcile — match the bank balance (plan 10)', () => {
  const opts = { extraId: 'extra', incomeId: 'income', name: 'Kontoabgleich', currentOpening: 200000 };

  it('books an expense when the bank shows less', () => {
    const r = reconcile(100000, 97660, opts); // 23,40 € less
    expect(r.diff).toBe(-2340);
    expect(r.entry).toMatchObject({ categoryId: 'extra', amount: 2340, paid: true, repeat: 'none' });
    expect(r.opening).toBe(200000 - 2340); // adjust-opening alternative
  });

  it('books income when the bank shows more', () => {
    const r = reconcile(100000, 105000, opts);
    expect(r.diff).toBe(5000);
    expect(r.entry).toMatchObject({ categoryId: 'income', amount: 5000, paid: true });
    expect(r.opening).toBe(205000);
  });

  it('reports no difference and offers nothing to book', () => {
    const r = reconcile(100000, 100000, opts);
    expect(r).toEqual({ diff: 0 });
  });

  it('works off an overridden opening (the opening shifts by the difference)', () => {
    const r = reconcile(100000, 99000, { ...opts, currentOpening: 150000 });
    expect(r.opening).toBe(149000);
  });

  it('carries a date onto the booked entry', () => {
    const r = reconcile(100000, 99000, { ...opts, date: '2026-11-07' });
    expect(r.entry?.date).toBe('2026-11-07');
  });
});
