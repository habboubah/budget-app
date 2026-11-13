import { describe, expect, it } from 'vitest';
import { cardOpen, readCardsOpen, storeCardsOpen, toggleAllCards, toggleCard } from './fold';

describe('Planen and Statistik as headlines (plan 39)', () => {
  it('every book starts with every card whole', () => {
    expect(readCardsOpen(undefined)).toBeNull();
    expect(readCardsOpen(null)).toBeNull();
  });

  it('reads what was stored: "all", or the opened ids — each once, strings only', () => {
    expect(readCardsOpen('all')).toBeNull();
    expect(readCardsOpen({ open: [] })).toEqual([]);
    expect(readCardsOpen({ open: ['budgets', 'budgets', 7, 'outlook'] })).toEqual(['budgets', 'outlook']);
    // Anything else is as good as unset.
    expect(readCardsOpen({ a: 1 })).toBeNull();
    expect(readCardsOpen('some')).toBeNull();
  });

  it('a bare list — a new book folded without being asked, before every card showed whole — reads as whole', () => {
    expect(readCardsOpen([])).toBeNull();
    expect(readCardsOpen(['budgets'])).toBeNull();
  });

  it('survives a round trip', () => {
    for (const open of [null, [], ['runway', 'goals']]) {
      expect(readCardsOpen(JSON.parse(storeCardsOpen(open)))).toEqual(open);
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
