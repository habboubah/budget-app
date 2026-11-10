import { describe, expect, it } from 'vitest';
import { parseNotificationText } from './statementImport';

/*
 * Plan 19. The wording follows the usual shapes of German banking pushes;
 * every sample is written for this test — no real name, shop visit or
 * amount. Real texts (anonymised) belong here as they are collected.
 */
const read = (title: string, body: string) => parseNotificationText(`${title}\n${body}`);

describe('a banking app’s notification', () => {
  it.each([
    // [title, body, amount, name, income]
    ['Sparkasse', 'Kartenzahlung 12,40 € bei REWE Markt GmbH', 1240, 'REWE Markt', false],
    ['Kontowecker', 'Umsatz: -45,90 EUR ARAL TANKSTELLE. Neuer Kontostand: 1.204,33 EUR', 4590, 'Aral Tankstelle', false],
    ['VR Banking', 'Lastschrift über 39,99 EUR von Musterfunk GmbH wurde gebucht.', 3999, 'Musterfunk', false],
    ['ING', 'Du hast 8,50 € bei Bäckerei Muster bezahlt.', 850, 'Bäckerei Muster', false],
    ['DKB', 'Kartenzahlung bei LIDL in Höhe von 23,17 EUR am 09.11.2026.', 2317, 'Lidl', false],
    ['Commerzbank', 'Gutschrift: 2.614,50 EUR von Muster AG, Gehalt', 261450, 'Muster', true],
    ['Musterladen', '€ 19,99 · Mit deiner Karte bezahlt', 1999, 'Musterladen', false],
    ['Revolut', 'Paid €4.20 at Coffee Corner', 420, 'Coffee Corner', false],
    ['PayPal', 'Du hast 25,00 € EUR an Kim Beispiel gesendet.', 2500, 'Kim Beispiel', false],
    ['PayPal', 'Alex Muster hat dir 20,00 € gesendet.', 2000, 'Alex Muster', true],
    ['C24 Bank', 'Geldeingang: +150,00 € von Erika Beispiel', 15000, 'Erika Beispiel', true],
    ['Trade Republic', 'Kartenzahlung über 1.050,00 € bei Möbelhaus Beispiel', 105000, 'Möbelhaus Beispiel', false],
    ['Card payment', 'You paid 1,234.56 EUR to Example Travel Ltd.', 123456, 'Example Travel', false],
    ['بنك', 'Kartenzahlung ١٢٫٤٠ € bei REWE'.replace('٫', ','), 1240, 'Rewe', false],
  ])('%s: %s', (title, body, amount, name, income) => {
    expect(read(title, body)).toMatchObject({ amount, name, income });
  });

  it('takes the day when the text names one', () => {
    expect(read('DKB', 'Kartenzahlung bei LIDL in Höhe von 23,17 EUR am 09.11.2026.')?.date).toBe('2026-11-09');
    expect(read('ING', 'Du hast 8,50 € bei Bäckerei Muster bezahlt.')?.date).toBeUndefined();
  });

  it('a balance is never the payment', () => {
    expect(read('Kontowecker', 'Ihr Kontostand: 1.204,33 EUR')).toBeNull();
    expect(read('Bank', 'Verfügbarer Betrag: 300,00 €. Zahlung 12,00 € bei Kiosk')).toMatchObject({ amount: 1200, name: 'Kiosk' });
  });

  it('nothing to book: a code, an offer, a number without a currency', () => {
    expect(read('Bank', 'Ihre TAN lautet 482913')).toBeNull();
    expect(read('Bank', 'Neu: 3 Monate Depot ohne Gebühren')).toBeNull();
    expect(parseNotificationText('')).toBeNull();
  });

  it('an amount without a payee still comes through, to be named in the app', () => {
    expect(read('Kartenzahlung', '12,40 € wurden abgebucht')).toMatchObject({ amount: 1240, name: '', income: false });
  });
});
