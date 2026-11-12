import { useEffect, useMemo, useState } from 'react';
import { ACCENTS, Accent, Account, AppData, Category, Contract, Debt, DemoInfo, Entry, Favorite, Goal, MonthKey, MonthRecord, Project, Rule, ThemeMode } from './types';
import { Language, isLanguage, loadLanguage, stringsFor } from './translations';
import {
  ALL_ACCOUNTS, AccountView, MAIN_ACCOUNT, MAX_ACCOUNTS, MAX_FAVORITES, TransferDraft, canDeleteAccount, canRemoveFromMonth, carryCandidates, carryOver,
  computeBalances, laterCopies, laterTransferCopies, mainAccount, makeTransfer, monthKeyOf, moveEntry as move, normalizeState,
  restoreDefaultCategories, setActiveCurrency, standardCategoryIds, uid, isIsoDay, isoDay, changeMonthStart, setMonthStart, validMonthStart,
} from './logic';
import { TipId, TipState, closeTip, knowGuide, readTipState } from './tips';
import { GuideTopicId, readGuideSeen } from './guide';
import { Currency, DEFAULT_CURRENCY, isSupportedCurrency } from './currency';
import { systemCurrency, systemLanguage } from './systemLocale';
import { defaultCategories } from './data/defaults';
import { ReminderPrefs, normalizeReminderPrefs } from './reminders';
import { hydratedData, loadStored, saver, wipeAll } from './storage';
import { cancelAllReminders } from './notify';
import { addDemoData, hasDemoData, removeDemoData } from './demo';

/** View preferences: localStorage, here. The data itself goes through storage.ts. */
const K = {
  lang: 'spartopf-lang',
  theme: 'spartopf-theme',
  accent: 'spartopf-accent',
  intro: 'spartopf-intro-done',
  tips: 'spartopf-tips-done',
  reminders: 'spartopf-reminders',
  lock: 'spartopf-lock',
  hideAmounts: 'spartopf-hide-amounts',
  firstUse: 'spartopf-first-use',
  reviewAsked: 'spartopf-review-asked',
  collapsed: 'spartopf-collapsed',
  hintsHidden: 'spartopf-hints-hidden',
  reviewsSeen: 'spartopf-reviews-seen',
  lastExport: 'spartopf-last-export',
  copyCardDismissed: 'spartopf-copy-card-dismissed',
  autoCategory: 'spartopf-auto-category',
  budgetNotes: 'spartopf-budget-notes',
  captureReview: 'spartopf-capture-review',
  taxMarks: 'spartopf-tax-marks',
  tipState: 'spartopf-tip-state',
  guideSeen: 'spartopf-guide-seen',
  account: 'spartopf-account',
  balanceOpen: 'spartopf-balance-open',
  entryMore: 'spartopf-entry-more',
  calcKeys: 'spartopf-calc-keys',
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

/**
 * The language to start with: the one picked before, else the phone's (on a
 * fresh install and after "Reset app"; German when the app doesn't speak
 * it). main.tsx loads its strings before the first render.
 */
export function initialLanguage(): Language {
  const saved = readString(K.lang);
  if (isLanguage(saved)) return saved;
  return systemLanguage();
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
  /**
   * The book's currency — data, so part of a backup (plan 07). A loaded book
   * keeps its currency (unset = euros); a fresh install starts in the phone's
   * region's currency, US dollars when there is none we offer.
   * `setActiveCurrency` keeps the formatters in sync.
   */
  const [currency, setCurrency] = useState<Currency>(() => {
    const loaded = isSupportedCurrency(initial.currency) ? initial.currency : undefined;
    const freshInstall = readString(K.firstUse) === null && initial.entries.length === 0;
    const value = loaded ?? (freshInstall ? systemCurrency() : DEFAULT_CURRENCY);
    setActiveCurrency(value);
    return value;
  });
  useEffect(() => { setActiveCurrency(currency); }, [currency]);
  /** Pinned favourites — data, so part of a backup (plan 09). */
  const [favorites, setFavorites] = useState<Favorite[]>(initial.favorites ?? []);
  /** Savings goals, "Spartöpfe" — data, so part of a backup (plan 12). */
  const [goals, setGoals] = useState<Goal[]>(initial.goals ?? []);
  /** Import rules — data, so part of a backup (plan 20). */
  const [rules, setRules] = useState<Rule[]>(initial.rules ?? []);
  /** What the test data added (schema 17, src/demo.ts) — data, so part of a backup. */
  const [demo, setDemo] = useState<DemoInfo | undefined>(initial.demo);
  /** Debts and loans, and money lent (plan 31). */
  const [debts, setDebts] = useState<Debt[]>(initial.debts ?? []);
  const [projects, setProjects] = useState<Project[]>(initial.projects ?? []);
  /**
   * The day the book's month begins (plan 32) — data, so part of a backup.
   * `setMonthStart` keeps logic.ts in step; set in the same breath as the
   * state, so nothing computes a month with the old day.
   */
  const [monthStart, setMonthStartState] = useState<number>(() => {
    const day = validMonthStart(initial.monthStart);
    setMonthStart(day);
    return day;
  });
  const applyMonthStart = (day: number | undefined) => {
    const valid = validMonthStart(day);
    setMonthStart(valid);
    setMonthStartState(valid);
  };
  /** The accounts once there is more than the main one (plan 30). */
  const [accounts, setAccounts] = useState<Account[]>(initial.accounts ?? []);
  /** Which account the balance card and the month show (plan 30): an account's id, or all of them. */
  const [accountView, setAccountView] = useState<AccountView>(() => readString(K.account) ?? MAIN_ACCOUNT);
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
  /**
   * What a new book keeps folded and one that is already in use shows as it
   * always did (plan 39): the balance card's line, ring and panels, the entry
   * sheet's further pills, the calculator keys. Unset = decided here, once,
   * by whether the book held anything when this version first opened it;
   * from then on it is whatever the user left it at.
   */
  const [inUse] = useState(() => initial.entries.length > 0);
  const startOpen = (key: string) => { const v = readString(key); return v === null ? inUse : v === '1'; };
  const [balanceOpen, setBalanceOpen] = useState(() => startOpen(K.balanceOpen));
  const [entryMore, setEntryMore] = useState(() => startOpen(K.entryMore));
  const [calcKeys, setCalcKeys] = useState(() => startOpen(K.calcKeys));
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
  /** *Beträge verbergen* (plan 06): a setting of this device like the lock — not in a backup, kept by "delete all". */
  const [hideAmounts, setHideAmounts] = useState(() => readString(K.hideAmounts) === '1');
  /** Plan 15's rule: the first day this install was used, and when the rating prompt was last asked for (YYYY-MM-DD). Settings of this device, kept by "delete all". */
  const [firstUse] = useState(() => { const v = readString(K.firstUse); return isIsoDay(v) ? v : isoDay(); });
  const [reviewAsked, setReviewAsked] = useState(() => { const v = readString(K.reviewAsked); return isIsoDay(v) ? v : ''; });
  /** The entry sheet picks the category the typed name points to (plan 32) — on unless switched off. A view preference. */
  const [autoCategory, setAutoCategory] = useState(() => readString(K.autoCategory) !== '0');
  /** A word when an entry takes a budget to 80 % or over it — on unless switched off. A view preference. */
  const [budgetNotes, setBudgetNotes] = useState(() => readString(K.budgetNotes) !== '0');
  /** Categories folded down on the month page — a view preference, not data, so not in a backup. */
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    const saved = readJson(K.collapsed);
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : [];
  });
  /** Hints the user hid (`Insight.id`) — a view preference: not in a backup, no amounts. */
  const [hintsHidden, setHintsHidden] = useState<string[]>(() => readIds(readJson(K.hintsHidden)));
  /** Months (YYYY-MM) and years (YYYY) whose review card was dismissed or opened. */
  const [reviewsSeen, setReviewsSeen] = useState<string[]>(() => readIds(readJson(K.reviewsSeen)));
  /** When a copy last left the device (YYYY-MM-DD), for plan 03's 90-day nudge; '' if never. */
  const [lastExport, setLastExport] = useState<string>(() => readString(K.lastExport) ?? '');
  /** The user hid the "keep a copy off this device" card — stays hidden. */
  const [copyCardDismissed, setCopyCardDismissed] = useState(() => readString(K.copyCardDismissed) === '1');

  // The last write of the book failed (disk full; quota or private mode on the
  // web) — the data is at risk and the banner says so until a write succeeds.
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => saver.onStatus(ok => setSaveFailed(!ok)), []);
  /** A view preference: losing one costs nothing, so a failed write is let go. */
  const persist = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* a preference */ }
  };

  useEffect(() => { persist(K.balanceOpen, balanceOpen ? '1' : '0'); }, [balanceOpen]);
  useEffect(() => { persist(K.entryMore, entryMore ? '1' : '0'); }, [entryMore]);
  useEffect(() => { persist(K.calcKeys, calcKeys ? '1' : '0'); }, [calcKeys]);
  useEffect(() => { persist(K.intro, introDone ? '1' : '0'); }, [introDone]);
  useEffect(() => { persist(K.tips, tipsDone ? '1' : '0'); }, [tipsDone]);
  useEffect(() => { persist(K.reminders, JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { persist(K.lock, lockOn ? '1' : '0'); }, [lockOn]);
  useEffect(() => { persist(K.hideAmounts, hideAmounts ? '1' : '0'); }, [hideAmounts]);
  useEffect(() => { persist(K.firstUse, firstUse); }, [firstUse]);
  useEffect(() => { if (reviewAsked) persist(K.reviewAsked, reviewAsked); }, [reviewAsked]);
  useEffect(() => { persist(K.autoCategory, autoCategory ? '1' : '0'); }, [autoCategory]);
  useEffect(() => { persist(K.budgetNotes, budgetNotes ? '1' : '0'); }, [budgetNotes]);
  /** Plan 37: which tips are done, and when the last one was put away. */
  const [tipState, setTipState] = useState<TipState>(() => readTipState(readJson(K.tipState)));
  useEffect(() => { persist(K.tipState, JSON.stringify(tipState)); }, [tipState]);
  /** The guide's topics opened so far (src/guide.ts): a tick beside each. */
  const [guideSeen, setGuideSeen] = useState<GuideTopicId[]>(() => readGuideSeen(readJson(K.guideSeen)));
  useEffect(() => { persist(K.guideSeen, JSON.stringify(guideSeen)); }, [guideSeen]);
  /** Plan 19: captured payments wait under *Neu* instead of being booked at once. */
  const [captureReview, setCaptureReview] = useState(() => readString(K.captureReview) === '1');
  useEffect(() => { persist(K.captureReview, captureReview ? '1' : '0'); }, [captureReview]);
  /** The entry sheet offers the tax mark (schema 29) — off until switched on under Optionen › Steuerliste. A view preference. */
  const [taxMarks, setTaxMarks] = useState(() => readString(K.taxMarks) === '1');
  useEffect(() => { persist(K.taxMarks, taxMarks ? '1' : '0'); }, [taxMarks]);
  useEffect(() => { persist(K.account, accountView); }, [accountView]);
  useEffect(() => { persist(K.collapsed, JSON.stringify(collapsed)); }, [collapsed]);
  useEffect(() => { persist(K.hintsHidden, JSON.stringify(hintsHidden)); }, [hintsHidden]);
  useEffect(() => { persist(K.reviewsSeen, JSON.stringify(reviewsSeen)); }, [reviewsSeen]);
  useEffect(() => { if (lastExport) persist(K.lastExport, lastExport); }, [lastExport]);
  useEffect(() => { persist(K.copyCardDismissed, copyCardDismissed ? '1' : '0'); }, [copyCardDismissed]);
  const remember = (list: string[], id: string) => (list.includes(id) ? list : [...list, id].slice(-KEEP_IDS));

  useEffect(() => {
    persist(K.lang, language);
    // Screen readers pick their voice from `lang`; `dir` flips the layout for
    // right-to-left languages once one ships.
    document.documentElement.lang = language;
    document.documentElement.dir = stringsFor(language).dir;
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
    () => ({
      categories, entries, months,
      ...(Object.keys(contracts).length ? { contracts } : {}),
      ...(currency !== DEFAULT_CURRENCY ? { currency } : {}),
      ...(favorites.length ? { favorites } : {}),
      ...(goals.length ? { goals } : {}),
      ...(rules.length ? { rules } : {}),
      ...(demo ? { demo } : {}),
      ...(accounts.length ? { accounts } : {}),
      ...(debts.length ? { debts } : {}),
      ...(projects.length ? { projects } : {}),
      ...(monthStart !== 1 ? { monthStart } : {}),
    }),
    [categories, entries, months, contracts, currency, favorites, goals, rules, demo, accounts, debts, monthStart, projects],
  );
  /** Whether the book holds test data: Optionen offers to remove it instead of adding it. */
  const hasDemo = useMemo(() => hasDemoData(data), [data]);
  // Every change to the book goes to storage (debounced, written atomically; storage.ts).
  useEffect(() => { saver.save(data); }, [data]);
  // Contracts don't move money: the balances don't follow them. The main account's (plan 30).
  const balances = useMemo(
    () => computeBalances({ categories, entries, months, ...(accounts.length ? { accounts } : {}) }),
    [categories, entries, months, accounts],
  );
  /** The account shown, as long as it is still there; the main one otherwise. */
  const shownAccount: AccountView = accountView === ALL_ACCOUNTS
    ? (accounts.length > 1 ? ALL_ACCOUNTS : MAIN_ACCOUNT)
    : accounts.some(a => a.id === accountView) ? accountView : MAIN_ACCOUNT;

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
    // A carried transfer brings no category along (plan 30).
    const record = newMonth(key, copies.filter(e => !e.transfer).map(e => e.categoryId));
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

  /** Set (or with `undefined`, clear) a month's manual opening balance — the main account's, or another's (plan 30). */
  const setOpening = (key: MonthKey, opening: number | undefined, account: string = MAIN_ACCOUNT) => {
    ensureMonth(key);
    setMonths(prev => {
      const has = prev.some(m => m.key === key);
      const next = has ? prev : [...prev, newMonth(key)];
      return sortMonths(next.map(m => {
        if (m.key !== key) return m;
        if (account !== MAIN_ACCOUNT) {
          const { [account]: _old, ...others } = m.openings ?? {};
          const openings = opening === undefined ? others : { ...others, [account]: opening };
          const { openings: _drop, ...rest } = m;
          return Object.keys(openings).length ? { ...rest, openings } : rest;
        }
        const { opening: _drop, ...rest } = m;
        return opening === undefined ? rest : { ...rest, opening };
      }));
    });
  };

  /** Mark a month as matched against the bank (plan 10); returns the previous value for undo. */
  const setReconciled = (key: MonthKey, when: number | undefined): number | undefined => {
    const before = months.find(m => m.key === key)?.reconciledAt;
    setMonths(prev => prev.map(m => {
      if (m.key !== key) return m;
      const { reconciledAt: _drop, ...rest } = m;
      return when === undefined ? rest : { ...rest, reconciledAt: when };
    }));
    return before;
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
      // The interval belongs to a yearly entry, the last month to a recurring one (schema 24).
      if (!next.refund) delete next.refund;
      if (!next.tax) delete next.tax;
      if (!next.warrantyUntil) delete next.warrantyUntil;
      if (!next.returnUntil) delete next.returnUntil;
      if (!next.every || next.repeat !== 'yearly') delete next.every;
      if (!next.until || next.repeat === 'none') delete next.until;
      // Back on the main account: no account is stored (plan 30).
      if (!next.accountId || next.accountId === MAIN_ACCOUNT) delete next.accountId;
      if (!next.debtId) delete next.debtId;
      if (!next.files?.length) delete next.files;
      if (next.paid && !e.paid) next.paidAt = Date.now();
      if (!next.paid) delete next.paidAt;
      return next;
    }));
    // Made recurring in the editor: it goes into the months already started after it, too.
    if (before && patch.repeat && patch.repeat !== 'none' && (before.repeat === 'none' || before.every !== patch.every)) {
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

  /**
   * Split one payment into parts that share a new splitId (plan 21). The parts
   * inherit the original's month, date, paid, repeat and bank ref, so every
   * total and the import matching stay right. Returns the original for undo.
   */
  const splitEntry = (id: string, parts: { categoryId: string; name: string; amount: number }[]): { original: Entry; splitId: string } | null => {
    const original = entries.find(e => e.id === id);
    if (!original || parts.length < 2) return null;
    const splitId = original.splitId ?? uid();
    const now = Date.now();
    const made: Entry[] = parts.map((p, i) => ({
      id: uid(),
      month: original.month,
      categoryId: p.categoryId,
      name: p.name,
      amount: p.amount,
      paid: original.paid,
      repeat: original.repeat,
      seriesId: uid(),
      createdAt: now + i,
      splitId,
      ...(original.date ? { date: original.date } : {}),
      ...(original.paidAt ? { paidAt: original.paidAt } : {}),
      ...(original.ref ? { ref: original.ref } : {}),
    }));
    setEntries(prev => [...prev.filter(e => e.id !== id), ...made]);
    made.forEach(p => showCategory(original.month, p.categoryId));
    return { original, splitId };
  };

  /** Undo a split: drop the parts, put the original back. */
  const unsplit = (original: Entry, partSplitId: string) =>
    setEntries(prev => [...prev.filter(e => !(e.splitId === partSplitId && e.month === original.month)), ...(prev.some(e => e.id === original.id) ? [] : [original])]);

  const removeEntry = (id: string): { entry: Entry; index: number } | null => {
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return null;
    setEntries(prev => prev.filter(e => e.id !== id));
    return { entry: entries[index], index };
  };

  const restoreEntry = (entry: Entry, index: number) =>
    setEntries(prev => (prev.some(e => e.id === entry.id) ? prev : [...prev.slice(0, index), entry, ...prev.slice(index)]));

  /* ---------------------------------------------------- transfers (plan 30) */

  /** A transfer between two accounts: its two entries; a recurring one also in the months started after it. */
  const addTransfer = (d: TransferDraft): string => {
    ensureMonth(d.month);
    const now = Date.now();
    const pair = makeTransfer(d, now);
    const later = laterTransferCopies(data, pair, now + 2);
    setEntries(prev => [...prev, ...pair, ...later]);
    return pair[0].transfer!.pairId;
  };

  /** Change both sides of a transfer at once. Returns them as they were, for undo (`restoreEntries`). */
  const updateTransfer = (pairId: string, patch: Partial<Omit<TransferDraft, 'month'>>): Entry[] => {
    const before = entries.filter(e => e.transfer?.pairId === pairId);
    const now = Date.now();
    setEntries(prev => prev.map(e => {
      if (e.transfer?.pairId !== pairId) return e;
      const next: Entry = { ...e };
      if (patch.amount !== undefined) next.amount = patch.amount;
      if (patch.name !== undefined) next.name = patch.name || e.name;
      if (patch.repeat !== undefined) next.repeat = patch.repeat;
      if ('date' in patch) { if (patch.date) next.date = patch.date; else delete next.date; }
      if ('note' in patch) { if (patch.note) next.note = patch.note; else delete next.note; }
      if (patch.paid !== undefined) {
        next.paid = patch.paid;
        if (patch.paid && !e.paid) next.paidAt = now;
        if (!patch.paid) delete next.paidAt;
      }
      const account = e.transfer.direction === 'out' ? patch.from : patch.to;
      if (account !== undefined) { if (account === MAIN_ACCOUNT) delete next.accountId; else next.accountId = account; }
      return next;
    }));
    return before;
  };

  /** Remove a transfer's two entries; returns them for undo. */
  const removeTransfer = (pairId: string): Entry[] => {
    const gone = entries.filter(e => e.transfer?.pairId === pairId);
    setEntries(prev => prev.filter(e => e.transfer?.pairId !== pairId));
    return gone;
  };

  const restoreTransfer = (gone: Entry[]) => setEntries(prev => {
    const ids = new Set(prev.map(e => e.id));
    return [...prev, ...gone.filter(e => !ids.has(e.id))];
  });

  /* ----------------------------------------------------- accounts (plan 30) */

  /** A new account; the main one is written down with the first. Null once there are as many as fit. */
  const addAccount = (a: Omit<Account, 'id' | 'createdAt'>): Account | null => {
    if (accounts.length >= MAX_ACCOUNTS) return null;
    const created: Account = { ...a, id: uid(), createdAt: Date.now() };
    setAccounts(prev => [...(prev.length ? prev : [mainAccount()]), created]);
    return created;
  };

  const updateAccount = (id: string, patch: Partial<Omit<Account, 'id' | 'createdAt'>>) =>
    setAccounts(prev => {
      const list = prev.length ? prev : [mainAccount()];
      return list.map(a => (a.id === id ? { ...a, ...patch } : a));
    });

  interface RemovedAccount { account: Account; index: number; openings: Record<MonthKey, number>; before: Account[] }
  /** Remove an account nothing is booked on (and its opening balances). Null when it can't go. */
  const removeAccount = (id: string): RemovedAccount | null => {
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1 || !canDeleteAccount(data, id)) return null;
    const openings: Record<MonthKey, number> = {};
    for (const m of months) if (m.openings?.[id] !== undefined) openings[m.key] = m.openings[id];
    setAccounts(prev => {
      const left = prev.filter(a => a.id !== id);
      // Back to the main account alone, as it shipped: nothing about accounts is kept.
      return left.length === 1 && !left[0].name && left[0].emoji === mainAccount().emoji && left[0].hue === mainAccount().hue ? [] : left;
    });
    if (Object.keys(openings).length) {
      setMonths(prev => prev.map(m => {
        if (m.openings?.[id] === undefined) return m;
        const { [id]: _old, ...others } = m.openings;
        const { openings: _drop, ...rest } = m;
        return Object.keys(others).length ? { ...rest, openings: others } : rest;
      }));
    }
    if (accountView === id) setAccountView(MAIN_ACCOUNT);
    return { account: accounts[index], index, openings, before: accounts };
  };

  const restoreAccount = (r: RemovedAccount) => {
    setAccounts(prev => {
      if (prev.some(a => a.id === r.account.id)) return prev;
      const base = prev.length ? prev : [r.before[0]];
      return [...base.slice(0, r.index), r.account, ...base.slice(r.index)];
    });
    if (Object.keys(r.openings).length) {
      setMonths(prev => prev.map(m => (r.openings[m.key] === undefined ? m : { ...m, openings: { ...m.openings, [r.account.id]: r.openings[m.key] } })));
    }
  };

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
    setCategories(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      // How a budget counts goes with the budget (schema 25).
      if (!next.limit) { delete next.limitPer; delete next.rollover; delete next.rolloverFrom; }
      return next;
    }));

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
    applyMonthStart(fixed.monthStart);
    setCategories(fixed.categories);
    setEntries(fixed.entries);
    setMonths(fixed.months.length ? fixed.months : [{ key: monthKeyOf(), startedAt: Date.now(), categories: standardCategoryIds(fixed.categories) }]);
    setContracts(fixed.contracts ?? {});
    setCurrency(isSupportedCurrency(fixed.currency) ? fixed.currency : DEFAULT_CURRENCY);
    setFavorites(fixed.favorites ?? []);
    setGoals(fixed.goals ?? []);
    setRules(fixed.rules ?? []);
    setDemo(fixed.demo);
    setAccounts(fixed.accounts ?? []);
    setDebts(fixed.debts ?? []);
    setProjects(fixed.projects ?? []);
  };

  /** Load a version (an automatic snapshot) and return the book as it was, for undo. */
  const restoreData = (d: AppData): AppData => {
    const before = data;
    importData(d);
    return before;
  };

  /**
   * Optionen → Testdaten: a year of test data beside the user's own (src/demo.ts),
   * named in German when the app is in German, else in English. Returns the book as it was, for undo.
   */
  const addDemo = (): AppData => restoreData(addDemoData(data, { today: new Date(), language }));

  /** Take the test data out again; the user's own data stays. Returns the book as it was, for undo. */
  const removeDemo = (): AppData => restoreData(removeDemoData(data));

  /**
   * Optionen › Monat beginnt am (plan 32): every dated entry moves to the
   * month it now belongs to. Returns the book as it was, for undo.
   */
  const changeStart = (day: number): AppData => restoreData(changeMonthStart(data, day).data);

  const resetAll = () => {
    // Everything goes first (no copy of the old book stays behind): the data
    // file, its snapshots, pending reminders, and whatever later plans
    // registered with onWipe. The fresh book is saved after (plan 05).
    void wipeAll();
    void cancelAllReminders();
    const fresh = defaultCategories();
    applyMonthStart(1);
    setCategories(fresh);
    setEntries([]);
    setMonths([{ key: monthKeyOf(), startedAt: Date.now(), categories: standardCategoryIds(fresh) }]);
    setContracts({});
    setFavorites([]);
    setGoals([]);
    setRules([]);
    setDemo(undefined);
    setAccounts([]);
    setAccountView(MAIN_ACCOUNT);
    setDebts([]);
    setProjects([]);
    // Back to the defaults of a fresh install: the phone's currency, language
    // and appearance (US dollars, German and light when it gives none).
    setCurrency(systemCurrency());
    chooseLanguage(systemLanguage());
    setThemeMode('system');
    setIntroDone(false);
    setTipsDone(false);
    // A new book starts folded again (plan 39).
    setBalanceOpen(false);
    setEntryMore(false);
    setCalcKeys(false);
    setLastExport('');
    setCopyCardDismissed(false);
    // A fresh start shows the month reviews and hints again (opening a review
    // or hiding a hint was remembered across a reset).
    setReviewsSeen([]);
    setHintsHidden([]);
    try { localStorage.removeItem(K.lastExport); } catch { /* a preference */ }
  };

  /* ------------------------------------------------------------- contracts */

  /* ------------------------------------------------------------- favourites */

  /** Pin a favourite (plan 09); ignored once there are MAX_FAVORITES, or when an equal one exists. */
  const addFavorite = (fav: Omit<Favorite, 'id'>): Favorite | null => {
    if (favorites.length >= MAX_FAVORITES) return null;
    const exists = favorites.some(f => f.name === fav.name && f.categoryId === fav.categoryId && f.amount === fav.amount && f.repeat === fav.repeat);
    if (exists) return null;
    const created: Favorite = { id: uid(), ...fav };
    setFavorites(prev => [...prev, created]);
    return created;
  };

  /** Remove a favourite; returns it and its place, for undo. */
  const removeFavorite = (id: string): { favorite: Favorite; index: number } | null => {
    const index = favorites.findIndex(f => f.id === id);
    if (index === -1) return null;
    setFavorites(prev => prev.filter(f => f.id !== id));
    return { favorite: favorites[index], index };
  };

  const restoreFavorite = (favorite: Favorite, index: number) =>
    setFavorites(prev => (prev.some(f => f.id === favorite.id) ? prev : [...prev.slice(0, index), favorite, ...prev.slice(index)]));

  const reorderFavorites = (ids: string[]) =>
    setFavorites(prev => {
      const byId = new Map(prev.map(f => [f.id, f]));
      const ordered = ids.map(id => byId.get(id)).filter((f): f is Favorite => !!f);
      return [...ordered, ...prev.filter(f => !ids.includes(f.id))];
    });

  /* ---------------------------------------------------------- savings goals */

  /** Create a savings goal (plan 12); returns it. */
  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>): Goal => {
    const created: Goal = { id: uid(), createdAt: Date.now(), ...goal };
    setGoals(prev => [...prev, created]);
    return created;
  };

  const updateGoal = (id: string, patch: Partial<Omit<Goal, 'id'>>) =>
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const next = { ...g, ...patch };
      if (next.due === undefined) delete next.due;
      if (!next.start) delete next.start;
      if (!next.closedAt) delete next.closedAt;
      return next;
    }));

  /** Close a goal (reached or given up); it stays in history. `undefined` reopens it. */
  const closeGoal = (id: string, when: number | undefined = Date.now()) => updateGoal(id, { closedAt: when });

  /** Take money out of a goal (plan 12): lower its saved amount via `start`. Returns the previous start, for undo. */
  const withdrawGoal = (id: string, amount: number): number | undefined => {
    const before = goals.find(g => g.id === id)?.start;
    updateGoal(id, { start: (before ?? 0) - amount });
    return before;
  };

  interface RemovedGoal { goal: Goal; index: number }

  /** Delete a goal; its entries stay (they are still savings), only the link is dropped. Returns it for undo. */
  const removeGoal = (id: string): RemovedGoal | null => {
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return null;
    setGoals(prev => prev.filter(g => g.id !== id));
    // Unlink the entries (keep them as plain savings).
    setEntries(prev => prev.map(e => {
      if (e.goalId !== id) return e;
      const { goalId: _drop, ...rest } = e;
      return rest;
    }));
    return { goal: goals[index], index };
  };

  const restoreGoal = (r: RemovedGoal, entryIds: string[]) => {
    setGoals(prev => (prev.some(g => g.id === r.goal.id) ? prev : [...prev.slice(0, r.index), r.goal, ...prev.slice(r.index)]));
    if (entryIds.length) setEntries(prev => prev.map(e => (entryIds.includes(e.id) ? { ...e, goalId: r.goal.id } : e)));
  };

  /* ------------------------------------------------------- debts (plan 31) */

  const addDebt = (d: Omit<Debt, 'id' | 'createdAt'>): Debt => {
    const created: Debt = { id: uid(), createdAt: Date.now(), ...d };
    setDebts(prev => [...prev, created]);
    return created;
  };

  /** Change a debt; optional fields set to undefined are dropped. */
  const updateDebt = (id: string, patch: Partial<Omit<Debt, 'id' | 'createdAt'>>) =>
    setDebts(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next: Debt = { ...d, ...patch };
      if (!next.rate) delete next.rate;
      if (!next.payment) delete next.payment;
      if (!next.seriesId) delete next.seriesId;
      return next;
    }));

  interface RemovedDebt { debt: Debt; index: number; entryIds: string[] }
  /** Remove a debt; the entries that paid it stay, without the link. Returns what to undo. */
  const removeDebt = (id: string): RemovedDebt | null => {
    const index = debts.findIndex(d => d.id === id);
    if (index === -1) return null;
    const entryIds = entries.filter(e => e.debtId === id).map(e => e.id);
    setDebts(prev => prev.filter(d => d.id !== id));
    if (entryIds.length) setEntries(prev => prev.map(e => {
      if (e.debtId !== id) return e;
      const { debtId: _drop, ...rest } = e;
      return rest;
    }));
    return { debt: debts[index], index, entryIds };
  };

  const restoreDebt = (r: RemovedDebt) => {
    setDebts(prev => (prev.some(d => d.id === r.debt.id) ? prev : [...prev.slice(0, r.index), r.debt, ...prev.slice(r.index)]));
    if (r.entryIds.length) setEntries(prev => prev.map(e => (r.entryIds.includes(e.id) ? { ...e, debtId: r.debt.id } : e)));
  };

  /* ------------------------------------------- trips and projects (schema 28) */

  const addProject = (p: Omit<Project, 'id' | 'createdAt'>): Project => {
    const created: Project = { id: uid(), createdAt: Date.now(), ...p };
    setProjects(prev => [...prev, created]);
    return created;
  };

  /** Change a project; optional fields set to undefined are dropped, and a rate goes with its currency. */
  const updateProject = (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) =>
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next: Project = { ...p, ...patch };
      if (!next.budget) delete next.budget;
      if (!next.from) delete next.from;
      if (!next.to) delete next.to;
      if (!next.currency || !next.rate) { delete next.currency; delete next.rate; }
      if (!next.closed) delete next.closed;
      return next;
    }));

  /** Remove a project; its entries keep their tag. Returns what to undo. */
  const removeProject = (id: string): { project: Project; index: number } | null => {
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    setProjects(prev => prev.filter(p => p.id !== id));
    return { project: projects[index], index };
  };

  const restoreProject = (r: { project: Project; index: number }) =>
    setProjects(prev => (prev.some(p => p.id === r.project.id) ? prev : [...prev.slice(0, r.index), r.project, ...prev.slice(r.index)]));

  /* ----------------------------------------------------------- import rules */

  /** Create an import rule (plan 20); returns it. A dupe (same match + set) is reused. */
  const addRule = (rule: Omit<Rule, 'id' | 'createdAt'>): Rule => {
    const created: Rule = { id: uid(), createdAt: Date.now(), ...rule };
    setRules(prev => [...prev, created]);
    return created;
  };

  const updateRule = (id: string, patch: Partial<Omit<Rule, 'id'>>) =>
    setRules(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const removeRule = (id: string): { rule: Rule; index: number } | null => {
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return null;
    setRules(prev => prev.filter(r => r.id !== id));
    return { rule: rules[index], index };
  };

  const restoreRule = (r: Rule, index: number) =>
    setRules(prev => (prev.some(x => x.id === r.id) ? prev : [...prev.slice(0, index), r, ...prev.slice(index)]));

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

  // A language in a file of its own is fetched first, so the switch never
  // shows English in between; if it can't be fetched, nothing changes.
  const chooseLanguage = (lang: Language) => {
    loadLanguage(lang).then(() => setLanguage(lang), () => undefined);
  };

  return {
    language, setLanguage: chooseLanguage, themeMode, setThemeMode, accent, setAccent, storageError: saveFailed,
    introDone, dismissIntro: () => setIntroDone(true), restoreIntro: () => setIntroDone(false),
    tipsDone, dismissTips: () => setTipsDone(true),
    balanceOpen, setBalanceOpen, entryMore, setEntryMore, calcKeys, setCalcKeys,
    reminders, setReminders: (patch: Partial<ReminderPrefs>) => setReminders(r => normalizeReminderPrefs({ ...r, ...patch })),
    lockOn, setLockOn,
    hideAmounts, setHideAmounts,
    firstUse, reviewAsked, markReviewAsked: () => setReviewAsked(isoDay()),
    autoCategory, setAutoCategory,
    budgetNotes, setBudgetNotes,
    captureReview, setCaptureReview,
    taxMarks, setTaxMarks,
    tipState, closeTip: (id: TipId) => setTipState(s => closeTip(s, id)),
    knowGuide: () => setTipState(knowGuide),
    guideSeen, seeGuideTopic: (id: GuideTopicId) => setGuideSeen(prev => (prev.includes(id) ? prev : [...prev, id])),
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
    currency, setCurrency: (c: Currency) => setCurrency(c),
    data, categories, entries, months, balances,
    startMonth, pullRecurring, setOpening, setReconciled, removeMonth, restoreMonth, hideCategory, showCategory,
    addEntry, updateEntry, togglePaid, removeEntry, restoreEntry, moveEntry, restoreEntries, importEntries, undoImport,
    splitEntry, unsplit,
    addTransfer, updateTransfer, removeTransfer, restoreTransfer,
    accounts, addAccount, updateAccount, removeAccount, restoreAccount, accountView: shownAccount, setAccountView,
    addCategory, updateCategory, removeCategory, restoreCategory, setCategoryOrder, restoreDefaults,
    setCategories, importData, restoreData, resetAll, setContract,
    hasDemo, addDemo, removeDemo,
    favorites, addFavorite, removeFavorite, restoreFavorite, reorderFavorites,
    goals, addGoal, updateGoal, closeGoal, withdrawGoal, removeGoal, restoreGoal,
    rules, addRule, updateRule, removeRule, restoreRule,
    debts, addDebt, updateDebt, removeDebt, restoreDebt,
    projects, addProject, updateProject, removeProject, restoreProject,
    monthStart, changeStart,
    lastExport, markExported: () => setLastExport(isoDay()),
    copyCardDismissed, dismissCopyCard: () => setCopyCardDismissed(true),
    newId: uid,
  };
}

export type Store = ReturnType<typeof useAppStore>;
