import { AppData, MonthKey } from '../types';
import { ALL_ACCOUNTS, AccountView, MonthBalance, accountOf, dayOfMonth, daysInMonth, hasAccounts, monthKeyOf } from '../logic';
import { entryDay } from './book';

/*
 * A month's balance day by day, for the line on the balance card: from what
 * the month opened with, through every paid entry on its day up to today —
 * so the line stands at *Jetzt auf dem Konto* today — and on through what
 * is still open, to *Am Monatsende*. The same entries the two balances are
 * made of (`computeBalances`), only laid out along the month; a transfer
 * moves its account, and comes to nothing over all of them.
 */

export interface MonthTrack {
  month: MonthKey;
  /** The balance at the month's start (`values[0]`) and at the end of each day: `values[d]` is day d. */
  values: number[];
  /**
   * How far the month has come: today's day in the running month, its last
   * day once it is over, 0 while it lies ahead. Up to here the line is what
   * happened; after it, what is still open.
   */
  today: number;
}

/**
 * Null for a month not started, or one in which nothing moves the balance.
 * Paid entries count on their day, but never after today (a bill ticked
 * early is off the account already); open ones on their day, but never
 * before tomorrow (what is overdue still has to go out) — the month's last
 * day when they have none — and with them what earlier months left open.
 * So `values[today]` is *Jetzt auf dem Konto* and the last value *Am
 * Monatsende* (on the month's very last day nothing lies ahead any more,
 * and the two meet there).
 */
export function monthTrack(data: AppData, balance: MonthBalance, account: AccountView, today = new Date()): MonthTrack | null {
  if (!balance.started) return null;
  const month = balance.key;
  const days = daysInMonth(month);
  const now = monthKeyOf(today);
  const at = month < now ? days : month === now ? Math.min(days, dayOfMonth(today)) : 0;
  const every = account === ALL_ACCOUNTS || !hasAccounts(data);
  const income = new Set(data.categories.filter(c => c.kind === 'income').map(c => c.id));
  const moves = Array.from({ length: days + 1 }, () => 0);
  let any = false;
  const put = (day: number, amount: number) => {
    if (!amount) return;
    moves[Math.max(1, Math.min(days, day))] += amount;
    any = true;
  };
  for (const e of data.entries) {
    if (e.month !== month || (!every && accountOf(e) !== account)) continue;
    const amount = (e.transfer ? e.transfer.direction === 'in' : income.has(e.categoryId)) ? e.amount : -e.amount;
    const day = entryDay(e);
    if (e.paid) put(at ? Math.min(day ?? 1, at) : day ?? 1, amount);
    else put(Math.max(day ?? days, at + 1), amount);
  }
  // Open bills of earlier months: they still have to be settled, so they wait just ahead.
  put(at + 1, balance.openingEnd - balance.openingNow);
  if (!any) return null;
  const values = [balance.openingNow];
  for (let d = 1; d <= days; d++) values.push(values[d - 1] + moves[d]);
  return { month, values, today: at };
}
