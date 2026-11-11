import { describe, expect, it } from 'vitest';
import { parseStatementLines } from './statementPdf';
import { PdfLine, linesFromItems } from './pdfText';

/* A bank statement's PDF lines → transactions. Made-up payees and amounts only. */
const today = new Date(2026, 10, 11);
/** A line from its text; `end` is where its last piece ends on the page (the amount's column). */
const line = (text: string, end = 500): PdfLine => {
  const words = text.split(/\s{2,}/);
  return { page: 1, text: words.join(' '), parts: words.map((w, i) => ({ x: 40 + i * 120, end: i === words.length - 1 ? end : 40 + i * 120 + 80, text: w })) };
};
const pick = (f: { date?: string; name: string; amount: number; income: boolean }) => [f.date, f.name, f.amount, f.income];

describe('a statement with signs at the amounts', () => {
  const found = parseStatementLines([
    line('Kontoauszug 10/2026  vom 01.10.2026 bis 31.10.2026'),
    line('Alter Kontostand  2.150,00 H'),
    line('01.10. 01.10.  Lastschrift  950,00-'),
    line('Hausverwaltung Beispiel GmbH'),
    line('Miete Oktober 2026 Whg 12'),
    line('02.10. 02.10.  Kartenzahlung  45,12-'),
    line('REWE Markt Musterstadt'),
    line('27.10. 27.10.  Gehalt/Rente  3.200,00+'),
    line('Beispiel AG'),
    line('Lohn 10/2026'),
    line('Neuer Kontostand  4.354,88 H'),
  ], today);

  it('finds each transaction with its day, payee, amount and direction', () => {
    expect(found.map(pick)).toEqual([
      ['2026-10-01', 'Hausverwaltung Beispiel', 95000, false],
      ['2026-10-02', 'REWE Markt Musterstadt', 4512, false],
      ['2026-10-27', 'Beispiel', 320000, true],
    ]);
  });

  it('gives each a fingerprint, the same on a second read', () => {
    const again = parseStatementLines([line('01.10.2026 Lastschrift  950,00-'), line('Hausverwaltung Beispiel GmbH'), line('Miete Oktober 2026 Whg 12')], today);
    expect(found[0].ref).toBeTruthy();
    expect(again[0].ref).toBe(found[0].ref);
  });
});

describe('other ways a statement says in or out', () => {
  it('reads S and H, a minus in front, and the payee on the transaction’s own line', () => {
    const found = parseStatementLines([
      line('05.11.2026 05.11.2026 Stadtwerke Musterstadt Abschlag  85,00 S'),
      line('06.11.2026 Erstattung Krankenkasse  120,50 H'),
      line('07.11.2026 Lidl sagt Danke  -23,40 EUR'),
    ], today);
    expect(found.map(pick)).toEqual([
      ['2026-11-05', 'Stadtwerke Musterstadt Abschlag', 8500, false],
      ['2026-11-06', 'Erstattung Krankenkasse', 12050, true],
      ['2026-11-07', 'Lidl', 2340, false],
    ]);
  });

  it('tells a Soll from a Haben column by where the amount stands', () => {
    const found = parseStatementLines([
      line('03.11.2026  Drogerie Beispiel  12,95', 420),
      line('04.11.2026  Tankstelle Beispiel  61,30', 420),
      line('05.11.2026  Beispiel AG  3.200,00', 520),
    ], today);
    expect(found.map(f => f.income)).toEqual([false, false, true]);
  });

  it('falls back to the words when nothing else says', () => {
    const found = parseStatementLines([line('05.11.2026  Gutschrift Beispiel AG  500,00'), line('06.11.2026  Bäckerei Beispiel  4,80')], today);
    expect(found.map(f => f.income)).toEqual([true, false]);
  });
});

describe('dates and noise', () => {
  it('gives a short date the statement’s year, and never a day still to come', () => {
    const jan = new Date(2027, 0, 5);
    const found = parseStatementLines([line('28.12. 28.12.  Kartenzahlung  19,99-'), line('Buchhandlung Beispiel')], jan);
    expect(found[0].date).toBe('2026-12-28');
  });

  it('skips balances, sums and page numbers, and a detail line never becomes a transaction', () => {
    const found = parseStatementLines([
      line('Übertrag  1.000,00 H'),
      line('01.10.2026 Kontostand  1.000,00 H'),
      line('02.10.2026 Kartenzahlung  10,00-'),
      line('Kiosk Beispiel'),
      line('Rechnung 4711 vom 30.09. über 10,00'),
      line('Summe Umsätze  10,00 S'),
      line('Seite 1 von 2'),
    ], today);
    expect(found.map(pick)).toEqual([['2026-10-02', 'Kiosk Beispiel', 1000, false]]);
  });

  it('has nothing to say about a page without transactions', () => {
    expect(parseStatementLines([line('Sehr geehrte Kundin, sehr geehrter Kunde'), line('anbei Ihr Kontoauszug.')], today)).toEqual([]);
  });
});

describe('lines from the pieces of a page', () => {
  it('groups pieces on one baseline, top to bottom, left to right', () => {
    const lines = linesFromItems([
      { x: 300, y: 700, width: 40, text: '45,12-' },
      { x: 40, y: 700.8, width: 30, text: '02.10.' },
      { x: 40, y: 680, width: 90, text: 'REWE Markt' },
      { x: 120, y: 700, width: 70, text: 'Kartenzahlung' },
      { x: 10, y: 660, width: 0, text: '   ' },
    ], 1);
    expect(lines.map(l => l.text)).toEqual(['02.10. Kartenzahlung 45,12-', 'REWE Markt']);
    expect(lines[0].parts[2]).toEqual({ x: 300, end: 340, text: '45,12-' });
  });
});

describe('a table whose cells don’t line up', () => {
  it('takes the amount one line above its date, and one below', () => {
    const found = parseStatementLines([
      line('Kontoauszug vom 01.11.2026 bis 10.11.2026'),
      line('Lastschrift  950,00-'),
      line('03.11. 03.11.  Hausverwaltung Beispiel GmbH'),
      line('Miete November 2026'),
      line('Kartenzahlung  37,45-'),
      line('05.11. 05.11.'),
      line('Baumarkt Beispiel Hanau'),
      line('06.11.2026'),
      line('Beispiel AG  3.200,00+'),
      line('Lohn 11/2026'),
    ], today);
    expect(found.map(pick)).toEqual([
      ['2026-11-03', 'Hausverwaltung Beispiel', 95000, false],
      ['2026-11-05', 'Baumarkt Beispiel Hanau', 3745, false],
      ['2026-11-06', 'Beispiel', 320000, true],
    ]);
  });
});
