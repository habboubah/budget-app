import React, { useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Plus, Repeat as RepeatIcon, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { displayName, formatMoney, isOverdue } from '../logic';
import { Strings, fmt, plural } from '../translations';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { IconButton } from '../ui/Button';

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
}

/**
 * One category of a month — one column of the Excel sheet: its total, how much
 * of it is still open, its entries, and an add row at the bottom. Tapping the
 * header folds the card down to that header and back; the state is kept per
 * category, so a category minimised stays minimised in every month.
 */
export function CategorySection({ category, entries, language, t, today, collapsed, onCollapse, onRemove, onAdd, onEdit, onToggle }: Props) {
  const bodyId = useId();
  const name = displayName(category.names, language);
  const income = category.kind === 'income';
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const open = entries.reduce((s, e) => s + (e.paid ? 0 : e.amount), 0);
  const money = (c: number) => formatMoney(c, t.locale);

  return (
    <section data-hue={category.hue} className="rounded-md bg-surface card-edge overflow-hidden" aria-label={name}>
      <h2 className="flex items-center">
        <button
          type="button"
          onClick={() => { tapLight(); onCollapse(); }}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapsed ? t.expand : t.collapse}
          className="flex-1 min-w-0 flex items-center gap-3 ps-4 pe-3 pt-3.5 pb-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
        >
          <Picture emoji={category.emoji} name={name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block display text-heading font-bold text-fg wrap-compound">{name}</span>
            {(open > 0 || (collapsed && entries.length > 0)) && (
              <span className="flex flex-wrap gap-x-2 text-caption font-semibold num">
                {collapsed && entries.length > 0 && (
                  <span className="text-fg-mute whitespace-nowrap">{plural(entries.length, t.entriesOne, t.entriesMany)}</span>
                )}
                {open > 0 && <span className="text-warn whitespace-nowrap">{fmt(t.sectionOpen, { amount: money(open) })}</span>}
              </span>
            )}
          </span>
          <span className={`display text-heading font-bold num shrink-0 ${income && total ? 'text-pos' : total ? 'text-fg' : 'text-fg-mute'}`}>
            {money(total)}
          </span>
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-fg-mute transition-transform duration-200 ${collapsed ? '-rotate-90 rtl:rotate-90' : ''}`}
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
            {entries.length > 0 && (
              <ul className="hairline-t divide-hairline-inset" style={{ '--sep': '60px' } as React.CSSProperties}>
                <AnimatePresence initial={false}>
                  {entries.map(e => (
                    <motion.li
                      key={e.id}
                      layout="position"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <EntryRow entry={e} income={income} t={t} overdue={isOverdue(e, today)}
                        onEdit={() => onEdit(e)} onToggle={() => onToggle(e)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <button
              type="button"
              onClick={() => { tapLight(); onAdd(); }}
              aria-label={fmt(t.addTo, { name })}
              className="w-full min-h-chrome px-4 flex items-center gap-3 hairline-t text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <span className="w-7 h-7 ms-0.5 rounded-full bg-accent-dim inline-flex items-center justify-center shrink-0" aria-hidden="true">
                <Plus className="w-4 h-4" strokeWidth={2.75} />
              </span>
              <span className="text-label font-semibold">{entries.length ? t.add : `${t.add} · ${t.sectionEmpty}`}</span>
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
function EntryRow({ entry: e, income, t, overdue, onEdit, onToggle }: {
  entry: Entry;
  income: boolean;
  t: Strings;
  overdue: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const meta: React.ReactNode[] = [];
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
    <div className="flex items-stretch min-h-chrome">
      <button
        type="button"
        role="checkbox"
        aria-checked={e.paid}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggle}
        className="w-[60px] shrink-0 flex items-center justify-center active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span
          className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-colors duration-200 ${
            e.paid ? 'bg-accent-fill text-accent-fill-ink' : `border-2 border-dashed ${overdue ? 'border-neg' : 'border-warn'}`}`}
          aria-hidden="true"
        >
          <AnimatePresence initial={false}>
            {e.paid && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}
                className="inline-flex"
              >
                <Check className="w-4 h-4" strokeWidth={3.25} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
      <button
        type="button"
        onClick={() => { tapLight(); onEdit(); }}
        aria-label={`${fmt(t.editNamed, { name: e.name })}, ${formatMoney(e.amount, t.locale)}, ${
          e.paid ? (income ? t.receivedState : t.paidState) : overdue ? t.overdue : income ? t.expected : t.open}`}
        className="flex-1 min-w-0 py-2.5 pe-4 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
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
        <span className="shrink-0 text-end">
          <span className={`block text-body font-semibold num ${e.paid ? (income ? 'text-pos' : 'text-fg') : 'text-fg-mute'}`}>
            {formatMoney(e.amount, t.locale)}
          </span>
          {!e.paid && (
            <span className={`inline-block mt-0.5 px-2 py-px rounded-full text-micro font-bold ${
              overdue ? 'bg-neg-dim text-neg' : 'bg-warn-dim text-warn'}`}>
              {overdue ? t.overdue : income ? t.expected : t.open}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
