import { AppData, Entry } from '../types';
import { MAX_CENTS, cleanText, displayName, isIsoDay, isoDay, uid } from '../logic';
import { Found, PlannedRow, applyStatement, parseNotificationText, planStatement } from '../statementImport';

/*
 * What Siri, widgets and Shortcuts automations hand to the app
 * (plan 14): items they write to the App Group's inbox while the app may be
 * closed. The app reads them at launch and on resume and books them through
 * the bank import's own path (`planStatement` → `applyStatement`): the user's
 * name and category for a known payee, the rules (plan 20), an open entry
 * ticked off instead of a second one. Each entry carries `ref: "inbox:<id>"`,
 * so an item read twice (the app stopped before the inbox was emptied) is
 * recognised as already there. Pure and tested (native.test.ts).
 *
 * Everything in an item is checked as if it came from outside: the inbox is
 * ours, but its writers run with the phone locked, from voice and from other
 * apps' notifications.
 */

export const INBOX_SOURCES = ['siri', 'widget', 'wallet', 'notification', 'share'] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export interface InboxItem {
  id: string;
  source: InboxSource;
  /** ms since 1970. */
  createdAt: number;
  /** Cents, positive. */
  amount?: number;
  name?: string;
  categoryId?: string;
  /** YYYY-MM-DD. */
  date?: string;
  /** The card an Apple Pay payment used (plan 19). */
  card?: string;
  /** A notification's text, for plan 19's parser. */
  text?: string;
  /** A favourite tapped on a widget (plan 17): the app takes its name, category and amount. */
  favoriteId?: string;
  /** Unset = paid. */
  paid?: boolean;
}

/** At most this many items are booked per read; the rest wait for the next. */
export const INBOX_MAX = 200;
/** An item's id is its file name: letters, digits, - and _. */
export const INBOX_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** One raw item as read from the inbox, or null when it isn't one. `id` is its file's name. */
export function readInboxItem(id: string, v: unknown): InboxItem | null {
  if (!INBOX_ID.test(id) || !v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!INBOX_SOURCES.includes(o.source as InboxSource)) return null;
  const text = (x: unknown, max: number) => (typeof x === 'string' && cleanText(x, max) ? cleanText(x, max) : undefined);
  const item: InboxItem = {
    id,
    source: o.source as InboxSource,
    createdAt: typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) && o.createdAt > 0 ? o.createdAt : 0,
  };
  if (typeof o.amount === 'number' && Number.isInteger(o.amount) && o.amount > 0 && o.amount <= MAX_CENTS) item.amount = o.amount;
  const name = text(o.name, 80);
  if (name) item.name = name;
  if (typeof o.categoryId === 'string' && INBOX_ID.test(o.categoryId)) item.categoryId = o.categoryId;
  if (isIsoDay(o.date)) item.date = o.date;
  const card = text(o.card, 40);
  if (card) item.card = card;
  // A notification's lines stay lines: title, subtitle, body (plan 19's parser reads them apart).
  const said = typeof o.text === 'string' ? o.text.slice(0, 2000).split(/\r?\n/).map(l => cleanText(l, 300)).filter(Boolean).slice(0, 6).join('\n').slice(0, 500) : '';
  if (said) item.text = said;
  if (typeof o.favoriteId === 'string' && INBOX_ID.test(o.favoriteId)) item.favoriteId = o.favoriteId;
  if (o.paid === false) item.paid = false;
  return item;
}

/** A creation time worth dating an entry by: within the last year, and not ahead of today. */
const plausible = (ms: number, today: Date) => ms > today.getTime() - 366 * 86_400_000 && ms <= today.getTime() + 86_400_000;

/** What the automations of plan 19 leave: these can wait to be looked through first (*Erst prüfen*). */
export const CAPTURE_SOURCES: readonly InboxSource[] = ['wallet', 'notification', 'share'];

export interface InboxResult {
  /** New entries, as `store.importEntries` takes them. */
  add: Entry[];
  /** Open entries an item paid. */
  pay: string[];
  /** The items dealt with — booked, already there, or nothing to book: they leave the inbox. The rest stay. */
  done: string[];
  /** Captured payments left in the inbox to be looked through first (`hold`). */
  held: number;
}

export function inboxToEntries(
  raw: { id: string; item: unknown }[],
  data: AppData,
  { language = 'de', today = new Date(), now = Date.now(), newId = uid, hold = false }: { language?: string; today?: Date; now?: number; newId?: () => string; hold?: boolean } = {},
): InboxResult {
  const { rows, asked, done, held } = planInbox(raw, data, { language, today, only: hold ? 'direct' : 'all' });
  const { add, pay } = applyStatement(rows, now, newId, today);
  const open = new Set(asked.filter(i => i.paid === false).map(i => `inbox:${i.id}`));
  const entries = add.map(e => {
    if (!e.ref || !open.has(e.ref)) return e;
    const { paidAt: _paidAt, ...rest } = e;
    return { ...rest, paid: false };
  });
  done.push(...asked.map(i => i.id));
  return { add: entries, pay, done, held };
}

/**
 * *Erst prüfen* (plan 19): the captured payments waiting in the inbox, as the
 * import review takes them. `ids` leave the inbox once the review is
 * confirmed — the rows taken over and the ones left out alike.
 */
export function inboxReview(
  raw: { id: string; item: unknown }[],
  data: AppData,
  { language = 'de', today = new Date() }: { language?: string; today?: Date } = {},
): { rows: PlannedRow[]; ids: string[] } {
  const { rows, asked, done } = planInbox(raw, data, { language, today, only: 'captured' });
  return { rows, ids: [...done, ...asked.map(i => i.id)] };
}

/** The inbox's items as checked import rows. `only`: what books at once (`direct`), what waits (`captured`), or all. */
function planInbox(
  raw: { id: string; item: unknown }[],
  data: AppData,
  { language, today, only }: { language: string; today: Date; only: 'all' | 'direct' | 'captured' },
): { rows: PlannedRow[]; asked: InboxItem[]; done: string[]; held: number } {
  const done: string[] = [];
  let held = 0;
  const seen = new Set<string>();
  const items: InboxItem[] = [];
  for (const r of raw) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const item = readInboxItem(r.id, r.item);
    if (item) items.push(item);
    else if (INBOX_ID.test(r.id)) done.push(r.id); // broken: nothing to book, so it goes
  }
  items.sort((a, b) => a.createdAt - b.createdAt);

  const byId = new Map(data.categories.map(c => [c.id, c]));
  const favorites = new Map((data.favorites ?? []).map(f => [f.id, f]));
  const found: Found[] = [];
  const asked: InboxItem[] = [];
  for (const item of items.slice(0, INBOX_MAX)) {
    const captured = CAPTURE_SOURCES.includes(item.source);
    if (only !== 'all' && captured !== (only === 'captured')) { if (captured) held++; continue; }
    let { amount, name, categoryId } = item;
    let { date } = item;
    let incoming: boolean | undefined;
    if (item.favoriteId) {
      const f = favorites.get(item.favoriteId);
      if (!f || f.amount === undefined) { done.push(item.id); continue; } // gone, or it needs the sheet
      ({ amount, name, categoryId } = f);
    }
    if (amount === undefined && item.text && item.source === 'wallet') {
      // An Apple Pay payment's amount as Shortcuts hands it over: "12,40 €", "€12.40", "12.4".
      amount = parseNotificationText(/€|EUR/i.test(item.text) ? item.text : `${item.text.replace(/[^\d.,\s’'٠-٩۰-۹٫٬]/g, '')} €`)?.amount;
    } else if (amount === undefined && item.text) {
      // A banking app's push (plan 19): read once; only the entry is kept.
      const said = parseNotificationText(item.text);
      if (said) {
        amount = said.amount;
        name ??= said.name || cleanText(item.text.split('\n')[0], 80);
        date ??= said.date;
        incoming = said.income;
      }
    }
    if (amount === undefined) { done.push(item.id); continue; } // nothing to book
    const category = categoryId ? byId.get(categoryId) : undefined;
    const label = name ?? (category ? displayName(category.names, language) : '');
    found.push({
      name: label,
      raw: item.card ? `${label} ${item.card}` : label,
      amount,
      income: category ? category.kind === 'income' : incoming === true,
      date: date ?? isoDay(plausible(item.createdAt, today) ? new Date(item.createdAt) : today),
      ref: `inbox:${item.id}`,
    });
    asked.push({ ...item, categoryId: category?.id });
  }

  const rows = planStatement(found, data, today).map((row, i) => {
    const item = asked[i];
    // A category the user chose (Siri, a favourite) wins over the guess.
    const r = item.categoryId ? { ...row, categoryId: item.categoryId } : row;
    // Booked as open, an item can't tick off an open entry: the two are the same.
    return item.paid === false && r.status === 'pay' ? { ...r, include: false } : r;
  });
  return { rows, asked, done, held };
}
