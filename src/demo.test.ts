import { describe, expect, it } from 'vitest';
import { AppData, Category, Entry } from './types';
import { DEMO_LIMITS, DEMO_MONTHS, DEMO_OPENING, addDemoData, hasDemoData, isDemoEntry, removeDemoData } from './demo';
import { addMonths, carryCandidates, carryOver, computeBalances, isoDay, monthKeyOf, normalizeState } from './logic';
import { defaultCategories } from './data/defaults';
import { contractItems } from './contracts';
import { budgetStatus } from './budgets';
import { buildBook, contractHints, goalProgress } from './insights';

const today = new Date(2026, 10, 9, 10); // 9 Nov 2026, a Monday
const running = '2026-11';

/** A first launch: the built-ins and the running month, nothing entered. */
const fresh = (): AppData => ({
  categories: defaultCategories(),
  entries: [],
  months: [{ key: running, startedAt: 1_700_000_000_000, categories: ['income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children'] }],
});

/** Someone who has used the app for three months, with a category of their own and "Reisen" deleted. */
function lived(): AppData {
  const categories: Category[] = defaultCategories()
    .filter(c => c.id !== 'travel')
    .map(c => (c.id === 'groceries' ? { ...c, limit: 50_000 } : c));
  categories.push({ id: 'pets', names: { de: 'Hund' }, emoji: '🐾', hue: 'sand', kind: 'expense', repeat: 'none' });
  const e = (id: string, month: string, categoryId: string, name: string, amount: number, extra: Partial<Entry> = {}): Entry =>
    ({ id, month, categoryId, name, amount, paid: true, repeat: 'none', seriesId: id, createdAt: 1, date: `${month}-05`, ...extra });
  return {
    categories,
    entries: [
      e('u1', '2026-09', 'income', 'Gehalt', 240_000, { repeat: 'monthly', seriesId: 's-salary' }),
      e('u2', '2026-09', 'fixed', 'Miete', 95_000, { repeat: 'monthly', seriesId: 's-rent' }),
      e('u3', '2026-10', 'income', 'Gehalt', 240_000, { repeat: 'monthly', seriesId: 's-salary' }),
      e('u4', '2026-10', 'fixed', 'Miete', 95_000, { repeat: 'monthly', seriesId: 's-rent' }),
      e('u5', '2026-10', 'pets', 'Futter', 3_499),
      e('u6', '2026-11', 'fixed', 'Miete', 95_000, { repeat: 'monthly', seriesId: 's-rent', paid: false }),
    ],
    months: [
      { key: '2026-09', startedAt: 1_000, opening: 210_000, categories: ['income', 'fixed'] },
      { key: '2026-10', startedAt: 2_000 },
      { key: '2026-11', startedAt: 3_000 },
    ],
    contracts: { 's-rent': { notice: 3 } },
    favorites: [{ id: 'f1', name: 'Bäckerei', categoryId: 'restaurants', amount: 450 }],
    goals: [{ id: 'g1', name: 'Auto', emoji: '🚗', hue: 'carrot', target: 500_000, createdAt: 1 }],
    rules: [{ id: 'r1', match: { field: 'payee', contains: 'rewe' }, set: { categoryId: 'groceries' }, createdAt: 1 }],
    currency: 'EUR',
  };
}

const kept = (d: AppData, key: string) => {
  const income = new Set(d.categories.filter(c => c.kind === 'income').map(c => c.id));
  return d.entries.filter(e => e.month === key).reduce((s, e) => s + (income.has(e.categoryId) ? e.amount : -e.amount), 0);
};

describe('test data in a new book', () => {
  const data = addDemoData(fresh(), { today });

  it('covers a year: the twelve months before and the running one', () => {
    expect(data.months.map(m => m.key)).toEqual(Array.from({ length: DEMO_MONTHS }, (_, i) => addMonths('2025-11', i)));
    expect(data.months[0].opening).toBe(DEMO_OPENING);
    expect(data.demo?.months).toHaveLength(DEMO_MONTHS - 1); // the running month was already there
  });

  it('every entry is test data, with a unique id and a date inside its month', () => {
    expect(data.entries.length).toBeGreaterThan(400);
    expect(data.entries.every(isDemoEntry)).toBe(true);
    expect(new Set(data.entries.map(e => e.id)).size).toBe(data.entries.length);
    for (const e of data.entries) expect(e.date?.slice(0, 7)).toBe(e.month);
  });

  it('writes into many categories, each spending one with a budget', () => {
    const used = new Set(data.entries.map(e => e.categoryId));
    expect(used.size).toBeGreaterThanOrEqual(15);
    for (const c of data.categories) {
      if (used.has(c.id) && c.kind === 'expense') expect(c.limit, c.id).toBe(DEMO_LIMITS[c.id]);
    }
  });

  it('reads like a real household: rent, electricity, groceries, the pharmacy, trips', () => {
    const names = new Set(data.entries.map(e => e.name));
    for (const n of ['Miete', 'Strom (Abschlag)', 'REWE', 'Aldi Süd', 'Apotheke', 'Gehalt', 'Kindergeld', 'Hotel Bodensee (Booking.com)', 'Ferienwohnung Ostsee – Restzahlung']) {
      expect(names.has(n), n).toBe(true);
    }
  });

  it('has monthly and yearly bills, one-off spending, a split receipt and tags', () => {
    const series = (repeat: string) => new Set(data.entries.filter(e => e.repeat === repeat).map(e => e.seriesId));
    expect(series('monthly').size).toBeGreaterThanOrEqual(12);
    expect(series('yearly').size).toBeGreaterThanOrEqual(3);
    expect(data.entries.filter(e => e.repeat === 'none').length).toBeGreaterThan(300);
    expect(data.entries.filter(e => e.splitId)).toHaveLength(2);
    expect(data.entries.some(e => e.tags?.includes('urlaub'))).toBe(true);
    // A recurring bill is one series across the months (rent every month, the same series).
    const rent = data.entries.filter(e => e.name === 'Miete');
    expect(rent).toHaveLength(DEMO_MONTHS);
    expect(new Set(rent.map(e => e.seriesId)).size).toBe(1);
  });

  it('saves in some months and spends more than came in in others', () => {
    const finished = data.months.map(m => m.key).filter(k => k < running);
    expect(finished.filter(k => kept(data, k) > 0).length).toBeGreaterThanOrEqual(5);
    expect(finished.filter(k => kept(data, k) < 0).length).toBeGreaterThanOrEqual(3);
  });

  it('goes over some budgets and stays under others', () => {
    const limited = data.categories.filter(c => c.limit);
    const months = data.months.map(m => m.key);
    const over = months.flatMap(k => limited.filter(c => budgetStatus(data.entries, c, k, today)!.left < 0));
    const under = months.flatMap(k => limited.filter(c => budgetStatus(data.entries, c, k, today)!.left >= 0));
    expect(over.length).toBeGreaterThan(10);
    expect(under.length).toBeGreaterThan(over.length);
  });

  it('never lets the account go below zero', () => {
    for (const b of computeBalances(data)) expect(b.now, b.key).toBeGreaterThan(0);
  });

  it('the running month is paid up to today, with what is still to come open and one bill overdue', () => {
    const now = data.entries.filter(e => e.month === running);
    const day = isoDay(today);
    expect(now.filter(e => e.paid).every(e => e.date! <= day)).toBe(true);
    expect(now.filter(e => !e.paid && e.date! > day).length).toBeGreaterThan(5);
    expect(now.filter(e => !e.paid && e.date! < day).map(e => e.name)).toEqual(['Handwerker-Rechnung']);
    // Past months are settled.
    expect(data.entries.filter(e => e.month < running).every(e => e.paid)).toBe(true);
  });

  it('pins favourites and fills two savings pots', () => {
    expect(data.favorites?.length).toBeGreaterThanOrEqual(5);
    expect(data.goals).toHaveLength(2);
    for (const g of data.goals!) {
      const p = goalProgress(data, g, today);
      expect(p.saved).toBeGreaterThan(0);
      expect(p.reached).toBe(false);
    }
  });

  it('gives contracts a deadline: the gym this month, the car insurance by 30 November', () => {
    const items = contractItems(data, running, today);
    const by = (name: string) => items.find(i => i.name === name)?.deadline?.cancelBy;
    expect(by('Fitnessstudio')).toBe('2026-11-28');
    expect(by('Kfz-Versicherung')).toBe('2026-11-30');
    expect(by('Handyvertrag (O2)')).toBe('2026-12-18');
    // Spotify's price went up within the year.
    expect(items.find(i => i.name === 'Spotify Family')?.change?.by).toBe(200);
  });

  it('is the same for the same day: German for a German app, English for every other language', () => {
    expect(addDemoData(fresh(), { today })).toEqual(data);
    const en = addDemoData(fresh(), { today, language: 'en' });
    expect(en.entries.some(e => e.name === 'Rent')).toBe(true);
    expect(en.entries.some(e => e.name === 'Miete')).toBe(false);
    expect(en.goals?.map(g => g.name)).toEqual(['Holiday 2027', 'Emergency fund']);
    expect(en.favorites?.map(f => f.name)).toContain('Pharmacy');
    expect(en.entries.find(e => e.tags)?.tags).toEqual(['holiday']);
    // Arabic (and any language Haushaltsbuch Einfach adds later) gets the English names.
    expect(addDemoData(fresh(), { today, language: 'ar' })).toEqual(en);
    expect(addDemoData(fresh(), { today, language: 'tr' })).toEqual(en);
  });

  it('is added once', () => {
    expect(hasDemoData(data)).toBe(true);
    expect(hasDemoData(fresh())).toBe(false);
    expect(addDemoData(data, { today })).toBe(data);
  });

  it('removing it gives back the empty book', () => {
    expect(removeDemoData(data)).toEqual(fresh());
  });

  it('survives being stored and loaded, and still comes out cleanly', () => {
    const loaded = normalizeState(JSON.parse(JSON.stringify(data)));
    expect(loaded).toEqual(data);
    expect(removeDemoData(loaded)).toEqual(fresh());
  });
});

describe('test data beside the user’s own', () => {
  const before = lived();
  const data = addDemoData(before, { today });

  it('leaves the user’s entries, months, budgets and favourites as they are', () => {
    for (const e of before.entries) expect(data.entries.find(x => x.id === e.id)).toEqual(e);
    for (const m of before.months) expect(data.months.find(x => x.key === m.key)).toEqual(m);
    expect(data.categories.find(c => c.id === 'groceries')?.limit).toBe(50_000);
    expect(data.favorites?.[0]).toEqual(before.favorites![0]);
    expect(data.rules).toEqual(before.rules);
    // No second Bäckerei favourite; the cap holds.
    expect(data.favorites!.filter(f => f.name === 'Bäckerei' && f.categoryId === 'restaurants')).toHaveLength(1);
    expect(data.favorites!.length).toBeLessThanOrEqual(8);
  });

  it('brings back a deleted built-in it needs, and gives no opening to a month after the user’s', () => {
    expect(data.categories.some(c => c.id === 'travel')).toBe(true);
    expect(data.demo?.categories).toEqual(['travel']);
    expect(data.demo?.limits.groceries).toBeUndefined();
    // Its months come before the user's: the first one opens the book.
    expect(data.months[0]).toMatchObject({ key: '2025-11', opening: DEMO_OPENING });
  });

  it('removing it gives back exactly what was there', () => {
    expect(removeDemoData(data)).toEqual(before);
  });

  it('what the user adds while it is there stays when it goes', () => {
    const mine: Entry = { id: 'mine', month: '2026-03', categoryId: 'travel', name: 'Flug', amount: 19_900, paid: true, repeat: 'none', seriesId: 'mine', createdAt: 5 };
    const now: Entry = { id: 'now', month: running, categoryId: 'groceries', name: 'Lidl', amount: 2_350, paid: true, repeat: 'none', seriesId: 'now', createdAt: 6 };
    const changed: AppData = {
      ...data,
      entries: [...data.entries, mine, now],
      categories: data.categories.map(c => (c.id === 'health' ? { ...c, limit: 7_500 } : c)),
      favorites: [...data.favorites!.slice(0, 7), { id: 'f2', name: 'Kiosk', categoryId: 'extra' }],
    };
    const out = removeDemoData(changed);
    expect(out.entries.map(e => e.id)).toEqual([...before.entries.map(e => e.id), 'mine', 'now']);
    // The month with the user's flight stays (and the travel category with it); the other test months go.
    expect(out.months.map(m => m.key)).toEqual(['2026-03', '2026-09', '2026-10', '2026-11']);
    expect(out.categories.some(c => c.id === 'travel')).toBe(true);
    // A budget the user changed is theirs now; the ones left as set go.
    expect(out.categories.find(c => c.id === 'health')?.limit).toBe(7_500);
    expect(out.categories.find(c => c.id === 'car')?.limit).toBeUndefined();
    expect(out.favorites?.map(f => f.id)).toEqual(['f1', 'f2']);
    expect(out.goals?.map(g => g.id)).toEqual(['g1']);
    expect(out.contracts).toEqual(before.contracts);
    expect(out.demo).toBeUndefined();
  });

  it('copies carried into a month started later go too, and so does that month when it is left empty', () => {
    const next = addMonths(running, 1);
    let n = 0;
    const copies = carryOver(carryCandidates(data, next), next, today.getTime() + 1, () => `c${++n}`);
    const startWith = (list: Entry[]): AppData => ({
      ...data,
      entries: [...data.entries, ...list],
      months: [...data.months, { key: next, startedAt: today.getTime() + 1 }],
    });
    // Only test bills carried: the month is empty without them and goes.
    const onlyDemo = removeDemoData(startWith(copies.filter(isDemoEntry)));
    expect(onlyDemo.entries.some(e => e.seriesId.startsWith('demo-'))).toBe(false);
    expect(onlyDemo.months.some(m => m.key === next)).toBe(false);
    // The user's own rent came along too: that copy stays, and so does the month.
    const withRent = removeDemoData(startWith(copies));
    expect(withRent.entries.filter(e => e.month === next).map(e => e.seriesId)).toEqual(['s-rent']);
    expect(withRent.months.some(m => m.key === next)).toBe(true);
  });

  it('a month the user had started ahead gets the monthly bills too, and loses them again', () => {
    const ahead: AppData = { ...before, months: [...before.months, { key: '2026-12', startedAt: 4_000 }] };
    const withDemo = addDemoData(ahead, { today });
    const dec = withDemo.entries.filter(e => e.month === '2026-12');
    expect(dec.some(e => e.name === 'Miete' && !e.paid && isDemoEntry(e))).toBe(true);
    expect(removeDemoData(withDemo)).toEqual(ahead);
  });
});

describe('on any day of the year', () => {
  it('adds a clean year and removes it without a trace', () => {
    for (let d = new Date(2027, 0, 1, 9); d.getFullYear() === 2027; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9)) {
      const book = { ...fresh(), months: [{ key: monthKeyOf(d), startedAt: 1, categories: [] }] };
      const data = addDemoData(book, { today: d });
      const ids = new Set<string>();
      for (const e of data.entries) {
        if (e.date?.slice(0, 7) !== e.month) throw new Error(`${isoDay(d)}: ${e.id} dated ${e.date}`);
        if (ids.has(e.id)) throw new Error(`${isoDay(d)}: ${e.id} twice`);
        ids.add(e.id);
        if (e.paid && e.date! > isoDay(d)) throw new Error(`${isoDay(d)}: ${e.name} paid ahead of time`);
      }
      expect(removeDemoData(data)).toEqual(book);
    }
  });

  it('nothing occasional passes for a regular payment that is missing', () => {
    for (let d = new Date(2027, 0, 1, 9); d.getFullYear() === 2027; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9)) {
      const data = addDemoData({ ...fresh(), months: [{ key: monthKeyOf(d), startedAt: 1, categories: [] }] }, { today: d });
      expect(contractHints(buildBook(data), d).missing.map(h => h.name), isoDay(d)).toEqual([]);
    }
  });
});
