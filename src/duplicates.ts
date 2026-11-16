import { Entry, MonthKey } from './types';

/*
 * The same amount twice in one month (November 2026, Ahmad): a payment
 * entered twice — typed in and then imported from the bank, or saved twice —
 * shows red on the month page with a warning, and the entry sheet warns
 * before a new one is saved. Either may be right (two coffees at 2,50 €), so
 * the warning can be taken off: *Ist richtig* marks the entry `distinct`
 * (schema 31). Pure, tested in duplicates.test.ts.
 */

/** Money in or money out — the same cents both ways are no twins. */
const directionOf = (e: Entry, incomeIds: ReadonlySet<string>) => (incomeIds.has(e.categoryId) ? 'in' : 'out');

/** Entries that can have a twin: no transfer (it is two entries by design), and some money. */
const counts = (e: Entry) => !e.transfer && e.amount !== 0;

/** Two parts of one split payment may well be equal: they are not twins. */
const sameSplit = (a: Entry, b: Entry) => !!a.splitId && a.splitId === b.splitId;

/** Earliest first: by day (an undated entry after the dated ones), then as entered. */
const byDay = (a: Entry, b: Entry) =>
  (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/**
 * The entries that may be one payment entered twice: another entry of the
 * same month has the same amount, in the same direction. One marked
 * `distinct` (*Ist richtig*) is never flagged and never flags another — so
 * taking the warning off one of two takes it off both, and of three leaves
 * the other two warned. Each flagged entry's id maps to the twin to name: the
 * earliest of the others.
 */
export function duplicateTwins(entries: Entry[], incomeIds: ReadonlySet<string>): Map<string, Entry> {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!counts(e) || e.distinct) continue;
    const key = `${e.month}|${directionOf(e, incomeIds)}|${e.amount}`;
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  const twins = new Map<string, Entry>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort(byDay);
    for (const e of group) {
      const twin = group.find(o => o.id !== e.id && !sameSplit(e, o));
      if (twin) twins.set(e.id, twin);
    }
  }
  return twins;
}

/**
 * The entries of `month` with this amount, in this direction — what the
 * entry sheet names before a new entry (or a changed amount) is saved.
 * Earliest first; `except` is the entry being edited. Unlike the month
 * page's warning, entries marked `distinct` count here too: the amount is
 * there either way.
 */
export function sameAmount(
  entries: Entry[],
  probe: { month: MonthKey; amount: number; income: boolean; except?: string },
  incomeIds: ReadonlySet<string>,
): Entry[] {
  if (probe.amount === 0) return [];
  const direction = probe.income ? 'in' : 'out';
  return entries
    .filter(e => e.month === probe.month && e.amount === probe.amount && e.id !== probe.except && counts(e) && directionOf(e, incomeIds) === direction)
    .sort(byDay);
}
