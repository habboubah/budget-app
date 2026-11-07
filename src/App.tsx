import { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { motion } from 'motion/react';
import { AlertTriangle, BarChart3, CalendarDays, Settings } from 'lucide-react';
import { useAppStore } from './store';
import translations, { fmt } from './translations';
import { Category, Entry, EntryDraft, MonthKey } from './types';
import { balanceFor, carryCandidates, displayName, monthCategories, monthKeyOf, monthLabel, openBefore, uid } from './logic';
import { MonthView } from './components/MonthView';
import { MonthPickerSheet } from './components/MonthPickerSheet';
import { EntrySheet, EntrySheetMode } from './components/EntrySheet';
import { OpeningSheet } from './components/OpeningSheet';
import { MonthActionsSheet } from './components/MonthActionsSheet';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { CategoriesView } from './components/CategoriesView';
import { CategorySheet, CategorySheetMode } from './components/CategorySheet';
import { AddCategorySheet } from './components/AddCategorySheet';
import { BackupGroup } from './components/BackupGroup';
import { ExcelImportSheet } from './components/ExcelImportSheet';
import { readXlsx } from './xlsx';
import { ImportPlan, applyExcelImport, lastMonth, planExcelImport, replacedMonths } from './excelImport';
import { TabBar } from './ui/TabBar';
import { Toast, useToast } from './ui/Toast';
import { Confirm } from './ui/Sheet';
import { notifySuccess, notifyWarning, tapLight } from './ui/haptics';

export default function App() {
  const store = useAppStore();
  const { data, categories, entries, balances, language, themeMode } = store;
  const t = translations[language];
  const { toast, show, hide } = useToast();

  const [tab, setTab] = useState<'month' | 'stats' | 'settings'>('month');
  const [showCategories, setShowCategories] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [categorySheet, setCategorySheet] = useState<CategorySheetMode>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  /** A category created from the month page also joins that month. */
  const [createForMonth, setCreateForMonth] = useState<MonthKey | null>(null);
  /** An Excel file read and planned, waiting for "import". */
  const [excel, setExcel] = useState<{ plan: ImportPlan; fileName: string } | null>(null);
  const excelInput = useRef<HTMLInputElement>(null);
  /** A category with entries waiting for "really delete?". */
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  /** One month for both tabs: statistics open on the month being looked at. */
  const [month, setMonth] = useState<MonthKey>(monthKeyOf);
  const [entrySheet, setEntrySheet] = useState<EntrySheetMode>(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  /** The category the round add button opens with: the one used last. */
  const [lastCategory, setLastCategory] = useState<string | null>(null);

  const balance = balanceFor(balances, month);
  const prevBalance = balance.prevKey ? balances.find(b => b.key === balance.prevKey) : undefined;
  const candidates = useMemo(() => carryCandidates(data, month), [data, month]);
  /** The categories this month shows (its own list, plus any with entries). */
  const shownCategories = useMemo(() => monthCategories(data, month), [data, month]);
  const hiddenCategories = categories.filter(c => !shownCategories.includes(c));
  const openEarlier = useMemo(() => (balance.started ? openBefore(data, month) : []), [data, month, balance.started]);

  // Screens pushed over the tab's root, outermost first. Every pushed screen
  // must be here: it drives the hardware back, the scroll reset and the slide
  // direction (the same pattern as shopping-list and pizza-driver-log).
  const pushed: [string, boolean, () => void][] = [
    ['categories', tab === 'settings' && showCategories, () => setShowCategories(false)],
  ];
  const topIndex = pushed.findIndex(([, isOpen]) => isOpen);
  const screen = topIndex === -1 ? tab : pushed[topIndex][0];
  const depth = topIndex === -1 ? 0 : pushed.length - topIndex;
  // Push slides in from the trailing edge, pop reveals the parent from the
  // leading edge; switching tabs just cross-fades. Kept in a ref guarded by
  // `screen` so StrictMode's double render can't recompute the direction.
  const nav = useRef({ screen, depth, dir: 0 });
  if (nav.current.screen !== screen) {
    nav.current = { screen, depth, dir: depth === nav.current.depth ? 0 : depth > nav.current.depth ? 1 : -1 };
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
      if (topIndex !== -1) pushed[topIndex][2]();
      else if (tab !== 'month') setTab('month');
      else void CapacitorApp.minimizeApp();
    });
    return () => { void handle.then(h => h.remove()); };
  }, [topIndex, tab]);

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

  const startMonth = (carry: boolean) => {
    const n = store.startMonth(month, carry);
    notifySuccess();
    const name = monthLabel(month, t.locale);
    show(n ? fmt(t.monthStartedCarried, { month: name, n }) : fmt(t.monthStarted, { month: name }));
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
    try {
      const plan = planExcelImport(readXlsx(new Uint8Array(await f.arrayBuffer())), categories, language);
      if (!plan.months.length) { show(t.excelNoMonths); return; }
      setExcel({ plan, fileName: f.name });
    } catch {
      show(t.excelInvalid);
    }
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
    setShowCategories(false);
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

  const quickAddCategory = (lastCategory && categories.some(c => c.id === lastCategory) ? lastCategory : null)
    ?? categories.find(c => c.kind === 'expense')?.id ?? categories[0]?.id;

  return (
    <div className="font-sans text-fg min-h-screen bg-bg overflow-x-clip">
      {store.storageError && (
        <div role="alert" className="bg-neg-dim text-neg px-4 py-2 safe-top">
          <div className="mx-auto max-w-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold flex-1">{t.storageError}</span>
          </div>
        </div>
      )}

      <motion.div
        key={screen}
        // Enter-only: the old screen leaves on the spot and the new one comes
        // in over it. Fixed chrome (sheets, toasts, the tab bar) is portalled
        // to <body>, so this transform can never capture it.
        initial={dir === 0 ? { opacity: 0 } : dir === 1 ? { x: `${100 * rtl}%` } : { x: `${-30 * rtl}%`, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={dir === 0 ? { duration: 0.18 } : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        {screen === 'categories' ? (
          <CategoriesView
            categories={categories}
            entries={entries}
            language={language}
            t={t}
            onBack={() => setShowCategories(false)}
            onEdit={c => setCategorySheet({ kind: 'edit', category: c })}
            onNew={() => setCategorySheet({ kind: 'new' })}
            onDelete={askDeleteCategory}
            onReorder={store.setCategoryOrder}
            onRestoreDefaults={restoreDefaults}
            onStandard={(c, on) => store.updateCategory(c.id, { standard: on })}
          />
        ) : screen === 'settings' ? (
          <SettingsView
            language={language}
            themeMode={themeMode}
            accent={store.accent}
            onAccent={store.setAccent}
            t={t}
            categoryCount={categories.length}
            onLanguage={store.setLanguage}
            onTheme={store.setThemeMode}
            onCategories={() => setShowCategories(true)}
            onRestoreDefaults={restoreDefaults}
            onDeleteAll={() => { store.resetAll(); setMonth(monthKeyOf()); setTab('month'); show(t.deleteAllDone); }}
            backup={
              <BackupGroup
                data={data}
                language={language}
                t={t}
                onImport={d => { store.importData(d); setMonth(monthKeyOf()); }}
                onImportExcel={() => excelInput.current?.click()}
                toast={label => show(label)}
              />
            }
          />
        ) : screen === 'stats' ? (
          <StatsView
            month={month}
            balances={balances}
            data={data}
            language={language}
            t={t}
            onMonth={setMonth}
          />
        ) : (
          <MonthView
            month={month}
            balance={balance}
            categories={shownCategories}
            entries={entries}
            candidates={candidates}
            openEarlier={openEarlier}
            showIntro={!store.introDone && !balance.prevKey}
            language={language}
            t={t}
            onMonth={setMonth}
            onStart={startMonth}
            onActions={() => setActionsOpen(true)}
            onAdd={categoryId => setEntrySheet({ kind: 'new', month, categoryId })}
            onEdit={entry => setEntrySheet({ kind: 'edit', entry })}
            onToggle={toggle}
            onDelete={e => deleteEntry(e.id)}
            onPickMonth={() => setMonthPickerOpen(true)}
            onOpening={() => setOpeningOpen(true)}
            onDismissIntro={store.dismissIntro}
            onCategories={() => { setTab('settings'); setShowCategories(true); }}
            onImportExcel={() => excelInput.current?.click()}
            collapsed={store.collapsed}
            onCollapse={store.toggleCollapsed}
            onRemoveCategory={removeFromMonth}
            onAddCategory={() => setAddCategoryOpen(true)}
            noCategories={categories.length === 0}
            onMoveEntry={moveEntry}
          />
        )}
      </motion.div>

      <TabBar
        label={t.appName}
        active={tab}
        // Tapping the active tab again pops back to its root, as on iOS.
        onChange={id => { if (id === tab) setShowCategories(false); setTab(id); }}
        tabs={[
          { id: 'month', label: t.tabMonth, icon: CalendarDays },
          { id: 'stats', label: t.tabStats, icon: BarChart3 },
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
          store.setOpening(month, v);
          show(v === undefined && balance.prevKey
            ? fmt(t.openingReset, { month: monthLabel(balance.prevKey, t.locale) })
            : t.openingSaved);
        }}
      />

      <MonthActionsSheet
        open={actionsOpen}
        month={month}
        started={balance.started}
        prevKey={balance.prevKey}
        missing={balance.started ? candidates.length : 0}
        allCollapsed={categories.length > 0 && categories.every(c => store.collapsed.includes(c.id))}
        t={t}
        onClose={() => setActionsOpen(false)}
        onOpening={() => setOpeningOpen(true)}
        onPull={() => { const n = store.pullRecurring(month); show(fmt(t.pulled, { n })); }}
        onCollapseAll={fold => store.setCollapsed(fold ? categories.map(c => c.id) : [])}
        onDelete={deleteMonth}
      />

      <CategorySheet
        mode={categorySheet}
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
