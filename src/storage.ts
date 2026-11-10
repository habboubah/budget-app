import { App as CapacitorApp } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { AppData } from './types';
import { SCHEMA_VERSION, monthKeyOf, normalizeState, standardCategoryIds, upgradeData } from './logic';
import { defaultCategories } from './data/defaults';
import { isNative } from './platform';

/*
 * The only module that reads or writes the user's data (plan 02).
 *
 * In the iPhone app the book is one file in the app's own sandbox —
 * Library/spartopf/data.json — because iOS may clear a web view's
 * localStorage when the phone runs low on space. The file is written
 * atomically (a temp file, the old one kept as data.prev.json), carries a
 * SHA-256 of its data, and on load the newest copy that checks out wins;
 * localStorage stays a mirror for two releases as a way back. On the web and
 * the PWA, localStorage is the store (with `navigator.storage.persist()`).
 * With *Im iPhone-Backup sichern* off (plan 06) the same files live in
 * Library/NoCloud instead, out of iCloud and computer backups, and the mirror
 * isn't written (the web view's storage is part of the phone's backup).
 * View preferences — language, theme, folded cards — stay in localStorage in
 * store.ts: losing them costs nothing.
 */

/** Every key this app writes starts with this, so a rescue export can find them. */
export const KEY_PREFIX = 'spartopf-';
/**
 * The data's localStorage keys: the web's store, and the iPhone app's mirror.
 * Everything in `AppData` has one — until schema 17 the currency, favourites,
 * goals and rules had none, so the web lost them on a reload.
 */
export const DATA_KEYS = {
  categories: 'spartopf-categories',
  entries: 'spartopf-entries',
  months: 'spartopf-months',
  contracts: 'spartopf-contracts',
  currency: 'spartopf-currency',
  favorites: 'spartopf-favorites',
  goals: 'spartopf-goals',
  rules: 'spartopf-rules',
  demo: 'spartopf-demo',
  accounts: 'spartopf-accounts',
  debts: 'spartopf-debts',
  meta: 'spartopf-meta',
} as const;

/** What storage needs from a file system — Capacitor's in the app, a Map in the tests. */
export interface FsLike {
  /** The file's text, or null when it isn't there (or can't be read). */
  read(path: string): Promise<string | null>;
  /** Creates the folder if needed; replaces the file. */
  write(path: string, text: string): Promise<void>;
  /** Never onto an existing file: storage moves the target away first. */
  rename(from: string, to: string): Promise<void>;
  /** Nothing happens when the file isn't there. */
  remove(path: string): Promise<void>;
  /** The names in a folder (not paths); empty when the folder isn't there. */
  list(dir: string): Promise<string[]>;
}

export const FILE = 'spartopf/data.json';
export const TMP = 'spartopf/data.json.tmp';
export const PREV = 'spartopf/data.prev.json';
/** Automatic snapshots (plan 03) live beside the data file, out of the Files app. */
export const BACKUP_DIR = 'spartopf/backups';
/** The name of the snapshot taken of the current book just before a restore, so undo survives a restart. */
export const PRE_RESTORE = 'pre-restore.json';

/** The file: the data, when and by which schema it was written, and its checksum. */
interface Envelope {
  app: 'spartopf';
  schemaVersion: number;
  savedAt: string;
  /** SHA-256 (hex) of `JSON.stringify(data)`. */
  sha256: string;
  data: AppData;
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** The file's data if it is whole and its checksum matches; null otherwise. */
export async function readEnvelope(text: string | null): Promise<Envelope | null> {
  if (!text) return null;
  let env: unknown;
  try { env = JSON.parse(text); } catch { return null; }
  if (!env || typeof env !== 'object') return null;
  const e = env as Partial<Envelope>;
  if (e.app !== 'spartopf' || typeof e.sha256 !== 'string' || typeof e.schemaVersion !== 'number' || !e.data || typeof e.data !== 'object') return null;
  // Re-serialising parsed JSON gives back the string it was parsed from (key order kept).
  if ((await sha256(JSON.stringify(e.data))) !== e.sha256) return null;
  return e as Envelope;
}

async function makeEnvelope(data: AppData, now = new Date()): Promise<string> {
  const body = JSON.stringify(data);
  return `{"app":"spartopf","schemaVersion":${SCHEMA_VERSION},"savedAt":${JSON.stringify(now.toISOString())},"sha256":"${await sha256(body)}","data":${body}}`;
}

/* ---------------------------------------------------------- localStorage */

function readLocal(key: string): unknown {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The data as localStorage holds it (the web's store, the app's mirror, and
 * what every version before plan 02 wrote), read through `read` — which
 * compat.test.ts points at the payloads older versions stored. The very first
 * launch gets the default categories and the current month already started,
 * so the first screen is a page to write on — not a question.
 */
export function loadStored(read: (key: string) => unknown): AppData {
  const meta = read(DATA_KEYS.meta) as { seeded?: boolean; schemaVersion?: number } | undefined;
  const rawCategories = read(DATA_KEYS.categories);
  // Not seeded yet: the defaults go in *before* normalising, or entries from
  // a half-written first launch would all be filed under "Sonstiges".
  const missing = !meta?.seeded && (!Array.isArray(rawCategories) || rawCategories.length === 0);
  const loaded = normalizeState({
    categories: missing ? defaultCategories() : rawCategories,
    entries: read(DATA_KEYS.entries),
    months: read(DATA_KEYS.months),
    contracts: read(DATA_KEYS.contracts),
    currency: read(DATA_KEYS.currency),
    favorites: read(DATA_KEYS.favorites),
    goals: read(DATA_KEYS.goals),
    rules: read(DATA_KEYS.rules),
    demo: read(DATA_KEYS.demo),
    accounts: read(DATA_KEYS.accounts),
    debts: read(DATA_KEYS.debts),
  });
  // Saved by an older version: new and renamed built-in categories, merges.
  const data = missing ? loaded : upgradeData(loaded, meta?.schemaVersion ?? 1);
  if (meta?.seeded || data.months.length) return data;
  return { ...data, months: [{ key: monthKeyOf(), startedAt: Date.now(), categories: standardCategoryIds(data.categories) }] };
}

/** Whether localStorage holds a book (written by any version), not just nothing. */
function hasLocalBook(read: (key: string) => unknown): boolean {
  const meta = read(DATA_KEYS.meta) as { seeded?: boolean } | undefined;
  const entries = read(DATA_KEYS.entries);
  return !!meta?.seeded || (Array.isArray(entries) && entries.length > 0);
}

/** Writes the data the way localStorage keeps it. Throws when it can't (quota, private mode). */
export function writeLocal(data: AppData, write: (key: string, value: string) => void = (k, v) => localStorage.setItem(k, v)) {
  write(DATA_KEYS.categories, JSON.stringify(data.categories));
  write(DATA_KEYS.entries, JSON.stringify(data.entries));
  write(DATA_KEYS.months, JSON.stringify(data.months));
  write(DATA_KEYS.contracts, JSON.stringify(data.contracts ?? {}));
  // Unset is written as null (JSON), which reads back as unset.
  write(DATA_KEYS.currency, JSON.stringify(data.currency ?? null));
  write(DATA_KEYS.favorites, JSON.stringify(data.favorites ?? []));
  write(DATA_KEYS.goals, JSON.stringify(data.goals ?? []));
  write(DATA_KEYS.rules, JSON.stringify(data.rules ?? []));
  write(DATA_KEYS.demo, JSON.stringify(data.demo ?? null));
  write(DATA_KEYS.accounts, JSON.stringify(data.accounts ?? []));
  write(DATA_KEYS.debts, JSON.stringify(data.debts ?? []));
  write(DATA_KEYS.meta, JSON.stringify({ schemaVersion: SCHEMA_VERSION, seeded: true }));
}

/* ----------------------------------------------------------------- the file */

/** Capacitor's file system, in one of the app's folders. */
function capacitorFsIn(directory: Directory): FsLike {
  return {
    read: async path => {
      try {
        const { data } = await Filesystem.readFile({ path, directory, encoding: Encoding.UTF8 });
        return typeof data === 'string' ? data : await data.text();
      } catch {
        return null;
      }
    },
    write: async (path, text) => {
      await Filesystem.writeFile({ path, data: text, directory, encoding: Encoding.UTF8, recursive: true });
    },
    rename: async (from, to) => {
      await Filesystem.rename({ from, to, directory, toDirectory: directory });
    },
    remove: async path => {
      try { await Filesystem.deleteFile({ path, directory }); } catch { /* not there */ }
    },
    list: async dir => {
      try {
        const { files } = await Filesystem.readdir({ path: dir, directory });
        return files.map(f => (typeof f === 'string' ? f : f.name));
      } catch {
        return []; // the folder isn't there yet
      }
    },
  };
}

/** The app's Library folder (not Documents: the Files app can't see it) — part of the phone's own backup. */
export const capacitorFs: FsLike = capacitorFsIn(Directory.Library);
/**
 * Library/NoCloud (plan 06): the file system plugin marks it as excluded from
 * backup each time it's used, so neither iCloud nor a computer backup holds
 * what is in it. The book lives here while *Im iPhone-Backup sichern* is off.
 */
export const capacitorFsNoBackup: FsLike = capacitorFsIn(Directory.LibraryNoCloud);

export type HydrateSource = 'file' | 'tmp' | 'prev' | 'mirror' | 'migrated' | 'local';

export interface Hydrated {
  data: AppData;
  /** Where it came from: one of the files, the mirror after they failed, the first move from localStorage, or the web's localStorage. */
  source: HydrateSource;
  /** Whether the book is in the phone's backup (plan 06): its folder in the app; always true on the web. */
  inBackup: boolean;
}

/** The files are there but none checks out, and there is no mirror: the crash screen offers to rescue what is left. */
export class StorageCorruptError extends Error {
  constructor() { super('The household book could not be read.'); }
}

/** One folder's newest copy of the book whose checksum matches — data.json, a finished temp file, data.prev.json — and whether it has any of them. */
async function newestIn(fs: FsLike): Promise<{ env: Envelope | null; source: HydrateSource; anyFile: boolean }> {
  const texts = await Promise.all([fs.read(FILE), fs.read(TMP), fs.read(PREV)]);
  const envs = await Promise.all(texts.map(readEnvelope));
  const sources: HydrateSource[] = ['file', 'tmp', 'prev'];
  let best = -1;
  envs.forEach((env, i) => {
    if (env && (best < 0 || env.savedAt > envs[best]!.savedAt)) best = i;
  });
  return { env: best >= 0 ? envs[best]! : null, source: sources[Math.max(best, 0)], anyFile: texts.some(t => t !== null) };
}

/**
 * Reads the book before the first render. In the app: the newest of
 * data.json, a finished data.json.tmp (a write cut short after it) and
 * data.prev.json whose checksum matches; else the localStorage mirror; a
 * first launch with this version moves localStorage over. On the web:
 * localStorage, and asks the browser to keep it.
 *
 * The app keeps the book in one of two folders (plan 06): the backed-up one
 * (`fs`) or the one left out of backups (`noBackup`). It is in the folder
 * with the newest copy — a tie, which only a move cut short leaves, counts
 * as the backed-up one — and `onLocation` hears which before anything can
 * fail, so the crash screen's restore looks in the right place. What a move
 * cut short left in the other folder is tidied away (`tidyAfterMove`).
 */
export async function hydrate(
  fs: FsLike | null = isNative() ? capacitorFs : null,
  read: (key: string) => unknown = readLocal,
  noBackup: FsLike | null = isNative() ? capacitorFsNoBackup : null,
  onLocation: (inBackup: boolean) => void = adoptLocation,
): Promise<Hydrated> {
  if (!fs) {
    void (navigator.storage?.persist?.() ?? Promise.resolve(false)).catch(() => false);
    return { data: loadStored(read), source: 'local', inBackup: true };
  }
  const here = await newestIn(fs);
  const there = noBackup ? await newestIn(noBackup) : null;
  const inBackup = there?.env
    ? !!here.env && here.env.savedAt >= there.env.savedAt
    : here.env !== null || here.anyFile || !there?.anyFile;
  onLocation(inBackup);
  const found = inBackup ? here : there!;
  if (found.env) {
    const env = found.env;
    const stale = inBackup ? noBackup : fs;
    const staleFiles = (inBackup ? there?.anyFile : here.anyFile) ?? false;
    if (stale) { try { await tidyAfterMove(stale, inBackup ? fs : noBackup!, staleFiles); } catch { /* tidied on a later launch */ } }
    return { data: upgradeData(normalizeState(env.data), env.schemaVersion), source: found.source, inBackup };
  }
  const anyFile = here.anyFile || !!there?.anyFile;
  if (hasLocalBook(read)) return { data: loadStored(read), source: anyFile ? 'mirror' : 'migrated', inBackup };
  if (anyFile) throw new StorageCorruptError();
  // A first launch: the book starts here (the first save writes the file).
  return { data: loadStored(read), source: 'migrated', inBackup };
}

/* ------------------------------------------------ the backup switch (06) */

/**
 * Moves the book to the other folder (plan 06's backup switch), file by file:
 * the snapshots, data.prev.json, a temp file if there is one, and data.json
 * last, each copied and read back. Only once every file is there does
 * data.json leave the old folder — the moment the move counts. A failure
 * before that removes the copies again and throws: the book stays where it
 * was. What is left in the old folder afterwards goes; if the app is stopped
 * half-way, `hydrate` finds the book by its newest copy and tidies up.
 */
export async function moveBook(from: FsLike, to: FsLike): Promise<void> {
  const snapshots = (await from.list(BACKUP_DIR)).map(n => `${BACKUP_DIR}/${n}`);
  // data.json last: until it's there, the old folder holds the newest copy.
  const paths = [...snapshots, PREV, TMP, FILE];
  const copied: string[] = [];
  const undo = async () => { for (const path of copied) await to.remove(path); };
  try {
    for (const path of paths) {
      const text = await from.read(path);
      if (text === null) continue;
      copied.push(path); // before the write: a torn copy goes too
      await to.write(path, text);
      if ((await to.read(path)) !== text) throw new Error(`The copy of ${path} doesn't read back.`);
    }
  } catch (error) {
    await undo();
    throw error;
  }
  await from.remove(FILE);
  // Still there: the move doesn't count. (Should this read itself fail, both
  // folders keep their copies and the next launch goes by the newest.)
  if ((await from.read(FILE)) !== null) {
    await undo();
    throw new Error('The book could not leave its old folder.');
  }
  for (const path of paths) if (path !== FILE) await from.remove(path);
}

/**
 * After a move cut short, the folder the book isn't in (`stale`) may still
 * hold copies. Snapshots the book's folder doesn't have move over (read back
 * first); everything else goes — its data.json is a copy, or older. `files`:
 * whether `stale` has a data file at all (hydrate knows; it saves the calls).
 */
export async function tidyAfterMove(stale: FsLike, book: FsLike, files = true): Promise<void> {
  const names = await stale.list(BACKUP_DIR);
  const have = new Set(names.length ? await book.list(BACKUP_DIR) : []);
  for (const name of names) {
    const path = `${BACKUP_DIR}/${name}`;
    if (!have.has(name)) {
      const text = await stale.read(path);
      if (text !== null) {
        await book.write(path, text);
        if ((await book.read(path)) !== text) continue; // keep the original
      }
    }
    await stale.remove(path);
  }
  if (files) for (const path of [TMP, PREV, FILE]) await stale.remove(path);
}

/* -------------------------------------------------------------- saving */

export interface Saver {
  /** The latest data; written 300 ms after the last change. */
  save(data: AppData): void;
  /** Writes what is waiting now, and resolves when it's on disk. */
  flush(): Promise<void>;
  /** Called after every write: true when it went through. Returns the unsubscribe. */
  onStatus(listener: (ok: boolean) => void): () => void;
  /**
   * "Alle Daten löschen": drops what is waiting and deletes the files and the
   * mirror — data.prev.json mustn't keep the old book. The next save writes
   * the new one.
   */
  forget(): Promise<void>;
  /**
   * Take today's automatic snapshot of the last-saved book if it isn't there
   * yet (called on resume, so a day the user only reads still gets one).
   */
  snapshot(): Promise<void>;
  /**
   * Writes again what the last write couldn't (on resume): with iOS file
   * protection (plan 06) a write after the phone locked fails, and the book
   * is kept in memory until the app is back.
   */
  retry(): Promise<void>;
  /** The folder the book is written to (null on the web). */
  location(): FsLike | null;
  /** Writes to `fs` from now on, without moving anything — where `hydrate` found the book. `mirror`: keep the localStorage mirror. */
  adopt(fs: FsLike, opts: { mirror: boolean }): void;
  /**
   * The backup switch (plan 06): writes what is waiting, moves the book to
   * `fs` (`moveBook`) and writes there from then on. Rejects when the move
   * fails, and nothing has changed. Without `mirror`, the localStorage
   * mirror is cleared and no longer written.
   */
  relocate(fs: FsLike, opts: { mirror: boolean }): Promise<void>;
}

export const SAVE_DEBOUNCE_MS = 300;

/**
 * One writer for the book. Writes are serialised (one after the other, never
 * two renames at once) and merged: of quick changes only the last is written.
 * In the app every write goes to the file — atomically: data.json.tmp,
 * data.json moved to data.prev.json, the temp file moved to data.json — and to
 * the localStorage mirror; on the web to localStorage only.
 */
export function createSaver(
  initialFs: FsLike | null,
  writeMirror: (data: AppData) => void = data => writeLocal(data),
  {
    debounce = SAVE_DEBOUNCE_MS,
    now = () => new Date(),
    clearMirror = () => { for (const key of Object.values(DATA_KEYS)) localStorage.removeItem(key); },
    snapshots = false,
    folders = [],
  }: {
    debounce?: number; now?: () => Date; clearMirror?: () => void; snapshots?: boolean;
    /** Every folder the book may be in (plan 06): "Alle Daten löschen" empties them all. */
    folders?: FsLike[];
  } = {},
): Saver {
  let fs = initialFs;
  /** Whether the localStorage mirror is written: not while the book is kept out of backups (plan 06). */
  let mirror = true;
  /** What the last write couldn't put on disk, for `retry()`. */
  let unsaved: AppData | null = null;
  let pending: AppData | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  /** The last book written to disk, so a resume can snapshot it without a change. */
  let lastWritten: AppData | null = null;
  const listeners = new Set<(ok: boolean) => void>();
  const report = (ok: boolean) => listeners.forEach(l => l(ok));

  const writeOnce = async (data: AppData) => {
    let ok = true;
    if (fs) {
      try {
        await fs.write(TMP, await makeEnvelope(data, now()));
        await fs.remove(PREV);
        if ((await fs.read(FILE)) !== null) await fs.rename(FILE, PREV);
        await fs.rename(TMP, FILE);
      } catch {
        ok = false;
      }
      // The mirror is the way back, not the store: its failure (quota) doesn't count.
      if (mirror) { try { writeMirror(data); } catch { /* the file has it */ } }
      // The first save of a day leaves an automatic snapshot (plan 03); a
      // failure here never fails the save — the book itself is written.
      if (ok) { lastWritten = data; if (snapshots) { try { await takeSnapshot(data, fs, now()); } catch { /* snapshots are best-effort */ } } }
    } else {
      try { writeMirror(data); } catch { ok = false; }
    }
    unsaved = ok ? null : data;
    report(ok);
  };

  const run = () => {
    timer = null;
    const data = pending;
    pending = null;
    if (!data) return chain;
    chain = chain.then(() => writeOnce(data));
    return chain;
  };

  return {
    save(data) {
      pending = data;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void run(); }, debounce);
    },
    flush() {
      if (timer) clearTimeout(timer);
      return run();
    },
    onStatus(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    forget() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      lastWritten = null;
      unsaved = null;
      chain = chain.then(async () => {
        for (const folder of new Set([...(fs ? [fs] : []), ...folders])) {
          await folder.remove(TMP);
          await folder.remove(PREV);
          await folder.remove(FILE);
          try { await removeSnapshots(folder); } catch { /* best-effort */ }
        }
        try { clearMirror(); } catch { /* nothing to clear */ }
      });
      return chain;
    },
    snapshot() {
      if (!snapshots || !fs || !lastWritten) return Promise.resolve();
      const data = lastWritten;
      const folder = fs;
      chain = chain.then(async () => { try { await takeSnapshot(data, folder, now()); } catch { /* best-effort */ } });
      return chain;
    },
    retry() {
      // A newer change waiting is written anyway, and carries the failed one.
      if (!unsaved || pending || timer) return chain;
      pending = unsaved;
      return run();
    },
    location: () => fs,
    adopt(folder, opts) {
      fs = folder;
      mirror = opts.mirror;
    },
    relocate(folder, opts) {
      if (timer) clearTimeout(timer);
      void run(); // what is waiting goes to the old folder first
      const move = chain.then(async () => {
        if (fs && fs !== folder) await moveBook(fs, folder);
        fs = folder;
        mirror = opts.mirror;
        if (mirror) { if (lastWritten) { try { writeMirror(lastWritten); } catch { /* the file has it */ } } }
        else { try { clearMirror(); } catch { /* nothing to clear */ } }
      });
      chain = move.catch(() => undefined); // later writes go on, to the folder the book is in
      return move;
    },
  };
}

/* ------------------------------------------------- automatic snapshots (03) */

/** A snapshot in the list: its date (YYYY-MM-DD), the file name, whether it reads back whole, and a short note. */
export interface Snapshot {
  /** The day it was written, from the file name (YYYY-MM-DD), or '' for the pre-restore one. */
  date: string;
  /** The file name inside BACKUP_DIR. */
  name: string;
  /** False when the file doesn't read back (a torn write): the list shows it as "beschädigt" but still works. */
  ok: boolean;
  /** How many entries it holds (0 when unreadable). */
  entries: number;
  /** The span of months it covers, e.g. "2026-03…2026-10" (empty when unreadable or empty). */
  span: string;
  /** The snapshot taken of the current book right before a restore — offered as the undo. */
  preRestore: boolean;
}

const DAILY = /^\d{4}-\d{2}-\d{2}\.json$/;
const dateOf = (name: string) => (DAILY.test(name) ? name.slice(0, 10) : '');

/**
 * Which snapshot dates to keep: the last 14 days in full, then the newest of
 * each of the last 12 calendar months. A pure function so it can be tested
 * across month ends and leap years. `dates` and `today` are YYYY-MM-DD.
 */
export function snapshotsToKeep(dates: string[], today: string): string[] {
  const unique = [...new Set(dates)].sort(); // oldest first
  const keep = new Set<string>();
  const dayMs = 86_400_000;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  // The last 14 days, today included.
  for (const d of unique) {
    const age = Math.round((todayMs - Date.parse(`${d}T00:00:00Z`)) / dayMs);
    if (age >= 0 && age < 14) keep.add(d);
  }
  // The newest snapshot of each of the last 12 months (this month and the 11 before it).
  const monthsBack = (d: string) => {
    const a = parseInt(today.slice(0, 4), 10) * 12 + parseInt(today.slice(5, 7), 10);
    const b = parseInt(d.slice(0, 4), 10) * 12 + parseInt(d.slice(5, 7), 10);
    return a - b;
  };
  const newestOfMonth = new Map<string, string>();
  for (const d of unique) {
    const back = monthsBack(d);
    if (back < 0 || back > 11) continue;
    newestOfMonth.set(d.slice(0, 7), d); // unique is sorted, so the last wins
  }
  for (const d of newestOfMonth.values()) keep.add(d);
  return [...keep].sort();
}

/** The month span of a book, e.g. "2026-03…2026-10"; '' when it has no months. */
function monthSpan(data: AppData): string {
  const keys = [...new Set(data.months.map(m => m.key))].sort();
  if (!keys.length) return '';
  return keys.length === 1 ? keys[0] : `${keys[0]}…${keys[keys.length - 1]}`;
}

/**
 * Reads the snapshots in BACKUP_DIR for the list screen. Each is checked
 * (readEnvelope): a torn one shows as not ok but doesn't break the list. The
 * newest first, with the "vor Wiederherstellung" one (if any) at the very top.
 */
export async function listSnapshots(fs: FsLike | null = appFs()): Promise<Snapshot[]> {
  if (!fs) return [];
  const names = await fs.list(BACKUP_DIR);
  const snaps = await Promise.all(names.filter(n => n.endsWith('.json')).map(async (name): Promise<Snapshot> => {
    const env = await readEnvelope(await fs.read(`${BACKUP_DIR}/${name}`));
    const preRestore = name === PRE_RESTORE;
    return {
      name,
      date: dateOf(name),
      preRestore,
      ok: !!env,
      entries: env ? env.data.entries.length : 0,
      span: env ? monthSpan(env.data) : '',
    };
  }));
  return snaps.sort((a, b) => {
    if (a.preRestore !== b.preRestore) return a.preRestore ? -1 : 1; // pre-restore pinned to the top
    return a.date < b.date ? 1 : a.date > b.date ? -1 : a.name < b.name ? 1 : -1; // newest first
  });
}

/** Loads one snapshot through parseBackup (it validates and migrates). Null when it can't be read. */
export async function readSnapshot(name: string, fs: FsLike | null = appFs()): Promise<AppData | null> {
  if (!fs) return null;
  const text = await fs.read(`${BACKUP_DIR}/${name}`);
  if (!text) return null;
  const env = await readEnvelope(text);
  if (!env) return null;
  return upgradeData(normalizeState(env.data), env.schemaVersion);
}

/** Deletes every snapshot (part of "Alle Daten löschen"). */
async function removeSnapshots(fs: FsLike): Promise<void> {
  const names = await fs.list(BACKUP_DIR);
  await Promise.all(names.map(n => fs.remove(`${BACKUP_DIR}/${n}`)));
}

/**
 * The automatic snapshot: on the first save of a day, write today's snapshot
 * (YYYY-MM-DD.json) if it isn't there yet, then prune to snapshotsToKeep.
 * Pure of UI; returns whether it wrote one. At most one write per day.
 */
export async function takeSnapshot(data: AppData, fs: FsLike | null = appFs(), now = new Date()): Promise<boolean> {
  if (!fs) return false;
  const today = isoDayLocal(now);
  const name = `${today}.json`;
  const names = await fs.list(BACKUP_DIR);
  if (names.includes(name)) return false; // already have today's; at most one a day
  await fs.write(`${BACKUP_DIR}/${name}`, await makeEnvelope(data, now));
  await pruneSnapshots(fs, [...names, name], today);
  return true;
}

async function pruneSnapshots(fs: FsLike, names: string[], today: string): Promise<void> {
  const dated = names.filter(n => DAILY.test(n));
  const keep = new Set(snapshotsToKeep(dated.map(dateOf), today).map(d => `${d}.json`));
  await Promise.all(dated.filter(n => !keep.has(n)).map(n => fs.remove(`${BACKUP_DIR}/${n}`)));
}

/**
 * Restore: first save the current book as the "vor Wiederherstellung"
 * snapshot (so undo survives a restart), then hand back the chosen snapshot's
 * data for the store to load. Null when the snapshot can't be read.
 */
export async function restoreSnapshot(name: string, current: AppData, fs: FsLike | null = appFs(), now = new Date()): Promise<AppData | null> {
  const data = await readSnapshot(name, fs);
  if (!data) return null;
  if (fs) {
    try { await fs.write(`${BACKUP_DIR}/${PRE_RESTORE}`, await makeEnvelope(current, now)); } catch { /* the undo toast still works in-session */ }
  }
  return data;
}

/** Today as YYYY-MM-DD in local time (the snapshot file name). */
function isoDayLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The crash screen's "Letzte Sicherung wiederherstellen": find the newest
 * whole snapshot and make it the data file (and the mirror). The app then
 * reloads and hydrates from it. Returns false when there's nothing to restore.
 */
export async function restoreLatestToData(fs: FsLike | null = appFs(), now = new Date()): Promise<boolean> {
  if (!fs) {
    // On the web the book lives in localStorage; without a file there's
    // nothing a snapshot could restore from, so there's nothing to do.
    return false;
  }
  const snaps = await listSnapshots(fs);
  const newest = snaps.find(s => s.ok && !s.preRestore) ?? snaps.find(s => s.ok);
  if (!newest) return false;
  const data = await readSnapshot(newest.name, fs);
  if (!data) return false;
  // Write it the atomic way, so a half-written file can never result.
  await fs.write(TMP, await makeEnvelope(data, now));
  await fs.remove(PREV);
  if ((await fs.read(FILE)) !== null) await fs.rename(FILE, PREV);
  await fs.rename(TMP, FILE);
  if (inDeviceBackup() !== false) { try { writeLocal(data); } catch { /* the file has it */ } }
  return true;
}

/* ------------------------------------------------------ the app's instance */

let hydrated: AppData | null = null;
/** The book as `hydrate()` found it, for the store's first render. */
export const hydratedData = () => hydrated;
export const setHydrated = (data: AppData) => { hydrated = data; };

export const saver: Saver = createSaver(isNative() ? capacitorFs : null, undefined, { snapshots: true, folders: isNative() ? [capacitorFs, capacitorFsNoBackup] : [] });

/** The folder the book is in now (plan 06): where snapshots are listed, restored and rescued from. */
const appFs = (): FsLike | null => saver.location();

/** Where `hydrate` found the book: the app's saver writes there from then on. */
function adoptLocation(inBackup: boolean) {
  if (isNative()) saver.adopt(inBackup ? capacitorFs : capacitorFsNoBackup, { mirror: inBackup });
}

/** *Im iPhone-Backup sichern* (plan 06): whether the book is part of the phone's own backup; null on the web. */
export function inDeviceBackup(): boolean | null {
  return isNative() ? saver.location() !== capacitorFsNoBackup : null;
}

/**
 * Switches it: moves the book (data, previous version, snapshots) into the
 * backed-up folder or out of it. Rejects when that fails; the book is then
 * where it was.
 */
export function setInDeviceBackup(on: boolean): Promise<void> {
  if (!isNative()) return Promise.resolve();
  return saver.relocate(on ? capacitorFs : capacitorFsNoBackup, { mirror: on });
}

/*
 * One wipe for "Alle Daten löschen" (plan 05). The data file and its
 * snapshots go through `saver.forget()`; everything else with its own files or
 * secrets registers a cleaner here, so a later plan (widgets, attachments,
 * pairing keys, bank credentials) is wiped by the same button. A cleaner that
 * throws is ignored — a wipe must finish.
 */
const wipeCleaners = new Set<() => void | Promise<void>>();

/** Register something to be erased on "Alle Daten löschen". Returns the unregister. */
export function onWipe(cleaner: () => void | Promise<void>): () => void {
  wipeCleaners.add(cleaner);
  return () => wipeCleaners.delete(cleaner);
}

/** Erase everything: the data file and snapshots, then every registered cleaner. */
export async function wipeAll(): Promise<void> {
  await saver.forget();
  await Promise.all([...wipeCleaners].map(async c => { try { await c(); } catch { /* a wipe must finish */ } }));
}

/** What is waiting goes to disk when the app leaves the screen. */
export function installFlushTriggers() {
  window.addEventListener('pagehide', () => { void saver.flush(); });
  // Back on screen: a write that failed while the phone was locked (plan 06)
  // goes again, and a day the user only opens still leaves a snapshot (plan 03).
  const back = () => { void saver.retry(); void saver.snapshot(); };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void saver.flush();
    else back();
  });
  if (isNative()) void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) back();
    else void saver.flush();
  });
}

/**
 * Debug tools on a device: localStorage `spartopf-debug` = "1" (set it from
 * Safari's Web Inspector). Off for everyone else.
 */
export function debugTools(): boolean {
  try { return localStorage.getItem('spartopf-debug') === '1'; } catch { return false; }
}

/**
 * For plan 02's device test: what iOS does when it reclaims a web view's
 * storage — the WebKit folder (localStorage, caches) goes, here and now.
 * After a relaunch everything must come back from the file.
 */
export async function debugWipeWebData(): Promise<void> {
  for (const key of Object.values(DATA_KEYS)) localStorage.removeItem(key);
  if (!isNative()) return;
  try { await Filesystem.rmdir({ path: 'WebKit', directory: Directory.Library, recursive: true }); } catch { /* already gone */ }
}

/** For the rescue export: the files as they are, unread — from both folders (plan 06; NoCloud's under "NoCloud/"). */
export async function rawFiles(fs: FsLike | null = isNative() ? capacitorFs : null, noBackup: FsLike | null = isNative() ? capacitorFsNoBackup : null): Promise<Record<string, string | null>> {
  if (!fs) return {};
  const [file, tmp, prev] = await Promise.all([fs.read(FILE), fs.read(TMP), fs.read(PREV)]);
  const out: Record<string, string | null> = { [FILE]: file, [TMP]: tmp, [PREV]: prev };
  if (noBackup) {
    const [f, t, p] = await Promise.all([noBackup.read(FILE), noBackup.read(TMP), noBackup.read(PREV)]);
    if (f !== null || t !== null || p !== null) Object.assign(out, { [`NoCloud/${FILE}`]: f, [`NoCloud/${TMP}`]: t, [`NoCloud/${PREV}`]: p });
  }
  return out;
}
