import {
  ACCOUNT_KINDS, Account, AccountKind, AppData, Attachment, Backup, Category, CategoryKind, Contract, Debt, DemoInfo, Entry, EntryDraft, Favorite, Goal, HUES, Hue, INTERVALS, Interval, MonthKey, MonthRecord, Names, REPEATS, Repeat, Rule,
} from './types';
import { MERGED_V4, NEW_MAIN, SHIPPED_V5, NAME_SUGGESTIONS, NEW_IN_V2, OTHER_CATEGORY, SHIPPED_V1, SHIPPED_V3, defaultCategories } from './data/defaults';
import { isSupportedCurrency } from './currency';

/** Bump when a stored shape changes, and migrate in `normalizeState`.
 *  9: monthly budgets (`Category.limit`) — optional, so nothing to migrate.
 *  10: contract details per recurring series (`AppData.contracts`) — optional too.
 *  11: book currency (`AppData.currency`, ISO 4217) — optional, unset = EUR.
 *  12: pinned favourites (`AppData.favorites`) — optional, unset = none.
 *  13: savings goals (`AppData.goals`, `Entry.goalId`) — optional, unset = none.
 *  14: entry tags (`Entry.tags`) — optional, unset = none.
 *  15: import rules (`AppData.rules`) — optional, unset = none.
 *  16: split payments (`Entry.splitId`) — optional, unset = none.
 *  17: the test data's record (`AppData.demo`) — optional, unset = none.
 *  18: category keywords (`Category.keywords`) — optional, unset = what a built-in ships with.
 *  19: no new field — built-ins still named as shipped get their names in the
 *      eleven languages added then (tr, pl, cs, sv, nb, da, fr, it, es, nl, pt).
 *  20: accounts and transfers (`AppData.accounts`, `Entry.accountId`, `Entry.transfer`,
 *      `MonthRecord.openings`, plan 30) — optional, unset = one account, as before.
 *  21: debts and loans (`AppData.debts`, `Entry.debtId`, plan 31) — optional, unset = none.
 *  22: receipts (`Entry.files`, plan 27) — optional; a backup may carry the files themselves (`files`).
 *  23: `AppData.monthStart` (plan 32: months from payday) — optional, unset = the 1st; with it an
 *      entry's `month` is the period its date falls in.
 *  24: `Entry.every` (a yearly entry that comes back every 2, 3 or 6 months) and
 *      `Entry.until` (a recurring entry's last month) — optional, unset = yearly / no end. */
export const SCHEMA_VERSION = 24;

/* ------------------------------------------------------------------ basics */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * The key two names are compared by: case-, accent- and spacing-blind, with
 * ß folded the way people type it on a phone ("Rossmann" = "rossmann ",
 * "Straße" = "Strasse").
 */
export function normalizeName(s: string): string {
  return s
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** A name in the wanted language, falling back to whatever the entry has. */
export function displayName(names: Names | undefined, lang: string): string {
  if (!names) return '';
  return names[lang] ?? names.de ?? names.en ?? Object.values(names)[0] ?? '';
}

/** Collapse whitespace and cap the length of something the user typed. */
export function cleanText(s: string, max = 80): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Move one element of an array — the category reorder. */
export function moveItem<T>(xs: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= xs.length || to >= xs.length) return xs;
  const out = [...xs];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

/** Today as YYYY-MM-DD in local time, for file names. */
export function isoDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ------------------------------------------------------------------- money */

/** Largest amount accepted: 100 million euros. Anything above is a typo. */
export const MAX_CENTS = 10_000_000_000;

/**
 * What an Arabic keyboard types, as ASCII: Arabic-Indic digits (٠–٩ and the
 * Persian ۰–۹) become 0–9, the Arabic decimal mark ٫ a dot, the thousands mark
 * ٬ and the Arabic comma ، a comma; invisible direction marks are dropped.
 */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/٫/g, '.')
    .replace(/[٬،]/g, ',')
    .replace(/[‎‏؜]/g, '');
}

const decimalMarks = new Map<string, string>();
/** The decimal mark a locale writes: "," for de-DE, tr-TR, fr-FR …; "." for en-GB and Arabic. */
function decimalMark(locale: string): string {
  let mark = decimalMarks.get(locale);
  if (mark === undefined) {
    try {
      mark = new Intl.NumberFormat(locale).formatToParts(1.5).find(p => p.type === 'decimal')?.value ?? '.';
    } catch {
      mark = '.';
    }
    decimalMarks.set(locale, mark);
  }
  return mark;
}

/**
 * What the user typed → integer cents, or null if it isn't an amount.
 * Reads both German and English writing: "1.050,50", "1050,5", "1050.50",
 * "1,050.50", "12", "€ 9,99" — and Arabic-Indic digits ("١٢٫٥٠"). With a
 * single separator, three digits after the locale's grouping mark mean
 * thousands ("1.050" in German or Turkish is 1050 €); any other single separator is the
 * decimal point, whichever one the keyboard happened to offer.
 */
export function parseAmount(text: string, locale = 'de-DE'): number | null {
  const s = normalizeDigits(text)
    // Drop any currency symbol (€ £ ﷼ ...) and three-letter codes (CHF, SAR).
    .replace(/\p{Sc}/gu, '')
    .replace(/\b[A-Za-z]{3}\b/g, '')
    // de-CH groups thousands with an apostrophe (1'050.50); it is only ever a
    // grouping mark, so drop it and let the dot be the decimal point.
    .replace(/['’]/g, '')
    .replace(/[\s ]/g, '')
    .replace(/^\+/, '');
  if (!s || !/^(\d[\d.,]*|[.,]\d+)$/.test(s)) return null;
  // Where the language writes a decimal comma (de, tr, fr, pl …), a lone dot
  // before three digits groups thousands; where it writes a decimal point, a comma does.
  const group = decimalMark(locale) === ',' ? '.' : ',';
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let whole = s;
  let frac = '';
  if (lastComma !== -1 || lastDot !== -1) {
    const sepAt = Math.max(lastComma, lastDot);
    const sep = s[sepAt];
    const mixed = lastComma !== -1 && lastDot !== -1;
    const times = s.split(sep).length - 1;
    const after = s.slice(sepAt + 1);
    const isGrouping = !mixed && (times > 1 || (sep === group && after.length === 3));
    // Thousands marks must sit every three digits, or "1,2,3" would read as 123.
    const grouped = (x: string, mark: string) => {
      const parts = x.split(mark);
      return parts[0].length >= 1 && parts[0].length <= 3 && parts.slice(1).every(p => p.length === 3);
    };
    if (isGrouping) {
      if (!grouped(s, sep)) return null;
      whole = s.split(sep).join('');
    } else {
      const head = s.slice(0, sepAt);
      if (mixed && !grouped(head, sep === ',' ? '.' : ',')) return null;
      whole = head.replace(/[.,]/g, '');
      frac = after;
      if (/[.,]/.test(frac)) return null;
    }
  }
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return null;
  // Round a third decimal ("12,345") instead of dropping it.
  const cents = Number(whole || '0') * 100 + Math.round(Number(`0.${frac || '0'}`) * 100);
  if (!Number.isFinite(cents) || cents > MAX_CENTS) return null;
  return cents;
}

/**
 * A small sum typed into the amount field (plan 08): "12,50+4,80", "3×9,99",
 * "20-4,50". Operands go through `parseAmount` (so every number format, Arabic
 * digits and the currency symbol work); operators are + − × ÷ (and * /) with
 * normal precedence, no parentheses, at most 12 operands. The result is
 * rounded to cents. Returns null for a plain number with no operator (the
 * field handles that), a negative or non-finite result, a division by zero, or
 * anything unparseable. No `eval`, no `Function`.
 */
export function evalAmount(text: string, locale = 'de-DE'): number | null {
  const s = normalizeDigits(text).replace(/[×xX*]/g, '*').replace(/[÷:/]/g, '/');
  // Split on the operators, keeping them; a leading minus would make the first operand negative, which parseAmount rejects.
  const tokens = s.split(/\s*([+\-*/])\s*/).filter(t => t !== '');
  if (tokens.length < 3 || tokens.length % 2 === 0) return null; // operand (op operand)+, so odd and ≥ 3
  const operands = tokens.filter((_, i) => i % 2 === 0);
  const ops = tokens.filter((_, i) => i % 2 === 1);
  if (operands.length > 12) return null;
  // Operands as cents (integers); keep them as numbers of cents.
  const nums: number[] = [];
  for (const o of operands) {
    const cents = parseAmount(o, locale);
    if (cents === null) return null;
    nums.push(cents);
  }
  if (ops.some(o => !'+-*/'.includes(o))) return null;
  // × and ÷ first. Work in cents; a product/quotient of two money values is
  // treated as "times a plain number", which is what a receipt sum means.
  const vals = [nums[0]];
  const pending: string[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const next = nums[i + 1];
    if (op === '*' || op === '/') {
      const prev = vals.pop()!;
      if (op === '/') {
        if (next === 0) return null;
        vals.push(Math.round((prev / next) * 100)); // next is cents → divide by (next/100)
      } else {
        vals.push(Math.round((prev * next) / 100)); // prev × (next/100)
      }
    } else {
      pending.push(op);
      vals.push(next);
    }
  }
  let total = vals[0];
  for (let i = 0; i < pending.length; i++) total += pending[i] === '+' ? vals[i + 1] : -vals[i + 1];
  if (!Number.isFinite(total) || total < 0 || total > MAX_CENTS) return null;
  return total;
}

/**
 * The book's currency (plan 07). A module-level value so the many formatters
 * don't each need it threaded through every call site; the store sets it from
 * `AppData.currency` (EUR when unset). Tests set it explicitly. Changing it
 * clears the cached Intl formatters.
 */
let activeCurrency = 'EUR';
export function setActiveCurrency(code: string): void {
  if (code !== activeCurrency) { activeCurrency = code; formatters.clear(); }
}
export const getActiveCurrency = (): string => activeCurrency;
/**
 * The book's currency sign for an amount field ("€", "$", "£", "CHF"), so a
 * field never shows € once another currency is picked.
 */
export function currencySymbol(locale: string = (typeof document !== 'undefined' && document.documentElement.lang) || 'en'): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(x => x.type === 'currency');
    return plainSign(part?.value ?? activeCurrency);
  } catch {
    return activeCurrency;
  }
}

/**
 * The dollar as plain "$": some locales (Arabic, for one) still write "US$"
 * even with the narrow symbol.
 */
const plainSign = (text: string): string => text.replace('US$', '$');

const formatters = new Map<string, Intl.NumberFormat>();
function moneyFormat(locale: string, sign: 'auto' | 'always' | 'exceptZero'): Intl.NumberFormat {
  const key = `${locale}|${sign}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol', signDisplay: sign });
    formatters.set(key, f);
  }
  return f;
}

/**
 * *Beträge verbergen* (plan 06). While on, every money formatter here writes
 * "•••• €" instead — the currency where the locale puts it, no figure and no
 * sign — so every screen, sentence and chart label hides its amounts without
 * a change at the call site, the way the currency works (plan 07). App sets it
 * on each render, before its screens render. `withAmounts` shows them anyway
 * for what the user asked to see in full: a reminder whose amounts are
 * switched on, a picture shared with amounts, what the calculator makes of
 * the amount being typed. Fields being typed into never go through here.
 */
let amountsHidden = false;
export function setAmountsHidden(on: boolean): void { amountsHidden = on; }
export const areAmountsHidden = (): boolean => amountsHidden;
/** Runs `fn` with amounts shown, whatever the switch says. */
export function withAmounts<T>(fn: () => T): T {
  const was = amountsHidden;
  amountsHidden = false;
  try { return fn(); } finally { amountsHidden = was; }
}
/** What a hidden figure shows instead. */
export const MASK = '••••';
/** For VoiceOver: a formatted amount, or `hiddenLabel` ("Betrag verborgen") while amounts are hidden. */
export const spoken = (money: string, hiddenLabel: string): string => (amountsHidden ? hiddenLabel : money);
const masks = new Map<string, string>();
/** "•••• €", "€••••", "CHF ••••": the locale's layout of an amount, with the figure taken out. */
function maskedMoney(locale: string): string {
  const key = `${locale}|${activeCurrency}`;
  let mask = masks.get(key);
  if (mask === undefined) {
    let figure = false;
    mask = moneyFormat(locale, 'auto').formatToParts(1).map(p => {
      if (p.type === 'currency' || p.type === 'literal') return plainSign(p.value);
      if (figure) return '';
      figure = true;
      return MASK;
    }).join('');
    masks.set(key, mask);
  }
  return mask;
}

/** Cents → "1.050,00 €" (or "+1.050,00 €" / "−…" with `sign`). */
export function formatMoney(cents: number, locale: string, sign: 'auto' | 'always' | 'exceptZero' = 'auto'): string {
  if (amountsHidden) return maskedMoney(locale);
  // A true minus sign: the hyphen Intl uses is too short next to big digits.
  return plainSign(moneyFormat(locale, sign).format(cents / 100)).replace('-', '−');
}

/** Cents → what goes back into the amount field when editing: "1050,00". */
export function amountToInput(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
    .format(cents / 100);
}

/** An entry's effect on the account: + for income, − for an expense. */
export function signedAmount(amount: number, kind: CategoryKind): number {
  return kind === 'income' ? amount : -amount;
}

/** The parts of a split payment (plan 21): entries in the same month sharing a splitId, as entered. */
export function splitParts(entries: Entry[], splitId: string, month: MonthKey): Entry[] {
  return entries.filter(e => e.splitId === splitId && e.month === month).sort((a, b) => a.createdAt - b.createdAt);
}

/** The outcome of matching the app's "now" balance against the bank's (plan 10). */
export interface Reconcile {
  /** bank − app, signed cents. 0 means they already agree. */
  diff: number;
  /** Book the difference as a paid entry (the default). Absent when there's no difference. */
  entry?: EntryDraft;
  /** Or move the month's opening balance by the difference. Absent when there's no difference. */
  opening?: number;
}

/**
 * Match the app's current account balance against what the bank shows
 * (plan 10). Returns the difference and the two ways to fix it: a paid
 * "Kontoabgleich" entry (an expense in `extraId` when the bank shows less, an
 * income in `incomeId` when it shows more), or a new month opening that shifts
 * everything by the difference. No difference → neither, just `diff: 0`.
 */
export function reconcile(
  now: number,
  bank: number,
  opts: { extraId: string; incomeId: string; name: string; currentOpening: number; date?: string },
): Reconcile {
  const diff = bank - now;
  if (diff === 0) return { diff: 0 };
  const income = diff > 0;
  const entry: EntryDraft = {
    categoryId: income ? opts.incomeId : opts.extraId,
    name: opts.name,
    amount: Math.abs(diff),
    paid: true,
    repeat: 'none',
    ...(opts.date ? { date: opts.date } : {}),
  };
  return { diff, entry, opening: opts.currentOpening + diff };
}

/* ------------------------------------------------------------------ months */

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/**
 * The month a day belongs to. A month is a calendar month unless the book
 * starts its months on another day (plan 32, `setMonthStart`): then it is a
 * period from that day to the day before it a month later.
 */
export function monthKeyOf(d = new Date()): MonthKey {
  return periodOf(isoDay(d));
}

/* -------------------------------------------- month from payday (plan 32) */

/** The latest day a month can start on: every month has a 28th. */
export const MAX_MONTH_START = 28;

/**
 * The day the book's months start on — 1 unless the user set another
 * (*Optionen › Monat beginnt am*). A module-level switch like the currency:
 * the store sets it from the book, every month rule reads it, tests set it.
 */
let monthStart = 1;
export function setMonthStart(day: number | undefined): void { monthStart = validMonthStart(day); }
export const monthStartDay = (): number => monthStart;
export function validMonthStart(day: unknown): number {
  return typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= MAX_MONTH_START ? day : 1;
}

const calendarKey = (iso: string): MonthKey => iso.slice(0, 7);
const pad2 = (n: number) => String(n).padStart(2, '0');
const calendarDays = (key: MonthKey) => { const { year, month } = parseMonthKey(key); return new Date(year, month, 0).getDate(); };

/**
 * The month (period) a date falls in, for months starting on `start`.
 * A period is named after the calendar month most of it lies in: starting on
 * the 2nd–15th it keeps the name of the month it starts in ("November" from
 * 10 Nov to 9 Dec); starting on the 16th–28th it takes the next one's
 * ("November" from 25 Oct to 24 Nov). The same rule in every month, whatever
 * its length.
 */
export function periodOf(iso: string, start = monthStart): MonthKey {
  const key = calendarKey(iso);
  if (start === 1) return key;
  const day = Number(iso.slice(8, 10));
  if (start <= 15) return day >= start ? key : addMonths(key, -1);
  return day >= start ? addMonths(key, 1) : key;
}

/** A month's first and last day, and how many days it has. */
export function periodRange(key: MonthKey, start = monthStart): { first: string; last: string; days: number } {
  if (start === 1) { const days = calendarDays(key); return { first: `${key}-01`, last: `${key}-${pad2(days)}`, days }; }
  const from = start <= 15 ? key : addMonths(key, -1);
  const to = addMonths(from, 1);
  // The start month's days from `start` on, and the next month's up to the day before.
  return { first: `${from}-${pad2(start)}`, last: `${to}-${pad2(start - 1)}`, days: calendarDays(from) - start + 1 + (start - 1) };
}

/** Which day of its month a date is, counted from 1 — the 25th is day 1 when months start on the 25th. Null outside the month. */
export function dayIndex(iso: string, key: MonthKey, start = monthStart): number | null {
  if (periodOf(iso, start) !== key) return null;
  const day = Number(iso.slice(8, 10));
  if (start === 1) return day;
  if (day >= start) return day - start + 1;
  return calendarDays(addMonths(calendarKey(iso), -1)) - start + 1 + day;
}

/** The date of the n-th day of a month (1 = its first), kept inside it. */
export function dateAt(key: MonthKey, index: number, start = monthStart): string {
  const { first, days } = periodRange(key, start);
  const n = Math.max(1, Math.min(Math.round(index), days));
  const [y, m, d] = first.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n - 1));
}

/**
 * Moves every dated entry into the month its date falls in when months start
 * on `start` (plan 32) — dates are the truth, entries without one stay. The
 * months the entries then need are there; a month left without entries, with
 * no opening balance of its own, goes. Changing back to the old day gives the
 * old months again. Returns the book and how many entries changed month.
 */
export function changeMonthStart(data: AppData, start: number, now = Date.now()): { data: AppData; moved: number } {
  const day = validMonthStart(start);
  const kind = kindLookup(data.categories);
  /** What a paid entry does to its account's balance. */
  const effect = (e: Entry) => (!e.paid ? 0 : e.transfer ? (e.transfer.direction === 'in' ? e.amount : -e.amount) : kind(e.categoryId) === 'income' ? e.amount : -e.amount);
  const single = !data.accounts?.length;
  const moves: { e: Entry; from: MonthKey; to: MonthKey }[] = [];
  const entries = data.entries.map(e => {
    if (!e.date) return e;
    const month = periodOf(e.date, day);
    if (month === e.month) return e;
    moves.push({ e, from: e.month, to: month });
    return { ...e, month };
  });

  // An opening balance set by hand says what was there before its month. An
  // entry that crossed that line is taken out of it, or put into it, so every
  // balance after stays what it was.
  let months: MonthRecord[] = data.months.map(m => {
    let opening = m.opening;
    const openings = m.openings ? { ...m.openings } : undefined;
    for (const { e, from, to } of moves) {
      const crossed = to < m.key && from >= m.key ? 1 : from < m.key && to >= m.key ? -1 : 0;
      if (!crossed) continue;
      const account = single ? MAIN_ACCOUNT : accountOf(e);
      if (account === MAIN_ACCOUNT) { if (opening !== undefined) opening += crossed * effect(e); }
      else if (openings?.[account] !== undefined) openings[account] += crossed * effect(e);
    }
    const { opening: _o, openings: _os, ...rest } = m;
    return { ...rest, ...(opening !== undefined ? { opening } : {}), ...(openings ? { openings } : {}) };
  });

  const byKey = (a: MonthRecord, b: MonthRecord) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  months.sort(byKey);
  const used = new Set(entries.map(e => e.month));
  const had = new Set(data.entries.map(e => e.month));
  const have = new Set(months.map(m => m.key));
  const added = [...used].filter(k => !have.has(k)).sort();
  // A new first month, before the one that held the opening balance: the
  // opening belongs at the very start, so it moves there (less what now
  // happens in that new month).
  const oldFirst = months[0];
  if (oldFirst && added.length && added[0] < oldFirst.key) {
    const early = entries.filter(e => e.month < oldFirst.key);
    const sum = (account: string) => early.reduce((t, e) => ((single ? MAIN_ACCOUNT : accountOf(e)) === account ? t + effect(e) : t), 0);
    const first: MonthRecord = { key: added[0], startedAt: now };
    const { opening, openings, ...rest } = oldFirst;
    if (opening !== undefined) first.opening = opening - sum(MAIN_ACCOUNT);
    if (openings) first.openings = Object.fromEntries(Object.entries(openings).map(([id, cents]) => [id, cents - sum(id)]));
    months[0] = rest;
    months.unshift(first);
    have.add(first.key);
  }
  for (const key of added) if (!have.has(key)) months.push({ key, startedAt: now });
  months.sort(byKey);
  // And the other way: a first month this change emptied hands its opening on and goes.
  while (months.length > 1 && !used.has(months[0].key) && had.has(months[0].key)) {
    const [first, next, ...later] = months;
    const merged: MonthRecord = { ...next };
    if (first.opening !== undefined && merged.opening === undefined) merged.opening = first.opening;
    if (first.openings) merged.openings = { ...first.openings, ...merged.openings };
    months = [merged, ...later];
  }
  // Any other month this change emptied, with no opening of its own, goes too.
  months = months.filter(m => used.has(m.key) || !had.has(m.key) || m.opening !== undefined || m.openings !== undefined);
  const { monthStart: _old, ...rest } = data;
  return { data: { ...rest, entries, months, ...(day !== 1 ? { monthStart: day } : {}) }, moved: moves.length };
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const i = year * 12 + (month - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/**
 * A share in percent the locale's way — "40 %" (de), "40%" (en), and in
 * Arabic with direction marks, so the sign stays on its side. `value` is
 * already in percent (40, not 0.4).
 */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100).replace('-', '−');
}

/** A run of months in words: "August – Oktober 2026", "Dez. 25 – März 26", or one month. */
export function monthSpanLabel(keys: MonthKey[], locale: string): string {
  if (!keys.length) return '';
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (first === last) return monthLabel(first, locale);
  if (first.slice(0, 4) === last.slice(0, 4)) {
    const { year, month } = parseMonthKey(first);
    return `${new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month - 1, 1))} – ${monthLabel(last, locale)}`;
  }
  return `${monthLabel(first, locale, 'short')} – ${monthLabel(last, locale, 'short')}`;
}

/** The `n` months up to and including `last`, oldest first. */
export function monthsEnding(last: MonthKey, n: number): MonthKey[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => addMonths(last, i - n + 1));
}

/** Whole months from a to b (b − a). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  const x = parseMonthKey(a);
  const y = parseMonthKey(b);
  return (y.year - x.year) * 12 + (y.month - x.month);
}

/** How many days a month has — the period's, when months don't start on the 1st (plan 32). */
export function daysInMonth(key: MonthKey): number {
  return periodRange(key).days;
}

export const isIsoDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

/** Day `day` of a calendar month, kept inside it ("31" in February is the 28th / 29th), as YYYY-MM-DD. */
export function dayInCalendarMonth(key: MonthKey, day: number): string {
  return `${key}-${pad2(Math.max(1, Math.min(day, calendarDays(key))))}`;
}

/**
 * The date in a month that falls on calendar day `day` ("the 3rd"), kept
 * inside it. With months from the 25th, "November" has its 27th in October
 * and its 3rd in November (plan 32).
 */
export function dayInMonth(key: MonthKey, day: number): string {
  if (monthStart === 1) return dayInCalendarMonth(key, day);
  const from = monthStart <= 15 ? key : addMonths(key, -1);
  return day >= monthStart ? dayInCalendarMonth(from, day) : dayInCalendarMonth(addMonths(from, 1), Math.max(1, day));
}

/** A new entry's date: today in the current month, else the same day of the month it goes into. */
export function defaultEntryDate(key: MonthKey, today = new Date()): string {
  return dayInMonth(key, today.getDate());
}

/** Which day of the running month today is, counted from 1 (plan 32: the 25th can be day 1). */
export function dayOfMonth(today = new Date()): number {
  return dayIndex(isoDay(today), monthKeyOf(today)) ?? today.getDate();
}

/** "3. Nov." / "3 Nov" — an entry's date on the month page, where the year goes without saying. */
export function dayLabel(date: string, locale: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
}

/** "November 2026" / "Nov. 26" / "Nov." / "November" (`name`: the month alone, for a sentence) in the app language. */
export function monthLabel(key: MonthKey, locale: string, style: 'long' | 'short' | 'month' | 'name' = 'long'): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1, 1);
  const opts: Intl.DateTimeFormatOptions =
    style === 'long' ? { month: 'long', year: 'numeric' }
      : style === 'short' ? { month: 'short', year: '2-digit' }
        : style === 'name' ? { month: 'long' }
          : { month: 'short' };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/* ---------------------------------------------------------------- entries */

export function entriesOf(entries: Entry[], month: MonthKey, categoryId?: string): Entry[] {
  return entries.filter(e => e.month === month && (categoryId === undefined || e.categoryId === categoryId));
}

/** The categories every newly started month gets. */
export function standardCategoryIds(categories: Category[]): string[] {
  return categories.filter(c => c.standard !== false).map(c => c.id);
}

/**
 * The categories a month shows, in the user's order: the ones in the month's
 * own list, plus any that have entries in it — a category with money in it
 * never disappears. A month without a list of its own (from before per-month
 * lists, or an Excel import) shows the standard ones.
 */
export function monthCategories(data: AppData, key: MonthKey): Category[] {
  const list = data.months.find(m => m.key === key)?.categories ?? standardCategoryIds(data.categories);
  const shown = new Set(list);
  for (const e of data.entries) if (e.month === key) shown.add(e.categoryId);
  return data.categories.filter(c => shown.has(c.id));
}

/** A category can be taken out of a month only while it has no entries there. */
export function canRemoveFromMonth(data: AppData, key: MonthKey, categoryId: string): boolean {
  return !data.entries.some(e => e.month === key && e.categoryId === categoryId);
}

/**
 * The order rows show in within a category: the user's own order first, once
 * entries have been dragged there; then what has a due day, by that day (rent
 * on the 1st above the phone bill on the 18th); then everything else in the
 * order it was entered — the way the Excel column grows.
 */
/** The day of the month an entry happens: its date, or for older entries without one, the due day. */
const dayOf = (e: Entry): number | undefined => {
  if (e.date) return dayIndex(e.date, e.month) ?? Number(e.date.slice(8, 10));
  if (e.dueDay === undefined || monthStart === 1) return e.dueDay;
  // Counted from the month's first day: with a start on the 25th, the 28th comes before the 3rd.
  return e.dueDay >= monthStart ? e.dueDay - monthStart + 1 : e.dueDay + 31 - monthStart + 1;
};

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order;
    if (a.order !== undefined && b.order === undefined) return -1;
    if (a.order === undefined && b.order !== undefined) return 1;
    const da = dayOf(a);
    const db = dayOf(b);
    if (da !== undefined && db !== undefined && da !== db) return da - db;
    if (da !== undefined && db === undefined) return -1;
    if (da === undefined && db !== undefined) return 1;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Drop an entry at `toIndex` of a category in the same month — a reorder when
 * it is its own category, a move when it isn't. Both categories get their
 * order written down, so it stays exactly as the user left it.
 */
export function moveEntry(entries: Entry[], id: string, toCategoryId: string, toIndex: number): Entry[] {
  const moving = entries.find(e => e.id === id);
  if (!moving) return entries;
  const inMonth = (catId: string) => sortEntries(entries.filter(e => e.month === moving.month && e.categoryId === catId && e.id !== id));
  const target = inMonth(toCategoryId);
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, { ...moving, categoryId: toCategoryId });
  const updates = new Map<string, Entry>();
  target.forEach((e, k) => updates.set(e.id, { ...e, order: k }));
  if (moving.categoryId !== toCategoryId) inMonth(moving.categoryId).forEach((e, k) => updates.set(e.id, { ...e, order: k }));
  return entries.map(e => updates.get(e.id) ?? e);
}

/**
 * Still open and already late: the month is over, or it is this month and the
 * due day has passed.
 */
export function isOverdue(e: Entry, today = new Date()): boolean {
  if (e.paid) return false;
  // The date says when it happens: past it and still open is overdue.
  if (e.date) return e.date < isoDay(today);
  const now = monthKeyOf(today);
  if (e.month < now) return true;
  if (e.month > now || e.dueDay === undefined) return false;
  return dayInMonth(e.month, e.dueDay) < isoDay(today);
}

/* ---------------------------------------------------------------- balances */

export interface Totals {
  incomePaid: number;
  incomeOpen: number;
  expensePaid: number;
  expenseOpen: number;
  /** Entries in the month, and how many are still open (both kinds). */
  count: number;
  openCount: number;
  /** Expense entries, and how many of them are paid — the progress bar. */
  expenseCount: number;
  expensePaidCount: number;
}

export function monthTotals(entries: Entry[], categories: Category[], month: MonthKey): Totals {
  const kind = kindLookup(categories);
  const t: Totals = { incomePaid: 0, incomeOpen: 0, expensePaid: 0, expenseOpen: 0, count: 0, openCount: 0, expenseCount: 0, expensePaidCount: 0 };
  for (const e of entries) {
    // A transfer between two accounts is neither income nor expense (plan 30).
    if (e.month !== month || e.transfer) continue;
    t.count++;
    if (!e.paid) t.openCount++;
    if (kind(e.categoryId) === 'income') {
      if (e.paid) t.incomePaid += e.amount; else t.incomeOpen += e.amount;
    } else {
      t.expenseCount++;
      if (e.paid) { t.expensePaid += e.amount; t.expensePaidCount++; } else t.expenseOpen += e.amount;
    }
  }
  return t;
}

/**
 * What the month leaves over — income less expenses, the carry-over aside:
 * so far (what is ticked), still to come (what is pending), and both.
 */
export function monthLeft(t: Totals): { paid: number; open: number; total: number } {
  const paid = t.incomePaid - t.expensePaid;
  const open = t.incomeOpen - t.expenseOpen;
  return { paid, open, total: paid + open };
}

/** The month as it will look once everything pending is settled: income, expenses and their difference. */
export function monthSettled(t: Totals): { income: number; expense: number; net: number } {
  const income = t.incomePaid + t.incomeOpen;
  const expense = t.expensePaid + t.expenseOpen;
  return { income, expense, net: income - expense };
}

/**
 * What the month leaves to spend per day until it ends: its settled net (see
 * monthSettled) over the days left, today included — on the 7th of a 30-day
 * month, 24. Only for the running month and while something is left; null
 * otherwise. Rounded down, so it never promises a cent more than there is.
 */
export function leftPerDay(net: number, month: MonthKey, today = new Date()): number | null {
  if (net <= 0 || month !== monthKeyOf(today)) return null;
  const daysLeft = daysInMonth(month) - dayOfMonth(today) + 1;
  return Math.floor(net / daysLeft);
}

/** Rounded to whole euros — for averages, where the cents are noise: "3.798 €", "+1.241 €". */
export function formatMoneyWhole(cents: number, locale: string, sign: 'auto' | 'exceptZero' = 'auto'): string {
  if (amountsHidden) return maskedMoney(locale);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 0, signDisplay: sign })
    .format(Math.round(cents / 100)).replace('US$', '$').replace('-', '−');
}

/** An amount without its cents when it has none — "400 €" for a budget, "212,88 €" otherwise. */
export function formatMoneyShort(cents: number, locale: string): string {
  if (amountsHidden || cents % 100 !== 0) return formatMoney(cents, locale);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(cents / 100).replace('US$', '$').replace('-', '−');
}

/**
 * An amount rounded down for "about" figures ("≈ 72 € pro Tag"): whole euros
 * from 10 € up, cents below, where the cents still matter.
 */
export function formatMoneyApprox(cents: number, locale: string): string {
  if (amountsHidden || Math.abs(cents) < 1000) return formatMoney(cents, locale);
  const euros = Math.trunc(cents / 100);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(euros).replace('US$', '$').replace('-', '−');
}

/**
 * An estimate, rounded the way a person would say it — for every "≈" (a
 * forecast, a projection, a usual month): to 100 € from 10.000 €, to 10 €
 * from 1.000 €, whole euros below. A forecast with cents reads as a promise.
 */
export function formatMoneyEstimate(cents: number, locale: string, sign: 'auto' | 'exceptZero' = 'auto'): string {
  if (amountsHidden) return maskedMoney(locale);
  const euros = Math.abs(cents) / 100;
  const step = euros >= 10_000 ? 100 : euros >= 1_000 ? 10 : 1;
  const rounded = Math.round(euros / step) * step;
  const value = cents < 0 && rounded ? -rounded : rounded;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: activeCurrency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 0, signDisplay: sign })
    .format(value).replace('US$', '$').replace('-', '−');
}

/**
 * Euro cents → a short axis label in the reader's own way of writing it:
 * "4.000", "20.000", "1,5 Mio." in German, "4K" in English, "4 آلاف" in
 * Arabic. German compact notation leaves four-digit numbers ungrouped
 * ("4000" beside "20.000"); where the engine doesn't group them on request,
 * amounts under a million go in standard notation instead. Hidden amounts
 * (plan 06) leave the bare "••••": an axis has no room for the currency.
 */
export function compactMoney(cents: number, locale: string): string {
  if (amountsHidden) return MASK;
  const v = cents / 100;
  const opts = { notation: 'compact', maximumFractionDigits: 1, useGrouping: 'always' } as Intl.NumberFormatOptions;
  let out = new Intl.NumberFormat(locale, opts).format(v);
  if (Math.abs(v) < 1e6 && /\d{4}/.test(out)) out = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);
  return out.replace('-', '−');
}

function kindLookup(categories: Category[]): (id: string) => CategoryKind {
  const m = new Map(categories.map(c => [c.id, c.kind]));
  return id => m.get(id) ?? 'expense';
}

export interface MonthBalance extends Totals {
  key: MonthKey;
  started: boolean;
  /** Where the carry-over came from, if anywhere. */
  prevKey?: MonthKey;
  /** The month's opening was set by hand. */
  overridden: boolean;
  /** Carry-in for "now": what the previous month left, counting paid entries only. */
  openingNow: number;
  /** Carry-in for "end": the same, but with every open entry of earlier months settled. */
  openingEnd: number;
  /** Jetzt auf dem Konto — opening + income received − expenses paid. */
  now: number;
  /** Am Monatsende — once every open entry is paid / received. */
  end: number;
  /** Transfers in less transfers out, ticked / still open (plan 30) — only when the month has any. */
  transferPaid?: number;
  transferOpen?: number;
}

/**
 * The two balances of every started month, chained oldest to newest.
 *
 * "now" carries "now" and "end" carries "end": an open bill from October
 * still lowers November's end-of-month balance (it has to be paid sometime),
 * but not the account balance — until it is ticked. A month with a manual
 * opening uses it for "now" and keeps the outstanding difference for "end".
 *
 * Per account (plan 30): the main account's by default — a book with one
 * account has only that — another's by its id, or every account's together
 * (`'all'`). Transfers move their account's balance but are neither income
 * nor expense; they show as `transferPaid` / `transferOpen`.
 */
export function computeBalances(data: AppData, account: AccountView = MAIN_ACCOUNT): MonthBalance[] {
  if (account === ALL_ACCOUNTS) {
    const ids = accountIds(data);
    return ids.length === 1 ? computeBalances(data, ids[0]) : sumBalances(ids.map(id => computeBalances(data, id)));
  }
  const months = [...data.months].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const single = !data.accounts?.length;
  // Every month's entries in one pass (ten years would otherwise be read once per month).
  const byMonth = new Map<MonthKey, Entry[]>();
  for (const e of data.entries) {
    if (!single && (e.accountId ?? MAIN_ACCOUNT) !== account) continue;
    const list = byMonth.get(e.month);
    if (list) list.push(e); else byMonth.set(e.month, [e]);
  }
  const out: MonthBalance[] = [];
  let prev: MonthBalance | undefined;
  for (const m of months) {
    const list = byMonth.get(m.key) ?? [];
    const totals = monthTotals(list, data.categories, m.key);
    let transferPaid = 0;
    let transferOpen = 0;
    let transfers = false;
    for (const e of list) {
      if (!e.transfer) continue;
      transfers = true;
      const v = e.transfer.direction === 'in' ? e.amount : -e.amount;
      if (e.paid) transferPaid += v; else transferOpen += v;
    }
    const outstanding = prev ? prev.end - prev.now : 0;
    const opening = account === MAIN_ACCOUNT ? m.opening : m.openings?.[account];
    const overridden = opening !== undefined;
    const openingNow = overridden ? opening : prev?.now ?? 0;
    const openingEnd = overridden ? opening + outstanding : prev?.end ?? 0;
    const b: MonthBalance = {
      key: m.key,
      started: true,
      prevKey: prev?.key,
      overridden,
      openingNow,
      openingEnd,
      ...totals,
      now: openingNow + totals.incomePaid - totals.expensePaid + transferPaid,
      end: openingEnd + totals.incomePaid + totals.incomeOpen - totals.expensePaid - totals.expenseOpen + transferPaid + transferOpen,
    };
    if (transfers) { b.transferPaid = transferPaid; b.transferOpen = transferOpen; }
    out.push(b);
    prev = b;
  }
  return out;
}

/** Several accounts' balances, month by month, added up (they share the book's months). */
function sumBalances(lists: MonthBalance[][]): MonthBalance[] {
  const [first, ...rest] = lists;
  return first.map((b, i) => {
    const sum: MonthBalance = { ...b };
    for (const other of rest) {
      const o = other[i];
      sum.overridden ||= o.overridden;
      for (const k of SUMMED) sum[k] += o[k];
      if (o.transferPaid !== undefined || o.transferOpen !== undefined) {
        sum.transferPaid = (sum.transferPaid ?? 0) + (o.transferPaid ?? 0);
        sum.transferOpen = (sum.transferOpen ?? 0) + (o.transferOpen ?? 0);
      }
    }
    return sum;
  });
}
const SUMMED = ['openingNow', 'openingEnd', 'incomePaid', 'incomeOpen', 'expensePaid', 'expenseOpen', 'count', 'openCount', 'expenseCount', 'expensePaidCount', 'now', 'end'] as const;

/**
 * The balance of any month: a started one from the chain, or — for a month
 * not started yet — what it would open with: the last started month before it.
 */
export function balanceFor(balances: MonthBalance[], key: MonthKey): MonthBalance {
  const found = balances.find(b => b.key === key);
  if (found) return found;
  let prev: MonthBalance | undefined;
  for (const b of balances) if (b.key < key) prev = b;
  const empty: Totals = { incomePaid: 0, incomeOpen: 0, expensePaid: 0, expenseOpen: 0, count: 0, openCount: 0, expenseCount: 0, expensePaidCount: 0 };
  return {
    key, started: false, prevKey: prev?.key, overridden: false,
    openingNow: prev?.now ?? 0, openingEnd: prev?.end ?? 0, ...empty,
    now: prev?.now ?? 0, end: prev?.end ?? 0,
  };
}

/** The latest started month strictly before `key`. */
export function previousStarted(months: MonthRecord[], key: MonthKey): MonthKey | undefined {
  let best: MonthKey | undefined;
  for (const m of months) if (m.key < key && (!best || m.key > best)) best = m.key;
  return best;
}

/** Open entries left behind in started months before `key` — "2 offen aus Oktober". */
export function openBefore(data: AppData, key: MonthKey): Entry[] {
  return data.entries.filter(e => !e.paid && e.month < key);
}

/* ---------------------------------------------------------- accounts (30) */

/** The account every book has; entries without `accountId` are in it. */
export const MAIN_ACCOUNT = 'main';
/** The balance card's "Alle Konten": every account together. */
export const ALL_ACCOUNTS = 'all';
/** Which account's money is shown: an account's id, or every account's. */
export type AccountView = string;
/** The category every transfer is filed under. Not a real category: it has no row, budget or share. */
export const TRANSFER_CATEGORY = 'transfer';
export const MAX_ACCOUNTS = 12;

const ACCOUNT_LOOK: Record<AccountKind, { emoji: string; hue: Hue }> = {
  bank: { emoji: '🏦', hue: 'blue' },
  cash: { emoji: '💶', hue: 'leaf' },
  savings: { emoji: '🐷', hue: 'berry' },
};
/** What a new account of a kind looks like until the user changes it. */
export const accountLook = (kind: AccountKind) => ACCOUNT_LOOK[kind];

/** The main account as a book with one account has it: unnamed, so it reads "Girokonto" in any language. */
export function mainAccount(): Account {
  return { id: MAIN_ACCOUNT, name: '', kind: 'bank', ...ACCOUNT_LOOK.bank, createdAt: 0 };
}

/** The book's accounts, the main one first — just the main one until another is added. */
export function accountsOf(data: AppData): Account[] {
  return data.accounts?.length ? data.accounts : [mainAccount()];
}

export const accountIds = (data: AppData): string[] => accountsOf(data).map(a => a.id);

/** Whether the book has more than its main account — only then does anything about accounts show. */
export const hasAccounts = (data: AppData): boolean => (data.accounts?.length ?? 0) > 1;

/** The account an entry is in. */
export const accountOf = (e: Entry): string => e.accountId ?? MAIN_ACCOUNT;

/** An account's name; the main account's own until the user renames it. */
export function accountName(a: Account, mainName: string): string {
  return a.name || (a.id === MAIN_ACCOUNT ? mainName : '?');
}

/** An account may go only once nothing is booked on it; the main account stays. */
export function canDeleteAccount(data: AppData, id: string): boolean {
  return id !== MAIN_ACCOUNT && !data.entries.some(e => e.accountId === id);
}

/**
 * The book as one account sees it, transfers left out — what the month's
 * list, Statistik, budgets and the insights read. `'all'` keeps every
 * account's entries. A book with one account and no transfers comes back as
 * it is.
 */
export function accountView(data: AppData, account: AccountView): AppData {
  const every = account === ALL_ACCOUNTS || !hasAccounts(data);
  if (every && !data.entries.some(e => e.transfer)) return data;
  return { ...data, entries: data.entries.filter(e => !e.transfer && (every || accountOf(e) === account)) };
}

/** The transfers of a month an account takes part in (both sides for `'all'`), as entered. */
export function monthTransfers(data: AppData, month: MonthKey, account: AccountView): Entry[] {
  return data.entries
    .filter(e => e.transfer && e.month === month && (account === ALL_ACCOUNTS || accountOf(e) === account))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.createdAt - b.createdAt);
}

/** Both sides of a transfer, out first; a side can be missing in a book edited by hand. */
export function transferPair(entries: Entry[], pairId: string): { out?: Entry; in?: Entry } {
  const pair: { out?: Entry; in?: Entry } = {};
  for (const e of entries) if (e.transfer?.pairId === pairId) pair[e.transfer.direction] = e;
  return pair;
}

export interface TransferDraft {
  from: string;
  to: string;
  amount: number;
  name: string;
  month: MonthKey;
  date?: string;
  paid: boolean;
  repeat: Repeat;
  note?: string;
}

/** A transfer as its two entries: out of `from`, into `to` (plan 30). */
export function makeTransfer(d: TransferDraft, now: number, newId: () => string = uid): [Entry, Entry] {
  const pairId = newId();
  const side = (direction: 'out' | 'in', account: string, i: number): Entry => {
    const id = newId();
    const e: Entry = {
      id, month: d.month, categoryId: TRANSFER_CATEGORY, name: cleanText(d.name) || '?', amount: Math.min(Math.round(Math.abs(d.amount)), MAX_CENTS),
      paid: d.paid, repeat: d.repeat, seriesId: id, createdAt: now + i, transfer: { pairId, direction },
    };
    if (account !== MAIN_ACCOUNT) e.accountId = account;
    if (d.date) e.date = d.date;
    if (d.paid) e.paidAt = now;
    const note = cleanText(d.note ?? '', 200);
    if (note) e.note = note;
    return e;
  };
  return [side('out', d.from, 0), side('in', d.to, 1)];
}

/** Entries from an import, into the account they were imported for (plan 30). */
export function intoAccount(entries: Entry[], account: string): Entry[] {
  return account === MAIN_ACCOUNT ? entries : entries.map(e => ({ ...e, accountId: account }));
}

export interface AccountTotal { account: Account; now: number; end: number }

/** Every account's two balances in a month, and all of them together — "Vermögen" (plan 30). */
export function accountTotals(data: AppData, month: MonthKey): { accounts: AccountTotal[]; now: number; end: number } {
  const accounts = accountsOf(data).map(account => {
    const b = balanceFor(computeBalances(data, account.id), month);
    return { account, now: b.now, end: b.end };
  });
  return { accounts, now: accounts.reduce((s, a) => s + a.now, 0), end: accounts.reduce((s, a) => s + a.end, 0) };
}

/* -------------------------------------------------------------- carry-over */

/** How many months lie between a recurring entry and its next copy: 1, 12 — or 2, 3, 6 for a yearly entry with `every` (schema 24). 0 = it doesn't repeat. */
export function intervalOf(e: Pick<Entry, 'repeat' | 'every'>): number {
  return e.repeat === 'none' ? 0 : e.repeat === 'monthly' ? 1 : e.every ?? 12;
}

/** The series has run out by `key`: its last month (`until`) lies before it. */
export const seriesEnded = (e: Pick<Entry, 'until'>, key: MonthKey): boolean => !!e.until && key > e.until;

/** Whether a recurring entry comes back in the later month `key`: every month, or a whole number of its intervals on — and not past its end. */
export function comesBackIn(e: Pick<Entry, 'repeat' | 'every' | 'until' | 'month'>, key: MonthKey): boolean {
  const n = intervalOf(e);
  if (!n || key <= e.month || seriesEnded(e, key)) return false;
  return n === 1 || e.repeat === 'yearly' && (e.every ? monthsBetween(e.month, key) % n === 0 : key === addMonths(e.month, 12));
}

/**
 * The newest entry of every `yearly` series (the ones outside the monthly
 * run: yearly, half-yearly, quarterly, every two months) — what a forecast
 * projects from. One pass; ask `comesBackIn(entry, key)` for a month ahead.
 */
export function latestPeriodic(entries: readonly Entry[]): Entry[] {
  const latest = new Map<string, Entry>();
  for (const e of entries) {
    if (e.transfer || e.repeat !== 'yearly') continue;
    const have = latest.get(e.seriesId);
    if (!have || e.month > have.month || (e.month === have.month && e.createdAt > have.createdAt)) latest.set(e.seriesId, e);
  }
  return [...latest.values()];
}

/**
 * What starting `key` would carry in: every monthly entry of the last started
 * month before it, every yearly entry of the same month a year earlier —
 * minus anything of the same series already in `key`.
 */
export function carryCandidates(data: AppData, key: MonthKey): Entry[] {
  const present = new Set(data.entries.filter(e => e.month === key).map(e => e.seriesId));
  const prev = previousStarted(data.months, key);
  // A yearly entry of the same month a year earlier — a quarterly one three months earlier, and so on.
  const back = new Map<number, MonthKey>();
  const ago = (n: number) => back.get(n) ?? (back.set(n, addMonths(key, -n)), back.get(n)!);
  const out: Entry[] = [];
  const seen = new Set<string>();
  for (const e of data.entries) {
    const take = (e.month === prev && e.repeat === 'monthly') || (e.repeat === 'yearly' && e.month === ago(intervalOf(e)));
    if (!take || seriesEnded(e, key) || present.has(e.seriesId) || seen.has(e.seriesId)) continue;
    seen.add(e.seriesId);
    out.push(e);
  }
  return sortEntries(out);
}

/**
 * A recurring entry added (or made recurring) in a month that already has
 * started months after it: copies for those months, so a new monthly bill
 * shows up in the next month too, not only in months started later. Monthly
 * goes into every later started month, yearly into the same month a year on;
 * a month that already has the series is left alone.
 */
export function laterCopies(data: AppData, entry: Entry, now: number, newId: () => string = uid): Entry[] {
  if (entry.repeat === 'none') return [];
  const targets = data.months
    .map(m => m.key)
    .filter(k => comesBackIn(entry, k))
    .filter(k => !data.entries.some(e => e.month === k && e.seriesId === entry.seriesId));
  return targets.flatMap((k, i) => carryOver([entry], k, now + i, newId));
}

/** `laterCopies` for a recurring transfer's two sides, so each later month gets one transfer of its own (plan 30). */
export function laterTransferCopies(data: AppData, pair: Entry[], now: number, newId: () => string = uid): Entry[] {
  const [first] = pair;
  if (!first || first.repeat === 'none') return [];
  const targets = data.months
    .map(m => m.key)
    .filter(k => comesBackIn(first, k))
    .filter(k => !data.entries.some(e => e.month === k && e.seriesId === first.seriesId));
  return targets.flatMap((k, i) => carryOver(pair, k, now + i * pair.length, newId));
}

/** Copies of `sources` for month `key`: open, same amount, same due day, same series. */
export function carryOver(sources: Entry[], key: MonthKey, now: number, newId: () => string = uid): Entry[] {
  // A carried transfer's two sides share a new pair id, so they stay one transfer (plan 30).
  const pairs = new Map<string, string>();
  return sources.map((e, i) => {
    const copy: Entry = {
      id: newId(),
      month: key,
      categoryId: e.categoryId,
      name: e.name,
      amount: e.amount,
      paid: false,
      repeat: e.repeat,
      seriesId: e.seriesId,
      createdAt: now + i,
    };
    if (e.repeat === 'yearly' && e.every) copy.every = e.every;
    if (e.until) copy.until = e.until;
    if (e.dueDay !== undefined) copy.dueDay = e.dueDay;
    // The same day of the new month (rent on the 1st stays on the 1st).
    if (e.date) copy.date = dayInMonth(key, Number(e.date.slice(8, 10)));
    if (e.note) copy.note = e.note;
    if (e.order !== undefined) copy.order = e.order;
    // A recurring entry keeps its goal (a standing order fills the pot, plan 12) and its tags (plan 26).
    if (e.goalId) copy.goalId = e.goalId;
    // A recurring repayment keeps paying the same debt (plan 31).
    if (e.debtId) copy.debtId = e.debtId;
    if (e.tags?.length) copy.tags = [...e.tags];
    // A split payment carries all its parts; they keep their shared splitId (plan 21).
    if (e.splitId) copy.splitId = e.splitId;
    // The account stays (plan 30).
    if (e.accountId) copy.accountId = e.accountId;
    if (e.transfer) {
      let pairId = pairs.get(e.transfer.pairId);
      if (!pairId) pairs.set(e.transfer.pairId, pairId = newId());
      copy.transfer = { pairId, direction: e.transfer.direction };
    }
    return copy;
  });
}

/* ------------------------------------------------------------- suggestions */

export interface NameSuggestion {
  name: string;
  /** How often it was entered, in any category. 0 for a built-in suggestion. */
  count: number;
  /** The category it was last entered in (the asked-for one if it was ever used there). */
  categoryId: string;
  /** The most recent entry with this name (in that category), if any — for prefilling. */
  last?: Pick<Entry, 'amount' | 'repeat' | 'dueDay'>;
}

/**
 * Names for the entry sheet's chips, from every entry of every month: first
 * what was entered in this category before, then names from the other
 * categories of the same kind (expenses for an expense, each most often
 * first, then most recent) — the user's own history — and only after it the
 * built-in ideas for a built-in category. While typing, names that start with
 * the letters so far come first, then names that contain them.
 */
export function suggestNames({ entries, categoryId, query = '', lang, limit = 12, categories }: {
  entries: Entry[];
  categoryId: string;
  query?: string;
  lang: string;
  limit?: number;
  /** To keep income names out of an expense's suggestions and back. */
  categories?: Category[];
}): NameSuggestion[] {
  const q = normalizeName(query);
  const newer = (a: Entry, b: Entry) => a.month > b.month || (a.month === b.month && a.createdAt > b.createdAt);
  const groups = new Map<string, { name: string; count: number; here: number; latest: Entry; latestHere?: Entry }>();
  for (const e of entries) {
    if (e.transfer) continue;
    const k = normalizeName(e.name);
    if (!k) continue;
    const isHere = e.categoryId === categoryId;
    const g = groups.get(k);
    if (!g) {
      groups.set(k, { name: e.name, count: 1, here: isHere ? 1 : 0, latest: e, latestHere: isHere ? e : undefined });
      continue;
    }
    g.count++;
    if (isHere) {
      g.here++;
      if (!g.latestHere || newer(e, g.latestHere)) g.latestHere = e;
    }
    if (newer(e, g.latest)) { g.latest = e; g.name = e.name; }
  }
  const history = [...groups.entries()]
    .sort(([, a], [, b]) => (b.here ? 1 : 0) - (a.here ? 1 : 0) || b.here - a.here || b.count - a.count
      || (newer(b.latest, a.latest) ? 1 : newer(a.latest, b.latest) ? -1 : 0))
    .map(([k, g]) => {
      const from = g.latestHere ?? g.latest;
      return { k, s: { name: g.name, count: g.count, categoryId: from.categoryId, last: { amount: from.amount, repeat: from.repeat, dueDay: from.dueDay } } as NameSuggestion };
    });
  const builtin = (NAME_SUGGESTIONS[categoryId] ?? [])
    .map(names => displayName(names, lang))
    .map(name => ({ k: normalizeName(name), s: { name, count: 0, categoryId } as NameSuggestion }))
    .filter(x => !groups.has(x.k));
  const kind = categories ? kindLookup(categories) : undefined;
  const here = history.filter(x => x.s.categoryId === categoryId && groups.get(x.k)!.here > 0);
  const elsewhere = history.filter(x => groups.get(x.k)!.here === 0 && (!kind || kind(x.s.categoryId) === kind(categoryId)));
  const all = [...here, ...elsewhere, ...builtin];
  if (!q) return all.slice(0, limit).map(x => x.s);
  const starts = all.filter(x => x.k.startsWith(q) && x.k !== q);
  const contains = all.filter(x => !x.k.startsWith(q) && x.k.includes(q));
  return [...starts, ...contains].slice(0, limit).map(x => x.s);
}

/* ------------------------------------------------------------------ search */

/**
 * One character the way search compares it: lower case, accents and Arabic
 * vowel marks dropped, ß as ss, ة as ه and ى as ي, Arabic-Indic digits as 0–9
 * — so "strasse" finds "Straße", "gebuhr" "Gebühr", "احمد" "أحمد".
 */
function foldChar(ch: string): string {
  return normalizeDigits(ch)
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    // Letters NFKD leaves whole: Turkish dotless ı, Danish/Norwegian ø æ,
    // French œ, Polish ł, Croatian đ ("istanbul" finds "İstanbul" and "Isparta"
    // finds "ısparta"; "smor" finds "smør").
    .replace(/ı/g, 'i').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ł/g, 'l').replace(/đ/g, 'd')
    .normalize('NFKD')
    .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/**
 * A text folded for search, with where each folded character came from — so
 * a hit in the folded text can be marked in the original. A mark that folds
 * away (an Arabic vowel sign) stays with the letter before it.
 */
function foldMapped(text: string): { folded: string; from: number[]; to: number[] } {
  let folded = '';
  const from: number[] = [];
  const to: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = foldChar(ch);
    if (!f && to.length) to[to.length - 1] = i + ch.length;
    for (let k = 0; k < f.length; k++) { from.push(i); to.push(i + ch.length); }
    folded += f;
    i += ch.length;
  }
  return { folded, from, to };
}

export function foldForSearch(text: string): string {
  return foldMapped(text).folded;
}

/** The words of a search, folded; a lone currency sign is not a word. */
export function searchTerms(query: string): string[] {
  return foldForSearch(query).split(/\s+/).filter(w => w && !/^[€$£]+$/.test(w));
}

/* ---------------------------------------------------------------- keywords */

/** A category keyword's longest form, and how many one category keeps (schema 18). */
export const MAX_KEYWORD_LENGTH = 40;
export const MAX_KEYWORDS = 120;

/**
 * The words of a name as keywords compare them (src/keywords.ts): folded like
 * search, apostrophes dropped ("McDonald's" = "mcdonalds"), "&" and "+" kept
 * inside a word ("H&M", "1&1") but not at its edge ("Disney+" = "disney"), and
 * an Arabic article taken off ("الكهرباء" = "كهرباء").
 */
export function keywordTokens(text: string): string[] {
  return foldForSearch(text)
    .replace(/['’‘`´]/g, '')
    .split(/[^\p{L}\p{N}&+]+/u)
    .map(w => w.replace(/^[&+]+|[&+]+$/g, '').replace(/^ال(?=\p{Script=Arabic}{2})/u, ''))
    .filter(w => /[\p{L}\p{N}]/u.test(w));
}

/** A name as one comparable key: its keyword tokens joined by spaces ("" when nothing is left). */
export const keywordKey = (text: string) => keywordTokens(text).join(' ');

/**
 * A category's keyword list as stored: trimmed, each at most 40 characters,
 * no two alike (case, accents and Arabic letter forms aside), at most 120.
 * Not a list: undefined — the category follows what the app ships.
 */
export function normalizeKeywords(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const word = cleanText(x, MAX_KEYWORD_LENGTH);
    const key = keywordKey(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

/**
 * Is a typed number part of an amount, however it is written? "39", "39,8",
 * "80" and "3980" all find 39,80 €; "1050", "1.050" and "1050,00" find
 * 1.050,00 €. A minus or € typed along is ignored.
 */
function amountMatches(cents: number, term: string, locale: string): boolean {
  const typed = term.replace(/^[−-]/, '').replace(/[€$£]/g, '');
  if (!/^[\d.,]*\d[\d.,]*$/.test(typed)) return false;
  const value = Math.abs(cents) / 100;
  const plain = value.toFixed(2);
  const grouped = normalizeDigits(new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value));
  // Typed without a separator ("3980"): from the start only, so "99" doesn't find 59,98 €.
  return [plain, plain.replace('.', ','), grouped].some(x => x.includes(typed)) || String(Math.abs(cents)).startsWith(typed);
}

/**
 * The entries a search finds, in their order. Every word has to appear in the
 * entry's name, its note or its category's name, or in its amount; case,
 * accents and Arabic letter forms don't matter. No words: everything.
 */
export function searchEntries(entries: Entry[], query: string, { categoryName, locale }: {
  /** The category's name as shown (in the current language). */
  categoryName: (categoryId: string) => string;
  locale: string;
}): Entry[] {
  const terms = searchTerms(query);
  if (!terms.length) return entries;
  const names = new Map<string, string>();
  return entries.filter(e => {
    let category = names.get(e.categoryId);
    if (category === undefined) names.set(e.categoryId, category = foldForSearch(categoryName(e.categoryId)));
    // Tags as "#tag" tokens: "#urlaub" matches exactly, a plain "urlaub" still matches the word inside (plan 26).
    const tags = e.tags?.length ? '\n' + e.tags.map(x => `#${foldForSearch(x)}`).join(' ') : '';
    const text = `${foldForSearch(e.name)}\n${foldForSearch(e.note ?? '')}\n${category}${tags}`;
    return terms.every(t => text.includes(t) || amountMatches(e.amount, t, locale));
  });
}

/**
 * Search hits from every month, a group per month: the month on screen
 * first, then the others newest first. At most `limit` entries — the group
 * the limit cuts into keeps what fits; `total` says how many there are.
 */
export function searchByMonth(hits: Entry[], first: MonthKey, limit = Infinity): { groups: { month: MonthKey; entries: Entry[] }[]; total: number; shown: number } {
  const byMonth = new Map<MonthKey, Entry[]>();
  for (const e of hits) {
    const list = byMonth.get(e.month);
    if (list) list.push(e); else byMonth.set(e.month, [e]);
  }
  const months = [...byMonth.keys()].sort((a, b) => (a === first ? -1 : b === first ? 1 : a < b ? 1 : a > b ? -1 : 0));
  const groups: { month: MonthKey; entries: Entry[] }[] = [];
  let shown = 0;
  for (const month of months) {
    if (shown >= limit) break;
    const entries = byMonth.get(month)!.slice(0, limit - shown);
    groups.push({ month, entries });
    shown += entries.length;
  }
  return { groups, total: hits.length, shown };
}

/** Where a search's words appear in a text, as [start, end) ranges to mark, merged and in order. */
export function highlightRanges(text: string, query: string): [number, number][] {
  const terms = searchTerms(query);
  if (!terms.length || !text) return [];
  const { folded, from, to } = foldMapped(text);
  const hits: [number, number][] = [];
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
      hits.push([from[at], to[at + term.length - 1]]);
    }
  }
  hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of hits) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/**
 * The few categories the entry sheet shows before "All": of the chosen
 * category's kind, this month's first, then the most used (entries of every
 * month), then the user's order — always with the chosen one among them, and
 * shown in the user's order so picking one never shuffles the row.
 */
export function topCategories({ categories, entries, selectedId, featured = [], limit = 3 }: {
  categories: Category[];
  entries: Entry[];
  selectedId: string;
  /** This month's categories. */
  featured?: string[];
  limit?: number;
}): Category[] {
  const kind = categories.find(c => c.id === selectedId)?.kind ?? 'expense';
  const used = new Map<string, number>();
  for (const e of entries) used.set(e.categoryId, (used.get(e.categoryId) ?? 0) + 1);
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const ranked = [...categories].sort((a, b) =>
    Number(b.kind === kind) - Number(a.kind === kind)
    || Number(featured.includes(b.id)) - Number(featured.includes(a.id))
    || (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0)
    || order.get(a.id)! - order.get(b.id)!);
  let top = ranked.slice(0, limit);
  const chosen = categories.find(c => c.id === selectedId);
  if (chosen && !top.includes(chosen)) top = [...top.slice(0, Math.max(0, limit - 1)), chosen];
  return top.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

/* -------------------------------------------------------------- statistics */

export interface CategorySlice {
  category: Category;
  paid: number;
  open: number;
  total: number;
  count: number;
}

/** Expenses of a month per category, largest first; empty categories left out. */
export function categoryBreakdown(entries: Entry[], categories: Category[], month: MonthKey, kind: CategoryKind = 'expense'): CategorySlice[] {
  const slices = new Map<string, CategorySlice>();
  for (const c of categories) if (c.kind === kind) slices.set(c.id, { category: c, paid: 0, open: 0, total: 0, count: 0 });
  for (const e of entries) {
    if (e.month !== month) continue;
    const s = slices.get(e.categoryId);
    if (!s) continue;
    if (e.paid) s.paid += e.amount; else s.open += e.amount;
    s.total += e.amount;
    s.count++;
  }
  return [...slices.values()].filter(s => s.total > 0).sort((a, b) => b.total - a.total);
}

export interface NameTotal {
  name: string;
  categoryId: string;
  total: number;
  count: number;
}

/**
 * Where the money went, by shop or payee: every expense of the months given
 * grouped by name ("Lidl" ×6), largest total first.
 */
export function topNames(entries: Entry[], categories: Category[], months: MonthKey[], limit = Infinity): NameTotal[] {
  const kind = kindLookup(categories);
  const inRange = new Set(months);
  const groups = new Map<string, NameTotal>();
  for (const e of entries) {
    if (e.transfer || !inRange.has(e.month) || kind(e.categoryId) !== 'expense' || e.amount === 0) continue;
    const k = normalizeName(e.name);
    const g = groups.get(k);
    if (g) { g.total += e.amount; g.count++; } else groups.set(k, { name: e.name, categoryId: e.categoryId, total: e.amount, count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export interface HistoryPoint {
  key: MonthKey;
  started: boolean;
  income: number;
  expense: number;
  /** Income − expenses of the month (paid and open). */
  saved: number;
  /** The balance at the month's end. */
  end: number;
}

/** The `count` months up to and including `last`, oldest first. */
export function history(balances: MonthBalance[], last: MonthKey, count: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const b = balanceFor(balances, addMonths(last, -i));
    const income = b.incomePaid + b.incomeOpen;
    const expense = b.expensePaid + b.expenseOpen;
    out.push({ key: b.key, started: b.started, income, expense, saved: income - expense, end: b.end });
  }
  return out;
}

/** Average spent per month in each expense category, over the started months given. */
export function averageByCategory(entries: Entry[], categories: Category[], months: MonthKey[]): { category: Category; average: number }[] {
  if (!months.length) return [];
  const inRange = new Set(months);
  const sums = new Map<string, number>();
  for (const e of entries) if (inRange.has(e.month)) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
  return categories
    .filter(c => c.kind === 'expense' && (sums.get(c.id) ?? 0) > 0)
    .map(c => ({ category: c, average: Math.round((sums.get(c.id) ?? 0) / months.length) }))
    .sort((a, b) => b.average - a.average);
}

/* ----------------------------------------------------------------- storage */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const isHue = (v: unknown): v is Hue => typeof v === 'string' && (HUES as readonly string[]).includes(v);
const isRepeat = (v: unknown): v is Repeat => typeof v === 'string' && (REPEATS as readonly string[]).includes(v);

function normalizeNames(v: unknown, fallback?: unknown): Names {
  if (isObj(v)) {
    const out: Names = {};
    for (const [k, x] of Object.entries(v)) if (typeof x === 'string' && x.trim()) out[k] = cleanText(x, 40);
    if (Object.keys(out).length) return out;
  }
  const s = str(fallback);
  return s?.trim() ? { de: cleanText(s, 40) } : { de: '?' };
}

function normalizeCategory(v: unknown): Category | null {
  if (!isObj(v) || !str(v.id)) return null;
  return {
    id: v.id as string,
    names: normalizeNames(v.names, v.name),
    emoji: str(v.emoji)?.trim() || '📦',
    hue: isHue(v.hue) ? v.hue : 'stone',
    kind: v.kind === 'income' ? 'income' : 'expense',
    repeat: isRepeat(v.repeat) ? v.repeat : 'none',
    ...(v.budget === 'need' || v.budget === 'want' || v.budget === 'save' ? { budget: v.budget } : {}),
    // A budget is whole cents above zero, for spending only.
    ...(v.kind !== 'income' && typeof v.limit === 'number' && Number.isFinite(v.limit) && v.limit >= 1
      ? { limit: Math.min(Math.round(v.limit), MAX_CENTS) } : {}),
    ...(v.standard === false ? { standard: false } : {}),
    ...(v.builtin === true ? { builtin: true } : {}),
    // Edited in Settings: the user's own list (empty is a choice too). Unset: what the app ships.
    ...(Array.isArray(v.keywords) ? { keywords: normalizeKeywords(v.keywords) } : {}),
  };
}

function normalizeEntry(v: unknown, start = 1): Entry | null {
  if (!isObj(v) || !str(v.id) || !isMonthKey(v.month) || !str(v.categoryId)) return null;
  const amount = typeof v.amount === 'number' && Number.isFinite(v.amount) ? Math.min(Math.round(Math.abs(v.amount)), MAX_CENTS) : 0;
  const due = typeof v.dueDay === 'number' && Number.isInteger(v.dueDay) && v.dueDay >= 1 && v.dueDay <= 31 ? v.dueDay : undefined;
  const e: Entry = {
    id: v.id as string,
    month: v.month,
    categoryId: v.categoryId as string,
    name: cleanText(str(v.name) ?? '') || '?',
    amount,
    paid: v.paid === true,
    repeat: isRepeat(v.repeat) ? v.repeat : 'none',
    seriesId: str(v.seriesId) || (v.id as string),
    createdAt: typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : 0,
  };
  if (due !== undefined) e.dueDay = due;
  if (e.repeat === 'yearly' && (INTERVALS as readonly unknown[]).includes(v.every)) e.every = v.every as Interval;
  // A last month only on a recurring entry, and never before the entry itself.
  if (e.repeat !== 'none' && isMonthKey(v.until) && v.until >= e.month) e.until = v.until;
  // A date is always inside its month — the period, when months start on another day (plan 32).
  if (isIsoDay(v.date) && periodOf(v.date, start) === e.month) e.date = v.date;
  const note = cleanText(str(v.note) ?? '', 200);
  if (note) e.note = note;
  if (typeof v.paidAt === 'number' && Number.isFinite(v.paidAt)) e.paidAt = v.paidAt;
  if (typeof v.order === 'number' && Number.isFinite(v.order)) e.order = v.order;
  const ref = str(v.ref);
  if (ref) e.ref = ref.slice(0, 200);
  const goalId = str(v.goalId);
  if (goalId) e.goalId = goalId.slice(0, 80);
  const debtId = str(v.debtId);
  if (debtId) e.debtId = debtId.slice(0, 80);
  const files = normalizeAttachments(v.files);
  if (files.length) e.files = files;
  const tags = normalizeTags(v.tags);
  if (tags.length) e.tags = tags;
  const splitId = str(v.splitId);
  if (splitId) e.splitId = splitId.slice(0, 80);
  const accountId = str(v.accountId);
  if (accountId && accountId !== MAIN_ACCOUNT) e.accountId = accountId.slice(0, 80);
  const t = v.transfer;
  if (isObj(t) && str(t.pairId) && (t.direction === 'out' || t.direction === 'in')) {
    e.transfer = { pairId: (t.pairId as string).slice(0, 80), direction: t.direction };
    e.categoryId = TRANSFER_CATEGORY;
  }
  return e;
}

function normalizeMonth(v: unknown): MonthRecord | null {
  if (!isObj(v) || !isMonthKey(v.key)) return null;
  const m: MonthRecord = { key: v.key, startedAt: typeof v.startedAt === 'number' ? v.startedAt : 0 };
  if (Array.isArray(v.categories)) m.categories = [...new Set(v.categories.filter((x): x is string => typeof x === 'string'))];
  if (typeof v.opening === 'number' && Number.isFinite(v.opening)) m.opening = Math.round(Math.max(-MAX_CENTS, Math.min(MAX_CENTS, v.opening)));
  if (typeof v.reconciledAt === 'number' && Number.isFinite(v.reconciledAt)) m.reconciledAt = v.reconciledAt;
  if (isObj(v.openings)) {
    const openings: Record<string, number> = {};
    for (const [id, cents] of Object.entries(v.openings)) {
      if (id && id.length <= 80 && id !== MAIN_ACCOUNT && typeof cents === 'number' && Number.isFinite(cents)) openings[id] = Math.round(Math.max(-MAX_CENTS, Math.min(MAX_CENTS, cents)));
    }
    if (Object.keys(openings).length) m.openings = openings;
  }
  return m;
}

/** The accounts (schema 20): known kinds and colours, short names, the main account first. Unset when there are none. */
function normalizeAccounts(v: unknown): Account[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const list = dedupe(v.map((a): Account | null => {
    if (!isObj(a) || !str(a.id)) return null;
    const kind: AccountKind = ACCOUNT_KINDS.includes(a.kind as AccountKind) ? (a.kind as AccountKind) : 'bank';
    const emoji = typeof a.emoji === 'string' && a.emoji.trim() && a.emoji.length <= 16 ? a.emoji.trim() : ACCOUNT_LOOK[kind].emoji;
    return {
      id: (a.id as string).slice(0, 80),
      name: cleanText(str(a.name) ?? '', 40),
      kind,
      emoji,
      hue: isHue(a.hue) ? a.hue : ACCOUNT_LOOK[kind].hue,
      createdAt: typeof a.createdAt === 'number' && Number.isFinite(a.createdAt) ? a.createdAt : 0,
    };
  }).filter((a): a is Account => a !== null), a => a.id).slice(0, MAX_ACCOUNTS);
  if (!list.length) return undefined;
  const main = list.find(a => a.id === MAIN_ACCOUNT) ?? mainAccount();
  return [main, ...list.filter(a => a.id !== MAIN_ACCOUNT)];
}

function dedupe<T>(xs: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return xs.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * Anything read from storage or a backup, made safe to use: unknown fields
 * dropped, bad values defaulted, duplicate ids removed, every entry's month
 * started, and entries whose category is gone moved into "Sonstiges" — data
 * is never silently thrown away.
 */
export function normalizeState(raw: unknown): AppData {
  const v = isObj(raw) ? raw : {};
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  const categories = dedupe(arr(v.categories).map(normalizeCategory).filter((c): c is Category => c !== null), c => c.id);
  const monthStart = validMonthStart(v.monthStart);
  const entries = dedupe(arr(v.entries).map(e => normalizeEntry(e, monthStart)).filter((e): e is Entry => e !== null), e => e.id);
  const months = dedupe(arr(v.months).map(normalizeMonth).filter((m): m is MonthRecord => m !== null), m => m.key);

  const known = new Set(categories.map(c => c.id));
  // A transfer is filed under no real category (plan 30); anything else in a gone category moves to "Sonstiges".
  const orphan = (e: Entry) => !e.transfer && !known.has(e.categoryId);
  if (entries.some(orphan)) {
    if (!known.has(OTHER_CATEGORY.id)) categories.push({ ...OTHER_CATEGORY, names: { ...OTHER_CATEGORY.names } });
    for (const e of entries) if (orphan(e)) e.categoryId = OTHER_CATEGORY.id;
  }
  // Accounts (schema 20): an entry or opening on an account that isn't there is the main account's.
  const accounts = normalizeAccounts(v.accounts);
  const accountSet = new Set((accounts ?? []).map(a => a.id));
  for (const e of entries) if (e.accountId && !accountSet.has(e.accountId)) delete e.accountId;
  // Debts (schema 21): an entry's link to a debt that isn't there is dropped.
  const debts = normalizeDebts(v.debts);
  const debtSet = new Set((debts ?? []).map(d => d.id));
  for (const e of entries) if (e.debtId && !debtSet.has(e.debtId)) delete e.debtId;
  for (const m of months) {
    if (!m.openings) continue;
    for (const id of Object.keys(m.openings)) if (!accountSet.has(id)) delete m.openings[id];
    if (!Object.keys(m.openings).length) delete m.openings;
  }
  const started = new Set(months.map(m => m.key));
  for (const e of entries) {
    if (!started.has(e.month)) { months.push({ key: e.month, startedAt: e.createdAt }); started.add(e.month); }
  }
  months.sort((a, b) => (a.key < b.key ? -1 : 1));
  const contracts = normalizeContracts(v.contracts);
  // Currency (schema 11): keep it only when it is a known two-digit code; anything else falls back to EUR (unset).
  const currency = isSupportedCurrency(v.currency) ? v.currency : undefined;
  const favorites = normalizeFavorites(v.favorites, categories);
  const goals = normalizeGoals(v.goals);
  const rules = normalizeRules(v.rules);
  const demo = normalizeDemo(v.demo);
  return {
    categories, entries, months,
    ...(contracts ? { contracts } : {}),
    ...(currency ? { currency } : {}),
    ...(favorites ? { favorites } : {}),
    ...(goals ? { goals } : {}),
    ...(rules ? { rules } : {}),
    ...(demo ? { demo } : {}),
    ...(accounts ? { accounts } : {}),
    ...(debts ? { debts } : {}),
    ...(monthStart !== 1 ? { monthStart } : {}),
  };
}

export const MAX_DEBTS = 50;

/** What a stored file may be called: letters, digits, "-" and "_" — never a path. */
export const FILE_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const MAX_ATTACHMENTS = 5;

/** An entry's receipts (schema 22): a safe id, a short name, a known type, a size. */
export function normalizeAttachments(v: unknown): Attachment[] {
  if (!Array.isArray(v)) return [];
  return dedupe(v.map((f): Attachment | null => {
    if (!isObj(f) || typeof f.id !== 'string' || !FILE_ID.test(f.id)) return null;
    if (f.type !== 'image/jpeg' && f.type !== 'application/pdf') return null;
    return {
      id: f.id,
      name: cleanText(str(f.name) ?? '', 80) || (f.type === 'application/pdf' ? 'PDF' : 'Foto'),
      type: f.type,
      size: typeof f.size === 'number' && Number.isFinite(f.size) && f.size > 0 ? Math.round(f.size) : 0,
    };
  }).filter((f): f is Attachment => f !== null), f => f.id).slice(0, MAX_ATTACHMENTS);
}

/** Every stored file the book still points to — the rest can go. */
export function attachmentIds(data: AppData): Set<string> {
  const ids = new Set<string>();
  for (const e of data.entries) for (const f of e.files ?? []) ids.add(f.id);
  return ids;
}

/** How much room the receipts take, in bytes. */
export function attachmentBytes(data: AppData): number {
  let sum = 0;
  for (const e of data.entries) for (const f of e.files ?? []) sum += f.size;
  return sum;
}

/** The book with only the receipts whose file is there (an import: in the backup or already on the device). */
export function keepAttachments(data: AppData, have: Set<string>): AppData {
  if (!data.entries.some(e => e.files?.some(f => !have.has(f.id)))) return data;
  return {
    ...data,
    entries: data.entries.map(e => {
      if (!e.files) return e;
      const files = e.files.filter(f => have.has(f.id));
      const { files: _drop, ...rest } = e;
      return files.length ? { ...rest, files } : rest;
    }),
  };
}

/**
 * The files a backup carries (plan 27): `files` maps an id to its content
 * (base64). Only safe ids and plain base64 within the size limit come through;
 * a backup from before has none.
 */
export function backupFiles(text: string, maxBytes: number): Record<string, string> {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return {}; }
  if (!isObj(raw) || !isObj(raw.files)) return {};
  const out: Record<string, string> = {};
  for (const [id, content] of Object.entries(raw.files)) {
    if (FILE_ID.test(id) && typeof content === 'string' && content.length <= maxBytes * 1.4 && /^[A-Za-z0-9+/]*={0,2}$/.test(content)) out[id] = content;
  }
  return out;
}

/** Debts (schema 21): a name, a direction, whole cents, a start month, a rate between 0 and 100 %. Unset when there are none. */
function normalizeDebts(v: unknown): Debt[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const list = dedupe(v.map((d): Debt | null => {
    if (!isObj(d) || !str(d.id) || !isMonthKey(d.start)) return null;
    const cents = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(Math.round(x), MAX_CENTS) : undefined);
    const principal = cents(d.principal);
    if (principal === undefined) return null;
    const debt: Debt = {
      id: (d.id as string).slice(0, 80),
      name: cleanText(str(d.name) ?? '', 40) || '?',
      direction: d.direction === 'owed' ? 'owed' : 'owe',
      principal,
      start: d.start,
      createdAt: typeof d.createdAt === 'number' && Number.isFinite(d.createdAt) ? d.createdAt : 0,
    };
    if (typeof d.rate === 'number' && Number.isFinite(d.rate) && d.rate > 0) debt.rate = Math.round(Math.min(d.rate, 100) * 1000) / 1000;
    const payment = cents(d.payment);
    if (payment) debt.payment = payment;
    const seriesId = str(d.seriesId);
    if (seriesId) debt.seriesId = seriesId.slice(0, 80);
    return debt;
  }).filter((d): d is Debt => d !== null), d => d.id).slice(0, MAX_DEBTS);
  return list.length ? list : undefined;
}

/** The test data's record (schema 17): months, an opening, budgets and categories it added. */
function normalizeDemo(v: unknown): DemoInfo | undefined {
  if (!isObj(v)) return undefined;
  const ids = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 80))] : []);
  const limits: Record<string, number> = {};
  if (isObj(v.limits)) {
    for (const [id, cents] of Object.entries(v.limits)) {
      if (id && id.length <= 80 && typeof cents === 'number' && Number.isFinite(cents) && cents >= 1) limits[id] = Math.min(Math.round(cents), MAX_CENTS);
    }
  }
  const demo: DemoInfo = {
    addedAt: typeof v.addedAt === 'number' && Number.isFinite(v.addedAt) ? v.addedAt : 0,
    months: ids(v.months).filter(isMonthKey),
    limits,
    categories: ids(v.categories),
  };
  const o = v.opening;
  if (isObj(o) && isMonthKey(o.month) && typeof o.amount === 'number' && Number.isFinite(o.amount)) {
    demo.opening = { month: o.month, amount: Math.round(Math.max(-MAX_CENTS, Math.min(MAX_CENTS, o.amount))) };
  }
  return demo;
}

/** One series' contract details: a real day, a notice and a renewal of whole months, a short note. Null when nothing is left. */
export function normalizeContract(v: unknown): Contract | null {
  if (!isObj(v)) return null;
  const months = (x: unknown, lo: number, hi: number) => (typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi ? x : undefined);
  const c: Contract = {};
  if (isIsoDay(v.end)) c.end = v.end;
  const notice = months(v.notice, 0, 24);
  if (notice !== undefined) c.notice = notice;
  const renews = months(v.renews, 1, 60);
  if (renews !== undefined) c.renews = renews;
  const note = typeof v.note === 'string' ? cleanText(v.note, 200) : '';
  if (note) c.note = note;
  return Object.keys(c).length ? c : null;
}

function normalizeContracts(v: unknown): Record<string, Contract> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, Contract> = {};
  for (const [id, raw] of Object.entries(v)) {
    const c = id && id.length <= 80 ? normalizeContract(raw) : null;
    if (c) out[id] = c;
  }
  return Object.keys(out).length ? out : undefined;
}

/** How many favourites are kept — two lines of chips, so no "Alle" is needed (plan 09). */
export const MAX_FAVORITES = 8;

/** At most this many tags per entry, each at most this long (plan 26). */
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 30;

/**
 * Clean a list of tags (plan 26): lowercase, no leading "#", trimmed, deduped,
 * each at most MAX_TAG_LENGTH, at most MAX_TAGS. Returns [] when there are none.
 */
export function normalizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const out: string[] = [];
  for (const x of list) {
    if (typeof x !== 'string') continue;
    const tag = x.replace(/^#+/, '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/**
 * Pinned favourites (schema 12), cleaned: a name and a category are required
 * (a favourite for a category that no longer exists falls to `extra` when the
 * entry is made, the same rule entries follow — not dropped here). A bad
 * amount or repeat is left off. Capped to `MAX_FAVORITES`.
 */
function normalizeFavorites(v: unknown, categories: Category[]): Favorite[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const known = new Set(categories.map(c => c.id));
  const out: Favorite[] = [];
  for (const raw of v) {
    if (!isObj(raw)) continue;
    const name = typeof raw.name === 'string' ? cleanText(raw.name) : '';
    const categoryId = typeof raw.categoryId === 'string' && raw.categoryId ? raw.categoryId : '';
    if (!name || !categoryId) continue;
    const id = typeof raw.id === 'string' && raw.id ? raw.id : uid();
    const fav: Favorite = { id, name, categoryId: known.has(categoryId) ? categoryId : OTHER_CATEGORY.id };
    if (typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount > 0 && raw.amount <= MAX_CENTS) fav.amount = Math.round(raw.amount);
    if (raw.repeat === 'monthly' || raw.repeat === 'yearly' || raw.repeat === 'none') fav.repeat = raw.repeat;
    out.push(fav);
    if (out.length >= MAX_FAVORITES) break;
  }
  return out.length ? out : undefined;
}

/** Savings goals (schema 13), cleaned: a name and a positive target are required. */
function normalizeGoals(v: unknown): Goal[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Goal[] = [];
  for (const raw of v) {
    if (!isObj(raw)) continue;
    const name = typeof raw.name === 'string' ? cleanText(raw.name) : '';
    const target = typeof raw.target === 'number' && Number.isFinite(raw.target) && raw.target >= 1 ? Math.min(Math.round(raw.target), MAX_CENTS) : 0;
    if (!name || !target) continue;
    const g: Goal = {
      id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
      name,
      emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji.slice(0, 8) : '🎯',
      hue: (HUES as readonly string[]).includes(raw.hue as string) ? raw.hue as Hue : 'mint',
      target,
      createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    };
    if (isMonthKey(raw.due)) g.due = raw.due;
    // `start` is an offset: a positive amount already saved, or negative after money was taken out.
    if (typeof raw.start === 'number' && Number.isFinite(raw.start) && raw.start !== 0) g.start = Math.max(-MAX_CENTS, Math.min(Math.round(raw.start), MAX_CENTS));
    if (typeof raw.closedAt === 'number' && Number.isFinite(raw.closedAt)) g.closedAt = raw.closedAt;
    out.push(g);
  }
  return out.length ? out : undefined;
}

/** Import rules (schema 15, plan 20): a field + text to match, and what to set (or skip). */
function normalizeRules(v: unknown): Rule[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Rule[] = [];
  for (const raw of v) {
    if (!isObj(raw) || !isObj(raw.match) || !isObj(raw.set)) continue;
    const field = raw.match.field;
    const contains = typeof raw.match.contains === 'string' ? raw.match.contains.trim().slice(0, 80) : '';
    if ((field !== 'name' && field !== 'purpose' && field !== 'payee') || !contains) continue;
    let set: Rule['set'] | null = null;
    if (raw.set.skip === true) set = { skip: true };
    else {
      const categoryId = typeof raw.set.categoryId === 'string' && raw.set.categoryId ? raw.set.categoryId : undefined;
      const name = typeof raw.set.name === 'string' ? cleanText(raw.set.name) : undefined;
      if (categoryId || name) set = { ...(categoryId ? { categoryId } : {}), ...(name ? { name } : {}) };
    }
    if (!set) continue;
    out.push({ id: typeof raw.id === 'string' && raw.id ? raw.id : uid(), match: { field, contains }, set, createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0 });
  }
  return out.length ? out : undefined;
}

const sameNames = (a: Names, b: Names) =>
  Object.keys(a).length > 0 && Object.entries(a).every(([lang, n]) => b[lang] === n);

/**
 * Categories saved by an older schema, brought up to date once — only where
 * the user still has exactly what the app shipped, so nothing they renamed or
 * repainted is touched. An empty list stays empty.
 *   below 2: the banking-app built-ins are added (before "Sonstiges" if it is
 *            there, else at the end; not in any month), and built-ins whose
 *            name or emoji changed get the new one;
 *   below 3: built-ins still named as shipped get the names in every language
 *            the app now speaks (Arabic) — and again below 19 (eleven more).
 */
export function upgradeCategories(categories: Category[], from = 1): Category[] {
  if (!categories.length || from >= SCHEMA_VERSION) return categories;
  const shipped = new Map(defaultCategories().map(c => [c.id, c]));
  const out = categories.map(c => {
    const now = shipped.get(c.id);
    if (!now) return c;
    const next: Category = { ...c, builtin: true };
    if (from < 2) {
      const old = SHIPPED_V1[c.id];
      if (old?.names && sameNames(c.names, old.names)) next.names = { ...now.names };
      if (old?.emoji && c.emoji === old.emoji) next.emoji = now.emoji;
    }
    if (sameNames(next.names, now.names)) next.names = { ...now.names };
    return next;
  });
  if (from >= 2) return out;
  const have = new Set(out.map(c => c.id));
  const added = NEW_IN_V2.filter(id => !have.has(id)).map(id => shipped.get(id)!);
  // Before the old "Sonstiges" (id `other`, merged away in schema 4), as it was then.
  const other = out.findIndex(c => c.id === 'other');
  return other < 0 ? [...out, ...added] : [...out.slice(0, other), ...added, ...out.slice(other)];
}

/**
 * Everything saved by an older schema, brought up to date once: the
 * categories (`upgradeCategories`), then, below 4, the merges — "Wohnen und
 * Garten" into "Wohnen" (id `fixed`), the old "Sonstiges" into the new one
 * (id `extra`) — with their entries and month lists moving along (a moved
 * entry loses its place in the old order), and finally the built-ins renamed
 * in schema 4, where the user still has the old name or picture. Below 5,
 * the restaurants arrive (`NEW_MAIN`; below 8, the children's expenses): after their neighbour, and in the
 * running month and later started ones; earlier months without a list of
 * their own get the standard ones they showed until now, so they stay as
 * they were. Below 6, built-ins whose picture changed (`SHIPPED_V5`) get the
 * new one where the user kept the old.
 */
export function upgradeData(data: AppData, from = 1, today = new Date()): AppData {
  if (from >= SCHEMA_VERSION) return data;
  let categories = upgradeCategories(data.categories, from);
  let { entries, months } = data;
  if (from < 4 && categories.length) {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    for (const [gone, into] of Object.entries(MERGED_V4)) {
      const old = categories.find(c => c.id === gone);
      if (!old) continue;
      categories = categories.some(c => c.id === into)
        ? categories.filter(c => c.id !== gone)
        // Its replacement was deleted: the old one takes over its place and role.
        : categories.map(c => (c.id === gone ? { ...shipped.get(into)!, standard: old.standard } : c));
      entries = entries.map(e => {
        if (e.categoryId !== gone) return e;
        const { order: _order, ...rest } = e;
        return { ...rest, categoryId: into };
      });
      months = months.map(m => (m.categories
        ? { ...m, categories: [...new Set(m.categories.map(id => (id === gone ? into : id)))] }
        : m));
    }
    categories = categories.map(c => {
      const was = SHIPPED_V3[c.id];
      const now = shipped.get(c.id);
      if (!was || !now) return c;
      const next = { ...c };
      if (sameNames(c.names, was.names)) next.names = { ...now.names };
      if (was.emoji?.includes(c.emoji)) next.emoji = now.emoji;
      return next;
    });
  }
  if (categories.length) {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    const current = monthKeyOf(today);
    const after = (ids: string[], id: string, anchor: string) => {
      const at = ids.indexOf(anchor);
      return at < 0 ? [...ids, id] : [...ids.slice(0, at + 1), id, ...ids.slice(at + 1)];
    };
    for (const { id, since, after: anchor, aliases } of NEW_MAIN) {
      if (from >= since || categories.some(c => c.id === id)) continue;
      // One of the user's own under this name already does the job.
      const known = new Set(aliases.map(normalizeName));
      if (categories.some(c => Object.values(c.names).some(n => known.has(normalizeName(n))))) continue;
      const before = standardCategoryIds(categories);
      const at = categories.findIndex(c => c.id === anchor);
      const fresh = shipped.get(id)!;
      categories = at < 0 ? [...categories, fresh] : [...categories.slice(0, at + 1), fresh, ...categories.slice(at + 1)];
      months = months.map(m => {
        if (m.key >= current) return m.categories && !m.categories.includes(id) ? { ...m, categories: after(m.categories, id, anchor) } : m;
        return m.categories ? m : { ...m, categories: before };
      });
    }
  }
  if (from < 7) {
    // The date now says when something is due: entries that only had a due day get it as their date.
    entries = entries.map(e => (e.date || e.dueDay === undefined ? e : { ...e, date: dayInMonth(e.month, e.dueDay) }));
  }
  if (from < 6 && categories.length) {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    categories = categories.map(c => (SHIPPED_V5[c.id]?.emoji.includes(c.emoji) ? { ...c, emoji: shipped.get(c.id)!.emoji } : c));
  }
  return { ...data, categories, entries, months };
}

export function makeBackup(data: AppData, now = new Date()): Backup {
  return { app: 'spartopf', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), ...data };
}

/** Parse a backup file. Returns the data, or an error key for translations. */
export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: 'backupInvalid' | 'backupTooNew' } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'backupInvalid' }; }
  if (!isObj(raw) || raw.app !== 'spartopf' || !Array.isArray(raw.entries)) return { ok: false, error: 'backupInvalid' };
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION) return { ok: false, error: 'backupTooNew' };
  const data = normalizeState(raw);
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  return { ok: true, data: upgradeData(data, version) };
}

/**
 * "Restore defaults": every built-in category as shipped (renamed ones renamed
 * back, deleted ones returned), followed by the user's own categories
 * untouched. Entries are never touched, and neither are budgets: they are the
 * user's plan, not the category's look.
 */
export function restoreDefaultCategories(current: Category[], defaults: Category[]): Category[] {
  const own = current.filter(c => !c.builtin && !defaults.some(d => d.id === c.id));
  const limits = new Map(current.filter(c => c.limit).map(c => [c.id, c.limit!]));
  return [...defaults.map(d => (limits.has(d.id) && d.kind === 'expense' ? { ...d, limit: limits.get(d.id) } : d)), ...own];
}

/* --------------------------------------------------------------------- CSV */

export interface CsvLabels {
  header: string[];
  income: string;
  expense: string;
  paid: string;
  open: string;
  repeat: Record<Repeat, string>;
  /** What the repeat cell says for a yearly entry with another interval (2, 3, 6 months; schema 24). */
  every?: Record<number, string>;
  /** The header for the appended currency column ("Währung"). */
  currency: string;
  /** The header for the appended tags column ("Tags", plan 26). */
  tags: string;
  /** What a transfer's category and kind cells say ("Umbuchung", plan 30). */
  transfer: string;
  /** The header for the appended account column ("Konto"), there only when the book has more than one (plan 30). */
  account: string;
  /** The main account's name until the user renames it ("Girokonto"). */
  mainAccount: string;
}

/**
 * Every entry as CSV for Excel: semicolon-separated with a decimal comma (what
 * a German Excel opens with a double click), expenses negative, oldest month
 * first, in category order within a month.
 */
export function toCsv(data: AppData, lang: string, labels: CsvLabels): string {
  const quote = (s: string) => (/[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const cell = (s: string) => quote(s);
  // A text cell the user or a bank controls (category name, entry name, note):
  // guard against CSV injection — a cell that starts with =, +, -, @, a tab or
  // a carriage return runs as a formula when opened in Excel. A leading
  // apostrophe makes Excel treat the whole cell as text. Amounts and dates are
  // formatted by the app, so they use `cell` and keep their leading sign.
  const textCell = (s: string) => quote(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
  const order = new Map(data.categories.map((c, i) => [c.id, i]));
  const byId = new Map(data.categories.map(c => [c.id, c]));
  const rows = [...data.entries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1
      : (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0) || a.createdAt - b.createdAt);
  // An account column only once there is more than one account (plan 30), so other books' files stay as they were.
  const accounts = hasAccounts(data) ? new Map(accountsOf(data).map(a => [a.id, accountName(a, labels.mainAccount)])) : null;
  const lines = [[...labels.header, labels.currency, labels.tags, ...(accounts ? [labels.account] : [])].map(cell).join(';')];
  for (const e of rows) {
    const c = byId.get(e.categoryId);
    const kind = c?.kind ?? 'expense';
    // A transfer: out of its account negative, into it positive.
    const signed = e.transfer ? (e.transfer.direction === 'in' ? e.amount : -e.amount) : signedAmount(e.amount, kind);
    const value = (signed / 100).toFixed(2).replace('.', ',');
    lines.push([
      cell(e.month), textCell(e.transfer ? labels.transfer : displayName(c?.names, lang)),
      cell(e.transfer ? labels.transfer : kind === 'income' ? labels.income : labels.expense),
      textCell(e.name), cell(value), cell(e.paid ? labels.paid : labels.open), cell((e.repeat === 'yearly' && e.every && labels.every?.[e.every]) || labels.repeat[e.repeat]),
      cell(e.dueDay ? String(e.dueDay) : ''), textCell(e.note ?? ''),
      cell(e.date ? `${e.date.slice(8, 10)}.${e.date.slice(5, 7)}.${e.date.slice(0, 4)}` : ''),
      cell(activeCurrency), // the book's currency, appended so the old column order is kept
      textCell((e.tags ?? []).map(x => `#${x}`).join(' ')), // tags, injection-guarded (plan 26)
      ...(accounts ? [textCell(accounts.get(accountOf(e)) ?? '')] : []),
    ].join(';'));
  }
  // BOM, so Excel reads the umlauts as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/* ------------------------------------------------------------- ratings (15) */

/** Something good that just happened: the only moments the rating prompt may follow (plan 15). */
export type ReviewMoment = 'monthSaved' | 'goalReached' | 'bigImport';

export interface ReviewState {
  /** The first day this install was used (YYYY-MM-DD); '' when not known. */
  firstUse: string;
  /** The user's own entries (test data left out). */
  entries: number;
  /** When the prompt was last asked for (YYYY-MM-DD); '' if never. */
  lastAsked: string;
  /** This session had an error, a failed import or an undo. */
  trouble: boolean;
  moment: ReviewMoment | null;
}

/** The local rule's numbers: no analytics decide when Spartopf asks. */
export const REVIEW_RULE = { daysUsed: 14, entries: 30, daysBetween: 120, bigImport: 10 } as const;

const daysFrom = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Whether to ask iOS for its rating prompt now (plan 15): used for at least
 * 14 days with 30 entries of one's own, right after something good (a month
 * that saved money, a goal reached, an import of 10 or more), in a session
 * without trouble, and not within 120 days of the last ask. iOS itself shows
 * the prompt at most three times a year.
 */
export function shouldAskForReview(s: ReviewState, today = new Date()): boolean {
  if (!s.moment || s.trouble || !isIsoDay(s.firstUse) || s.entries < REVIEW_RULE.entries) return false;
  const day = isoDay(today);
  if (daysFrom(s.firstUse, day) < REVIEW_RULE.daysUsed) return false;
  return !isIsoDay(s.lastAsked) || daysFrom(s.lastAsked, day) >= REVIEW_RULE.daysBetween;
}
