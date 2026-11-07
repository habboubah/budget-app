import { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion, useTransform } from 'motion/react';
import { AlertTriangle, BarChart3, CalendarDays, PiggyBank, Settings } from 'lucide-react';
import { useAppStore } from './store';
import translations, { fmt } from './translations';
import { Category, Contract, Entry, EntryDraft, MonthKey } from './types';
import { addMonths, balanceFor, carryCandidates, displayName, formatMoneyShort, monthCategories, monthKeyOf, monthLabel, openBefore, uid } from './logic';
import { MonthView } from './components/MonthView';
import { SetupCard, TipsCard } from './components/SetupCard';
import { BudgetSheet } from './components/BudgetSheet';
import { DueSoonView } from './components/DueSoonView';
import { ContractsView } from './components/ContractsView';
import { ContractSheet } from './components/ContractSheet';
import { ContractItem, contractItems } from './contracts';
import { MonthPickerSheet } from './components/MonthPickerSheet';
import { EntrySheet, EntrySheetMode } from './components/EntrySheet';
import { OpeningSheet } from './components/OpeningSheet';
import { MonthActionsMenu } from './components/MonthActionsMenu';
import { StatsView } from './components/StatsView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { CategoriesView } from './components/CategoriesView';
import { CategorySheet, CategorySheetMode } from './components/CategorySheet';
import { AddCategorySheet } from './components/AddCategorySheet';
import { TransferView } from './components/TransferView';
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
import { PlannedRow, allCategoryNames, applyStatement, parseBankCsv, parseStatementText, planStatement } from './statementImport';
import { readImageText, readTextFile } from './ocr';
import { TabBar } from './ui/TabBar';
import { Toast, useToast } from './ui/Toast';
import { Confirm } from './ui/Sheet';
import { notifySuccess, notifyWarning, tapLight } from './ui/haptics';
import { useEdgeSwipeBack } from './ui/useEdgeSwipeBack';

type TabId = 'month' | 'stats' | 'insights' | 'settings';
/** Screens pushed over a tab's root. */
type PushedId = 'categories' | 'transfer' | 'reminders' | 'dueSoon' | 'contracts';
type ScreenId = TabId | PushedId;
/** The tab each pushed screen sits on. */
const PARENT: Record<PushedId, TabId> = { categories: 'settings', transfer: 'settings', reminders: 'settings', dueSoon: 'month', contracts: 'insights' };
/** Away longer than this, and the lock asks again. */
const LOCK_AFTER_MS = 60_000;

export default function App() {
  const store = useAppStore();
  const { data, categories, entries, balances, language, themeMode } = store;
  const t = translations[language];
  const { toast, show, hide } = useToast();

  const [tab, setTab] = useState<TabId>('month');
  /** Per tab, the screen pushed over its root — each tab keeps its place, as on iOS. */
  const [stack, setStack] = useState<Partial<Record<TabId, PushedId>>>({});
  const push = (to: PushedId) => { setTab(PARENT[to]); setStack(s => ({ ...s, [PARENT[to]]: to })); };
  const popTo = (onTab: TabId) => setStack(s => ({ ...s, [onTab]: undefined }));
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
    try {
      const plan = planExcelImport(readXlsx(new Uint8Array(await f.arrayBuffer())), categories, language);
      if (!plan.months.length) { show(t.excelNoMonths); return; }
      setExcel({ plan, fileName: f.name });
    } catch {
      show(t.excelInvalid);
    }
  };

  const onStatementFile = async (f: File | undefined, source: 'csv' | 'photo') => {
    if (statementInput.current) statementInput.current.value = '';
    if (photoInput.current) photoInput.current.value = '';
    if (!f) return;
    setStatement({ phase: 'reading', source, progress: 0 });
    try {
      const found = source === 'csv'
        ? parseBankCsv(await readTextFile(f))
        : parseStatementText(
          await readImageText(f, p => setStatement(s => (s?.phase === 'reading' ? { ...s, progress: p } : s))),
          allCategoryNames(data.categories, language),
        );
      if (!found.length) { setStatement(null); show(t.importNothing); return; }
      setStatement({ phase: 'review', source, rows: planStatement(found, data) });
    } catch {
      setStatement(null);
      show(t.importFailed);
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
          />
        ) : id === 'settings' ? (
          <SettingsView
            language={language}
            themeMode={themeMode}
            accent={store.accent}
            onAccent={store.setAccent}
            t={t}
            categoryCount={categories.length}
            onLanguage={store.setLanguage}
            onTheme={store.setThemeMode}
            onCategories={() => push('categories')}
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
            month={month}
            balances={balances}
            data={data}
            language={language}
            t={t}
            onMonth={setMonth}
          />
        ) : id === 'insights' ? (
          <InsightsView
            month={month}
            balances={balances}
            data={data}
            language={language}
            t={t}
            onMonth={setMonth}
            onBudget={setBudgetFor}
            onContract={setContractFor}
            onContractsAll={() => push('contracts')}
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
          <motion.div style={{ x: swipeUnder }}>{screenFor(PARENT[pushed])}</motion.div>
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
      />

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
        onPull={() => { const n = store.pullRecurring(month); show(fmt(t.pulled, { n })); }}
        onCollapseAll={fold => store.setCollapsed(fold ? categories.map(c => c.id) : [])}
        onImportCsv={() => statementInput.current?.click()}
        onImportPhoto={() => photoInput.current?.click()}
        onDelete={deleteMonth}
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
