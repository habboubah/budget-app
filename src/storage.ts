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
 * View preferences — language, theme, folded cards — stay in localStorage in
 * store.ts: losing them costs nothing.
 */

/** Every key this app writes starts with this, so a rescue export can find them. */
export const KEY_PREFIX = 'spartopf-';
/** The data's localStorage keys: the web's store, and the iPhone app's mirror. */
export const DATA_KEYS = {
  categories: 'spartopf-categories',
  entries: 'spartopf-entries',
  months: 'spartopf-months',
  contracts: 'spartopf-contracts',
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
}

export const FILE = 'spartopf/data.json';
export const TMP = 'spartopf/data.json.tmp';
export const PREV = 'spartopf/data.prev.json';

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
  write(DATA_KEYS.meta, JSON.stringify({ schemaVersion: SCHEMA_VERSION, seeded: true }));
}

/* ----------------------------------------------------------------- the file */

/** Capacitor's file system, in the app's Library folder (not Documents: the Files app can't see it). */
export const capacitorFs: FsLike = {
  read: async path => {
    try {
      const { data } = await Filesystem.readFile({ path, directory: Directory.Library, encoding: Encoding.UTF8 });
      return typeof data === 'string' ? data : await data.text();
    } catch {
      return null;
    }
  },
  write: async (path, text) => {
    await Filesystem.writeFile({ path, data: text, directory: Directory.Library, encoding: Encoding.UTF8, recursive: true });
  },
  rename: async (from, to) => {
    await Filesystem.rename({ from, to, directory: Directory.Library, toDirectory: Directory.Library });
  },
  remove: async path => {
    try { await Filesystem.deleteFile({ path, directory: Directory.Library }); } catch { /* not there */ }
  },
};

export type HydrateSource = 'file' | 'tmp' | 'prev' | 'mirror' | 'migrated' | 'local';

export interface Hydrated {
  data: AppData;
  /** Where it came from: one of the files, the mirror after they failed, the first move from localStorage, or the web's localStorage. */
  source: HydrateSource;
}

/** The files are there but none checks out, and there is no mirror: the crash screen offers to rescue what is left. */
export class StorageCorruptError extends Error {
  constructor() { super('The household book could not be read.'); }
}

/**
 * Reads the book before the first render. In the app: the newest of
 * data.json, a finished data.json.tmp (a write cut short after it) and
 * data.prev.json whose checksum matches; else the localStorage mirror; a
 * first launch with this version moves localStorage over. On the web:
 * localStorage, and asks the browser to keep it.
 */
export async function hydrate(fs: FsLike | null = isNative() ? capacitorFs : null, read: (key: string) => unknown = readLocal): Promise<Hydrated> {
  if (!fs) {
    void (navigator.storage?.persist?.() ?? Promise.resolve(false)).catch(() => false);
    return { data: loadStored(read), source: 'local' };
  }
  const texts = await Promise.all([fs.read(FILE), fs.read(TMP), fs.read(PREV)]);
  const envs = await Promise.all(texts.map(readEnvelope));
  const sources: HydrateSource[] = ['file', 'tmp', 'prev'];
  let best = -1;
  envs.forEach((env, i) => {
    if (env && (best < 0 || env.savedAt > envs[best]!.savedAt)) best = i;
  });
  if (best >= 0) {
    const env = envs[best]!;
    return { data: upgradeData(normalizeState(env.data), env.schemaVersion), source: sources[best] };
  }
  const anyFile = texts.some(t => t !== null);
  if (hasLocalBook(read)) return { data: loadStored(read), source: anyFile ? 'mirror' : 'migrated' };
  if (anyFile) throw new StorageCorruptError();
  // A first launch: the book starts here (the first save writes the file).
  return { data: loadStored(read), source: 'migrated' };
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
  fs: FsLike | null,
  writeMirror: (data: AppData) => void = data => writeLocal(data),
  {
    debounce = SAVE_DEBOUNCE_MS,
    now = () => new Date(),
    clearMirror = () => { for (const key of Object.values(DATA_KEYS)) localStorage.removeItem(key); },
  }: { debounce?: number; now?: () => Date; clearMirror?: () => void } = {},
): Saver {
  let pending: AppData | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
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
      try { writeMirror(data); } catch { /* the file has it */ }
    } else {
      try { writeMirror(data); } catch { ok = false; }
    }
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
      chain = chain.then(async () => {
        if (fs) {
          await fs.remove(TMP);
          await fs.remove(PREV);
          await fs.remove(FILE);
        }
        try { clearMirror(); } catch { /* nothing to clear */ }
      });
      return chain;
    },
  };
}

/* ------------------------------------------------------ the app's instance */

let hydrated: AppData | null = null;
/** The book as `hydrate()` found it, for the store's first render. */
export const hydratedData = () => hydrated;
export const setHydrated = (data: AppData) => { hydrated = data; };

export const saver: Saver = createSaver(isNative() ? capacitorFs : null);

/** What is waiting goes to disk when the app leaves the screen. */
export function installFlushTriggers() {
  window.addEventListener('pagehide', () => { void saver.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void saver.flush(); });
  if (isNative()) void CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (!isActive) void saver.flush(); });
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

/** For the rescue export: the files as they are, unread. */
export async function rawFiles(fs: FsLike | null = isNative() ? capacitorFs : null): Promise<Record<string, string | null>> {
  if (!fs) return {};
  const [file, tmp, prev] = await Promise.all([fs.read(FILE), fs.read(TMP), fs.read(PREV)]);
  return { [FILE]: file, [TMP]: tmp, [PREV]: prev };
}
