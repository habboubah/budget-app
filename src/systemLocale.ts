/*
 * What the phone is set to, for the first start and after "Reset app":
 * its language, and its region for the currency. A choice made under
 * Einstellungen always wins after that; these are only the starting values.
 * Nothing found → German and US dollars (DEFAULT_LANGUAGE, FALLBACK_CURRENCY).
 */
import { Language, isLanguage, DEFAULT_LANGUAGE } from './translations';
import { Currency, FALLBACK_CURRENCY, currencyForRegion } from './currency';

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
 * The phone's own region — iOS's Region setting (Allgemein › Sprache &
 * Region), Android's SIM or network country — as main.tsx asked for it at
 * launch (`systemRegion()`, native/bridge.ts). Unknown on the web.
 */
let phoneRegion: string | undefined;

/** Keeps the region the phone gave ("DE"); anything but two letters is dropped. */
export function setSystemRegion(region: string | null | undefined): void {
  phoneRegion = typeof region === 'string' && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : undefined;
}

/**
 * The currency to start a book in. The phone's region decides when it is
 * known, not its language: English (UK) on a phone set to Germany is euros.
 * Only without a region (the web) do the locales count. A region we offer no
 * currency for → US dollars.
 */
export function currencyFor(region: string | undefined, locales: readonly string[]): Currency {
  if (region) return currencyForRegion(region) ?? FALLBACK_CURRENCY;
  return currencyForLocales(locales);
}

/**
 * The currency of the first locale that names a region ("de-CH" → CHF).
 * Only a region the locale states counts — a bare "en" is not taken for the
 * US. None, or one we don't offer a currency for → US dollars.
 */
export function currencyForLocales(locales: readonly string[]): Currency {
  for (const l of locales) {
    let region: string | undefined;
    try { region = new Intl.Locale(l.replace('_', '-')).region; } catch { region = undefined; }
    if (region) return currencyForRegion(region) ?? FALLBACK_CURRENCY;
  }
  return FALLBACK_CURRENCY;
}

export const systemLanguage = (): Language => languageForLocales(systemLocales());
export const systemCurrency = (): Currency => currencyFor(phoneRegion, systemLocales());
