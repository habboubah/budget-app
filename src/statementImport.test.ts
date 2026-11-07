import { describe, expect, it } from 'vitest';
import { applyStatement, cleanPayee, parseBankCsv, parseDay, parseStatementText, planStatement, signedCents } from './statementImport';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

// Made-up transactions in the shape of a Sparkasse CSV-CAMT export (no real data).
const HEADER = '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info";"Kategorie"';
const row = (day: string, type: string, purpose: string, payee: string, amount: string, category = '', info = 'Umsatz gebucht') =>
  `"DE00123";"${day}";"${day}";"${type}";"${purpose}";"";"";"";"";"";"";"${payee}";"";"";"${amount}";"EUR";"${info}";"${category}"`;
const CSV = [
  HEADER,
  row('05.11.26', 'KARTENZAHLUNG', '2026-11-04T10:12 Debitk.1 2030-01', 'BACKSTUBE MUSTER/Hauptstr. 1/Musterstadt/DE', '-4,80', 'Lebensmittel und Drogerie'),
  row('04.11.26', 'FOLGELASTSCHRIFT', '123-456 AMZN Mktp DE XYZ', 'AMAZON PAYMENTS EUROPE S.C.A.', '-19,99', 'Einkäufe'),
  row('03.11.26', 'FOLGELASTSCHRIFT', '1000/PP.1. Ihr Einkauf bei Musterladen, Danke', 'PayPal Europe S.a.r.l. et Cie S.C.A', '-3,30', 'Einkäufe'),
  row('01.11.26', 'LOHN  GEHALT', 'LOHN NOVEMBER', 'MUSTER GMBH', '3.100,00', 'Einkommen'),
  row('01.11.26', 'DAUERAUFTRAG', 'Miete November', 'Erika Mustermann', '-1.050,00'),
  row('31.10.26', 'ENTGELTABSCHLUSS', 'Entgeltabrechnung', '', '-4,95'),
  row('02.11.26', 'GUTSCHR. UEBERWEISUNG', 'BEITRAGSGUTHABEN', 'VERSICHERUNG AG', '12,00', 'Absicherung und Vorsorge'),
].join('\r\n');

describe('reading bank exports', () => {
  it('reads amounts and dates the way banks write them', () => {
    expect(signedCents('-1.234,56')).toBe(-123456);
    expect(signedCents('22,82-')).toBe(-2282);
    expect(signedCents('−22,82 EUR')).toBe(-2282);
    expect(signedCents('+3.100,00 €')).toBe(310000);
    expect(signedCents('2029-12')).toBeNull();
    expect(parseDay('09.11.26')).toBe('2026-11-09');
    expect(parseDay('2026-11-04T04:28')).toBe('2026-11-04');
    expect(parseDay('31.02.2026')).toBeUndefined();
  });
  it('turns payees into names', () => {
    expect(cleanPayee('LIDL SAGT DANKE/Musterweg 1/Musterst')).toBe('Lidl');
    expect(cleanPayee('AMAZON PAYMENTS EUROPE S.C.A.')).toBe('Amazon');
    expect(cleanPayee('APPLE.COM/BILL         CORK           IE')).toBe('Apple');
    expect(cleanPayee('0123 C+A MUSTERSTADT 2/Hauptstr. 9/Musterstadt/DE')).toBe('C+A Musterstadt');
    expect(cleanPayee('Uber Payments B.V./Musterstraat 1/Amsterdam/NL/1')).toBe('Uber');
    expect(cleanPayee('PayPal Europe S.a.r.l. et Cie S.C.A', 'PP.1234.PP/. Musteramt, Ihr Einkauf bei Musteramt')).toBe('Musteramt');
    expect(cleanPayee('', 'Entgeltabrechnung', 'ENTGELTABSCHLUSS')).toBe('Entgeltabschluss');
    expect(cleanPayee('ABC-MUSTER UNTERNEHMENSGRUPPE')).toBe('ABC-Muster');
    expect(cleanPayee('REWE SAGT DANKE. 12345678')).toBe('Rewe');
    expect(cleanPayee('Ryanair123ab4cde')).toBe('Ryanair');
    expect(cleanPayee('Check24')).toBe('Check24');
    expect(cleanPayee('PayPal Europe', 'PP.1/. Ihr Einkauf bei Musteramt ’')).toBe('Musteramt');
    expect(cleanPayee('Deutsche Bahn Aktiengesellschaft')).toBe('Deutsche Bahn');
    expect(cleanPayee('F000111222333', 'EC 12345678', 'SONSTIGER EINZUG')).toBe('Sonstiger Einzug');
    expect(cleanPayee('GA NR00001234 BLZ12345678', '', 'BARGELDAUSZAHLUNG')).toBe('Bargeld');
  });
  it('parses a Sparkasse CSV export', () => {
    const f = parseBankCsv(CSV);
    expect(f.map(x => [x.date, x.name, x.amount, x.income, x.bankCategory ?? ''])).toEqual([
      ['2026-11-05', 'Backstube Muster', 480, false, 'Lebensmittel und Drogerie'],
      ['2026-11-04', 'Amazon', 1999, false, 'Einkäufe'],
      ['2026-11-03', 'Musterladen', 330, false, 'Einkäufe'],
      ['2026-11-01', 'Muster', 310000, true, 'Einkommen'],
      ['2026-11-01', 'Erika Mustermann', 105000, false, ''],
      ['2026-10-31', 'Entgeltabschluss', 495, false, ''],
      ['2026-11-02', 'Versicherung', 1200, true, 'Absicherung und Vorsorge'],
    ]);
    expect(new Set(f.map(x => x.ref)).size).toBe(f.length);
  });
  it('finds the header below lines of account details, and reads debit / credit columns', () => {
    const ing = ['Umsatzanzeige;Datei erstellt am: 07.11.2026', 'IBAN;DE00 1234', '', 'Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Soll;Haben;Währung',
      '03.11.2026;03.11.2026;REWE Markt GmbH;Lastschrift;Einkauf;23,45;;EUR', '01.11.2026;01.11.2026;Arbeitgeber;Gutschrift;Gehalt;;2.500,00;EUR'].join('\n');
    expect(parseBankCsv(ing).map(x => [x.name, x.amount, x.income])).toEqual([['REWE Markt', 2345, false], ['Arbeitgeber', 250000, true]]);
    expect(parseBankCsv('a;b;c\n1;2;3')).toEqual([]);
  });
});

describe('reading a photo of a transaction list', () => {
  // How the text recognition hands back a banking app screenshot (made-up values).
  const OCR = [
    '05.11.2026',
    'Uber Payments B.V./Musterstraat 1/Amsterdam/NL/1 -12,40 EUR',
    '2026-11-04T04:28 Debitk.1 2030-01 Zahl.System DebitMastercard',
    'Freizeit und Unterhaltung',
    '03.11.2026',
    'PayPal Europe S.a.r.l. et Cie S.C.A -3,30 EUR',
    '1000/PP.1/. Musterladen, Ihr Einkauf bei Musterladen',
    'Einkäufe',
    'amazon',
    'AMAZON PAYMENTS EUROPE S.C.A. -11,99 EUR',
    '123-4567890 AMZN Mktp DE',
    'Einkäufe',
    'Erstattung Muster',
    '+25,00 EUR',
  ].join('\n');
  it('reads payee, amount, date and the bank’s category', () => {
    const f = parseStatementText(OCR, ['Freizeit und Unterhaltung', 'Einkäufe']);
    expect(f.map(x => [x.date, x.name, x.amount, x.income, x.bankCategory ?? ''])).toEqual([
      ['2026-11-05', 'Uber', 1240, false, 'Freizeit und Unterhaltung'],
      ['2026-11-03', 'Musterladen', 330, false, 'Einkäufe'],
      ['2026-11-03', 'Amazon', 1199, false, 'Einkäufe'],
      ['2026-11-03', 'Erstattung Muster', 2500, true, ''],
    ]);
  });
});

describe('reading a photo, when the reader splits the layout', () => {
  it('gives amounts read apart from their payees to them, in order, and skips icons', () => {
    const split = [
      '03.11.2026',
      'Y     Kiosk Muster/Bahnhofstr. 1/Musterstadt',
      '2026-11-02T10:00 Debitk.1 2030-01                     -4,20 EUR',
      '© Freizeit und Unterhaltung',
      'PayPal Europe S.a.r.l. et Cie S.C.A',
      '1000/PP.1/. Musterladen, Ihr Einkauf bei Musterladen',
      'A Einkäufe',
      'AMAZON PAYMENTS EUROPE S.C.A.',
      '123-4567890 AMZN Mktp DE',
      'AM Einkäufe',
      '-3.30 EUR',
      'amazon',
      '—>',
      '-11,99 EUR',
    ].join('\n');
    const f = parseStatementText(split, ['Freizeit und Unterhaltung', 'Einkäufe']);
    expect(f.map(x => [x.name, x.amount, x.income, x.bankCategory ?? ''])).toEqual([
      ['Kiosk Muster', 420, false, 'Freizeit und Unterhaltung'],
      ['Musterladen', 330, false, 'Einkäufe'],
      ['Amazon', 1199, false, 'Einkäufe'],
    ]);
  });
});

describe('planning an import', () => {
  const cats = defaultCategories();
  let n = 0;
  const e = (month: string, categoryId: string, name: string, amount: number, paid: boolean, extra: Partial<Entry> = {}): Entry =>
    ({ id: `x${++n}`, month, categoryId, name, amount, paid, repeat: 'none', seriesId: `s${n}`, createdAt: n, ...extra });
  const entries = [
    e('2026-10', 'groceries', 'Backstube Muster', 350, true),
    e('2026-11', 'fixed', 'Miete', 105000, false, { date: '2026-11-01' }),
    e('2026-11', 'extra', 'Amazon', 1999, true, { date: '2026-11-04' }),
    e('2026-11', 'income', 'Gehalt', 310000, false, { date: '2026-11-01' }),
  ];
  const data: AppData = { categories: cats, entries, months: [{ key: '2026-10', startedAt: 0 }, { key: '2026-11', startedAt: 0 }] };
  const plan = planStatement(parseBankCsv(CSV), data, new Date(2026, 10, 7));
  const view = plan.map(r => [r.name, r.categoryId, r.status, r.include]);

  it('uses the user’s names and categories, then the bank’s, then Sonstiges', () => {
    expect(view[0]).toEqual(['Backstube Muster', 'groceries', 'new', true]);
    expect(view[2]).toEqual(['Musterladen', 'shopping', 'new', true]);
    expect(view[5]).toEqual(['Entgeltabschluss', 'extra', 'new', true]);
    // A refund is money coming in: an income category, whatever the bank files it under.
    expect(view[6]).toEqual(['Versicherung', 'income', 'new', true]);
  });
  it('knows what is entered already, and what an open entry it pays', () => {
    expect(view[1]).toEqual(['Amazon', 'extra', 'exists', false]);
    // Different name, same amount and date: the open rent; the open salary likewise.
    expect(plan[4]).toMatchObject({ status: 'pay', match: { name: 'Miete' } });
    expect(plan[3]).toMatchObject({ status: 'pay', match: { name: 'Gehalt' } });
  });
  it('confirms into new paid entries and ticks, and spots a second import', () => {
    let k = 0;
    const { add, pay } = applyStatement(plan, 1000, () => `n${++k}`);
    expect(add.map(x => [x.name, x.month, x.date, x.paid, x.repeat])).toEqual([
      ['Backstube Muster', '2026-11', '2026-11-05', true, 'none'],
      ['Musterladen', '2026-11', '2026-11-03', true, 'none'],
      ['Entgeltabschluss', '2026-10', '2026-10-31', true, 'none'],
      ['Versicherung', '2026-11', '2026-11-02', true, 'none'],
    ]);
    expect(pay.sort()).toEqual([entries[1].id, entries[3].id].sort());
    const again = planStatement(parseBankCsv(CSV), { ...data, entries: [...entries, ...add] }, new Date(2026, 10, 7));
    expect(again.filter(r => r.status === 'new')).toEqual([]);
  });
});
