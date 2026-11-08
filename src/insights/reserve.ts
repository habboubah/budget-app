import { MonthKey } from '../types';
import { monthKeyOf } from '../logic';
import { Book } from './book';
import { commitments } from './rules';
import { Outlook, bigItems, outlook } from './outlook';

/*
 * Rücklage für jährliche Kosten (plan 11, F3): put a little aside every month
 * so a yearly bill — the Kfz-Steuer, an insurance, the ADAC — doesn't wreck
 * one month and flatter the others. Built on `commitments()` (the yearly
 * entries) and `outlook()` (where they land and whether the account covers
 * them), so this card and *Ausblick* never disagree. Pure, tested.
 */

export interface YearlyReserve {
  /** What to put aside a month: the yearly total ÷ 12, rounded up to whole euros (cents). */
  monthly: number;
  /** The next yearly bills, soonest first (up to three): their month a year on and amount. */
  upcoming: { name: string; categoryId: string; month: MonthKey; amount: number }[];
  /** The first coming month whose projected end goes below zero, with how much is missing. */
  shortfall?: { month: MonthKey; amount: number };
}

/**
 * The reserve for the book's yearly bills, or null when there are none. `ahead`
 * is `outlook()` reused from the view (computed once); it is recomputed when
 * not given.
 */
export function yearlyReserve(book: Book, today = new Date(), ahead: Outlook | null = outlook(book, today)): YearlyReserve | null {
  const month = monthKeyOf(today);
  const yearly = commitments(book.data, month).items.filter(i => i.repeat === 'yearly');
  if (!yearly.length) return null;

  const yearlyTotal = yearly.reduce((s, i) => s + i.yearly, 0);
  // Round up to whole euros, so the reserve is never a cent short.
  const monthly = Math.ceil(yearlyTotal / 12 / 100) * 100;

  const upcoming = (ahead ? bigItems(ahead) : [])
    .filter(b => b.kind === 'yearly')
    .slice(0, 3)
    .map(b => ({ name: b.name, categoryId: b.categoryId, month: b.month, amount: b.amount }));

  // The first coming month the account can't cover (its projected end is below zero).
  const short = ahead?.months.find(m => m.mid < 0);
  const shortfall = short ? { month: short.key, amount: -short.mid } : undefined;

  return { monthly, upcoming, ...(shortfall ? { shortfall } : {}) };
}
