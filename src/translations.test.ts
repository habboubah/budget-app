import { describe, expect, it } from 'vitest';
import translations, { LANGUAGE_NAMES, fmt, languageForTag, languages, loadAllLanguages } from './translations';
import { CATEGORY_NAMES } from './data/names';
import { NAME_SUGGESTIONS, defaultCategories } from './data/defaults';
import { foldForSearch, normalizeName, parseAmount } from './logic';

/*
 * The checklist for a language (CLAUDE.md, i18n), as tests: every key, the
 * same placeholders as German, its own name and direction, a locale Intl
 * knows, a CSV header with every column, and the built-in names.
 */
await loadAllLanguages();

const de = translations.de;
const keys = Object.keys(de) as (keyof typeof de)[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe.each([...languages])('%s', lang => {
  const t = translations[lang];

  it('has every key, none of them empty', () => {
    expect(Object.keys(t).sort()).toEqual([...keys].sort());
    for (const k of keys) expect(t[k].trim(), `${lang}.${k}`).not.toBe('');
  });

  it('keeps the placeholders of every German string, and adds none', () => {
    // A singular ("…One") may still say {n}: plural() fills it, and the
    // count-neutral wording ("النتائج: {n}") needs it.
    for (const k of keys) {
      const own = placeholders(t[k]).filter(p => !(p === 'n' && k.endsWith('One')));
      expect(own, `${lang}.${k}`).toEqual(placeholders(de[k]).filter(p => !(p === 'n' && k.endsWith('One'))));
    }
  });

  it('names itself as the picker does, in its own direction, with a locale Intl knows', () => {
    expect(t.languageName).toBe(LANGUAGE_NAMES[lang]);
    expect(t.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    expect(Intl.NumberFormat.supportedLocalesOf([t.locale])).toHaveLength(1);
    expect(Intl.DateTimeFormat.supportedLocalesOf([t.locale])).toHaveLength(1);
  });

  it('has a CSV header with every column', () => {
    expect(t.csvHeader.split(';')).toHaveLength(de.csvHeader.split(';').length);
  });

  it('names every built-in category, and every suggestion that isn’t a brand', () => {
    for (const c of defaultCategories()) expect(c.names[lang], `${c.id}`).toBeTruthy();
    for (const [id, list] of Object.entries(NAME_SUGGESTIONS)) {
      for (const n of list) if (n.en) expect(n[lang], `${id}: ${n.de}`).toBeTruthy();
    }
  });
});

describe('built-in category names', () => {
  it('cover exactly the built-ins, in every language beyond de, en and ar', () => {
    const ids = defaultCategories().map(c => c.id).sort();
    for (const [lang, names] of Object.entries(CATEGORY_NAMES)) expect(Object.keys(names).sort(), lang).toEqual(ids);
    expect(Object.keys(CATEGORY_NAMES).sort()).toEqual(languages.filter(l => !['de', 'en', 'ar'].includes(l)).sort());
  });

  it('never give one category another’s name, in any language (the keyword index reads them all)', () => {
    const owner = new Map<string, string>();
    for (const c of defaultCategories()) {
      for (const name of Object.values(c.names)) {
        const key = normalizeName(name);
        expect(owner.get(key) ?? c.id, `“${name}”`).toBe(c.id);
        owner.set(key, c.id);
      }
    }
  });
});

describe('the device language on first launch', () => {
  it('maps a tag to a language we speak', () => {
    expect(languageForTag('tr-TR')).toBe('tr');
    expect(languageForTag('pt-BR')).toBe('pt');
    expect(languageForTag('fr_CH')).toBe('fr');
    expect(languageForTag('de-AT')).toBe('de');
    expect(languageForTag('ar-SA')).toBe('ar');
  });
  it('gives Norwegian Bokmål for nb, no and nn', () => {
    expect(languageForTag('nb-NO')).toBe('nb');
    expect(languageForTag('no')).toBe('nb');
    expect(languageForTag('nn-NO')).toBe('nb');
  });
  it('knows when it doesn’t speak one', () => {
    expect(languageForTag('ru-RU')).toBeNull();
    expect(languageForTag('')).toBeNull();
    expect(languageForTag(undefined)).toBeNull();
  });
});

describe('search folds the new languages’ letters', () => {
  it('Turkish dotted and dotless i', () => {
    expect(foldForSearch('İstanbul')).toBe(foldForSearch('istanbul'));
    expect(foldForSearch('Isparta')).toBe(foldForSearch('ısparta'));
    expect(foldForSearch('Kırtasiye')).toBe('kirtasiye');
  });
  it('ø, æ, œ, ł and the accents', () => {
    expect(foldForSearch('Smør')).toBe('smor');
    expect(foldForSearch('Bær')).toBe('baer');
    expect(foldForSearch('Œuvre')).toBe('oeuvre');
    expect(foldForSearch('Łódź')).toBe('lodz');
    expect(foldForSearch('Příjmy')).toBe('prijmy');
    expect(foldForSearch('Övrigt')).toBe('ovrigt');
  });
});

describe('amounts in each language’s writing', () => {
  it('a decimal comma: the dot groups thousands', () => {
    for (const locale of ['tr-TR', 'it-IT', 'es-ES', 'nl-NL', 'pt-PT', 'da-DK']) {
      expect(parseAmount('1.050', locale), locale).toBe(105000);
      expect(parseAmount('1.050,50', locale), locale).toBe(105050);
      expect(parseAmount('12,5', locale), locale).toBe(1250);
    }
  });
  it('spaces group thousands (fr, pl, cs, sv, nb), with any of the spaces Intl writes', () => {
    for (const locale of ['fr-FR', 'pl-PL', 'cs-CZ', 'sv-SE', 'nb-NO']) {
      expect(parseAmount('1 050,50', locale), locale).toBe(105050);
      expect(parseAmount('1 050,50', locale), locale).toBe(105050);
      expect(parseAmount('1 050,50', locale), locale).toBe(105050);
      expect(parseAmount('4,99', locale), locale).toBe(499);
    }
  });
  it('a decimal point still reads as one, whatever the language', () => {
    expect(parseAmount('12.50', 'tr-TR')).toBe(1250);
    expect(parseAmount('12.50', 'fr-FR')).toBe(1250);
  });
  it('what each language formats reads back', () => {
    for (const lang of languages) {
      const { locale } = translations[lang];
      const text = new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(1050.5);
      expect(parseAmount(text, locale), `${lang} “${text}”`).toBe(105050);
    }
  });
});

describe('month names that open a line', () => {
  it('start with a capital, as the title does', () => {
    expect(fmt('{month} jest jeszcze pusty', { month: 'listopad 2026' })).toBe('Listopad 2026 jest jeszcze pusty');
    expect(fmt('{span} · {total}', { span: 'juin – septembre 2026', total: '1 €' })).toBe('Juin – septembre 2026 · 1 €');
  });
  it('stay as they are inside a sentence, and a name keeps its own case', () => {
    expect(fmt('Przeniesione z: {month}', { month: 'listopad 2026' })).toBe('Przeniesione z: listopad 2026');
    expect(fmt('{name} manque', { name: 'dm' })).toBe('dm manque');
  });
});
