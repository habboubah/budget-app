import { MonthKey } from './types';
import { dateAt, isoDay } from './logic';

/*
 * The start (plan 39): three questions before the first month page — what is
 * on the account, what comes in every month, what goes out every month —
 * each one skippable. Pure and tested; StartFlow asks, App writes what
 * `startPlan` makes of the answers.
 */

export interface StartAnswers {
  /** What the banking app shows right now (cents; may be negative). */
  balance?: number;
  /** The month's income, and the day of the month it arrives (1–31). */
  income?: { amount: number; day?: number };
  /** The fixed costs that were filled in. */
  fixed: { name: string; amount: number; day?: number }[];
}

export interface StartEntry {
  kind: 'income' | 'expense';
  name: string;
  amount: number;
  /** Inside the month: its day, or the month's first when none was given. */
  date: string;
  /** Its day has come: the bank's balance already holds it. */
  paid: boolean;
}

export interface StartPlan {
  entries: StartEntry[];
  /** The month's opening that makes *Kontostand jetzt* the balance given. */
  opening?: number;
  /** *Am Monatsende*: the balance once what is still open has come and gone. */
  end?: number;
}

/**
 * The answers as entries of the running month, all monthly. Paid or open is
 * not asked: a day up to today is paid (or received) — the balance typed in
 * already holds it — a later one waits as open. Without a day an entry counts
 * from the month's first, so as paid. With a balance, the opening is what
 * makes the month arrive at it, and the end what is left once the open
 * entries are settled.
 */
export function startPlan(a: StartAnswers, month: MonthKey, incomeName: string, today = new Date()): StartPlan {
  const now = isoDay(today);
  const make = (kind: StartEntry['kind'], name: string, amount: number, day?: number): StartEntry => {
    const date = dateAt(month, day && day >= 1 ? day : 1);
    return { kind, name, amount, date, paid: date <= now };
  };
  const entries: StartEntry[] = [
    ...(a.income && a.income.amount > 0 ? [make('income', incomeName, a.income.amount, a.income.day)] : []),
    ...a.fixed.filter(f => f.amount > 0 && f.name.trim()).map(f => make('expense', f.name.trim(), f.amount, f.day)),
  ];
  if (a.balance === undefined) return { entries };
  const sign = (e: StartEntry) => (e.kind === 'income' ? e.amount : -e.amount);
  const settled = entries.filter(e => e.paid).reduce((s, e) => s + sign(e), 0);
  const open = entries.filter(e => !e.paid).reduce((s, e) => s + sign(e), 0);
  return { entries, opening: a.balance - settled, end: a.balance + open };
}
