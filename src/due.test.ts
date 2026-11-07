import { describe, expect, it } from 'vitest';
import { dueGroups, dueSoon, dueTotals, nextMonthDue } from './due';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, paid: boolean, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `d${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid, repeat: 'none', seriesId: `d${n}`, createdAt: n, ...extra };
}
const nov7 = new Date(2026, 10, 7, 9);
const names = (xs: { entry: Entry }[]) => xs.map(x => x.entry.name);

describe('what is due', () => {
  const entries = [
    e('2026-11', 'car', 'Kfz-Versicherung', 54.26, false, { date: '2026-11-14' }),
    e('2026-11', 'income', 'Gehalt', 3513, false, { date: '2026-11-28' }),
    e('2026-11', 'fixed', 'Strom', 83, false, { date: '2026-11-03' }), // late by now
    e('2026-10', 'fixed', 'Internet', 39.99, false, { date: '2026-10-18' }), // last month, still open
    e('2026-11', 'extra', 'Geschenk', 30, false), // no day at all
    e('2026-11', 'fixed', 'Handy', 19.99, false, { dueDay: 22 }), // only a due day (older entries)
    e('2026-11', 'fixed', 'Miete', 1050, true, { date: '2026-11-01' }), // paid
    e('2026-12', 'fixed', 'Miete', 1050, false, { date: '2026-12-01' }), // a plan, not due
  ];

  it('lists the open ones up to this month: late first, then by day, undated last', () => {
    const due = dueSoon(entries, nov7);
    expect(names(due)).toEqual(['Internet', 'Strom', 'Kfz-Versicherung', 'Handy', 'Gehalt', 'Geschenk']);
    expect(due.filter(x => x.overdue).map(x => x.entry.name)).toEqual(['Internet', 'Strom']);
    expect(due.find(x => x.entry.name === 'Handy')!.day).toBe('2026-11-22');
    expect(due.find(x => x.entry.name === 'Geschenk')!.day).toBeUndefined();
  });

  it('groups them: overdue, today, tomorrow, day by day, without a day', () => {
    const more = [...entries, e('2026-11', 'groceries', 'Markt', 20, false, { date: '2026-11-07' }), e('2026-11', 'fixed', 'Abo', 9.99, false, { date: '2026-11-08' })];
    const groups = dueGroups(dueSoon(more, nov7), nov7);
    expect(groups.map(g => g.key)).toEqual(['overdue', 'today', 'tomorrow', '2026-11-14', '2026-11-22', '2026-11-28', 'undated']);
    expect(groups.map(g => g.items.length)).toEqual([2, 1, 1, 1, 1, 1, 1]);
    expect(groups[1]).toMatchObject({ kind: 'today', day: '2026-11-07' });
  });

  it('adds up what goes out and what comes in', () => {
    const kind = (id: string) => (id === 'income' ? 'income' as const : 'expense' as const);
    expect(dueTotals(dueSoon(entries, nov7), kind)).toEqual({ out: 22724, in: 351300 });
  });
});

describe('what the next month brings', () => {
  const categories = defaultCategories();
  const base: AppData = {
    categories,
    months: [{ key: '2026-11', startedAt: 0 }],
    entries: [
      e('2026-11', 'fixed', 'Miete', 1050, true, { repeat: 'monthly', seriesId: 'rent', date: '2026-11-01' }),
      e('2026-11', 'income', 'Gehalt', 3513, false, { repeat: 'monthly', seriesId: 'salary', date: '2026-11-28' }),
      e('2026-11', 'groceries', 'Lidl', 40, true, { date: '2026-11-02' }),
    ],
  };

  it('previews the recurring entries starting it would copy in, on their day', () => {
    const next = nextMonthDue(base, nov7);
    expect(next).toMatchObject({ month: '2026-12', started: false });
    expect(next.items.map(x => [x.entry.name, x.day, x.entry.paid])).toEqual([['Miete', '2026-12-01', false], ['Gehalt', '2026-12-28', false]]);
  });

  it('shows its own open entries once it is started', () => {
    const started: AppData = { ...base, months: [...base.months, { key: '2026-12', startedAt: 1 }], entries: [...base.entries, e('2026-12', 'fixed', 'Strom', 83, false, { date: '2026-12-03' })] };
    const next = nextMonthDue(started, nov7);
    expect(next.started).toBe(true);
    expect(names(next.items)).toEqual(['Strom']);
  });
});
