import { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { Strings, fmt, plural } from '../translations';
import { displayName } from '../logic';
import { Screen, Empty } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { Confirm } from '../ui/Sheet';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

interface Props {
  categories: Category[];
  entries: Entry[];
  language: string;
  t: Strings;
  onBack: () => void;
  onEdit: (c: Category) => void;
  onNew: () => void;
  /** Asks first (in App) when entries would go with it. */
  onDelete: (c: Category) => void;
  onReorder: (ids: string[]) => void;
  onRestoreDefaults: () => void;
}

/**
 * Settings → Kategorien: every category with how many entries it has, in the
 * order the month shows them — dragged by the grip (or moved with the arrow
 * keys on it) — a delete button on each (undoable), "Neue Kategorie" and
 * "Standard wiederherstellen". Like shopping-list's list types.
 */
export function CategoriesView({ categories, entries, language, t, onBack, onEdit, onNew, onDelete, onReorder, onRestoreDefaults }: Props) {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
  const ids = categories.map(c => c.id);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onReorder(next);
  };

  return (
    <Screen title={t.categoriesTitle} subtitle={t.categoriesIntro} onBack={onBack} backLabel={t.back} tabbed>
      {categories.length === 0 ? (
        <Empty
          emoji="🗂️"
          title={t.noCategories}
          body={t.noCategoriesBody}
          action={<Button icon={RotateCcw} onClick={() => setConfirmRestore(true)}>{t.restoreDefaults}</Button>}
        />
      ) : (
        <Reorder.Group axis="y" values={ids} onReorder={onReorder} className="space-y-2">
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              count={counts.get(c.id) ?? 0}
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

function CategoryRow({ category: c, count, language, t, onEdit, onDelete, onMove }: {
  category: Category;
  count: number;
  language: string;
  t: Strings;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const controls = useDragControls();
  const name = displayName(c.names, language);
  const sub = `${c.kind === 'income' ? t.kindIncome : t.kindExpense} · ${count ? plural(count, t.entriesOne, t.entriesMany) : t.entriesNone}`;
  return (
    <Reorder.Item
      value={c.id}
      dragListener={false}
      dragControls={controls}
      data-hue={c.hue}
      className="relative flex items-center gap-1 rounded-md bg-surface card-edge ps-1 pe-1 py-1 select-none"
      whileDrag={{ scale: 1.03, boxShadow: 'var(--shadow-e2)' }}
    >
      <button
        type="button"
        aria-label={fmt(t.moveCategory, { name })}
        onPointerDown={e => { tapLight(); controls.start(e); }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onMove(1); }
        }}
        className="h-tap w-9 shrink-0 inline-flex items-center justify-center text-fg-faint touch-none cursor-grab active:cursor-grabbing rounded-sm focus-visible:ring-focus"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      {/* The body opens the editor; only the grip starts a drag. */}
      <button
        type="button"
        onClick={() => { tapLight(); onEdit(); }}
        aria-label={`${t.editCategory}: ${name}, ${sub}`}
        className="flex-1 min-w-0 py-1.5 flex items-center gap-3 text-start rounded-sm active:opacity-60 transition-opacity focus-visible:ring-focus"
      >
        <Picture emoji={c.emoji} name={name} size="md" />
        <span className="flex-1 min-w-0">
          <span className="block display text-body font-bold text-fg wrap-compound">{name}</span>
          <span className="block text-caption text-fg-mute">{sub}</span>
        </span>
      </button>
      <IconButton label={fmt(t.deleteCategoryNamed, { name })} icon={Trash2} tone="danger" onClick={onDelete} />
    </Reorder.Item>
  );
}
