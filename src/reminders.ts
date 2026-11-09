import { AppData, Entry, MonthKey } from './types';
import { dayLabel, formatMoney, isoDay, monthKeyOf, withAmounts } from './logic';
import { dueDay, nextMonthDue } from './due';
import { contractItems } from './contracts';
import { Strings, fmt } from './translations';

/*
 * Reminders as local notifications: one scheduler, `reminderPlan`, fed by
 * sources — open bills and the contracts' last days to cancel; later plans
 * add theirs (a backup nudge, goals, the month review, debts) without
 * touching the scheduling. Pure and tested (reminders.test.ts); notify.ts
 * only swaps what is pending on the device for the plan.
 */

/** How the user wants to be reminded — a view preference, not part of backups. */
export interface ReminderPrefs {
  on: boolean;
  /** Local time of day, "HH:MM". */
  time: string;
  /** Days before the due day; 0: on the day. */
  lead: number;
  /** Amounts in the text. Off by default: notifications show on the lock screen. */
  amounts: boolean;
}

export const REMINDER_LEADS = [0, 1, 2, 3, 7] as const;
export const DEFAULT_REMINDERS: ReminderPrefs = { on: false, time: '09:00', lead: 1, amounts: false };
/** iOS keeps 64 pending notifications per app; leave a few for whatever comes next. */
export const REMINDER_LIMIT = 60;

/** Whatever was stored, as valid preferences. */
export function normalizeReminderPrefs(raw: unknown): ReminderPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof ReminderPrefs, unknown>>;
  return {
    on: r.on === true,
    time: typeof r.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : DEFAULT_REMINDERS.time,
    lead: typeof r.lead === 'number' && (REMINDER_LEADS as readonly number[]).includes(r.lead) ? r.lead : DEFAULT_REMINDERS.lead,
    amounts: r.amounts === true,
  };
}

/** One thing worth a reminder: a bill, a contract's last day to cancel… */
export interface ReminderItem {
  /** The day it is about (due; last day to cancel), YYYY-MM-DD. */
  day: string;
  name: string;
  /** Cents, for the text when amounts are shown. */
  amount?: number;
  /** The month a tap opens. */
  month: MonthKey;
}

/** A kind of reminder: what to remind of, how early, what it says, where a tap goes. */
export interface ReminderSource {
  kind: string;
  /** Days ahead, instead of the user's choice. */
  lead?: number;
  /** A tap opens this pushed screen instead of the item's month. */
  screen?: 'contracts';
  items: (data: AppData, today: Date) => ReminderItem[];
  /** Items of this kind on one day share one notification. `days`: from it going off to the day. */
  text: (items: ReminderItem[], days: number, prefs: ReminderPrefs, t: Strings) => { title: string; body: string };
}

/** "Miete, Strom" — or "Miete, Strom und 2 weitere". */
function names(items: ReminderItem[], t: Strings): string {
  const all = items.map(i => i.name);
  return all.length <= 2 ? all.join(', ') : fmt(t.remindMore, { names: all.slice(0, 2).join(', '), n: all.length - 2 });
}

/**
 * Open spending from today on: the running month's, and the next month's —
 * its own open entries once it is started, else the recurring ones starting
 * it will copy in, on their day. Undated entries have nothing to remind of.
 */
export const billSource: ReminderSource = {
  kind: 'bill',
  items: (data, today) => {
    const kind = new Map(data.categories.map(c => [c.id, c.kind]));
    const now = monthKeyOf(today);
    const todayKey = isoDay(today);
    const out: ReminderItem[] = [];
    const add = (e: Entry) => {
      if (e.paid || kind.get(e.categoryId) !== 'expense') return;
      const day = dueDay(e);
      if (day && day >= todayKey) out.push({ day, name: e.name, amount: e.amount, month: e.month });
    };
    data.entries.filter(e => e.month === now).forEach(add);
    nextMonthDue(data, today).items.forEach(i => add(i.entry));
    return out;
  },
  text: (items, days, prefs, t) => {
    const list = names(items, t);
    const title = days === 0 ? fmt(t.remindDueToday, { names: list })
      : days === 1 ? fmt(t.remindDueTomorrow, { names: list }) : fmt(t.remindDueIn, { n: days, names: list });
    const sum = items.reduce((s, i) => s + (i.amount ?? 0), 0);
    // Reminders keep their own switch for amounts, whatever the screen hides (plan 06).
    return { title: prefs.amounts && sum ? `${title} · ${withAmounts(() => formatMoney(sum, t.locale))}` : title, body: t.remindBody };
  },
};

/** The contracts' last days to cancel (Abos & Verträge), a week ahead — there is something to do. */
export const contractSource: ReminderSource = {
  kind: 'contract',
  lead: 7,
  screen: 'contracts',
  items: (data, today) => {
    const now = monthKeyOf(today);
    const month = data.months.map(m => m.key).filter(k => k <= now).sort().pop();
    if (!month) return [];
    return contractItems(data, month, today)
      .filter(i => i.deadline)
      .map(i => ({ day: i.deadline!.cancelBy, name: i.name, month: now }));
  },
  text: (items, _days, _prefs, t) => ({
    title: fmt(t.remindCancel, { date: dayLabel(items[0].day, t.locale), name: names(items, t) }),
    body: t.remindCancelBody,
  }),
};

export const REMINDER_SOURCES: ReminderSource[] = [billSource, contractSource];

/** A notification to have pending. */
export interface PlannedReminder {
  /** Stable for a kind and day: rescheduling replaces it instead of adding another. */
  id: number;
  /** When it goes off, local time: "YYYY-MM-DDTHH:MM". */
  at: string;
  title: string;
  body: string;
  /** What a tap opens. */
  month: MonthKey;
  screen?: 'contracts';
}

/** FNV-1a, folded to a positive 31-bit integer — a notification id on iOS and Android. */
export function reminderId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 1) || 1;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n));
}

function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * What should be pending now: for every kind and day with something on it,
 * one notification `lead` days ahead at the chosen time — or at the next
 * time that is still to come, if that has passed, as long as it is no later
 * than the day itself. Soonest first, at most `limit`.
 */
export function reminderPlan(
  data: AppData, prefs: ReminderPrefs, t: Strings, now = new Date(),
  sources: ReminderSource[] = REMINDER_SOURCES, limit = REMINDER_LIMIT,
): PlannedReminder[] {
  if (!prefs.on) return [];
  const today = isoDay(now);
  const [hh, mm] = prefs.time.split(':').map(Number);
  // The first slot that is still to come: today at the time, or tomorrow.
  const firstDay = now.getHours() * 60 + now.getMinutes() < hh * 60 + mm ? today : addDays(today, 1);
  const planned: PlannedReminder[] = [];
  for (const source of sources) {
    const byDay = new Map<string, ReminderItem[]>();
    for (const item of source.items(data, now)) {
      const list = byDay.get(item.day);
      if (list) list.push(item); else byDay.set(item.day, [item]);
    }
    for (const [day, items] of byDay) {
      let fire = addDays(day, -(source.lead ?? prefs.lead));
      if (fire < firstDay) fire = firstDay;
      if (fire > day) continue;
      const { title, body } = source.text(items, daysBetween(fire, day), prefs, t);
      planned.push({
        id: reminderId(`${source.kind}:${day}`),
        at: `${fire}T${prefs.time}`,
        title, body,
        month: items[0].month,
        ...(source.screen ? { screen: source.screen } : {}),
      });
    }
  }
  return planned.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id - b.id)).slice(0, limit);
}
