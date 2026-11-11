import { monthlyLimit } from '../budgets';
import { CSSProperties, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, X } from 'lucide-react';
import { Category, MonthKey } from '../types';
import {
  NameTotal, displayName, formatMoney, formatMoneyApprox, formatMoneyShort, formatPercent, monthKeyOf, monthLabel, monthSpanLabel, monthsEnding,
  normalizeName, topNames,
} from '../logic';
import { Book, Fraction, Insight, MonthPoint, TagTotal, WhereRow, balanceChange, bookYears, compareYears, nearFraction, periodSeries, savings, tagTotals, upToNow, whereRows } from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Segmented } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { Card, MenuPicker } from '../ui/Card';
import { BalanceChart, IncomeExpenseChart } from './Charts';
import { Explain, ExplainButton } from './ExplainSheet';
import { HighlightsCard } from './HintRows';
import { tapLight } from '../ui/haptics';

/** 3, 6, 9 or 12 months, all, or a year ("2025") — plan 29. */
export type StatsRange = '3' | '6' | '9' | '12' | 'all' | (string & {});

/** The month counts Verlauf offers, beside "Alle" and a year. */
const SPANS = [3, 6, 9, 12];

interface Props {
  book: Book;
  /** The month highlighted in the charts (tapping one picks another). */
  month: MonthKey;
  range: StatsRange;
  onRange: (r: StatsRange) => void;
  language: string;
  t: Strings;
  /** Das fällt auf: the top hints (already ranked and filtered). */
  highlights: Insight[];
  /** The year whose review is in season and not seen yet, if any. */
  yearCard: string | null;
  onYear: (year: string) => void;
  onHideYear: (year: string) => void;
  onMonth: (m: MonthKey) => void;
  onHint: (i: Insight) => void;
  onHideHint: (i: Insight) => void;
  onHowHint: (i: Insight) => void;
  onExplain: (e: Explain) => void;
  onCategory: (id: string) => void;
  onPayee: (key: string) => void;
  onReport: (m: MonthKey) => void;
}

const HEADLINE: Record<Fraction, 'headlineHalf' | 'headlineThird' | 'headlineQuarter' | 'headlineFifth' | 'headlineTenth'> = {
  half: 'headlineHalf', third: 'headlineThird', quarter: 'headlineQuarter', fifth: 'headlineFifth', tenth: 'headlineTenth',
};

/** The income chart's title says what it shows: the share kept over the finished months in view. */
function savingsHeadline(done: MonthPoint[], t: Strings): string {
  const rate = savings(done).rate;
  if (rate === null) return t.incomeVsExpenses;
  if (rate < 0) return t.headlineOver;
  if (rate < 0.01) return t.headlineEven;
  const fraction = nearFraction(rate);
  return fraction ? t[HEADLINE[fraction]] : fmt(t.headlinePct, { p: formatPercent(Math.round(rate * 100), t.locale) });
}

/** The balance chart's title: how much it grew or shrank since the first month in view. */
function balanceHeadline(points: MonthPoint[], t: Strings): string {
  const c = balanceChange(points);
  if (!c) return t.balanceOverTime;
  if (c.change === 0) return t.balanceSteady;
  const month = monthLabel(c.from, t.locale, c.from.slice(0, 4) === c.to.slice(0, 4) ? 'name' : 'long');
  const amount = `${c.change > 0 ? '+' : ''}${formatMoneyApprox(c.change, t.locale)}`;
  return fmt(c.change > 0 ? t.balanceGrows : t.balanceShrinks, { amount, month });
}

/**
 * Statistik answers *Wie lief es?* (STATISTICS_AND_INSIGHTS.md §7): the year
 * review in season, *Das fällt auf* — the top three recent hints — then
 * *Verlauf* for a period (6 or 12 months, or all): three averages from the
 * finished months, income against spending with what each month kept, the
 * balance, where the money goes (a category opens its own screen, a payee
 * its sheet) and every number in a table (a month opens its report). It
 * stops at the running month: a month started ahead holds plans (I9).
 */
export function StatsView({ book, month, range, onRange, language, t, highlights, yearCard, onYear, onHideYear, onMonth, onHint, onHideHint, onHowHint, onExplain, onCategory, onPayee, onReport }: Props) {
  const money = (c: number) => formatMoney(c, t.locale);
  const now = monthKeyOf();
  const all = useMemo(() => upToNow(book.points), [book]);
  const points = useMemo(() => periodSeries(all, range), [all, range]);
  const keys = useMemo(() => points.map(p => p.key), [points]);
  const years = useMemo(() => bookYears(book), [book]);
  // The comparison (plan 29): only offered once the book has 13+ months, off by default.
  const canCompare = book.months.length >= 13;
  const [compare, setCompare] = useState(false);
  const comparison = useMemo(
    () => (compare && /^\d{4}$/.test(range) ? compareYears(book, range) : null),
    [compare, range, book],
  );
  // Averages over the finished months in view: the running month is half entered and would pull them down.
  const done = useMemo(() => points.filter(p => p.key < now), [points, now]);
  const doneKeys = useMemo(() => done.map(p => p.key), [done]);
  const anyInvested = points.some(p => p.invested > 0);
  const categories = book.data.categories;

  if (!all.some(p => p.income || p.expense)) {
    return (
      <Screen title={t.statsTitle} tabbed>
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      </Screen>
    );
  }

  return (
    <Screen title={t.statsTitle} tabbed>
      {yearCard && <YearCard year={yearCard} t={t} onOpen={() => onYear(yearCard)} onHide={() => onHideYear(yearCard)} />}

      <HighlightsCard items={highlights} categories={categories} language={language} t={t} onAction={onHint} onHide={onHideHint} onHow={onHowHint} />

      <section className="space-y-5" aria-labelledby="history-title">
        <div className="px-1">
          <p className="eyebrow text-fg-mute">{monthSpanLabel(keys, t.locale)}</p>
          <h2 id="history-title" className="display text-title2 font-bold text-fg wrap-compound">{t.historySection}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Five segments beside the year: short labels ("3 M"), read out in full. */}
          <div className="flex-1 min-w-0">
            <Segmented<StatsRange> label={t.wherePeriod} value={/^\d{4}$/.test(range) ? 'all' : range} onChange={onRange} options={[
              ...SPANS.map(n => ({ value: String(n), label: fmt(t.rangeMonthsShort, { n }), spoken: fmt(t.averageSpanN, { n }) })),
              { value: 'all', label: t.rangeAllShort },
            ]} />
          </div>
          {years.length >= 2 && (
            <MenuPicker
              label={t.rangeYear}
              value={/^\d{4}$/.test(range) ? range : ''}
              onChange={y => onRange(y || '12')}
              options={[{ value: '', label: t.rangeYearPick }, ...years.map(y => ({ value: y, label: y }))]}
            />
          )}
        </div>
        {canCompare && /^\d{4}$/.test(range) && (
          <div className="flex items-center gap-3 rounded-md bg-surface card-edge ps-4 pe-1 min-h-control">
            <span className="flex-1 min-w-0 text-body text-fg wrap-compound">{t.compareLastYear}</span>
            <Switch checked={compare} onChange={setCompare} label={t.compareLastYear} />
          </div>
        )}
        {comparison && comparison.spendingChange !== null && (
          <p className="px-1 text-label text-fg-mute tabular-nums wrap-prose">
            {fmt(comparison.spendingChange >= 0 ? t.compareSpendingUp : t.compareSpendingDown, {
              pct: Math.abs(comparison.spendingChange), year: comparison.prev,
            })}
          </p>
        )}

        {done.length > 0 && <Averages done={done} running={keys.includes(now) ? now : null} t={t} onExplain={onExplain} />}

        <Card title={savingsHeadline(done, t)} sub={t.chartIoSub}>
          <IncomeExpenseChart points={points} selected={month} t={t} onPick={onMonth} />
        </Card>

        {points.length > 1 && (
          <Card title={balanceHeadline(points, t)} sub={t.balanceOverTime}>
            <BalanceChart points={points} selected={month} t={t} onPick={onMonth} />
          </Card>
        )}

        <WhereCard book={book} averageOver={doneKeys.length ? doneKeys : keys} language={language} t={t} onCategory={onCategory} onPayee={onPayee} />

        {/* Every value of the charts, without hovering; a month opens its report. */}
        <details className="rounded-md bg-surface card-edge group">
          <summary className="min-h-control px-4 flex items-center gap-2 text-label font-semibold text-accent cursor-pointer list-none focus-visible:ring-focus rounded-md">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 rtl:rotate-180" aria-hidden="true" />
            {t.showTable}
          </summary>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-caption tabular-nums">
              <thead className="text-fg-mute">
                <tr>
                  <th className="text-start font-semibold py-1.5 pe-2">{t.tabMonth}</th>
                  <th className="text-end font-semibold py-1.5 px-2">{t.income}</th>
                  <th className="text-end font-semibold py-1.5 px-2">{t.expenses}</th>
                  {anyInvested && <th className="text-end font-semibold py-1.5 px-2">{t.invested}</th>}
                  <th className="text-end font-semibold py-1.5 px-2">{t.saved}</th>
                  <th className="text-end font-semibold py-1.5 ps-2">{t.balanceEnd}</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map(p => (
                  <tr key={p.key} className={`hairline-t ${p.key === month ? 'font-bold' : ''}`}>
                    <td className="pe-2 text-fg whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => { tapLight(); onReport(p.key); }}
                        aria-label={fmt(t.openReport, { month: monthLabel(p.key, t.locale) })}
                        className="-ms-1 ps-1 pe-2 min-h-tap inline-flex items-center gap-1 text-accent font-semibold rounded-sm active:opacity-60 focus-visible:ring-focus"
                      >
                        {monthLabel(p.key, t.locale, 'short')}
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.income)}</td>
                    <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.spending)}</td>
                    {anyInvested && <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.invested)}</td>}
                    <td className={`py-1.5 px-2 text-end whitespace-nowrap ${p.saved < 0 ? 'text-neg' : 'text-fg'}`}>{money(p.saved)}</td>
                    <td className={`py-1.5 ps-2 text-end whitespace-nowrap ${p.end < 0 ? 'text-neg' : 'text-fg'}`}>{money(p.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </Screen>
  );
}

/** The Jahresrückblick's card, from 15 December to 31 January: opens the review, ✕ puts it away. */
function YearCard({ year, t, onOpen, onHide }: { year: string; t: Strings; onOpen: () => void; onHide: () => void }) {
  return (
    <div className="relative rounded-md hero hero-glow text-on-hero">
      <button
        type="button"
        onClick={() => { tapLight(); onOpen(); }}
        className="w-full min-h-[88px] ps-4 pe-14 py-4 text-start rounded-md active:opacity-80 focus-visible:ring-focus"
      >
        <span className="block display text-heading font-semibold wrap-compound">{fmt(t.yearCardTitle, { year })}</span>
        <span className="block text-label text-on-hero-mute mt-0.5 wrap-prose">{fmt(t.yearCardBody, { next: Number(year) + 1 })}</span>
      </button>
      <button
        type="button"
        onClick={() => { tapLight(); onHide(); }}
        aria-label={t.yearCardHide}
        title={t.yearCardHide}
        className="absolute top-1 end-1 h-tap w-tap inline-flex items-center justify-center rounded-full text-on-hero active:opacity-60 focus-visible:ring-focus"
      >
        <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Ø income, Ø spending, Ø saved over the finished months in view — the three
 * numbers the period opens on — which months they come from, and what of it
 * was put aside (D1). They wrap under each other when large text no longer
 * fits three abreast.
 */
function Averages({ done, running, t, onExplain }: { done: MonthPoint[]; running: MonthKey | null; t: Strings; onExplain: (e: Explain) => void }) {
  const s = savings(done);
  const span = monthSpanLabel(done.map(p => p.key), t.locale);
  const approx = (c: number) => formatMoneyApprox(c, t.locale);
  const items = [
    { label: t.kpiIncome, value: approx(s.averageIncome), tone: 'text-fg' },
    { label: t.kpiExpenses, value: approx(s.averageExpense), tone: 'text-fg' },
    { label: t.kpiSaved, value: `${s.averageSaved > 0 ? '+' : ''}${approx(s.averageSaved)}`, tone: s.averageSaved < 0 ? 'text-neg' : 'text-pos' },
  ];
  const explain = (): Explain => ({
    title: t.explainKpi,
    definition: t.explainKpiDef,
    calc: [
      fmt(t.explainKpiCalc, { income: approx(s.averageIncome), spending: approx(s.averageExpense), saved: approx(s.averageSaved) }),
      ...(s.averageInvested > 0 ? [fmt(t.explainKpiInvested, { invested: approx(s.averageInvested) })] : []),
    ],
    months: fmt(t.explainMonths, { span }),
    excluded: t.explainKpiOut,
  });
  return (
    <section>
      <dl className="flex flex-wrap gap-2">
        {items.map(i => (
          // The amounts line up at the bottom even where a label wraps.
          <div key={i.label} className="flex-1 basis-[6.5rem] min-w-0 flex flex-col justify-between rounded-md bg-surface card-edge px-3 py-2.5">
            <dt className="text-caption text-fg-mute wrap-compound">{i.label}</dt>
            <dd className={`mt-0.5 rounded-num text-heading font-semibold ${i.tone}`}>{i.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 ps-1 flex items-start gap-2">
        <p className="min-w-0 flex-1 text-caption text-fg-mute wrap-prose tabular-nums">
          {running ? fmt(t.kpiCaptionRunning, { span, month: monthLabel(running, t.locale, 'name') }) : fmt(t.kpiCaption, { span })}
          {s.averageInvested > 0 && ` · ${fmt(t.kpiInvested, { amount: approx(s.averageInvested) })}`}
        </p>
        <ExplainButton name={t.explainKpi} t={t} onClick={() => onExplain(explain())} />
      </div>
    </section>
  );
}

/** Rows shown before "Alle n Kategorien". */
const WHERE_ROWS = 8;

/**
 * Where the money goes, two ways in one card: by category — the average
 * month over the finished months in view, its share, how it moved against
 * as many months before, its budget as a tick on the bar; a row opens the
 * category's screen — or by payee ("Lidl" 6× · 12 %) over this month or the
 * last 2, 3, 6 or 12, a row opening that payee's sheet.
 */
function WhereCard({ book, averageOver, language, t, onCategory, onPayee }: {
  book: Book;
  /** The months the averages run over. */
  averageOver: MonthKey[];
  language: string;
  t: Strings;
  onCategory: (id: string) => void;
  onPayee: (key: string) => void;
}) {
  const { entries, categories } = book.data;
  const [chosenView, setView] = useState<'categories' | 'payees' | 'tags'>('categories');
  const [period, setPeriod] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState(false);
  const where = useMemo(() => whereRows(book, averageOver), [book, averageOver]);
  const periodMonths = useMemo(() => monthsEnding(monthKeyOf(), period), [period]);
  const payeeMonths = periodMonths;
  const payees = useMemo(() => topNames(entries, categories, payeeMonths), [entries, categories, payeeMonths]);
  // The Tags breakdown appears only once any entry has a tag (plan 26).
  const hasTags = useMemo(() => entries.some(e => e.tags?.length), [entries]);
  const tags = useMemo(() => tagTotals(entries, categories, periodMonths), [entries, categories, periodMonths]);
  // Fall back to categories if the tags view was open but tags are gone.
  const view = chosenView === 'tags' && !hasTags ? 'categories' : chosenView;
  const total = payees.reduce((sum, p) => sum + p.total, 0);
  const tagTotal = tags.reduce((sum, x) => sum + x.amount, 0);
  const payeeSpan = monthSpanLabel(payeeMonths, t.locale);
  const rows = allRows ? where.rows : where.rows.slice(0, WHERE_ROWS);
  const scale = Math.max(1, ...where.rows.map(r => Math.max(r.average, monthlyLimit(r.category) ?? 0)));

  return (
    <Card
      title={t.whereMoneyGoes}
      sub={view === 'categories'
        ? fmt(t.averageFrom, { span: monthSpanLabel(averageOver, t.locale) })
        : view === 'tags'
          ? (tagTotal ? fmt(t.whereSub, { span: payeeSpan, total: formatMoney(tagTotal, t.locale) }) : payeeSpan)
          : total ? fmt(t.whereSub, { span: payeeSpan, total: formatMoney(total, t.locale) }) : payeeSpan}
      action={(view === 'payees' || view === 'tags') && (
        <MenuPicker
          label={t.wherePeriod}
          value={period}
          onChange={n => { setPeriod(n); setExpanded(false); }}
          options={[1, 2, 3, 6, 12].map(n => ({ value: n, label: n === 1 ? t.periodThisMonth : fmt(t.periodLastN, { n }) }))}
        />
      )}
    >
      <Segmented<'categories' | 'payees' | 'tags'> label={t.whereMoneyGoes} value={view} onChange={setView} options={[
        { value: 'categories', label: t.categories },
        { value: 'payees', label: t.payees },
        ...(hasTags ? [{ value: 'tags' as const, label: t.tags }] : []),
      ]} />
      <div className="mt-4">
        {view === 'tags' ? (
          <TagsList tags={tags} total={tagTotal} t={t} />
        ) : view === 'payees' ? (
          <PayeesList payees={payees} total={total} categories={categories} language={language} t={t}
            expanded={expanded} onExpand={() => setExpanded(true)} onPayee={onPayee} />
        ) : where.rows.length === 0 ? (
          <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>
        ) : (
          <>
            <ul className="-mx-4 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
              {rows.map(r => <WhereRowButton key={r.category.id} row={r} scale={scale} language={language} t={t} onOpen={() => onCategory(r.category.id)} />)}
            </ul>
            {!allRows && where.rows.length > rows.length && (
              <button
                type="button"
                onClick={() => { tapLight(); setAllRows(true); }}
                className="mt-1 -mb-2 h-tap w-full text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
              >
                {fmt(t.whereAllCategories, { n: where.rows.length })}
              </button>
            )}
            <p className="text-caption text-fg-mute mt-3 wrap-prose tabular-nums">
              {t.whereTapHint}
              {where.before.length > 0 && where.rows.some(r => r.change) && ` ${fmt(t.whereChangeCaption, { span: monthSpanLabel(where.before, t.locale) })}`}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

/** One category: emoji · name · Ø · share · change chip, its bar in its colour with the budget as a 2 px tick; a tap opens its screen. */
function WhereRowButton({ row: r, scale, language, t, onOpen }: {
  row: WhereRow;
  scale: number;
  language: string;
  t: Strings;
  onOpen: () => void;
}) {
  const c: Category = r.category;
  // The budget's tick sits on a monthly scale: a year's budget shows as a twelfth (schema 25).
  const limit = monthlyLimit(c);
  const name = displayName(c.names, language);
  const share = formatPercent(Math.round(r.share * 100), t.locale);
  const up = r.change && r.change.diff > 0;
  const change = r.change && fmt(up ? t.whereChangeMore : t.whereChangeLess, { p: formatPercent(r.change.pct, t.locale) });
  const label = [
    fmt(t.whereRowAria, { name, amount: formatMoney(r.average, t.locale), share }),
    change,
    limit ? fmt(t.whereBudgetAria, { amount: formatMoneyShort(limit, t.locale) }) : null,
  ].filter(Boolean).join(', ');
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <li data-hue={c.hue}>
      <button
        type="button"
        onClick={() => { tapLight(); onOpen(); }}
        aria-label={label}
        className="w-full min-h-tap px-4 py-2.5 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="flex items-baseline gap-2" aria-hidden="true">
          <span className="emoji text-[15px]">{c.emoji}</span>
          <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{name}</span>
          {r.change && (
            <span className={`shrink-0 inline-flex items-center gap-0.5 text-caption font-semibold tabular-nums ${up ? 'text-warn' : 'text-pos'}`}>
              <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />
              {formatPercent(r.change.pct, t.locale)}
            </span>
          )}
          <span className="shrink-0 text-caption text-fg-mute tabular-nums">{share}</span>
          <span className="shrink-0 rounded-num text-label font-semibold text-fg">{formatMoney(r.average, t.locale)}</span>
          <ChevronRight className="w-4 h-4 shrink-0 self-center text-fg-faint rtl:rotate-180" strokeWidth={2.4} />
        </span>
        <span className="relative mt-1.5 block h-3" aria-hidden="true">
          <span className="absolute inset-y-0 start-0 rounded-e-[4px] bg-hue-chart" style={{ width: `${Math.max(1, (r.average / scale) * 100)}%` }} />
          {!!limit && <span className="absolute -top-0.5 -bottom-0.5 w-[2px] rounded-full bg-fg" style={{ insetInlineStart: `calc(${(limit / scale) * 100}% - 1px)` }} />}
        </span>
      </button>
    </li>
  );
}

/** Tag by tag, largest first, with its share and entry count (plan 26). */
function TagsList({ tags, total, t }: { tags: TagTotal[]; total: number; t: Strings }) {
  if (tags.length === 0) return <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>;
  const max = Math.max(1, ...tags.map(x => x.amount));
  const money = (c: number) => formatMoney(c, t.locale);
  return (
    <>
      <ol className="-mx-4 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
        {tags.map(x => (
          <li key={x.tag} className="px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 text-body text-fg wrap-compound">#{x.tag}</span>
              <span className="shrink-0 text-body font-semibold num text-fg">{money(x.amount)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex-1 h-[6px] rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent-fill" style={{ width: `${Math.round((x.amount / max) * 100)}%` }} />
              </span>
              <span className="shrink-0 text-caption text-fg-mute num">
                {fmt(t.tagEntries, { n: x.count })}{total ? ` · ${formatPercent(Math.round((x.amount / total) * 100), t.locale)}` : ''}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-caption text-fg-mute mt-3 wrap-prose">{t.tagHint}</p>
    </>
  );
}

/** Payee by payee, largest first, the first ten until "All (n)"; each bar in its category's colour; a row opens the payee's sheet. */
function PayeesList({ payees, total, categories, language, t, expanded, onExpand, onPayee }: {
  payees: NameTotal[];
  total: number;
  categories: Category[];
  language: string;
  t: Strings;
  expanded: boolean;
  onExpand: () => void;
  onPayee: (key: string) => void;
}) {
  if (payees.length === 0) return <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>;
  const shown = expanded ? payees : payees.slice(0, 10);
  const max = Math.max(1, ...payees.map(p => p.total));
  const byId = new Map(categories.map(c => [c.id, c]));
  const money = (c: number) => formatMoney(c, t.locale);
  return (
    <>
      <ol className="-mx-4 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
        {shown.map(n => {
          const c = byId.get(n.categoryId);
          return (
            <li key={n.name} data-hue={c?.hue}>
              <button
                type="button"
                onClick={() => { tapLight(); onPayee(normalizeName(n.name)); }}
                className="w-full min-h-tap px-4 py-2.5 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
              >
                <span className="flex items-baseline gap-2">
                  {c && <span className="emoji text-[17px] self-center" title={displayName(c.names, language)} aria-hidden="true">{c.emoji}</span>}
                  <span className="min-w-0 flex-1 text-body text-fg wrap-compound">
                    {n.name}
                    <span className="text-caption text-fg-mute tabular-nums">
                      {' · '}{n.count > 1 && <>{fmt(t.timesCount, { n: n.count })} · </>}{fmt(t.ofExpenses, { p: Math.round((n.total / Math.max(1, total)) * 100) })}
                    </span>
                  </span>
                  <span className="text-body font-semibold text-fg num">{money(n.total)}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 self-center text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span className="mt-2 h-2 flex" aria-hidden="true">
                  <span className="h-full rounded-full bg-hue-chart" style={{ width: `${(n.total / max) * 100}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {!expanded && payees.length > shown.length && (
        <button
          type="button"
          onClick={() => { tapLight(); onExpand(); }}
          className="mt-1 -mb-2 h-tap w-full text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
        >
          {fmt(t.allPayees, { n: payees.length })}
        </button>
      )}
      <p className="text-caption text-fg-mute mt-3 wrap-prose">{t.wherePayeeHint}</p>
    </>
  );
}
