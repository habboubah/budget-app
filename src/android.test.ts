import { afterEach, describe, expect, it } from 'vitest';
import android from './i18n/android';
import { languages, loadAllLanguages, setPlatformStrings, stringsFor } from './translations';

describe('Android’s wording (plan 23)', () => {
  afterEach(() => setPlatformStrings({}));

  it('covers every language with the same keys, and names nothing of Apple’s', () => {
    const keys = Object.keys(android.de).sort();
    for (const lang of languages) {
      expect(Object.keys(android[lang]).sort(), lang).toEqual(keys);
      for (const text of Object.values(android[lang])) expect(text, lang).not.toMatch(/iPhone|iOS|iCloud|Face ID|Touch ID|Apple/);
    }
  });

  it('replaces every string of the app that names the iPhone, iOS, iCloud, Face ID or Touch ID — but for the Shortcuts guide, which Android does not show', async () => {
    await loadAllLanguages();
    const guide = /^capture/;
    for (const lang of languages) {
      const base = stringsFor(lang) as unknown as Record<string, string>;
      const apple = Object.keys(base).filter(k => typeof base[k] === 'string' && /iPhone|iOS\b|iCloud|Face ID|Touch ID/.test(base[k]) && !guide.test(k));
      expect(apple.filter(k => !(k in android[lang])), lang).toEqual([]);
    }
  });

  it('is laid over a language only once it is set, and leaves the rest of it alone', () => {
    expect(stringsFor('de').deviceBackup).toBe('Im iPhone-Backup sichern');
    setPlatformStrings(android);
    expect(stringsFor('de').deviceBackup).toBe('Im Gerätebackup sichern');
    expect(stringsFor('en').lockTouchId).toBe('Lock with fingerprint');
    expect(stringsFor('de').save).toBe('Sichern');
  });
});
