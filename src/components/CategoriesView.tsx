import React, { useState } from 'react';
import { Reorder, motion, useDragControls } from 'motion/react';
import { ChevronRight, GripVertical, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { Strings, fmt, plural } from '../translations';
import { displayName, formatMoneyShort } from '../logic';
import { BarButton, Screen, Empty } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Confirm } from '../ui/Sheet';
import { Picture } from '../ui/Picture';
import { SwipeRow } from '../ui/SwipeRow';
import { Switch } from '../ui/Switch';
import { tapLight } from '../ui/haptics';

interface Props {
  categories: Category[];
  entries: Entry[];
  language: string;
  t: Strings;
  onBack: () => void;
  onEdit: (c: Category) => void;
  onNew: () => void;
  /** Asks first (in App) when entries would go with it; else undoable. */
  onDelete: (c: Category) => void;
  onReorder: (ids: string[]) => void;
  onRestoreDefaults: () => void;
  /** The entry sheet picks the category the typed name points to (plan 32). */
  autoCategory: boolean;
  onAutoCategory: (on: boolean) => void;
}

/**
 * Optionen → Kategorien und Budgets: every category in the order the month
 * shows them, each with what sets it apart (an income, in every month or
 * not, its budget, how many entries). A tap opens its sheet — name, budget,
 * every-month, picture — and a swipe deletes it, as rows do on the month
 * page. *Bearbeiten* in the bar shows the grips (drag, or the arrow keys on
 * one) and a delete button on every row; *Fertig* hides them again. Below,
 * whether the entry sheet picks the category from the name typed — from each
 * category's keywords, edited in its sheet (plan 32).
 */
export function CategoriesView({ categories, entries, language, t, onBack, onEdit, onNew, onDelete, onReorder, onRestoreDefaults, autoCategory, onAutoCategory }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
  const ids = categories.map(c => c.id);
  // Nothing left to edit: the mode ends with the list.
  const edit = editing && categories.length > 0;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onReorder(next);
  };

  return (
    <Screen
      title={t.categoriesTitle}
      subtitle={t.categoriesIntro}
      onBack={onBack}
      backLabel={t.back}
      tabbed
      actions={categories.length > 0 && (
        <BarButton strong={edit} onClick={() => setEditing(!edit)}>{edit ? t.done : t.edit}</BarButton>
      )}
    >
      {categories.length === 0 ? (
        <Empty
          emoji="🗂️"
          title={t.noCategories}
          body={t.noCategoriesBody}
          action={<Button icon={RotateCcw} onClick={() => setConfirmRestore(true)}>{t.restoreDefaults}</Button>}
        />
      ) : (
        // One grouped list, iOS style; no overflow clipping on the list, so a
        // lifted row can leave it while dragged (each row rounds itself).
        <Reorder.Group
          axis="y" values={ids} onReorder={onReorder}
          className="rounded-md bg-surface card-edge divide-hairline-inset"
          style={{ '--sep': edit ? '96px' : '64px' } as React.CSSProperties}
        >
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              count={counts.get(c.id) ?? 0}
              editing={edit}
              language={language}
              t={t}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
              onMove={d => move(i, i + d)}
            />
          ))}
        </Reorder.Group>
      )}

      <div className="grid gap-2">
        <Button icon={Plus} full variant="secondary" onClick={onNew}>{t.newCategory}</Button>
        {categories.length > 0 && (
          <Button icon={RotateCcw} full variant="ghost" onClick={() => setConfirmRestore(true)}>{t.restoreDefaults}</Button>
        )}
      </div>

      {categories.length > 0 && (
        <div>
          <div className="flex items-center gap-3 rounded-md bg-surface card-edge ps-4 pe-1">
            <span className="flex-1 min-w-0 py-3 text-body text-fg wrap-compound">{t.autoCategory}</span>
            <Switch checked={autoCategory} onChange={onAutoCategory} label={t.autoCategory} />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-4 wrap-prose">{t.autoCategoryHint}</p>
        </div>
      )}

      <Confirm
        open={confirmRestore}
        title={t.restoreDefaultsTitle}
        body={t.restoreDefaultsBody}
        confirmLabel={t.restoreDefaults}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => { setConfirmRestore(false); onRestoreDefaults(); }}
      />
    </Screen>
  );
}

/** What sets a category apart, for its row: "Einnahme · in jedem Monat", "in jedem Monat · Budget 400 €". */
export function categorySub(c: Category, t: Strings): string {
  return [
    c.kind === 'income' ? t.kindIncome : null,
    c.standard !== false ? t.inEveryMonth : t.notInNewMonths,
    c.kind === 'expense' && c.limit ? fmt(t.budgetLine, { amount: formatMoneyShort(c.limit, t.locale) }) : null,
  ].filter(Boolean).join(' · ');
}

const pop = { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring' as const, duration: 0.3, bounce: 0.2 } };

function CategoryRow({ category: c, count, editing, language, t, onEdit, onDelete, onMove }: {
  category: Category;
  count: number;
  editing: boolean;
  language: string;
  t: Strings;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const controls = useDragControls();
  const name = displayName(c.names, language);
  const sub = categorySub(c, t);
  const entriesText = count ? plural(count, t.entriesOne, t.entriesMany) : t.entriesNone;
  return (
    <Reorder.Item
      value={c.id}
      dragListener={false}
      dragControls={controls}
      data-hue={c.hue}
      className="relative bg-surface select-none overflow-hidden first:rounded-t-md last:rounded-b-md"
      whileDrag={{ scale: 1.03, boxShadow: 'var(--shadow-e2)', borderRadius: 16, zIndex: 10 }}
    >
      {/* Swiping is for the list at rest; while editing, the grips own the row. */}
      <SwipeRow locked={editing} trailing={{ label: t.delete, icon: Trash2, className: 'bg-swipe-delete', run: onDelete }}>
        <div className="flex items-center">
          {editing && (
            <motion.button
              {...pop}
              type="button"
              aria-label={fmt(t.deleteCategoryNamed, { name })}
              title={fmt(t.deleteCategoryNamed, { name })}
              onClick={() => { tapLight(); onDelete(); }}
              className="ms-1 h-tap w-tap shrink-0 inline-flex items-center justify-center rounded-full focus-visible:ring-focus"
            >
              <span className="w-[22px] h-[22px] rounded-full bg-swipe-delete text-on-color inline-flex items-center justify-center" aria-hidden="true">
                <Minus className="w-3.5 h-3.5" strokeWidth={3.5} />
              </span>
            </motion.button>
          )}
          {/* The body opens the sheet; only the grip starts a drag. */}
          <button
            type="button"
            data-category-body
            onClick={() => { tapLight(); onEdit(); }}
            aria-label={`${t.editCategory}: ${name}, ${sub}, ${entriesText}`}
            // The focus ring inside the row: the row clips what reaches past it.
            className={`flex-1 min-w-0 self-stretch min-h-[60px] py-2.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 ${
              editing ? 'pe-1' : 'ps-4 pe-3'}`}
          >
            <Picture emoji={c.emoji} name={name} size="sm" />
            <span className="flex-1 min-w-0">
              <span className="block text-body text-fg wrap-compound">{name}</span>
              <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{sub}</span>
            </span>
            {/* Its entries, as iOS lists count what a row holds. */}
            {!editing && (
              <span className="shrink-0 flex items-center gap-1 text-fg-mute" aria-hidden="true">
                <span className="num text-label">{count}</span>
                <ChevronRight className="w-4 h-4 text-fg-faint rtl:rotate-180" strokeWidth={2.4} />
              </span>
            )}
          </button>
          {editing && (
            <motion.button
              {...pop}
              type="button"
              aria-label={fmt(t.moveCategory, { name })}
              title={fmt(t.moveCategory, { name })}
              onPointerDown={e => { tapLight(); controls.start(e); }}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1); }
                if (e.key === 'ArrowDown') { e.preventDefault(); onMove(1); }
              }}
              className="me-1 h-tap w-tap shrink-0 inline-flex items-center justify-center text-fg-faint touch-none cursor-grab active:cursor-grabbing rounded-sm focus-visible:ring-focus"
            >
              <GripVertical className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </SwipeRow>
    </Reorder.Item>
  );
}
