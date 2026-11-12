import { AppData, Category, Entry, MonthKey } from './types';
import { addMonths, isoDay, monthKeyOf, normalizeName } from './logic';

/*
 * Tips instead of tours (plan 37): one small card on the month page that
 * points at a feature the moment it would have helped — never a list, never
 * two at once, at most one a week, and each goes for good once it is closed
 * or used. Pure and tested; the state is a device preference. The list and
 * the tour that can be asked for are the guide's (src/guide.ts); its tip
 * here only says once that it exists.
 */

export const TIP_IDS = ['tick', 'swipe', 'drag', 'guide', 'capture', 'favorite', 'reserve', 'budget', 'backup'] as const;
export type TipId = (typeof TIP_IDS)[number];
/**
 * The month page's three gestures (plan 39) — the circle that ticks an entry
 * off, the swipe, hold and drag — each when the book first has something to
 * try it on, instead of a card that lists all three after the first entry.
 */
export const GESTURE_TIPS = ['tick', 'swipe', 'drag'] as const satisfies readonly TipId[];
export type GestureTip = (typeof GESTURE_TIPS)[number];
const isGesture = (id: TipId): id is GestureTip => (GESTURE_TIPS as readonly TipId[]).includes(id);

export interface TipState {
  /** Closed or used: never again. */
  done: TipId[];
  /** The day (YYYY-MM-DD) the last one was closed or used. */
  last?: string;
  /** The day a gesture's tip was put away: the next one waits for another day. */
  gesture?: string;
}

export type Tip =
  | { id: GestureTip }
  | { id: 'guide' }
  | { id: 'capture' }
  | { id: 'favorite'; name: string; categoryId: string; amount?: number }
  | { id: 'reserve' }
  | { id: 'budget'; category: Category; month: MonthKey }
  | { id: 'backup' };

/** A gesture's tip: a sentence under the gesture's symbol, nothing to open. */
export const isGestureTip = (tip: Tip): tip is { id: GestureTip } => isGesture(tip.id);

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
  /** The guide (src/guide.ts) may be pointed out: it exists, and this device hasn't met it yet. */
  guide?: boolean;
  /** The three gestures may be shown, each at its moment (the month page asks; a device that read the old card has them done). */
  gestures?: boolean;
}

export const TIP_PAUSE_DAYS = 7;
const DAY = 86_400_000;

export function readTipState(v: unknown): TipState {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const done = Array.isArray(o.done) ? TIP_IDS.filter(id => (o.done as unknown[]).includes(id)) : [];
  const day = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return { done, ...(day(o.last) ? { last: o.last as string } : {}), ...(day(o.gesture) ? { gesture: o.gesture as string } : {}) };
}

/** Whoever read the old card with all three gestures has them done. */
export const knowGestures = (state: TipState): TipState =>
  (GESTURE_TIPS.every(id => state.done.includes(id)) ? state : { ...state, done: [...new Set([...state.done, ...GESTURE_TIPS])] });

/**
 * The guide has been met another way — opened from Optionen, the tour taken,
 * the gestures card with its link put away: its tip is done, without a pause.
 */
export const knowGuide = (state: TipState): TipState =>
  (state.done.includes('guide') ? state : { ...state, done: [...state.done, 'guide'] });

/**
 * A tip put away — closed or used: it is done, and the week's pause starts.
 * A gesture's tip starts none: the next gesture comes on another day, and the
 * other tips keep their own rhythm.
 */
export const closeTip = (state: TipState, id: TipId, today = new Date()): TipState => {
  const done = state.done.includes(id) ? state.done : [...state.done, id];
  return isGesture(id) ? { ...state, done, gesture: isoDay(today) } : { ...state, done, last: isoDay(today) };
};

const when = (e: Entry) => (e.date ? new Date(`${e.date}T12:00:00`).getTime() : e.createdAt);
const typed = (e: Entry, expense: (id: string) => boolean) =>
  e.paid && e.repeat === 'none' && !e.ref && !e.transfer && !e.splitId && expense(e.categoryId);

/** The tip to show now, or null. The order is the plan's; the first that fits wins. */
export function nextTip(data: AppData, state: TipState, ctx: TipContext): Tip | null {
  const today = ctx.today ?? new Date();
  const now = today.getTime();
  const open = (id: TipId) => !state.done.includes(id);

  // The gestures first, one a day at most, whatever the week's pause says:
  // they are how the page is used, not something more to discover.
  if (ctx.gestures && state.gesture !== isoDay(today)) {
    const month = monthKeyOf(today);
    const mine = data.entries.filter(e => !e.transfer);
    // Something still open this month: the circle ticks it off.
    if (open('tick') && mine.some(e => e.month === month && !e.paid)) return { id: 'tick' };
    // A handful of entries: the swipe.
    if (open('swipe') && mine.length >= 5) return { id: 'swipe' };
    // Two in one category this month: something to put in order.
    if (open('drag')) {
      const per = new Map<string, number>();
      for (const e of mine) if (e.month === month) per.set(e.categoryId, (per.get(e.categoryId) ?? 0) + 1);
      if ([...per.values()].some(n => n >= 2)) return { id: 'drag' };
    }
  }

  if (state.last && now - new Date(`${state.last}T00:00:00`).getTime() < TIP_PAUSE_DAYS * DAY) return null;
  const kinds = new Map(data.categories.map(c => [c.id, c.kind]));
  const expense = (id: string) => kinds.get(id) === 'expense';

  // The guide, once: whoever had the app before it came gets one line about it.
  if (open('guide') && ctx.guide) return { id: 'guide' };

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
