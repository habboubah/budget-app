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

/**
 * What a new book starts in when the phone's region gives no currency we
 * offer, or there is no region at all. Not DEFAULT_CURRENCY: an unset
 * currency in a stored book or a backup still means euros.
 */
export const FALLBACK_CURRENCY: Currency = 'USD';

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

/** Region (ISO 3166) → a currency we offer, other than the euro. */
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

/**
 * Where the euro is the money: the euro area (Bulgaria since 2026), the
 * states that use it by agreement or on their own, and the overseas parts
 * that iOS and Android list as regions of their own.
 */
const EURO_REGIONS = new Set([
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
  'AD', 'MC', 'SM', 'VA', 'ME', 'XK',
  'AX', 'BL', 'EA', 'GF', 'GP', 'IC', 'MF', 'MQ', 'PM', 'RE', 'TF', 'YT',
]);

/** A region's (ISO 3166) currency when we offer it — euros in the euro area; none otherwise. */
export function currencyForRegion(region: string): Currency | undefined {
  const code = region.toUpperCase();
  return REGION_CURRENCY[code] ?? (EURO_REGIONS.has(code) ? 'EUR' : undefined);
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
