import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeBalances, leftPerDay, monthSettled, normalizeState } from './logic';
import { budgetRule, finishedMonths, monthSeries, savings } from './insights';
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
    const points = monthSeries(balances);
    const finished = finishedMonths(points, today, 12).map(p => p.key);
    const perMonth = balances.map(b => {
      const settled = monthSettled(b);
      // Per day as the balance card says it on the 15th of each month.
      const [y, m] = b.key.split('-').map(Number);
      return {
        month: b.key,
        now: b.now,
        end: b.end,
        net: settled.net,
        perDayOn15th: leftPerDay(settled.net, b.key, new Date(y, m - 1, 15, 10, 0)),
        rate: points.find(p => p.key === b.key)?.rate === null ? null : Math.round((points.find(p => p.key === b.key)!.rate ?? 0) * 10000) / 100,
      };
    });
    const budgets = data.categories
      .filter(c => c.limit)
      .map(c => ({ category: c.id, ...budgetStatus(data.entries, c, '2026-11', today) }));
    const rule = budgetRule(data.entries, data.categories, finished);
    const sv = savings(points.filter(p => finished.includes(p.key)));
    const contracts = contractItems(data, '2026-11', today);
    const golden = {
      perMonth,
      budgets,
      rule: { income: rule.income, met: rule.met, parts: rule.parts.map(p => ({ bucket: p.bucket, amount: p.amount, budget: p.budget, ok: p.ok })) },
      savings: sv,
      contracts: { ...contractTotals(contracts), deadlines: contracts.filter(i => i.deadline).map(i => [i.name, i.deadline]) },
      reminders: reminderPlan(data, { ...DEFAULT_REMINDERS, on: true }, translations.de, today).slice(0, 6).map(r => [r.at, r.title]),
    };
    await expect(`${JSON.stringify(golden, null, 1)}\n`).toMatchFileSnapshot('./fixtures/golden.json');
  });
});
