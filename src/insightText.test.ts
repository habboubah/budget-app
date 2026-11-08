import { describe, expect, it } from 'vitest';
import { Insight, InsightKind } from './insights';
import { insightText } from './insightText';
import translations, { Strings } from './translations';

/** Every kind and variant the rules can produce, with values for every placeholder. */
const VARIANTS: [InsightKind, string][] = [
  ['unusual', 'running'], ['unusual', 'more'], ['unusual', 'less'], ['trend', 'up'], ['trend', 'down'],
  ['betterMonth', 'better'], ['betterMonth', 'worse'], ['record', 'best'], ['record', 'worst'],
  ['dataCheck', 'open'], ['dataCheck', 'stale'], ['bigExpense', 'one'], ['priceChange', 'up'], ['priceChange', 'down'],
  ['newRecurring', 'one'], ['missing', 'expense'], ['missing', 'income'],
];

const insight = (kind: InsightKind, variant: string): Insight => ({
  id: `${kind}:${variant}`, kind, variant, home: 'statistik', months: ['2026-08', '2026-09', '2026-10'], basis: ['2026-05', '2026-06', '2026-07'],
  categoryId: 'groceries', name: 'Disney+', tone: 'warn', impact: 1, confidence: 1, score: 1,
  values: {
    total: 60000, usual: 40000, diff: -20000, pct: 30, recent: 44000, earlier: 40000, saved: 114000, n: 12, count: 4, sum: 31200,
    days: 9, amount: 64900, before: 8300, now: 9500, yearly: 14400, day: 18, material: 3750,
  },
  action: { kind: 'category', target: 'groceries' },
});

describe('hints in words', () => {
  for (const [lang, t] of Object.entries(translations) as [string, Strings][]) {
    it(`says every kind of hint in ${lang}, with nothing left to fill in`, () => {
      for (const [kind, variant] of VARIANTS) {
        const w = insightText(insight(kind, variant), t, () => 'Lebensmittel');
        for (const s of [w.text, w.basis ?? '', w.action ?? '']) {
          expect(s, `${kind}/${variant}`).not.toMatch(/\{\w+\}/);
          expect(s, `${kind}/${variant}`).not.toMatch(/NaN|undefined|Infinity/);
        }
        expect(w.text.length, `${kind}/${variant}`).toBeGreaterThan(5);
        expect(w.action).toBeTruthy();
      }
    });
  }
  it('rounds amounts in sentences, keeps the sign in the template', () => {
    const w = insightText(insight('trend', 'down'), translations.de, () => 'Lebensmittel');
    expect(w.text).toBe('Lebensmittel seit August günstiger: Ø −200\u00a0€ im Monat');
    expect(insightText(insight('priceChange', 'up'), translations.de, () => '').text).toBe('Disney+: 83,00\u00a0€ → 95,00\u00a0€ (+144\u00a0€ im Jahr)');
  });
});
