import { Entry, MonthKey } from '../types';
import { dateAt, dayOfMonth, daysInMonth, monthKeyOf } from '../logic';
import { Book, entryDay, monthOf } from './book';
import { mean } from './baseline';

/*
 * *Wann du Geld ausgibst* (Statistik): everyday spending — need and want
 * entries that happen once, as in the pace (D3) — by the day it happened:
 * a month as a calendar, and the average per weekday over the months in
 * view. Fixed costs stay out, or the 1st would be every month's priciest
 * day. Entries without a day have no weekday and are left out (and named).
 */

/** A weekday leads when its average is this far above the average weekday. */
export const WEEKDAY_LEAD = 1.2;
/** Every weekday must have come up this often before one is called the priciest (about a month). */
export const WEEKDAY_MIN_DAYS = 4;

/** Monday = 0 … Sunday = 6, for a YYYY-MM-DD day. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** The weekday a week starts on in a locale (Monday = 0 … Sunday = 6); Monday where the platform can't say. */
export function firstWeekday(locale: string): number {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } };
    const first = (l.getWeekInfo?.() ?? l.weekInfo)?.firstDay;
    return typeof first === 'number' && first >= 1 && first <= 7 ? first - 1 : 0;
  } catch {
    return 0;
  }
}

export interface DaySpend {
  /** The n-th day of the month (1-based; a month may begin on payday). */
  day: number;
  date: string;
  /** Monday = 0 … Sunday = 6. */
  weekday: number;
  /** Everyday spending that day, cents. */
  amount: number;
  /** How many entries that is, and the largest one's name. */
  count: number;
  top?: string;
  /** After today: an entry there is a plan, not spending yet. */
  future: boolean;
}

export interface MonthDays {
  month: MonthKey;
  days: DaySpend[];
  /** The priciest day so far, and everything up to today. */
  max: number;
  total: number;
  /** Everyday spending without a day in the month. */
  undated: number;
  /** Days so far (the whole month once it is over), for a per-day figure. */
  elapsed: number;
}

/** One-off need and want entries: what the pace and this module count. */
const everyday = (book: Book, e: Entry) => {
  if (e.repeat !== 'none') return false;
  const part = book.partOf(e.categoryId);
  return part === 'need' || part === 'want';
};

/** A month day by day. Days after today are marked and stay out of the total. */
export function monthDays(book: Book, month: MonthKey, today = new Date()): MonthDays {
  const now = monthKeyOf(today);
  const length = daysInMonth(month);
  const elapsed = month < now ? length : month === now ? Math.min(length, dayOfMonth(today)) : 0;
  const days: DaySpend[] = Array.from({ length }, (_, i) => {
    const date = dateAt(month, i + 1);
    return { day: i + 1, date, weekday: weekdayOf(date), amount: 0, count: 0, future: i + 1 > elapsed };
  });
  const biggest = days.map(() => 0);
  let undated = 0;
  for (const e of monthOf(book, month).entries) {
    if (!everyday(book, e)) continue;
    const d = entryDay(e);
    if (d === null) { undated += e.amount; continue; }
    const i = Math.min(d, length) - 1;
    days[i].amount += e.amount;
    days[i].count++;
    if (e.amount > biggest[i]) { biggest[i] = e.amount; days[i].top = e.name; }
  }
  const past = days.filter(d => !d.future);
  return {
    month, days, undated, elapsed,
    max: Math.max(0, ...past.map(d => d.amount)),
    total: past.reduce((s, d) => s + d.amount, 0),
  };
}

/** A day's shade, 0 (nothing) to 4 (the priciest): by the square root, so one big day doesn't wash out the rest. */
export function heatLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const r = Math.sqrt(Math.min(1, amount / max));
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

export interface WeekdayPattern {
  /** Monday … Sunday: everyday spending on that weekday ÷ how often it came up. */
  average: number[];
  total: number[];
  /** How often each weekday came up in the months (up to today). */
  count: number[];
  /** The priciest weekday, when one clearly leads; null otherwise. */
  top: number | null;
  months: MonthKey[];
}

/** The average per weekday over the months given, up to today. */
export function weekdayPattern(book: Book, months: MonthKey[], today = new Date()): WeekdayPattern {
  const total = [0, 0, 0, 0, 0, 0, 0];
  const count = [0, 0, 0, 0, 0, 0, 0];
  for (const key of months) {
    for (const d of monthDays(book, key, today).days) {
      if (d.future) continue;
      total[d.weekday] += d.amount;
      count[d.weekday]++;
    }
  }
  const average = total.map((t, i) => (count[i] ? Math.round(t / count[i]) : 0));
  const best = average.reduce((b, v, i) => (v > average[b] ? i : b), 0);
  const leads = average[best] > 0
    && Math.min(...count) >= WEEKDAY_MIN_DAYS
    && average[best] >= WEEKDAY_LEAD * mean(average)
    && average.filter(v => v === average[best]).length === 1;
  return { average, total, count, top: leads ? best : null, months };
}
