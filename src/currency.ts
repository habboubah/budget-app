/*
 * Currency (plan 07). Amounts are integer cents, so only currencies with
 * exactly two minor digits are supported (EUR, CHF, GBP, USD, SAR, …) — JPY,
 * KWD and the like are left out. Unset means EUR, so every existing book stays
 * as it is. No conversion and no exchange rates: changing the currency only
 * relabels the amounts.
 */

/** ISO 4217 codes offered in the picker, each with exactly two minor units. */
export const CURRENCIES = [
  'EUR', 'CHF', 'GBP', 'USD', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN',
  'CZK', 'TRY', 'SAR', 'AED', 'QAR', 'EGP', 'MAD',
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'EUR';

/** Whether a code is one we support (two minor digits and in the list). */
export function isSupportedCurrency(code: unknown): code is Currency {
  return typeof code === 'string' && (CURRENCIES as readonly string[]).includes(code);
}

/**
 * Whether a currency has exactly two minor digits (integer-cents safe). Used
 * to keep the list honest; the app offers only `CURRENCIES`, which all pass.
 */
export function hasTwoMinorDigits(code: string): boolean {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits === 2;
  } catch {
    return false;
  }
}

/** Region (ISO 3166) → a supported currency. Only where it isn't EUR and we support it. */
const REGION_CURRENCY: Record<string, Currency> = {
  CH: 'CHF', LI: 'CHF',
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  SE: 'SEK', NO: 'NOK', DK: 'DKK',
  PL: 'PLN', CZ: 'CZK',
  TR: 'TRY',
  SA: 'SAR', AE: 'AED', QA: 'QAR', EG: 'EGP', MA: 'MAD',
};

/** A region's (ISO 3166) currency, when we offer it; EUR otherwise. */
export function currencyForRegion(region: string): Currency {
  return REGION_CURRENCY[region.toUpperCase()] ?? DEFAULT_CURRENCY;
}

/** The currency to start a new book with, from the phone's region; EUR otherwise. */
export function currencyForLocale(locale: string): Currency {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  } catch {
    // Older engines without Locale.maximize(): fall through to EUR.
  }
  return DEFAULT_CURRENCY;
}

/** The currency's own name in a language, for the picker ("Schweizer Franken"). */
export function currencyName(code: Currency, locale: string): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'currency' });
    const name = dn.of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}
