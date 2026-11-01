import {
  AppData, Backup, Category, CategoryKind, Entry, HUES, Hue, MonthKey, MonthRecord, Names, REPEATS, Repeat,
} from './types';
import { NAME_SUGGESTIONS, OTHER_CATEGORY } from './data/defaults';

/** Bump when a stored shape changes, and migrate in `normalizeState`. */
export const SCHEMA_VERSION = 1;

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
 * What the user typed → integer cents, or null if it isn't an amount.
 * Reads both German and English writing: "1.050,50", "1050,5", "1050.50",
 * "1,050.50", "12", "€ 9,99". With a single separator, three digits after the
 * locale's grouping mark mean thousands ("1.050" in German is 1050 €); any
 * other single separator is the decimal point, whichever one the keyboard
 * happened to offer.
 */
export function parseAmount(text: string, locale = 'de-DE'): number | null {
  const s = text.replace(/[\s €]/g, '').replace(/^\+/, '');
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

/**
 * The order rows show in within a category: what has a due day first, by that
 * day (rent on the 1st above the phone bill on the 18th), then everything
 * else in the order it was entered — the way the Excel column grows.
 */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.dueDay !== undefined && b.dueDay !== undefined && a.dueDay !== b.dueDay) return a.dueDay - b.dueDay;
    if (a.dueDay !== undefined && b.dueDay === undefined) return -1;
    if (a.dueDay === undefined && b.dueDay !== undefined) return 1;
    return a.createdAt - b.createdAt;
  });
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
  /** Entries still open (both kinds). */
  openCount: number;
  /** Expense entries, and how many of them are paid — the progress bar. */
  expenseCount: number;
  expensePaidCount: number;
}

export function monthTotals(entries: Entry[], categories: Category[], month: MonthKey): Totals {
  const kind = kindLookup(categories);
  const t: Totals = { incomePaid: 0, incomeOpen: 0, expensePaid: 0, expenseOpen: 0, openCount: 0, expenseCount: 0, expensePaidCount: 0 };
  for (const e of entries) {
    if (e.month !== month) continue;
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
  const empty: Totals = { incomePaid: 0, incomeOpen: 0, expensePaid: 0, expenseOpen: 0, openCount: 0, expenseCount: 0, expensePaidCount: 0 };
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
    if (e.note) copy.note = e.note;
    return copy;
  });
}

/* ------------------------------------------------------------- suggestions */

export interface NameSuggestion {
  name: string;
  /** How often it was entered in this category. 0 for a built-in suggestion. */
  count: number;
  /** The most recent entry with this name, if any — for prefilling. */
  last?: Pick<Entry, 'amount' | 'repeat' | 'dueDay'>;
}

/**
 * Names for the entry sheet's chips: what the user entered in this category
 * before (most often first, then most recent), then the built-in ideas for a
 * built-in category. Filtered by what is typed so far.
 */
export function suggestNames({ entries, categoryId, query = '', lang, limit = 12 }: {
  entries: Entry[];
  categoryId: string;
  query?: string;
  lang: string;
  limit?: number;
}): NameSuggestion[] {
  const q = normalizeName(query);
  const groups = new Map<string, { name: string; count: number; latest: Entry }>();
  for (const e of entries) {
    if (e.categoryId !== categoryId) continue;
    const k = normalizeName(e.name);
    if (!k) continue;
    const g = groups.get(k);
    if (!g) groups.set(k, { name: e.name, count: 1, latest: e });
    else {
      g.count++;
      if (e.month > g.latest.month || (e.month === g.latest.month && e.createdAt > g.latest.createdAt)) {
        g.latest = e;
        g.name = e.name;
      }
    }
  }
  const history = [...groups.entries()]
    .sort(([, a], [, b]) => b.count - a.count || (b.latest.month > a.latest.month ? 1 : b.latest.month < a.latest.month ? -1 : b.latest.createdAt - a.latest.createdAt))
    .map(([k, g]) => ({ k, s: { name: g.name, count: g.count, last: { amount: g.latest.amount, repeat: g.latest.repeat, dueDay: g.latest.dueDay } } as NameSuggestion }));
  const builtin = (NAME_SUGGESTIONS[categoryId] ?? [])
    .map(names => displayName(names, lang))
    .map(name => ({ k: normalizeName(name), s: { name, count: 0 } as NameSuggestion }))
    .filter(x => !groups.has(x.k));
  const all = [...history, ...builtin];
  if (!q) return all.slice(0, limit).map(x => x.s);
  const starts = all.filter(x => x.k.startsWith(q) && x.k !== q);
  const contains = all.filter(x => !x.k.startsWith(q) && x.k.includes(q));
  return [...starts, ...contains].slice(0, limit).map(x => x.s);
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
  const note = cleanText(str(v.note) ?? '', 200);
  if (note) e.note = note;
  if (typeof v.paidAt === 'number' && Number.isFinite(v.paidAt)) e.paidAt = v.paidAt;
  return e;
}

function normalizeMonth(v: unknown): MonthRecord | null {
  if (!isObj(v) || !isMonthKey(v.key)) return null;
  const m: MonthRecord = { key: v.key, startedAt: typeof v.startedAt === 'number' ? v.startedAt : 0 };
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

export function makeBackup(data: AppData, now = new Date()): Backup {
  return { app: 'spartopf', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), ...data };
}

/** Parse a backup file. Returns the data, or an error key for translations. */
export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: 'backupInvalid' | 'backupTooNew' } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'backupInvalid' }; }
  if (!isObj(raw) || raw.app !== 'spartopf' || !Array.isArray(raw.entries)) return { ok: false, error: 'backupInvalid' };
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION) return { ok: false, error: 'backupTooNew' };
  return { ok: true, data: normalizeState(raw) };
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
    ].map(cell).join(';'));
  }
  // BOM, so Excel reads the umlauts as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
