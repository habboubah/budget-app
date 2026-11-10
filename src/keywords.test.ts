import { describe, expect, it } from 'vitest';
import { Category, Entry } from './types';
import { defaultCategories } from './data/defaults';
import { shippedKeywords } from './data/keywords';
import { loadLanguage } from './translations';
import { keywordKey, keywordTokens, normalizeKeywords, normalizeState } from './logic';
import {
  buildKeywordIndex, completeNames, correctTypo, editDistance, guessCategories, isShippedList, keywordIdeas, keywordOwners, keywordsForName, keywordsOf,
} from './keywords';

const cats = defaultCategories();
let n = 0;
const entry = (name: string, categoryId: string, month = '2026-10'): Entry => ({
  id: `e${++n}`, month, categoryId, name, amount: 1000, paid: true, repeat: 'none', seriesId: `s${n}`, createdAt: n,
});
const index = (entries: Entry[] = [], categories: Category[] = cats, lang = 'de') => buildKeywordIndex({ categories, entries, lang });
const top = (text: string, idx = index(), featured?: string[]) => guessCategories(idx, text, { featured })[0];
const ids = (text: string, idx = index(), featured?: string[]) => guessCategories(idx, text, { featured }).map(g => g.categoryId);

describe('keywordTokens', () => {
  it('folds case, accents, apostrophes and an Arabic article; keeps "&" inside a word', () => {
    expect(keywordTokens("McDonald's")).toEqual(['mcdonalds']);
    expect(keywordTokens('Straße  Müller')).toEqual(['strasse', 'muller']);
    expect(keywordTokens('H&M, 1&1 · Disney+')).toEqual(['h&m', '1&1', 'disney']);
    expect(keywordTokens('فاتورة الكهرباء')).toEqual(['فاتوره', 'كهرباء']);
    expect(keywordKey('  ')).toBe('');
  });
});

describe('guessCategories', () => {
  it('knows the shops and words people type most', () => {
    expect(top('Lidl')).toMatchObject({ categoryId: 'groceries', sure: true, word: 'Lidl' });
    expect(top('LIDL Hanau')?.categoryId).toBe('groceries');
    expect(top('Electricity')?.categoryId).toBe('fixed');
    expect(top('gym')).toMatchObject({ categoryId: 'sport', sure: true });
    expect(top('Netflix')?.categoryId).toBe('leisure');
    expect(top('Aral')?.categoryId).toBe('car');
    expect(top('Gehalt')?.categoryId).toBe('income');
    expect(top('Windeln')?.categoryId).toBe('children');
  });

  it('works in every language the app speaks', () => {
    expect(top('Strom')?.categoryId).toBe('fixed');
    expect(top('كهرباء')?.categoryId).toBe('fixed');
    expect(top('فاتورة الكهرباء')?.categoryId).toBe('fixed');
    expect(top('صيدلية')?.categoryId).toBe('health');
    expect(top('Pharmacy')?.categoryId).toBe('health');
  });

  it('finds a keyword at the start or end of a compound', () => {
    expect(top('Stromrechnung')).toMatchObject({ categoryId: 'fixed', sure: true });
    expect(top('Hausratversicherung')?.categoryId).toBe('insurance');
    expect(top('Fitness Studio')?.categoryId).toBe('sport');
  });

  it('prefers the longer, more precise phrase', () => {
    expect(top('Aldi Talk')?.categoryId).toBe('telecom');
    expect(top('Aldi')?.categoryId).toBe('groceries');
    expect(top('Kfz-Versicherung')?.categoryId).toBe('car');
    expect(top('Amazon Prime')?.categoryId).toBe('leisure');
    expect(top('Kindergeld')?.categoryId).toBe('income');
  });

  it('shows every category a name points to', () => {
    expect(ids('Tanken bei Lidl')).toEqual(['car', 'groceries']);
    // ...but not a weaker match beside a clear one: "Kindergeld" is income, not "Kinder".
    expect(ids('Kindergeld')).toEqual(['income']);
    expect(ids('Rente')).toEqual(['income']);
  });

  it('stays quiet on a short word that is only near something', () => {
    expect(guessCategories(index(), 'Visa')).toEqual([]);
    expect(guessCategories(index(), 'Hanau')).toEqual([]);
  });

  it('forgives a small typo, and is sure of it from five letters', () => {
    expect(top('Lidel')).toMatchObject({ categoryId: 'groceries', sure: true, word: 'Lidl' });
    expect(top('Fittness')).toMatchObject({ categoryId: 'sport', sure: true });
    expect(top('Electrisity')).toMatchObject({ categoryId: 'fixed', sure: true });
    expect(top('Drogerei')?.categoryId).toBe('groceries');
    // "Aldi" is not "Audi": a four-letter word only by a swapped, missing or extra letter.
    expect(top('Audi')?.categoryId).toBe('car');
  });

  it('suggests while typing, but is not sure of a beginning', () => {
    expect(top('Lid')).toMatchObject({ categoryId: 'groceries', sure: false });
    expect(top('Electr')?.categoryId).toBe('fixed');
    expect(top('Elektr')?.categoryId).toBe('shopping');
    expect(guessCategories(index(), 'Li')).toEqual([]);
    expect(guessCategories(index(), '   ')).toEqual([]);
  });

  it('learns from earlier entries, which beat the keywords', () => {
    const idx = index([entry('Lidl', 'family'), entry('Lidl', 'family'), entry('Habibi Markt', 'groceries')]);
    expect(top('Lidl', idx)).toMatchObject({ categoryId: 'family', sure: true });
    // The shipped keyword is far behind what the user did: not offered beside it.
    expect(ids('Lidl', idx)).toEqual(['family']);
    expect(top('Habibi Markt', idx)).toMatchObject({ categoryId: 'groceries', sure: true });
    expect(top('Habibi Markt Oktober', idx)?.categoryId).toBe('groceries');
    expect(top('Habi', idx)).toMatchObject({ categoryId: 'groceries', sure: false });
  });

  it('breaks a tie with the month’s own categories, then the most used', () => {
    expect(ids('Rundfunkbeitrag', index(), ['fixed'])[0]).toBe('fixed');
    expect(ids('Rundfunkbeitrag', index(), ['taxes'])[0]).toBe('taxes');
    expect(ids('Rundfunkbeitrag', index([entry('x', 'taxes')]))[0]).toBe('taxes');
  });

  it('follows the keywords the user set: removed ones stop, own ones win a tie', () => {
    const edited = cats.map(c => (c.id === 'groceries' ? { ...c, keywords: [] } : c));
    expect(ids('Lidl', index([], edited))).not.toContain('groceries');
    const abos: Category = { id: 'abos', names: { de: 'Abos' }, emoji: '📺', hue: 'sky', kind: 'expense', repeat: 'monthly', keywords: ['Netflix', 'Fressnapf'] };
    expect(top('Netflix', index([], [...cats, abos]))?.categoryId).toBe('abos');
    expect(top('fressnapf', index([], [...cats, abos]))?.categoryId).toBe('abos');
    // Its own name counts too.
    expect(top('Abos', index([], [...cats, abos]))?.categoryId).toBe('abos');
  });

  it('ignores categories and history that are gone', () => {
    const idx = index([entry('Lidl', 'deleted'), entry('Lidl', 'deleted')]);
    expect(top('Lidl', idx)?.categoryId).toBe('groceries');
  });
});

describe('completeNames', () => {
  it('completes from earlier names first, then the keywords of the most used categories', () => {
    const idx = index([entry('Lieblingsbäcker', 'restaurants'), entry('Rewe', 'groceries'), entry('Rewe', 'groceries')]);
    const names = completeNames(idx, 'Li', { categoryId: 'groceries' }).map(s => s.name);
    expect(names[0]).toBe('Lieblingsbäcker');
    expect(names.indexOf('Lidl')).toBeLessThan(names.indexOf('Lichtblick'));
    expect(completeNames(idx, 'Li', { categoryId: 'groceries' }).find(s => s.name === 'Lidl')?.categoryId).toBe('groceries');
  });

  it('completes the last word and keeps the rest', () => {
    expect(completeNames(index(), 'Tanken bei Ar', { categoryId: 'car' }).map(s => s.name)).toContain('Tanken bei Aral');
    expect(completeNames(index(), 'فاتورة الكهرب', { categoryId: 'fixed' }).map(s => s.name)).toContain('فاتورة الكهرباء');
  });

  it('offers what a typo probably meant', () => {
    expect(completeNames(index(), 'Lidel', { categoryId: 'extra' }).map(s => s.name)).toContain('Lidl');
    expect(completeNames(index(), 'Elektr', { categoryId: 'extra' }).map(s => s.name)).toContain('Electricity');
  });

  it('never offers what is already typed, nor anything for nothing', () => {
    expect(completeNames(index(), 'Lidl', { categoryId: 'groceries' }).map(s => s.name)).not.toContain('Lidl');
    expect(completeNames(index(), ' ', { categoryId: 'groceries' })).toEqual([]);
  });
});

describe('correctTypo', () => {
  it('fixes a word one or two letters off', () => {
    expect(correctTypo(index(), 'Lidel')).toBe('Lidl');
    expect(correctTypo(index(), 'Fittness Studio')).toBe('Fitness Studio');
    expect(correctTypo(index(), 'Electrisity bill')).toBe('Electricity bill');
    expect(correctTypo(index([entry('Habibi Markt', 'groceries')]), 'Habibi Makrt')).toBe('Habibi Markt');
  });

  it('leaves real words, compounds, numbers and words still being typed alone', () => {
    for (const ok of ['Lidl', 'Mieten', 'Stromrechnung', 'Audi', 'Lid', 'Elektr', 'Miete Oktober', 'Rechnung 2026', 'Kfz']) {
      expect(correctTypo(index(), ok)).toBeNull();
    }
  });
});

describe('keywords in Settings', () => {
  it('a built-in follows what ships until edited; a new category has none', () => {
    const groceries = cats.find(c => c.id === 'groceries')!;
    expect(keywordsOf(groceries, 'de')).toContain('Lidl');
    expect(keywordsOf(groceries, 'de')[0]).toBe('Lebensmittel');
    expect(keywordsOf(groceries, 'en')[0]).toBe('Groceries');
    expect(keywordsOf({ ...groceries, keywords: ['Habibi'] }, 'de')).toEqual(['Habibi']);
    expect(keywordsOf({ ...groceries, id: 'x1' }, 'de')).toEqual([]);
  });

  it('knows a list that says what ships, in any order', () => {
    const shipped = shippedKeywords('groceries', 'de');
    expect(isShippedList({ id: 'groceries' }, [...shipped].reverse(), 'de')).toBe(true);
    expect(isShippedList({ id: 'groceries' }, shipped.slice(1), 'de')).toBe(false);
    expect(isShippedList({ id: 'x1' }, [], 'de')).toBe(false);
  });

  it('suggests the names entered most often that no keyword catches yet', () => {
    const groceries = cats.find(c => c.id === 'groceries')!;
    const entries = [entry('Bolu', 'groceries'), entry('Bolu', 'groceries'), entry('Lidl', 'groceries'), entry('Yildiz', 'groceries'),
      entry('Lebensmittel und Drogerie', 'groceries'), entry('Bolu', 'extra')];
    expect(keywordIdeas({ category: groceries, keywords: keywordsOf(groceries, 'de'), entries, lang: 'de' })).toEqual(['Bolu', 'Yildiz']);
    expect(keywordIdeas({ category: groceries, keywords: ['Yildiz'], entries, lang: 'de' })).toEqual(['Bolu', 'Lidl']);
  });

  it('offers a new category the keywords of the built-in its name is closest to', () => {
    expect(keywordsForName('Fitness', 'de')).toContain('Gym');
    expect(keywordsForName('Fitness', 'de')).not.toContain('Fitness');
    expect(keywordsForName('Haustier', 'de')).toEqual([]);
  });

  it('names the other categories that have a keyword too', () => {
    expect(keywordOwners(cats, 'rundfunkbeitrag', 'de', 'fixed')).toEqual(['Steuern und Gebühren']);
    expect(keywordOwners(cats, 'Nichts', 'de')).toEqual([]);
  });
});

describe('stored keywords', () => {
  it('are trimmed, kept once, capped — and unset stays unset', () => {
    expect(normalizeKeywords(['  Lidl ', 'lidl', 'LIDL', '', 7, 'Rewe'])).toEqual(['Lidl', 'Rewe']);
    expect(normalizeKeywords(Array.from({ length: 200 }, (_, i) => `w${i}`))).toHaveLength(120);
    expect(normalizeKeywords('Lidl')).toBeUndefined();
    expect(normalizeKeywords(['x'.repeat(60)])![0]).toHaveLength(40);
  });

  it('go through normalizeState: an empty list is kept, junk dropped', () => {
    const data = normalizeState({
      categories: [
        { id: 'groceries', names: { de: 'Lebensmittel' }, emoji: '🛒', hue: 'lime', kind: 'expense', repeat: 'none', keywords: ['Habibi', 'habibi', null] },
        { id: 'fixed', names: { de: 'Wohnen' }, emoji: '🏠', hue: 'sky', kind: 'expense', repeat: 'none', keywords: [] },
        { id: 'car', names: { de: 'Auto' }, emoji: '🚗', hue: 'carrot', kind: 'expense', repeat: 'none', keywords: 'Aral' },
      ],
      entries: [], months: [],
    });
    expect(data.categories.map(c => c.keywords)).toEqual([['Habibi'], [], undefined]);
    expect('keywords' in data.categories[2]).toBe(false);
  });
});

describe('editDistance', () => {
  it('counts a swap of neighbours as one edit and gives up early', () => {
    expect(editDistance('lidl', 'lidl')).toBe(0);
    expect(editDistance('lidel', 'lidl')).toBe(1);
    expect(editDistance('ldil', 'lidl')).toBe(1);
    expect(editDistance('fittness', 'fitness')).toBe(1);
    expect(editDistance('abcdef', 'uvwxyz', 2)).toBe(3);
  });
});

describe('category keywords in the languages loaded on demand (plan 25)', () => {
  it('a language’s own words for a category are the names it suggests there', async () => {
    await loadLanguage('tr');
    await loadLanguage('fr');
    expect(shippedKeywords('fixed', 'tr')).toContain('Kira');
    expect(shippedKeywords('fixed', 'tr')[0]).toBe('Kira');
    expect(shippedKeywords('fixed', 'fr')).toContain('Loyer');
    // The brands and the German, English and Arabic words stay behind them.
    expect(shippedKeywords('groceries', 'tr')).toEqual(expect.arrayContaining(['Lidl', 'Lebensmittel', 'Groceries']));
    // German, English and Arabic keep exactly their own lists.
    expect(shippedKeywords('fixed', 'de')[0]).toBe('Miete');
    expect(shippedKeywords('fixed', 'de')).not.toContain('Kira');
  });

  it('typing the word guesses the category', async () => {
    await loadLanguage('tr');
    const categories = defaultCategories();
    const index = buildKeywordIndex({ categories, entries: [], lang: 'tr' });
    expect(guessCategories(index, 'Kira')[0]?.categoryId).toBe('fixed');
  });
});
