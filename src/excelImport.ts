import { AppData, Category, CategoryKind, Entry, HUES, Hue, MonthKey, MonthRecord } from './types';
import { cleanText, displayName, monthsBetween, normalizeName, parseAmount, uid } from './logic';
import { CellValue, Sheet, colIndex, colName, colOf, rowOf } from './xlsx';

/*
 * Import a budget spreadsheet laid out like My_expense.xlsx:
 *
 *   - one tab per month, named "11.2026" (also 11/2026, 2026-11, 11.26);
 *   - row 1 holds the category headers ("Einkommen", "Fixed Kosten", …),
 *     each over three columns: the name, the amount paid, the amount still
 *     open — Excel's columns C/D/E, F/G/H, …;
 *   - the income row "Before" is last month's balance, not income.
 *
 * Everything else (the summary formulas in A/B, other tabs like "Gold") is
 * left alone. Planning is pure — the sheet shows the plan before anything is
 * written — and applying it only replaces the months that are in the file.
 */

export interface ImportMonth {
  key: MonthKey;
  sheet: string;
  /** The tab said another year ("08.2025" between July and September 2026). */
  correctedFrom?: MonthKey;
  entries: Entry[];
  /** Opening balance from the "Before" row, where the carry-over alone wouldn't give it. */
  opening?: number;
  income: number;
  expense: number;
}

export interface ImportPlan {
  months: ImportMonth[];
  /** Categories that don't exist yet and will be created. */
  newCategories: Category[];
  /** Header text → the category it goes into. */
  mapping: { header: string; categoryId: string; created: boolean }[];
  /** Tabs that are not months. */
  skipped: string[];
  entryCount: number;
}

/** "11.2026", "11/2026", "2026-11", "11.26" → "2026-11"; anything else → null. */
export function monthFromSheetName(name: string): MonthKey | null {
  const s = name.trim();
  let m = /^(\d{1,2})\s*[./-]\s*(\d{4})$/.exec(s);
  if (m) return key(Number(m[2]), Number(m[1]));
  m = /^(\d{4})\s*[./-]\s*(\d{1,2})$/.exec(s);
  if (m) return key(Number(m[1]), Number(m[2]));
  m = /^(\d{1,2})\s*[./-]\s*(\d{2})$/.exec(s);
  if (m) return key(2000 + Number(m[2]), Number(m[1]));
  return null;
}
const key = (y: number, m: number): MonthKey | null =>
  m >= 1 && m <= 12 && y >= 1900 && y <= 2200 ? `${y}-${String(m).padStart(2, '0')}` : null;

/**
 * Tabs are kept in month order, so a tab whose year breaks that order is a
 * typo — "08.2025" between "07.2026" and "09.2026" is August 2026. A step
 * between neighbouring tabs is fine when it goes 1–11 months forward. A tab
 * whose every step is wrong gets the one year that makes them all fine —
 * tabs between two others first, then the last and the first, so a typo
 * never drags its correct neighbour along.
 */
export function fixYears(keys: MonthKey[]): MonthKey[] {
  const out = [...keys];
  const good = (a: MonthKey, b: MonthKey) => { const d = monthsBetween(a, b); return d >= 1 && d <= 11; };
  const fix = (i: number) => {
    const k = out[i];
    const prev = out[i - 1];
    const next = out[i + 1];
    const ok = (x: MonthKey) => (!prev || good(prev, x)) && (!next || good(x, next));
    if (ok(k) || (!prev && !next)) return;
    const y = Number(k.slice(0, 4));
    const options = [y - 2, y - 1, y + 1, y + 2].map(n => `${n}-${k.slice(5)}`).filter(ok);
    if (options.length === 1) out[i] = options[0];
  };
  for (let i = 1; i < out.length - 1; i++) fix(i);
  if (out.length > 1) { fix(out.length - 1); fix(0); }
  return out;
}

/** Header aliases for the built-in categories (the Excel's own spellings included). */
const ALIASES: Record<string, string[]> = {
  income: ['einkommen', 'einnahmen', 'income', 'gehalt', 'lohn'],
  fixed: ['fixed kosten', 'fixkosten', 'fixe kosten', 'fixed costs', 'fixed', 'fixkosten monatlich', 'wohnen', 'home', 'miete'],
  car: ['auto', 'car', 'kfz', 'fahrzeug'],
  extra: ['sonder kosten', 'sonderkosten', 'extras', 'extra', 'sonstiges', 'others', 'other'],
  groceries: ['einkaufen', 'groceries', 'lebensmittel', 'einkauf'],
  family: ['family', 'familie', 'kinder'],
};
const INCOME_WORDS = ['einkommen', 'einnahmen', 'income', 'gehalt', 'lohn'];
/** The income row that is really last month's balance. */
const isCarryRow = (name: string) => /^(before|vorher|vormonat|ubertrag|uebertrag|saldo|kontostand|start)$/.test(normalizeName(name).replace(/\s/g, ''));

/**
 * "DEVK Versicherung(14)" → name "DEVK Versicherung", due day 14;
 * "Vodafone(18.06)" → due day 18; "Brille(26.06.2026)" → due day 26 and the
 * date kept as a note. Anything else in brackets stays part of the name.
 */
export function splitDue(raw: string): { name: string; dueDay?: number; note?: string } {
  const s = cleanText(raw);
  const m = /^(.*?)\s*\((\d{1,2})(\.\d{1,2}(?:\.\d{2,4})?)?\)$/.exec(s);
  if (!m || !m[1].trim()) return { name: s };
  const day = Number(m[2]);
  if (day < 1 || day > 31) return { name: s };
  return { name: m[1].trim(), dueDay: day, ...(m[3] && m[3].length > 3 ? { note: `${m[2]}${m[3]}` } : {}) };
}

function cents(v: CellValue | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const neg = /^[-−]/.test(s);
    const c = parseAmount(s.replace(/^[-−]\s*/, ''), 'de-DE');
    return c === null ? null : neg ? -c : c;
  }
  return null;
}

function matchCategory(header: string, categories: Category[]): string | undefined {
  const h = normalizeName(header);
  const flat = (s: string) => s.replace(/\s/g, '');
  const byName = categories.find(c => Object.values(c.names).some(n => normalizeName(n) === h || flat(normalizeName(n)) === flat(h)));
  if (byName) return byName.id;
  for (const [id, words] of Object.entries(ALIASES)) {
    if (words.some(w => w === h || flat(w) === flat(h)) && categories.some(c => c.id === id)) return id;
  }
  return undefined;
}

export function planExcelImport(sheets: Sheet[], categories: Category[], lang: string, now = Date.now(), newId: () => string = uid): ImportPlan {
  const skipped: string[] = [];
  const monthSheets: { sheet: Sheet; key: MonthKey }[] = [];
  for (const s of sheets) {
    const k = monthFromSheetName(s.name);
    if (k) monthSheets.push({ sheet: s, key: k }); else skipped.push(s.name);
  }
  const fixed = fixYears(monthSheets.map(m => m.key));

  const all = [...categories];
  const newCategories: Category[] = [];
  const mapping: ImportPlan['mapping'] = [];
  const headerMap = new Map<string, string>();
  const usedHues = new Set(all.map(c => c.hue));
  const categoryFor = (header: string): string => {
    const k = normalizeName(header);
    const known = headerMap.get(k);
    if (known) return known;
    let id = matchCategory(header, all);
    const created = !id;
    if (!id) {
      const kind: CategoryKind = INCOME_WORDS.some(w => k.includes(w)) ? 'income' : 'expense';
      const hue: Hue = HUES.find(h => !usedHues.has(h)) ?? 'stone';
      usedHues.add(hue);
      const c: Category = { id: newId(), names: { [lang]: cleanText(header, 40) }, emoji: kind === 'income' ? '💶' : '📦', hue, kind, repeat: 'none' };
      all.push(c);
      newCategories.push(c);
      id = c.id;
    }
    headerMap.set(k, id);
    mapping.push({ header: cleanText(header, 40), categoryId: id, created });
    return id;
  };
  const kindOf = (id: string) => all.find(c => c.id === id)?.kind ?? 'expense';

  // Read every month tab, oldest first.
  const order = monthSheets.map((m, i) => ({ ...m, key: fixed[i], original: m.key }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  let created = 0;
  const raw: { key: MonthKey; sheet: string; original: MonthKey; entries: (Omit<Entry, 'id' | 'seriesId' | 'repeat'>)[]; before?: number }[] = [];
  for (const m of order) {
    const cells = m.sheet.cells;
    const headers = [...cells.entries()]
      .filter(([ref, v]) => rowOf(ref) === 1 && typeof v === 'string' && v.trim())
      .map(([ref, v]) => ({ col: colIndex(colOf(ref)), header: String(v).trim() }))
      .sort((a, b) => a.col - b.col);
    const maxRow = Math.max(1, ...[...cells.keys()].map(rowOf));
    const out: (typeof raw)[number] = { key: m.key, sheet: m.sheet.name, original: m.original, entries: [] };
    for (const { col, header } of headers) {
      const categoryId = categoryFor(header);
      const income = kindOf(categoryId) === 'income';
      for (let r = 2; r <= maxRow; r++) {
        const nameCell = cells.get(`${colName(col)}${r}`);
        const paid = cents(cells.get(`${colName(col + 1)}${r}`));
        const open = cents(cells.get(`${colName(col + 2)}${r}`));
        if (paid === null && open === null) continue;
        const rawName = nameCell === undefined || typeof nameCell === 'boolean' ? '' : String(nameCell);
        if (income && rawName && isCarryRow(rawName)) { out.before = (paid ?? 0) + (open ?? 0); continue; }
        const { name, dueDay, note } = splitDue(rawName || header);
        const base = {
          month: m.key, categoryId, name: name || cleanText(header, 40),
          ...(dueDay ? { dueDay } : {}), ...(note ? { note } : {}),
        };
        // A minus in an expense column is money back; it keeps its row, as a positive amount.
        if (paid !== null) out.entries.push({ ...base, amount: Math.abs(paid), paid: true, createdAt: now + created++, paidAt: now });
        if (open !== null && (open !== 0 || paid === null)) out.entries.push({ ...base, amount: Math.abs(open), paid: false, createdAt: now + created++ });
      }
    }
    raw.push(out);
  }

  // One series per category + name across the months. It repeats monthly when
  // it shows up in at least two months and either its category repeats
  // (income, fixed costs) or it cost the same the last two times (insurance).
  const seriesOf = (e: { categoryId: string; name: string }) => `${e.categoryId}|${normalizeName(e.name)}`;
  const series = new Map<string, { id: string; months: Set<MonthKey>; amounts: number[] }>();
  for (const m of raw) for (const e of m.entries) {
    const k = seriesOf(e);
    const s = series.get(k) ?? { id: newId(), months: new Set(), amounts: [] };
    s.months.add(e.month);
    s.amounts.push(e.amount);
    series.set(k, s);
  }
  const monthly = (e: { categoryId: string; name: string }) => {
    const s = series.get(seriesOf(e))!;
    if (s.months.size < 2) return false;
    if (all.find(c => c.id === e.categoryId)?.repeat === 'monthly') return true;
    const [a, b] = s.amounts.slice(-2);
    return a === b && a > 0;
  };

  // Openings: the first month opens with its "Before"; a later one only where
  // the sheet's "Before" differs from what the months before it add up to (a
  // correction made by hand in Excel), so the app shows Excel's numbers.
  const months: ImportMonth[] = [];
  let prevNow: number | undefined;
  for (const m of raw) {
    const entries: Entry[] = m.entries.map(e => ({ ...e, id: newId(), seriesId: series.get(seriesOf(e))!.id, repeat: monthly(e) ? 'monthly' : 'none' }));
    let opening: number | undefined;
    if (m.before !== undefined && (prevNow === undefined || Math.abs(m.before - prevNow) >= 1)) opening = m.before;
    const startNow = opening ?? prevNow ?? 0;
    let income = 0;
    let expense = 0;
    let delta = 0;
    for (const e of entries) {
      const inc = kindOf(e.categoryId) === 'income';
      if (inc) income += e.amount; else expense += e.amount;
      if (e.paid) delta += inc ? e.amount : -e.amount;
    }
    prevNow = startNow + delta;
    months.push({
      key: m.key, sheet: m.sheet, entries, income, expense,
      ...(m.original !== m.key ? { correctedFrom: m.original } : {}),
      ...(opening !== undefined ? { opening } : {}),
    });
  }

  // Two tabs for the same month: merged into one.
  const merged: ImportMonth[] = [];
  for (const m of months) {
    const same = merged.find(x => x.key === m.key);
    if (!same) { merged.push(m); continue; }
    same.entries.push(...m.entries);
    same.income += m.income;
    same.expense += m.expense;
    same.sheet += `, ${m.sheet}`;
  }

  return {
    months: merged,
    newCategories,
    mapping,
    skipped,
    entryCount: merged.reduce((n, m) => n + m.entries.length, 0),
  };
}

/** Months in the plan that already have entries in the app — they get replaced. */
export function replacedMonths(data: AppData, plan: ImportPlan): MonthKey[] {
  const keys = new Set(plan.months.map(m => m.key));
  return [...new Set(data.entries.filter(e => keys.has(e.month)).map(e => e.month))].sort();
}

/**
 * The data after the import: new categories added, every month in the file
 * replaced by its imported version, every other month untouched.
 */
export function applyExcelImport(data: AppData, plan: ImportPlan, now = Date.now()): AppData {
  const keys = new Set(plan.months.map(m => m.key));
  const months: MonthRecord[] = [
    ...data.months.filter(m => !keys.has(m.key)),
    ...plan.months.map(m => (m.opening !== undefined ? { key: m.key, opening: m.opening, startedAt: now } : { key: m.key, startedAt: now })),
  ].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return {
    categories: [...data.categories, ...plan.newCategories],
    entries: [...data.entries.filter(e => !keys.has(e.month)), ...plan.months.flatMap(m => m.entries)],
    months,
  };
}

/** The category name a header ended up in, for the preview. */
export function mappedName(plan: ImportPlan, categories: Category[], id: string, lang: string): string {
  const c = [...categories, ...plan.newCategories].find(x => x.id === id);
  return c ? displayName(c.names, lang) : id;
}

/** Latest month of the plan, to open after importing. */
export const lastMonth = (plan: ImportPlan): MonthKey | undefined => plan.months[plan.months.length - 1]?.key;

/** For the preview's range line: first and last month. */
export const monthRange = (plan: ImportPlan): [MonthKey, MonthKey] | null =>
  plan.months.length ? [plan.months[0].key, plan.months[plan.months.length - 1].key] : null;

