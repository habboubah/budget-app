import { Accent, AppData, CategoryKind, MonthKey } from '../types';
import { balanceFor, computeBalances, displayName, isoDay, leftPerDay, monthKeyOf, monthSettled, periodRange } from '../logic';
import { dueSoon } from '../due';

/*
 * What widgets, Siri, Shortcuts and the Watch may read of the book (plan 14):
 * a summary, never the whole book. The iPhone app writes it to the App Group
 * (`bridge.ts` → `SpartopfShared.writeSnapshot`) after each save and at
 * midnight. Pure and tested (native.test.ts).
 *
 * No amounts by default: with `showAmounts` off (plan 17's switch, not built
 * yet, and never while *Beträge verbergen* is on) the snapshot has no amount
 * field at all — not zeros, not masks — so nothing outside the app can show
 * one. Counts, names and dates stay.
 */

export const SNAPSHOT_VERSION = 1;
/** How many of the next open bills it carries. */
export const SNAPSHOT_BILLS = 3;

export interface SnapshotPrefs {
  /** The app's language, for the category names. */
  language: string;
  /** Its locale ("de-DE"), for whoever formats a date or an amount. */
  locale: string;
  accent: Accent;
  /** The app lock is on: widgets redact what is readable on the lock screen (plan 17). */
  locked: boolean;
  /** Amounts may leave the app. */
  showAmounts: boolean;
}

export interface SnapshotBill {
  name: string;
  categoryId: string;
  /** YYYY-MM-DD, when it has one. */
  date?: string;
  overdue: boolean;
  /** Cents; only with amounts shown. */
  amount?: number;
}

export interface Snapshot {
  v: typeof SNAPSHOT_VERSION;
  writtenAt: string;
  /** The running month (YYYY-MM). */
  month: MonthKey;
  locale: string;
  currency: string;
  accent: Accent;
  amountsHidden: boolean;
  locked: boolean;
  /** How many of the month's bills are paid — the ring. Counts, never money. */
  paid: { paid: number; total: number };
  /** *Jetzt*, *Am Monatsende* and *pro Tag* (cents); only with amounts shown. */
  balance?: { now: number; end: number; perDay: number | null };
  /** The next open bills, overdue first. */
  bills: SnapshotBill[];
  /** The favourites (plan 09). A widget button sends `favoriteId`; the app looks the amount up. */
  favorites: { id: string; name: string; categoryId: string; hasAmount: boolean; amount?: number }[];
  /** For intents: every category, named in the app's language. */
  categories: { id: string; name: string; emoji: string; kind: CategoryKind }[];
}

export function buildSnapshot(data: AppData, prefs: SnapshotPrefs, today = new Date()): Snapshot {
  const month = monthKeyOf(today);
  const b = balanceFor(computeBalances(data), month);
  const kind = new Map(data.categories.map(c => [c.id, c.kind]));
  const shown = prefs.showAmounts;
  const bills: SnapshotBill[] = dueSoon(data.entries, today)
    .filter(d => kind.get(d.entry.categoryId) === 'expense')
    .slice(0, SNAPSHOT_BILLS)
    .map(d => ({
      name: d.entry.name,
      categoryId: d.entry.categoryId,
      ...(d.day ? { date: d.day } : {}),
      overdue: d.overdue,
      ...(shown ? { amount: d.entry.amount } : {}),
    }));
  const snapshot: Snapshot = {
    v: SNAPSHOT_VERSION,
    writtenAt: today.toISOString(),
    month,
    locale: prefs.locale,
    currency: data.currency ?? 'EUR',
    accent: prefs.accent,
    amountsHidden: !shown,
    locked: prefs.locked,
    paid: { paid: b.expensePaidCount, total: b.expenseCount },
    bills,
    favorites: (data.favorites ?? []).filter(f => kind.has(f.categoryId)).map(f => ({
      id: f.id,
      name: f.name,
      categoryId: f.categoryId,
      hasAmount: f.amount !== undefined,
      ...(shown && f.amount !== undefined ? { amount: f.amount } : {}),
    })),
    categories: data.categories.map(c => ({ id: c.id, name: displayName(c.names, prefs.language), emoji: c.emoji, kind: c.kind })),
  };
  if (shown) snapshot.balance = { now: b.now, end: b.end, perDay: leftPerDay(monthSettled(b).net, month, today) };
  return snapshot;
}

/**
 * What Siri may say aloud (plan 18): the running month's two balances and the
 * next open bills with their amounts — for "Was bleibt am Monatsende?" and
 * "Offene Rechnungen". The snapshot itself never holds amounts, so this goes
 * into a file of its own (`amounts.json`) that iOS keeps readable only while
 * the phone is unlocked (NSFileProtectionComplete). The app writes it only
 * while its lock is off, and removes it otherwise; the intents ask for the
 * phone to be unlocked first, too (`authenticationPolicy`).
 */
export interface SiriAmounts {
  v: 1;
  writtenAt: string;
  month: MonthKey;
  /** The running month's last day (plan 32) — past it the amounts are stale, whatever the calendar says. */
  until: string;
  locale: string;
  currency: string;
  /** *Jetzt auf dem Konto* and *Am Monatsende*, the main account's (cents). */
  now: number;
  end: number;
  /** The next open bills, overdue first, with their amounts. */
  bills: SnapshotBill[];
  /** How many of the month's bills are still open. */
  open: number;
}

export function buildAmounts(data: AppData, prefs: Pick<SnapshotPrefs, 'language' | 'locale' | 'accent'>, today = new Date()): SiriAmounts {
  const s = buildSnapshot(data, { ...prefs, locked: false, showAmounts: true }, today);
  return {
    // `month` is the calendar month here: that is what the intents compare with today.
    v: 1, writtenAt: s.writtenAt, month: isoDay(today).slice(0, 7), until: periodRange(s.month).last, locale: s.locale, currency: s.currency,
    now: s.balance!.now, end: s.balance!.end, bills: s.bills, open: s.paid.total - s.paid.paid,
  };
}

