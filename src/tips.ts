import { AppData, Category, Entry, MonthKey } from './types';
import { addMonths, isoDay, monthKeyOf, normalizeName } from './logic';

/*
 * Tips instead of tours (plan 37): one small card on the month page that
 * points at a feature the moment it would have helped — never a list, never
 * two at once, at most one a week, and each goes for good once it is closed
 * or used. Pure and tested; the state is a device preference.
 */

export const TIP_IDS = ['capture', 'favorite', 'reserve', 'budget', 'backup'] as const;
export type TipId = (typeof TIP_IDS)[number];

export interface TipState {
  /** Closed or used: never again. */
  done: TipId[];
  /** The day (YYYY-MM-DD) the last one was closed or used. */
  last?: string;
}

export type Tip =
  | { id: 'capture' }
  | { id: 'favorite'; name: string; categoryId: string; amount?: number }
  | { id: 'reserve' }
  | { id: 'budget'; category: Category; month: MonthKey }
  | { id: 'backup' };

export interface TipContext {
  today?: Date;
  /** An installed app (iPhone or Android): the device backup switch exists only there. */
  native: boolean;
  /** Automatic capture can be set up here (the iPhone app: Shortcuts). */
  capture?: boolean;
  /** Days since the last exported backup; null = never. */
  daysSinceExport: number | null;
  /** The iPhone backup switch (plan 06); null = unknown. */
  inDeviceBackup: boolean | null;
}

export const TIP_PAUSE_DAYS = 7;
const DAY = 86_400_000;

export function readTipState(v: unknown): TipState {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const done = Array.isArray(o.done) ? TIP_IDS.filter(id => (o.done as unknown[]).includes(id)) : [];
  return { done, ...(typeof o.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.last) ? { last: o.last } : {}) };
}

/** A tip put away — closed or used: it is done, and the week's pause starts. */
export const closeTip = (state: TipState, id: TipId, today = new Date()): TipState =>
  ({ done: state.done.includes(id) ? state.done : [...state.done, id], last: isoDay(today) });

const when = (e: Entry) => (e.date ? new Date(`${e.date}T12:00:00`).getTime() : e.createdAt);
const typed = (e: Entry, expense: (id: string) => boolean) =>
  e.paid && e.repeat === 'none' && !e.ref && !e.transfer && !e.splitId && expense(e.categoryId);

/** The tip to show now, or null. The order is the plan's; the first that fits wins. */
export function nextTip(data: AppData, state: TipState, ctx: TipContext): Tip | null {
  const today = ctx.today ?? new Date();
  const now = today.getTime();
  if (state.last && now - new Date(`${state.last}T00:00:00`).getTime() < TIP_PAUSE_DAYS * DAY) return null;
  const open = (id: TipId) => !state.done.includes(id);
  const kinds = new Map(data.categories.map(c => [c.id, c.kind]));
  const expense = (id: string) => kinds.get(id) === 'expense';

  // Three payments typed by hand in two weeks, and nothing captured yet.
  if (open('capture') && ctx.capture && !data.entries.some(e => e.ref?.startsWith('inbox:'))) {
    const recent = data.entries.filter(e => typed(e, expense) && now - when(e) < 14 * DAY && now >= when(e));
    if (recent.length >= 3) return { id: 'capture' };
  }

  // The same entry three times in two months, and not a favourite yet.
  if (open('favorite')) {
    const saved = new Set((data.favorites ?? []).map(f => `${f.categoryId}|${normalizeName(f.name)}`));
    const seen = new Map<string, Entry[]>();
    for (const e of data.entries) {
      if (!typed(e, expense) || !e.name || now - when(e) >= 60 * DAY) continue;
      const key = `${e.categoryId}|${normalizeName(e.name)}`;
      if (saved.has(key)) continue;
      seen.set(key, [...(seen.get(key) ?? []), e]);
    }
    const best = [...seen.values()].filter(list => list.length >= 3).sort((a, b) => b.length - a.length || when(b[0]) - when(a[0]))[0];
    if (best) {
      const newest = best.reduce((a, b) => (when(b) > when(a) ? b : a));
      const same = best.every(e => e.amount === newest.amount);
      return { id: 'favorite', name: newest.name, categoryId: newest.categoryId, ...(same ? { amount: newest.amount } : {}) };
    }
  }

  // The first bill that comes once a year.
  if (open('reserve') && data.entries.some(e => e.repeat === 'yearly' && expense(e.categoryId))) return { id: 'reserve' };

  // Last month went over a budget: the one that went over by most.
  if (open('budget')) {
    const month = addMonths(monthKeyOf(today), -1);
    let worst: { category: Category; over: number } | null = null;
    for (const category of data.categories) {
      if (category.kind !== 'expense' || !category.limit || category.limit <= 0 || category.limitPer === 'year') continue;
      let spent = 0;
      for (const e of data.entries) if (e.month === month && e.categoryId === category.id && !e.transfer) spent += e.amount;
      const over = spent - category.limit;
      if (over > 0 && (!worst || over > worst.over)) worst = { category, over };
    }
    if (worst) return { id: 'budget', category: worst.category, month };
  }

  // A month without a copy outside the phone, and the iPhone backup switched off.
  // (A book younger than that has nothing to lose yet.)
  if (open('backup') && ctx.native && ctx.inDeviceBackup === false
    && data.entries.some(e => now - e.createdAt >= 30 * DAY)
    && (ctx.daysSinceExport === null || ctx.daysSinceExport >= 30)) return { id: 'backup' };

  return null;
}
