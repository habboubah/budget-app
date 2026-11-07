import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import {
  MonthBalance, addMonths, displayName, entriesOf, formatMoney, monthKeyOf, monthLabel, monthTotals, parseMonthKey, searchEntries, searchTerms,
  sortEntries,
} from '../logic';
import { Strings, fmt, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { useEntryDrag } from '../ui/useEntryDrag';
import { rise, stagger } from '../ui/stagger';
import { Picture } from '../ui/Picture';
import { SearchField } from '../ui/SearchField';
import { BalanceCard } from './BalanceCard';
import { CategorySection } from './CategorySection';
import { StartMonthCard } from './StartMonthCard';
import { IntroCard } from './IntroCard';

interface Props {
  month: MonthKey;
  balance: MonthBalance;
  categories: Category[];
  entries: Entry[];
  /** What starting this month would carry over (only used when not started). */
  candidates: Entry[];
  /** Open entries left in earlier months. */
  openEarlier: Entry[];
  showIntro: boolean;
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
  onStart: (carry: boolean) => void;
  onActions: () => void;
  onAdd: (categoryId: string) => void;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  /** Swipe left on a row (undoable). */
  onDelete: (e: Entry) => void;
  /** Tap the month's name: the month picker. */
  onPickMonth: () => void;
  onOpening: () => void;
  onDismissIntro: () => void;
  /** Opens Settings → Kategorien (when there are none left). */
  onCategories: () => void;
  onImportExcel: () => void;
  /** Ids of the categories folded down to their header. */
  collapsed: string[];
  onCollapse: (categoryId: string) => void;
  /** Take an empty category out of this month. */
  onRemoveCategory: (c: Category) => void;
  /** Open the sheet that puts a category (back) into this month. */
  onAddCategory: () => void;
  /** There are no categories at all (all deleted in Settings). */
  noCategories: boolean;
  /** Put an entry at `index` (among the others) of a category — dragged there, or Alt + ↑ / ↓. */
  onMoveEntry: (entryId: string, categoryId: string, index: number) => void;
}

/**
 * One month — one sheet of the Excel file. ‹ › step through the months (they
 * stay in the bar while scrolling). The balance card, then — for a started
 * month — every category in the user's order: income first, then fixed costs,
 * car, extras…; for a month not started yet, what starting it brings along.
 *
 * The search field under the title finds entries of this month as you type:
 * the page then shows only the hits, in their categories, with what they add
 * up to. The search stays while stepping through months.
 */
export function MonthView(p: Props) {
  const { month, balance, categories, entries, t } = p;
  const today = new Date();
  const current = monthKeyOf(today);
  const mine = entriesOf(entries, month);
  const label = monthLabel(month, t.locale);
  const { year, month: mm } = parseMonthKey(month);
  const monthName = new Intl.DateTimeFormat(t.locale, { month: 'long' }).format(new Date(year, mm - 1, 1));

  const inCategory = (categoryId: string) => sortEntries(mine.filter(e => e.categoryId === categoryId));
  // Categories showing only what is still open (kept while switching months).
  const [openOnly, setOpenOnly] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const searching = searchTerms(query).length > 0;
  const found = searching
    ? searchEntries(mine, query, { categoryName: id => displayName(categories.find(c => c.id === id)?.names, p.language), locale: t.locale })
    : [];

  // Dropping an entry where it already is changes nothing — not even its order.
  const drag = useEntryDrag((id, to) => {
    const e = mine.find(x => x.id === id);
    if (!e) return;
    // With the filter on, the drop spot counts only the open rows shown:
    // land before the same row in the full list.
    let index = to.index;
    if (openOnly.includes(to.categoryId)) {
      const others = inCategory(to.categoryId).filter(x => x.id !== id);
      const shown = others.filter(x => !x.paid);
      index = index < shown.length ? others.indexOf(shown[index]) : others.length;
    }
    if (e.categoryId === to.categoryId && inCategory(e.categoryId).findIndex(x => x.id === id) === index) return;
    p.onMoveEntry(id, to.categoryId, index);
  });
  const moveBy = (e: Entry, delta: -1 | 1) => {
    const list = inCategory(e.categoryId);
    const to = list.findIndex(x => x.id === e.id) + delta;
    if (to < 0 || to >= list.length) return;
    tapLight();
    p.onMoveEntry(e.id, e.categoryId, to);
  };
  const lifted = drag.ghost ? mine.find(e => e.id === drag.ghost!.id) : undefined;
  const liftedCategory = lifted && categories.find(c => c.id === lifted.categoryId);

  const oldestOpen = p.openEarlier.reduce<Entry | undefined>((a, e) => (!a || e.month < a.month ? e : a), undefined);
  const openSum = p.openEarlier.reduce((s, e) => s + e.amount, 0);

  return (
    <Screen
      title={label}
      tabbed
      eyebrow={month === current ? t.thisMonth : (
        <button
          type="button"
          onClick={() => { tapLight(); p.onMonth(current); }}
          className="eyebrow text-accent -mx-1 px-1 rounded-sm active:opacity-50 focus-visible:ring-focus"
        >
          {t.toThisMonth} →
        </button>
      )}
      titleSlot={
        <h1>
          <button
            type="button"
            onClick={() => { tapLight(); p.onPickMonth(); }}
            aria-haspopup="dialog"
            aria-label={`${label}, ${t.pickMonth}`}
            className="-mx-1 px-1 rounded-sm flex items-baseline gap-2 text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
          >
            <span className="display text-title font-bold text-fg tracking-[-0.025em] wrap-compound">{monthName}</span>
            <span className="display text-title font-bold text-fg-faint tracking-[-0.025em] num">{year}</span>
            <ChevronDown className="w-5 h-5 text-accent self-center mt-1 shrink-0" strokeWidth={2.6} aria-hidden="true" />
          </button>
        </h1>
      }
      accessory={
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={fmt(t.searchMonth, { month: monthName })}
          clearLabel={t.searchClear}
          cancelLabel={t.cancel}
        />
      }
      actions={
        <>
          {/* ‹ › as one floating capsule, the way iOS groups related bar buttons. */}
          <span className="inline-flex rounded-full float-chrome">
            <button
              type="button" aria-label={t.prevMonth} title={t.prevMonth}
              onClick={() => { tapLight(); p.onMonth(addMonths(month, -1)); }}
              className="h-tap w-tap inline-flex items-center justify-center rounded-full text-fg active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <ChevronLeft className="w-[22px] h-[22px] rtl:rotate-180" strokeWidth={2.2} />
            </button>
            <button
              type="button" aria-label={t.nextMonth} title={t.nextMonth}
              onClick={() => { tapLight(); p.onMonth(addMonths(month, 1)); }}
              className="h-tap w-tap inline-flex items-center justify-center rounded-full text-fg active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <ChevronRight className="w-[22px] h-[22px] rtl:rotate-180" strokeWidth={2.2} />
            </button>
          </span>
          <IconButton label={t.monthActions} icon={MoreHorizontal} tone="glass" onClick={p.onActions} />
        </>
      }
    >
      {searching ? (
        <SearchResults
          key={`search-${month}`}
          found={found}
          query={query}
          categories={categories}
          month={month}
          language={p.language}
          t={t}
          today={today}
          onEdit={p.onEdit}
          onToggle={p.onToggle}
          onDelete={p.onDelete}
        />
      ) : (<>
      <BalanceCard balance={balance} t={t} onOpening={p.onOpening} />

      {/* Keyed by month: stepping to another one brings its cards in afresh
          (the balance card above stays, and its numbers run to the new values). */}
      <motion.div key={month} className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {!balance.started ? (
        <StartMonthCard
          month={month}
          from={balance.prevKey}
          candidates={p.candidates}
          categories={categories}
          t={t}
          onStart={p.onStart}
        />
      ) : (
        <>
          {p.showIntro && (
            <IntroCard
              t={t}
              needsStart={!balance.prevKey && !balance.overridden}
              onStartingBalance={p.onOpening}
              onImportExcel={p.onImportExcel}
              onDismiss={p.onDismissIntro}
            />
          )}

          {oldestOpen && (
            <motion.div variants={rise}>
            <button
              type="button"
              onClick={() => { tapLight(); p.onMonth(oldestOpen.month); }}
              className="w-full rounded-md bg-warn-dim px-4 py-3.5 flex items-start gap-3 text-start active:scale-[0.99] transition-transform focus-visible:ring-focus"
            >
              <AlertCircle className="w-5 h-5 text-warn shrink-0 mt-0.5" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-label font-bold text-warn wrap-prose">
                  {p.openEarlier.length === 1
                    ? fmt(t.openEarlierOne, { month: monthLabel(oldestOpen.month, t.locale) })
                    : fmt(t.openEarlierMany, { n: p.openEarlier.length })}
                  {' · '}<span className="num">{formatMoney(openSum, t.locale)}</span>
                </span>
                <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{t.openEarlierBody}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-warn shrink-0 mt-0.5 rtl:rotate-180" aria-hidden="true" />
            </button>
            </motion.div>
          )}

          {p.noCategories && (
            <Empty
              emoji="🗂️"
              title={t.noCategories}
              body={t.noCategoriesBody}
              action={<Button onClick={p.onCategories}>{t.categories}</Button>}
            />
          )}

          {categories.map(c => (
            <CategorySection
              key={c.id}
              category={c}
              entries={inCategory(c.id)}
              language={p.language}
              t={t}
              today={today}
              collapsed={p.collapsed.includes(c.id)}
              onCollapse={() => p.onCollapse(c.id)}
              onRemove={() => p.onRemoveCategory(c)}
              onAdd={() => p.onAdd(c.id)}
              onEdit={p.onEdit}
              onToggle={p.onToggle}
              onDelete={p.onDelete}
              openOnly={openOnly.includes(c.id)}
              onOpenOnly={() => setOpenOnly(xs => (xs.includes(c.id) ? xs.filter(x => x !== c.id) : [...xs, c.id]))}
              dragId={drag.dragging}
              dropIndex={drag.target?.categoryId === c.id ? drag.target.index : null}
              dragProps={drag.bind}
              onMoveBy={moveBy}
            />
          ))}

          {/* A category taken out of this month (or one that isn't standard) comes back here. */}
          <motion.button
            variants={rise}
            type="button"
            onClick={() => { tapLight(); p.onAddCategory(); }}
            className="w-full min-h-[52px] rounded-md bg-surface/60 border-[1.5px] border-dashed border-hairline px-4 flex items-center justify-center gap-2 text-body text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            {t.addCategoryToMonth}
          </motion.button>
        </>
      )}
      </motion.div>
      </>)}

      {/* The row under the finger while it is dragged. */}
      {drag.ghost && lifted && createPortal(
        <div
          aria-hidden="true"
          data-hue={liftedCategory?.hue}
          className="fixed z-50 pointer-events-none"
          style={{ top: drag.ghost.y - drag.ghost.grab, left: drag.ghost.left, width: drag.ghost.width }}
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.03 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.3 }}
            className="rounded-md bg-surface card-edge shadow-[var(--shadow-e2)] min-h-chrome ps-3 pe-4 py-2.5 flex items-center gap-3"
          >
            {liftedCategory && <Picture emoji={liftedCategory.emoji} name={displayName(liftedCategory.names, p.language)} size="sm" />}
            <span className="min-w-0 flex-1 text-body font-semibold text-fg wrap-compound">{lifted.name}</span>
            <span className="shrink-0 text-body font-semibold num text-fg">{formatMoney(lifted.amount, t.locale)}</span>
          </motion.div>
        </div>,
        document.body,
      )}
    </Screen>
  );
}


/**
 * What a search found: how many, what they add up to (expenses and income
 * apart; with what of it is open when they are all one kind), then the hits
 * in their category cards — tick, swipe and edit work as usual; sorting
 * waits until the search is done.
 */
function SearchResults({ found, query, categories, month, language, t, today, onEdit, onToggle, onDelete }: {
  found: Entry[];
  query: string;
  categories: Category[];
  month: MonthKey;
  language: string;
  t: Strings;
  today: Date;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const sum = monthTotals(found, categories, month);
  const income = sum.incomePaid + sum.incomeOpen;
  const expenses = sum.expensePaid + sum.expenseOpen;
  const open = income && expenses ? 0 : income ? sum.incomeOpen : sum.expenseOpen;
  const money = (c: number, sign?: 'always') => formatMoney(c, t.locale, sign);
  const hit = new Set(found.map(e => e.categoryId));

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {found.length === 0 ? (
        <motion.div variants={rise}>
          <Empty emoji="🔍" title={fmt(t.searchNone, { q: query.trim() })} body={t.searchNoneBody} />
        </motion.div>
      ) : (
        <>
          <motion.div variants={rise} className="px-1 mb-4 flex items-start gap-3">
            <p role="status" className="min-w-0 flex-1 text-label font-semibold text-fg-mute tabular-nums">
              {plural(found.length, t.resultsOne, t.resultsMany)}
            </p>
            <div className="shrink-0 text-end">
              {expenses > 0 && <p className="text-label font-semibold num text-fg">{money(-expenses)}</p>}
              {income > 0 && <p className="text-label font-semibold num text-pos">{money(income, 'always')}</p>}
              {open > 0 && <p className="text-caption font-medium text-warn tabular-nums">{fmt(t.inclOpen, { amount: money(open) })}</p>}
            </div>
          </motion.div>
          {categories.filter(c => hit.has(c.id)).map(c => (
            <CategorySection
              key={c.id}
              category={c}
              entries={sortEntries(found.filter(e => e.categoryId === c.id))}
              search={query}
              language={language}
              t={t}
              today={today}
              collapsed={false}
              onCollapse={noop}
              onAdd={noop}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
              openOnly={false}
              onOpenOnly={noop}
              dragId={null}
              dropIndex={null}
              dragProps={noDrag}
              onMoveBy={noop}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}

const noop = () => {};
const noDrag = () => ({});
