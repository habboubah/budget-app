import { AppData, Category, Entry, MonthKey } from './types';
import { daysInMonth, monthKeyOf } from './logic';

/*
 * Monthly budgets: what an expense category may cost a month (`limit`), the
 * same every month, nothing carried over. Spending counts what is paid and
 * what is still open — an open bill is money already promised.
 */

export interface BudgetStatus {
  limit: number;
  paid: number;
  open: number;
  /** Paid and open together: what the month will have cost. */
  spent: number;
  /** What is left of the budget; below zero, over by that much. */
  left: number;
  /** How far the month has come: 0 before it, 1 after it; in the running one, up to the end of today. */
  elapsed: number;
  /** The running month, while something is left: per day until it ends, today included. Rounded down. */
  perDay: number | null;
  /**
   * The running month pays out faster than an even pace would: more than ten
   * points ahead of `elapsed` (on the 7th of 30 days, more than a third
   * paid). Only what is paid counts — a bill entered early isn't spent early —
   * and only one-off spending: a recurring bill (the Kita on the 5th) comes
   * when it comes, so it is taken off the budget first, not measured on pace.
   */
  ahead: boolean;
}

/** A budget's state in a month; null for a category without a budget (or an income one). */
export function budgetStatus(entries: Entry[], category: Category, month: MonthKey, today = new Date()): BudgetStatus | null {
  const limit = category.limit;
  if (category.kind !== 'expense' || !limit || limit <= 0) return null;
  let paid = 0;
  let open = 0;
  // For the pace: the recurring bills (paid or not), and the one-offs paid.
  let recurring = 0;
  let oneOffPaid = 0;
  for (const e of entries) {
    if (e.month !== month || e.categoryId !== category.id) continue;
    if (e.paid) paid += e.amount; else open += e.amount;
    if (e.repeat !== 'none') recurring += e.amount;
    else if (e.paid) oneOffPaid += e.amount;
  }
  const spent = paid + open;
  const left = limit - spent;
  const now = monthKeyOf(today);
  const days = daysInMonth(month);
  const running = month === now;
  const elapsed = month < now ? 1 : month > now ? 0 : today.getDate() / days;
  const free = limit - recurring;
  return {
    limit, paid, open, spent, left, elapsed,
    perDay: running && left > 0 ? Math.floor(left / (days - today.getDate() + 1)) : null,
    ahead: running && left > 0 && free > 0 && oneOffPaid / free > elapsed + 0.1,
  };
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
