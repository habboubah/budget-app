import { afterEach, describe, expect, it } from 'vitest';
import { currencyFor, currencyForLocales, languageForLocales, setSystemRegion, systemCurrency } from './systemLocale';

afterEach(() => setSystemRegion(undefined));

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
  it('takes the currency of the phone’s region, not of its language', () => {
    expect(currencyFor('DE', ['en-GB'])).toBe('EUR');
    expect(currencyFor('GB', ['de-DE'])).toBe('GBP');
    expect(currencyFor('CH', [])).toBe('CHF');
    expect(currencyFor('AT', ['ar'])).toBe('EUR');
    expect(currencyFor('JP', ['en-GB'])).toBe('USD'); // a region we offer nothing for
  });
  it('uses the region the phone gave at launch', () => {
    setSystemRegion('de');
    expect(systemCurrency()).toBe('EUR');
    setSystemRegion('US');
    expect(systemCurrency()).toBe('USD');
    setSystemRegion('KR');
    expect(systemCurrency()).toBe('USD');
  });
  it('without the phone’s region, takes the first region a locale states', () => {
    expect(currencyFor(undefined, ['de-CH'])).toBe('CHF');
    expect(currencyForLocales(['en', 'en-GB'])).toBe('GBP');
    expect(currencyForLocales(['ar-SA'])).toBe('SAR');
    expect(currencyForLocales(['de-DE'])).toBe('EUR');
    expect(currencyForLocales(['ja-JP'])).toBe('USD');
  });
  it('falls back to US dollars', () => {
    expect(currencyFor(undefined, [])).toBe('USD');
    expect(currencyForLocales([])).toBe('USD');
    expect(currencyForLocales(['en'])).toBe('USD');
  });
});
