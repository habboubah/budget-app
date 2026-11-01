import { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from './store';
import translations, { fmt } from './translations';
import { Entry, EntryDraft, MonthKey } from './types';
import { balanceFor, monthKeyOf, uid } from './logic';
import { MonthView } from './components/MonthView';
import { EntrySheet, EntrySheetMode } from './components/EntrySheet';
import { OpeningSheet } from './components/OpeningSheet';
import { AddButton } from './ui/AddButton';
import { Toast, useToast } from './ui/Toast';
import { notifySuccess, notifyWarning, tapLight } from './ui/haptics';

export default function App() {
  const store = useAppStore();
  const { categories, entries, balances, language, themeMode } = store;
  const t = translations[language];
  const { toast, show, hide } = useToast();

  const [month] = useState<MonthKey>(monthKeyOf);
  const [entrySheet, setEntrySheet] = useState<EntrySheetMode>(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  /** The category the round add button opens with: the one used last. */
  const [lastCategory, setLastCategory] = useState<string | null>(null);

  const balance = balanceFor(balances, month);

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

  const quickAddCategory = (lastCategory && categories.some(c => c.id === lastCategory) ? lastCategory : null)
    ?? categories.find(c => c.kind === 'expense')?.id ?? categories[0]?.id;

  const prevBalance = balance.prevKey ? balances.find(b => b.key === balance.prevKey) : undefined;

  return (
    <div className="font-sans text-fg min-h-screen bg-bg">
      {store.storageError && (
        <div role="alert" className="bg-neg-dim text-neg px-4 py-2 safe-top">
          <div className="mx-auto max-w-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold flex-1">{t.storageError}</span>
          </div>
        </div>
      )}

      <MonthView
        month={month}
        balance={balance}
        categories={categories}
        entries={entries}
        language={language}
        t={t}
        onAdd={categoryId => setEntrySheet({ kind: 'new', month, categoryId })}
        onEdit={entry => setEntrySheet({ kind: 'edit', entry })}
        onToggle={toggle}
        onOpening={() => setOpeningOpen(true)}
      />

      {quickAddCategory && (
        <AddButton label={t.addEntry} onClick={() => setEntrySheet({ kind: 'new', month, categoryId: quickAddCategory })} />
      )}

      <EntrySheet
        mode={entrySheet}
        categories={categories}
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
        onSave={v => { store.setOpening(month, v); show(t.openingSaved); }}
      />

      <Toast toast={toast} onDone={hide} raised />
    </div>
  );
}
