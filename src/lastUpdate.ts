import { AppData } from './types';
import { DEMO_PREFIX } from './demo';
import { dayLabel, dayLabelYear, isoDay, shiftDays } from './logic';

/**
 * When the user last changed the book's entries, ms — the month page's
 * *Zuletzt aktualisiert* (Ahmad, November 2026): the day of the last change,
 * not the date an entry is for.
 *
 * `AppData.lastEdit` (schema 32) is set by every add, change, tick and delete.
 * A book saved before it was kept still gets a day: the newest entry the user
 * made, or ticked off as paid. Copies a new month carried over don't count
 * (the app made them: another entry's `seriesId`), nor the test data.
 * Undefined while there is nothing to go by.
 */
export function lastEntryUpdate(data: Pick<AppData, 'entries' | 'lastEdit'>): number | undefined {
  let at = data.lastEdit ?? 0;
  for (const e of data.entries) {
    if (e.id.startsWith(DEMO_PREFIX)) continue;
    if (e.id === e.seriesId || e.splitId) at = Math.max(at, e.createdAt);
    if (e.paidAt) at = Math.max(at, e.paidAt);
  }
  return at > 0 ? at : undefined;
}

/**
 * The day of `at` in words: "heute" / "gestern" (the language's own, from
 * Intl), else "25. Nov." — with the year once it is another year's.
 */
export function updatedLabel(at: number, locale: string, now = new Date()): string {
  const day = isoDay(new Date(at));
  const today = isoDay(now);
  // A clock set back after the change counts it as today, never as "tomorrow".
  if (day >= today) return relativeDay(0, locale);
  if (day === shiftDays(today, -1)) return relativeDay(-1, locale);
  return day.slice(0, 4) === today.slice(0, 4) ? dayLabel(day, locale) : dayLabelYear(day, locale);
}

function relativeDay(n: number, locale: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(n, 'day');
}
