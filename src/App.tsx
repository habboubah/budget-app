import { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, useTransform } from 'motion/react';
import { AlertTriangle, BarChart3, CalendarDays, PiggyBank, Settings } from 'lucide-react';
import { useAppStore } from './store';
import { fmt, plural, stringsFor } from './translations';
import { AccountKind, Category, Contract, Entry, EntryDraft, MonthKey } from './types';
import {
  ALL_ACCOUNTS, MAIN_ACCOUNT, REVIEW_RULE, ReviewMoment, accountName, accountTotals, accountView, accountsOf, addMonths, balanceFor, canDeleteAccount, carryCandidates,
  computeBalances, displayName, formatMoneyShort, formatPercent, hasAccounts, intoAccount, monthCategories, monthKeyOf, monthLabel, monthTransfers, openBefore, setAmountsHidden,
  shouldAskForReview, transferPair, uid,
  changeMonthStart,
} from './logic';
import { Insight, buildBook, debtPlan, debtsOverview, goalProgress, highlights, isActiveProject, monthReview, monthTrack, outlook, paymentSeries, projectsOverview, taxYear, taxYears, periodSeries, reviewCardMonth, reviewSeason, upToNow } from './insights';
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
import { BudgetHow, BudgetSheet } from './components/BudgetSheet';
import { DueSoonView } from './components/DueSoonView';
import { ContractsView } from './components/ContractsView';
import { ContractSheet } from './components/ContractSheet';
import { ContractItem, contractItems } from './contracts';
import { MonthPickerSheet } from './components/MonthPickerSheet';
import { EntrySheet, EntrySheetMode } from './components/EntrySheet';
import { OpeningSheet } from './components/OpeningSheet';
import { ReconcileSheet } from './components/ReconcileSheet';
import { SplitSheet } from './components/SplitSheet';
import { AccountsView } from './components/AccountsView';
import { AccountSheet, AccountSheetMode } from './components/AccountSheet';
import { MonthStartSheet } from './components/MonthStartSheet';
import { TransferSheet, TransferSheetMode } from './components/TransferSheet';
import { TransfersCard } from './components/TransfersCard';
import { DebtsCard, DebtsView } from './components/DebtsView';
import { DebtSheet, DebtSheetMode } from './components/DebtSheet';
import { MonthActionsMenu } from './components/MonthActionsMenu';
import { StatsView } from './components/StatsView';
import { InsightsView } from './components/InsightsView';
import { WhatIfSheet } from './components/WhatIfSheet';
import { ProjectsCard, ProjectsView } from './components/ProjectsView';
import { ProjectSheet, ProjectSheetMode } from './components/ProjectSheet';
import { TaxView } from './components/TaxView';
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
import { budgetCrossing, budgetStatus } from './budgets';
import { onReminderTap, remindersAvailable, syncReminders } from './notify';
import { LockKind, authenticate, deviceUnsecured, lockKind as findLockKind } from './lock';
import { devNative, isAndroid, isIos, isNative } from './platform';
import { SAVE_DEBOUNCE_MS, inDeviceBackup, saver, setInDeviceBackup } from './storage';
import { buildAmounts, buildSnapshot } from './native/snapshot';
import { inboxReview, inboxToEntries } from './native/inbox';
import { CaptureView } from './components/CaptureView';
import { HintCard } from './components/HintCard';
import { nextTip } from './tips';
import { DeepLink, parseDeepLink } from './native/deepLink';
import { makePdf, openExternal, readInbox, readSnapshot, removeAmounts, removeInbox, requestReview, setSecure, systemVersion, writeAmounts, writeSnapshot } from './native/bridge';
import { PrintReport, PrintSpec, ReportPdfSheet, reportFileName } from './components/PrintReport';
import { PLAY_URL, REVIEW_URL, feedbackMail, privacyUrl } from './links';
import { isDemoEntry } from './demo';
import { ExcelImportSheet } from './components/ExcelImportSheet';
import { readXlsx } from './xlsx';
import { ImportPlan, applyExcelImport, lastMonth, planExcelImport, replacedMonths } from './excelImport';
import { StatementImportSheet, ImportState } from './components/StatementImportSheet';
import { PlannedRow, allCategoryNames, applyStatement, csvForMapping, parseBankCsv, parseMappedCsv, parseStatementText, planStatement } from './statementImport';
import { readImageText, readTextFile } from './ocr';
import { readQrCode } from './qrScan';
import { PdfLockedError, readPdfLines } from './pdfText';
import { parseStatementLines } from './statementPdf';
import { giroCodeEntry, parseGiroCode } from './girocode';
import { FileTooLargeError, LIMITS } from './limits';
import { TabBar } from './ui/TabBar';
import { Toast, useToast } from './ui/Toast';
import { Menu } from './ui/Menu';
import { Confirm } from './ui/Sheet';
import { notifySuccess, notifyWarning, tapLight } from './ui/haptics';
import { useEdgeSwipeBack } from './ui/useEdgeSwipeBack';

type TabId = 'month' | 'stats' | 'insights' | 'settings';
/** Screens pushed over a tab's root. */
type PushedId = 'categories' | 'transfer' | 'backups' | 'favorites' | 'goals' | 'rules' | 'reminders' | 'dueSoon' | 'contracts' | 'category' | 'monthReport' | 'yearReview' | 'accounts' | 'debts' | 'capture' | 'projects' | 'tax';
type ScreenId = TabId | PushedId;
/**
 * The tab a pushed screen belongs to. Those without one — a category, a
 * month's report, the year review — are pushed on the tab they are opened
 * from, so a report opened on Planen doesn't jump to Monat. Their parameter
 * lives in App state, one per screen.
 */
const HOME: Partial<Record<PushedId, TabId>> = { categories: 'settings', transfer: 'settings', backups: 'settings', favorites: 'settings', goals: 'insights', rules: 'settings', reminders: 'settings', dueSoon: 'month', contracts: 'insights', accounts: 'settings', debts: 'settings', capture: 'settings', projects: 'settings', tax: 'settings' };
/** Away longer than this, and the lock asks again. */
const LOCK_AFTER_MS = 60_000;
/** How long the eye on the balance card shows hidden amounts (plan 06). */
const PEEK_MS = 30_000;
/** `localStorage['spartopf-dev-season'] = '1'`: the year review's card out of season (screenshots, ui-review). */
const devSeason = (() => { try { return localStorage.getItem('spartopf-dev-season') === '1'; } catch { return false; } })();

/**
 * Sets *Beträge verbergen* for what renders after it (plan 28): React renders
 * siblings in order, so a pair of these around the print copy shows its
 * amounts while everything else stays as the switch says.
 */
function AmountsShown({ hidden = false }: { hidden?: boolean }) {
  setAmountsHidden(hidden);
  return null;
}

export default function App() {
  const store = useAppStore();
  const { data, categories, entries, language, themeMode } = store;
  const t = stringsFor(language);
  /* Accounts (plan 30): nothing about them shows until the book has a second one. */
  const multi = hasAccounts(data);
  const accounts = accountsOf(data);
  const account = store.accountView;
  /** What the month page shows: the shown account's entries, transfers aside. */
  const view = useMemo(() => accountView(data, account), [data, account]);
  /** Every account's entries, transfers aside: what Statistik, Planen and the reports read. */
  const allView = useMemo(() => accountView(data, ALL_ACCOUNTS), [data]);
  const allBalances = useMemo(() => (multi ? computeBalances(data, ALL_ACCOUNTS) : store.balances), [data, multi, store.balances]);
  /** The shown account's balances (the main account's in a book with one). */
  const balances = useMemo(
    () => (!multi || account === MAIN_ACCOUNT ? store.balances : account === ALL_ACCOUNTS ? allBalances : computeBalances(data, account)),
    [data, multi, account, store.balances, allBalances],
  );
  /** Where a new entry, a bank import or an opening goes: the shown account, or the main one for "Alle Konten". */
  const target = account === ALL_ACCOUNTS ? MAIN_ACCOUNT : account;
  const nameOf = (id: string) => { const a = accounts.find(x => x.id === id); return a ? accountName(a, t.accountMain) : t.accountMain; };
  const { toast, show: showToast, hide } = useToast();
  /**
   * Plan 15: this session had trouble — an error, a failed import, an undo —
   * so it is no moment to ask for a rating. Every undo goes through `show`.
   */
  const trouble = useRef(false);
  const show: typeof showToast = (label, action) => showToast(label, action && action.label === t.undo
    ? { ...action, run: () => { trouble.current = true; action.run(); } }
    : action);

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
  const book = useMemo(() => buildBook(allView, allBalances), [allView, allBalances]);
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
  const invoiceInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [statement, setStatement] = useState<ImportState>(null);
  /** A category with entries waiting for "really delete?". */
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  /** One month for both tabs: statistics open on the month being looked at. */
  const [month, setMonth] = useState<MonthKey>(monthKeyOf);
  const [entrySheet, setEntrySheet] = useState<EntrySheetMode>(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [splitEntry, setSplitEntry] = useState<Entry | null>(null);
  const [goalSheet, setGoalSheet] = useState<GoalSheetMode>(null);
  /** *Kann ich mir das leisten?* (Planen › Ausblick). */
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const ahead = useMemo(() => (whatIfOpen ? outlook(book) : null), [whatIfOpen, book]);
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
  // Android: no screenshots and a blank card in Recents while the lock is on (plan 23).
  useEffect(() => { void setSecure(store.lockOn); }, [store.lockOn]);
  lockOn.current = store.lockOn;
  const authBusy = useRef(false);
  const unlock = async () => {
    if (authBusy.current) return;
    authBusy.current = true;
    // The passcode was removed since the lock went on: nothing can check
    // anyone any more, so the lock goes off rather than locking the owner out.
    // (Removing a passcode needs the passcode, so this opens nothing to a stranger.)
    if (await deviceUnsecured()) {
      authBusy.current = false;
      store.setLockOn(false);
      setLocked(false);
      show(t.lockUnavailable);
      return;
    }
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
  // ---- Beträge verbergen (plan 06). Every money formatter reads one switch
  // (logic.ts), set here before any screen renders. The eye on the balance
  // card shows them for PEEK_MS, or until the app leaves the screen.
  const [peek, setPeek] = useState(false);
  // ---- The PDF report (plan 28): drawn a second time for print.
  const [printing, setPrinting] = useState<PrintSpec | null>(null);
  const [pdfFor, setPdfFor] = useState<Omit<PrintSpec, 'entries'> | null>(null);
  setAmountsHidden(store.hideAmounts && !peek);
  useEffect(() => {
    if (!peek) return;
    const end = window.setTimeout(() => setPeek(false), PEEK_MS);
    const away = () => { if (document.visibilityState === 'hidden') setPeek(false); };
    document.addEventListener('visibilitychange', away);
    return () => { window.clearTimeout(end); document.removeEventListener('visibilitychange', away); };
  }, [peek]);
  const hiding = useRef(store.hideAmounts);
  hiding.current = store.hideAmounts;

  // ---- Im iPhone-Backup sichern (plan 06): where the book's folder is, so
  // not a preference that could get lost. The switch follows the move.
  // (The dev flag shows the row on the web, for screenshots; nothing moves there.)
  const [deviceBackup, setDeviceBackup] = useState(() => inDeviceBackup() ?? (devNative() ? true : null));
  const [backupMoving, setBackupMoving] = useState(false);
  const switchDeviceBackup = async (on: boolean) => {
    setBackupMoving(true);
    try {
      await setInDeviceBackup(on);
      setDeviceBackup(on);
    } catch {
      show(t.deviceBackupFailed);
      notifyWarning();
    }
    setBackupMoving(false);
  };

  /** Bumped on every return to the app: the reminders' "now" moves on. */
  const [resumed, setResumed] = useState(0);
  const awaySince = useRef<number | null>(null);
  useEffect(() => {
    if (!native) return;
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        awaySince.current ??= Date.now();
        // The app switcher's snapshot shows nothing to read: with the lock on,
        // and with amounts hidden (a peek ends here).
        if (lockOn.current || hiding.current) setCovered(true);
        setPeek(false);
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
  // The balance card's line: the shown account's month, day by day.
  const track = useMemo(() => monthTrack(data, balance, account), [data, balance, account]);
  const prevBalance = balance.prevKey ? balances.find(b => b.key === balance.prevKey) : undefined;
  const candidates = useMemo(() => carryCandidates(data, month), [data, month]);
  /** The categories this month shows (its own list, plus any with entries). */
  const shownCategories = useMemo(() => monthCategories(view, month), [view, month]);
  const hiddenCategories = categories.filter(c => !shownCategories.includes(c));
  const openEarlier = useMemo(() => (balance.started ? openBefore(view, month) : []), [view, month, balance.started]);
  /** The month's transfers (plan 30): every side, and the ones the shown account takes part in. */
  const monthSides = useMemo(() => (multi ? monthTransfers(data, month, ALL_ACCOUNTS) : []), [data, month, multi]);
  const transfers = account === ALL_ACCOUNTS ? monthSides : monthSides.filter(e => (e.accountId ?? MAIN_ACCOUNT) === account);
  const [transferSheet, setTransferSheet] = useState<TransferSheetMode>(null);
  const [accountSheet, setAccountSheet] = useState<AccountSheetMode>(null);
  const totals = useMemo(() => accountTotals(data, monthKeyOf()), [data]);
  /** Debts and loans (plan 31): every one's plan, and what can pay them. */
  const debts = useMemo(() => debtsOverview(data), [data]);
  const [debtSheet, setDebtSheet] = useState<DebtSheetMode>(null);
  // Trips and projects (schema 28): every entry of every account counts, by its tag.
  const projects = useMemo(() => projectsOverview(allView), [allView]);
  const activeProjects = useMemo(() => store.projects.filter(p => isActiveProject(p)), [store.projects]);
  const [projectSheet, setProjectSheet] = useState<ProjectSheetMode>(null);
  // The tax list (schema 29): the years with something marked, and the one shown.
  const taxYearList = useMemo(() => taxYears(allView), [allView]);
  const [taxYearShown, setTaxYearShown] = useState('');
  const taxYearKey = taxYearList.includes(taxYearShown) ? taxYearShown : taxYearList[0] ?? String(new Date().getFullYear());
  const taxList = useMemo(() => taxYear(allView, taxYearKey), [allView, taxYearKey]);
  const anyTaxMark = useMemo(() => data.entries.some(e => e.tax), [data.entries]);
  const editProject = (id: string) => {
    const status = projects.find(s => s.project.id === id);
    if (status) setProjectSheet({ kind: 'edit', status });
  };
  const series = useMemo(() => (debtSheet ? paymentSeries(data) : []), [data, debtSheet]);

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
      // Android's back (plan 23): first whatever is open on top — a sheet, a
      // menu, a confirmation, the receipt — the way Escape closes it.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        return;
      }
      if (pushed) popTo(tab);
      else if (tab !== 'month') setTab('month');
      else void CapacitorApp.minimizeApp();
    });
    return () => { void handle.then(h => h.remove()); };
  }, [pushed, tab]);

  // While the setup runs: opening = the balance given − what the month has settled since.
  useEffect(() => {
    if (!setupNow || store.introDone) return;
    const b = store.balances.find(x => x.key === setupNow.month);
    if (!b || b.prevKey) return;
    const want = setupNow.now - (b.incomePaid - b.expensePaid);
    if (!b.overridden || b.openingNow !== want) store.setOpening(setupNow.month, want);
  }, [setupNow, store.balances, store.introDone]);

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

  /**
   * A word when a change takes a category's budget to 80 % or over it — in
   * the running month or a later one, and without an amount. `after`: the
   * entries as they are once the change is in.
   */
  const budgetNote = (after: Entry[], categoryId: string, m: MonthKey): string | null => {
    const c = categories.find(x => x.id === categoryId);
    if (!store.budgetNotes || !c || m < monthKeyOf(new Date())) return null;
    const now = budgetStatus(after, c, m);
    const mark = budgetCrossing(budgetStatus(data.entries, c, m), now);
    if (!mark || !now) return null;
    const name = displayName(c.names, language);
    return mark === 100 ? fmt(t.budgetNoteOver, { name }) : fmt(t.budgetNote80, { name, p: formatPercent(Math.round((now.spent / now.limit) * 100), t.locale) });
  };

  const createEntry = (m: MonthKey, d: EntryDraft) => {
    const id = uid();
    const now = Date.now();
    const entry: Entry = { id, month: m, seriesId: id, createdAt: now, ...d, ...(d.paid ? { paidAt: now } : {}) };
    if (!entry.accountId) delete entry.accountId;
    if (!entry.debtId) delete entry.debtId;
    if (!entry.files?.length) delete entry.files;
    if (!entry.refund) delete entry.refund;
    if (!entry.tax) delete entry.tax;
    if (!entry.warrantyUntil) delete entry.warrantyUntil;
    if (!entry.returnUntil) delete entry.returnUntil;
    if (!entry.every) delete entry.every;
    if (!entry.until) delete entry.until;
    store.addEntry(entry);
    // The category stays in the month even if this entry is deleted again.
    store.showCategory(m, d.categoryId);
    // A new entry in a folded category unfolds it, so it can be seen landing.
    store.expand(d.categoryId);
    setLastCategory(d.categoryId);
    show(budgetNote([...data.entries, entry], d.categoryId, m) ?? fmt(t.entryAdded, { name: d.name }));
  };

  /**
   * One-tap add from a favourite (plan 09): with an amount it saves straight
   * away (today, paid) with the undo toast; without one it opens the sheet
   * pre-filled, amount focused. `pin` always opens the sheet to change first.
   */
  const deleteEntry = (id: string) => {
    const removed = store.removeEntry(id);
    if (!removed) return;
    notifyWarning();
    show(fmt(t.entryDeleted, { name: removed.entry.name }), {
      label: t.undo, run: () => store.restoreEntry(removed.entry, removed.index),
    });
  };

  /* ---- Transfers and accounts (plan 30). */
  const newTransfer = () => setTransferSheet({ kind: 'new', month, from: target });
  const editTransfer = (pairId: string) => { const pair = transferPair(entries, pairId); setTransferSheet({ kind: 'edit', out: pair.out, in: pair.in }); };
  const toggleTransfer = (pairId: string, paid: boolean) => {
    if (paid) notifySuccess(); else tapLight();
    store.updateTransfer(pairId, { paid });
  };
  const deleteTransfer = (pairId: string) => {
    const gone = store.removeTransfer(pairId);
    if (!gone.length) return;
    notifyWarning();
    show(t.transferDeleted, { label: t.undo, run: () => store.restoreTransfer(gone) });
  };
  const addAccount = (kind: AccountKind) => {
    if (accounts.length >= 12) { show(t.accountsFull); return; }
    setAccountSheet({ kind: 'new', accountKind: kind });
  };
  const editDebt = (id: string) => {
    const d = store.debts.find(x => x.id === id);
    if (d) setDebtSheet({ kind: 'edit', debt: d, plan: debtPlan(data, d) });
  };
  const editAccount = (id: string) => {
    const a = accounts.find(x => x.id === id);
    if (a) setAccountSheet({ kind: 'edit', account: a, deletable: canDeleteAccount(data, id) });
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

  /** Optionen → Testdaten: a year of test data beside the user's own, shown on the running month. Undoable. */
  const addDemo = () => {
    const before = store.addDemo();
    notifySuccess();
    setMonth(monthKeyOf());
    setTab('month');
    setStack({});
    show(t.demoAdded, { label: t.undo, run: () => store.restoreData(before) });
  };

  /** Take the test data out again (confirmed in Optionen); the user's own data stays. Undoable. */
  const removeDemo = () => {
    const before = store.removeDemo();
    notifyWarning();
    setMonth(monthKeyOf());
    show(t.demoRemoved, { label: t.undo, run: () => store.restoreData(before) });
  };

  /** Optionen › Monat beginnt am (plan 32): every dated entry to its new month, shown on the running one. Undoable. */
  const [monthStartOpen, setMonthStartOpen] = useState(false);
  const changeStart = (day: number) => {
    const before = store.changeStart(day);
    notifySuccess();
    setMonth(monthKeyOf());
    show(fmt(t.monthStartDone, { day }), { label: t.undo, run: () => { store.restoreData(before); setMonth(monthKeyOf()); } });
  };

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
      trouble.current = true;
      show(e instanceof FileTooLargeError ? t[e.key] : t.excelInvalid);
    }
  };

  /**
   * An invoice's QR code (GiroCode) from a photo or a screenshot, read on the
   * device: the entry sheet opens with the payee, the amount and — as the note
   * — the reference and IBAN, still open. Nothing is saved before *Sichern*.
   */
  const onInvoiceFile = async (f: File | undefined) => {
    if (invoiceInput.current) invoiceInput.current.value = '';
    if (!f || !quickAddCategory) return;
    try {
      const text = await readQrCode(f);
      const code = text ? parseGiroCode(text) : null;
      if (!code) { show(text ? t.qrNotInvoice : t.qrNone); return; }
      const { name, amount, note } = giroCodeEntry(code);
      // An amount in another currency than the book's is left for the user to type.
      const mine = !code.currency || code.currency === (data.currency ?? 'EUR');
      setEntrySheet({ kind: 'new', month, categoryId: quickAddCategory, preset: { name, paid: false, note, ...(amount && mine ? { amount } : {}) } });
    } catch (e) {
      show(e instanceof FileTooLargeError ? t[e.key] : t.qrNone);
    }
  };

  const onStatementFile = async (f: File | undefined, from: 'csv' | 'photo' | 'pdf') => {
    if (statementInput.current) statementInput.current.value = '';
    if (photoInput.current) photoInput.current.value = '';
    if (pdfInput.current) pdfInput.current.value = '';
    if (!f) return;
    // A statement's PDF is read like a CSV from here on: same review sheet, same matching.
    const source = from === 'photo' ? 'photo' : 'csv';
    const limit = from === 'csv' ? LIMITS.csvBytes : from === 'pdf' ? LIMITS.statementPdfBytes : LIMITS.imageBytes;
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
      const found = from === 'pdf' ? parseStatementLines(await readPdfLines(f))
        : source === 'csv'
        ? readCsv(await readTextFile(f))
        : parseStatementText(
          await readImageText(f, p => setStatement(s => (s?.phase === 'reading' ? { ...s, progress: p } : s))),
          allCategoryNames(data.categories, language),
        );
      if (!found.length) { setStatement(null); show(t.importNothing); return; }
      // Matched and checked against the account it goes into (plan 30).
      setStatement({ phase: 'review', source, rows: planStatement(found, accountView(data, target)) });
    } catch (e) {
      setStatement(null);
      trouble.current = true;
      show(e instanceof FileTooLargeError ? t[e.key] : e instanceof PdfLockedError ? t.pdfLocked : t.importFailed);
    }
  };

  const confirmStatement = (rows: PlannedRow[]) => {
    const { add, pay } = applyStatement(rows, Date.now(), undefined, undefined, categories);
    const done = store.importEntries(intoAccount(add, target), pay);
    // Looked through (plan 19): taken over or left out, the captured payments leave the inbox once the book is saved.
    const ids = reviewIds.current;
    reviewIds.current = null;
    if (ids) {
      setCaptured(0);
      void (async () => {
        await new Promise(resolve => window.setTimeout(resolve, SAVE_DEBOUNCE_MS + 50));
        await saver.flush();
        await removeInbox(ids);
      })();
    }
    setStatement(null);
    notifySuccess();
    // Stay on this month if it got something; else show the newest month that did.
    const months = add.map(e => e.month);
    if (months.length && !months.includes(month)) setMonth(months.reduce((a, b) => (a > b ? a : b)));
    setTab('month');
    show(fmt(t.statementDone, { added: done.added.length, paid: done.paid.length }), { label: t.undo, run: () => store.undoImport(done) });
    if (done.added.length >= REVIEW_RULE.bigImport) goodMoment('bigImport');
  };

  const importExcel = () => {
    if (!excel) return;
    const before = data;
    const introWasDone = store.introDone;
    const after = applyExcelImport(data, excel.plan);
    store.importData(after);
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
    if (after.entries.length - before.entries.length >= REVIEW_RULE.bigImport) goodMoment('bigImport');
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

  const saveBudget = (c: Category, limit: number | undefined, how?: BudgetHow) => {
    const before = { limit: c.limit, limitPer: c.limitPer, rollover: c.rollover, rolloverFrom: c.rolloverFrom };
    // Per year, or with the rest carried on from this month (schema 25) — a rollover that was on keeps its start.
    const rollover = limit !== undefined && how?.per !== 'year' && !!how?.rollover;
    store.updateCategory(c.id, {
      limit,
      limitPer: limit !== undefined && how?.per === 'year' ? 'year' : undefined,
      rollover: rollover || undefined,
      rolloverFrom: rollover ? (c.rollover && c.rolloverFrom) || monthKeyOf(new Date()) : undefined,
    });
    const name = displayName(c.names, language);
    show(limit === undefined ? fmt(t.budgetRemoved, { name }) : fmt(t.budgetSaved, { name, amount: formatMoneyShort(limit, t.locale) }), {
      label: t.undo, run: () => store.updateCategory(c.id, before),
    });
  };

  const quickAddCategory = (lastCategory && categories.some(c => c.id === lastCategory) ? lastCategory : null)
    ?? categories.find(c => c.kind === 'expense')?.id ?? categories[0]?.id;

  // ---- The native bridge (plan 14): what widgets, Siri, Shortcuts and the
  // Watch read and hand over (src/native/). Nothing runs on the web.
  const storeRef = useRef(store);
  storeRef.current = store;
  /** The summary in the App Group: after every change (as debounced as the save), on resume and at midnight (*pro Tag*). */
  const [midnight, setMidnight] = useState(0);
  useEffect(() => {
    if (!native) return;
    const d = new Date();
    const id = window.setTimeout(() => setMidnight(n => n + 1), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5).getTime() - d.getTime());
    return () => window.clearTimeout(id);
  }, [native, midnight]);
  // No amounts in the snapshot: there is no switch for them — and never while Beträge verbergen is on.
  const snapshotFor = () => buildSnapshot(data, { language, locale: t.locale, accent: store.accent, locked: store.lockOn, showAmounts: false });
  useEffect(() => {
    if (!native) return;
    const id = window.setTimeout(() => {
      void writeSnapshot(snapshotFor());
      // What Siri may say aloud (plan 18): only while the app lock is off.
      if (store.lockOn) void removeAmounts();
      else void writeAmounts(buildAmounts(data, { language, locale: t.locale, accent: store.accent }));
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [native, data, language, store.accent, store.lockOn, midnight, resumed]);
  /** Debug (Sichern und übertragen): write the snapshot and read it back. */
  const testBridge = async () => {
    const snapshot = snapshotFor();
    const ok = (await writeSnapshot(snapshot)) && JSON.stringify(await readSnapshot()) === JSON.stringify(snapshot);
    show(ok ? t.debugBridgeOk : t.debugBridgeFailed);
  };
  /**
   * The inbox, at launch and on resume once unlocked: booked as paid through
   * the bank import's path, one toast to undo them all. The items leave the
   * inbox once the book with them is on disk; read twice, their refs keep them
   * single.
   */
  const inboxBusy = useRef(false);
  /** *Erst prüfen* (plan 19): how many captured payments wait in the inbox, and the ones in the open review. */
  const [captured, setCaptured] = useState(0);
  const reviewIds = useRef<string[] | null>(null);
  const openCaptured = async () => {
    const raw = await readInbox();
    const s = storeRef.current;
    const review = inboxReview(raw, accountView(s.data, target), { language: s.language });
    if (!review.rows.length) { await removeInbox(review.ids); setCaptured(0); return; }
    reviewIds.current = review.ids;
    setStatement({ phase: 'review', source: 'inbox', rows: review.rows });
  };
  const takeInbox = async () => {
    if (inboxBusy.current) return;
    inboxBusy.current = true;
    try {
      const raw = await readInbox();
      if (!raw.length) { setCaptured(0); return; }
      const s = storeRef.current;
      const r = inboxToEntries(raw, s.data, { language: s.language, hold: s.captureReview });
      setCaptured(r.held);
      const count = r.add.length + r.pay.length;
      if (count) {
        const done = s.importEntries(r.add, r.pay);
        notifySuccess();
        show(plural(count, t.inboxTakenOne, t.inboxTakenMany), { label: t.undo, run: () => storeRef.current.undoImport(done) });
      }
      if (r.done.length) {
        await new Promise(resolve => window.setTimeout(resolve, SAVE_DEBOUNCE_MS + 50));
        await saver.flush();
        await removeInbox(r.done);
      }
    } finally {
      inboxBusy.current = false;
    }
  };
  useEffect(() => { if (native && !locked) void takeInbox(); }, [native, locked, resumed, store.captureReview]);
  /**
   * spartopf:// links (a cold start's too: the App plugin keeps it until this
   * listens). Checked by parseDeepLink, held while locked, and none saves
   * anything — "add" only fills the entry sheet.
   */
  const pendingLink = useRef<DeepLink | null>(null);
  const [linkArrived, setLinkArrived] = useState(0);
  useEffect(() => {
    if (!native) return;
    const handle = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const link = parseDeepLink(url);
      if (!link) return;
      pendingLink.current = link;
      setLinkArrived(n => n + 1);
    });
    return () => { void handle.then(h => h.remove()); };
  }, [native]);
  useEffect(() => {
    const link = pendingLink.current;
    if (!link || locked) return;
    pendingLink.current = null;
    const s = storeRef.current;
    const toMonth = (key: MonthKey) => { setMonth(key); setTab('month'); setStack(st => ({ ...st, month: undefined })); };
    if (link.kind === 'month') { toMonth(link.month); return; }
    if (link.kind === 'entry') {
      const e = s.entries.find(x => x.id === link.id);
      // A transfer opens as one (plan 30), never as an entry without a category.
      if (e?.transfer) { const pair = transferPair(s.entries, e.transfer.pairId); toMonth(e.month); setTransferSheet({ kind: 'edit', out: pair.out, in: pair.in }); }
      else if (e) { toMonth(e.month); setEntrySheet({ kind: 'edit', entry: e }); }
      return;
    }
    const categoryId = link.categoryId && s.categories.some(c => c.id === link.categoryId) ? link.categoryId : quickAddCategory;
    if (!categoryId) return;
    const running = monthKeyOf();
    toMonth(running);
    setEntrySheet({ kind: 'new', month: running, categoryId, preset: { name: link.name, amount: link.amount } });
  }, [linkArrived, locked]);

  // ---- Ratings (plan 15): Apple's own prompt, right after something good, by
  // a local rule (shouldAskForReview) — no analytics, no dialog of our own.
  const goodMoment = (moment: ReviewMoment) => {
    if (!native) return;
    const s = storeRef.current;
    const ask = shouldAskForReview({
      firstUse: s.firstUse, entries: s.entries.filter(e => !isDemoEntry(e)).length,
      lastAsked: s.reviewAsked, trouble: trouble.current, moment,
    });
    if (!ask) return;
    s.markReviewAsked();
    // A moment later, so the prompt doesn't cover what just happened.
    window.setTimeout(() => { void requestReview(); }, 1500);
  };
  useEffect(() => { if (store.storageError) trouble.current = true; }, [store.storageError]);
  /** A savings pot that reaches its target (plan 12) is a good moment; one reached before isn't. */
  const reachedGoals = useRef<Set<string> | null>(null);
  useEffect(() => {
    const today = new Date();
    const reached = new Set(store.goals.filter(g => !g.closedAt && goalProgress(data, g, today).reached).map(g => g.id));
    const before = reachedGoals.current;
    reachedGoals.current = reached;
    if (before && [...reached].some(id => !before.has(id))) goodMoment('goalReached');
  }, [data]);
  /**
   * *Bericht teilen* (plan 28): the report drawn for print, then a PDF and the
   * share sheet in the iPhone app, the browser's print (and "Save as PDF") on
   * the web.
   */
  const makeReport = async (spec: PrintSpec) => {
    setPdfFor(null);
    setPrinting(spec);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); // drawn
    if (native) {
      if (!(await makePdf(reportFileName(spec, t)))) show(t.reportPdfFailed);
    } else {
      window.print();
    }
    setPrinting(null);
  };
  /** Optionen › Über Spartopf. */
  const sendFeedback = async () => { void openExternal(feedbackMail(t, __APP_VERSION__, await systemVersion())); };

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
  const openReport = (m: MonthKey) => {
    setReportMonth(m);
    store.seeReview(m);
    push('monthReport');
    // The month just closed, and it saved money: a good moment (plan 15).
    if (m === addMonths(monthKeyOf(), -1) && (book.points.find(p => p.key === m)?.saved ?? 0) > 0) goodMoment('monthSaved');
  };
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
  /** Plan 37: at most one tip, on the running month, once the setup and the gestures card are gone. */
  const tip = useMemo(() => nextTip(data, store.tipState, {
    native: native || devNative(),
    capture: isIos() || devNative(),
    inDeviceBackup: deviceBackup,
    daysSinceExport: store.lastExport ? Math.floor((Date.now() - new Date(`${store.lastExport}T00:00:00`).getTime()) / 86_400_000) : null,
  }), [data, store.tipState, deviceBackup, store.lastExport]);
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
  ) : tip && store.introDone && store.tipsDone && balance.started && month === monthKeyOf() ? (
    <HintCard
      text={tip.id === 'capture' ? t.hintCapture : tip.id === 'favorite' ? fmt(t.hintFavorite, { name: tip.name })
        : tip.id === 'reserve' ? t.hintReserve : tip.id === 'backup' ? t.hintBackup
        : fmt(t.hintBudget, { category: displayName(tip.category.names, language), month: monthLabel(tip.month, t.locale, 'name') })}
      action={tip.id === 'capture' ? t.hintCaptureAction : tip.id === 'favorite' ? t.hintFavoriteAction
        : tip.id === 'reserve' ? t.hintReserveAction : tip.id === 'backup' ? t.hintBackupAction : t.hintBudgetAction}
      hideLabel={t.hintClose}
      onHide={() => store.closeTip(tip.id)}
      onAction={() => {
        store.closeTip(tip.id);
        if (tip.id === 'capture') push('capture');
        else if (tip.id === 'favorite') { if (store.addFavorite({ name: tip.name, categoryId: tip.categoryId, ...(tip.amount ? { amount: tip.amount } : {}) })) show(t.favoriteSaved); }
        else if (tip.id === 'reserve') setTab('insights');
        else if (tip.id === 'backup') push('transfer');
        else setBudgetFor(tip.category);
      }}
    />
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
          <MonthReportView book={book} month={reportMonth} language={language} t={t} onBack={back} onOpenMonth={openMonthPage}
            onPdf={() => setPdfFor({ kind: 'month', month: reportMonth, year: reportMonth.slice(0, 4) })} />
        ) : id === 'yearReview' ? (
          <YearReviewView
            book={book}
            year={reviewYear}
            language={language}
            t={t}
            onBack={back}
            onApplyBudgets={applyBudgets}
            onShare={image => void shareYear(image)}
            onPdf={() => setPdfFor({ kind: 'year', month: `${reviewYear}-12`, year: reviewYear })}
          />
        ) : id === 'dueSoon' ? (
          <DueSoonView
            data={allView}
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
            autoCategory={store.autoCategory}
            onAutoCategory={store.setAutoCategory}
            budgetNotes={store.budgetNotes}
            onBudgetNotes={store.setBudgetNotes}
          />
        ) : id === 'capture' ? (
          <CaptureView review={store.captureReview} t={t} onBack={back} onReview={store.setCaptureReview} />
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
            inDeviceBackup={deviceBackup}
            copyCardDismissed={store.copyCardDismissed}
            onDismissCopyCard={store.dismissCopyCard}
            onTestBridge={native ? () => void testBridge() : undefined}
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
        ) : id === 'tax' ? (
          <TaxView list={taxList} years={taxYearList} marks={store.taxMarks} t={t} onBack={back} onYear={setTaxYearShown} onMarks={store.setTaxMarks}
            onPdf={() => void makeReport({ kind: 'tax', month: `${taxYearKey}-01`, year: taxYearKey, entries: false })} />
        ) : id === 'projects' ? (
          <ProjectsView overview={projects} t={t} onBack={back} onNew={() => setProjectSheet({ kind: 'new' })} onEdit={editProject} />
        ) : id === 'debts' ? (
          <DebtsView overview={debts} t={t} onBack={back} onNew={() => setDebtSheet({ kind: 'new' })} onEdit={editDebt} />
        ) : id === 'accounts' ? (
          <AccountsView totals={totals} t={t} onBack={back} onEdit={editAccount} onAdd={addAccount} />
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
            accountCount={accounts.length}
            onAccounts={() => push('accounts')}
            debtCount={store.debts.length}
            onProjects={() => push('projects')}
            projectCount={store.projects.length}
            onTax={() => push('tax')}
            onDebts={() => push('debts')}
            monthStart={store.monthStart}
            onMonthStart={() => setMonthStartOpen(true)}
            onTransfer={() => push('transfer')}
            hasDemo={store.hasDemo}
            onAddDemo={addDemo}
            onRemoveDemo={removeDemo}
            onDeleteAll={() => { setSetupNow(null); store.resetAll(); setMonth(monthKeyOf()); setTab('month'); setStack({}); show(t.deleteAllDone); }}
            lockKind={lockKind}
            lockOn={store.lockOn}
            onLock={on => void setLock(on)}
            hideAmounts={store.hideAmounts}
            onHideAmounts={on => { store.setHideAmounts(on); setPeek(false); }}
            deviceBackup={deviceBackup}
            onDeviceBackup={on => void switchDeviceBackup(on)}
            deviceBackupBusy={backupMoving}
            reminders={remindersAvailable() ? store.reminders : null}
            onReminders={() => push('reminders')}
            onCapture={isIos() || devNative() ? () => push('capture') : undefined}
            onRate={native || devNative() ? () => void openExternal(isAndroid() ? PLAY_URL : REVIEW_URL) : undefined}
            onFeedback={() => void sendFeedback()}
            onPrivacy={() => void openExternal(privacyUrl(language))}
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
            onReserveGoal={(goal, due) => setGoalSheet({ kind: 'new', preset: { name: t.reserveTitle, target: goal, due } })}
            onWhatIf={() => setWhatIfOpen(true)}
            onExplain={setExplain}
            wealth={multi ? { now: totals.now, count: accounts.length, onOpen: () => push('accounts') } : undefined}
            debts={store.debts.length ? <DebtsCard overview={debts} t={t} onOpen={() => push('debts')} onEdit={editDebt} /> : null}
            projects={store.projects.length ? <ProjectsCard overview={projects} t={t} onOpen={() => push('projects')} onEdit={editProject} /> : null}
          />
        ) : (
          <MonthView
            month={month}
            balance={balance}
            track={track}
            categories={shownCategories}
            entries={view.entries}
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
            onOpening={account === ALL_ACCOUNTS ? undefined : () => setOpeningOpen(true)}
            account={multi ? {
              label: account === ALL_ACCOUNTS ? t.accountsAll : nameOf(account),
              emoji: account === ALL_ACCOUNTS ? '∑' : accounts.find(a => a.id === account)?.emoji ?? '🏦',
              options: [...accounts.map(a => ({ id: a.id, label: accountName(a, t.accountMain), emoji: a.emoji })), { id: ALL_ACCOUNTS, label: t.accountsAll, emoji: '∑' }],
              selected: account,
              onSelect: store.setAccountView,
            } : undefined}
            budgetEntries={allView.entries}
            budgetCards={account === MAIN_ACCOUNT || account === ALL_ACCOUNTS}
            captured={captured > 0 ? { count: captured, onOpen: () => void openCaptured() } : undefined}
            transfers={multi && balance.started && transfers.length > 0 ? (
              <TransfersCard transfers={transfers} sides={monthSides} accounts={accounts} account={account} t={t} onToggle={toggleTransfer} onEdit={editTransfer} onNew={newTransfer} />
            ) : null}
            reconciledAt={store.months.find(m => m.key === month)?.reconciledAt}
            peek={store.hideAmounts ? { shown: peek, onToggle: () => setPeek(v => !v) } : undefined}
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
        <div className="no-rise fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true" inert>
          <motion.div style={{ x: swipeUnder }}>{screenFor(tab)}</motion.div>
          <motion.div className="absolute inset-0 scrim" style={{ opacity: swipeShade }} />
        </div>
      )}

      <motion.div
        key={screen}
        // Enter-only: the old screen leaves on the spot and the new one comes
        // in over it. Fixed chrome (sheets, toasts, the tab bar) is portalled
        // to <body>, so this transform can never capture it.
        // A tab comes forward out of a slight depth; a pushed screen slides.
        initial={nav.current.still ? false : dir === 0 ? { opacity: 0, scale: 0.975 } : dir === 1 ? { x: `${100 * rtl}%` } : { x: `${-30 * rtl}%`, opacity: 0.6 }}
        animate={{ x: 0, scale: 1, opacity: 1 }}
        transition={dir === 0 ? { duration: 0.28, ease: [0.22, 1, 0.36, 1] } : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: '50% 30vh' }}
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
      {pushed && !isAndroid() && (
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
        onSave={(id, d) => {
          const was = data.entries.find(e => e.id === id);
          const note = was ? budgetNote(data.entries.map(e => (e.id === id ? { ...e, ...d } : e)), d.categoryId, was.month) : null;
          store.updateEntry(id, d);
          setLastCategory(d.categoryId);
          if (note) show(note);
        }}
        onDelete={deleteEntry}
        favorites={store.favorites}
        onPinFavorite={fav => {
          const created = store.addFavorite(fav);
          show(created ? t.favoriteSaved : t.favoritesFull);
          return !!created;
        }}
        goals={store.goals}
        onSplit={e => setSplitEntry(e)}
        autoCategory={store.autoCategory}
        accounts={multi ? accounts.map(a => ({ id: a.id, label: accountName(a, t.accountMain), emoji: a.emoji })) : undefined}
        defaultAccount={target}
        debts={store.debts.length ? store.debts.map(d => ({ id: d.id, name: d.name })) : undefined}
        projects={activeProjects}
        taxMarks={store.taxMarks || anyTaxMark}
        onNotice={text => show(text)}
      />

      <ProjectSheet
        mode={projectSheet}
        taken={store.projects.map(p => p.tag)}
        t={t}
        onClose={() => setProjectSheet(null)}
        onCreate={p => { store.addProject(p); notifySuccess(); show(fmt(t.projectAdded, { name: p.name })); }}
        onSave={(id, patch) => store.updateProject(id, patch)}
        onDelete={p => {
          const removed = store.removeProject(p.id);
          if (removed) show(fmt(t.projectDeleted, { name: p.name }), { label: t.undo, run: () => store.restoreProject(removed) });
        }}
      />

      <DebtSheet
        mode={debtSheet}
        series={series}
        t={t}
        onClose={() => setDebtSheet(null)}
        onCreate={d => { store.addDebt(d); notifySuccess(); show(fmt(t.debtAdded, { name: d.name })); }}
        onSave={(id, d) => store.updateDebt(id, { ...d, rate: d.rate, payment: d.payment, seriesId: d.seriesId })}
        onDelete={d => {
          const removed = store.removeDebt(d.id);
          if (removed) show(t.debtDeleted, { label: t.undo, run: () => store.restoreDebt(removed) });
        }}
      />

      <MonthStartSheet
        open={monthStartOpen}
        current={store.monthStart}
        moved={day => changeMonthStart(data, day).moved}
        t={t}
        onClose={() => setMonthStartOpen(false)}
        onSave={changeStart}
      />

      <TransferSheet
        mode={transferSheet}
        accounts={accounts}
        t={t}
        onClose={() => setTransferSheet(null)}
        onCreate={d => {
          store.addTransfer(d);
          notifySuccess();
          show(fmt(t.transferDone, { from: nameOf(d.from), to: nameOf(d.to) }));
        }}
        onSave={(pairId, patch) => {
          const before = store.updateTransfer(pairId, patch);
          show(t.transferSaved, { label: t.undo, run: () => store.restoreEntries(before) });
        }}
        onDelete={deleteTransfer}
      />

      <AccountSheet
        mode={accountSheet}
        t={t}
        onClose={() => setAccountSheet(null)}
        onCreate={(draft, start) => {
          const created = store.addAccount(draft);
          if (!created) { show(t.accountsFull); return; }
          if (start !== null) store.setOpening(monthKeyOf(), start, created.id);
          notifySuccess();
          show(fmt(t.accountAdded, { name: draft.name }));
        }}
        onSave={(id, patch) => store.updateAccount(id, patch)}
        onDelete={a => {
          const removed = store.removeAccount(a.id);
          if (removed) show(t.accountDeleted, { label: t.undo, run: () => store.restoreAccount(removed) });
        }}
      />

      <SplitSheet
        entry={splitEntry}
        categories={categories}
        language={language}
        t={t}
        onClose={() => setSplitEntry(null)}
        onSplit={(id, parts) => {
          const done = store.splitEntry(id, parts);
          if (done) show(t.splitPayDone, { label: t.undo, run: () => store.unsplit(done.original, done.splitId) });
        }}
      />

      <OpeningSheet
        open={openingOpen}
        month={month}
        current={balance.openingNow}
        overridden={balance.overridden}
        prevKey={balance.prevKey}
        carried={prevBalance?.now}
        accountLabel={multi ? nameOf(target) : undefined}
        t={t}
        onClose={() => setOpeningOpen(false)}
        onSave={v => {
          // Set by hand: the setup's balance doesn't steer the opening any more.
          setSetupNow(null);
          store.setOpening(month, v, target);
          show(v === undefined && balance.prevKey
            ? fmt(t.openingReset, { month: monthLabel(balance.prevKey, t.locale) })
            : t.openingSaved);
        }}
      />

      <ReportPdfSheet open={pdfFor !== null} t={t} onClose={() => setPdfFor(null)} onMake={entries => { if (pdfFor) void makeReport({ ...pdfFor, entries }); }} />
      {printing && (
        // The PDF carries its amounts (an export the user asked for); the screen behind it keeps hiding them.
        <>
          <AmountsShown />
          <PrintReport spec={printing} book={book} data={allView} language={language} accent={store.accent} t={t} />
          <AmountsShown hidden={store.hideAmounts && !peek} />
        </>
      )}
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
          const entry: Entry = { id, month, seriesId: id, createdAt: now, ...draft, paidAt: now, ...(target !== MAIN_ACCOUNT ? { accountId: target } : {}) };
          store.addEntry(entry);
          store.showCategory(month, draft.categoryId);
          const prevRec = store.setReconciled(month, now);
          show(t.reconcileDone, { label: t.undo, run: () => { store.removeEntry(id); store.setReconciled(month, prevRec); } });
        }}
        onAdjustOpening={opening => {
          const record = store.months.find(m => m.key === month);
          const prevOpening = target === MAIN_ACCOUNT ? record?.opening : record?.openings?.[target];
          const prevRec = store.setReconciled(month, Date.now());
          setSetupNow(null);
          store.setOpening(month, opening, target);
          show(t.reconcileDone, { label: t.undo, run: () => { store.setOpening(month, prevOpening, target); store.setReconciled(month, prevRec); } });
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

      {ahead && (
        <WhatIfSheet
          open={whatIfOpen}
          outlook={ahead}
          data={allView}
          debts={debts.plans.filter(p => p.debt.direction === 'owe' && !p.done)}
          t={t}
          onClose={() => setWhatIfOpen(false)}
          onPlan={plan => quickAddCategory && setEntrySheet({
            kind: 'new', month: plan.month, categoryId: quickAddCategory,
            preset: { amount: plan.amount, paid: false, ...(plan.monthly ? { repeat: 'monthly' as const } : {}) },
          })}
        />
      )}

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
        onOpening={account === ALL_ACCOUNTS ? undefined : () => setOpeningOpen(true)}
        onReconcile={account === ALL_ACCOUNTS ? undefined : () => setReconcileOpen(true)}
        onTransfer={multi ? newTransfer : undefined}
        onPull={() => { const n = store.pullRecurring(month); show(fmt(t.pulled, { n })); }}
        onCollapseAll={fold => store.setCollapsed(fold ? categories.map(c => c.id) : [])}
        onImportCsv={() => statementInput.current?.click()}
        onImportPhoto={() => photoInput.current?.click()}
        onScanInvoice={() => invoiceInput.current?.click()}
        onImportPdf={() => pdfInput.current?.click()}
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
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onStatementFile(e.target.files?.[0], 'pdf')}
      />
      <input
        ref={invoiceInput}
        data-scan="invoice"
        type="file"
        accept="image/*"
        className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onInvoiceFile(e.target.files?.[0])}
      />
      <StatementImportSheet
        state={statement}
        accountLabel={multi ? nameOf(target) : undefined}
        categories={data.categories}
        language={language}
        t={t}
        onClose={() => { reviewIds.current = null; setStatement(null); }}
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
