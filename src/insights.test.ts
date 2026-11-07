import { describe, expect, it } from 'vitest';
import {
  averageMonths, averageSpans, unusualBasis, bestWorst, budgetRule, budgetSplit, categoryAverages, categoryMatrix, commitments, finishedMonths, forecast, monthSeries,
  monthsToYearEnd, reserveMonths, savings, unusual, priceChanges, missingRegulars, newNames, categoryTrends, biggestExpenses,
} from './insights';
import { computeBalances } from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

const cats = defaultCategories();
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `e${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: true, repeat: 'none', seriesId: `s-${name}`, createdAt: n, ...extra };
}
const M = { repeat: 'monthly' as const };

// Three months: salary 3000, rent 1000 (need), groceries (need), extras (want).
const entries = [
  e('2026-08', 'income', 'Gehalt', 3000, M), e('2026-08', 'fixed', 'Miete', 1000, M), e('2026-08', 'groceries', 'Lidl', 400), e('2026-08', 'extra', 'Amazon', 200),
  e('2026-09', 'income', 'Gehalt', 3000, M), e('2026-09', 'fixed', 'Miete', 1000, M), e('2026-09', 'groceries', 'Lidl', 400), e('2026-09', 'extra', 'Amazon', 400),
  e('2026-10', 'income', 'Gehalt', 3000, M), e('2026-10', 'fixed', 'Miete', 1000, M), e('2026-10', 'groceries', 'Lidl', 700), e('2026-10', 'extra', 'Amazon', 100),
  e('2026-10', 'car', 'Kfz-Steuer', 240, { repeat: 'yearly', seriesId: 'tax' }), e('2026-10', 'fixed', 'Handy', 20, M),
];
const data: AppData = { categories: cats, entries, months: ['2026-08', '2026-09', '2026-10'].map((key, i) => (i === 0 ? { key, opening: 100000, startedAt: 0 } : { key, startedAt: 0 })) };
const points = monthSeries(computeBalances(data));

describe('month series', () => {
  it('sums each started month, with its savings rate and end balance', () => {
    expect(points.map(p => [p.key, p.income, p.expense, p.saved, p.end])).toEqual([
      ['2026-08', 300000, 160000, 140000, 240000],
      ['2026-09', 300000, 180000, 120000, 360000],
      ['2026-10', 300000, 206000, 94000, 454000],
    ]);
    expect(points[0].rate).toBeCloseTo(140000 / 300000);
    expect(monthSeries(computeBalances(data), 2).map(p => p.key)).toEqual(['2026-09', '2026-10']);
  });
});

describe('categories over time', () => {
  it('puts each category’s total per month, only categories with money', () => {
    const m = categoryMatrix(entries, cats, ['2026-09', '2026-10'], 'expense');
    expect(m.categories.map(c => c.id)).toEqual(['fixed', 'car', 'extra', 'groceries']);
    expect(m.values.get('2026-10')?.get('fixed')).toBe(102000);
    expect(m.values.get('2026-09')?.get('car')).toBeUndefined();
    expect(m.max).toBe(102000);
    expect(categoryMatrix(entries, cats, ['2026-09'], 'income').categories.map(c => c.id)).toEqual(['income']);
    // Without a kind, income and expenses side by side.
    expect(categoryMatrix(entries, cats, ['2026-09', '2026-10']).categories.map(c => c.id)).toEqual(['income', 'fixed', 'car', 'extra', 'groceries']);
  });
  it('averages per category, income first, then expenses largest first', () => {
    const a = categoryAverages(entries, cats, ['2026-08', '2026-09', '2026-10']);
    expect(a.map(x => [x.category.id, x.average])).toEqual([
      ['income', 300000], ['fixed', 100667], ['groceries', 50000], ['extra', 23333], ['car', 8000],
    ]);
  });
});

describe('smart numbers', () => {
  it('leaves the running month out of averages', () => {
    expect(finishedMonths(points, new Date(2026, 9, 15)).map(p => p.key)).toEqual(['2026-08', '2026-09']);
    expect(finishedMonths(points, new Date(2026, 7, 2)).map(p => p.key)).toEqual(['2026-08']);
  });
  it('averages over the last few finished months, or all of them', () => {
    const today = new Date(2026, 10, 7);
    expect(averageMonths(points, 2, today)).toEqual(['2026-09', '2026-10']);
    expect(averageMonths(points, 0, today)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(averageMonths(points, 12, today)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(averageMonths(points, 3, new Date(2026, 9, 15))).toEqual(['2026-08', '2026-09']);
    expect(averageSpans(3)).toEqual([0]);
    expect(averageSpans(5)).toEqual([3, 0]);
    expect(averageSpans(13)).toEqual([3, 6, 12, 0]);
  });
  it('works out the savings rate over several months', () => {
    const s = savings(points);
    expect(s.rate).toBeCloseTo(354000 / 900000);
    expect(s.averageSaved).toBe(118000);
    expect(s.averageExpense).toBe(182000);
    expect(savings([]).rate).toBeNull();
  });
  it('turns the balance into months of spending, and projects it forward', () => {
    expect(reserveMonths(454000, 182000)).toBeCloseTo(2.49, 2);
    expect(reserveMonths(-5000, 182000)).toBe(0);
    expect(reserveMonths(454000, 0)).toBeNull();
    expect(forecast(454000, 118000, 2)).toBe(690000);
    expect(monthsToYearEnd('2026-10')).toBe(2);
    expect(monthsToYearEnd('2026-12')).toBe(0);
  });
  it('splits the average month 50/30/20-style into needs, wants and savings', () => {
    expect(budgetSplit(entries, cats, ['2026-08', '2026-09', '2026-10'])).toEqual({
      income: 300000, needs: 158667, wants: 23333, saved: 118000,
    });
  });
  it('counts money put into savings as saved, not spent, in the 50/30/20 split', () => {
    const month = [e('2026-10', 'income', 'Gehalt', 3000), e('2026-10', 'fixed', 'Miete', 1000), e('2026-10', 'leisure', 'Kino', 200),
      e('2026-10', 'investment', 'ETF-Sparplan', 300)];
    expect(budgetSplit(month, cats, ['2026-10'])).toEqual({ income: 300000, needs: 100000, wants: 20000, saved: 180000 });
  });
  it('checks the 50/30/20 rule on average and month by month', () => {
    const two = [
      e('2026-09', 'income', 'Gehalt', 3000), e('2026-09', 'fixed', 'Miete', 1500), e('2026-09', 'groceries', 'Lidl', 300), e('2026-09', 'leisure', 'Kino', 600),
      e('2026-10', 'income', 'Gehalt', 3000), e('2026-10', 'fixed', 'Miete', 1000), e('2026-10', 'groceries', 'Lidl', 200), e('2026-10', 'leisure', 'Kino', 600),
      e('2026-10', 'investment', 'ETF-Sparplan', 300),
    ];
    const r = budgetRule(two, cats, ['2026-09', '2026-10']);
    expect(r.parts.map(p => [p.bucket, p.amount, p.budget, Math.round(p.share!), p.ok])).toEqual([
      ['need', 150000, 150000, 50, true], ['want', 60000, 90000, 20, true], ['save', 90000, 60000, 30, true],
    ]);
    expect(r.met).toBe(3);
    expect(r.parts[0].top.map(x => [x.category.id, x.amount])).toEqual([['fixed', 125000], ['groceries', 25000]]);
    expect(r.parts[2].top.map(x => x.category.id)).toEqual(['investment']);
    // September spent 60 % on needs: two of three.
    expect(r.months).toEqual([{ key: '2026-09', met: 2 }, { key: '2026-10', met: 3 }]);
    expect(budgetRule([], cats, ['2026-10'])).toMatchObject({ income: 0, met: 0, months: [] });
  });
  it('lists recurring commitments per month and per year', () => {
    const c = commitments(data, '2026-10');
    expect(c.items.map(i => [i.name, i.monthly, i.yearly, i.repeat])).toEqual([
      ['Miete', 100000, 1200000, 'monthly'], ['Kfz-Steuer', 2000, 24000, 'yearly'], ['Handy', 2000, 24000, 'monthly'],
    ]);
    expect(c.yearly).toBe(1248000);
  });
  it('spots categories that differ from the usual', () => {
    const u = unusual(entries, cats, '2026-10', ['2026-08', '2026-09', '2026-10'], new Date(2026, 11, 1));
    expect(u.map(x => [x.category.id, x.total, x.usual, x.diff])).toEqual([
      ['extra', 10000, 30000, -20000], ['groceries', 70000, 40000, 30000],
    ].sort((a, b) => Math.abs(b[3] as number) - Math.abs(a[3] as number)));
    // While October is still running, only "more than usual" is worth saying.
    const running = unusual(entries, cats, '2026-10', ['2026-08', '2026-09', '2026-10'], new Date(2026, 9, 10));
    expect(running.map(x => x.category.id)).toEqual(['groceries']);
    expect(unusual(entries, cats, '2026-09', ['2026-08', '2026-09'])).toEqual([]);
  });
  it('compares several months with as many usual ones', () => {
    const hist = [
      ...['2026-03', '2026-04', '2026-05'].map(m => e(m, 'groceries', 'Lidl', 400)),
      ...['2026-06', '2026-07'].map(m => e(m, 'groceries', 'Lidl', 600)),
    ];
    const keys = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
    const u = unusual(hist, cats, ['2026-06', '2026-07'], keys, new Date(2026, 11, 1));
    expect(u.map(x => [x.category.id, x.total, x.usual, x.diff])).toEqual([['groceries', 120000, 80000, 40000]]);
    expect(unusualBasis(['2026-06', '2026-07'], keys)).toEqual(['2026-03', '2026-04', '2026-05']);
    // Fewer than two months before the period: nothing to compare with.
    expect(unusual(hist, cats, ['2026-04', '2026-05', '2026-06', '2026-07'], keys)).toEqual([]);
  });
  it('names the best and the weakest month', () => {
    expect(bestWorst(points)).toMatchObject({ best: { key: '2026-08' }, worst: { key: '2026-10' } });
    expect(bestWorst(points.slice(0, 1))).toBeNull();
  });
});

describe('hints', () => {
  const hist = [
    e('2026-07', 'fixed', 'Aras Energy', 83, M), e('2026-08', 'fixed', 'Aras Energy', 83, M), e('2026-09', 'fixed', 'Aras Energy', 83, M),
    e('2026-10', 'fixed', 'Aras Energy', 95, M), e('2026-09', 'fixed', 'Vodafone', 19.99, M), e('2026-10', 'fixed', 'Vodafone', 19.99, M),
    e('2026-07', 'fixed', 'Vodafone', 19.99, M), e('2026-08', 'fixed', 'Vodafone', 19.99, M),
    e('2026-09', 'groceries', 'Lidl', 40), e('2026-09', 'groceries', 'LIDL', 30), e('2026-10', 'groceries', 'Lidl', 50),
    e('2026-10', 'extra', 'C&A', 85.92), e('2026-10', 'extra', 'Apotheke', 12), e('2026-11', 'fixed', 'Aras Energy', 95, M),
    e('2026-08', 'fixed', 'Netflix', 13.99, M), e('2026-09', 'fixed', 'Netflix', 13.99, M), e('2026-10', 'fixed', 'Netflix', 13.99, M),
  ];
  it('finds monthly bills whose price changed', () => {
    expect(priceChanges(hist, cats, '2026-10').map(c => [c.name, c.before, c.now])).toEqual([['Aras Energy', 8300, 9500]]);
    expect(priceChanges(hist, cats, '2026-11')).toEqual([]);
  });
  it('lists what was there three months running but not this month', () => {
    expect(missingRegulars(hist, '2026-11').map(m => [m.name, m.usual])).toEqual([['Vodafone', 1999], ['Netflix', 1399]]);
    expect(missingRegulars(hist, '2026-12')).toEqual([]);
  });
  it('shows expenses under a name never booked before', () => {
    expect(newNames(hist, cats, '2026-10').map(x => x.name)).toEqual(['C&A', 'Apotheke']);
    expect(newNames(hist, cats, '2026-07')).toEqual([]);
  });
  it('spots categories trending over six months', () => {
    const six = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
    const g = six.map((m, i) => e(m, 'groceries', 'Lidl', i < 3 ? 300 : 420));
    const t = categoryTrends(g, cats, six);
    expect(t.map(x => [x.category.id, x.earlier, x.recent])).toEqual([['groceries', 30000, 42000]]);
    expect(categoryTrends(g, cats, six.slice(1))).toEqual([]);
  });
  it('names the biggest expenses with their share', () => {
    const b = biggestExpenses(entries, cats, '2026-10', 2);
    expect(b.map(x => [x.entry.name, Math.round(x.share * 100)])).toEqual([['Miete', 49], ['Lidl', 34]]);
    const two = biggestExpenses(entries, cats, ['2026-09', '2026-10'], 1);
    expect(two.map(x => [x.entry.name, x.entry.month])).toEqual([['Miete', '2026-09']]);
  });
});
