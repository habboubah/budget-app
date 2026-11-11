import { AppData, Entry, TAX_KINDS, TaxKind } from '../types';
import { sortEntries } from '../logic';

/*
 * The year's list for the tax return (schema 29): the expenses the user
 * marked, by kind. What was paid counts, in the year it was paid in — by the
 * entry's date, else its month; a refund comes off its kind. The app only
 * collects: whether something is deductible is for the tax return to say.
 */

export interface TaxGroup { kind: TaxKind; total: number; entries: Entry[] }
export interface TaxYear { year: string; groups: TaxGroup[]; total: number; count: number }

const yearOf = (e: Entry) => (e.date ?? e.month).slice(0, 4);

/** The years with something marked and paid, newest first. */
export function taxYears(data: AppData): string[] {
  return [...new Set(data.entries.filter(e => e.tax && e.paid && !e.transfer).map(yearOf))].sort().reverse();
}

/** A year's marked and paid expenses by kind, in the kinds' order; kinds without any are left out. */
export function taxYear(data: AppData, year: string): TaxYear {
  const expense = new Set(data.categories.filter(c => c.kind === 'expense').map(c => c.id));
  const mine = data.entries.filter(e => e.tax && e.paid && !e.transfer && expense.has(e.categoryId) && yearOf(e) === year);
  const groups = TAX_KINDS.map(kind => {
    const entries = sortEntries(mine.filter(e => e.tax === kind)).sort((a, b) => (a.date ?? a.month).localeCompare(b.date ?? b.month));
    return { kind, entries, total: entries.reduce((s, e) => s + e.amount, 0) };
  }).filter(g => g.entries.length);
  return { year, groups, total: groups.reduce((s, g) => s + g.total, 0), count: mine.length };
}
