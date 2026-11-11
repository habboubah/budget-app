/*
 * What the phone is set to, for the first start and after "Reset app":
 * its language and its region (for the currency). A choice made under
 * Optionen always wins after that; these are only the starting values.
 * Nothing found → German and euros (DEFAULT_LANGUAGE, DEFAULT_CURRENCY).
 */
import { Language, isLanguage, DEFAULT_LANGUAGE } from './translations';
import { Currency, DEFAULT_CURRENCY, currencyForRegion } from './currency';

/** The phone's locales, most preferred first ("de-DE", "en-GB", …). */
export function systemLocales(): string[] {
  const list: string[] = [];
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.languages?.length) list.push(...nav.languages);
    else if (nav?.language) list.push(nav.language);
  } catch { /* no navigator */ }
  try {
    const intl = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intl) list.push(intl);
  } catch { /* no Intl */ }
  return list.filter((l): l is string => typeof l === 'string' && l.length > 0);
}

/** "nb-NO" → "nb"; Norwegian without a written standard ("no", "nn") reads as bokmål. */
function baseLanguage(locale: string): string {
  const base = locale.toLowerCase().split(/[-_]/)[0];
  return base === 'no' || base === 'nn' ? 'nb' : base;
}

/** The first of the phone's languages the app speaks; German otherwise. */
export function languageForLocales(locales: readonly string[]): Language {
  for (const l of locales) {
    const base = baseLanguage(l);
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * The currency of the first locale that names a region ("de-CH" → CHF).
 * Only a region the phone states counts — a bare "en" is not taken for the
 * US. None, or one we don't offer a currency for → euros.
 */
export function currencyForLocales(locales: readonly string[]): Currency {
  for (const l of locales) {
    let region: string | undefined;
    try { region = new Intl.Locale(l.replace('_', '-')).region; } catch { region = undefined; }
    if (region) return currencyForRegion(region);
  }
  return DEFAULT_CURRENCY;
}

export const systemLanguage = (): Language => languageForLocales(systemLocales());
export const systemCurrency = (): Currency => currencyForLocales(systemLocales());
