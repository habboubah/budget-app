import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, ListFilter, MoreHorizontal, Plus } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import {
  MonthBalance, addMonths, displayName, entriesOf, formatMoney, monthKeyOf, monthLabel, parseMonthKey, searchByMonth, searchEntries, searchTerms,
  sortEntries, monthStartDay,
} from '../logic';
import { periodLabel } from './MonthStartSheet';
import { Strings, capitalize, fmt, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { useEntryDrag } from '../ui/useEntryDrag';
import { rise, stagger } from '../ui/stagger';
import { Picture } from '../ui/Picture';
import { SearchField } from '../ui/SearchField';
import { AccountSwitch, BalanceCard } from './BalanceCard';
import { MonthTrack } from '../insights';
import { CategorySection } from './CategorySection';
import { StartMonthCard } from './StartMonthCard';
import { EmptyCategories } from './EmptyCategories';
import { budgetStatus } from '../budgets';
import { dueSoon } from '../due';
import { DueSoonRail } from './DueSoonRail';

interface Props {
  month: MonthKey;
  balance: MonthBalance;
  categories: Category[];
  entries: Entry[];
  /** What starting this month would carry over (only used when not started). */
  candidates: Entry[];
  /** Open entries left in earlier months. */
  openEarlier: Entry[];
  /** The first run's setup card (App builds it), or the tips card after it. */
  setup?: React.ReactNode;
  /** The month-review card about last month (App builds it; plan 13). */
  review?: React.ReactNode;
  /** A search to open with ("Alle Einträge" of a payee), used once. */
  searchSeed?: string | null;
  onSearchSeedUsed?: () => void;
  /** The month's balance day by day, for the line on the balance card (App builds it). */
  track?: MonthTrack | null;
  /** No balance card yet: the setup asks for the balance first, instead of a card full of zeros. */
  hideBalance?: boolean;
  /** When this month was last matched against the bank (plan 10). */
  reconciledAt?: number;
  /** The balance card's eye, while amounts are hidden (plan 06). */
  peek?: { shown: boolean; onToggle: () => void };
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
  onStart: (carry: boolean) => void;
  /** The "⋯" button was tapped: the month's menu opens from it. */
  onActions: (anchor: HTMLElement) => void;
  onAdd: (categoryId: string) => void;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  /** Swipe left on a row (undoable). */
  onDelete: (e: Entry) => void;
  /** Tap the month's name: the month picker. */
  onPickMonth: () => void;
  /** Unset for "Alle Konten" (plan 30). */
  onOpening?: () => void;
  /** The balance card's account switch, once there is more than one account (plan 30). */
  account?: AccountSwitch;
  /** The month's transfers between accounts (App builds the card; plan 30). */
  transfers?: React.ReactNode;
  /** Captured payments waiting to be looked through (plan 19, *Erst prüfen*). */
  captured?: { count: number; onOpen: () => void };
  /**
   * What the budgets count (plan 30): every account's entries — a budget is
   * the category's, wherever it was paid from. Defaults to `entries`.
   */
  budgetEntries?: Entry[];
  /** A budget alone earns a category its card (unset = yes). Off for an account besides the main one: only what it was used for shows. */
  budgetCards?: boolean;
  /** Opens Settings → Kategorien (when there are none left). */
  onCategories: () => void;
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
  /** Set or change a category's monthly budget. */
  onBudget: (c: Category) => void;
  /** Ticked off in "Demnächst fällig" (it leaves the rail; the toast can undo it). */
  onTickDue: (e: Entry) => void;
  /** "Alle" in "Demnächst fällig": the whole list. */
  onDueAll: () => void;
  /** Every category, not just this month's — what is due may come from an earlier month. */
  allCategories: Category[];
}

/**
 * One month — one sheet of the Excel file. ‹ › step through the months (they
 * stay in the bar while scrolling). The balance card, then — for a started
 * month — every category in the user's order: income first, then fixed costs,
 * car, extras…; for a month not started yet, what starting it brings along.
 *
 * The search field under the title finds entries in every month as you
 * type: the page then shows only the hits, month by month (this one first),
 * in their categories, with what they add up to. Beside it, a filter shows
 * only what is still pending — in every category at once; each card keeps
 * its own filter too.
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
  // Categories showing only what is still open (kept while switching months),
  // or the whole page at once.
  const [openOnly, setOpenOnly] = useState<string[]>([]);
  const [allOpen, setAllOpen] = useState(false);
  const filtered = (categoryId: string) => allOpen || openOnly.includes(categoryId);
  const openCount = mine.filter(e => !e.paid).length;
  // With the page filtered, only categories with something pending show.
  // Otherwise every category with entries gets its card, and the empty ones
  // wait in one row of chips at the end.
  // A category with a budget always has something to say (what is left of it), so it keeps its card.
  const used = new Set(mine.map(e => e.categoryId));
  const hasCard = (c: Category) => used.has(c.id) || (p.budgetCards !== false && c.kind === 'expense' && !!c.limit);
  const shownCategories = allOpen
    ? categories.filter(c => mine.some(e => e.categoryId === c.id && !e.paid))
    : categories.filter(hasCard);
  const emptyCategories = allOpen ? [] : categories.filter(c => !hasCard(c));

  const [query, setQuery] = useState(p.searchSeed ?? '');
  // A payee's "Alle Einträge" opens the page on its search, once.
  useEffect(() => { if (p.searchSeed) p.onSearchSeedUsed?.(); }, []);
  const searching = searchTerms(query).length > 0;
  // Every month is searched; the category names come from all categories, not just this month's.
  const found = searching
    ? searchEntries(entries, query, { categoryName: id => displayName(p.allCategories.find(c => c.id === id)?.names, p.language), locale: t.locale })
    : [];

  // Dropping an entry where it already is changes nothing — not even its order.
  const drag = useEntryDrag((id, to) => {
    const e = mine.find(x => x.id === id);
    if (!e) return;
    // With the filter on, the drop spot counts only the open rows shown:
    // land before the same row in the full list.
    let index = to.index;
    if (filtered(to.categoryId)) {
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
  // The row under the finger wears the category it would land in: over a
  // small target (an empty category's chip) the row itself hides the target.
  const landing = lifted && categories.find(c => c.id === (drag.target?.categoryId ?? lifted.categoryId));
  const moving = !!landing && landing.id !== lifted?.categoryId;

  // What is due next, on the running month only (and not while the page is
  // filtered to the open entries anyway). It lists earlier months' open
  // entries too, overdue — so their banner steps aside while it shows.
  const due = month === current && balance.started && !allOpen ? dueSoon(entries, today) : [];
  const oldestOpen = due.length ? undefined : p.openEarlier.reduce<Entry | undefined>((a, e) => (!a || e.month < a.month ? e : a), undefined);
  const openSum = p.openEarlier.reduce((s, e) => s + e.amount, 0);

  return (
    <Screen
      still
      title={label}
      tabbed
      subtitle={monthStartDay() !== 1 ? periodLabel(month, t) : undefined}
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
            data-tour="month"
            aria-label={`${label}, ${t.pickMonth}`}
            // The year wraps under the month's name rather than squeezing it (large text).
            className="-mx-1 px-1 min-h-tap rounded-sm flex flex-wrap items-baseline gap-x-2 text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
          >
            <span className="display text-title font-bold text-fg tracking-[-0.025em] wrap-prose">{capitalize(monthName, t.locale)}</span>
            <span className="display text-title font-bold text-fg-faint tracking-[-0.025em] num">{year}</span>
            <ChevronDown className="w-5 h-5 text-accent self-center mt-1 shrink-0" strokeWidth={2.6} aria-hidden="true" />
          </button>
        </h1>
      }
      accessory={
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1" data-tour="search">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={fmt(t.searchMonth, { month: monthName })}
              clearLabel={t.searchClear}
              cancelLabel={t.cancel}
            />
          </div>
          {/* Only what is still pending, across the page. */}
          {!searching && balance.started && (openCount > 0 || allOpen) && (
            <button
              type="button"
              aria-pressed={allOpen}
              aria-label={allOpen ? t.showAllEntries : t.showPendingEverywhere}
              title={allOpen ? t.showAllEntries : t.showPendingEverywhere}
              onClick={() => { tapLight(); setAllOpen(v => !v); }}
              className={`shrink-0 h-11 ps-3 pe-3.5 rounded-full inline-flex items-center gap-1.5 text-label font-semibold tabular-nums transition-colors focus-visible:ring-focus ${
                allOpen ? 'bg-warn-dim text-warn' : 'bg-surface card-edge text-fg-mute active:bg-surface-2'}`}
            >
              <ListFilter className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
              {openCount}
            </button>
          )}
        </div>
      }
      actions={
        <>
          {/* ‹ › as one floating capsule, the way iOS groups related bar buttons. */}
          <span className="inline-flex rounded-full glass-chrome">
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
          <IconButton label={t.monthActions} icon={MoreHorizontal} tone="glass" aria-haspopup="menu" data-tour="actions" onClick={e => p.onActions(e.currentTarget)} />
        </>
      }
    >
      {searching ? (
        <SearchResults
          key={`search-${month}`}
          found={found}
          query={query}
          categories={p.allCategories}
          month={month}
          language={p.language}
          t={t}
          today={today}
          onEdit={p.onEdit}
          onToggle={p.onToggle}
          onDelete={p.onDelete}
          onOpenMonth={m => { setQuery(''); p.onMonth(m); }}
        />
      ) : (<>
      {!p.hideBalance && <BalanceCard balance={balance} track={p.track} t={t} onOpening={p.onOpening} onSwipe={d => p.onMonth(addMonths(month, d))} reconciledAt={p.reconciledAt} peek={p.peek} account={p.account} />}

      {/* Keyed by month: stepping to another one brings its cards in afresh
          (the balance card above stays, and its numbers run to the new values). */}
      <motion.div key={month} className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {!balance.started ? (
        <StartMonthCard
          month={month}
          from={balance.prevKey}
          candidates={p.candidates.filter(e => !e.transfer)}
          categories={categories}
          t={t}
          onStart={p.onStart}
        />
      ) : (
        <>
          {p.captured && p.captured.count > 0 && month === current && (
            <button
              type="button"
              onClick={() => { tapLight(); p.captured?.onOpen(); }}
              className="w-full min-h-tap rounded-lg bg-accent-dim px-4 py-3 flex items-center gap-3 text-start active:opacity-70 focus-visible:ring-focus"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-accent wrap-compound">{fmt(t.captureNew, { n: p.captured.count })}</span>
                <span className="block text-caption text-fg-mute wrap-prose">{t.captureNewSub}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-accent shrink-0 rtl:rotate-180" aria-hidden="true" />
            </button>
          )}
          {due.length > 0 && (
            <DueSoonRail items={due} categories={p.allCategories} language={p.language} t={t}
              onEdit={p.onEdit} onTick={p.onTickDue} onAll={p.onDueAll} />
          )}

          {p.setup}

          {p.review && <motion.div variants={rise}>{p.review}</motion.div>}

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

          {allOpen && shownCategories.length === 0 && (
            <motion.div variants={rise}>
              <Empty emoji="✅" title={t.nothingOpen} />
            </motion.div>
          )}

          {shownCategories.map(c => (
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
              budget={budgetStatus(p.budgetEntries ?? entries, c, month, today)}
              onBudget={c.kind === 'expense' ? () => p.onBudget(c) : undefined}
              openOnly={filtered(c.id)}
              onOpenOnly={() => {
                // Turning one card's filter off while the page filter is on: the others stay filtered.
                if (allOpen) { setAllOpen(false); setOpenOnly(categories.map(x => x.id).filter(id => id !== c.id)); return; }
                setOpenOnly(xs => (xs.includes(c.id) ? xs.filter(x => x !== c.id) : [...xs, c.id]));
              }}
              dragId={drag.dragging}
              dropIndex={drag.target?.categoryId === c.id ? drag.target.index : null}
              dragProps={drag.bind}
              onMoveBy={moveBy}
            />
          ))}

          {p.transfers}

          {emptyCategories.length > 0 && (
            <EmptyCategories
              categories={emptyCategories}
              language={p.language}
              t={t}
              dropOn={drag.target?.categoryId ?? null}
              onAdd={c => p.onAdd(c.id)}
              onRemove={p.onRemoveCategory}
              onBudget={p.onBudget}
            />
          )}

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
          data-hue={landing?.hue}
          className="fixed z-50 pointer-events-none"
          style={{ top: drag.ghost.y - drag.ghost.grab, left: drag.ghost.left, width: drag.ghost.width }}
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.03 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.3 }}
            className="rounded-md bg-surface card-edge shadow-[var(--shadow-e2)] min-h-chrome ps-3 pe-4 py-2.5 flex items-center gap-3"
          >
            {landing && <Picture emoji={landing.emoji} name={displayName(landing.names, p.language)} size="sm" />}
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-fg wrap-compound">{lifted.name}</span>
              {moving && <span className="block text-caption font-medium text-accent wrap-compound">{fmt(t.dropInto, { category: displayName(landing.names, p.language) })}</span>}
            </span>
            <span className="shrink-0 text-body font-semibold num text-fg">{formatMoney(lifted.amount, t.locale)}</span>
          </motion.div>
        </div>,
        document.body,
      )}
    </Screen>
  );
}


/** Hits shown at once; "Mehr" adds as many again. */
const SEARCH_PAGE = 50;

/**
 * What a search found, in every month: how many and in how many months, what
 * they add up to (expenses and income apart; with what of it is open when
 * they are all one kind), then month by month — the month on screen first,
 * the others newest first — the hits in their category cards. Tick, swipe
 * and edit work as usual; sorting waits until the search is done. A month's
 * name opens that month. Fifty at a time.
 */
function SearchResults({ found, query, categories, month, language, t, today, onEdit, onToggle, onDelete, onOpenMonth }: {
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
  onOpenMonth: (m: MonthKey) => void;
}) {
  const [limit, setLimit] = useState(SEARCH_PAGE);
  const kind = new Map(categories.map(c => [c.id, c.kind]));
  let income = 0;
  let expenses = 0;
  let incomeOpen = 0;
  let expenseOpen = 0;
  for (const e of found) {
    if (kind.get(e.categoryId) === 'income') { income += e.amount; if (!e.paid) incomeOpen += e.amount; }
    else { expenses += e.amount; if (!e.paid) expenseOpen += e.amount; }
  }
  const open = income && expenses ? 0 : income ? incomeOpen : expenseOpen;
  const money = (c: number, sign?: 'always') => formatMoney(c, t.locale, sign);
  const { groups, total, shown } = searchByMonth(found, month, limit);
  const monthCount = new Set(found.map(e => e.month)).size;

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {found.length === 0 ? (
        <motion.div variants={rise}>
          <Empty emoji="🔍" title={fmt(t.searchNone, { q: query.trim() })} body={t.searchNoneBody} />
        </motion.div>
      ) : (
        <>
          <motion.div variants={rise} className="px-1 mb-4 flex items-start gap-3">
            <p role="status" className="min-w-0 flex-1 text-label font-semibold text-fg-mute tabular-nums wrap-prose">
              {plural(found.length, t.resultsOne, t.resultsMany)} {plural(monthCount, t.inMonthsOne, t.inMonthsMany)}
            </p>
            <div className="shrink-0 text-end">
              {expenses > 0 && <p className="text-label font-semibold num text-fg">{money(-expenses)}</p>}
              {income > 0 && <p className="text-label font-semibold num text-pos">{money(income, 'always')}</p>}
              {open > 0 && <p className="text-caption font-medium text-warn tabular-nums">{fmt(t.inclOpen, { amount: money(open) })}</p>}
            </div>
          </motion.div>
          {groups.map(g => {
            const hit = new Set(g.entries.map(e => e.categoryId));
            const label = monthLabel(g.month, t.locale);
            return (
              <motion.section key={g.month} variants={rise} className="space-y-3" aria-label={label}>
                <h2 className="px-1 flex items-baseline gap-2">
                  <button
                    type="button"
                    onClick={() => { tapLight(); onOpenMonth(g.month); }}
                    aria-label={fmt(t.openMonth, { month: label })}
                    className="min-w-0 -mx-1 px-1 min-h-tap rounded-sm inline-flex items-center gap-1 display text-heading font-semibold text-fg text-start active:opacity-60 focus-visible:ring-focus"
                  >
                    <span className="wrap-compound">{label}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.6} aria-hidden="true" />
                  </button>
                  <span className="ms-auto shrink-0 text-caption font-medium text-fg-mute tabular-nums">{plural(g.entries.length, t.resultsOne, t.resultsMany)}</span>
                </h2>
                {categories.filter(c => hit.has(c.id)).map(c => (
                  <CategorySection
                    key={c.id}
                    category={c}
                    entries={sortEntries(g.entries.filter(e => e.categoryId === c.id))}
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
              </motion.section>
            );
          })}
          {shown < total && (
            <motion.div variants={rise}>
              <Button variant="secondary" full onClick={() => setLimit(l => l + SEARCH_PAGE)}>
                {fmt(t.searchMore, { n: total - shown })}
              </Button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

const noop = () => {};
const noDrag = () => ({});
