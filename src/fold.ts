/*
 * Planen and Statistik as headlines (plan 39). Each of their cards can show
 * as one row — what it is called and what it has found — that opens in place
 * to the card itself. What is open is a view preference:
 *
 *   null     every card whole, as the pages always were — a book that was
 *            in use before keeps this, and "Alles aufklappen" returns to it;
 *   a list   headlines, with the cards named in it opened — a new book
 *            starts with none.
 *
 * Pure and tested (fold.test.ts); the store keeps one of these per page.
 */
export type CardsOpen = string[] | null;

/** The most ids kept: a page has about ten cards. */
const KEEP = 30;

/** What was stored: "all" for every card whole, else the opened ids. Unset: whole for a book in use, headlines for a new one. */
export function readCardsOpen(saved: unknown, inUse: boolean): CardsOpen {
  if (saved === 'all') return null;
  if (Array.isArray(saved)) return [...new Set(saved.filter((x): x is string => typeof x === 'string'))].slice(0, KEEP);
  return inUse ? null : [];
}

/** As it is stored. */
export const storeCardsOpen = (open: CardsOpen): string => JSON.stringify(open ?? 'all');

/** Whether a card shows whole. */
export const cardOpen = (open: CardsOpen, id: string): boolean => open === null || open.includes(id);

/** A headline tapped, or an open card's *Weniger*. With every card whole there is nothing to toggle. */
export function toggleCard(open: CardsOpen, id: string): CardsOpen {
  if (open === null) return null;
  return open.includes(id) ? open.filter(x => x !== id) : [...open, id];
}

/** The bar's button: from every card whole to headlines, and back. */
export const toggleAllCards = (open: CardsOpen): CardsOpen => (open === null ? [] : null);
