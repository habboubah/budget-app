import { isoDay, normalizeDigits } from './logic';
import { Found, NOTE_INCOME, cleanPayee, fingerprint, parseDay, signedCents } from './statementImport';
import { PdfLine } from './pdfText';

/*
 * A bank statement's PDF → its transactions. Statements differ from bank to
 * bank, so this reads what they share rather than one layout:
 *
 *  - a transaction starts on a line that begins with a date ("01.10.2026",
 *    "01.10.", often twice: booking day and value day) and carries an amount
 *    with two decimals; lines without a date under it are its details (the
 *    payee, the purpose);
 *  - whether money came in or went out is read, in this order, from a sign
 *    or S / H at the amount ("45,12-", "-45,12", "45,12 S", "1.200,00 H"),
 *    from the column the amount stands in (statements with a Soll and a
 *    Haben column: the left one is money going out), and last from the words
 *    ("Gutschrift", "Gehalt");
 *  - a date without a year takes it from a full date elsewhere on the
 *    statement ("Kontoauszug vom 01.10.2026 bis 31.10.2026");
 *  - balances, carry-overs and sums are not transactions.
 *
 * Pure and tested with made-up lines; `pdfText.ts` reads the file. What it
 * finds goes through the same review sheet as a CSV, so a wrong sign or
 * payee is seen before anything is saved.
 */

const DATE = String.raw`\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})?`;
const LEADING_DATES = new RegExp(String.raw`^(${DATE})(?:\s+(${DATE}))?\s*`);
/**
 * "1.234,56", "45,12-", "-45,12", "45,12 S", "+1.200,00 H", "12,00 EUR".
 * Groups: what stands before it (no look-behind: iOS 15 has none), a sign in
 * front, the figure, a sign behind, S or H.
 */
const AMOUNT = /(^|[^\d.,])([+\-−–]?)\s?(\d{1,3}(?:\.\d{3})*,\d{2})(?![\d,])\s?([+\-−–]?)(?:\s?(?:EUR|€))?(?:\s([SH])(?![A-Za-zÄÖÜäöüß]))?/g;
const NOT_A_TRANSACTION = /kontostand|saldo|übertrag|uebertrag|summe|alter stand|neuer stand|anfangs|endbetrag|dispositionskredit|freistellung|seite \d/i;
/** The booking type some banks print where the payee would be; the payee then follows on the next line. */
const BOOKING_TYPE = /^(?:sepa[- ]?)?(?:(?:basis|folge|erst|firmen)?-?lastschrift(?:seinzug)?|kartenzahlung|karten-?umsatz|überweisung|ueberweisung|echtzeit-?überweisung|gutschrift|dauerauftrag|lohn[,/ ]+gehalt[,/ ]+rente|gehalt\/rente|bargeldauszahlung|geldautomat|entgeltabschluss|abschluss|zahlungseingang|einzahlung|auszahlung|online-?überweisung)\b/i;

interface Row {
  day: string;
  cents: number;
  /** -1 out, 1 in, 0 not said at the amount. */
  sign: -1 | 0 | 1;
  /** Where the amount ends on the page — for the Soll / Haben columns. */
  end: number;
  first: string;
  details: string[];
}

/** The year the statement is about: from a full date on it, else today's. */
function statementYear(lines: PdfLine[], today: Date): number {
  const counts = new Map<number, number>();
  for (const l of lines) for (const m of l.text.matchAll(/\b\d{1,2}\.\d{1,2}\.(20\d{2})\b/g)) counts.set(+m[1], (counts.get(+m[1]) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? today.getFullYear();
}

/** The transactions on a statement's lines. */
export function parseStatementLines(lines: PdfLine[], today = new Date()): Found[] {
  const year = statementYear(lines, today);
  const latest = isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 31));
  const day = (text: string): string | undefined => {
    const full = /^\d{1,2}\.\d{1,2}\.$/.test(text) ? `${text}${year}` : text;
    const d = parseDay(full);
    // A statement can't be about days still to come: "15.12." read in January belongs to the year before.
    return d && d > latest && /^\d{1,2}\.\d{1,2}\.$/.test(text) ? parseDay(`${text}${year - 1}`) : d;
  };

  // Every line read once: its leading date, the amount on it, and what stands between.
  const read = lines.map(line => {
    const text = normalizeDigits(line.text).replace(/\s+/g, ' ').trim();
    const lead = LEADING_DATES.exec(text);
    const date = lead ? day(lead[1]) : undefined;
    const from = date ? lead![0].length : 0;
    // The amount is the last figure with two decimals on the line (some statements print the balance in front).
    const m = [...text.matchAll(AMOUNT)].pop();
    const cents = m ? Math.abs(signedCents(m[3]) ?? 0) : 0;
    const marks = m ? `${m[2]}${m[4]}` : '';
    const sign: Row['sign'] = !m ? 0 : /[-−–]/.test(marks) || m[5] === 'S' ? -1 : marks.includes('+') || m[5] === 'H' ? 1 : 0;
    // Where the amount's own piece of text ends on the page.
    const end = m ? [...line.parts].reverse().find(p => p.text.includes(m[3]))?.end ?? 0 : 0;
    const words = (cents ? text.slice(from, Math.max(from, m!.index + m![1].length)) : text.slice(from)).trim();
    return { text, date, cents, sign, end, words, skip: !text || NOT_A_TRANSACTION.test(text) };
  });

  const rows: Row[] = [];
  let current: Row | null = null;
  // An amount printed one line above its date (a table whose cells aren't aligned): kept for the date that follows.
  let held: (typeof read)[number] | null = null;
  const detail = (text: string) => { if (current && text && current.details.length < 4) current.details.push(text); };
  read.forEach((l, i) => {
    if (l.skip) { current = null; held = null; return; }
    if (l.date && l.cents) {
      current = { day: l.date, cents: l.cents, sign: l.sign, end: l.end, first: l.words, details: [] };
      rows.push(current);
      held = null;
    } else if (l.date) {
      // The date alone: its amount stood on the line above, or follows below.
      current = { day: l.date, cents: held?.cents ?? 0, sign: held?.sign ?? 0, end: held?.end ?? 0, first: held?.words || l.words, details: held?.words && l.words ? [l.words] : [] };
      rows.push(current);
      held = null;
    } else if (l.cents) {
      const next = read[i + 1];
      if (current && !current.cents) {
        current.cents = l.cents; current.sign = l.sign; current.end = l.end;
        detail(l.words);
      } else if (next && next.date && !next.cents && !next.skip) {
        held = l;
      } else {
        // A detail line with a figure in it (an invoice number, a rate) still belongs to the transaction above.
        detail(l.text);
      }
    } else {
      detail(l.text);
    }
  });
  // A date that never got an amount was no transaction.
  for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].cents) rows.splice(i, 1);

  // No sign at any amount: two columns, if the amounts end at two clearly different places.
  const unsigned = rows.filter(r => !r.sign && r.end > 0);
  let split: number | null = null;
  if (unsigned.length >= 2) {
    const ends = unsigned.map(r => r.end).sort((a, b) => a - b);
    let gap = 0;
    for (let i = 1; i < ends.length; i++) if (ends[i] - ends[i - 1] > gap) { gap = ends[i] - ends[i - 1]; split = (ends[i] + ends[i - 1]) / 2; }
    if (gap < 25) split = null;
  }

  return rows.map(r => {
    const typed = BOOKING_TYPE.test(r.first) || !r.first;
    const raw = typed && r.details.length ? r.details[0] : r.first;
    const type = typed ? r.first : '';
    const purpose = (typed ? r.details.slice(1) : r.details).join(' ');
    const words = `${r.first} ${r.details.join(' ')}`;
    const income = r.sign ? r.sign > 0 : split !== null && r.end > 0 ? r.end > split : NOTE_INCOME.test(words);
    return {
      date: r.day,
      name: cleanPayee(raw, purpose, type),
      raw: raw || type,
      amount: r.cents,
      income,
      ref: fingerprint(r.day, (income ? 1 : -1) * r.cents, raw || type, purpose),
    };
  });
}
