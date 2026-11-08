import { MonthKey } from '../types';
import { addMonths, balanceFor, isOverdue, monthKeyOf } from '../logic';
import { Book, finishedKeys, monthOf } from './book';
import { MonthPoint } from './series';

/*
 * Finanz-Check (§9.6, D4): three plain indicators instead of a score —
 * more in than out, bills on time, the reserve in months of Grundbedarf
 * (D5). A fourth, "Vorausgeplant", joins with plans 11 and 12.
 */

/** Finanz-Check row 3 is "ok" from three months of Grundbedarf on; 3 to 6 is the rule of thumb. */
export const RESERVE_MIN = 3;
export const RESERVE_MAX = 6;

export interface Grundbedarf {
  /** Per month, in cents. */
  value: number;
  /** The finished months it is the average of. */
  months: MonthKey[];
  /** Of `value`: the yearly need bills of the last twelve months, per month. */
  yearly: number;
}

/**
 * What the household needs a month (§6): the average need spending of the
 * last up to twelve finished months without yearly bills, plus the yearly
 * need bills of the last twelve months ÷ 12. Null without a finished month.
 */
export function grundbedarf(book: Book, today = new Date()): Grundbedarf | null {
  const months = finishedKeys(book, today, 12);
  if (!months.length) return null;
  const regular = months.reduce((s, k) => { const n = monthOf(book, k).need; return s + n.total - n.yearly; }, 0) / months.length;
  const now = monthKeyOf(today);
  let yearly = 0;
  for (let i = 1; i <= 12; i++) yearly += monthOf(book, addMonths(now, -i)).need.yearly;
  return { value: Math.round(regular + yearly / 12), months, yearly: Math.round(yearly / 12) };
}

export interface FinanceCheck {
  /** Row 1, *Mehr rein als raus*: the Sparquote and how many months kept something. */
  plus: { rate: number | null; plusMonths: number; months: MonthKey[]; saved: number; income: number; ok: boolean };
  /** Row 2, *Rechnungen pünktlich*: open bills past their day. */
  onTime: { count: number; sum: number; ok: boolean };
  /** Row 3, *Notgroschen*: the running month's projected end ÷ Grundbedarf; from three finished months. */
  reserve: { months: number; balance: number; grundbedarf: Grundbedarf; ok: boolean } | null;
}

/** The Finanz-Check over the last up to six finished months; null before the first month is finished. */
export function financeCheck(book: Book, today = new Date()): FinanceCheck | null {
  const keys = new Set(finishedKeys(book, today, 6));
  if (!keys.size) return null;
  const points: MonthPoint[] = book.points.filter(p => keys.has(p.key));
  const income = points.reduce((s, p) => s + p.income, 0);
  const saved = points.reduce((s, p) => s + p.saved, 0);
  const rate = income > 0 ? saved / income : null;
  const plusMonths = points.filter(p => p.saved > 0).length;
  const plus = { rate, plusMonths, months: points.map(p => p.key), saved, income, ok: rate !== null && rate >= 0 && plusMonths * 3 >= points.length * 2 };

  const now = monthKeyOf(today);
  let count = 0;
  let sum = 0;
  for (const e of book.data.entries) {
    if (e.month > now || book.partOf(e.categoryId) === 'income' || !isOverdue(e, today)) continue;
    count++;
    sum += e.amount;
  }

  let reserve: FinanceCheck['reserve'] = null;
  const need = grundbedarf(book, today);
  if (finishedKeys(book, today).length >= 3 && need && need.value > 0) {
    const balance = balanceFor(book.balances, now).end;
    const months = Math.max(0, balance) / need.value;
    reserve = { months, balance, grundbedarf: need, ok: months >= RESERVE_MIN };
  }
  return { plus, onTime: { count, sum, ok: count === 0 }, reserve };
}
