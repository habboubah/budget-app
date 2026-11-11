import { describe, expect, it } from 'vitest';
import { carryOver, computeBalances, monthTotals, normalizeState, toCsv } from './logic';
import { budgetStatus } from './budgets';
import { applyStatement, planStatement } from './statementImport';
import { buildBook, monthOf } from './insights';
import { defaultCategories } from './data/defaults';
import { AppData, Entry, MonthKey } from './types';

/*
 * Schema 26: a refund is an entry in an expense category with a negative
 * amount. Every sum goes down by it, the account goes up — it is not income.
 */
const cats = defaultCategories();
let n = 0;
function e(month: MonthKey, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `f${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `f${n}`, createdAt: n, date: `${month}-10`, ...extra };
}
const refund = (month: MonthKey, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}) =>
  e(month, categoryId, name, -euros, { refund: true, ...extra });
const book = (entries: Entry[]): AppData => ({ categories: cats, entries, months: [{ key: '2026-11', startedAt: 1, opening: 100000 }] });

describe('a refund', () => {
  const data = book([
    e('2026-11', 'income', 'Gehalt', 3000),
    e('2026-11', 'clothing', 'Zalando', 120),
    refund('2026-11', 'clothing', 'Zalando', 40),
    refund('2026-11', 'clothing', 'Zalando', 15, { paid: false }),
  ]);

  it('raises the account and lowers the spending — the income stays what it was', () => {
    const t = monthTotals(data.entries, cats, '2026-11');
    expect(t).toMatchObject({ incomePaid: 300000, expensePaid: 8000, expenseOpen: -1500 });
    const [b] = computeBalances(data);
    expect([b.now, b.end]).toEqual([100000 + 300000 - 8000, 100000 + 300000 - 6500]);
  });

  it('comes off the category in the statistics and its budget', () => {
    const m = monthOf(buildBook(data), '2026-11');
    expect(m.byCategory.get('clothing')!.total).toBe(6500);
    expect(m.income.total).toBe(300000);
    const clothing = { ...cats.find(c => c.id === 'clothing')!, limit: 10000 };
    expect(budgetStatus(data.entries, clothing, '2026-11', new Date(2026, 10, 11))).toMatchObject({ paid: 8000, open: -1500, spent: 6500, left: 3500 });
  });

  it('is written to the CSV as money coming in', () => {
    const csv = toCsv(data, 'de', { header: 'a;b;c;d;e;f;g;h;i;j'.split(';'), income: 'Einnahme', expense: 'Ausgabe', paid: 'bezahlt', open: 'offen',
      repeat: { none: 'Einmalig', monthly: 'Monatlich', yearly: 'Jährlich' }, currency: 'Währung', tags: 'Tags', transfer: 'Umbuchung', account: 'Konto', mainAccount: 'Girokonto' });
    const rows = csv.split('\n').filter(l => l.includes('Zalando')).map(l => l.split(';')[4]);
    expect(rows).toEqual(['-120,00', '40,00', '15,00']);
  });

  it('keeps its sign through a reload and a carry-over; any other minus is dropped', () => {
    const back = normalizeState({ ...data, entries: [...data.entries, { ...e('2026-11', 'car', 'Tanken', 50), amount: -5000 }] });
    expect(back.entries.map(x => x.amount)).toEqual([300000, 12000, -4000, -1500, 5000]);
    expect(back.entries.filter(x => x.refund)).toHaveLength(2);
    expect(carryOver([refund('2026-11', 'fixed', 'Gutschrift', 10, { repeat: 'monthly' })], '2026-12', 1)[0]).toMatchObject({ amount: -1000, refund: true });
  });

  it('in an income category is plain income', () => {
    const [x] = normalizeState(book([refund('2026-11', 'income', 'Erstattung', 30)])).entries;
    expect(x.amount).toBe(3000);
    expect(x.refund).toBeUndefined();
  });
});

describe('a refund from the bank', () => {
  const today = new Date(2026, 10, 11);
  const found = (name: string, euros: number, income: boolean) => ({ name, raw: name, amount: Math.round(euros * 100), income, date: '2026-11-09' });

  it('from a payee the user buys from lands in that payee’s category, as a refund', () => {
    const data = book([e('2026-11', 'clothing', 'Zalando', 120), e('2026-11', 'income', 'Gehalt', 3000)]);
    const rows = planStatement([found('Zalando', 39.9, true), found('Arbeitgeber GmbH', 500, true)], data, today);
    expect(rows.map(r => r.categoryId)).toEqual(['clothing', 'income']);
    const { add } = applyStatement(rows, 1, undefined, today, cats);
    expect(add[0]).toMatchObject({ categoryId: 'clothing', amount: -3990, refund: true, paid: true });
    expect(add[1]).toMatchObject({ categoryId: 'income', amount: 50000 });
    expect(add[1].refund).toBeUndefined();
  });

  it('ticks off a refund that was entered as awaited, instead of adding it twice', () => {
    const data = book([e('2026-11', 'clothing', 'Zalando', 120), refund('2026-11', 'clothing', 'Zalando', 39.9, { paid: false })]);
    const [row] = planStatement([found('Zalando', 39.9, true)], data, today);
    expect(row.status).toBe('pay');
  });
});
