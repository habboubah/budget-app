import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION, computeBalances, makeBackup, parseBackup } from './logic';

/*
 * Backups as earlier versions wrote them (src/fixtures/). Each must still
 * load, keep what it held, and come to the same balances. Plan 01 adds one
 * fixture per schema version from here on.
 */
const load = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

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
