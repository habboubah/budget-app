import { AppData, Debt, Entry, MonthKey } from '../types';
import { addMonths, monthKeyOf } from '../logic';

/*
 * Debts and loans, and money lent (plan 31). A debt is what it was at its
 * start, plus interest each month after (monthly compounding, as banks
 * reckon an annuity loan), less what was paid back: the paid entries of its
 * linked recurring series and any entry carrying its id. Ahead of today the
 * monthly payment is projected until nothing is left. All pure, in cents,
 * tested in debts.test.ts.
 */

/** The longest a schedule is drawn ahead: fifty years. */
export const DEBT_HORIZON = 600;

/** One month of a debt: what was (or will be) paid, the interest, and what is left after. */
export interface DebtRow {
  month: MonthKey;
  payment: number;
  interest: number;
  balance: number;
  /** A month still ahead (or this month's payment not made yet). */
  planned: boolean;
}

export interface DebtPlan {
  debt: Debt;
  /** What is left today, after this month's payments so far; never below zero. */
  left: number;
  /** Everything paid back so far. */
  paid: number;
  /** Interest added so far. */
  interestPaid: number;
  /** The interest still to come if the payment stays; null when it never ends or no payment is known. */
  interestLeft: number | null;
  /** The monthly payment the projection uses (0 = none known). */
  monthly: number;
  /** The month it is (or was) paid off; null when no payment is known or it never ends. */
  payoff: MonthKey | null;
  /** The payment doesn't even cover the interest: it never ends. */
  never: boolean;
  /** Paid off already. */
  done: boolean;
  rows: DebtRow[];
}

/** The fixed monthly payment that pays `principal` off in `months` at `rate` % a year (an annuity), rounded to the cent. */
export function annuityPayment(principal: number, rate: number, months: number): number {
  if (months <= 0) return principal;
  if (!rate) return Math.ceil(principal / months);
  const r = rate / 100 / 12;
  return Math.round((principal * r) / (1 - (1 + r) ** -months));
}

/** What was paid back on a debt, month by month: the linked series' paid entries and every paid entry carrying its id. */
export function debtPayments(entries: Entry[], debt: Debt): Map<MonthKey, number> {
  const by = new Map<MonthKey, number>();
  for (const e of entries) {
    if (!e.paid || e.month < debt.start || e.transfer) continue;
    if (e.debtId !== debt.id && !(debt.seriesId && e.seriesId === debt.seriesId)) continue;
    by.set(e.month, (by.get(e.month) ?? 0) + e.amount);
  }
  return by;
}

/** The monthly payment when none is set: the linked series' latest amount. */
export function seriesPayment(entries: Entry[], debt: Debt): number {
  if (!debt.seriesId) return 0;
  let latest: Entry | undefined;
  for (const e of entries) if (e.seriesId === debt.seriesId && (!latest || e.month > latest.month)) latest = e;
  return latest?.amount ?? 0;
}

/**
 * A debt's schedule: the months from its start to today as they went, then
 * the monthly payment until it is paid off (at most `DEBT_HORIZON` months).
 * Interest runs from the month after the start; a month's payments come off
 * after its interest. This month's payment, when none was made yet, is the
 * first planned one.
 */
export function debtSchedule(debt: Debt, payments: Map<MonthKey, number>, monthly: number, today = new Date()): DebtPlan {
  const r = debt.rate ? debt.rate / 100 / 12 : 0;
  const now = monthKeyOf(today);
  const rows: DebtRow[] = [];
  let balance = debt.principal;
  let paid = 0;
  let interestPaid = 0;
  let payoff: MonthKey | null = null;
  // As it went: the start month up to this one.
  for (let m = debt.start; m <= now; m = addMonths(m, 1)) {
    const interest = m > debt.start && balance > 0 ? Math.round(balance * r) : 0;
    const payment = payments.get(m) ?? 0;
    balance += interest - payment;
    interestPaid += interest;
    paid += payment;
    rows.push({ month: m, payment, interest, balance: Math.max(0, balance), planned: false });
    if (balance <= 0 && payoff === null && (payment > 0 || debt.principal === 0)) payoff = m;
  }
  const left = Math.max(0, balance);
  const done = left === 0;
  if (done) return { debt, left, paid, interestPaid, interestLeft: 0, monthly, payoff: payoff ?? debt.start, never: false, done, rows };

  // Ahead: the monthly payment until nothing is left.
  let b = left;
  let interestLeft = 0;
  let never = false;
  payoff = null;
  if (monthly > 0) {
    // This month's payment, if it hasn't been made (and the debt didn't only start this month).
    let m = now;
    if ((payments.get(now) ?? 0) === 0 && now > debt.start) {
      const pay = Math.min(monthly, b);
      b -= pay;
      rows.push({ month: now, payment: pay, interest: 0, balance: b, planned: true });
      if (b === 0) payoff = now;
    }
    for (let i = 0; b > 0 && i < DEBT_HORIZON; i++) {
      m = addMonths(m, 1);
      const interest = Math.round(b * r);
      if (interest >= monthly) { never = true; break; }
      const pay = Math.min(monthly, b + interest);
      b += interest - pay;
      interestLeft += interest;
      rows.push({ month: m, payment: pay, interest, balance: b, planned: true });
      if (b === 0) payoff = m;
    }
    if (b > 0) never = true;
  }
  return {
    debt, left, paid, interestPaid, monthly, never, done: false, rows,
    interestLeft: monthly > 0 && !never ? interestLeft : null,
    payoff: never ? null : payoff,
  };
}

/** A debt's plan from the book: its payments, its monthly payment (set, or the linked series'), today. */
export function debtPlan(data: AppData, debt: Debt, today = new Date()): DebtPlan {
  const monthly = debt.payment ?? seriesPayment(data.entries, debt);
  return debtSchedule(debt, debtPayments(data.entries, debt), monthly, today);
}

/** Every debt's plan, the ones still open first, and what is owed each way in total. */
export function debtsOverview(data: AppData, today = new Date()): { plans: DebtPlan[]; owe: number; owed: number } {
  const plans = (data.debts ?? []).map(d => debtPlan(data, d, today))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.payoff ?? '9999-99').localeCompare(b.payoff ?? '9999-99') || b.left - a.left);
  const sum = (dir: Debt['direction']) => plans.reduce((s, p) => (p.debt.direction === dir ? s + p.left : s), 0);
  return { plans, owe: sum('owe'), owed: sum('owed') };
}

/** A recurring payment a debt can be linked to: each monthly series once, by its latest entry. */
export interface PaymentSeries { seriesId: string; name: string; amount: number; categoryId: string; income: boolean }

/** The monthly series in the book, newest entry each, by name — what a debt's payment can come from. */
export function paymentSeries(data: AppData): PaymentSeries[] {
  const income = new Set(data.categories.filter(c => c.kind === 'income').map(c => c.id));
  const latest = new Map<string, Entry>();
  for (const e of data.entries) {
    if (e.repeat !== 'monthly' || e.transfer) continue;
    const had = latest.get(e.seriesId);
    if (!had || e.month > had.month || (e.month === had.month && e.createdAt > had.createdAt)) latest.set(e.seriesId, e);
  }
  return [...latest.values()]
    .map(e => ({ seriesId: e.seriesId, name: e.name, amount: e.amount, categoryId: e.categoryId, income: income.has(e.categoryId) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
