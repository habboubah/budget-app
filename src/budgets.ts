import { AppData, Category, Entry, MonthKey } from './types';
import { dayOfMonth, daysInMonth, monthKeyOf, monthsBetween } from './logic';

/*
 * Budgets: what an expense category may cost (`limit`). Spending counts what
 * is paid and what is still open — an open bill is money already promised.
 *
 * Three kinds (schema 25):
 *  - a plain monthly budget: the same every month, nothing carried over;
 *  - a monthly budget with `rollover`: what was left in the months since
 *    `rolloverFrom` comes on top, what went over comes off — the budget of
 *    the month is `limit + carried`, never below zero;
 *  - a budget for the year (`limitPer: 'year'`): the calendar year's months
 *    up to the one shown count together against `limit`.
 */

export interface BudgetStatus {
  /** What the bar is measured against: the month's budget (with what was carried), or the year's. */
  limit: number;
  /** The amount as set on the category. */
  base: number;
  /** A month, or the calendar year up to the month shown. */
  period: 'month' | 'year';
  /** With rollover: what earlier months left (above zero) or overspent (below). Otherwise 0. */
  carried: number;
  paid: number;
  open: number;
  /** Paid and open together: what the month (the year so far) will have cost. */
  spent: number;
  /** What is left of the budget; below zero, over by that much. */
  left: number;
  /** How far the month (the year) has come: 0 before it, 1 after it; in the running one, up to the end of today. */
  elapsed: number;
  /** The running month, while something is left: per day until it ends, today included. Rounded down. Null for a year's budget. */
  perDay: number | null;
  /**
   * The running month pays out faster than an even pace would: more than ten
   * points ahead of `elapsed` (on the 7th of 30 days, more than a third
   * paid). Only what is paid counts — a bill entered early isn't spent early —
   * and only one-off spending: a recurring bill (the Kita on the 5th) comes
   * when it comes, so it is taken off the budget first, not measured on pace.
   * A year's budget is measured the same way against the year.
   */
  ahead: boolean;
}

/** A category's budget per month: the limit itself, or a twelfth of a year's — for averages and chart lines. */
export function monthlyLimit(category: Pick<Category, 'limit' | 'limitPer'>): number | undefined {
  if (!category.limit) return undefined;
  return category.limitPer === 'year' ? Math.round(category.limit / 12) : category.limit;
}

/** A budget's state in a month; null for a category without a budget (or an income one). */
export function budgetStatus(entries: Entry[], category: Category, month: MonthKey, today = new Date()): BudgetStatus | null {
  const base = category.limit;
  if (category.kind !== 'expense' || !base || base <= 0) return null;
  const yearly = category.limitPer === 'year';
  const year = month.slice(0, 4);
  const rollFrom = !yearly && category.rollover && category.rolloverFrom && category.rolloverFrom < month ? category.rolloverFrom : null;
  let paid = 0;
  let open = 0;
  // For the pace: the recurring bills (paid or not), and the one-offs paid.
  let recurring = 0;
  let oneOffPaid = 0;
  // With rollover: what the months from `rolloverFrom` up to the one before cost.
  let before = 0;
  for (const e of entries) {
    if (e.categoryId !== category.id || e.transfer) continue;
    const mine = yearly ? e.month.slice(0, 4) === year && e.month <= month : e.month === month;
    if (!mine) {
      if (rollFrom && e.month >= rollFrom && e.month < month) before += e.amount;
      continue;
    }
    if (e.paid) paid += e.amount; else open += e.amount;
    if (e.repeat !== 'none') recurring += e.amount;
    else if (e.paid) oneOffPaid += e.amount;
  }
  const carried = rollFrom ? base * monthsBetween(rollFrom, month) - before : 0;
  const limit = Math.max(0, base + carried);
  const spent = paid + open;
  const left = limit - spent;
  const now = monthKeyOf(today);
  const days = daysInMonth(month);
  const running = month === now;
  const inMonth = month < now ? 1 : month > now ? 0 : dayOfMonth(today) / days;
  // A year's budget: how far the year has come by this month (January = month 0 of 12).
  const elapsed = yearly ? (Number(month.slice(5, 7)) - 1 + inMonth) / 12 : inMonth;
  const free = limit - recurring;
  return {
    limit, base, period: yearly ? 'year' : 'month', carried, paid, open, spent, left, elapsed,
    perDay: !yearly && running && left > 0 ? Math.floor(left / (days - dayOfMonth(today) + 1)) : null,
    ahead: running && left > 0 && free > 0 && oneOffPaid / free > elapsed + 0.1,
  };
}

/**
 * Whether a change took a budget across a mark worth a word: 80 % used, or
 * over. `before` and `after` are the same budget around the change; the
 * higher mark wins, and a budget already past a mark says nothing again.
 */
export function budgetCrossing(before: BudgetStatus | null, after: BudgetStatus | null): 80 | 100 | null {
  if (!after || after.limit <= 0) return null;
  const was = before && before.limit > 0 ? before.spent / before.limit : 0;
  const is = after.spent / after.limit;
  if (is > 1 && was <= 1) return 100;
  if (is >= 0.8 && is <= 1 && was < 0.8) return 80;
  return null;
}

/** Every budget of a month, in the categories' order, and how many are within it. */
export function monthBudgets(data: AppData, month: MonthKey, categories: Category[] = data.categories, today = new Date()): {
  items: { category: Category; status: BudgetStatus }[];
  within: number;
} {
  const items = categories
    .map(category => ({ category, status: budgetStatus(data.entries, category, month, today) }))
    .filter((x): x is { category: Category; status: BudgetStatus } => x.status !== null);
  return { items, within: items.filter(x => x.status.left >= 0).length };
}

/** Rounds up to a figure a person would set: 5 € steps under 100 €, 10 € under 1.000 €, 50 € above. */
export function roundBudget(cents: number): number {
  const step = cents < 10_000 ? 500 : cents < 100_000 ? 1_000 : 5_000;
  return Math.ceil(cents / step) * step;
}

/**
 * A budget to start from: what the category cost on average over the last
 * three finished months (started months before today's; months without
 * spending in it count as nothing), rounded up (`roundBudget`). Null when no
 * month is finished yet or nothing was spent in them.
 */
export function suggestLimit(data: AppData, categoryId: string, today = new Date(), span = 3): { amount: number; average: number; months: number } | null {
  const now = monthKeyOf(today);
  const months = data.months.map(m => m.key).filter(k => k < now).sort().slice(-span);
  if (!months.length) return null;
  const inRange = new Set(months);
  const total = data.entries.reduce((s, e) => s + (e.categoryId === categoryId && inRange.has(e.month) ? e.amount : 0), 0);
  if (total <= 0) return null;
  const average = Math.round(total / months.length);
  return { amount: roundBudget(average), average, months: months.length };
}
