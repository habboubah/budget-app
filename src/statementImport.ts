import { AppData, Category, Entry, MonthKey, Rule } from './types';
import { displayName, isIsoDay, isoDay, monthKeyOf, normalizeDigits, periodOf, normalizeName, parseAmount, uid } from './logic';
import { OTHER_CATEGORY, SHIPPED_V1, SHIPPED_V3 } from './data/defaults';
import { LIMITS, checkCount } from './limits';

/*
 * Bank transactions into entries — from a bank's CSV export (Sparkasse
 * CSV-CAMT and the like) or from the text read off a photo / screenshot of
 * the banking app. Two steps, both pure:
 *
 *   1. parse  → `Found[]`: date, payee (cleaned to a name), amount, direction,
 *               the bank's own category if it has one;
 *   2. plan   → `PlannedRow[]`: a name and category for each (the user's own
 *               spelling and category when the payee was entered before),
 *               and whether it is new, already entered, or an open entry it
 *               pays. The review sheet shows the plan; nothing is written
 *               until the user confirms.
 */

/** One transaction as the bank shows it. */
export interface Found {
  /** YYYY-MM-DD, when known. */
  date?: string;
  /** The payee cleaned up to a name ("LIDL SAGT DANKE/Musterweg 1…" → "Lidl"). */
  name: string;
  /** The payee as the bank wrote it. */
  raw: string;
  /** Cents, always positive. */
  amount: number;
  income: boolean;
  /** The bank's own category ("Lebensmittel und Drogerie"), if it gives one. */
  bankCategory?: string;
  /** A fingerprint, so the same transaction is recognised on a second import. */
  ref?: string;
  /** The row's currency when it differs from the book's (plan 07); those rows start unticked. */
  foreignCurrency?: string;
}

export type RowStatus = 'new' | 'exists' | 'pay';

export interface PlannedRow {
  key: string;
  found: Found;
  /** The name the entry gets — the user's own spelling when the payee is known. */
  name: string;
  categoryId: string;
  /** new: not entered yet · exists: already there · pay: an open entry this transaction pays. */
  status: RowStatus;
  match?: Entry;
  /** Taken over when confirmed (new and pay are, exists is not, by default). */
  include: boolean;
  /** A rule marked this as not to import (a transfer); it starts unticked and is flagged (plan 20). */
  skipped?: boolean;
}

/* ------------------------------------------------------------- reading */

/** "-1.234,56", "1,234.56-", "−22,82 EUR", "+3.100,00 €" → signed cents, or null. */
export function signedCents(text: string): number | null {
  let s = normalizeDigits(text).replace(/(EUR|€)/gi, '').replace(/\s+/g, '').trim();
  let sign = 1;
  if (/^[-−–]/.test(s) || /[-−–]$/.test(s)) sign = -1;
  s = s.replace(/^[+\-−–]|[+\-−–]$/g, '');
  if (!/[.,]\d{2}$/.test(s) && !/^\d+$/.test(s)) return null;
  const cents = parseAmount(s, 'de-DE');
  return cents === null ? null : sign * cents;
}

/** "09.11.26", "9.11.2026", "2026-11-09", "2026-11-04T04:28" → "2026-11-09". */
export function parseDay(text: string): string | undefined {
  const s = normalizeDigits(text).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
  if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return undefined;
}

function valid(y: number, mo: number, d: number): string | undefined {
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!isIsoDay(iso)) return undefined;
  const dt = new Date(y, mo - 1, d);
  return dt.getMonth() === mo - 1 ? iso : undefined;
}

const LEGAL = /(^|\s)(gmbh(\s*[&+]\s*co\.?\s*kg)?|mbh|ag|se|kg|ohg|e\.\s?v\.|a\.\s?g\.?|ug|ltd\.?|inc\.?|llc|b\.\s?v\.?|bv|s\.\s?a\.\s?r\.\s?l\.?|sarl|r\.\s?l\.?|s\.\s?c\.\s?a\.?|sca|s\.\s?a\.?|srl|plc|et\s+cie|aktiengesellschaft|gesellschaf\w*|[&+.]\s*co\.?(\s*kg)?)(?=[\s.,]|$)/gi;
const NOISE = /(^|\s)(payments?|europe|deutschland|germany|unternehmensgruppe|sagt(\s+vielen)?\s+dank[e]?|marketplace|mktp|bill|filiale|fil\.?)(?=[\s.,]|$)/gi;
const BRANDS: [RegExp, string][] = [
  [/^amazon|^amzn/i, 'Amazon'], [/^apple\.com|^apple\b/i, 'Apple'], [/^paypal/i, 'PayPal'], [/^google/i, 'Google'],
  [/^netflix/i, 'Netflix'], [/^spotify/i, 'Spotify'], [/^uber\s*eats/i, 'Uber Eats'], [/^uber\b/i, 'Uber'],
];

/** A word in capitals as people write it: "LIDL" → "Lidl"; "DM", "C+A", "ABC" stay. */
function caseWord(w: string): string {
  return w.split('-').map(p => (p.length <= 3 || !/[AEIOUÄÖÜ]/.test(p) ? p : p[0] + p.slice(1).toLowerCase())).join('-');
}

/**
 * The payee as an entry name: the first part before a "/" or a run of
 * spaces (the bank's address fields), without store numbers, legal forms and
 * filler ("Payments Europe S.C.A."), known brands spelled as they are, words
 * in capitals in normal case. A PayPal purchase takes the shop from the
 * purpose ("Ihr Einkauf bei …"); no payee at all falls back to the booking
 * type ("ENTGELTABSCHLUSS" → "Entgeltabschluss").
 */
export function cleanPayee(raw: string, purpose = '', type = ''): string {
  const shop = /ihr einkauf bei\s+([^,/]+)/i.exec(purpose);
  if (/paypal/i.test(raw) && shop) return cleanPayee(shop[1]);
  if (/bargeld|geldautomat/i.test(type)) return 'Bargeld';
  const parts = raw.trim().split('/').map(x => x.trim());
  let s = (parts.find(x => /[A-Za-zÄÖÜäöü]{2}/.test(x)) ?? '').split(/\s{2,}/)[0].trim();
  // Store and branch numbers, booking codes glued to the name ("Ryanair123ab4cde"), a "-de" shop suffix.
  s = s.replace(/^\d+\s+/, '').replace(/(\s+[\d.]*\d)+\.?$/, '').replace(/\s+\d+(?=\s)/g, ' ')
    .replace(/\b([A-Za-zÄÖÜäöü]{4,})(\d{3,}\w*|\d+[A-Za-z]\w*)$/, '$1').replace(/-(de|com)$/i, '');
  // A payee that is only a code (a card terminal's id): the booking type says more.
  if (!/[A-Za-zÄÖÜäöü]{3}/.test(s.replace(/[A-Z]{1,2}\d+/g, ''))) s = '';
  for (const [re, name] of BRANDS) if (re.test(s)) return name;
  s = s.replace(/\.(com|de|net|eu)\b/i, '');
  s = s.replace(LEGAL, ' ').replace(LEGAL, ' ').replace(NOISE, ' ').replace(/\s+/g, ' ')
    .replace(/^[^A-Za-zÄÖÜäöüß0-9(]+|[^A-Za-zÄÖÜäöüß0-9)]+$/g, '');
  if (!s) s = type.trim().replace(/\s+/g, ' ') || purpose.trim().split(/\s{2,}/)[0] || '?';
  // Re-cased only when the bank wrote it all in capitals ("REWE Markt" stays).
  return (/[a-zäöüß]/.test(s) ? s : s.split(' ').map(caseWord).join(' ')).slice(0, 80);
}

/* ------------------------------------------- a bank's notification (plan 19) */

const NOTE_AMOUNT = /(?:(€|EUR)\s?)?([+\-−–]?\s?(?:\d{1,3}(?:[.,\s’']\d{3})+|\d+)(?:[.,]\d{1,2})?)\s?(€|EUR\b)?/gi;
const NOT_THE_PAYMENT = /(kontostand|saldo|verf[üu]gbar\w*|guthaben|balance|available|limit|rest\w*)(?:\s+[\p{L}]+){0,2}\s*:?\s*$/iu;
export const NOTE_INCOME = /gutschrift|geldeingang|zahlungseingang|eingegangen|eingang\b|erhalten|hat (?:dir|ihnen|euch)\b|gutgeschrieben|erstattung|r[üu]ckzahlung|gehalt|received|sent you|refund|incoming|credited|payment from|[üu]berweisung von/i;
const NOTE_STOP = /\s+(?:am \d|on \d|um \d|mit (?:deiner|ihrer|der)|with your|[üu]ber \d|in h[öo]he|i\.\s?h\.\s?v|wurde|wurden|ist |war |was |has |get[äa]tigt|abgebucht|bezahlt|gebucht|erhalten|eingegangen|gutgeschrieben|gesendet|[üu]berwiesen|geschickt)|[.;:!?|\n]|,\s|\s[-–—]\s|$/i;
const GENERIC_TITLE = /^(kartenzahlung|kartenumsatz|zahlung|lastschrift|gutschrift|geldeingang|zahlungseingang|[üu]berweisung|umsatz|neue[rs]? (umsatz|buchung|transaktion)|buchung|transaktion|konto\w*|payment|card payment|transaction|purchase|incoming payment|apple pay|google pay|girocard|visa|mastercard|debitkarte|kreditkarte)\b[\s\w]*$/i;

/** "1.234,56" / "1,234.56" / "12" → cents; the last mark before one or two digits is the decimal one. */
function noteCents(text: string): number | null {
  const s = normalizeDigits(text).replace(/[+\-−–\s’']/g, '');
  const m = /^(.*?)(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const whole = m[1].replace(/[.,]/g, '');
  if (!/^\d{1,9}$/.test(whole)) return null;
  const cents = Number(whole) * 100 + (m[2] ? Number(m[2].padEnd(2, '0')) : 0);
  return cents > 0 ? cents : null;
}

/**
 * What a banking app's push says (plan 19): "Kartenzahlung 12,40 € bei REWE"
 * → the amount, the payee, whether money came in, and the day if one is
 * named. `text` is the notification's title and body, one per line. Read
 * once and thrown away — only the entry is kept. Null when no payment is in
 * it (a login code, an offer). The amount is the first one with a currency
 * that isn't a balance; the payee comes after "bei / an / von / at / to /
 * from", from "… hat dir … gesendet", or from a title that names a shop.
 */
export function parseNotificationText(text: string): { amount: number; name: string; income: boolean; date?: string } | null {
  const lines = normalizeDigits(text).split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!lines.length) return null;
  const all = lines.join('\n');
  let amount: number | null = null;
  let sign = '';
  for (const m of all.matchAll(NOTE_AMOUNT)) {
    if (!m[1] && !m[3]) continue; // a number without a currency: a date, a card's digits
    if (NOT_THE_PAYMENT.test(all.slice(0, m.index))) continue;
    amount = noteCents(m[2]);
    if (amount !== null) { sign = /^[+\-−–]/.exec(m[2].trim())?.[0] ?? ''; break; }
  }
  if (amount === null) return null;
  const income = sign === '+' || (sign === '' && NOTE_INCOME.test(all));

  const until = (from: string) => { const stop = NOTE_STOP.exec(from); return (stop ? from.slice(0, stop.index) : from).trim(); };
  const strip = (v: string) => v.replace(NOTE_AMOUNT, (whole, a, _n, b) => (a || b ? ' ' : whole)).replace(/\s+/g, ' ').trim();
  const body = lines.length > 1 ? lines.slice(1).join('\n') : lines[0];
  let who = '';
  const sender = /^(.{2,60}?) (?:hat (?:dir|ihnen|euch)|sent you|has sent you)\b/im.exec(body);
  if (sender) who = sender[1];
  if (!who) {
    const words = income ? ['von', 'from', 'bei', 'at'] : ['bei', 'an', 'at', 'to', 'für', 'for', 'von', 'from'];
    for (const w of words) {
      const m = new RegExp(`(?:^|[\\s(])${w} (?!dir\\b|ihnen\\b|ihrem\\b|deinem\\b|ihr\\b|dein\\b|your\\b|you\\b|\\d)(.+)`, 'i').exec(strip(body.replace(/\n/g, '. ')));
      if (m && until(m[1]).length >= 2) { who = until(m[1]); break; }
    }
  }
  // Title, subtitle, body (Apple Wallet: the card, the shop, the amount): the line between names the shop.
  if (!who && lines.length > 2) who = lines.slice(1, -1).map(strip).find(l => /\p{L}{2}/u.test(l) && !GENERIC_TITLE.test(l)) ?? '';
  if (!who && lines.length > 1 && !GENERIC_TITLE.test(strip(lines[0])) && /\p{L}{2}/u.test(strip(lines[0]))) who = strip(lines[0]);
  if (!who) {
    // "Kartenzahlung: REWE Markt 12,40 EUR" — what stands after the colon.
    const m = /:\s*(.+)/.exec(strip(body.split('\n')[0]));
    if (m && /\p{L}{2}/u.test(until(m[1]))) who = until(m[1]);
  }
  const day = /\b(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))(?!\d)/.exec(all);
  const date = day ? parseDay(day[1]) : undefined;
  const name = who ? cleanPayee(who) : '';
  return { amount, name: name === '?' ? '' : name, income, ...(date ? { date } : {}) };
}

export const fingerprint = (date: string | undefined, cents: number, raw: string, purpose = '') =>
  `${date ?? ''}|${cents}|${normalizeName(raw).slice(0, 40)}|${normalizeName(purpose).slice(0, 40)}`;

/** CSV text → rows of cells. Detects ";", "," or tab; quotes and line breaks inside quotes are kept. */
export function parseCsv(text: string): string[][] {
  const head = text.split(/\r?\n/).slice(0, 5).join('\n');
  const delim = [';', '\t', ','].map(d => [d, head.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows.map(r => r.map(x => x.trim()));
}

/** A column title folded for comparing: "Begünstigter/Zahlungspflichtiger" = "beguenstigterzahlungspflichtiger". */
const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z]/g, '');

const COLUMNS = {
  // German banks, English exports, and other budget apps (Finanzguru, Outbank,
  // Money Manager, Monefy, YNAB, Cashew) are recognised by these titles (plan 20).
  date: ['buchungstag', 'buchungsdatum', 'buchung', 'datum', 'date', 'bookingdate', 'wertstellung', 'valutadatum', 'period', 'time', 'transactiondate'],
  amount: ['betrag', 'betrageur', 'umsatz', 'umsatzeur', 'amount', 'amounteur', 'betraginclgebuehren', 'value', 'summe', 'inflow'],
  debit: ['soll', 'belastung', 'debit', 'outflow', 'ausgabe', 'expense'],
  credit: ['haben', 'gutschrift', 'credit', 'inflow', 'einnahme', 'income'],
  payee: ['beguenstigterzahlungspflichtiger', 'auftraggeberempfaenger', 'zahlungsempfaengerin', 'zahlungspflichtiger',
    'namezahlungsbeteiligter', 'empfaenger', 'auftraggeberbeguenstigter', 'auftraggeber', 'payee', 'partnername', 'counterparty', 'name',
    'beneficiary', 'gegenkonto', 'transactionpartner', 'title'],
  purpose: ['verwendungszweck', 'purpose', 'paymentreference', 'reference', 'beschreibung', 'description', 'memo', 'notes', 'note', 'comment'],
  type: ['buchungstext', 'umsatzart', 'vorgang', 'transactiontype', 'type'],
  category: ['kategorie', 'category', 'maincategory', 'categoryname'],
  currency: ['waehrung', 'currency', 'waehrungbetrag', 'currencycode'],
} as const;

function columnOf(header: string[], names: readonly string[]): number {
  const folded = header.map(fold);
  for (const n of names) {
    const i = folded.indexOf(n);
    if (i !== -1) return i;
  }
  return -1;
}

export type MappableField = 'date' | 'amount' | 'debit' | 'credit' | 'payee' | 'purpose' | 'category';
export type ColumnMapping = Partial<Record<MappableField, number>>;

/**
 * For a CSV Spartopf can't place by its column titles (plan 20): the header
 * row's cells and a best-guess mapping, so the user can map the columns by
 * hand. `null` when the file isn't a table at all.
 */
export function csvForMapping(text: string): { header: string[]; sample: string[][]; guess: ColumnMapping } | null {
  const rows = parseCsv(text.replace(/^/, ''));
  if (rows.length < 2) return null;
  // The row with the most non-empty cells in the first few lines is the header.
  let headerAt = 0;
  let best = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const filled = rows[i].filter(c => c.trim()).length;
    if (filled > best) { best = filled; headerAt = i; }
  }
  const header = rows[headerAt];
  const guess: ColumnMapping = {};
  for (const field of ['date', 'amount', 'debit', 'credit', 'payee', 'purpose', 'category'] as MappableField[]) {
    const i = columnOf(header, COLUMNS[field]);
    if (i !== -1) guess[field] = i;
  }
  return { header, sample: rows.slice(headerAt + 1, headerAt + 4), guess };
}

/** Transactions from a CSV mapped by hand (plan 20). */
export function parseMappedCsv(text: string, mapping: ColumnMapping, bookCurrency = 'EUR'): Found[] {
  const rows = parseCsv(text.replace(/^/, ''));
  checkCount(rows.length, LIMITS.csvRows);
  const cell = (r: string[], i: number | undefined) => (i === undefined ? '' : r[i] ?? '');
  // Skip the header row itself: the first row where the date column parses is the first data row.
  const out: Found[] = [];
  let started = false;
  for (const r of rows) {
    const date = parseDay(cell(r, mapping.date));
    let cents = mapping.amount !== undefined ? signedCents(cell(r, mapping.amount)) : null;
    if (cents === null && (mapping.debit !== undefined || mapping.credit !== undefined)) {
      const d = signedCents(cell(r, mapping.debit)) ?? 0;
      const c = signedCents(cell(r, mapping.credit)) ?? 0;
      cents = c ? Math.abs(c) : d ? -Math.abs(d) : null;
    }
    if (!date || !cents) { if (started) continue; else continue; }
    started = true;
    const raw = cell(r, mapping.payee);
    const purpose = cell(r, mapping.purpose);
    out.push({
      date, name: cleanPayee(raw, purpose, ''), raw: raw || purpose, amount: Math.abs(cents), income: cents > 0,
      bankCategory: cell(r, mapping.category) || undefined,
      ref: fingerprint(date, cents, raw || purpose, purpose),
    });
  }
  void bookCurrency; // currency column not part of manual mapping; rows assumed in the book's currency
  return out;
}

/**
 * A bank's CSV export → transactions. Finds the header row by its column
 * titles (German and English banks: Buchungstag / Betrag / Begünstigter …),
 * so lines above it (account details) don't matter; reads signed amounts or
 * separate debit / credit columns. Rows without a date or an amount are
 * skipped.
 */
export function parseBankCsv(text: string, bookCurrency = 'EUR'): Found[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  checkCount(rows.length, LIMITS.csvRows);
  const at = rows.findIndex((r, i) => i < 40 && columnOf(r, COLUMNS.date) !== -1
    && (columnOf(r, COLUMNS.amount) !== -1 || columnOf(r, COLUMNS.debit) !== -1));
  if (at === -1) return [];
  const header = rows[at];
  const col = Object.fromEntries(Object.entries(COLUMNS).map(([k, names]) => [k, columnOf(header, names)])) as Record<keyof typeof COLUMNS, number>;
  const cell = (r: string[], i: number) => (i === -1 ? '' : r[i] ?? '');
  const out: Found[] = [];
  for (const r of rows.slice(at + 1)) {
    const date = parseDay(cell(r, col.date));
    let cents = col.amount !== -1 ? signedCents(cell(r, col.amount)) : null;
    if (cents === null && (col.debit !== -1 || col.credit !== -1)) {
      const d = signedCents(cell(r, col.debit)) ?? 0;
      const c = signedCents(cell(r, col.credit)) ?? 0;
      cents = c ? Math.abs(c) : d ? -Math.abs(d) : null;
    }
    if (!date || !cents) continue;
    const raw = cell(r, col.payee);
    const purpose = cell(r, col.purpose);
    const type = cell(r, col.type);
    const rowCurrency = cell(r, col.currency).trim().toUpperCase();
    const foreignCurrency = rowCurrency && rowCurrency !== bookCurrency.toUpperCase() ? rowCurrency : undefined;
    out.push({
      date,
      name: cleanPayee(raw, purpose, type),
      raw: raw || type,
      amount: Math.abs(cents),
      income: cents > 0,
      bankCategory: cell(r, col.category) || undefined,
      ref: fingerprint(date, cents, raw || type, purpose),
      ...(foreignCurrency ? { foreignCurrency } : {}),
    });
  }
  return out;
}

/** A minus as the reader hands it back: the real ones, and what a thin dash gets read as ("„", "~", "="). */
const MINUS = '\\-−–—„~=';
const AMOUNT_AT_END = new RegExp(`([+${MINUS}])?\\s*(\\d{1,3}(?:[.\\s]\\d{3})*[,.]\\d{2}|\\d+[,.]\\d{2})\\s*([+\\-−–])?\\s*(EUR|€)?\\W{0,2}$`, 'i');
/** A sign left alone at the end of a line: its amount was read onto the next one. */
const SIGN_AT_END = new RegExp(`(?:^|\\s)([+${MINUS}])$`);
const DATE_LINE = /^(?:[A-Za-zÄÖÜäöü]{2,10},?\s+)?(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2})\s*$/;
/** A heading that names its day in words, and how many days ago that was. */
const RELATIVE_DAY: [RegExp, number][] = [[/^(heute|today)$/i, 0], [/^(gestern|yesterday)$/i, 1], [/^vorgestern$/i, 2]];
/** A line under a payee: a card time stamp, a reference number (maybe behind a logo read as a short word), a PayPal shop. */
const looksLikeDetail = (text: string) => /^\d/.test(text) || /\d{4}-\d{2}-\d{2}T/.test(text) || /ihr einkauf bei/i.test(text)
  || /^(?:\S{1,3}\s)?[A-Za-z]{0,3}\d{6,}/.test(text);
/** Icons read as letters or marks: "Y", "©", "AM", "[m]", "(0" in front of a line. */
const MARKS = new RegExp(`^(?:[[({<][^\\s\\])}>]{0,3}[\\])}>]?(?:\\s+|$)|(?![+${MINUS}]\\s?\\d)[^\\sA-Za-zÄÖÜäöü0-9]+\\s*|[A-Za-z]{1,2}\\s{2,})+`);
const stripMarks = (line: string) => line.replace(MARKS, '').replace(/^(?:[A-Za-z]{1,2}\s+)(?=[A-ZÄÖÜ][a-zäöü])/, '').trim();
/** A logo's word or a stray mark — not a payee. */
const isNoise = (line: string) => (line.match(/[A-Za-zÄÖÜäöü]/g)?.length ?? 0) < 3 || /^[a-zäöü]{2,12}$/.test(line);
/** Two lines that begin with the same word: a logo read as text repeats the payee's line above it. */
const startsAlike = (a: string, b: string) => {
  const first = (s: string) => fold(s.split(/[\s/]/)[0]);
  return first(a).length >= 3 && first(a) === first(b);
};

/**
 * The text read off a photo or screenshot of a transaction list → the
 * transactions in it. Reads the layout banking apps share: a date heading
 * (a date, or "Heute" / "Gestern"), then per transaction a line with the
 * payee and the amount at its end, detail lines (a PayPal shop, a card time
 * stamp, a reference number) and maybe the bank's category.
 *
 * The reader rarely hands the layout back whole, so what it tears apart is
 * put together again: an amount read onto a detail line or a line of its own
 * goes to the oldest payee still without one; an amount behind the payee's
 * logo, read as a word, to the payee on the line above; a minus left on the
 * line above its amount is that amount's. A minus marks money going out;
 * when the list uses minus signs, an amount without one is money coming in.
 *
 * When no line fits, the amounts that were read are still returned — each
 * with the next payee that has none, or nameless ("?") — so the review sheet
 * opens with something to correct instead of "nothing found".
 */
export function parseStatementText(text: string, categoryNames: string[] = [], today = new Date()): Found[] {
  const lines = normalizeDigits(text).split(/\r?\n/).map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
  const known = categoryNames.map(fold).filter(Boolean);
  const categoryIn = (line: string) => {
    const f = fold(stripMarks(line));
    return f && f.length <= 40 ? known.find(k => f === k || (f.endsWith(k) && f.length - k.length <= 3)) : undefined;
  };
  type Item = Found & { signed: boolean; purpose: string };
  const items: Item[] = [];
  /** Amounts that stood before any payee: taken up only when nothing else was found. */
  const orphans: { cents: number; signed: boolean; date?: string }[] = [];
  let day: string | undefined;
  /** A sign read on the line above its amount (line `at`), and the payee it stood behind, if one did. */
  let loose: { at: number; minus: boolean; item?: Item } | undefined;
  const detail = (it: Item, line: string) => {
    if (it.purpose) return;
    it.purpose = line;
    // The reader takes the stamp's "T" for a 7 now and then.
    const stamp = /(\d{4}-\d{2}-\d{2})[T7]?\d{2}:\d{2}/.exec(line);
    if (!it.date && stamp) it.date = parseDay(stamp[1]);
    if (/paypal/i.test(it.raw)) it.name = cleanPayee(it.raw, line);
  };
  const add = (raw: string) => {
    const it: Item = { date: day, name: cleanPayee(raw), raw, amount: 0, income: false, signed: false, purpose: '' };
    items.push(it);
    return it;
  };
  const give = (it: Item, cents: number, minus: boolean) => {
    it.amount = cents;
    it.signed = minus;
  };
  for (let i = 0; i < lines.length; i++) {
    const whole = lines[i];
    const heading = DATE_LINE.exec(whole);
    if (heading) { day = parseDay(heading[1]); continue; }
    const ago = RELATIVE_DAY.find(([re]) => re.test(stripMarks(whole)));
    if (ago) { day = isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - ago[1])); continue; }
    const tail = AMOUNT_AT_END.test(whole) ? null : SIGN_AT_END.exec(whole);
    const original = tail ? whole.slice(0, tail.index).trim() : whole;
    if (tail) loose = { at: i, minus: tail[1] !== '+' };
    const last = items[items.length - 1];
    const cat = categoryIn(original);
    if (cat) {
      if (last && !last.bankCategory) last.bankCategory = categoryNames.find(n => fold(n) === cat) ?? stripMarks(original);
      continue;
    }
    const line = stripMarks(original);
    const m = AMOUNT_AT_END.exec(line);
    const cents = m ? signedCents(m[2]) : null;
    if (m && cents) {
      const before = line.slice(0, m.index).replace(/\s+$/, '');
      const above = loose?.at === i - 1 && !m[1] && !m[3] ? loose : undefined;
      const minus = above ? above.minus : [m[1], m[3]].some(sign => sign && sign !== '+');
      // Whose amount it is, when it is not this line's own payee's.
      let owner: Item | undefined;
      let note = before;
      if (above?.item && !above.item.amount) owner = above.item;
      else if (!before || looksLikeDetail(before)) owner = items.find(it => !it.amount);
      else if (last && !last.amount && !last.purpose && !last.bankCategory && startsAlike(before, last.raw)) { owner = last; note = ''; }
      if (owner) {
        give(owner, cents, minus);
        if (note) detail(owner, note);
      } else if (before) give(add(before), cents, minus);
      else orphans.push({ cents, signed: minus, date: day });
      continue;
    }
    if (last && !last.purpose && looksLikeDetail(line)) { detail(last, line); continue; }
    if (isNoise(line)) continue;
    // A payee whose amount comes later (or never — then it is dropped).
    const waiting = add(line);
    if (loose?.at === i) loose.item = waiting;
  }
  if (!items.some(it => it.amount)) {
    for (const o of orphans) {
      const it = items.find(x => !x.amount) ?? Object.assign(add(''), { date: o.date });
      give(it, o.cents, o.signed);
    }
  }
  const found = items.filter(i => i.amount > 0);
  const anySigned = found.some(i => i.signed);
  return found.map(({ signed, purpose, ...f }) => ({
    ...f,
    income: anySigned && !signed,
    ref: fingerprint(f.date, (anySigned && !signed ? 1 : -1) * f.amount, f.raw, purpose),
  }));
}

/* ------------------------------------------------------------- planning */

/** Every name a category goes by — now and as shipped earlier ("Absicherung und Vorsorge"). */
function categoryNamesOf(c: Category): string[] {
  return [...Object.values(c.names), ...Object.values(SHIPPED_V3[c.id]?.names ?? {}), ...Object.values(SHIPPED_V1[c.id]?.names ?? {})];
}

const firstWord = (key: string) => key.split(' ')[0];

/** Two names for the same payee: equal, one the start of the other, or the same (long enough) first word. */
function sameName(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `)) return true;
  return firstWord(a).length >= 4 && firstWord(a) === firstWord(b);
}

const daysApart = (a?: string, b?: string) =>
  a && b ? Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000 : Infinity;

/**
 * What to do with each transaction found, checked against what is entered:
 *  - its name and category: the user's own when this payee was entered
 *    before (most recent), else the bank's category matched to one of the
 *    user's, else "Sonstiges" (income lands in an income category — unless it
 *    comes from a payee the user buys from: then it is a refund in that
 *    payee's category, schema 26);
 *  - exists — the same transaction was imported before, or an entry of the
 *    same month with the same amount and the same payee (or a date at most
 *    three days off) is already ticked;
 *  - pay — that entry is still open: confirming ticks it instead of adding;
 *  - new — otherwise.
 * Each entry matches one transaction at most.
 */
/**
 * The import rule that fires for a transaction (plan 20), or null. Rules are
 * tried oldest first; the first whose field contains its text wins. The field
 * `payee` and `name` both read the cleaned name; `purpose` reads the raw text.
 */
export function ruleFor(f: Found, rules: Rule[] = []): Rule | null {
  const haystacks = {
    name: f.name.toLowerCase(),
    payee: `${f.name} ${f.raw}`.toLowerCase(),
    purpose: f.raw.toLowerCase(),
  };
  for (const r of [...rules].sort((a, b) => a.createdAt - b.createdAt)) {
    if (haystacks[r.match.field].includes(r.match.contains.toLowerCase())) return r;
  }
  return null;
}

export function planStatement(found: Found[], data: AppData, today = new Date()): PlannedRow[] {
  const { categories, entries } = data;
  const rules = data.rules ?? [];
  const byId = new Map(categories.map(c => [c.id, c]));
  const incomeId = categories.find(c => c.kind === 'income')?.id;
  const fallback = (byId.has(OTHER_CATEGORY.id) ? OTHER_CATEGORY.id : categories.find(c => c.kind === 'expense')?.id) ?? '';
  const bankMap = new Map<string, string>();
  for (const c of categories) for (const n of categoryNamesOf(c)) if (!bankMap.has(fold(n))) bankMap.set(fold(n), c.id);
  // The user's names, most recent spelling and category first.
  const history = [...entries].sort((a, b) => (a.month === b.month ? b.createdAt - a.createdAt : a.month < b.month ? 1 : -1));
  const known = (key: string) => history.find(e => byId.has(e.categoryId) && sameName(normalizeName(e.name), key));
  const used = new Set<string>();
  const refs = new Set(entries.map(e => e.ref).filter(Boolean));

  return found.map((f, i) => {
    const key = normalizeName(f.name);
    const prior = known(key);
    // Rules win over the learned payee and the bank's category (plan 20).
    const rule = ruleFor(f, rules);
    const ruleSkip = !!rule && 'skip' in rule.set;
    const ruleCategory = rule && !('skip' in rule.set) ? rule.set.categoryId : undefined;
    const ruleName = rule && !('skip' in rule.set) ? rule.set.name : undefined;
    let categoryId = (ruleCategory && byId.has(ruleCategory) ? ruleCategory : undefined)
      ?? prior?.categoryId ?? (f.bankCategory ? bankMap.get(fold(f.bankCategory)) : undefined) ?? (f.income ? incomeId : fallback) ?? fallback;
    // Money back from a payee the user buys from (a return at Zalando) is a refund in that
    // payee's category, not income (schema 26): it stays where the purchases are.
    const refund = f.income && !ruleCategory && !!prior && categoryId === prior.categoryId && byId.get(categoryId)?.kind === 'expense';
    if (!ruleCategory && !refund) {
      if (f.income !== (byId.get(categoryId)?.kind === 'income') && incomeId) categoryId = f.income ? incomeId : (prior && !f.income ? prior.categoryId : fallback);
      if (!f.income && byId.get(categoryId)?.kind === 'income') categoryId = fallback;
    }
    const name = ruleName ?? prior?.name ?? f.name;
    const month: MonthKey = f.date ? periodOf(f.date) : monthKeyOf(today);
    // Money coming in: income, or a refund — whose amount is stored negative.
    const kindOf = (e: Entry) => byId.get(e.categoryId)?.kind === 'income' || !!e.refund;
    let status: RowStatus = 'new';
    let match: Entry | undefined;
    if (f.ref && refs.has(f.ref)) {
      status = 'exists';
      match = entries.find(e => e.ref === f.ref);
    } else {
      const candidates = entries.filter(e => !used.has(e.id) && e.month === month && Math.abs(e.amount) === f.amount && kindOf(e) === f.income);
      match = candidates.find(e => sameName(normalizeName(e.name), key) || sameName(normalizeName(e.name), normalizeName(name)))
        ?? candidates.find(e => daysApart(e.date, f.date) <= 3);
      if (match) status = match.paid ? 'exists' : 'pay';
    }
    if (match) used.add(match.id);
    // A foreign-currency row (plan 07) or a rule-skipped one (plan 20) starts unticked.
    return { key: `${i}-${f.ref ?? f.name}`, found: f, name, categoryId, status, match, skipped: ruleSkip, include: status !== 'exists' && !f.foreignCurrency && !ruleSkip };
  });
}

/**
 * The confirmed rows as changes: the open entries to tick (pay), and new
 * entries — paid, once, dated — for everything else ticked, including a row
 * marked "already entered" the user ticks anyway (two equal purchases).
 */
export function applyStatement(rows: PlannedRow[], now: number, newId: () => string = uid, today = new Date(), categories?: Category[]): { add: Entry[]; pay: string[] } {
  // With the categories at hand, money that came in and is filed under an expense category is a refund (schema 26).
  const expense = new Set((categories ?? []).filter(c => c.kind === 'expense').map(c => c.id));
  const add: Entry[] = [];
  const pay: string[] = [];
  rows.filter(r => r.include).forEach((r, i) => {
    if (r.status === 'pay' && r.match) { pay.push(r.match.id); return; }
    const id = newId();
    const e: Entry = {
      id,
      month: r.found.date ? periodOf(r.found.date) : monthKeyOf(today),
      categoryId: r.categoryId,
      name: r.name.trim() || r.found.name,
      amount: r.found.amount,
      paid: true,
      paidAt: now,
      repeat: 'none',
      seriesId: id,
      createdAt: now + i,
    };
    if (r.found.income && expense.has(r.categoryId)) { e.amount = -r.found.amount; e.refund = true; }
    if (r.found.date) e.date = r.found.date;
    if (r.found.ref) e.ref = r.found.ref;
    add.push(e);
  });
  return { add, pay };
}

/** The names the photo reader should recognise as a category line. */
export function allCategoryNames(categories: Category[], lang: string): string[] {
  return [...new Set(categories.flatMap(c => [displayName(c.names, lang), ...categoryNamesOf(c)]))];
}
