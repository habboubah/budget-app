import { addMonths, balanceFor, isoDay, monthKeyOf, periodRange, shiftDays } from '../logic';
import { dueDay, nextMonthDue } from '../due';
import { Book, monthOf } from './book';

/*
 * *Nächste 30 Tage* (Planen): the account day by day from today — what is
 * on it now, less every open expense on its day, plus every income still
 * expected. Only what is entered: no estimate of everyday spending, so the
 * line says "at least this is coming". It shows the lowest point before the
 * next salary, which the month's two balances and the twelve-month Ausblick
 * both skip over.
 */

export const RUNWAY_DAYS = 30;

export interface RunwayItem {
  name: string;
  categoryId: string;
  /** Cents as entered: an expense positive, a refund negative. */
  amount: number;
  income: boolean;
}

export interface RunwayDay {
  date: string;
  /** The balance at the end of the day. */
  balance: number;
  items: RunwayItem[];
}

export interface Runway {
  /** Jetzt auf dem Konto. */
  start: number;
  /** Today first, then each of the next `RUNWAY_DAYS` days. */
  days: RunwayDay[];
  /** The lowest end-of-day balance, the first day it is reached. */
  lowest: { index: number; date: string; balance: number };
  end: number;
  /** What goes out and what comes in over the days, cents. */
  out: number;
  in: number;
}

/** Null without a started month up to today, or when nothing open falls into the days. */
export function runway(book: Book, today = new Date(), horizon = RUNWAY_DAYS): Runway | null {
  const now = monthKeyOf(today);
  const latest = [...book.months].reverse().find(k => k <= now);
  if (!latest) return null;
  const first = isoDay(today);
  const last = shiftDays(first, horizon);
  const start = balanceFor(book.balances, latest).now;
  const days: RunwayDay[] = Array.from({ length: horizon + 1 }, (_, i) => ({ date: shiftDays(first, i), balance: 0, items: [] }));
  const index = new Map(days.map((d, i) => [d.date, i]));
  const put = (e: { name: string; categoryId: string; amount: number }, day: string) => {
    if (day > last) return;
    // Overdue, or due earlier this month: it still has to go out, so it counts today.
    const i = day < first ? 0 : index.get(day);
    if (i === undefined) return;
    days[i].items.push({ name: e.name, categoryId: e.categoryId, amount: e.amount, income: book.partOf(e.categoryId) === 'income' });
  };
  // Open entries up to the running month: on their day, without one at their month's end.
  for (const key of book.months) {
    if (key > now) break;
    for (const e of monthOf(book, key).entries) if (!e.paid) put(e, dueDay(e) ?? periodRange(key).last);
  }
  // The next month, with what it brings along (started or not); a transfer moves nothing overall.
  const next = nextMonthDue(book.data, today);
  if (next.month === addMonths(now, 1)) {
    for (const { entry, day } of next.items) if (!entry.transfer && day) put(entry, day);
  }
  if (!days.some(d => d.items.length)) return null;

  let balance = start;
  let out = 0;
  let inn = 0;
  for (const d of days) {
    for (const x of d.items) {
      if (x.income) { balance += x.amount; inn += x.amount; } else { balance -= x.amount; out += x.amount; }
    }
    d.balance = balance;
  }
  const low = days.reduce((b, d, i) => (d.balance < days[b].balance ? i : b), 0);
  return { start, days, lowest: { index: low, date: days[low].date, balance: days[low].balance }, end: balance, out, in: inn };
}
