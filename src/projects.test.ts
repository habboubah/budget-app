import { describe, expect, it } from 'vitest';
import { makeBackup, normalizeState, parseBackup, projectTag } from './logic';
import { fromProjectCurrency, isActiveProject, projectStatus, projectsOverview } from './insights';
import { defaultCategories } from './data/defaults';
import { AppData, Entry, Project } from './types';

/* Trips and projects (schema 28): a tag with a budget and dates. */
const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, euros: number, tags: string[] = [], extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `p${n}`, month, categoryId, name: `x${n}`, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `p${n}`, createdAt: n, ...(tags.length ? { tags } : {}), ...extra };
}
const trip: Project = { id: 't', name: 'Urlaub Türkei', emoji: '🏖️', tag: 'urlaub-türkei', budget: 200000, from: '2026-11-09', to: '2026-11-18', currency: 'TRY', rate: 38.5, createdAt: 1 };
const today = new Date(2026, 10, 11);
const book = (entries: Entry[], projects: Project[] = [trip]): AppData => ({ categories: cats, entries, months: [{ key: '2026-11', startedAt: 1 }], projects });

describe('what a project comes to', () => {
  const data = book([
    e('2026-10', 'travel', 600, ['urlaub-türkei']),
    e('2026-11', 'restaurants', 80, ['urlaub-türkei']),
    e('2026-11', 'groceries', 50, ['urlaub-türkei'], { paid: false }),
    e('2026-11', 'travel', -30, ['urlaub-türkei'], { refund: true }),
    e('2026-11', 'groceries', 999),
    e('2026-11', 'income', 500, ['urlaub-türkei']),
  ]);

  it('counts everything with its tag, across categories and months — refunds off, income not at all', () => {
    expect(projectStatus(data, trip, today)).toMatchObject({ paid: 65000, open: 5000, spent: 70000, count: 4, left: 130000, active: true });
  });

  it('knows its days and what is left per day, today included', () => {
    const s = projectStatus(data, trip, today);
    expect(s.days).toEqual({ total: 10, gone: 3 });
    // 1.300 € over the eight days from today to the 18th.
    expect(s.perDay).toBe(16250);
  });

  it('is offered between its dates, and not once closed', () => {
    expect(isActiveProject(trip, new Date(2026, 10, 8))).toBe(false);
    expect(isActiveProject(trip, new Date(2026, 10, 18))).toBe(true);
    expect(isActiveProject(trip, new Date(2026, 10, 19))).toBe(false);
    expect(isActiveProject({ ...trip, from: undefined, to: undefined }, today)).toBe(true);
    expect(isActiveProject({ ...trip, closed: true }, today)).toBe(false);
  });

  it('has no "left" without a budget, and lists the running ones first', () => {
    const move: Project = { id: 'm', name: 'Umzug', emoji: '🚚', tag: 'umzug', closed: true, createdAt: 2 };
    const later: Project = { id: 'l', name: 'Skiurlaub', emoji: '🎿', tag: 'skiurlaub', from: '2027-02-01', to: '2027-02-07', createdAt: 3 };
    const all = projectsOverview(book(data.entries, [move, later, trip]), today);
    expect(all.map(s => s.project.id)).toEqual(['t', 'l', 'm']);
    expect(all[2]).toMatchObject({ left: null, perDay: null, spent: 0 });
  });
});

describe('a trip abroad', () => {
  it('turns what was typed into the book’s currency', () => {
    expect(fromProjectCurrency(45000, trip)).toBe(1169);
    expect(fromProjectCurrency(45000, {})).toBe(45000);
  });
});

describe('stored projects', () => {
  it('make a tag of the name', () => {
    expect(projectTag('Urlaub Türkei 2027')).toBe('urlaub-türkei-2027');
    expect(projectTag('  #Umzug,  neu ')).toBe('umzug-neu');
    expect(projectTag('  ')).toBe('');
  });

  it('keep what is valid: a rate only with its currency, an end not before the start, one project per tag', () => {
    const back = normalizeState({ categories: cats, entries: [], months: [], projects: [
      trip,
      { id: 'a', name: 'Ohne Kurs', tag: 'ohne-kurs', currency: 'TRY' },
      { id: 'b', name: 'Falsche Daten', tag: 'daten', from: '2026-05-10', to: '2026-05-01' },
      { id: 'c', name: 'Doppelt', tag: 'urlaub-türkei' },
      { id: 'd', name: '' },
    ] }).projects!;
    expect(back.map(p => p.id)).toEqual(['t', 'a', 'b']);
    expect(back[0]).toEqual(trip);
    expect(back[1].currency).toBeUndefined();
    expect(back[2]).toMatchObject({ from: '2026-05-10' });
    expect(back[2].to).toBeUndefined();
  });

  it('travel in a backup', () => {
    const parsed = parseBackup(JSON.stringify(makeBackup(book([]))));
    expect(parsed.ok && parsed.data.projects).toEqual([trip]);
  });
});
