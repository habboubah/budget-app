import { AppData, Debt, MonthKey } from '../types';
import { addMonths, monthsBetween } from '../logic';
import { Outlook } from './outlook';
import { debtPayments, debtPlan, debtSchedule } from './debts';

/*
 * "Kann ich mir das leisten?" — a planned purchase or a new monthly cost laid
 * over the Ausblick, and an extra payment laid over a debt's schedule. Nothing
 * is saved: these are the figures for a sheet the user closes again. Pure, in
 * cents; estimates, so the sheet rounds them ("≈").
 */

export interface WhatIfPlan {
  /** A purchase paid once, in this month. */
  once?: { amount: number; month: MonthKey };
  /** A cost that comes every month, from this month on. */
  monthly?: { amount: number; from: MonthKey };
}

export interface WhatIfMonth {
  key: MonthKey;
  /** The Ausblick's middle line at the month's end, as it is and with the plan. */
  before: number;
  after: number;
}

export interface WhatIf {
  months: WhatIfMonth[];
  /** The lowest month-end in the horizon, without the plan and with it. */
  low: { before: { month: MonthKey; amount: number }; after: { month: MonthKey; amount: number } };
  /** The last month's end, without the plan and with it. */
  end: { month: MonthKey; before: number; after: number };
  /** What the plan takes out of the account within the horizon. */
  cost: number;
  /**
   * ok: with the plan the account stays above one month of basic needs;
   * tight: below that in some month, still above zero; short: below zero.
   * `first` is the first month that is tight or short. Judged on the middle
   * line, like the Ausblick's own headline.
   */
  verdict: 'ok' | 'tight' | 'short';
  first?: MonthKey;
}

/** The Ausblick with a plan laid over it; null when the Ausblick has no months. */
export function whatIf(ahead: Outlook, plan: WhatIfPlan): WhatIf | null {
  if (!ahead.months.length) return null;
  const firstKey = ahead.months[0].key;
  const months: WhatIfMonth[] = ahead.months.map(m => {
    // Bought in the running month or before the first month ahead: it is gone from the start.
    const once = plan.once && plan.once.month <= m.key ? plan.once.amount : 0;
    const from = plan.monthly ? (plan.monthly.from < firstKey ? firstKey : plan.monthly.from) : null;
    const times = from && from <= m.key ? monthsBetween(from, m.key) + 1 : 0;
    return { key: m.key, before: m.mid, after: m.mid - once - times * (plan.monthly?.amount ?? 0) };
  });
  const lowest = (pick: (m: WhatIfMonth) => number) => {
    const m = months.reduce((a, b) => (pick(b) < pick(a) ? b : a));
    return { month: m.key, amount: pick(m) };
  };
  const last = months[months.length - 1];
  const short = months.find(m => m.after < 0);
  const tight = months.find(m => m.after < ahead.grundbedarf);
  return {
    months,
    low: { before: lowest(m => m.before), after: lowest(m => m.after) },
    end: { month: last.key, before: last.before, after: last.after },
    cost: last.before - last.after,
    verdict: short ? 'short' : tight ? 'tight' : 'ok',
    ...(short || tight ? { first: (short ?? tight)!.key } : {}),
  };
}

export interface ExtraPayment {
  /** The month the debt is paid off as things are, and with the extra payment; null: no end in sight. */
  before: MonthKey | null;
  after: MonthKey | null;
  /** How many months sooner; null when one of the two has no end. */
  monthsEarlier: number | null;
  /** Interest not paid thanks to the extra payment; null when it can't be told. */
  interestSaved: number | null;
  /** The monthly payment with the extra on top. */
  monthly: number;
}

/** What paying `extra` more every month does to a debt: when it ends, and the interest it saves. */
export function extraPayment(data: AppData, debt: Debt, extra: number, today = new Date()): ExtraPayment | null {
  const base = debtPlan(data, debt, today);
  if (base.done || extra <= 0) return null;
  const monthly = base.monthly + extra;
  const more = debtSchedule(debt, debtPayments(data.entries, debt), monthly, today);
  return {
    before: base.payoff,
    after: more.payoff,
    monthsEarlier: base.payoff && more.payoff ? Math.max(0, monthsBetween(more.payoff, base.payoff)) : null,
    interestSaved: base.interestLeft !== null && more.interestLeft !== null ? Math.max(0, base.interestLeft - more.interestLeft) : null,
    monthly,
  };
}

/** The months a plan can be set in: the running month and the Ausblick's own. */
export function whatIfRange(ahead: Outlook): { min: MonthKey; max: MonthKey } {
  return { min: ahead.from.key, max: ahead.months[ahead.months.length - 1]?.key ?? addMonths(ahead.from.key, 12) };
}
