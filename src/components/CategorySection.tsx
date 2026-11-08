import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronsDownUp, ChevronsUpDown, Circle, CircleMinus, Gauge, ListFilter, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { Category, Entry } from '../types';
import { dayLabel, displayName, formatMoney, formatMoneyShort, isOverdue } from '../logic';
import { BudgetStatus } from '../budgets';
import { BudgetBar } from './BudgetBar';
import { Strings, fmt, plural } from '../translations';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { IconButton } from '../ui/Button';
import { Menu, MenuItem } from '../ui/Menu';
import { SwipeRow } from '../ui/SwipeRow';
import { Highlight } from '../ui/Highlight';
import { rise } from '../ui/stagger';

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
  /** Take the category out of this month — offered (in its menu) only while it is empty. */
  onRemove?: () => void;
  onAdd: () => void;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  /** Swipe left: delete (undoable). */
  onDelete: (e: Entry) => void;
  /** The category's budget in this month, if it has one: the bar and the line under it say how it stands. */
  budget?: BudgetStatus | null;
  /** Set or change the budget (the card's menu) — spending categories only. */
  onBudget?: () => void;
  /** Showing only what is still open (from the card's "⋯" menu, or the page's filter). */
  openOnly: boolean;
  onOpenOnly: () => void;
  /** The entry being dragged right now (from any category), if any. */
  dragId: string | null;
  /** Where the dragged entry would land in this category, if it is over it. */
  dropIndex: number | null;
  /** Drag handlers for an entry's row body (from `useEntryDrag`). */
  dragProps: (id: string) => React.HTMLAttributes<HTMLElement>;
  /** Alt + ↑ / ↓: move an entry one place up or down within the category. */
  onMoveBy: (e: Entry, delta: -1 | 1) => void;
  /**
   * A search result: `entries` are the hits, their words marked. The card
   * stays open and has no add row, filter or fold — it only shows what was found.
   */
  search?: string;
}

/**
 * One category of a month — one column of the Excel sheet. The header: its
 * name and what of it is paid, a bar for the paid share, and a line saying
 * what is still open (and, in yellow, the total including it); a "⋯" menu
 * beside it adds, filters and folds. Then its entries and an add row.
 * Tapping the header folds the card down to that header and back; the state
 * is kept per category, so a category minimised stays minimised in every month.
 *
 * Entries can be dragged (press and hold): within the card to sort them, or
 * onto another card to move them there. While one is dragged over this card,
 * a line shows where it would land. A swipe marks one paid or deletes it.
 */
export function CategorySection({
  category, entries: all, language, t, today, collapsed, onCollapse, onRemove, onAdd, onEdit, onToggle, onDelete,
  budget, onBudget, openOnly, onOpenOnly, dragId, dropIndex, dragProps, onMoveBy, search,
}: Props) {
  // The filter hides what is paid; totals still count everything.
  const entries = openOnly ? all.filter(e => !e.paid || e.id === dragId) : all;
  const hidden = all.length - entries.length;
  const bodyId = useId();
  // The body only fades in when unfolded — not when the card first appears.
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const name = displayName(category.names, language);
  const income = category.kind === 'income';
  const total = all.reduce((s, e) => s + e.amount, 0);
  const open = all.reduce((s, e) => s + (e.paid ? 0 : e.amount), 0);
  const paid = total - open;
  const openCount = all.filter(e => !e.paid).length;
  const overdueCount = all.filter(e => isOverdue(e, today)).length;
  const money = (c: number) => formatMoney(c, t.locale);
  // The line under the bar: what is still to come, in words.
  const status = openCount
    ? fmt(income ? t.nExpected : t.nOpen, { n: openCount })
    : all.length ? (income ? t.allReceived : t.allPaid) : t.sectionEmpty;

  const short = (c: number) => formatMoneyShort(c, t.locale);
  // With a budget, the line under the bar says how it stands; the status moves to its end.
  const over = budget && budget.left < 0;

  const menu: MenuItem[][] = [
    [
      { key: 'add', label: t.addEntry, icon: Plus, onSelect: onAdd },
      ...(onBudget ? [{
        key: 'budget', label: t.budgetMenu, icon: Gauge, onSelect: onBudget,
        sub: budget ? fmt(t.budgetLine, { amount: short(budget.limit) }) : undefined,
      }] : []),
    ],
    [
      ...(all.length > 0 && (openCount > 0 || openOnly)
        ? [{ key: 'open-only', label: openOnly ? t.showAllEntries : t.showOpenOnly, icon: ListFilter, onSelect: onOpenOnly }]
        : []),
      { key: 'fold', label: collapsed ? t.expand : t.collapse, icon: collapsed ? ChevronsUpDown : ChevronsDownUp, onSelect: onCollapse },
    ],
    onRemove && all.length === 0 ? [{ key: 'remove', label: t.removeFromThisMonth, icon: CircleMinus, onSelect: onRemove }] : [],
  ];

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
          <EntryRow entry={e} income={income} t={t} overdue={isOverdue(e, today)} lifted={e.id === dragId} search={search}
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
    <motion.section
      variants={rise}
      // A card folding above moves this one with a transform (FLIP), never
      // by animating anyone's height — see the body below.
      layout="position"
      transition={{ layout: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }}
      data-hue={category.hue}
      data-drop-category={category.id}
      data-collapsed={collapsed ? 'true' : undefined}
      className={`rounded-md bg-surface card-edge overflow-hidden transition-[outline-color] ${
        incoming ? 'outline-2 outline-accent -outline-offset-2' : 'outline-transparent'}`}
      aria-label={name}
    >
      <h2 className="flex items-center">
        <HeaderShell
          search={!!search}
          onClick={() => { tapLight(); onCollapse(); }}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapsed ? t.expand : t.collapse}
        >
          <Picture emoji={category.emoji} name={name} size="sm" />
          <span className="min-w-0 flex-1">
            {/* The name and what is paid, then the bar, then what is still to come.
                (No amount on a search result: the hits are summed above the cards.) */}
            {/* The amount wraps under the name once the name would get narrower
                than its basis (in rem: large text stacks them, as iOS lists do). */}
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="min-w-0 flex-1 basis-[7rem] text-body font-semibold text-fg wrap-compound">{name}</span>
              {!search && (
                // The margin on a wrapper: rounded-num turns its own box left to right (Arabic).
                <span className="ms-auto shrink-0">
                  <span className={`block rounded-num text-body font-semibold ${income && paid ? 'text-pos' : paid ? 'text-fg' : 'text-fg-mute'}`}>
                    {money(paid)}
                  </span>
                </span>
              )}
            </span>
            {!search && !budget && <>
              {/* How much of it is paid, in the category's colour. The amounts say it in numbers. */}
              <span aria-hidden="true" className="mt-2 block h-[5px] rounded-full bg-surface-2 overflow-hidden">
                <motion.span
                  className="block h-full rounded-full bg-hue-chart"
                  initial={false}
                  animate={{ width: `${total > 0 ? Math.max(0, Math.min(1, paid / total)) * 100 : 0}%` }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
                />
              </span>
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-caption">
                <span className="text-fg-mute tabular-nums">
                  {status}
                  {overdueCount > 0 && <>{' · '}<span className="font-medium text-neg">{fmt(t.nOverdue, { n: overdueCount })}</span></>}
                  {collapsed && ` · ${t.foldedNote}`}
                </span>
                {/* Everything including what is still open, in the pending colour. */}
                {open > 0 && (
                  <span className="ms-auto font-medium text-warn tabular-nums whitespace-nowrap">{fmt(t.sectionInclOpen, { amount: money(total) })}</span>
                )}
              </span>
            </>}
            {!search && budget && <>
              <BudgetBar status={budget} className="mt-2" />
              {/* The budget and what is left of it; at the end, the one thing to know:
                  over it, paying out ahead of the month's pace, or what is still open. */}
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-caption">
                <span className="text-fg-mute tabular-nums">
                  {fmt(t.budgetLine, { amount: short(budget.limit) })}
                  {!over && ` · ${fmt(t.budgetLeft, { amount: money(budget.left) })}`}
                  {collapsed && ` · ${t.foldedNote}`}
                </span>
                <span className="ms-auto tabular-nums">
                  {over ? (
                    <span className="font-semibold text-neg whitespace-nowrap">{fmt(t.budgetOver, { amount: money(-budget.left) })}</span>
                  ) : budget.ahead ? (
                    <span className="font-medium text-warn">{t.budgetAhead}</span>
                  ) : openCount > 0 || overdueCount > 0 ? (
                    <span className="text-fg-mute">
                      {openCount > 0 && status}
                      {overdueCount > 0 && <>{openCount > 0 && ' · '}<span className="font-medium text-neg">{fmt(t.nOverdue, { n: overdueCount })}</span></>}
                    </span>
                  ) : null}
                </span>
              </span>
            </>}
          </span>
        </HeaderShell>
        {!search && (
          <IconButton
            label={`${t.more} — ${name}`}
            icon={MoreHorizontal}
            aria-haspopup="menu"
            aria-expanded={menuAt ? true : undefined}
            className="me-1"
            onClick={e => setMenuAt(e.currentTarget)}
          />
        )}
      </h2>
      {!search && <Menu anchor={menuAt} label={name} groups={menu} onClose={() => setMenuAt(null)} />}

      {/* Folding is instant for the card itself; the body fades in, and the
          cards below glide to their new place (their `layout`). Animating
          height: auto here re-laid-out the whole page on every frame. */}
      {!collapsed && (
          <motion.div
            key="body"
            id={bodyId}
            initial={first.current ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            {openOnly && entries.length === 0 && (
              <p className="hairline-t px-4 py-3 text-label text-fg-mute">{t.nothingOpen}</p>
            )}
            {rows.length > 0 && (
              <ul className="hairline-t divide-hairline-inset" style={{ '--sep': '52px' } as React.CSSProperties}>
                <AnimatePresence initial={false}>{rows}</AnimatePresence>
              </ul>
            )}
            {/* The filter says what it hides, and lifts it in one tap (as Reminders does with its completed ones). */}
            {!search && openOnly && hidden > 0 && (
              <button
                type="button"
                onClick={() => { tapLight(); onOpenOnly(); }}
                className="w-full min-h-tap hairline-t ps-[52px] pe-4 py-2 flex flex-wrap items-center gap-x-1.5 text-caption text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
              >
                <span className="text-fg-mute tabular-nums">{plural(hidden, t.hiddenOne, t.hiddenMany)}</span>
                <span className="text-fg-mute" aria-hidden="true">·</span>
                <span className="font-semibold text-accent">{t.showAllEntries}</span>
              </button>
            )}

            {!search && <button
              type="button"
              onClick={() => { tapLight(); onAdd(); }}
              aria-label={fmt(t.addTo, { name })}
              className="w-full min-h-[48px] ps-[14px] pe-4 flex items-center gap-3 hairline-t text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <span className="w-6 h-6 rounded-full bg-accent-fill text-accent-fill-ink inline-flex items-center justify-center shrink-0" aria-hidden="true">
                <Plus className="w-4 h-4" strokeWidth={3} />
              </span>
              <span className="text-body">{all.length ? t.add : `${t.add} · ${t.sectionEmpty}`}</span>
            </button>}
          </motion.div>
      )}
    </motion.section>
  );
}

/**
 * The header's body: the fold button, or — on a search result, which does not
 * fold — the same layout, not interactive.
 */
function HeaderShell({ search, children, ...button }: { search: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const layout = 'flex-1 min-w-0 flex items-center gap-2.5 ps-3.5 pe-2 py-3 text-start';
  if (search) return <div className={layout}>{children}</div>;
  return (
    <button type="button" {...button} className={`${layout} active:bg-surface-2 transition-colors focus-visible:ring-focus`}>
      {children}
    </button>
  );
}

/**
 * A row: the paid ring (its own button, a checkbox for VoiceOver) beside the
 * row body that opens the editor. Siblings, never nested.
 */
function EntryRow({ entry: e, income, t, overdue, lifted, search, dragProps, onEdit, onToggle, onMoveBy }: {
  entry: Entry;
  /** The search this row was found by: its words are marked. */
  search?: string;
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
  // The date first — it is also when an open entry is due; then, while open,
  // the status in words, coloured — never colour or shape alone. How often it
  // repeats is for the editor, not the list.
  if (e.date) meta.push(<span key="date" className="whitespace-nowrap">{dayLabel(e.date, t.locale)}</span>);
  if (!e.paid) {
    meta.push(
      <span key="state" className={`font-medium ${overdue ? 'text-neg' : 'text-warn'}`}>
        {overdue ? t.overdue : income ? t.expected : t.open}
      </span>,
    );
  }
  if (e.note) meta.push(<span key="note" className="wrap-compound"><Highlight text={e.note} query={search} /></span>);
  // A part of a split payment (plan 21): a quiet marker; tapping the row opens its editor.
  if (e.splitId) meta.push(<span key="split" className="text-fg-mute">{t.splitPayPart}</span>);
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
        {/* Ticked in the category's colour, with a small pop as it fills. */}
        <motion.span
          className={`w-[24px] h-[24px] rounded-full inline-flex items-center justify-center transition-colors duration-200 ${
            e.paid ? 'bg-hue-chart text-chart-label' : `border-[1.75px] ${overdue ? 'border-neg' : 'border-fg-faint'}`}`}
          initial={false}
          animate={{ scale: e.paid ? [1, 1.22, 1] : 1 }}
          transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
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
        </motion.span>
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
          <span className="block text-body text-fg wrap-compound"><Highlight text={e.name} query={search} /></span>
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
          <Highlight text={formatMoney(e.amount, t.locale)} query={search} />
        </span>
      </button>
    </div>
  );
}
