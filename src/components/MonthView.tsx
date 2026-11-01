import { AlertCircle, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import { MonthBalance, addMonths, entriesOf, formatMoney, monthKeyOf, monthLabel, sortEntries } from '../logic';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';
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
}

/**
 * One month — one sheet of the Excel file. ‹ › step through the months (they
 * stay in the bar while scrolling). The balance card, then — for a started
 * month — every category in the user's order: income first, then fixed costs,
 * car, extras…; for a month not started yet, what starting it brings along.
 */
export function MonthView(p: Props) {
  const { month, balance, categories, entries, t } = p;
  const today = new Date();
  const current = monthKeyOf(today);
  const mine = entriesOf(entries, month);
  const label = monthLabel(month, t.locale);

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
      actions={
        <>
          <IconButton label={t.monthActions} icon={MoreHorizontal} tone="accent" onClick={p.onActions} />
          <IconButton label={t.prevMonth} icon={ChevronLeft} tone="accent" className="rtl:rotate-180" onClick={() => p.onMonth(addMonths(month, -1))} />
          <IconButton label={t.nextMonth} icon={ChevronRight} tone="accent" className="rtl:rotate-180" onClick={() => p.onMonth(addMonths(month, 1))} />
        </>
      }
    >
      <BalanceCard balance={balance} t={t} onOpening={p.onOpening} />

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
            <button
              type="button"
              onClick={() => { tapLight(); p.onMonth(oldestOpen.month); }}
              className="w-full rounded-md bg-warn-dim p-4 flex items-start gap-3 text-start active:scale-[0.99] transition-transform focus-visible:ring-focus"
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
              entries={sortEntries(mine.filter(e => e.categoryId === c.id))}
              language={p.language}
              t={t}
              today={today}
              collapsed={p.collapsed.includes(c.id)}
              onCollapse={() => p.onCollapse(c.id)}
              onRemove={() => p.onRemoveCategory(c)}
              onAdd={() => p.onAdd(c.id)}
              onEdit={p.onEdit}
              onToggle={p.onToggle}
            />
          ))}

          {/* A category taken out of this month (or one that isn't standard) comes back here. */}
          <button
            type="button"
            onClick={() => { tapLight(); p.onAddCategory(); }}
            className="w-full min-h-chrome rounded-md border-2 border-dashed border-hairline px-4 flex items-center justify-center gap-2 text-label font-semibold text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            {t.addCategoryToMonth}
          </button>
        </>
      )}
    </Screen>
  );
}

