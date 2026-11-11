import { describe, expect, it } from 'vitest';
import { buildBook } from './book';
import { runway } from './runway';
import { defaultCategories } from '../data/defaults';
import { AppData, Entry } from '../types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, day: number | null, extra: Partial<Entry> = {}): Entry {
  n++;
  return {
    id: `w${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: false, repeat: 'none', seriesId: `w${n}`, createdAt: 0,
    ...(day ? { date: `${month}-${String(day).padStart(2, '0')}` } : {}), ...extra,
  };
}
const data = (entries: Entry[], months: { key: string; opening?: number }[]): AppData => ({ categories: cats, entries, months: months.map(m => ({ ...m, startedAt: 0 })) });
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10);

describe('the next 30 days', () => {
  const entries = [
    e('2026-11', 'income', 'Gehalt', 3000, 28, { repeat: 'monthly', seriesId: 'gehalt' }),
    e('2026-11', 'fixed', 'Miete', 1000, 1, { repeat: 'monthly', seriesId: 'miete', paid: true }),
    e('2026-11', 'fixed', 'Strom', 80, 15, { repeat: 'monthly', seriesId: 'strom' }),
    e('2026-11', 'car', 'Werkstatt', 400, 20),
    e('2026-11', 'groceries', 'Lidl', 50, 5, { paid: true }),
    e('2026-11', 'extra', 'Geschenk', 30, null),
  ];
  const book = buildBook(data(entries, [{ key: '2026-11', opening: 200000 }]));
  const r = runway(book, at(2026, 11, 11))!;

  it('starts from what is on the account now', () => {
    // 2.000 € − rent − Lidl, both paid.
    expect(r.start).toBe(200000 - 100000 - 5000);
    expect(r.days).toHaveLength(31);
    expect([r.days[0].date, r.days[30].date]).toEqual(['2026-11-11', '2026-12-11']);
  });
  it('takes each open entry on its day, an undated one at the month end', () => {
    expect(r.days[4]).toMatchObject({ date: '2026-11-15', balance: 95000 - 8000 });
    expect(r.days[9].balance).toBe(95000 - 8000 - 40000);
    expect(r.days[17]).toMatchObject({ date: '2026-11-28', balance: 95000 - 48000 + 300000 });
    expect(r.days[19].items.map(x => x.name)).toEqual(['Geschenk']);
  });
  it('brings along what the next month will carry: the rent on the 1st', () => {
    const dec1 = r.days[20];
    expect(dec1.date).toBe('2026-12-01');
    expect(dec1.items.map(x => x.name)).toContain('Miete');
    // Strom on 15 December lies past the 30 days.
    expect(r.days.flatMap(d => d.items).filter(x => x.name === 'Strom')).toHaveLength(1);
  });
  it('finds the lowest point, and what goes out and comes in', () => {
    expect(r.lowest).toEqual({ index: 9, date: '2026-11-20', balance: 47000 });
    expect(r.in).toBe(300000);
    expect(r.out).toBe(8000 + 40000 + 3000 + 100000);
    expect(r.end).toBe(r.start + r.in - r.out);
    expect(r.days[30].balance).toBe(r.end);
  });
  it('counts what is overdue today', () => {
    const late = runway(buildBook(data([...entries, e('2026-11', 'extra', 'Arzt', 60, 3)], [{ key: '2026-11', opening: 200000 }])), at(2026, 11, 11))!;
    expect(late.days[0].items.map(x => x.name)).toEqual(['Arzt']);
    expect(late.days[0].balance).toBe(95000 - 6000);
  });
  it('adds a refund that is still expected', () => {
    const back = runway(buildBook(data([e('2026-11', 'extra', 'Rücksendung', -25, 14, { refund: true })], [{ key: '2026-11', opening: 10000 }])), at(2026, 11, 11))!;
    expect(back.days[3].balance).toBe(12500);
    expect(back.lowest.index).toBe(0);
  });
  it('says nothing without a started month or without anything open', () => {
    expect(runway(buildBook(data([], [])), at(2026, 11, 11))).toBeNull();
    expect(runway(buildBook(data([e('2026-11', 'groceries', 'Lidl', 50, 5, { paid: true })], [{ key: '2026-11' }])), at(2026, 11, 11))).toBeNull();
  });
});
