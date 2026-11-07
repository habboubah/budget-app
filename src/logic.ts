import {
  AppData, Backup, Category, CategoryKind, Entry, HUES, Hue, MonthKey, MonthRecord, Names, REPEATS, Repeat,
} from './types';
import { MERGED_V4, NEW_IN_V5, SHIPPED_V5, NAME_SUGGESTIONS, NEW_IN_V2, OTHER_CATEGORY, SHIPPED_V1, SHIPPED_V3, defaultCategories } from './data/defaults';

/** Bump when a stored shape changes, and migrate in `normalizeState`. */
export const SCHEMA_VERSION = 6;

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
const MAX_CENTS = 10_000_000_000;

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

/**
 * What the user typed → integer cents, or null if it isn't an amount.
 * Reads both German and English writing: "1.050,50", "1050,5", "1050.50",
 * "1,050.50", "12", "€ 9,99" — and Arabic-Indic digits ("١٢٫٥٠"). With a
 * single separator, three digits after the locale's grouping mark mean
 * thousands ("1.050" in German is 1050 €); any other single separator is the
 * decimal point, whichever one the keyboard happened to offer.
 */
export function parseAmount(text: string, locale = 'de-DE'): number | null {
  const s = normalizeDigits(text).replace(/[\s €]/g, '').replace(/^\+/, '');
  if (!s || !/^(\d[\d.,]*|[.,]\d+)$/.test(s)) return null;
  const group = locale.startsWith('de') ? '.' : ',';
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

const formatters = new Map<string, Intl.NumberFormat>();
function moneyFormat(locale: string, sign: 'auto' | 'always' | 'exceptZero'): Intl.NumberFormat {
  const key = `${locale}|${sign}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', signDisplay: sign });
    formatters.set(key, f);
  }
  return f;
}

/** Cents → "1.050,00 €" (or "+1.050,00 €" / "−…" with `sign`). */
export function formatMoney(cents: number, locale: string, sign: 'auto' | 'always' | 'exceptZero' = 'auto'): string {
  // A true minus sign: the hyphen Intl uses is too short next to big digits.
  return moneyFormat(locale, sign).format(cents / 100).replace('-', '−');
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

/* ------------------------------------------------------------------ months */

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function monthKeyOf(d = new Date()): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const i = year * 12 + (month - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Whole months from a to b (b − a). */
export function monthsBetween(a: MonthKey, b: MonthKey): number {
  const x = parseMonthKey(a);
  const y = parseMonthKey(b);
  return (y.year - x.year) * 12 + (y.month - x.month);
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 0).getDate();
}

export const isIsoDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

/** Day `day` of a month, kept inside it ("31" in February is the 28th / 29th), as YYYY-MM-DD. */
export function dayInMonth(key: MonthKey, day: number): string {
  return `${key}-${String(Math.max(1, Math.min(day, daysInMonth(key)))).padStart(2, '0')}`;
}

/** A new entry's date: today in the current month, else the same day of the month it goes into. */
export function defaultEntryDate(key: MonthKey, today = new Date()): string {
  return dayInMonth(key, today.getDate());
}

/** "3. Nov." / "3 Nov" — an entry's date on the month page, where the year goes without saying. */
export function dayLabel(date: string, locale: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
}

/** "November 2026" / "Nov. 26" in the app language. */
export function monthLabel(key: MonthKey, locale: string, style: 'long' | 'short' | 'month' = 'long'): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1, 1);
  const opts: Intl.DateTimeFormatOptions =
    style === 'long' ? { month: 'long', year: 'numeric' }
      : style === 'short' ? { month: 'short', year: '2-digit' }
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
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order;
    if (a.order !== undefined && b.order === undefined) return -1;
    if (a.order === undefined && b.order !== undefined) return 1;
    if (a.dueDay !== undefined && b.dueDay !== undefined && a.dueDay !== b.dueDay) return a.dueDay - b.dueDay;
    if (a.dueDay !== undefined && b.dueDay === undefined) return -1;
    if (a.dueDay === undefined && b.dueDay !== undefined) return 1;
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
  const now = monthKeyOf(today);
  if (e.month < now) return true;
  if (e.month > now || e.dueDay === undefined) return false;
  return Math.min(e.dueDay, daysInMonth(e.month)) < today.getDate();
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
    if (e.month !== month) continue;
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
}

/**
 * The two balances of every started month, chained oldest to newest.
 *
 * "now" carries "now" and "end" carries "end": an open bill from October
 * still lowers November's end-of-month balance (it has to be paid sometime),
 * but not the account balance — until it is ticked. A month with a manual
 * opening uses it for "now" and keeps the outstanding difference for "end".
 */
export function computeBalances(data: AppData): MonthBalance[] {
  const months = [...data.months].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const out: MonthBalance[] = [];
  let prev: MonthBalance | undefined;
  for (const m of months) {
    const totals = monthTotals(data.entries, data.categories, m.key);
    const outstanding = prev ? prev.end - prev.now : 0;
    const overridden = m.opening !== undefined;
    const openingNow = overridden ? m.opening! : prev?.now ?? 0;
    const openingEnd = overridden ? m.opening! + outstanding : prev?.end ?? 0;
    const b: MonthBalance = {
      key: m.key,
      started: true,
      prevKey: prev?.key,
      overridden,
      openingNow,
      openingEnd,
      ...totals,
      now: openingNow + totals.incomePaid - totals.expensePaid,
      end: openingEnd + totals.incomePaid + totals.incomeOpen - totals.expensePaid - totals.expenseOpen,
    };
    out.push(b);
    prev = b;
  }
  return out;
}

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

/* -------------------------------------------------------------- carry-over */

/**
 * What starting `key` would carry in: every monthly entry of the last started
 * month before it, every yearly entry of the same month a year earlier —
 * minus anything of the same series already in `key`.
 */
export function carryCandidates(data: AppData, key: MonthKey): Entry[] {
  const present = new Set(data.entries.filter(e => e.month === key).map(e => e.seriesId));
  const prev = previousStarted(data.months, key);
  const yearAgo = addMonths(key, -12);
  const out: Entry[] = [];
  const seen = new Set<string>();
  for (const e of data.entries) {
    const take = (e.month === prev && e.repeat === 'monthly') || (e.month === yearAgo && e.repeat === 'yearly');
    if (!take || present.has(e.seriesId) || seen.has(e.seriesId)) continue;
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
    .filter(k => (entry.repeat === 'monthly' ? k > entry.month : k === addMonths(entry.month, 12)))
    .filter(k => !data.entries.some(e => e.month === k && e.seriesId === entry.seriesId));
  return targets.flatMap((k, i) => carryOver([entry], k, now + i, newId));
}

/** Copies of `sources` for month `key`: open, same amount, same due day, same series. */
export function carryOver(sources: Entry[], key: MonthKey, now: number, newId: () => string = uid): Entry[] {
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
    if (e.dueDay !== undefined) copy.dueDay = e.dueDay;
    // The same day of the new month (rent on the 1st stays on the 1st).
    if (e.date) copy.date = dayInMonth(key, Number(e.date.slice(8, 10)));
    if (e.note) copy.note = e.note;
    if (e.order !== undefined) copy.order = e.order;
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
    const text = `${foldForSearch(e.name)}\n${foldForSearch(e.note ?? '')}\n${category}`;
    return terms.every(t => text.includes(t) || amountMatches(e.amount, t, locale));
  });
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
 * Where the money went, by shop or payee: every expense of the month grouped
 * by name ("Lidl" ×6), largest total first.
 */
export function topNames(entries: Entry[], categories: Category[], month: MonthKey, limit = 6): NameTotal[] {
  const kind = kindLookup(categories);
  const groups = new Map<string, NameTotal>();
  for (const e of entries) {
    if (e.month !== month || kind(e.categoryId) !== 'expense' || e.amount === 0) continue;
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
    ...(v.standard === false ? { standard: false } : {}),
    ...(v.builtin === true ? { builtin: true } : {}),
  };
}

function normalizeEntry(v: unknown): Entry | null {
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
  if (isIsoDay(v.date) && v.date.slice(0, 7) === e.month) e.date = v.date;
  const note = cleanText(str(v.note) ?? '', 200);
  if (note) e.note = note;
  if (typeof v.paidAt === 'number' && Number.isFinite(v.paidAt)) e.paidAt = v.paidAt;
  if (typeof v.order === 'number' && Number.isFinite(v.order)) e.order = v.order;
  return e;
}

function normalizeMonth(v: unknown): MonthRecord | null {
  if (!isObj(v) || !isMonthKey(v.key)) return null;
  const m: MonthRecord = { key: v.key, startedAt: typeof v.startedAt === 'number' ? v.startedAt : 0 };
  if (Array.isArray(v.categories)) m.categories = [...new Set(v.categories.filter((x): x is string => typeof x === 'string'))];
  if (typeof v.opening === 'number' && Number.isFinite(v.opening)) m.opening = Math.round(Math.max(-MAX_CENTS, Math.min(MAX_CENTS, v.opening)));
  return m;
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
  const entries = dedupe(arr(v.entries).map(normalizeEntry).filter((e): e is Entry => e !== null), e => e.id);
  const months = dedupe(arr(v.months).map(normalizeMonth).filter((m): m is MonthRecord => m !== null), m => m.key);

  const known = new Set(categories.map(c => c.id));
  if (entries.some(e => !known.has(e.categoryId))) {
    if (!known.has(OTHER_CATEGORY.id)) categories.push({ ...OTHER_CATEGORY, names: { ...OTHER_CATEGORY.names } });
    for (const e of entries) if (!known.has(e.categoryId)) e.categoryId = OTHER_CATEGORY.id;
  }
  const started = new Set(months.map(m => m.key));
  for (const e of entries) {
    if (!started.has(e.month)) { months.push({ key: e.month, startedAt: e.createdAt }); started.add(e.month); }
  }
  months.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { categories, entries, months };
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
 *            the app now speaks (Arabic).
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
 * the restaurants arrive (`NEW_IN_V5`): after the groceries, and in the
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
  if (from < 5 && categories.length) {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    const current = monthKeyOf(today);
    const after = (ids: string[], id: string, anchor: string) => {
      const at = ids.indexOf(anchor);
      return at < 0 ? [...ids, id] : [...ids.slice(0, at + 1), id, ...ids.slice(at + 1)];
    };
    for (const [id, aliases] of Object.entries(NEW_IN_V5)) {
      if (categories.some(c => c.id === id)) continue;
      // One of the user's own under this name already does the job.
      const known = new Set(aliases.map(normalizeName));
      if (categories.some(c => Object.values(c.names).some(n => known.has(normalizeName(n))))) continue;
      const before = standardCategoryIds(categories);
      const at = categories.findIndex(c => c.id === 'groceries');
      const fresh = shipped.get(id)!;
      categories = at < 0 ? [...categories, fresh] : [...categories.slice(0, at + 1), fresh, ...categories.slice(at + 1)];
      months = months.map(m => {
        if (m.key >= current) return m.categories && !m.categories.includes(id) ? { ...m, categories: after(m.categories, id, 'groceries') } : m;
        return m.categories ? m : { ...m, categories: before };
      });
    }
  }
  if (from < 6 && categories.length) {
    const shipped = new Map(defaultCategories().map(c => [c.id, c]));
    categories = categories.map(c => (SHIPPED_V5[c.id]?.emoji.includes(c.emoji) ? { ...c, emoji: shipped.get(c.id)!.emoji } : c));
  }
  return { categories, entries, months };
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
 * untouched. Entries are never touched.
 */
export function restoreDefaultCategories(current: Category[], defaults: Category[]): Category[] {
  const own = current.filter(c => !c.builtin && !defaults.some(d => d.id === c.id));
  return [...defaults, ...own];
}

/* --------------------------------------------------------------------- CSV */

export interface CsvLabels {
  header: string[];
  income: string;
  expense: string;
  paid: string;
  open: string;
  repeat: Record<Repeat, string>;
}

/**
 * Every entry as CSV for Excel: semicolon-separated with a decimal comma (what
 * a German Excel opens with a double click), expenses negative, oldest month
 * first, in category order within a month.
 */
export function toCsv(data: AppData, lang: string, labels: CsvLabels): string {
  const cell = (s: string) => (/[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const order = new Map(data.categories.map((c, i) => [c.id, i]));
  const byId = new Map(data.categories.map(c => [c.id, c]));
  const rows = [...data.entries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1
      : (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0) || a.createdAt - b.createdAt);
  const lines = [labels.header.map(cell).join(';')];
  for (const e of rows) {
    const c = byId.get(e.categoryId);
    const kind = c?.kind ?? 'expense';
    const value = (signedAmount(e.amount, kind) / 100).toFixed(2).replace('.', ',');
    lines.push([
      e.month, displayName(c?.names, lang), kind === 'income' ? labels.income : labels.expense, e.name, value,
      e.paid ? labels.paid : labels.open, labels.repeat[e.repeat], e.dueDay ? String(e.dueDay) : '', e.note ?? '',
      e.date ? `${e.date.slice(8, 10)}.${e.date.slice(5, 7)}.${e.date.slice(0, 4)}` : '',
    ].map(cell).join(';'));
  }
  // BOM, so Excel reads the umlauts as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
