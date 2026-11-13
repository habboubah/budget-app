import { Entry, MonthKey } from './types';
import { addMonths, intervalOf, seriesEnded } from './logic';

/*
 * The recurring entries that are still running (Mehr › Wiederkehrende
 * Posten): one per series — its newest entry — with the month it last
 * happened (the newest paid entry; the newest at all when none is paid yet)
 * and the month it comes next. Pure, tested in recurring.test.ts.
 */

export interface ActiveSeries {
  seriesId: string;
  /** The series' newest entry: its name, amount, category and repeat. */
  latest: Entry;
  /** The entry it last happened with — where a tap goes. */
  last: Entry;
  /** The month it comes next: the newest entry's while that is still open, else one interval after it. */
  next: MonthKey;
  /** Months between two of its entries: 1, 2, 3, 6, 12. */
  every: number;
}

const order = (a: Entry, b: Entry) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.createdAt - b.createdAt);

export function activeSeries(entries: Entry[]): ActiveSeries[] {
  const bySeries = new Map<string, Entry[]>();
  for (const e of entries) {
    if (e.transfer) continue;
    const list = bySeries.get(e.seriesId);
    if (list) list.push(e); else bySeries.set(e.seriesId, [e]);
  }
  const out: ActiveSeries[] = [];
  for (const [seriesId, list] of bySeries) {
    list.sort(order);
    const latest = list[list.length - 1];
    const every = intervalOf(latest);
    if (!every) continue;
    const next = latest.paid ? addMonths(latest.month, every) : latest.month;
    // Its last month (`until`) is behind it: nothing more comes.
    if (seriesEnded(latest, next)) continue;
    const paid = list.filter(e => e.paid);
    out.push({ seriesId, latest, last: paid[paid.length - 1] ?? latest, next, every });
  }
  // The monthly ones first, then the rarer ones; within each, the next one first.
  return out.sort((a, b) => (a.every === 1) !== (b.every === 1) ? (a.every === 1 ? -1 : 1)
    : a.next < b.next ? -1 : a.next > b.next ? 1 : a.latest.name.localeCompare(b.latest.name));
}
