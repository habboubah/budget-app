import { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, useTransform } from 'motion/react';
import { AlertTriangle, BarChart3, CalendarDays, PiggyBank, Settings } from 'lucide-react';
import { useAppStore } from './store';
import translations, { fmt } from './translations';
import { Category, Contract, Entry, EntryDraft, Favorite, MonthKey } from './types';
import { addMonths, balanceFor, carryCandidates, displayName, formatMoneyShort, isoDay, monthCategories, monthKeyOf, monthLabel, openBefore, uid } from './logic';
import { Insight, buildBook, highlights, monthReview, periodSeries, reviewCardMonth, reviewSeason, upToNow } from './insights';
import { MonthView } from './components/MonthView';
import { StatsRange } from './components/StatsView';
import { CategoryView } from './components/CategoryView';
import { PayeeSheet } from './components/PayeeSheet';
import { MonthReportView, ReviewCard } from './components/MonthReportView';
import { YearReviewView } from './components/YearReviewView';
import { Explain, ExplainSheet } from './components/ExplainSheet';
import { hintExplain } from './components/HintRows';
import { ShareImage, renderShareImage } from './shareImage';
import { shareImage } from './export';
import { SetupCard, TipsCard } from './components/SetupCard';
import { BudgetSheet } from './components/BudgetSheet';
import { DueSoonView } from './components/DueSoonView';
import { ContractsView } from './components/ContractsView';
import { ContractSheet } from './components/ContractSheet';
import { ContractItem, contractItems } from './contracts';
import { MonthPickerSheet } from './components/MonthPickerSheet';
import { EntrySheet, EntrySheetMode } from './components/EntrySheet';
import { OpeningSheet } from './components/OpeningSheet';
import { ReconcileSheet } from './components/ReconcileSheet';
import { MonthActionsMenu } from './components/MonthActionsMenu';
import { StatsView } from './components/StatsView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { CategoriesView } from './components/CategoriesView';
import { CategorySheet, CategorySheetMode } from './components/CategorySheet';
import { AddCategorySheet } from './components/AddCategorySheet';
import { TransferView } from './components/TransferView';
import { BackupsView } from './components/BackupsView';
import { FavoritesView } from './components/FavoritesView';
import { GoalsView } from './components/GoalsView';
import { GoalSheet, GoalSheetMode } from './components/GoalSheet';
import { RulesView } from './components/RulesView';
import { RuleSheet, RuleSheetMode } from './components/RuleSheet';
import { RemindersView } from './components/RemindersView';
import { LockScreen, PrivacyCover } from './components/LockScreen';
import { reminderPlan } from './reminders';
import { onReminderTap, remindersAvailable, syncReminders } from './notify';
import { LockKind, authenticate, lockKind as findLockKind } from './lock';
import { isNative } from './platform';
import { ExcelImportSheet } from './components/ExcelImportSheet';
import { readXlsx } from './xlsx';
import { ImportPlan, applyExcelImport, lastMonth, planExcelImport, replacedMonths } from './excelImport';
import { StatementImportSheet, ImportState } from './components/StatementImportSheet';
import { PlannedRow, allCategoryNames, applyStatement, csvForMapping, parseBankCsv, parseMappedCsv, parseStatementText, planStatement } from './statementImport';
import { readImageText, readTextFile } from './ocr';
import { FileTooLargeError, LIMITS } from './limits';
import { TabBar } from './ui/TabBar';
import { Toast, useToast } from './ui/Toast';
import { Menu } from './ui/Menu';
import { Confirm } from './ui/Sheet';
import { notifySuccess, notifyWarning, tapLight } from './ui/haptics';
import { useEdgeSwipeBack } from './ui/useEdgeSwipeBack';

type TabId = 'month' | 'stats' | 'insights' | 'settings';
/** Screens pushed over a tab's root. */
type PushedId = 'categories' | 'transfer' | 'backups' | 'favorites' | 'goals' | 'rules' | 'reminders' | 'dueSoon' | 'contracts' | 'category' | 'monthReport' | 'yearReview';
type ScreenId = TabId | PushedId;
/**
 * The tab a pushed screen belongs to. Those without one — a category, a
 * month's report, the year review — are pushed on the tab they are opened
 * from, so a report opened on Planen doesn't jump to Monat. Their parameter
 * lives in App state, one per screen.
 */
const HOME: Partial<Record<PushedId, TabId>> = { categories: 'settings', transfer: 'settings', backups: 'settings', favorites: 'settings', goals: 'insights', rules: 'settings', reminders: 'settings', dueSoon: 'month', contracts: 'insights' };
/** Away longer than this, and the lock asks again. */
const LOCK_AFTER_MS = 60_000;
/** `localStorage['spartopf-dev-season'] = '1'`: the year review's card out of season (screenshots, ui-review). */
const devSeason = (() => { try { return localStorage.getItem('spartopf-dev-season') === '1'; } catch { return false; } })();

export default function App() {
  const store = useAppStore();
  const { data, categories, entries, balances, language, themeMode } = store;
  const t = translations[language];
  const { toast, show, hide } = useToast();

  const [tab, setTab] = useState<TabId>('month');
  /** Per tab, the screen pushed over its root — each tab keeps its place, as on iOS. */
  const [stack, setStack] = useState<Partial<Record<TabId, PushedId>>>({});
  const push = (to: PushedId) => {
    const onTab = HOME[to] ?? tab;
    setTab(onTab);
    setStack(s => ({ ...s, [onTab]: to }));
  };
  const popTo = (onTab: TabId) => setStack(s => ({ ...s, [onTab]: undefined }));
  /** Every entry read once per change: what Statistik, Planen and the reports compute from. */
  const book = useMemo(() => buildBook(data, balances), [data, balances]);
  /** Statistik's period — the category screen follows it. */
  const [statsRange, setStatsRange] = useState<StatsRange>('6');
  /** The pushed screens' parameters. */
  const [shownCategory, setShownCategory] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState<MonthKey>(monthKeyOf);
  const [reviewYear, setReviewYear] = useState(() => String(new Date().getFullYear()));
  /** The payee sheet (a normalised name), and a "So berechnet" sheet. */
  const [payee, setPayee] = useState<string | null>(null);
  const [explain, setExplain] = useState<Explain | null>(null);
  /** "Alle Einträge" of a payee: the month page opens on this search. */
  const [searchSeed, setSearchSeed] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [categorySheet, setCategorySheet] = useState<CategorySheetMode>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  /** A category created from the month page also joins that month. */
  const [createForMonth, setCreateForMonth] = useState<MonthKey | null>(null);
  /** An Excel file read and planned, waiting for "import". */
  const [excel, setExcel] = useState<{ plan: ImportPlan; fileName: string } | null>(null);
  const excelInput = useRef<HTMLInputElement>(null);
  // Bank transactions: a CSV export or a photo, read, then checked in a sheet.
  const statementInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [statement, setStatement] = useState<ImportState>(null);
  /** A category with entries waiting for "really delete?". */
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  /** One month for both tabs: statistics open on the month being looked at. */
  const [month, setMonth] = useState<MonthKey>(monthKeyOf);
  const [entrySheet, setEntrySheet] = useState<EntrySheetMode>(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [goalSheet, setGoalSheet] = useState<GoalSheetMode>(null);
  const [ruleSheet, setRuleSheet] = useState<RuleSheetMode>(null);
  /** The scope menu when a category is corrected during an import (plan 20). */
  const [reclassify, setReclassify] = useState<{ anchor: HTMLElement; found: PlannedRow['found']; categoryId: string; name: string } | null>(null);
  /** The category whose monthly budget is being set. */
  const [budgetFor, setBudgetFor] = useState<Category | null>(null);
  /** The recurring cost whose contract details are being edited. */
  const [contractFor, setContractFor] = useState<ContractItem | null>(null);
  /** The month's "⋯" menu is open from this button. */
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
  /** The category the round add button opens with: the one used last. */
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  /**
   * The first run's "how much is on your account right now", while the setup
   * runs: what is entered in it as already paid happened before that look at
   * the bank, so it moves the month's opening instead of the balance now.
   * Ends with the setup, a reload, or an opening set by hand.
   */
  const [setupNow, setSetupNow] = useState<{ month: MonthKey; now: number } | null>(null);

  // ---- The lock. Locked from the very first render of a cold start, so not
  // one frame of the book shows; while locked only the lock screen renders.
  const native = isNative();
  const [locked, setLocked] = useState(() => native && store.lockOn);
  /** The app isn't active (app switcher, Control Center) and the lock is on: a plain cover. */
  const [covered, setCovered] = useState(false);
  /** What can unlock it here: Face ID, Touch ID, the passcode — or nothing. */
  const [lockKind, setLockKind] = useState<LockKind | null>(null);
  useEffect(() => { void findLockKind().then(setLockKind); }, []);
  const lockOn = useRef(store.lockOn);
  lockOn.current = store.lockOn;
  const authBusy = useRef(false);
  const unlock = async () => {
    if (authBusy.current) return;
    authBusy.current = true;
    const ok = await authenticate(t.lockReason, t.cancel);
    authBusy.current = false;
    if (ok) setLocked(false);
  };
  /** Switching the lock on asks once, so nobody locks themselves out of the app. */
  const setLock = async (on: boolean) => {
    if (!on) { store.setLockOn(false); return; }
    if (!lockKind) { show(t.lockUnavailable); return; }
    if (authBusy.current) return;
    authBusy.current = true;
    const ok = await authenticate(t.lockReason, t.cancel);
    authBusy.current = false;
    if (ok) store.setLockOn(true);
  };
  /** Bumped on every return to the app: the reminders' "now" moves on. */
  const [resumed, setResumed] = useState(0);
  const awaySince = useRef<number | null>(null);
  useEffect(() => {
    if (!native) return;
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        awaySince.current ??= Date.now();
        if (lockOn.current) setCovered(true);
        return;
      }
      const away = awaySince.current === null ? 0 : Date.now() - awaySince.current;
      awaySince.current = null;
      setCovered(false);
      setResumed(n => n + 1);
      // The Face ID prompt itself makes the app inactive for a moment; that isn't leaving.
      if (lockOn.current && away > LOCK_AFTER_MS && !authBusy.current) setLocked(true);
    });
    return () => { void handle.then(h => h.remove()); };
  }, [native]);

  const balance = balanceFor(balances, month);
  const prevBalance = balance.prevKey ? balances.find(b => b.key === balance.prevKey) : undefined;
  const candidates = useMemo(() => carryCandidates(data, month), [data, month]);
  /** The categories this month shows (its own list, plus any with entries). */
  const shownCategories = useMemo(() => monthCategories(data, month), [data, month]);
  const hiddenCategories = categories.filter(c => !shownCategories.includes(c));
  const openEarlier = useMemo(() => (balance.started ? openBefore(data, month) : []), [data, month, balance.started]);

  // The screen pushed on this tab, if any: the nav's single source of truth —
  // it drives the hardware back, the edge swipe, the scroll reset and the
  // slide direction, and must match `screenFor` below.
  const pushed = stack[tab] ?? null;
  const screen: ScreenId = pushed ?? tab;
  const depth = pushed ? 1 : 0;
  const back = () => popTo(tab);
  // The iOS back gesture on a pushed screen (touch, from the leading edge).
  const swipe = useEdgeSwipeBack(back, t.dir === 'rtl');
  // The parent under it: from 30 % behind to in place, a shade lifting as it comes.
  const swipeUnder = useTransform(swipe.x, v => (Math.abs(v) / Math.max(1, window.innerWidth) - 1) * 0.3 * window.innerWidth * (t.dir === 'rtl' ? -1 : 1));
  // (A share of the theme's scrim: 12 % black by day, a little deeper at night.)
  const swipeShade = useTransform(swipe.x, v => 0.375 * (1 - Math.min(1, Math.abs(v) / Math.max(1, window.innerWidth))));
  // Push slides in from the trailing edge, pop reveals the parent from the
  // leading edge; switching tabs just cross-fades; a swiped-away screen has
  // already shown its parent, so that pop doesn't animate again. Kept in a
  // ref guarded by `screen` so StrictMode's double render can't recompute it.
  const nav = useRef({ screen, depth, dir: 0, still: false });
  if (nav.current.screen !== screen) {
    const still = swipe.popped.current;
    swipe.popped.current = false;
    nav.current = { screen, depth, still, dir: depth === nav.current.depth ? 0 : depth > nav.current.depth ? 1 : -1 };
  }
  const dir = nav.current.dir;
  const rtl = t.dir === 'rtl' ? -1 : 1;

  // Another screen starts at its top. Another month does too on the month
  // page — but the statistics keep their place, so stepping through months
  // there doesn't throw the reader back up.
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  const shownMonth = useRef(month);
  useEffect(() => {
    if (shownMonth.current !== month && screen === 'month') window.scrollTo(0, 0);
    shownMonth.current = month;
  }, [month]);

  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', () => {
      if (pushed) popTo(tab);
      else if (tab !== 'month') setTab('month');
      else void CapacitorApp.minimizeApp();
    });
    return () => { void handle.then(h => h.remove()); };
  }, [pushed, tab]);

  // While the setup runs: opening = the balance given − what the month has settled since.
  useEffect(() => {
    if (!setupNow || store.introDone) return;
    const b = balances.find(x => x.key === setupNow.month);
    if (!b || b.prevKey) return;
    const want = setupNow.now - (b.incomePaid - b.expensePaid);
    if (!b.overridden || b.openingNow !== want) store.setOpening(setupNow.month, want);
  }, [setupNow, balances, store.introDone]);

  // Reminders: after a change settles, and on every return to the app, what is
  // pending on the device becomes the plan again (iPhone app only).
  useEffect(() => {
    if (!native) return;
    const id = setTimeout(() => { void syncReminders(reminderPlan(data, store.reminders, t)).catch(() => {}); }, 800);
    return () => clearTimeout(id);
  }, [data, store.reminders, language, resumed]);
  // A tap on one opens what it is about: its month, or the contracts.
  useEffect(() => onReminderTap(({ month: m, screen }) => {
    if (screen === 'contracts') { push('contracts'); return; }
    setMonth(m);
    setTab('month');
    setStack(s => ({ ...s, month: undefined }));
  }), []);

  // Status-bar glyphs must invert with the theme or they vanish into the bar.
  useEffect(() => {
    const resolved = document.documentElement.getAttribute('data-theme');
    void StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
  }, [themeMode]);

  const createEntry = (m: MonthKey, d: EntryDraft) => {
    const id = uid();
    const now = Date.now();
    const entry: Entry = { id, month: m, seriesId: id, createdAt: now, ...d, ...(d.paid ? { paidAt: now } : {}) };
    store.addEntry(entry);
    // The category stays in the month even if this entry is deleted again.
    store.showCategory(m, d.categoryId);
    // A new entry in a folded category unfolds it, so it can be seen landing.
    store.expand(d.categoryId);
    setLastCategory(d.categoryId);
    show(fmt(t.entryAdded, { name: d.name }));
  };

  /**
   * One-tap add from a favourite (plan 09): with an amount it saves straight
   * away (today, paid) with the undo toast; without one it opens the sheet
   * pre-filled, amount focused. `pin` always opens the sheet to change first.
   */
  const addFromFavorite = (fav: Favorite, pin = false) => {
    const categoryId = categories.some(c => c.id === fav.categoryId) ? fav.categoryId : 'extra';
    if (pin || fav.amount === undefined) {
      setEntrySheet({ kind: 'new', month, categoryId, preset: { name: fav.name, amount: fav.amount, repeat: fav.repeat } });
      return;
    }
    createEntry(month, { categoryId, name: fav.name, amount: fav.amount, paid: true, repeat: fav.repeat ?? 'none', date: isoDay() });
  };

  const deleteEntry = (id: string) => {
    const removed = store.removeEntry(id);
    if (!removed) return;
    notifyWarning();
    show(fmt(t.entryDeleted, { name: removed.entry.name }), {
      label: t.undo, run: () => store.restoreEntry(removed.entry, removed.index),
    });
  };

  const toggle = (e: Entry) => {
    if (e.paid) tapLight(); else notifySuccess();
    store.togglePaid(e.id);
  };

  /** Ticked off in "Demnächst fällig": it leaves the list, so the toast can bring it back. */
  const tickDue = (e: Entry) => {
    toggle(e);
    const income = data.categories.find(c => c.id === e.categoryId)?.kind === 'income';
    // Undo sets the state it had; a toggle here would read this render's (stale) entries.
    show(fmt(income ? t.dueReceived : t.duePaid, { name: e.name }), { label: t.undo, run: () => store.updateEntry(e.id, { paid: e.paid }) });
  };

  const startMonth = (carry: boolean) => {
    const n = store.startMonth(month, carry);
    notifySuccess();
    const name = monthLabel(month, t.locale);
    show(n ? fmt(t.monthStartedCarried, { month: name, n }) : fmt(t.monthStarted, { month: name }));
  };

  // The new month starts by itself, with last month's recurring entries: the
  // running month, or the next one, once the month before it is started.
  // Further ahead the start card stays (browsing a year forward shouldn't
  // create a year of months), and a month started here once isn't started
  // again in this session if it is deleted.
  const autoStarted = useRef(new Set<MonthKey>());
  useEffect(() => {
    if (balance.started || autoStarted.current.has(month)) return;
    const last = data.months[data.months.length - 1]?.key;
    if (!last || month <= last || month > addMonths(monthKeyOf(), 1)) return;
    if (month !== monthKeyOf() && month !== addMonths(last, 1)) return;
    autoStarted.current.add(month);
    const n = store.startMonth(month, true);
    if (n) show(fmt(t.monthStartedCarried, { month: monthLabel(month, t.locale), n }));
  }, [month, balance.started]);

  const deleteMonth = () => {
    const removed = store.removeMonth(month);
    if (!removed) return;
    notifyWarning();
    show(fmt(t.monthDeleted, { month: monthLabel(month, t.locale) }), {
      label: t.undo, run: () => store.restoreMonth(removed),
    });
  };

  const onExcelFile = async (f: File | undefined) => {
    if (excelInput.current) excelInput.current.value = '';
    if (!f) return;
    if (f.size > LIMITS.xlsxBytes) { show(t.importTooLarge); return; }
    try {
      const plan = planExcelImport(readXlsx(new Uint8Array(await f.arrayBuffer())), categories, language);
      if (!plan.months.length) { show(t.excelNoMonths); return; }
      setExcel({ plan, fileName: f.name });
    } catch (e) {
      show(e instanceof FileTooLargeError ? t[e.key] : t.excelInvalid);
    }
  };

  const onStatementFile = async (f: File | undefined, source: 'csv' | 'photo') => {
    if (statementInput.current) statementInput.current.value = '';
    if (photoInput.current) photoInput.current.value = '';
    if (!f) return;
    const limit = source === 'csv' ? LIMITS.csvBytes : LIMITS.imageBytes;
    if (f.size > limit) { show(t.importTooLarge); return; }
    setStatement({ phase: 'reading', source, progress: 0 });
    try {
      const readCsv = (text: string) => {
        const byTitle = parseBankCsv(text, store.currency);
        if (byTitle.length) return byTitle;
        // An app Spartopf doesn't recognise by its column titles: map by the
        // best guess (date / payee / amount), so it still imports (plan 20).
        const map = csvForMapping(text);
        return map && (map.guess.amount !== undefined || map.guess.debit !== undefined || map.guess.credit !== undefined) && map.guess.date !== undefined
          ? parseMappedCsv(text, map.guess, store.currency)
          : [];
      };
      const found = source === 'csv'
        ? readCsv(await readTextFile(f))
        : parseStatementText(
          await readImageText(f, p => setStatement(s => (s?.phase === 'reading' ? { ...s, progress: p } : s))),
          allCategoryNames(data.categories, language),
        );
      if (!found.length) { setStatement(null); show(t.importNothing); return; }
      setStatement({ phase: 'review', source, rows: planStatement(found, data) });
    } catch (e) {
      setStatement(null);
      show(e instanceof FileTooLargeError ? t[e.key] : t.importFailed);
    }
  };

  const confirmStatement = (rows: PlannedRow[]) => {
    const { add, pay } = applyStatement(rows, Date.now());
    const done = store.importEntries(add, pay);
    setStatement(null);
    notifySuccess();
    // Stay on this month if it got something; else show the newest month that did.
    const months = add.map(e => e.month);
    if (months.length && !months.includes(month)) setMonth(months.reduce((a, b) => (a > b ? a : b)));
    setTab('month');
    show(fmt(t.statementDone, { added: done.added.length, paid: done.paid.length }), { label: t.undo, run: () => store.undoImport(done) });
  };

  const importExcel = () => {
    if (!excel) return;
    const before = data;
    const introWasDone = store.introDone;
    store.importData(applyExcelImport(data, excel.plan));
    store.dismissIntro();
    const n = excel.plan.months.length;
    setMonth(lastMonth(excel.plan) ?? monthKeyOf());
    setTab('month');
    setStack({});
    setExcel(null);
    notifySuccess();
    show(fmt(t.excelDone, { n }), {
      label: t.undo,
      run: () => { store.importData(before); if (!introWasDone) store.restoreIntro(); setMonth(monthKeyOf()); },
    });
  };

  /**
   * Dragged (or Alt + ↑ / ↓): sorting within a category just happens; moving
   * into another one unfolds it and can be undone.
   */
  const moveEntry = (id: string, categoryId: string, index: number) => {
    const e = entries.find(x => x.id === id);
    const before = store.moveEntry(id, categoryId, index);
    if (!e || !before || e.categoryId === categoryId) return;
    tapLight();
    store.expand(categoryId);
    const c = categories.find(x => x.id === categoryId);
    show(fmt(t.movedTo, { name: e.name, category: c ? displayName(c.names, language) : '' }), {
      label: t.undo, run: () => store.restoreEntries(before),
    });
  };

  /** Take an empty category out of this month only; undoable. */
  const removeFromMonth = (c: Category) => {
    if (!store.hideCategory(month, c.id)) return;
    notifyWarning();
    const m = month;
    show(fmt(t.removedFromMonth, { name: displayName(c.names, language), month: monthLabel(m, t.locale) }), {
      label: t.undo, run: () => store.showCategory(m, c.id),
    });
  };

  /** An empty category just goes (with undo); one with entries asks first. */
  const askDeleteCategory = (c: Category) => {
    if (entries.some(e => e.categoryId === c.id)) setConfirmCategory(c);
    else deleteCategory(c);
  };

  const deleteCategory = (c: Category) => {
    const removed = store.removeCategory(c.id);
    if (!removed) return;
    notifyWarning();
    show(fmt(t.categoryDeleted, { name: displayName(c.names, language) }), {
      label: t.undo, run: () => store.restoreCategory(removed),
    });
  };

  const restoreDefaults = () => {
    const before = store.restoreDefaults();
    show(t.restoreDefaultsDone, { label: t.undo, run: () => store.setCategories(before) });
  };

  /** The contracts as Planen lists them: those of the newest month up to today. */
  const contractMonth = [...data.months].reverse().find(m => m.key <= monthKeyOf())?.key ?? data.months[data.months.length - 1]?.key;
  const contracts = useMemo(() => (contractMonth ? contractItems(data, contractMonth) : []), [data, contractMonth]);

  const saveContract = (item: ContractItem, contract: Contract | undefined) => {
    const before = store.setContract(item.seriesId, contract);
    show(fmt(contract ? t.contractSaved : t.contractRemoved, { name: item.name }), {
      label: t.undo, run: () => store.setContract(item.seriesId, before),
    });
  };

  const saveBudget = (c: Category, limit: number | undefined) => {
    const before = c.limit;
    store.updateCategory(c.id, { limit });
    const name = displayName(c.names, language);
    show(limit === undefined ? fmt(t.budgetRemoved, { name }) : fmt(t.budgetSaved, { name, amount: formatMoneyShort(limit, t.locale) }), {
      label: t.undo, run: () => store.updateCategory(c.id, { limit: before }),
    });
  };

  const quickAddCategory = (lastCategory && categories.some(c => c.id === lastCategory) ? lastCategory : null)
    ?? categories.find(c => c.kind === 'expense')?.id ?? categories[0]?.id;

  // ---- Statistik and Planen: hints, reports, the drill-down (STATISTICS_AND_INSIGHTS.md).
  const now = monthKeyOf();
  const statsMonths = useMemo(() => periodSeries(upToNow(book.points), statsRange).map(p => p.key), [book, statsRange]);
  const hints = useMemo(() => highlights(book, new Date(), store.hintsHidden), [book, store.hintsHidden]);
  const reviewFor = useMemo(() => reviewCardMonth(book, new Date(), store.reviewsSeen), [book, store.reviewsSeen]);
  const review = useMemo(() => (reviewFor ? monthReview(book, reviewFor, new Date()) : null), [book, reviewFor]);
  const season = devSeason ? now.slice(0, 4) : reviewSeason();
  const yearCard = season && !store.reviewsSeen.includes(season) && book.months.filter(k => k.startsWith(`${season}-`) && k <= now).length >= 6 ? season : null;

  const openCategory = (id: string) => { setShownCategory(id); push('category'); };
  /** Opening a month's report counts as having seen its review card. */
  const openReport = (m: MonthKey) => { setReportMonth(m); store.seeReview(m); push('monthReport'); };
  const openYear = (y: string) => { setReviewYear(y); store.seeReview(y); push('yearReview'); };
  const openMonthPage = (m: MonthKey) => { setMonth(m); setTab('month'); setStack(s => ({ ...s, month: undefined })); };
  /** A regular payment still missing: the entry sheet with its name, usual amount and category, open. */
  const addMissing = (i: Insight) => {
    const categoryId = i.categoryId && categories.some(c => c.id === i.categoryId) ? i.categoryId : quickAddCategory;
    if (!categoryId) return;
    setEntrySheet({ kind: 'new', month: now, categoryId, preset: { name: i.name, amount: i.values.usual, paid: false } });
  };
  const hintAction = (i: Insight) => {
    const a = i.action;
    if (!a) return;
    if (a.kind === 'category') openCategory(a.target);
    else if (a.kind === 'budget') { const c = categories.find(x => x.id === a.target); if (c) setBudgetFor(c); }
    else if (a.kind === 'month') openMonthPage(a.target);
    else if (a.kind === 'report') openReport(a.target);
    else if (a.kind === 'contracts') push('contracts');
    else addMissing(i);
  };
  /** Hidden for good (a view preference) — the toast can bring it back. */
  const hideHint = (i: Insight) => {
    store.hideHint(i.id);
    show(t.hintHidden, { label: t.undo, run: () => store.showHint(i.id) });
  };
  const hideReview = (id: string) => {
    store.seeReview(id);
    show(t.hintHidden, { label: t.undo, run: () => store.unseeReview(id) });
  };
  const categoryName = (id: string) => displayName(categories.find(c => c.id === id)?.names, language);
  /** *Als Budgets übernehmen*: one step, undone in one. */
  const applyBudgets = (list: { category: Category; amount: number }[]) => {
    const before = list.map(b => ({ id: b.category.id, limit: categories.find(c => c.id === b.category.id)?.limit }));
    for (const b of list) store.updateCategory(b.category.id, { limit: b.amount });
    notifySuccess();
    show(fmt(t.yearApplied, { n: list.length }), { label: t.undo, run: () => before.forEach(b => store.updateCategory(b.id, { limit: b.limit })) });
  };
  /** The year review as a picture: made here, on tap, and handed to the share sheet. */
  const shareYear = async (image: ShareImage) => {
    try {
      await shareImage(`spartopf-${reviewYear}.png`, await renderShareImage(image, t.dir === 'rtl'));
    } catch (e) {
      // Closing the share sheet isn't a failure.
      if (!/cancel|abort/i.test(String((e as Error)?.message ?? e)) && (e as Error)?.name !== 'AbortError') show(t.shareFailed);
    }
  };
  /** A payee's "Alle Einträge": the month page, searching every month for its name. */
  const searchAll = (name: string) => {
    setPayee(null);
    setSearchSeed(name);
    openMonthPage(now);
  };

  // ---- First run: the setup card on the first month, then the tips.
  const showSetup = !store.introDone && balance.started && !balance.prevKey;
  const kindOf = new Map(categories.map(c => [c.id, c.kind]));
  const monthEntries = entries.filter(e => e.month === month);
  const salaryCategory = categories.find(c => c.id === 'income' && c.kind === 'income') ?? categories.find(c => c.kind === 'income');
  const fixedCategory = categories.find(c => c.id === 'fixed' && c.kind === 'expense')
    ?? categories.find(c => c.kind === 'expense' && c.repeat === 'monthly') ?? categories.find(c => c.kind === 'expense');
  const finishSetup = () => { store.dismissIntro(); setSetupNow(null); };
  const setup = showSetup ? (
    <SetupCard
      t={t}
      balance={balance.overridden ? balance.now : undefined}
      salaryDone={monthEntries.some(e => kindOf.get(e.categoryId) === 'income')}
      fixedCount={monthEntries.filter(e => kindOf.get(e.categoryId) === 'expense' && e.repeat === 'monthly').length}
      canSalary={!!salaryCategory}
      canFixed={!!fixedCategory}
      // At once, in the same render as the anchor (the effect above keeps it so).
      onBalance={now => { store.setOpening(month, now - (balance.incomePaid - balance.expensePaid)); setSetupNow({ month, now }); }}
      onSalary={() => salaryCategory && setEntrySheet({ kind: 'new', month, categoryId: salaryCategory.id, preset: { name: t.setupSalaryName, repeat: 'monthly' } })}
      onFixed={() => fixedCategory && setEntrySheet({ kind: 'new', month, categoryId: fixedCategory.id, preset: { repeat: 'monthly' } })}
      onImportExcel={() => excelInput.current?.click()}
      onFinish={finishSetup}
    />
  ) : store.introDone && !store.tipsDone && balance.started && monthEntries.length > 0 && month === monthKeyOf() ? (
    <TipsCard t={t} onDismiss={store.dismissTips} />
  ) : null;

  /** Every screen, by name — the tab roots and what can be pushed over them. */
  const screenFor = (id: ScreenId) => (
    <>
        {id === 'contracts' ? (
          <ContractsView items={contracts} categories={categories} t={t} onBack={back} onOpen={setContractFor} />
        ) : id === 'category' ? (
          <CategoryView
            book={book}
            categoryId={shownCategory ?? ''}
            months={statsMonths}
            language={language}
            t={t}
            onBack={back}
            onBudget={setBudgetFor}
            onEntry={entry => setEntrySheet({ kind: 'edit', entry })}
            onPayee={setPayee}
            onContracts={() => push('contracts')}
          />
        ) : id === 'monthReport' ? (
          <MonthReportView book={book} month={reportMonth} language={language} t={t} onBack={back} onOpenMonth={openMonthPage} />
        ) : id === 'yearReview' ? (
          <YearReviewView
            book={book}
            year={reviewYear}
            language={language}
            t={t}
            onBack={back}
            onApplyBudgets={applyBudgets}
            onShare={image => void shareYear(image)}
          />
        ) : id === 'dueSoon' ? (
          <DueSoonView
            data={data}
            language={language}
            t={t}
            onBack={back}
            onEdit={entry => setEntrySheet({ kind: 'edit', entry })}
            onTick={tickDue}
          />
        ) : id === 'categories' ? (
          <CategoriesView
            categories={categories}
            entries={entries}
            language={language}
            t={t}
            onBack={back}
            onEdit={c => setCategorySheet({ kind: 'edit', category: c })}
            onNew={() => setCategorySheet({ kind: 'new' })}
            onDelete={askDeleteCategory}
            onReorder={store.setCategoryOrder}
            onRestoreDefaults={restoreDefaults}
          />
        ) : id === 'reminders' ? (
          <RemindersView data={data} prefs={store.reminders} t={t} onBack={back} onChange={store.setReminders} />
        ) : id === 'transfer' ? (
          <TransferView
            data={data}
            language={language}
            t={t}
            onBack={back}
            onImport={d => { store.importData(d); setMonth(monthKeyOf()); }}
            onImportExcel={() => excelInput.current?.click()}
            toast={label => show(label)}
            onExported={store.markExported}
            onOpenBackups={() => push('backups')}
            lastExport={store.lastExport}
            copyCardDismissed={store.copyCardDismissed}
            onDismissCopyCard={store.dismissCopyCard}
          />
        ) : id === 'backups' ? (
          <BackupsView
            data={data}
            t={t}
            onBack={back}
            onRestore={d => { const before = store.restoreData(d); setMonth(monthKeyOf()); return before; }}
            toast={(label, action) => show(label, action)}
          />
        ) : id === 'favorites' ? (
          <FavoritesView
            favorites={store.favorites}
            categories={categories}
            t={t}
            language={language}
            onReorder={store.reorderFavorites}
            onRemove={id => { const removed = store.removeFavorite(id); if (removed) show(t.favoriteRemoved, { label: t.undo, run: () => store.restoreFavorite(removed.favorite, removed.index) }); }}
            onBack={back}
          />
        ) : id === 'goals' ? (
          <GoalsView
            data={data}
            t={t}
            today={new Date()}
            onNew={() => setGoalSheet({ kind: 'new' })}
            onEdit={g => setGoalSheet({ kind: 'edit', goal: g })}
            onClose={g => { store.closeGoal(g.id); show(t.goalClosed, { label: t.undo, run: () => store.closeGoal(g.id, undefined) }); }}
            onReopen={g => store.closeGoal(g.id, undefined)}
            onWithdraw={(g, amount) => { const before = store.withdrawGoal(g.id, amount); show(t.goalWithdrawn, { label: t.undo, run: () => store.updateGoal(g.id, { start: before }) }); }}
            onDelete={g => {
              const removed = store.removeGoal(g.id);
              if (removed) {
                const entryIds = entries.filter(e => e.goalId === g.id).map(e => e.id);
                show(t.goalDeleted, { label: t.undo, run: () => store.restoreGoal(removed, entryIds) });
              }
            }}
            onBack={back}
          />
        ) : id === 'rules' ? (
          <RulesView
            rules={store.rules}
            categories={categories}
            language={language}
            t={t}
            onNew={() => setRuleSheet({ kind: 'new' })}
            onEdit={r => setRuleSheet({ kind: 'edit', rule: r })}
            onBack={back}
          />
        ) : id === 'settings' ? (
          <SettingsView
            language={language}
            themeMode={themeMode}
            accent={store.accent}
            onAccent={store.setAccent}
            currency={store.currency}
            onCurrency={store.setCurrency}
            t={t}
            categoryCount={categories.length}
            onLanguage={store.setLanguage}
            onTheme={store.setThemeMode}
            onCategories={() => push('categories')}
            favoriteCount={store.favorites.length}
            onFavorites={() => push('favorites')}
            ruleCount={store.rules.length}
            onRules={() => push('rules')}
            onTransfer={() => push('transfer')}
            onDeleteAll={() => { store.resetAll(); setMonth(monthKeyOf()); setTab('month'); setStack({}); show(t.deleteAllDone); }}
            lockKind={lockKind}
            lockOn={store.lockOn}
            onLock={on => void setLock(on)}
            reminders={remindersAvailable() ? store.reminders : null}
            onReminders={() => push('reminders')}
          />
        ) : id === 'stats' ? (
          <StatsView
            book={book}
            month={month}
            range={statsRange}
            onRange={setStatsRange}
            language={language}
            t={t}
            highlights={hints}
            yearCard={yearCard}
            onYear={openYear}
            onHideYear={hideReview}
            onMonth={setMonth}
            onHint={hintAction}
            onHideHint={hideHint}
            onHowHint={i => setExplain(hintExplain(i, t, categoryName))}
            onExplain={setExplain}
            onCategory={openCategory}
            onPayee={setPayee}
            onReport={openReport}
          />
        ) : id === 'insights' ? (
          <InsightsView
            book={book}
            language={language}
            t={t}
            hidden={store.hintsHidden}
            onBudget={setBudgetFor}
            onContract={setContractFor}
            onContractsAll={() => push('contracts')}
            onReport={openReport}
            onAdd={addMissing}
            onDue={() => push('dueSoon')}
            onGoals={() => push('goals')}
            onReserveGoal={(target, due) => setGoalSheet({ kind: 'new', preset: { name: t.reserveTitle, target, due } })}
            onExplain={setExplain}
          />
        ) : (
          <MonthView
            month={month}
            balance={balance}
            categories={shownCategories}
            entries={entries}
            candidates={candidates}
            openEarlier={openEarlier}
            setup={setup}
            review={review && month === now && balance.started && !showSetup ? (
              <ReviewCard review={review} t={t} onOpen={() => openReport(review.month)} onHide={() => hideReview(review.month)} />
            ) : null}
            searchSeed={searchSeed}
            onSearchSeedUsed={() => setSearchSeed(null)}
            // Nothing to show yet: the setup asks for the balance first.
            hideBalance={showSetup && !balance.overridden && monthEntries.length === 0}
            language={language}
            t={t}
            onMonth={setMonth}
            onStart={startMonth}
            onActions={setActionsAnchor}
            onAdd={categoryId => setEntrySheet({ kind: 'new', month, categoryId })}
            onEdit={entry => setEntrySheet({ kind: 'edit', entry })}
            onToggle={toggle}
            onDelete={e => deleteEntry(e.id)}
            onPickMonth={() => setMonthPickerOpen(true)}
            onOpening={() => setOpeningOpen(true)}
            reconciledAt={store.months.find(m => m.key === month)?.reconciledAt}
            onCategories={() => push('categories')}
            collapsed={store.collapsed}
            onCollapse={store.toggleCollapsed}
            onRemoveCategory={removeFromMonth}
            onAddCategory={() => setAddCategoryOpen(true)}
            noCategories={categories.length === 0}
            onMoveEntry={moveEntry}
            onBudget={setBudgetFor}
            onTickDue={tickDue}
            onDueAll={() => push('dueSoon')}
            allCategories={data.categories}
          />
        )}
    </>
  );

  // Locked: the lock screen instead of the app (after every hook, so their order holds).
  if (locked) return <LockScreen kind={lockKind} t={t} onUnlock={() => void unlock()} />;

  return (
    <div className="font-sans text-fg min-h-screen bg-bg overflow-x-clip">
      {covered && <PrivacyCover />}
      {store.storageError && (
        <div role="alert" className="bg-neg-dim text-neg px-4 py-2 safe-top">
          <div className="mx-auto max-w-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold flex-1">{t.storageError}</span>
          </div>
        </div>
      )}

      {/* While a pushed screen is swiped away: its parent underneath, sliding
          in from a little behind and coming out of a light shade. */}
      {pushed && swipe.swiping && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true" inert>
          <motion.div style={{ x: swipeUnder }}>{screenFor(tab)}</motion.div>
          <motion.div className="absolute inset-0 scrim" style={{ opacity: swipeShade }} />
        </div>
      )}

      <motion.div
        key={screen}
        // Enter-only: the old screen leaves on the spot and the new one comes
        // in over it. Fixed chrome (sheets, toasts, the tab bar) is portalled
        // to <body>, so this transform can never capture it.
        initial={nav.current.still ? false : dir === 0 ? { opacity: 0 } : dir === 1 ? { x: `${100 * rtl}%` } : { x: `${-30 * rtl}%`, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={dir === 0 ? { duration: 0.18 } : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        <motion.div
          style={pushed ? { x: swipe.x } : undefined}
          className={pushed && swipe.swiping ? `relative bg-bg min-h-screen ${rtl === 1 ? 'shadow-[-10px_0_30px_var(--t-shadow-2)]' : 'shadow-[10px_0_30px_var(--t-shadow-2)]'}` : undefined}
        >
          {screenFor(screen)}
        </motion.div>
      </motion.div>

      {/* The leading edge of a pushed screen: where the back swipe starts. Below
          the bar, so the back button stays whole; touch-action none, so the
          page doesn't scroll while the finger moves sideways. */}
      {pushed && (
        <div
          aria-hidden="true"
          className="fixed start-0 bottom-0 w-5 z-40 touch-none top-[calc(env(safe-area-inset-top)+60px)]"
          {...swipe.edge}
        />
      )}

      <TabBar
        label={t.appName}
        active={tab}
        // Tapping the active tab again pops back to its root, as on iOS.
        onChange={id => { if (id === tab) popTo(id); setTab(id); }}
        tabs={[
          { id: 'month', label: t.tabMonth, icon: CalendarDays },
          { id: 'stats', label: t.tabStats, icon: BarChart3 },
          { id: 'insights', label: t.tabInsights, icon: PiggyBank },
          { id: 'settings', label: t.tabSettings, icon: Settings },
        ]}
        // On every tab: a receipt can be noted down from anywhere, into the month shown.
        add={quickAddCategory && balance.started
          ? { label: t.addEntry, onClick: () => setEntrySheet({ kind: 'new', month, categoryId: quickAddCategory }) }
          : null}
      />

      <MonthPickerSheet
        open={monthPickerOpen}
        selected={month}
        balances={balances}
        t={t}
        onPick={setMonth}
        onClose={() => setMonthPickerOpen(false)}
      />

      <EntrySheet
        mode={entrySheet}
        // This month's categories first; the rest after them (picking one adds it to the month).
        categories={[...shownCategories, ...hiddenCategories]}
        featured={shownCategories.map(c => c.id)}
        entries={entries}
        language={language}
        t={t}
        onClose={() => setEntrySheet(null)}
        onCreate={createEntry}
        onSave={(id, d) => { store.updateEntry(id, d); setLastCategory(d.categoryId); }}
        onDelete={deleteEntry}
        favorites={store.favorites}
        onUseFavorite={addFromFavorite}
        onPinFavorite={fav => {
          const created = store.addFavorite(fav);
          show(created ? t.favoriteSaved : t.favoritesFull);
          return !!created;
        }}
        goals={store.goals}
      />

      <OpeningSheet
        open={openingOpen}
        month={month}
        current={balance.openingNow}
        overridden={balance.overridden}
        prevKey={balance.prevKey}
        carried={prevBalance?.now}
        t={t}
        onClose={() => setOpeningOpen(false)}
        onSave={v => {
          // Set by hand: the setup's balance doesn't steer the opening any more.
          setSetupNow(null);
          store.setOpening(month, v);
          show(v === undefined && balance.prevKey
            ? fmt(t.openingReset, { month: monthLabel(balance.prevKey, t.locale) })
            : t.openingSaved);
        }}
      />

      <ReconcileSheet
        open={reconcileOpen}
        month={month}
        now={balance.now}
        currentOpening={balance.openingNow}
        extraId="extra"
        incomeId={categories.find(c => c.kind === 'income')?.id ?? 'income'}
        t={t}
        onClose={() => setReconcileOpen(false)}
        onBook={draft => {
          const id = uid();
          const now = Date.now();
          const entry: Entry = { id, month, seriesId: id, createdAt: now, ...draft, paidAt: now };
          store.addEntry(entry);
          store.showCategory(month, draft.categoryId);
          const prevRec = store.setReconciled(month, now);
          show(t.reconcileDone, { label: t.undo, run: () => { store.removeEntry(id); store.setReconciled(month, prevRec); } });
        }}
        onAdjustOpening={opening => {
          const prevOpening = store.months.find(m => m.key === month)?.opening;
          const prevRec = store.setReconciled(month, Date.now());
          setSetupNow(null);
          store.setOpening(month, opening);
          show(t.reconcileDone, { label: t.undo, run: () => { store.setOpening(month, prevOpening); store.setReconciled(month, prevRec); } });
        }}
        onAgree={() => {
          const prevRec = store.setReconciled(month, Date.now());
          show(t.reconcileDone, { label: t.undo, run: () => store.setReconciled(month, prevRec) });
        }}
      />

      <GoalSheet
        mode={goalSheet}
        t={t}
        onClose={() => setGoalSheet(null)}
        onCreate={draft => store.addGoal(draft)}
        onSave={(gid, patch) => store.updateGoal(gid, patch)}
        onDelete={g => {
          const removed = store.removeGoal(g.id);
          if (removed) {
            const entryIds = entries.filter(e => e.goalId === g.id).map(e => e.id);
            show(t.goalDeleted, { label: t.undo, run: () => store.restoreGoal(removed, entryIds) });
          }
        }}
      />

      <RuleSheet
        mode={ruleSheet}
        categories={categories}
        language={language}
        t={t}
        onClose={() => setRuleSheet(null)}
        onCreate={draft => { store.addRule(draft); show(t.ruleCreated); }}
        onSave={(rid, patch) => store.updateRule(rid, patch)}
        onDelete={r => { const removed = store.removeRule(r.id); if (removed) show(t.ruleDeleted, { label: t.undo, run: () => store.restoreRule(removed.rule, removed.index) }); }}
      />

      {/* The scope of a corrected category during an import (plan 20). */}
      <Menu
        anchor={reclassify?.anchor ?? null}
        label={t.ruleScopeTitle}
        groups={reclassify ? [[
          { key: 'one', label: t.ruleScopeOne, onSelect: () => {} },
          { key: 'future', label: fmt(t.ruleScopeFuture, { name: reclassify.name }), onSelect: () => {
            store.addRule({ match: { field: 'payee', contains: reclassify.name }, set: { categoryId: reclassify.categoryId, name: reclassify.name } });
            show(t.ruleCreated);
          } },
          { key: 'all', label: t.ruleScopeAll, onSelect: () => {
            store.addRule({ match: { field: 'payee', contains: reclassify.name }, set: { categoryId: reclassify.categoryId, name: reclassify.name } });
            // Re-file every past entry whose name matches this payee.
            const key = reclassify.name.trim().toLowerCase();
            for (const e of entries) if (e.name.trim().toLowerCase() === key && e.categoryId !== reclassify.categoryId) store.updateEntry(e.id, { categoryId: reclassify.categoryId });
            show(t.ruleCreated);
          } },
        ]] : []}
        onClose={() => setReclassify(null)}
      />

      <ContractSheet
        item={contractFor}
        category={contractFor ? categories.find(c => c.id === contractFor.categoryId) : undefined}
        t={t}
        onClose={() => setContractFor(null)}
        onSave={saveContract}
      />

      <BudgetSheet
        category={budgetFor}
        data={data}
        language={language}
        t={t}
        onClose={() => setBudgetFor(null)}
        onSave={saveBudget}
        onHistory={c => openCategory(c.id)}
      />

      <PayeeSheet book={book} nameKey={payee} language={language} t={t} onClose={() => setPayee(null)} onSearch={searchAll} />

      <ExplainSheet explain={explain} t={t} onClose={() => setExplain(null)} />

      <MonthActionsMenu
        anchor={actionsAnchor}
        month={month}
        started={balance.started}
        prevKey={balance.prevKey}
        missing={balance.started ? candidates.length : 0}
        allCollapsed={categories.length > 0 && categories.every(c => store.collapsed.includes(c.id))}
        t={t}
        onClose={() => setActionsAnchor(null)}
        onOpening={() => setOpeningOpen(true)}
        onReconcile={() => setReconcileOpen(true)}
        onPull={() => { const n = store.pullRecurring(month); show(fmt(t.pulled, { n })); }}
        onCollapseAll={fold => store.setCollapsed(fold ? categories.map(c => c.id) : [])}
        onImportCsv={() => statementInput.current?.click()}
        onImportPhoto={() => photoInput.current?.click()}
        onDelete={deleteMonth}
        onReport={() => openReport(month)}
      />

      <CategorySheet
        mode={categorySheet}
        data={data}
        language={language}
        t={t}
        onClose={() => { setCategorySheet(null); setCreateForMonth(null); }}
        onCreate={c => {
          store.addCategory(c);
          if (createForMonth) store.showCategory(createForMonth, c.id);
        }}
        onSave={store.updateCategory}
        onDelete={askDeleteCategory}
      />

      <AddCategorySheet
        open={addCategoryOpen}
        month={month}
        hidden={hiddenCategories}
        language={language}
        t={t}
        onClose={() => setAddCategoryOpen(false)}
        onPick={c => {
          store.showCategory(month, c.id);
          store.expand(c.id);
          show(fmt(t.categoryAddedToMonth, { name: displayName(c.names, language) }));
        }}
        onCreate={() => { setCreateForMonth(month); setCategorySheet({ kind: 'new' }); }}
      />

      <input
        ref={excelInput}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onExcelFile(e.target.files?.[0])}
      />
      <input
        ref={statementInput}
        type="file"
        accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain"
        className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onStatementFile(e.target.files?.[0], 'csv')}
      />
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onStatementFile(e.target.files?.[0], 'photo')}
      />
      <StatementImportSheet
        state={statement}
        categories={data.categories}
        language={language}
        t={t}
        onClose={() => setStatement(null)}
        onConfirm={confirmStatement}
        onReclassified={(row, categoryId, anchor) => setReclassify({ anchor, found: row.found, categoryId, name: row.name })}
      />
      <ExcelImportSheet
        plan={excel?.plan ?? null}
        fileName={excel?.fileName ?? ''}
        replaced={excel ? replacedMonths(data, excel.plan) : []}
        categories={categories}
        language={language}
        t={t}
        onClose={() => setExcel(null)}
        onConfirm={importExcel}
      />

      <Confirm
        open={!!confirmCategory}
        title={fmt(t.deleteCategoryTitle, { name: confirmCategory ? displayName(confirmCategory.names, language) : '' })}
        body={fmt(t.deleteCategoryBody, { n: confirmCategory ? entries.filter(e => e.categoryId === confirmCategory.id).length : 0 })}
        confirmLabel={t.deleteCategory}
        cancelLabel={t.cancel}
        danger
        onCancel={() => setConfirmCategory(null)}
        onConfirm={() => { if (confirmCategory) deleteCategory(confirmCategory); setConfirmCategory(null); }}
      />

      <Toast toast={toast} onDone={hide} raised />
    </div>
  );
}
