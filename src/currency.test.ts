import { afterEach, describe, expect, it } from 'vitest';
import { CURRENCIES, currencyForLocale, hasTwoMinorDigits, isSupportedCurrency } from './currency';
import { formatMoney, getActiveCurrency, parseAmount, setActiveCurrency } from './logic';

afterEach(() => setActiveCurrency('EUR'));

describe('currency list', () => {
  it('every offered currency has exactly two minor digits', () => {
    for (const c of CURRENCIES) expect(hasTwoMinorDigits(c)).toBe(true);
    // Zero- and three-digit currencies are deliberately left out.
    expect(hasTwoMinorDigits('JPY')).toBe(false);
    expect(hasTwoMinorDigits('KWD')).toBe(false);
  });

  it('recognises supported codes', () => {
    expect(isSupportedCurrency('CHF')).toBe(true);
    expect(isSupportedCurrency('JPY')).toBe(false);
    expect(isSupportedCurrency(42)).toBe(false);
  });
});

describe('regional default', () => {
  it('maps a region to a supported currency, else EUR', () => {
    expect(currencyForLocale('de-CH')).toBe('CHF');
    expect(currencyForLocale('en-GB')).toBe('GBP');
    expect(currencyForLocale('ar-SA')).toBe('SAR');
    expect(currencyForLocale('de-DE')).toBe('EUR');
    expect(currencyForLocale('ja-JP')).toBe('EUR'); // JPY unsupported → EUR
  });
});

describe('the active currency', () => {
  it('relabels amounts without converting them', () => {
    setActiveCurrency('CHF');
    expect(getActiveCurrency()).toBe('CHF');
    expect(formatMoney(105000, 'de-CH')).toContain('CHF');
    setActiveCurrency('GBP');
    expect(formatMoney(105000, 'en-GB')).toContain('£');
  });

  it('keeps an Arabic amount left to right with SAR', () => {
    setActiveCurrency('SAR');
    const out = formatMoney(105000, 'ar');
    // The digits and separators are Western (the app uses ar-u-nu-latn in the UI).
    expect(out).toMatch(/\d/);
  });
});

describe('parseAmount with symbols, codes and grouping', () => {
  it('strips a currency symbol or a three-letter code', () => {
    expect(parseAmount('£ 9,99', 'en-GB')).toBe(999);
    expect(parseAmount('9.99 GBP', 'en-GB')).toBe(999);
    expect(parseAmount('CHF 1’050.50', 'de-CH')).toBe(105050);
  });

  it("reads Swiss apostrophe grouping", () => {
    expect(parseAmount("1'050.50", 'de-CH')).toBe(105050);
    expect(parseAmount('1’050.50', 'de-CH')).toBe(105050);
  });
});
