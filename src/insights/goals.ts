import { AppData, Goal, MonthKey } from '../types';
import { monthKeyOf, monthsBetween } from '../logic';

/*
 * Savings goals, "Spartöpfe" (plan 12). Money "in" a goal is a paid entry in a
 * Sparen category carrying its `goalId`; the balances never change because of
 * a goal. All pure, tested.
 */

export interface GoalProgress {
  goal: Goal;
  /** `start` plus every paid entry that carries this goalId (cents). */
  saved: number;
  /** target − saved, never below zero. */
  left: number;
  /** saved / target, 0…1. */
  fraction: number;
  /** Reached the target. */
  reached: boolean;
  /** Per month to make the target by `due`, rounded up to whole euros; null without a due month or when reached. */
  monthlyNeed: number | null;
  /** Whole months left until `due` (0 when due this month or past); null without a due month. */
  monthsLeft: number | null;
}

/** What a goal has saved and what it still needs. */
export function goalProgress(data: AppData, goal: Goal, today = new Date()): GoalProgress {
  const fromEntries = data.entries.reduce((s, e) => (e.goalId === goal.id && e.paid ? s + e.amount : s), 0);
  const saved = (goal.start ?? 0) + fromEntries;
  const left = Math.max(0, goal.target - saved);
  const reached = saved >= goal.target;
  const fraction = goal.target > 0 ? Math.min(1, saved / goal.target) : 1;

  let monthsLeft: number | null = null;
  let monthlyNeed: number | null = null;
  if (goal.due) {
    monthsLeft = Math.max(0, monthsBetween(monthKeyOf(today), goal.due));
    if (!reached) {
      // Include the current month: n whole months plus this one.
      const span = monthsLeft + 1;
      monthlyNeed = Math.ceil(left / span / 100) * 100;
    }
  }
  return { goal, saved, left, fraction, reached, monthlyNeed, monthsLeft };
}

/** The open goals (not closed), newest first; closed ones stay in history. */
export function openGoals(data: AppData): Goal[] {
  return (data.goals ?? []).filter(g => !g.closedAt).sort((a, b) => b.createdAt - a.createdAt);
}

/** Whether the book has any savings category (`budget: 'save'`) a goal can be filled from. */
export function hasSavingsCategory(data: AppData): boolean {
  return data.categories.some(c => c.kind === 'expense' && c.budget === 'save');
}

/** The month (YYYY-MM) a due date falls in, for display helpers. */
export type GoalMonth = MonthKey;
