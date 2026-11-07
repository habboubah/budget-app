import { AppData, Contract, Entry, MonthKey } from './types';
import { addMonths, dayInMonth, isoDay } from './logic';

/*
 * "Abos & Verträge": the recurring costs grown into a list of contracts.
 * Every monthly spending series of the month and every yearly one of the
 * last twelve months, with when it is due next, how its amount last changed,
 * and — once the user has said when it runs until and how much notice it
 * needs — the last day to cancel it. Pure, in cents, tested in
 * contracts.test.ts.
 */

export interface ContractItem {
  seriesId: string;
  name: string;
  categoryId: string;
  repeat: 'monthly' | 'yearly';
  /** What one payment costs now. */
  amount: number;
  monthly: number;
  yearly: number;
  /** The next payment: still open in its month, or the coming one; with its day when the series has one. */
  next: { month: MonthKey; date?: string; open: boolean };
  /** The amount's last change within the twelve months: by how much, from which month on. */
  change?: { by: number; since: MonthKey };
  contract?: Contract;
  /** When the user gave an end: the next end that can still be reached, and the last day to cancel for it. */
  deadline?: { endsOn: string; cancelBy: string };
}

/** A day moved by whole months, kept inside its month ("31 Jan" + 1 → "28 Feb"). */
export function shiftDay(iso: string, months: number): string {
  return dayInMonth(addMonths(iso.slice(0, 7), months), Number(iso.slice(8, 10)));
}

/** Days from today to a YYYY-MM-DD (negative when past), in local days. */
export function daysUntil(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
}

/**
 * The next end of a contract that can still be cancelled in time, and the
 * last day to do it: the end minus the notice — or, once that day has
 * passed, the end it renews to (by `renews` months, 12 unless set), counted
 * from the first end so the day doesn't drift. Null without an end.
 */
export function nextDeadline(c: Contract, today = new Date()): { endsOn: string; cancelBy: string } | null {
  if (!c.end) return null;
  const now = isoDay(today);
  const step = c.renews ?? 12;
  for (let k = 0; k < 600; k++) {
    const endsOn = shiftDay(c.end, k * step);
    const cancelBy = shiftDay(endsOn, -(c.notice ?? 0));
    if (cancelBy >= now) return { endsOn, cancelBy };
  }
  return null;
}

const dayOf = (e: Entry) => (e.date ? Number(e.date.slice(8, 10)) : e.dueDay);

/**
 * The month's contracts: the monthly spending series that have an entry in
 * `month`, and the yearly ones with one in the twelve months up to it — as
 * the fixed costs count them. Deadlines in the next 90 days come first,
 * soonest first; then the dearest per year.
 */
export function contractItems(data: AppData, month: MonthKey, today = new Date()): ContractItem[] {
  const kind = new Map(data.categories.map(c => [c.id, c.kind]));
  const from = addMonths(month, -11);
  const bySeries = new Map<string, Entry[]>();
  for (const e of data.entries) {
    if (kind.get(e.categoryId) !== 'expense' || e.month > month) continue;
    const list = bySeries.get(e.seriesId);
    if (list) list.push(e); else bySeries.set(e.seriesId, [e]);
  }
  const items: ContractItem[] = [];
  for (const [seriesId, list] of bySeries) {
    list.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.createdAt - b.createdAt));
    const latest = list[list.length - 1];
    if (latest.repeat === 'none') continue;
    if (latest.repeat === 'monthly' ? latest.month !== month : latest.month < from) continue;
    const repeat = latest.repeat;
    const nextMonth = latest.paid ? addMonths(latest.month, repeat === 'monthly' ? 1 : 12) : latest.month;
    const day = dayOf(latest);
    let change: ContractItem['change'];
    for (let i = list.length - 1; i > 0; i--) {
      if (list[i].amount === list[i - 1].amount) continue;
      if (list[i].month >= from) change = { by: list[i].amount - list[i - 1].amount, since: list[i].month };
      break;
    }
    const contract = data.contracts?.[seriesId];
    const deadline = contract ? nextDeadline(contract, today) : null;
    items.push({
      seriesId, name: latest.name, categoryId: latest.categoryId, repeat, amount: latest.amount,
      monthly: repeat === 'monthly' ? latest.amount : Math.round(latest.amount / 12),
      yearly: repeat === 'monthly' ? latest.amount * 12 : latest.amount,
      next: { month: nextMonth, open: !latest.paid, ...(day ? { date: dayInMonth(nextMonth, day) } : {}) },
      ...(change ? { change } : {}),
      ...(contract ? { contract } : {}),
      ...(deadline ? { deadline } : {}),
    });
  }
  const soon = (i: ContractItem) => (i.deadline && daysUntil(i.deadline.cancelBy, today) <= 90 ? i.deadline.cancelBy : null);
  return items.sort((a, b) => {
    const sa = soon(a);
    const sb = soon(b);
    if (sa && sb) return sa < sb ? -1 : sa > sb ? 1 : b.yearly - a.yearly;
    if (sa || sb) return sa ? -1 : 1;
    return b.yearly - a.yearly || a.name.localeCompare(b.name);
  });
}

/** What the contracts cost together, per month and per year. */
export function contractTotals(items: ContractItem[]): { monthly: number; yearly: number } {
  return { monthly: items.reduce((s, i) => s + i.monthly, 0), yearly: items.reduce((s, i) => s + i.yearly, 0) };
}
