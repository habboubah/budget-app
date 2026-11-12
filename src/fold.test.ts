import { describe, expect, it } from 'vitest';
import { cardOpen, readCardsOpen, storeCardsOpen, toggleAllCards, toggleCard } from './fold';

describe('Planen and Statistik as headlines (plan 39)', () => {
  it('a book in use starts with every card whole, a new one with headlines', () => {
    expect(readCardsOpen(undefined, true)).toBeNull();
    expect(readCardsOpen(undefined, false)).toEqual([]);
  });

  it('reads what was stored, whatever the book: "all", or the opened ids — each once, strings only', () => {
    expect(readCardsOpen('all', false)).toBeNull();
    expect(readCardsOpen([], true)).toEqual([]);
    expect(readCardsOpen(['budgets', 'budgets', 7, 'outlook'], true)).toEqual(['budgets', 'outlook']);
    // Anything else is as good as unset.
    expect(readCardsOpen({ a: 1 }, true)).toBeNull();
    expect(readCardsOpen('some', false)).toEqual([]);
  });

  it('survives a round trip', () => {
    for (const open of [null, [], ['runway', 'goals']]) {
      expect(readCardsOpen(JSON.parse(storeCardsOpen(open)), false)).toEqual(open);
      expect(readCardsOpen(JSON.parse(storeCardsOpen(open)), true)).toEqual(open);
    }
  });

  it('a headline opens its card and Weniger closes it; open stays open', () => {
    let open = toggleCard([], 'budgets');
    expect(open).toEqual(['budgets']);
    expect(cardOpen(open, 'budgets')).toBe(true);
    expect(cardOpen(open, 'outlook')).toBe(false);
    open = toggleCard(open, 'outlook');
    open = toggleCard(open, 'budgets');
    expect(open).toEqual(['outlook']);
  });

  it('with every card whole each one is open and nothing toggles', () => {
    expect(cardOpen(null, 'anything')).toBe(true);
    expect(toggleCard(null, 'budgets')).toBeNull();
  });

  it('the bar’s button goes from whole to headlines with none open, and back', () => {
    expect(toggleAllCards(null)).toEqual([]);
    expect(toggleAllCards(['budgets'])).toBeNull();
    expect(toggleAllCards([])).toBeNull();
  });
});
