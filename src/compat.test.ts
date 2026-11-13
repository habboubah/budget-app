import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION, computeBalances, makeBackup, parseBackup } from './logic';
import { loadStored, writeLocal } from './storage';
import { AppData } from './types';
import { debtPlan } from './insights';

/*
 * What earlier versions stored and backed up (src/fixtures/, synthetic data
 * only). Each must still load, keep what it held, and come to the same
 * balances. A new schema version adds its fixture here.
 */
const load = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const stored = (name: string): { raw: Record<string, unknown>; data: AppData } => {
  const raw = JSON.parse(load(name)) as Record<string, unknown>;
  return { raw, data: loadStored(key => raw[key]) };
};
const balances = (data: AppData) => computeBalances(data).map(b => [b.key, b.now, b.end]);
const total = (data: AppData) => data.entries.reduce((s, e) => s + e.amount, 0);
const rawEntries = (raw: Record<string, unknown>) => raw['spartopf-entries'] as { id: string; amount: number }[];

describe('what each version stored still loads', () => {
  it('version 1: every entry kept, built-ins brought up to date, balances unchanged', () => {
    const { raw, data } = stored('storage-v1.json');
    expect(data.entries).toHaveLength(rawEntries(raw).length);
    expect(total(data)).toBe(rawEntries(raw).reduce((s, e) => s + e.amount, 0));
    const cat = (id: string) => data.categories.find(c => c.id === id)!;
    expect(cat('fixed').names.de).toBe('Wohnen');
    expect(cat('extra').names.de).toBe('Sonstiges');
    expect(cat('groceries').names.de).toBe('Lebensmittel und Drogerie');
    expect(cat('income').emoji).toBe('💰');
    expect(cat('income').names.ar).toBe('الدخل');
    expect(data.categories.some(c => c.id === 'restaurants') && data.categories.some(c => c.id === 'children')).toBe(true);
    // Schema 7: a due day became the entry's date.
    expect(data.entries.find(e => e.id === 'a2')?.date).toBe('2025-09-01');
    expect(balances(data)).toEqual([
      ['2025-09', 333580, 331080],
      ['2025-10', 515550, 513050],
    ]);
  });

  it('version 3: the merged categories’ entries and month lists move to Wohnen and Sonstiges', () => {
    const { data } = stored('storage-v3.json');
    expect(data.categories.some(c => c.id === 'home' || c.id === 'other')).toBe(false);
    expect(data.entries.find(e => e.id === 'b3')).toMatchObject({ categoryId: 'fixed' });
    expect(data.entries.find(e => e.id === 'b3')).not.toHaveProperty('order');
    expect(data.entries.find(e => e.id === 'b4')).toMatchObject({ categoryId: 'extra' });
    expect(data.months[0].categories).not.toContain('home');
    expect(data.categories.find(c => c.id === 'insurance')?.names.de).toBe('Versicherungen');
    expect(balances(data)).toEqual([['2026-01', 295500, 294300]]);
  });

  it('version 6: entries with only a due day get their date, Kinder joins after Familie', () => {
    const { data } = stored('storage-v6.json');
    expect(data.entries.map(e => e.date)).toEqual(['2026-05-28', '2026-05-03', '2026-05-05']);
    const ids = data.categories.map(c => c.id);
    expect(ids.indexOf('children')).toBe(ids.indexOf('family') + 1);
    expect(balances(data)).toEqual([['2026-05', 42000, 337000]]);
  });

  it('version 9: budgets kept, no contracts needed, an imported transaction keeps its fingerprint', () => {
    const { data } = stored('storage-v9.json');
    expect(data.categories.find(c => c.id === 'groceries')?.limit).toBe(50000);
    expect(data.categories.find(c => c.id === 'restaurants')?.limit).toBe(10000);
    expect(data.contracts ?? {}).toEqual({});
    expect(data.entries.find(e => e.id === 'd4')?.ref).toBe('2026-10-11|-38.90|pizzeria');
    expect(balances(data)).toEqual([['2026-10', 289860, 289860]]);
  });

  it('version 17: currency, favourites, goals, rules and the test data’s record come back from localStorage', () => {
    const { data } = stored('storage-v17.json');
    expect(data.currency).toBe('CHF');
    expect(data.favorites).toEqual([{ id: 'f1', name: 'Bäckerei', categoryId: 'groceries', amount: 480 }]);
    expect(data.goals?.map(g => g.id)).toEqual(['g1']);
    expect(data.rules?.map(r => r.id)).toEqual(['r1']);
    expect(data.demo).toEqual({ addedAt: 1791000000000, months: [], limits: { groceries: 65000 }, categories: ['investment'] });
    expect(balances(data)).toEqual([['2026-10', 365257, 365257]]);
  });

  it('a book written to localStorage reads back whole', () => {
    const { data } = stored('storage-v17.json');
    const store: Record<string, unknown> = {};
    writeLocal(data, (k, v) => { store[k] = JSON.parse(v); });
    expect(loadStored(key => store[key])).toEqual(data);
  });

  it('a payload no version could have written loads as an empty book, not a crash', () => {
    const junk: Record<string, unknown> = { 'spartopf-meta': { seeded: true, schemaVersion: 4 }, 'spartopf-entries': 'nonsense', 'spartopf-months': [{ key: 'no' }] };
    expect(loadStored(key => junk[key]).entries).toEqual([]);
  });

  it('version 18: category keywords — edited, emptied, untouched and the user’s own — stay as they were', () => {
    const { data } = stored('storage-v18.json');
    const cat = (id: string) => data.categories.find(c => c.id === id)!;
    expect(cat('groceries').keywords).toEqual(['Habibi Markt', 'Lidl', 'Rewe']);
    expect(cat('leisure').keywords).toEqual([]);
    expect(cat('fixed')).not.toHaveProperty('keywords');
    expect(cat('u-pets').keywords).toEqual(['Fressnapf', 'Tierarzt', 'Netflix']);
    // …and a backup carries them.
    const again = parseBackup(JSON.stringify(makeBackup(data)));
    expect(again.ok && again.data.categories.map(c => c.keywords)).toEqual(data.categories.map(c => c.keywords));
    expect(balances(data)).toEqual([['2026-11', 460710, 458311]]);
  });
  it('version 18 → 19: built-ins still named as shipped get the eleven new languages; the user’s own category stays', () => {
    const { data } = stored('storage-v18.json');
    const cat = (id: string) => data.categories.find(c => c.id === id)!;
    expect(cat('fixed').names).toMatchObject({ de: 'Wohnen', en: 'Home', ar: 'المنزل', tr: 'Ev', pl: 'Dom', fr: 'Logement', pt: 'Casa' });
    expect(Object.keys(cat('income').names)).toHaveLength(14);
    expect(cat('u-pets').names).toEqual({ de: 'Hund' });
  });
  it('version 20: accounts, transfers and opening balances come back from localStorage', () => {
    const { data: d } = stored('storage-v20.json');
    expect(d.accounts?.map(a => a.id)).toEqual(['main', 'a-cash']);
    expect(d.months.find(m => m.key === '2026-11')?.openings).toEqual({ 'a-cash': 8000 });
    expect(d.entries.filter(x => x.transfer)).toHaveLength(2);
    expect(computeBalances(d).map(b => [b.key, b.now, b.end])).toEqual([['2026-11', 239500, 229500]]);
    expect(computeBalances(d, 'a-cash').map(b => [b.key, b.now, b.end])).toEqual([['2026-11', 16700, 16700]]);
    expect(computeBalances(d, 'all').map(b => b.now)).toEqual([256200]);
  });
});

describe('version 21 (debts)', () => {
  it('a loan, an extra payment and money lent come back, with the same balances', () => {
    const { data } = stored('storage-v21.json');
    expect(data.debts?.map(d => [d.id, d.direction])).toEqual([['debt-car', 'owe'], ['debt-lena', 'owed']]);
    expect(data.entries.filter(e => e.debtId).map(e => e.id)).toEqual(['w3', 'w4']);
    expect(balances(data)).toEqual([['2026-10', 275000, 275000], ['2026-11', 210000, 210000]]);
    const today = new Date(2026, 10, 15, 10);
    // 10.000 € from September, 4,9 %: two payments of 250 € and one of 500 €.
    const car = debtPlan(data, data.debts![0], today);
    expect(car.paid).toBe(100000);
    expect(car.monthly).toBe(25000);
    const lena = debtPlan(data, data.debts![1], today);
    expect(lena.left).toBe(20000);
  });
});

describe('version 22 (receipts)', () => {
  it('an entry keeps what is attached to it, and the balances stay', () => {
    const { data } = stored('storage-v22.json');
    expect(data.entries.find(e => e.id === 'w3')?.files).toEqual([
      { id: 'rcpt-1', name: 'Bestätigung', type: 'image/jpeg', size: 184320 },
      { id: 'rcpt-2', name: 'Tilgungsplan', type: 'application/pdf', size: 90210 },
    ]);
    expect(balances(data)).toEqual([['2026-10', 275000, 275000], ['2026-11', 210000, 210000]]);
  });
});

describe('version 23 (month from payday)', () => {
  it('the month starts on the 25th: the salary of 27 October stays in November', () => {
    const { data } = stored('storage-v23.json');
    expect(data.monthStart).toBe(25);
    expect(data.entries.find(e => e.id === 'w5')).toMatchObject({ month: '2026-11', date: '2026-10-27' });
    expect(balances(data)).toEqual([['2026-10', 275000, 275000], ['2026-11', 410000, 410000]]);
  });

  it('a book without the setting starts its months on the 1st', () => {
    expect(stored('storage-v22.json').data.monthStart).toBeUndefined();
  });
});

describe('a backup from schema 8 (before budgets)', () => {
  const text = load('backup-schema-8.json');
  const parsed = parseBackup(text);

  it('loads', () => {
    expect(parsed.ok).toBe(true);
  });

  it('keeps its categories, the user’s own one too, and adds only schema 30’s “Verliehenes Geld”', () => {
    if (!parsed.ok) return;
    expect(parsed.data.categories.map(c => c.id)).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children', 'u-pets', 'lent']);
    expect(parsed.data.categories.find(c => c.id === 'u-pets')).toMatchObject({ names: { de: 'Hund' }, standard: false });
    expect(parsed.data.categories.some(c => c.limit !== undefined)).toBe(false);
  });

  it('keeps every entry as it was', () => {
    if (!parsed.ok) return;
    const raw = JSON.parse(text);
    expect(parsed.data.entries).toEqual(raw.entries);
  });

  it('comes to the same balances (golden)', () => {
    if (!parsed.ok) return;
    const b = computeBalances(parsed.data);
    expect(b.map(x => [x.key, x.now, x.end])).toEqual([
      ['2026-09', 406460, 400460],
      ['2026-10', 609450, 585450],
    ]);
  });

  it('survives being written again at the current schema', () => {
    if (!parsed.ok) return;
    const again = parseBackup(JSON.stringify(makeBackup(parsed.data)));
    expect(again.ok && again.data).toEqual(parsed.data);
    expect(makeBackup(parsed.data).schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('a backup from schema 9 (budgets)', () => {
  const parsed = parseBackup(load('backup-schema-9.json'));

  it('keeps the budgets of spending categories, in whole cents', () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const limit = (id: string) => parsed.data.categories.find(c => c.id === id)?.limit;
    expect(limit('groceries')).toBe(40000);
    expect(limit('children')).toBe(15000);
    // A fraction of a cent is rounded; a budget on income is dropped.
    expect(limit('restaurants')).toBe(12051);
    expect(limit('income')).toBeUndefined();
  });

  it('has no contracts yet, and that is fine', () => {
    if (!parsed.ok) return;
    expect(parsed.data.contracts ?? {}).toEqual({});
  });

  it('comes to the same balance (golden)', () => {
    if (!parsed.ok) return;
    const [nov] = computeBalances(parsed.data);
    // 5.854,50 € + nothing received − 1.050 € − 64,20 €; at the end + 3.200 € salary.
    expect([nov.now, nov.end]).toEqual([474030, 794030]);
  });
});

describe('version 24 (repeat intervals and an end)', () => {
  it('keeps a quarterly bill and an instalment with its last month', () => {
    const { data } = stored('storage-v24.json');
    expect(data.entries.find(e => e.id === 'x1')).toMatchObject({ repeat: 'yearly', every: 3 });
    expect(data.entries.find(e => e.id === 'x2')).toMatchObject({ repeat: 'monthly', until: '2027-01' });
    expect(total(data)).toBe(total(stored('storage-v22.json').data) + 5508 + 5000);
  });
});

describe('version 25 (yearly budgets and rollover)', () => {
  it('keeps a budget for the year and one whose rest moves on', () => {
    const { data } = stored('storage-v25.json');
    expect(data.categories.find(c => c.id === 'fixed')).toMatchObject({ limit: 60000, limitPer: 'year' });
    expect(data.categories.find(c => c.id === 'groceries')).toMatchObject({ limit: 30000, rollover: true, rolloverFrom: '2026-10' });
    expect(balances(data)).toEqual(balances(stored('storage-v24.json').data));
  });
});

describe('version 26 (refunds)', () => {
  it('keeps a refund negative, so the account ends 19,99 € higher', () => {
    const { data } = stored('storage-v26.json');
    expect(data.entries.find(e => e.id === 'x3')).toMatchObject({ amount: -1999, refund: true });
    const now = (d: AppData) => computeBalances(d).at(-1)!.now;
    expect(now(data)).toBe(now(stored('storage-v25.json').data) + 1999);
  });
});

describe('version 27 (warranty and return dates)', () => {
  it('keeps what a receipt is kept for', () => {
    const { data } = stored('storage-v27.json');
    expect(data.entries.find(e => e.id === 'x4')).toMatchObject({ returnUntil: '2026-11-26', warrantyUntil: '2028-11-12' });
  });
});

describe('version 28 (trips and projects)', () => {
  it('keeps a trip with its budget, dates and rate, and the entry tagged for it', () => {
    const { data } = stored('storage-v28.json');
    expect(data.projects).toEqual([{ id: 'trip', name: 'Urlaub Türkei', emoji: '🏖️', tag: 'urlaub-türkei', budget: 200000, from: '2026-11-09', to: '2026-11-18', currency: 'TRY', rate: 38.5, createdAt: 1793000000200 }]);
    expect(data.entries.find(e => e.id === 'x5')?.tags).toEqual(['urlaub-türkei']);
    expect(stored('storage-v27.json').data.projects).toBeUndefined();
  });
});

describe('version 29 (the tax mark)', () => {
  it('keeps an expense marked for the tax return', () => {
    const { data } = stored('storage-v29.json');
    expect(data.entries.find(e => e.id === 'x6')).toMatchObject({ tax: 'craftsman', amount: 8950 });
  });
  it('gains "Verliehenes Geld" on the upgrade to 30, in no month, and only once', () => {
    const { raw, data } = stored('storage-v29.json');
    const before = (raw['spartopf-categories'] as { id: string }[]).map(c => c.id);
    const ids = data.categories.map(c => c.id);
    expect(ids.slice(0, before.length)).toEqual(before);
    expect(ids[ids.length - 1]).toBe('lent');
    expect(ids.filter(id => id === 'lent')).toHaveLength(1);
    expect(data.categories.find(c => c.id === 'lent')).toMatchObject({ kind: 'expense', budget: 'save', emoji: '🤝', standard: false });
    expect(data.months.some(m => m.categories?.includes('lent'))).toBe(false);
  });
});

describe('version 30 (money lent)', () => {
  it('keeps money lent and what came back of it, netted in the category', () => {
    const { data } = stored('storage-v30.json');
    const lent = data.entries.filter(e => e.categoryId === 'lent');
    expect(lent.map(e => [e.name, e.amount, !!e.refund])).toEqual([['Geld an Sami', 30000, false], ['Sami zurückgezahlt', -10000, true]]);
    expect(lent.reduce((s, e) => s + e.amount, 0)).toBe(20000);
    expect(data.categories.filter(c => c.id === 'lent')).toHaveLength(1);
  });
});
