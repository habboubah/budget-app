import { AppData, Entry, MonthKey } from './types';
import { addMonths, carryCandidates, carryOver, dayInMonth, isoDay, isOverdue, monthKeyOf } from './logic';

/*
 * "Demnächst fällig": what is still to pay or to come in, soonest first —
 * the open entries of the running month and of the months before it (those
 * are late by now). A future month's entries are plans, not dues.
 */

export interface DueItem {
  entry: Entry;
  /** The day it is due, YYYY-MM-DD: its date, else its due day; none for an entry with neither. */
  day?: string;
  overdue: boolean;
}

/** The day an entry is due: its date, or its due day in its month. */
export function dueDay(e: Entry): string | undefined {
  return e.date ?? (e.dueDay !== undefined ? dayInMonth(e.month, e.dueDay) : undefined);
}

/**
 * Every open entry up to the running month: overdue ones first, then by
 * day; those without a day at the end of their month; ties as entered.
 */
export function dueSoon(entries: Entry[], today = new Date()): DueItem[] {
  const now = monthKeyOf(today);
  const sortKey = (x: DueItem) => x.day ?? `${x.entry.month}-99`;
  return entries
    .filter(e => !e.paid && e.month <= now)
    .map(e => ({ entry: e, day: dueDay(e), overdue: isOverdue(e, today) }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      const ka = sortKey(a);
      const kb = sortKey(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      return a.entry.createdAt - b.entry.createdAt;
    });
}

export type DueGroupKind = 'overdue' | 'today' | 'tomorrow' | 'day' | 'undated';

export interface DueGroup {
  /** Stable key: the kind, or the day for 'day'. */
  key: string;
  kind: DueGroupKind;
  /** For 'day' (and 'today' / 'tomorrow'): the day. */
  day?: string;
  items: DueItem[];
}

/** The list grouped the way it is read: overdue, today, tomorrow, then day by day, then without a day. */
export function dueGroups(items: DueItem[], today = new Date()): DueGroup[] {
  const todayKey = isoDay(today);
  const tomorrowKey = isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const groups: DueGroup[] = [];
  const at = new Map<string, DueGroup>();
  for (const item of items) {
    const kind: DueGroupKind = item.overdue ? 'overdue' : !item.day ? 'undated'
      : item.day === todayKey ? 'today' : item.day === tomorrowKey ? 'tomorrow' : 'day';
    const key = kind === 'day' ? item.day! : kind;
    let g = at.get(key);
    if (!g) {
      g = { key, kind, ...(kind === 'overdue' || kind === 'undated' ? {} : { day: item.day }), items: [] };
      at.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  }
  // Without a day comes last, wherever its entries sorted.
  return [...groups.filter(g => g.kind !== 'undated'), ...groups.filter(g => g.kind === 'undated')];
}

/**
 * What the next month brings along: its open entries once it is started,
 * otherwise the recurring ones starting it would copy in (`carryCandidates`,
 * moved to their day in it — a preview, not entries yet).
 */
export function nextMonthDue(data: AppData, today = new Date()): { month: MonthKey; started: boolean; items: DueItem[] } {
  const month = addMonths(monthKeyOf(today), 1);
  const started = data.months.some(m => m.key === month);
  const entries = started
    ? data.entries.filter(e => e.month === month && !e.paid)
    : carryOver(carryCandidates(data, month), month, 0, (() => { let i = 0; return () => `preview-${i++}`; })());
  const items = entries.map(e => ({ entry: e, day: dueDay(e), overdue: false }));
  const sortKey = (x: DueItem) => x.day ?? `${month}-99`;
  return { month, started, items: items.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0)) };
}

/** What a list of dues adds up to: expenses to pay, income to come in. */
export function dueTotals(items: DueItem[], kindOf: (categoryId: string) => 'income' | 'expense'): { out: number; in: number } {
  let out = 0;
  let inn = 0;
  for (const { entry } of items) {
    if (kindOf(entry.categoryId) === 'income') inn += entry.amount; else out += entry.amount;
  }
  return { out, in: inn };
}
