import { useEffect, useMemo, useState } from 'react';
import { ACCENTS, Accent, AppData, Category, Contract, Entry, MonthKey, MonthRecord, ThemeMode } from './types';
import translations, { Language, isLanguage, DEFAULT_LANGUAGE } from './translations';
import {
  canRemoveFromMonth, carryCandidates, carryOver, computeBalances, laterCopies, monthKeyOf, moveEntry as move, normalizeState,
  restoreDefaultCategories, standardCategoryIds, uid,
} from './logic';
import { defaultCategories } from './data/defaults';
import { ReminderPrefs, normalizeReminderPrefs } from './reminders';
import { hydratedData, loadStored, saver } from './storage';

/** View preferences: localStorage, here. The data itself goes through storage.ts. */
const K = {
  lang: 'spartopf-lang',
  theme: 'spartopf-theme',
  accent: 'spartopf-accent',
  intro: 'spartopf-intro-done',
  tips: 'spartopf-tips-done',
  reminders: 'spartopf-reminders',
  lock: 'spartopf-lock',
  collapsed: 'spartopf-collapsed',
  hintsHidden: 'spartopf-hints-hidden',
  reviewsSeen: 'spartopf-reviews-seen',
} as const;

/** Dismissed hints and seen reviews are kept as their last 200 ids — no amounts in them. */
const KEEP_IDS = 200;

const readIds = (saved: unknown): string[] => (Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string').slice(-KEEP_IDS) : []);

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

/** The book as main.tsx's `hydrate()` found it (the file in the app); localStorage when rendered without it. */
function loadInitial(): AppData {
  return hydratedData() ?? loadStored(readJson);
}

const sortMonths = (ms: MonthRecord[]) => [...ms].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

export function useAppStore() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [initial] = useState(loadInitial);
  const [categories, setCategories] = useState<Category[]>(initial.categories);
  const [entries, setEntries] = useState<Entry[]>(initial.entries);
  const [months, setMonths] = useState<MonthRecord[]>(initial.months);
  /** Contract details per recurring series — data, so part of a backup. */
  const [contracts, setContracts] = useState<Record<string, Contract>>(initial.contracts ?? {});
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = readString(K.theme);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  /** The app's colour — a view preference like the theme, so not in a backup. */
  const [accent, setAccent] = useState<Accent>(() => {
    const saved = readString(K.accent);
    const value = ACCENTS.find(a => a === saved) ?? 'petrol';
    // Set before the first paint, so the app never flashes the default colour.
    document.documentElement.setAttribute('data-accent', value);
    return value;
  });
  /** The setup card on the first month — gone for good once finished or put off. */
  const [introDone, setIntroDone] = useState(() => readString(K.intro) === '1');
  /**
   * The gestures card shown after the setup — gone once dismissed. Whoever
   * dismissed the old intro card has read these already (it carried them).
   */
  const [tipsDone, setTipsDone] = useState(() => (readString(K.tips) ?? readString(K.intro)) === '1');
  /** Reminders and the lock: settings of this device, not data — not in a backup, kept by "delete all". */
  const [reminders, setReminders] = useState<ReminderPrefs>(() => normalizeReminderPrefs(readJson(K.reminders)));
  const [lockOn, setLockOn] = useState(() => readString(K.lock) === '1');
  /** Categories folded down on the month page — a view preference, not data, so not in a backup. */
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    const saved = readJson(K.collapsed);
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : [];
  });
  /** Hints the user hid (`Insight.id`) — a view preference: not in a backup, no amounts. */
  const [hintsHidden, setHintsHidden] = useState<string[]>(() => readIds(readJson(K.hintsHidden)));
  /** Months (YYYY-MM) and years (YYYY) whose review card was dismissed or opened. */
  const [reviewsSeen, setReviewsSeen] = useState<string[]>(() => readIds(readJson(K.reviewsSeen)));

  // The last write of the book failed (disk full; quota or private mode on the
  // web) — the data is at risk and the banner says so until a write succeeds.
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => saver.onStatus(ok => setSaveFailed(!ok)), []);
  /** A view preference: losing one costs nothing, so a failed write is let go. */
  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* a preference */ }
  };

  useEffect(() => { persist(K.intro, introDone ? '1' : '0'); }, [introDone]);
  useEffect(() => { persist(K.tips, tipsDone ? '1' : '0'); }, [tipsDone]);
  useEffect(() => { persist(K.reminders, JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { persist(K.lock, lockOn ? '1' : '0'); }, [lockOn]);
  useEffect(() => { persist(K.collapsed, JSON.stringify(collapsed)); }, [collapsed]);
  useEffect(() => { persist(K.hintsHidden, JSON.stringify(hintsHidden)); }, [hintsHidden]);
  useEffect(() => { persist(K.reviewsSeen, JSON.stringify(reviewsSeen)); }, [reviewsSeen]);
  const remember = (list: string[], id: string) => (list.includes(id) ? list : [...list, id].slice(-KEEP_IDS));

  useEffect(() => {
    persist(K.lang, language);
    // Screen readers pick their voice from `lang`; `dir` flips the layout for
    // right-to-left languages once one ships.
    document.documentElement.lang = language;
    document.documentElement.dir = translations[language].dir;
  }, [language]);

  useEffect(() => {
    persist(K.accent, accent);
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

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

  const data: AppData = useMemo(
    () => ({ categories, entries, months, ...(Object.keys(contracts).length ? { contracts } : {}) }),
    [categories, entries, months, contracts],
  );
  // Every change to the book goes to storage (debounced, written atomically; storage.ts).
  useEffect(() => { saver.save(data); }, [data]);
  // Contracts don't move money: the balances don't follow them.
  const balances = useMemo(() => computeBalances({ categories, entries, months }), [categories, entries, months]);

  /* ---------------------------------------------------------------- months */

  /** A new month record: it shows the standard categories (plus `extra`). */
  const newMonth = (key: MonthKey, extra: string[] = []): MonthRecord =>
    ({ key, startedAt: Date.now(), categories: [...new Set([...standardCategoryIds(categories), ...extra])] });


  /**
   * Start a month with the standard categories. With `carry`, the recurring
   * entries of earlier months come along as open entries (and their
   * categories with them). Returns how many were carried over.
   */
  const startMonth = (key: MonthKey, carry: boolean): number => {
    const copies = carry ? carryOver(carryCandidates(data, key), key, Date.now()) : [];
    const record = newMonth(key, copies.map(e => e.categoryId));
    setMonths(prev => (prev.some(m => m.key === key) ? prev : sortMonths([...prev, record])));
    if (copies.length) setEntries(prev => [...prev, ...copies]);
    return copies.length;
  };

  /**
   * Make sure a month exists before something goes into it — started the
   * usual way, with last month's recurring entries, never empty by accident.
   */
  const ensureMonth = (key: MonthKey) => {
    if (!months.some(m => m.key === key)) startMonth(key, true);
  };

  /** Patch one month's category list; a month from before lists starts as "all of them". */
  const patchMonthCategories = (key: MonthKey, fn: (ids: string[]) => string[]) =>
    setMonths(prev => prev.map(m => (m.key === key ? { ...m, categories: fn(m.categories ?? standardCategoryIds(categories)) } : m)));

  /** Take an empty category out of one month. Refuses (false) while it has entries there. */
  const hideCategory = (key: MonthKey, categoryId: string): boolean => {
    if (!canRemoveFromMonth(data, key, categoryId)) return false;
    patchMonthCategories(key, ids => ids.filter(id => id !== categoryId));
    return true;
  };

  /** Put a category into one month. */
  const showCategory = (key: MonthKey, categoryId: string) =>
    patchMonthCategories(key, ids => (ids.includes(categoryId) ? ids : [...ids, categoryId]));

  /** Bring recurring entries the month is missing (added to last month after this one started). */
  const pullRecurring = (key: MonthKey): number => {
    const copies = carryOver(carryCandidates(data, key), key, Date.now());
    if (copies.length) setEntries(prev => [...prev, ...copies]);
    return copies.length;
  };

  /** Set (or with `undefined`, clear) a month's manual opening balance. */
  const setOpening = (key: MonthKey, opening: number | undefined) => {
    ensureMonth(key);
    setMonths(prev => {
      const has = prev.some(m => m.key === key);
      const next = has ? prev : [...prev, newMonth(key)];
      return sortMonths(next.map(m => {
        if (m.key !== key) return m;
        const { opening: _drop, ...rest } = m;
        return opening === undefined ? rest : { ...rest, opening };
      }));
    });
  };

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

  /** A new entry; a recurring one also goes into the months already started after it. */
  const addEntry = (entry: Entry) => {
    ensureMonth(entry.month);
    const later = laterCopies(data, entry, Date.now());
    setEntries(prev => [...prev, entry, ...later]);
  };

  const updateEntry = (id: string, patch: Partial<Omit<Entry, 'id'>>) => {
    const before = entries.find(e => e.id === id);
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch };
      // Moved to another category in the editor: it goes to the end there,
      // its old position means nothing in the new category.
      if (patch.categoryId && patch.categoryId !== e.categoryId) delete next.order;
      // Optional fields set to undefined are dropped, not stored as null.
      if (next.dueDay === undefined) delete next.dueDay;
      if (!next.note) delete next.note;
      if (next.paid && !e.paid) next.paidAt = Date.now();
      if (!next.paid) delete next.paidAt;
      return next;
    }));
    // Made recurring in the editor: it goes into the months already started after it, too.
    if (before && before.repeat === 'none' && patch.repeat && patch.repeat !== 'none') {
      const later = laterCopies(data, { ...before, ...patch }, Date.now());
      if (later.length) setEntries(prev => [...prev, ...later]);
    }
  };

  /**
   * A confirmed bank import: the new entries — a month they need is started
   * empty, the bank's list is what happened there — and the open entries the
   * transactions paid, ticked. Returns what to undo.
   */
  const importEntries = (add: Entry[], pay: string[]): { added: string[]; paid: string[]; createdMonths: MonthKey[] } => {
    const have = new Set(months.map(m => m.key));
    const createdMonths = [...new Set(add.map(e => e.month))].filter(k => !have.has(k));
    if (createdMonths.length) {
      setMonths(prev => sortMonths([...prev, ...createdMonths.filter(k => !prev.some(m => m.key === k)).map(k => newMonth(k, add.filter(e => e.month === k).map(e => e.categoryId)))]));
    }
    const now = Date.now();
    const paid = pay.filter(id => entries.some(e => e.id === id && !e.paid));
    setEntries(prev => [...prev.map(e => (paid.includes(e.id) ? { ...e, paid: true, paidAt: now } : e)), ...add]);
    return { added: add.map(e => e.id), paid, createdMonths };
  };

  const undoImport = (done: { added: string[]; paid: string[]; createdMonths: MonthKey[] }) => {
    setEntries(prev => prev.filter(e => !done.added.includes(e.id)).map(e => {
      if (!done.paid.includes(e.id)) return e;
      const { paidAt: _drop, ...rest } = e;
      return { ...rest, paid: false };
    }));
    setMonths(prev => prev.filter(m => !done.createdMonths.includes(m.key)));
  };

  const togglePaid = (id: string) => {
    const e = entries.find(x => x.id === id);
    if (e) updateEntry(id, { paid: !e.paid });
  };

  /**
   * Drag and drop: put an entry at `toIndex` of a category in its month.
   * Returns the affected entries as they were, for undo.
   */
  const moveEntry = (id: string, toCategoryId: string, toIndex: number): Entry[] | null => {
    const e = entries.find(x => x.id === id);
    if (!e) return null;
    const before = entries.filter(x => x.month === e.month && (x.categoryId === e.categoryId || x.categoryId === toCategoryId));
    setEntries(prev => move(prev, id, toCategoryId, toIndex));
    return before;
  };

  /** Put entries back as they were (the undo of a move). */
  const restoreEntries = (versions: Entry[]) => {
    const byId = new Map(versions.map(v => [v.id, v]));
    setEntries(prev => prev.map(x => byId.get(x.id) ?? x));
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

  /**
   * A new category. A standard one also joins the months from this one on
   * that already have their own list — a category made today is wanted today.
   */
  const addCategory = (c: Category) => {
    setCategories(prev => [...prev, c]);
    if (c.standard === false) return;
    const now = monthKeyOf();
    setMonths(prev => prev.map(m => (m.key >= now && m.categories && !m.categories.includes(c.id)
      ? { ...m, categories: [...m.categories, c.id] }
      : m)));
  };

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
    setMonths(fixed.months.length ? fixed.months : [{ key: monthKeyOf(), startedAt: Date.now(), categories: standardCategoryIds(fixed.categories) }]);
    setContracts(fixed.contracts ?? {});
  };

  const resetAll = () => {
    // The files and the mirror go first (no copy of the old book stays behind); the fresh book is saved after.
    void saver.forget();
    const fresh = defaultCategories();
    setCategories(fresh);
    setEntries([]);
    setMonths([{ key: monthKeyOf(), startedAt: Date.now(), categories: standardCategoryIds(fresh) }]);
    setContracts({});
    setIntroDone(false);
    setTipsDone(false);
  };

  /* ------------------------------------------------------------- contracts */

  /** Set (or with `undefined` clear) a series' contract details; returns what was there, for undo. */
  const setContract = (seriesId: string, contract: Contract | undefined): Contract | undefined => {
    const before = contracts[seriesId];
    setContracts(prev => {
      const { [seriesId]: _old, ...rest } = prev;
      return contract && Object.keys(contract).length ? { ...rest, [seriesId]: contract } : rest;
    });
    return before;
  };

  return {
    language, setLanguage, themeMode, setThemeMode, accent, setAccent, storageError: saveFailed,
    introDone, dismissIntro: () => setIntroDone(true), restoreIntro: () => setIntroDone(false),
    tipsDone, dismissTips: () => setTipsDone(true),
    reminders, setReminders: (patch: Partial<ReminderPrefs>) => setReminders(r => normalizeReminderPrefs({ ...r, ...patch })),
    lockOn, setLockOn,
    collapsed,
    toggleCollapsed: (id: string) => setCollapsed(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])),
    expand: (id: string) => setCollapsed(prev => prev.filter(x => x !== id)),
    setCollapsed,
    hintsHidden,
    hideHint: (id: string) => setHintsHidden(prev => remember(prev, id)),
    showHint: (id: string) => setHintsHidden(prev => prev.filter(x => x !== id)),
    reviewsSeen,
    seeReview: (id: string) => setReviewsSeen(prev => remember(prev, id)),
    unseeReview: (id: string) => setReviewsSeen(prev => prev.filter(x => x !== id)),
    data, categories, entries, months, balances,
    startMonth, pullRecurring, setOpening, removeMonth, restoreMonth, hideCategory, showCategory,
    addEntry, updateEntry, togglePaid, removeEntry, restoreEntry, moveEntry, restoreEntries, importEntries, undoImport,
    addCategory, updateCategory, removeCategory, restoreCategory, setCategoryOrder, restoreDefaults,
    setCategories, importData, resetAll, setContract,
    newId: uid,
  };
}

export type Store = ReturnType<typeof useAppStore>;
