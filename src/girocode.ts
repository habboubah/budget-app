import { EntryDraft } from './types';
import { MAX_CENTS, cleanText } from './logic';
import { cleanPayee } from './statementImport';

/*
 * The QR code on an invoice — "GiroCode" in Germany, the EPC's *SEPA credit
 * transfer* QR code elsewhere in Europe. Its text is a short list of lines:
 *
 *   BCD · version (001 / 002) · character set · SCT · BIC · name of the
 *   payee · IBAN · EUR12.34 · purpose code · structured reference ·
 *   unstructured text · a note for the payer
 *
 * `parseGiroCode` reads it, `giroCodeEntry` turns it into what the entry
 * sheet opens with: an open bill by the payee's name, with the reference and
 * the IBAN in its note — everything needed to pay it from the banking app.
 * Pure and tested; the photo is read by `qrScan.ts`.
 */

export interface GiroCode {
  /** Who is paid. */
  name: string;
  iban: string;
  bic?: string;
  /** Cents; absent when the code leaves the amount to the payer. */
  amount?: number;
  currency?: string;
  /** The reference to quote: the structured one (RF…) or the free text. */
  reference?: string;
}

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/** A QR code's text as a GiroCode, or null when it is something else (a link, a ticket). */
export function parseGiroCode(text: string): GiroCode | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim());
  // Service tag, version, character set, identification — then the payment.
  if (lines[0] !== 'BCD' || !/^00[12]$/.test(lines[1] ?? '') || lines[3] !== 'SCT') return null;
  const name = cleanText(lines[5] ?? '', 70);
  const iban = (lines[6] ?? '').replace(/\s+/g, '').toUpperCase();
  if (!name || !IBAN.test(iban)) return null;
  const code: GiroCode = { name, iban };
  const bic = (lines[4] ?? '').toUpperCase();
  if (/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) code.bic = bic;
  // "EUR12.34": three letters, then the amount with a dot and at most two decimals.
  const money = /^([A-Z]{3})(\d{1,9}(?:\.\d{1,2})?)$/.exec(lines[7] ?? '');
  if (money) {
    const cents = Math.round(Number(money[2]) * 100);
    if (cents > 0 && cents <= MAX_CENTS) { code.amount = cents; code.currency = money[1]; }
  }
  const reference = cleanText(lines[9] || lines[10] || '', 140);
  if (reference) code.reference = reference;
  return code;
}

/** "DE89 3704 0044 0532 0130 00" — an IBAN in groups of four, as banking apps take it. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, '$1 ');
}

/** What the entry sheet opens with for a scanned invoice: open, by the payee's name, the reference and IBAN as its note. */
export function giroCodeEntry(code: GiroCode): Pick<EntryDraft, 'name' | 'paid'> & { amount?: number; note: string } {
  const note = [code.reference, formatIban(code.iban)].filter(Boolean).join(' · ');
  // The payee as the bank import would name it ("Stadtwerke Hanau GmbH" → "Stadtwerke Hanau").
  return { name: cleanPayee(code.name) || code.name, paid: false, ...(code.amount ? { amount: code.amount } : {}), note: cleanText(note, 200) };
}
