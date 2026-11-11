import { describe, expect, it } from 'vitest';
import { currencyForLocales, languageForLocales } from './systemLocale';

describe('the phone’s settings as the starting values', () => {
  it('takes the first language the app speaks', () => {
    expect(languageForLocales(['fr-FR', 'en-US'])).toBe('fr');
    expect(languageForLocales(['ja-JP', 'en-GB'])).toBe('en');
    expect(languageForLocales(['ar-SA'])).toBe('ar');
    expect(languageForLocales(['no-NO'])).toBe('nb');
    expect(languageForLocales(['pt_BR'])).toBe('pt');
  });
  it('falls back to German', () => {
    expect(languageForLocales([])).toBe('de');
    expect(languageForLocales(['ja-JP', 'zh-CN'])).toBe('de');
  });
  it('takes the currency of the first stated region', () => {
    expect(currencyForLocales(['de-CH'])).toBe('CHF');
    expect(currencyForLocales(['en', 'en-GB'])).toBe('GBP');
    expect(currencyForLocales(['ar-SA'])).toBe('SAR');
    expect(currencyForLocales(['de-DE'])).toBe('EUR');
    expect(currencyForLocales(['ja-JP'])).toBe('EUR');
  });
  it('falls back to euros without a region', () => {
    expect(currencyForLocales([])).toBe('EUR');
    expect(currencyForLocales(['en'])).toBe('EUR');
  });
});
