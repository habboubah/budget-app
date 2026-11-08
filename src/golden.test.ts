import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeBalances, leftPerDay, monthSettled, normalizeState } from './logic';
import {
  budgetRule, buildBook, categoryDetail, financeCheck, finishedMonths, grundbedarf, highlights, monthReview, outlook, pace, savings, yearReview,
} from './insights';
import { budgetStatus } from './budgets';
import { contractItems, contractTotals } from './contracts';
import { reminderPlan, DEFAULT_REMINDERS } from './reminders';
import translations from './translations';

/*
 * The money rules on a whole year (src/fixtures/demo-year.json, synthetic,
 * frozen), against what they made of it when recorded (fixtures/golden.json).
 * A change to a money rule that moves any of these numbers has to update
 * golden.json on purpose — `npx vitest run -u` — and say why in the commit.
 */
const data = normalizeState(JSON.parse(readFileSync(new URL('./fixtures/demo-year.json', import.meta.url), 'utf8')));
// The 15th of November 2026, mid-morning: November is the running month.
const today = new Date(2026, 10, 15, 10, 0);

describe('the golden year', () => {
  it('comes to the recorded values', async () => {
    const balances = computeBalances(data);
    const book = buildBook(data, balances);
    // Statistik's series: what went into the ETF plan counts as saved (D1).
    const points = book.points;
    const finished = finishedMonths(points, today, 12).map(p => p.key);
    const perMonth = balances.map(b => {
      const settled = monthSettled(b);
      const p = points.find(x => x.key === b.key)!;
      // Per day as the balance card says it on the 15th of each month.
      const [y, m] = b.key.split('-').map(Number);
      return {
        month: b.key,
        now: b.now,
        end: b.end,
        net: settled.net,
        perDayOn15th: leftPerDay(settled.net, b.key, new Date(y, m - 1, 15, 10, 0)),
        spending: p.spending,
        invested: p.invested,
        saved: p.saved,
        rate: p.rate === null ? null : Math.round(p.rate * 10000) / 100,
      };
    });
    const budgets = data.categories
      .filter(c => c.limit)
      .map(c => ({ category: c.id, ...budgetStatus(data.entries, c, '2026-11', today) }));
    const rule = budgetRule(data.entries, data.categories, finished);
    const sv = savings(points.filter(p => finished.includes(p.key)));
    const contracts = contractItems(data, '2026-11', today);
    const p = pace(book, today);
    const o = outlook(book, today)!;
    const check = financeCheck(book, today)!;
    const october = monthReview(book, '2026-10', today);
    const groceries = categoryDetail(book, 'groceries', points.slice(-6).map(x => x.key), today)!;
    const year = yearReview(book, '2026', today);
    const golden = {
      perMonth,
      budgets,
      rule: { income: rule.income, met: rule.met, parts: rule.parts.map(x => ({ bucket: x.bucket, amount: x.amount, budget: x.budget, ok: x.ok })) },
      savings: sv,
      contracts: { ...contractTotals(contracts), deadlines: contracts.filter(i => i.deadline).map(i => [i.name, i.deadline]) },
      reminders: reminderPlan(data, { ...DEFAULT_REMINDERS, on: true }, translations.de, today).slice(0, 6).map(r => [r.at, r.title]),
      pace: { method: p.method, basis: p.basis, spent: p.spent, usualToday: p.usualToday, usualTotal: p.usualTotal, projected: p.projected, verdict: p.verdict },
      outlook: {
        from: o.from, everyday: o.everyday, grundbedarf: o.grundbedarf, headline: o.headline,
        months: o.months.map(m => [m.key, m.mid, m.lo, m.hi, m.big.map(b => b.name)]),
      },
      grundbedarf: grundbedarf(book, today),
      financeCheck: {
        plus: { rate: check.plus.rate, plusMonths: check.plus.plusMonths, months: check.plus.months.length, ok: check.plus.ok },
        onTime: check.onTime,
        reserve: check.reserve && { months: Math.round(check.reserve.months * 100) / 100, balance: check.reserve.balance, ok: check.reserve.ok },
      },
      highlights: highlights(book, today).map(i => [i.id, i.variant, i.values]),
      october: {
        point: october.point, usualSaved: october.usualSaved, budgets: { within: october.budgets.within, total: october.budgets.total },
        hints: october.hints.map(i => i.id), open: october.open, next: october.next,
      },
      groceries: { average: groceries.average, share: Math.round((groceries.share ?? 0) * 10000) / 100, soFar: groceries.soFar, payees: groceries.payees.slice(0, 3).map(x => [x.name, x.count, x.total]) },
      year: { income: year.income, spending: year.spending, saved: year.saved, top: year.top.map(x => [x.category.id, x.amount]), budgets: year.next.budgets.map(b => [b.category.id, b.amount]) },
    };
    await expect(`${JSON.stringify(golden, null, 1)}\n`).toMatchFileSnapshot('./fixtures/golden.json');
  });
});
