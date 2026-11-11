import { describe, expect, it } from 'vitest';
import encodeQR from 'qr';
import { decodeQR } from 'qr/decode.js';
import { formatIban, giroCodeEntry, parseGiroCode } from './girocode';

/* The QR code on an invoice (EPC / GiroCode): its text, and the entry it becomes. Made-up payees and IBANs only. */
const code = (lines: string[]) => lines.join('\n');
const invoice = code(['BCD', '002', '1', 'SCT', 'COBADEFFXXX', 'Stadtwerke Musterstadt GmbH', 'DE89370400440532013000', 'EUR85.40', '', '', 'Rechnung 2026-1187 Kundennr 4711']);

describe('reading a GiroCode', () => {
  it('finds the payee, the IBAN, the amount in cents and the reference', () => {
    expect(parseGiroCode(invoice)).toEqual({
      name: 'Stadtwerke Musterstadt GmbH', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX',
      amount: 8540, currency: 'EUR', reference: 'Rechnung 2026-1187 Kundennr 4711',
    });
  });

  it('reads Windows line ends, an IBAN with spaces, a structured reference and a code without BIC or amount', () => {
    const bare = ['BCD', '001', '2', 'SCT', '', 'Praxis Dr. Beispiel', 'de89 3704 0044 0532 0130 00', '', '', 'RF18539007547034', ''].join('\r\n');
    expect(parseGiroCode(bare)).toEqual({ name: 'Praxis Dr. Beispiel', iban: 'DE89370400440532013000', reference: 'RF18539007547034' });
  });

  it('takes whole and one-decimal amounts, and leaves out what isn’t one', () => {
    const withAmount = (a: string) => parseGiroCode(code(['BCD', '002', '1', 'SCT', '', 'X', 'DE89370400440532013000', a]))?.amount;
    expect(withAmount('EUR12')).toBe(1200);
    expect(withAmount('EUR12.5')).toBe(1250);
    expect(withAmount('EUR0.00')).toBeUndefined();
    expect(withAmount('12,50 €')).toBeUndefined();
  });

  it('is null for anything else', () => {
    expect(parseGiroCode('https://example.org/pay?id=1')).toBeNull();
    expect(parseGiroCode(code(['BCD', '002', '1', 'INST', '', 'X', 'DE89370400440532013000']))).toBeNull();
    expect(parseGiroCode(code(['BCD', '002', '1', 'SCT', '', '', 'DE89370400440532013000']))).toBeNull();
    expect(parseGiroCode(code(['BCD', '002', '1', 'SCT', '', 'X', 'not an iban']))).toBeNull();
    expect(parseGiroCode('')).toBeNull();
  });
});

describe('the entry a scanned invoice becomes', () => {
  it('is open, by the payee’s name, with the reference and the IBAN as its note', () => {
    expect(giroCodeEntry(parseGiroCode(invoice)!)).toEqual({
      name: 'Stadtwerke Musterstadt', paid: false, amount: 8540,
      note: 'Rechnung 2026-1187 Kundennr 4711 · DE89 3704 0044 0532 0130 00',
    });
  });

  it('has no amount when the code leaves it open, and a note that fits', () => {
    const open = giroCodeEntry({ name: 'Verein e. V.', iban: 'DE89370400440532013000', reference: 'x'.repeat(190) });
    expect(open.amount).toBeUndefined();
    expect(open.note.length).toBeLessThanOrEqual(200);
    expect(formatIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });
});

describe('the code as a picture', () => {
  it('comes back as the same text from the decoder the app uses', () => {
    // The code as black and white modules, six pixels each, with a quiet zone — as RGBA pixels.
    const modules = encodeQR(invoice, 'raw', { ecc: 'medium' });
    const scale = 6;
    const quiet = 4 * scale;
    const side = modules.length * scale + 2 * quiet;
    const data = new Uint8ClampedArray(side * side * 4).fill(255);
    modules.forEach((row, y) => row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const i = ((quiet + y * scale + dy) * side + quiet + x * scale + dx) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }));
    expect(parseGiroCode(decodeQR({ width: side, height: side, data }))).toMatchObject({ amount: 8540, iban: 'DE89370400440532013000' });
  });
});
