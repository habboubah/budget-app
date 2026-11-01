import { useEffect, useMemo, useState } from 'react';
import { AppData, Category, Entry, MonthKey, MonthRecord, ThemeMode } from './types';
import translations, { Language, isLanguage, DEFAULT_LANGUAGE } from './translations';
import {
  SCHEMA_VERSION, carryCandidates, carryOver, computeBalances, monthKeyOf, normalizeState,
  restoreDefaultCategories, uid,
} from './logic';
import { defaultCategories } from './data/defaults';

/** Every key this app writes starts with this, so a rescue export can find them. */
export const KEY_PREFIX = 'spartopf-';
const K = {
  categories: 'spartopf-categories',
  entries: 'spartopf-entries',
  months: 'spartopf-months',
  lang: 'spartopf-lang',
  theme: 'spartopf-theme',
  intro: 'spartopf-intro-done',
  meta: 'spartopf-meta',
} as const;

function readJson(key: string): unknown {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

function readString(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function initialLanguage(): Language {
  const saved = readString(K.lang);
  if (isLanguage(saved)) return saved;
  // First run: follow the device language if we ship it, else German.
  const device = navigator.language.split('-')[0];
  return isLanguage(device) ? device : DEFAULT_LANGUAGE;
}

/**
 * Read everything once. The very first launch gets the default categories and
 * the current month already started, so the first screen is a page to write
 * on — not a question.
 */
function loadInitial(): AppData {
  const meta = readJson(K.meta) as { seeded?: boolean } | undefined;
  const rawCategories = readJson(K.categories);
  // Not seeded yet: the defaults go in *before* normalising, or entries from
  // a half-written first launch would all be filed under "Sonstiges".
  const missing = !meta?.seeded && (!Array.isArray(rawCategories) || rawCategories.length === 0);
  const data = normalizeState({
    categories: missing ? defaultCategories() : rawCategories,
    entries: readJson(K.entries),
    months: readJson(K.months),
  });
  if (meta?.seeded || data.months.length) return data;
  return { ...data, months: [{ key: monthKeyOf(), startedAt: Date.now() }] };
}

const sortMonths = (ms: MonthRecord[]) => [...ms].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

export function useAppStore() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [initial] = useState(loadInitial);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [entries, setEntries] = useState<Entry[]>(initial.entries);
  const [months, setMonths] = useState<MonthRecord[]>(initial.months);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = readString(K.theme);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  /** The "how it works" card on the first month — gone for good once dismissed. */
  const [introDone, setIntroDone] = useState(() => readString(K.intro) === '1');

  // Keys whose last write failed (quota, private mode) — the data is at risk
  // and the UI says so. Tracked per key: one recovering write must not hide
  // another that is still failing.
  const [failedKeys, setFailedKeys] = useState<string[]>([]);
  const persist = (key: string, value: string) => {
    let ok = true;
    try { localStorage.setItem(key, value); } catch { ok = false; }
    setFailedKeys(prev => {
      const has = prev.includes(key);
      if (ok) return has ? prev.filter(k => k !== key) : prev;
      return has ? prev : [...prev, key];
    });
  };

  useEffect(() => { persist(K.categories, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { persist(K.entries, JSON.stringify(entries)); }, [entries]);
  useEffect(() => { persist(K.months, JSON.stringify(months)); }, [months]);
  useEffect(() => { persist(K.intro, introDone ? '1' : '0'); }, [introDone]);
  useEffect(() => { persist(K.meta, JSON.stringify({ schemaVersion: SCHEMA_VERSION, seeded: true })); }, []);

  useEffect(() => {
    persist(K.lang, language);
    // Screen readers pick their voice from `lang`; `dir` flips the layout for
    // right-to-left languages once one ships.
    document.documentElement.lang = language;
    document.documentElement.dir = translations[language].dir;
  }, [language]);

  useEffect(() => {
    persist(K.theme, themeMode);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = themeMode === 'system' ? (mq.matches ? 'dark' : 'light') : themeMode;
      document.documentElement.setAttribute('data-theme', resolved);
      // Tint the browser / status bar to the page.
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim();
      if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };
    apply();
    if (themeMode !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeMode]);

  const data: AppData = useMemo(() => ({ categories, entries, months }), [categories, entries, months]);
  const balances = useMemo(() => computeBalances(data), [data]);

  /* ---------------------------------------------------------------- months */

  const ensureMonth = (key: MonthKey) =>
    setMonths(prev => (prev.some(m => m.key === key) ? prev : sortMonths([...prev, { key, startedAt: Date.now() }])));

  /**
   * Start a month. With `carry`, the recurring entries of earlier months come
   * along as open entries. Returns how many were carried over.
   */
  const startMonth = (key: MonthKey, carry: boolean): number => {
    const copies = carry ? carryOver(carryCandidates(data, key), key, Date.now()) : [];
    ensureMonth(key);
    if (copies.length) setEntries(prev => [...prev, ...copies]);
    return copies.length;
  };

  /** Bring recurring entries the month is missing (added to last month after this one started). */
  const pullRecurring = (key: MonthKey): number => {
    const copies = carryOver(carryCandidates(data, key), key, Date.now());
    if (copies.length) setEntries(prev => [...prev, ...copies]);
    return copies.length;
  };

  /** Set (or with `undefined`, clear) a month's manual opening balance. */
  const setOpening = (key: MonthKey, opening: number | undefined) =>
    setMonths(prev => {
      const has = prev.some(m => m.key === key);
      const next = has ? prev : [...prev, { key, startedAt: Date.now() }];
      return sortMonths(next.map(m => {
        if (m.key !== key) return m;
        const { opening: _drop, ...rest } = m;
        return opening === undefined ? rest : { ...rest, opening };
      }));
    });

  /** Remove a month and its entries; returns them for undo. */
  const removeMonth = (key: MonthKey): { month: MonthRecord; entries: Entry[] } | null => {
    const month = months.find(m => m.key === key);
    if (!month) return null;
    const gone = entries.filter(e => e.month === key);
    setMonths(prev => prev.filter(m => m.key !== key));
    setEntries(prev => prev.filter(e => e.month !== key));
    return { month, entries: gone };
  };

  const restoreMonth = (removed: { month: MonthRecord; entries: Entry[] }) => {
    setMonths(prev => (prev.some(m => m.key === removed.month.key) ? prev : sortMonths([...prev, removed.month])));
    setEntries(prev => {
      const ids = new Set(prev.map(e => e.id));
      return [...prev, ...removed.entries.filter(e => !ids.has(e.id))];
    });
  };

  /* --------------------------------------------------------------- entries */

  const addEntry = (entry: Entry) => {
    ensureMonth(entry.month);
    setEntries(prev => [...prev, entry]);
  };

  const updateEntry = (id: string, patch: Partial<Omit<Entry, 'id'>>) =>
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch };
      // Optional fields set to undefined are dropped, not stored as null.
      if (next.dueDay === undefined) delete next.dueDay;
      if (!next.note) delete next.note;
      if (next.paid && !e.paid) next.paidAt = Date.now();
      if (!next.paid) delete next.paidAt;
      return next;
    }));

  const togglePaid = (id: string) => {
    const e = entries.find(x => x.id === id);
    if (e) updateEntry(id, { paid: !e.paid });
  };

  const removeEntry = (id: string): { entry: Entry; index: number } | null => {
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return null;
    setEntries(prev => prev.filter(e => e.id !== id));
    return { entry: entries[index], index };
  };

  const restoreEntry = (entry: Entry, index: number) =>
    setEntries(prev => (prev.some(e => e.id === entry.id) ? prev : [...prev.slice(0, index), entry, ...prev.slice(index)]));

  /* ------------------------------------------------------------ categories */

  const addCategory = (c: Category) => setCategories(prev => [...prev, c]);

  const updateCategory = (id: string, patch: Partial<Omit<Category, 'id'>>) =>
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));

  interface RemovedCategory { category: Category; index: number; entries: Entry[] }

  /** Delete a category and its entries; returns everything for undo. */
  const removeCategory = (id: string): RemovedCategory | null => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    const gone = entries.filter(e => e.categoryId === id);
    setCategories(prev => prev.filter(c => c.id !== id));
    if (gone.length) setEntries(prev => prev.filter(e => e.categoryId !== id));
    return { category: categories[index], index, entries: gone };
  };

  const restoreCategory = (r: RemovedCategory) => {
    setCategories(prev => (prev.some(c => c.id === r.category.id)
      ? prev
      : [...prev.slice(0, r.index), r.category, ...prev.slice(r.index)]));
    if (r.entries.length) {
      setEntries(prev => {
        const ids = new Set(prev.map(e => e.id));
        return [...prev, ...r.entries.filter(e => !ids.has(e.id))];
      });
    }
  };

  const setCategoryOrder = (ids: string[]) =>
    setCategories(prev => {
      const byId = new Map(prev.map(c => [c.id, c]));
      const ordered = ids.map(id => byId.get(id)).filter((c): c is Category => !!c);
      return [...ordered, ...prev.filter(c => !ids.includes(c.id))];
    });

  /** Built-in categories back as shipped; returns the previous list for undo. */
  const restoreDefaults = (): Category[] => {
    const before = categories;
    setCategories(restoreDefaultCategories(categories, defaultCategories()));
    return before;
  };

  /* ------------------------------------------------------------ whole data */

  const importData = (d: AppData) => {
    // A backup without categories still gets the defaults, or every entry
    // would land in "Sonstiges".
    const fixed = d.categories.length ? d : normalizeState({ ...d, categories: defaultCategories() });
    setCategories(fixed.categories);
    setEntries(fixed.entries);
    setMonths(fixed.months.length ? fixed.months : [{ key: monthKeyOf(), startedAt: Date.now() }]);
  };

  const resetAll = () => {
    setCategories(defaultCategories());
    setEntries([]);
    setMonths([{ key: monthKeyOf(), startedAt: Date.now() }]);
    setIntroDone(false);
  };

  return {
    language, setLanguage, themeMode, setThemeMode, storageError: failedKeys.length > 0,
    introDone, dismissIntro: () => setIntroDone(true), restoreIntro: () => setIntroDone(false),
    data, categories, entries, months, balances,
    startMonth, pullRecurring, setOpening, removeMonth, restoreMonth,
    addEntry, updateEntry, togglePaid, removeEntry, restoreEntry,
    addCategory, updateCategory, removeCategory, restoreCategory, setCategoryOrder, restoreDefaults,
    setCategories, importData, resetAll,
    newId: uid,
  };
}

export type Store = ReturnType<typeof useAppStore>;
