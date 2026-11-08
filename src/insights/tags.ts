import { Category, Entry, MonthKey } from '../types';

/*
 * Tag totals (plan 26): what the money tagged "#urlaub" added up to. Only
 * expenses count toward a spending total, as the other "Wofür das Geld geht"
 * breakdowns do. Pure, tested.
 */

export interface TagTotal {
  tag: string;
  /** Spending on entries carrying this tag, over the months (cents). */
  amount: number;
  count: number;
}

/**
 * Spending per tag over `months`, largest first. Income entries are left out,
 * so a tag total reads like the category and payee breakdowns.
 */
export function tagTotals(entries: Entry[], categories: Category[], months: MonthKey[]): TagTotal[] {
  const inRange = new Set(months);
  const kind = new Map(categories.map(c => [c.id, c.kind]));
  const sums = new Map<string, { amount: number; count: number }>();
  for (const e of entries) {
    if (!inRange.has(e.month) || !e.tags?.length || kind.get(e.categoryId) === 'income') continue;
    for (const tag of e.tags) {
      const s = sums.get(tag) ?? { amount: 0, count: 0 };
      s.amount += e.amount;
      s.count++;
      sums.set(tag, s);
    }
  }
  return [...sums.entries()]
    .map(([tag, s]) => ({ tag, ...s }))
    .sort((a, b) => b.amount - a.amount || a.tag.localeCompare(b.tag));
}

/** Every tag in use, most-used first — for suggestions in the entry sheet. */
export function tagsInUse(entries: Entry[]): string[] {
  const count = new Map<string, number>();
  for (const e of entries) for (const tag of e.tags ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}
