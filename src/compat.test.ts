import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION, computeBalances, makeBackup, parseBackup } from './logic';
import { loadStored } from './store';
import { AppData } from './types';

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

  it('a payload no version could have written loads as an empty book, not a crash', () => {
    const junk: Record<string, unknown> = { 'spartopf-meta': { seeded: true, schemaVersion: 4 }, 'spartopf-entries': 'nonsense', 'spartopf-months': [{ key: 'no' }] };
    expect(loadStored(key => junk[key]).entries).toEqual([]);
  });
});

describe('a backup from schema 8 (before budgets)', () => {
  const text = load('backup-schema-8.json');
  const parsed = parseBackup(text);

  it('loads', () => {
    expect(parsed.ok).toBe(true);
  });

  it('keeps its categories, the user’s own one too, and adds none', () => {
    if (!parsed.ok) return;
    expect(parsed.data.categories.map(c => c.id)).toEqual(['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children', 'u-pets']);
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
