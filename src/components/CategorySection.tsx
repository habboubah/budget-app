import React, { useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Circle, Plus, Repeat as RepeatIcon, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { displayName, formatMoney, isOverdue } from '../logic';
import { Strings, fmt, plural } from '../translations';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { IconButton } from '../ui/Button';
import { SwipeRow } from '../ui/SwipeRow';

interface Props {
  category: Category;
  /** This month's entries of the category, already sorted. */
  entries: Entry[];
  language: string;
  t: Strings;
  today: Date;
  /** Folded down to its header: name, total, what is still open. */
  collapsed: boolean;
  onCollapse: () => void;
  /** Take the category out of this month — offered only while it is empty. */
  onRemove?: () => void;
  onAdd: () => void;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  /** Swipe left: delete (undoable). */
  onDelete: (e: Entry) => void;
  /** The entry being dragged right now (from any category), if any. */
  dragId: string | null;
  /** Where the dragged entry would land in this category, if it is over it. */
  dropIndex: number | null;
  /** Drag handlers for an entry's row body (from `useEntryDrag`). */
  dragProps: (id: string) => React.HTMLAttributes<HTMLElement>;
  /** Alt + ↑ / ↓: move an entry one place up or down within the category. */
  onMoveBy: (e: Entry, delta: -1 | 1) => void;
}

/**
 * One category of a month — one column of the Excel sheet: what of it is paid
 * (and, small and yellow below, the total including what is still open), its
 * entries, and an add row at the bottom. Tapping the
 * header folds the card down to that header and back; the state is kept per
 * category, so a category minimised stays minimised in every month.
 *
 * Entries can be dragged (press and hold): within the card to sort them, or
 * onto another card to move them there. While one is dragged over this card,
 * a line shows where it would land. A swipe marks one paid or deletes it.
 */
export function CategorySection({
  category, entries, language, t, today, collapsed, onCollapse, onRemove, onAdd, onEdit, onToggle, onDelete,
  dragId, dropIndex, dragProps, onMoveBy,
}: Props) {
  const bodyId = useId();
  const name = displayName(category.names, language);
  const income = category.kind === 'income';
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const open = entries.reduce((s, e) => s + (e.paid ? 0 : e.amount), 0);
  const paid = total - open;
  const money = (c: number) => formatMoney(c, t.locale);

  // Index among the *other* entries, the way the drop target counts.
  const homeIndex = dragId ? entries.findIndex(e => e.id === dragId) : -1;
  const isHome = homeIndex >= 0;
  const showLine = dropIndex !== null && !collapsed && !(isHome && dropIndex === homeIndex);
  const incoming = dropIndex !== null && !isHome;
  const line = (
    <li key="drop-line" aria-hidden="true" className="h-0">
      <span className="absolute inset-x-3 -top-[1.5px] h-[3px] rounded-full bg-accent-fill z-10" />
    </li>
  );
  const rows: React.ReactNode[] = [];
  let others = 0;
  for (const e of entries) {
    if (e.id !== dragId) {
      if (showLine && dropIndex === others) rows.push(line);
      others++;
    }
    rows.push(
      <motion.li
        key={e.id}
        data-entry-row={e.id}
        layout="position"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="overflow-hidden"
      >
        <SwipeRow
          locked={dragId !== null}
          leading={{
            label: e.paid ? t.swipeOpen : income ? t.swipeReceived : t.swipePaid,
            icon: e.paid ? Circle : Check,
            className: e.paid ? 'bg-swipe-open' : 'bg-swipe-paid',
            run: () => onToggle(e),
          }}
          trailing={{ label: t.delete, icon: Trash2, className: 'bg-swipe-delete', run: () => onDelete(e) }}
        >
          <EntryRow entry={e} income={income} t={t} overdue={isOverdue(e, today)} lifted={e.id === dragId}
            dragProps={dragProps(e.id)}
            onEdit={() => onEdit(e)} onToggle={() => onToggle(e)}
            onMoveBy={delta => {
              onMoveBy(e, delta);
              // Moving the row in the DOM takes the focus with it; put it back.
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(`[data-entry-row="${e.id}"] [data-entry-body]`)?.focus());
            }} />
        </SwipeRow>
      </motion.li>,
    );
  }
  if (showLine && dropIndex! >= others) rows.push(line);

  return (
    <section
      data-hue={category.hue}
      data-drop-category={category.id}
      data-collapsed={collapsed ? 'true' : undefined}
      className={`rounded-md bg-surface card-edge overflow-hidden transition-[outline-color] ${
        incoming ? 'outline-2 outline-accent -outline-offset-2' : 'outline-transparent'}`}
      aria-label={name}
    >
      <h2 className="flex items-center">
        <button
          type="button"
          onClick={() => { tapLight(); onCollapse(); }}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapsed ? t.expand : t.collapse}
          className="flex-1 min-w-0 flex items-center gap-3 ps-4 pe-3 py-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
        >
          <Picture emoji={category.emoji} name={name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-fg wrap-compound">{name}</span>
            {collapsed && entries.length > 0 && (
              <span className="block text-caption text-fg-mute num">{plural(entries.length, t.entriesOne, t.entriesMany)}</span>
            )}
          </span>
          {/* What is paid, big; below it, small and yellow, everything including what is still open. */}
          <span className="shrink-0 text-end">
            <span className={`block rounded-num text-body font-semibold ${income && paid ? 'text-pos' : paid ? 'text-fg' : 'text-fg-mute'}`}>
              {money(paid)}
            </span>
            {open > 0 && (
              <span className="block text-caption font-medium text-warn num whitespace-nowrap">{fmt(t.sectionInclOpen, { amount: money(total) })}</span>
            )}
          </span>
          <ChevronDown
            className={`w-[18px] h-[18px] shrink-0 text-fg-faint transition-transform duration-200 ${collapsed ? '-rotate-90 rtl:rotate-90' : ''}`}
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </button>
        {onRemove && entries.length === 0 && (
          /* Quiet, not red: a new month has several empty categories, and it is undoable. */
          <IconButton label={fmt(t.removeFromMonth, { name })} icon={Trash2} tone="default" className="me-1" onClick={onRemove} />
        )}
      </h2>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {rows.length > 0 && (
              <ul className="hairline-t divide-hairline-inset" style={{ '--sep': '52px' } as React.CSSProperties}>
                <AnimatePresence initial={false}>{rows}</AnimatePresence>
              </ul>
            )}

            <button
              type="button"
              onClick={() => { tapLight(); onAdd(); }}
              aria-label={fmt(t.addTo, { name })}
              className="w-full min-h-[48px] ps-[14px] pe-4 flex items-center gap-3 hairline-t text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <span className="w-6 h-6 rounded-full bg-accent-fill text-accent-fill-ink inline-flex items-center justify-center shrink-0" aria-hidden="true">
                <Plus className="w-4 h-4" strokeWidth={3} />
              </span>
              <span className="text-body">{entries.length ? t.add : `${t.add} · ${t.sectionEmpty}`}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * A row: the paid ring (its own button, a checkbox for VoiceOver) beside the
 * row body that opens the editor. Siblings, never nested.
 */
function EntryRow({ entry: e, income, t, overdue, lifted, dragProps, onEdit, onToggle, onMoveBy }: {
  entry: Entry;
  income: boolean;
  t: Strings;
  overdue: boolean;
  /** Being dragged: it stays in place, faded, until it is dropped. */
  lifted: boolean;
  dragProps: React.HTMLAttributes<HTMLElement>;
  onEdit: () => void;
  onToggle: () => void;
  onMoveBy: (delta: -1 | 1) => void;
}) {
  const meta: React.ReactNode[] = [];
  // Status in words first, coloured — never colour or shape alone.
  if (!e.paid) {
    meta.push(
      <span key="state" className={`font-medium ${overdue ? 'text-neg' : 'text-warn'}`}>
        {overdue ? t.overdue : income ? t.expected : t.open}
      </span>,
    );
  }
  if (e.dueDay) meta.push(<span key="due">{fmt(t.dueOn, { day: e.dueDay })}</span>);
  if (e.repeat !== 'none') {
    meta.push(
      <span key="rep" className="inline-flex items-center gap-1">
        <RepeatIcon className="w-3 h-3" aria-hidden="true" />
        {e.repeat === 'monthly' ? t.repeatsMonthly : t.repeatsYearly}
      </span>,
    );
  }
  if (e.note) meta.push(<span key="note" className="wrap-compound">{e.note}</span>);
  const toggleLabel = `${e.paid ? t.markOpen : income ? t.markReceived : t.markPaid} — ${e.name}`;

  return (
    <div className={`flex items-stretch min-h-[56px] transition-opacity duration-150 ${lifted ? 'opacity-35' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={e.paid}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggle}
        className="w-[52px] shrink-0 flex items-center justify-center active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span
          className={`w-[24px] h-[24px] rounded-full inline-flex items-center justify-center transition-colors duration-200 ${
            e.paid ? 'bg-accent-fill text-accent-fill-ink' : `border-[1.75px] ${overdue ? 'border-neg' : 'border-fg-faint'}`}`}
          aria-hidden="true"
        >
          <AnimatePresence initial={false}>
            {e.paid && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}
                className="inline-flex"
              >
                <Check className="w-[15px] h-[15px]" strokeWidth={3.25} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
      <button
        type="button"
        data-entry-body=""
        {...dragProps}
        onClick={() => { tapLight(); onEdit(); }}
        onKeyDown={ev => {
          if (!ev.altKey || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
          ev.preventDefault();
          onMoveBy(ev.key === 'ArrowUp' ? -1 : 1);
        }}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        aria-label={`${fmt(t.editNamed, { name: e.name })}, ${formatMoney(e.amount, t.locale)}, ${
          e.paid ? (income ? t.receivedState : t.paidState) : overdue ? t.overdue : income ? t.expected : t.open}`}
        className="flex-1 min-w-0 py-2.5 pe-4 flex items-center gap-3 text-start select-none [-webkit-touch-callout:none] active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body text-fg wrap-compound">{e.name}</span>
          {meta.length > 0 && (
            <span className="flex flex-wrap items-center gap-x-1.5 text-caption text-fg-mute mt-0.5">
              {meta.map((m, i) => (
                <React.Fragment key={i}>{i > 0 && <span aria-hidden="true">·</span>}{m}</React.Fragment>
              ))}
            </span>
          )}
        </span>
        {/* Open money is grey, like a pending card payment; it turns solid once paid. */}
        <span className={`shrink-0 text-body font-medium num ${e.paid ? (income ? 'text-pos' : 'text-fg') : 'text-fg-mute'}`}>
          {formatMoney(e.amount, t.locale)}
        </span>
      </button>
    </div>
  );
}
