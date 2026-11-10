import { describe, expect, it } from 'vitest';
import {
  ALL_ACCOUNTS, MAIN_ACCOUNT, TRANSFER_CATEGORY, accountTotals, accountView, accountsOf, canDeleteAccount, carryCandidates, carryOver,
  computeBalances, hasAccounts, intoAccount, laterTransferCopies, makeBackup, makeTransfer, monthTotals, monthTransfers, normalizeState, parseBackup,
  toCsv, topNames, transferPair,
} from './logic';
import { buildBook } from './insights';
import { loadStored, writeLocal } from './storage';
import { defaultCategories } from './data/defaults';
import { Account, AppData, Entry } from './types';

/*
 * Cash and savings accounts (plan 30): a book has one account until the user
 * adds another; transfers move money between them and are never income or
 * expense.
 */
const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, amount: number, paid: boolean, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `e${n}`, month, categoryId, name, amount, paid, repeat: 'none', seriesId: `s${n}`, createdAt: n, ...extra };
}
let ids = 0;
const newId = () => `id${++ids}`;
const cash: Account = { id: 'cash', name: 'Bargeld', kind: 'cash', emoji: '💶', hue: 'leaf', createdAt: 1 };
const savings: Account = { id: 'sav', name: 'Tagesgeld', kind: 'savings', emoji: '🐷', hue: 'berry', createdAt: 2 };
const main: Account = { id: MAIN_ACCOUNT, name: '', kind: 'bank', emoji: '🏦', hue: 'blue', createdAt: 0 };

/** October and November: salary and rent on the main account, groceries in cash, 200 € taken out, 500 € put aside. */
function book(): AppData {
  const [outCash, inCash] = makeTransfer({ from: MAIN_ACCOUNT, to: 'cash', amount: 20000, name: 'Abheben', month: '2026-10', paid: true, repeat: 'none' }, 100, newId);
  const [outSav, inSav] = makeTransfer({ from: MAIN_ACCOUNT, to: 'sav', amount: 50000, name: 'Sparen', month: '2026-10', paid: false, repeat: 'monthly' }, 200, newId);
  return {
    categories: cats,
    months: [
      { key: '2026-10', startedAt: 0, opening: 100000, openings: { cash: 5000, sav: 300000 } },
      { key: '2026-11', startedAt: 1 },
    ],
    entries: [
      e('2026-10', 'income', 'Gehalt', 300000, true),
      e('2026-10', 'fixed', 'Miete', 100000, true, { repeat: 'monthly' }),
      e('2026-10', 'groceries', 'Markt', 4000, true, { accountId: 'cash' }),
      outCash, inCash, outSav, inSav,
      e('2026-11', 'groceries', 'Bäcker', 1000, false, { accountId: 'cash' }),
    ],
    accounts: [main, cash, savings],
  };
}

describe('a book with one account (plan 30)', () => {
  const single: AppData = {
    categories: cats,
    months: [{ key: '2026-10', startedAt: 0, opening: 50000 }, { key: '2026-11', startedAt: 1 }],
    entries: [e('2026-10', 'income', 'Gehalt', 300000, true), e('2026-10', 'fixed', 'Miete', 100000, false), e('2026-11', 'groceries', 'Markt', 5000, true)],
  };

  it('looks and balances as before: the whole book is the main account', () => {
    expect(hasAccounts(single)).toBe(false);
    expect(accountsOf(single).map(a => a.id)).toEqual([MAIN_ACCOUNT]);
    expect(accountView(single, MAIN_ACCOUNT)).toBe(single);
    expect(accountView(single, ALL_ACCOUNTS)).toBe(single);
    expect(computeBalances(single, ALL_ACCOUNTS)).toEqual(computeBalances(single));
    expect(computeBalances(single).map(b => [b.key, b.now, b.end])).toEqual([['2026-10', 350000, 250000], ['2026-11', 345000, 245000]]);
    expect(computeBalances(single).some(b => 'transferPaid' in b)).toBe(false);
  });

  it('loads data from before accounts as one account, and adds none', () => {
    const loaded = normalizeState(JSON.parse(JSON.stringify(single)));
    expect(loaded).not.toHaveProperty('accounts');
    expect(loaded.entries.every(x => x.accountId === undefined && x.transfer === undefined)).toBe(true);
  });
});

describe('several accounts', () => {
  const d = book();

  it('balance per account, transfers moving only their two accounts', () => {
    const at = (account: string) => computeBalances(d, account).map(b => [b.key, b.now, b.end]);
    // Main: 1.000 + 3.000 − 1.000 − 200 = 2.800 now; the open 500 to savings → 2.300 at the end.
    expect(at(MAIN_ACCOUNT)).toEqual([['2026-10', 280000, 230000], ['2026-11', 280000, 230000]]);
    // Cash: 50 + 200 − 40 = 210; November's bread still open.
    expect(at('cash')).toEqual([['2026-10', 21000, 21000], ['2026-11', 21000, 20000]]);
    // Savings: 3.000, and 500 more once the transfer is made.
    expect(at('sav')).toEqual([['2026-10', 300000, 350000], ['2026-11', 300000, 350000]]);
  });

  it('all accounts together: the sum, where every transfer comes to nothing', () => {
    const all = computeBalances(d, ALL_ACCOUNTS);
    expect(all.map(b => [b.key, b.now, b.end])).toEqual([['2026-10', 601000, 601000], ['2026-11', 601000, 600000]]);
    expect(all[0].transferPaid).toBe(0);
    expect(all[0].transferOpen).toBe(0);
    expect(accountTotals(d, '2026-11')).toMatchObject({ now: 601000, end: 600000 });
    expect(accountTotals(d, '2026-11').accounts.map(a => [a.account.id, a.now])).toEqual([[MAIN_ACCOUNT, 280000], ['cash', 21000], ['sav', 300000]]);
  });

  it('never counts a transfer as income or expense', () => {
    const t = monthTotals(d.entries, d.categories, '2026-10');
    expect(t.incomePaid).toBe(300000);
    expect(t.expensePaid).toBe(104000);
    expect(t.expenseOpen).toBe(0);
    expect(t.count).toBe(3);
    const main10 = computeBalances(d)[0];
    expect([main10.incomePaid, main10.expensePaid, main10.transferPaid, main10.transferOpen]).toEqual([300000, 100000, -20000, -50000]);
    const b = buildBook(d);
    const oct = b.byMonth.get('2026-10')!;
    expect(oct.entries.some(x => x.transfer)).toBe(false);
    expect(oct.save.total).toBe(0);
    expect(topNames(d.entries, d.categories, ['2026-10']).map(x => x.name)).toEqual(['Miete', 'Markt']);
  });

  it('opening balances are kept per account', () => {
    const later: AppData = { ...d, months: d.months.map(m => (m.key === '2026-11' ? { ...m, openings: { cash: 1500 } } : m)) };
    expect(computeBalances(later, 'cash').map(b => [b.now, b.end, b.overridden])).toEqual([[21000, 21000, true], [1500, 500, true]]);
    expect(computeBalances(later).map(b => b.overridden)).toEqual([true, false]);
  });

  it('the view of one account has only its entries, and never a transfer', () => {
    expect(accountView(d, 'cash').entries.map(x => x.name)).toEqual(['Markt', 'Bäcker']);
    expect(accountView(d, ALL_ACCOUNTS).entries.map(x => x.name)).toEqual(['Gehalt', 'Miete', 'Markt', 'Bäcker']);
    expect(monthTransfers(d, '2026-10', 'cash').map(x => x.transfer!.direction)).toEqual(['in']);
    expect(monthTransfers(d, '2026-10', ALL_ACCOUNTS)).toHaveLength(4);
  });

  it('a transfer is two linked entries in the transfer category', () => {
    const [out, into] = makeTransfer({ from: 'cash', to: MAIN_ACCOUNT, amount: 1234.4, name: '  Einzahlen ', month: '2026-11', date: '2026-11-03', paid: true, repeat: 'none' }, 500, newId);
    expect(out).toMatchObject({ categoryId: TRANSFER_CATEGORY, accountId: 'cash', amount: 1234, name: 'Einzahlen', date: '2026-11-03', paidAt: 500, transfer: { direction: 'out' } });
    expect(into).not.toHaveProperty('accountId');
    expect(into.transfer).toEqual({ pairId: out.transfer!.pairId, direction: 'in' });
    expect(transferPair([out, into], out.transfer!.pairId)).toEqual({ out, in: into });
  });

  it('carry-over keeps the account, and a carried transfer stays one transfer', () => {
    const next = carryCandidates(d, '2026-11');
    expect(next.map(x => x.name).sort()).toEqual(['Miete', 'Sparen', 'Sparen']);
    const copies = carryOver(next, '2026-11', 900, newId);
    const sides = copies.filter(x => x.transfer);
    expect(sides.map(x => x.transfer!.direction).sort()).toEqual(['in', 'out']);
    expect(sides[0].transfer!.pairId).toBe(sides[1].transfer!.pairId);
    expect(sides[0].transfer!.pairId).not.toBe(d.entries.find(x => x.name === 'Sparen')!.transfer!.pairId);
    expect(sides.find(x => x.transfer!.direction === 'in')!.accountId).toBe('sav');
    const cashRent = carryOver([e('2026-10', 'fixed', 'Garage', 5000, true, { accountId: 'cash', repeat: 'monthly' })], '2026-11', 1, newId);
    expect(cashRent[0].accountId).toBe('cash');
  });

  it('a recurring transfer added in a month with later months goes into them as one transfer each', () => {
    const pair = makeTransfer({ from: MAIN_ACCOUNT, to: 'sav', amount: 1000, name: 'Dauerauftrag', month: '2026-10', paid: true, repeat: 'monthly' }, 1, newId);
    const later = laterTransferCopies(d, pair, 10, newId);
    expect(later.map(x => [x.month, x.transfer!.direction, x.paid])).toEqual([['2026-11', 'out', false], ['2026-11', 'in', false]]);
    expect(later[0].transfer!.pairId).toBe(later[1].transfer!.pairId);
  });

  it('imports go into the account they are made for', () => {
    const rows = [e('2026-11', 'groceries', 'Rewe', 2300, true), e('2026-11', 'income', 'Erstattung', 500, true)];
    expect(intoAccount(rows, MAIN_ACCOUNT)).toBe(rows);
    expect(intoAccount(rows, 'cash').map(x => x.accountId)).toEqual(['cash', 'cash']);
    const d2: AppData = { ...d, entries: [...d.entries, ...intoAccount(rows, 'cash')] };
    expect(computeBalances(d2, 'cash')[1].now).toBe(21000 - 2300 + 500);
    expect(computeBalances(d2)[1].now).toBe(280000);
  });

  it('an account may go only once nothing is booked on it; the main account stays', () => {
    expect(canDeleteAccount(d, 'cash')).toBe(false);
    expect(canDeleteAccount(d, MAIN_ACCOUNT)).toBe(false);
    expect(canDeleteAccount({ ...d, accounts: [main, cash, savings, { ...cash, id: 'wallet2' }] }, 'wallet2')).toBe(true);
  });
});

describe('accounts in storage and backups', () => {
  it('normalises: the main account first, unknown accounts and openings to the main account, transfers kept out of "Sonstiges"', () => {
    const raw = {
      categories: cats,
      months: [{ key: '2026-10', startedAt: 0, openings: { cash: 1000, gone: 5, main: 7 } }],
      entries: [
        { ...e('2026-10', 'groceries', 'A', 100, true), accountId: 'gone' },
        { ...e('2026-10', 'groceries', 'B', 100, true), accountId: 'main' },
        { ...e('2026-10', 'whatever', 'C', 100, true), transfer: { pairId: 'p', direction: 'out' } },
        { ...e('2026-10', 'transfer', 'D', 100, true) },
        { ...e('2026-10', 'groceries', 'E', 100, true), transfer: { pairId: 'p', direction: 'sideways' } },
      ],
      accounts: [{ ...cash, kind: 'nonsense', hue: 'neon', name: '  Geld\n bör se  ' }, { id: 'main', name: 'Giro' }, cash, { name: 'no id' }],
    };
    const d = normalizeState(raw);
    expect(d.accounts!.map(a => a.id)).toEqual([MAIN_ACCOUNT, 'cash']);
    expect(d.accounts![1]).toMatchObject({ kind: 'bank', hue: 'blue', name: 'Geld bör se' });
    expect(d.accounts![0]).toMatchObject({ name: 'Giro', kind: 'bank', emoji: '🏦' });
    expect(d.months[0].openings).toEqual({ cash: 1000 });
    const by = (name: string) => d.entries.find(x => x.name === name)!;
    expect(by('A')).not.toHaveProperty('accountId');
    expect(by('B')).not.toHaveProperty('accountId');
    expect(by('C')).toMatchObject({ categoryId: TRANSFER_CATEGORY, transfer: { pairId: 'p', direction: 'out' } });
    expect(by('D').categoryId).toBe('extra');
    expect(by('E')).not.toHaveProperty('transfer');
  });

  it('a backup and the localStorage mirror carry the accounts', () => {
    const d = book();
    const again = parseBackup(JSON.stringify(makeBackup(d)));
    expect(again.ok && again.data).toEqual(normalizeState(d));
    const store: Record<string, unknown> = {};
    writeLocal(d, (k, v) => { store[k] = JSON.parse(v); });
    expect(store['spartopf-accounts']).toHaveLength(3);
    expect(loadStored(key => store[key])).toEqual(normalizeState(d));
  });
});

describe('the CSV with accounts', () => {
  const labels = {
    header: ['Monat', 'Kategorie', 'Art', 'Name', 'Betrag', 'Status', 'Wiederholung', 'Fällig am', 'Notiz', 'Datum'],
    income: 'Einnahme', expense: 'Ausgabe', paid: 'bezahlt', open: 'offen',
    repeat: { none: 'einmalig', monthly: 'monatlich', yearly: 'jährlich' } as const, currency: 'Währung', tags: 'Tags',
    transfer: 'Umbuchung', account: 'Konto', mainAccount: 'Girokonto',
  };

  it('adds an account column, and signs a transfer by its side', () => {
    const lines = toCsv(book(), 'de', labels).replace('﻿', '').trim().split('\r\n');
    expect(lines[0].endsWith(';Währung;Tags;Konto')).toBe(true);
    expect(lines).toContain('2026-10;Umbuchung;Umbuchung;Abheben;-200,00;bezahlt;einmalig;;;;EUR;;Girokonto');
    expect(lines).toContain('2026-10;Umbuchung;Umbuchung;Abheben;200,00;bezahlt;einmalig;;;;EUR;;Bargeld');
    expect(lines.some(l => l.startsWith('2026-10;Lebensmittel und Drogerie;Ausgabe;Markt;-40,00;') && l.endsWith(';Bargeld'))).toBe(true);
  });

  it('has no account column while there is one account', () => {
    const one: AppData = { categories: cats, months: [{ key: '2026-10', startedAt: 0 }], entries: [e('2026-10', 'fixed', 'Miete', 100000, true)] };
    expect(toCsv(one, 'de', labels).split('\r\n')[0].endsWith(';Tags')).toBe(true);
  });
});
