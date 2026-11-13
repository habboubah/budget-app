import { monthlyLimit } from '../budgets';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, X } from 'lucide-react';
import { Category, MonthKey } from '../types';
import {
  NameTotal, dayLabel, displayName, formatMoney, formatMoneyApprox, formatMoneyShort, formatPercent, monthKeyOf, monthLabel, monthSpanLabel, monthsEnding,
  normalizeName, parseMonthKey, spoken, topNames,
} from '../logic';
import { Book, Fraction, Insight, MonthPoint, TagTotal, WhereRow, balanceChange, bookYears, compareYears, firstWeekday, monthDays, nearFraction, periodChange, periodSeries, savings, tagTotals, upToNow, weekdayPattern, whereRows } from '../insights';
import { Strings, capitalize, fmt } from '../translations';
import { CardsOpen, cardOpen, toggleAllCards, toggleCard } from '../fold';
import { Screen, Empty } from '../ui/Screen';
import { Fold, FoldAllButton, FoldCard } from '../ui/FoldCard';
import { Segmented } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { Card, MenuPicker } from '../ui/Card';
import { BalanceChart, HeatCalendar, IncomeExpenseChart, RingMeter, ShareBar, Sparkline, WeekdayBars } from './Charts';
import { CountingMoney } from '../ui/CountingMoney';
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
  /** The cards as headlines (plan 39, src/fold.ts): null shows every card whole, a list the headlines with these opened. */
  open: CardsOpen;
  onOpen: (open: CardsOpen) => void;
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
 * review in season, then the period — 3, 6, 9 or 12 months, all, or a year —
 * chosen at the top, and under it: the period at a glance on the hero (the
 * savings rate as a ring, the three averages with how each moved against
 * the months before), *Das fällt auf* — the top three recent hints — income
 * against spending with what each month kept, the balance, where the money
 * goes (a category opens its own screen, a payee its sheet), when it goes
 * (the weekdays, and the picked month as a calendar) and every number in a
 * table (a month opens its report). It stops at the running month: a month
 * started ahead holds plans (I9).
 *
 * Two things from plan 39. A book with entries in one month only shows what
 * that month can say — what stands out, where the money goes, when — and one
 * line that the rest comes with the second month: no period to choose, no
 * trend of one point. And the cards under the hero can show as headlines
 * (src/fold.ts) — one row each with its finding, opening in place; a new
 * book starts that way, a book in use shows them whole as it always did. The
 * hero and *Das fällt auf* are the answer and never fold.
 */
export function StatsView({ book, month, range, onRange, language, t, highlights, open, onOpen, yearCard, onYear, onHideYear, onMonth, onHint, onHideHint, onHowHint, onExplain, onCategory, onPayee, onReport }: Props) {
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
  // Fewer than two months with entries: nothing to compare yet.
  const young = all.filter(p => p.income || p.expense).length < 2;
  const averageOver = doneKeys.length ? doneKeys : keys;
  const where = useMemo(() => whereRows(book, averageOver), [book, averageOver]);
  const pattern = useMemo(() => weekdayPattern(book, keys), [book, keys]);
  /** A card's fold, by its id; nothing folds while every card shows whole. */
  const fold = (id: string): Fold | undefined => (open === null ? undefined : { open: cardOpen(open, id), toggle: () => onOpen(toggleCard(open, id)), less: t.less });
  const foldAll = <FoldAllButton whole={open === null} foldLabel={t.foldCards} unfoldLabel={t.unfoldCards} onToggle={() => onOpen(toggleAllCards(open))} />;
  const weekday = (wd: number) => new Intl.DateTimeFormat(t.locale, { weekday: 'long' }).format(new Date(2024, 0, 1 + wd));
  const rhythm = pattern.total.some(v => v > 0) && (
    <FoldCard tour="stats-rhythm" fold={fold('rhythm')} title={t.rhythmTitle} headline={pattern.top === null ? undefined : fmt(t.rhythmTop, { day: weekday(pattern.top) })}>
      {() => <RhythmCard book={book} pattern={pattern} months={keys} month={month} t={t} onExplain={onExplain} />}
    </FoldCard>
  );

  if (!all.some(p => p.income || p.expense)) {
    return (
      <Screen title={t.statsTitle} tabbed>
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      </Screen>
    );
  }

  if (young) {
    return (
      <Screen title={t.statsTitle} tabbed>
        {yearCard && <YearCard year={yearCard} t={t} onOpen={() => onYear(yearCard)} onHide={() => onHideYear(yearCard)} />}
        {done.length > 0 && <div data-tour="stats-hero"><PeriodHero all={all} done={done} running={keys.includes(now) ? now : null} t={t} onExplain={onExplain} /></div>}
        <HighlightsCard items={highlights} categories={categories} language={language} t={t} onAction={onHint} onHide={onHideHint} onHow={onHowHint} />
        {/* The one month there is: where its money goes is the answer, so it stays whole. */}
        <div data-tour="stats-where">
          <WhereCard book={book} where={where} averageOver={averageOver} language={language} t={t} onCategory={onCategory} onPayee={onPayee} />
        </div>
        {rhythm}
        <p className="px-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>
      </Screen>
    );
  }

  return (
    <Screen title={t.statsTitle} tabbed actions={foldAll}>
      {yearCard && <YearCard year={yearCard} t={t} onOpen={() => onYear(yearCard)} onHide={() => onHideYear(yearCard)} />}

      <section className="space-y-5" aria-labelledby="history-title">
        <div className="flex items-center gap-2" data-tour="stats-range">
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

        {done.length > 0 && <div data-tour="stats-hero"><PeriodHero all={all} done={done} running={keys.includes(now) ? now : null} t={t} onExplain={onExplain} /></div>}

        <HighlightsCard items={highlights} categories={categories} language={language} t={t} onAction={onHint} onHide={onHideHint} onHow={onHowHint} />

        {/* The charts' own heading: the months they run over, under the period chosen above. */}
        <div className="px-1 pt-1">
          <p className="eyebrow text-fg-mute">{monthSpanLabel(keys, t.locale)}</p>
          <h2 id="history-title" className="display text-title2 font-extrabold text-fg wrap-compound tracking-[-0.02em]">{t.historySection}</h2>
        </div>

        <FoldCard tour="stats-chart" fold={fold('io')} title={t.incomeVsExpenses}>
          {() => (
            <Card title={done.length ? t.incomeVsExpenses : savingsHeadline(done, t)} sub={t.chartIoSub}>
              <IncomeExpenseChart points={points} selected={month} t={t} onPick={onMonth} />
            </Card>
          )}
        </FoldCard>

        {points.length > 1 && (
          <FoldCard fold={fold('balance')} title={t.balanceOverTime} headline={balanceChange(points) ? balanceHeadline(points, t) : undefined}>
            {() => (
              <Card title={balanceHeadline(points, t)} sub={t.balanceOverTime}>
                <BalanceChart points={points} selected={month} t={t} onPick={onMonth} />
              </Card>
            )}
          </FoldCard>
        )}

        <FoldCard
          tour="stats-where" fold={fold('where')} title={t.whereMoneyGoes}
          headline={where.rows.slice(0, 2).map(r => `${displayName(r.category.names, language)} ${formatPercent(Math.round(r.share * 100), t.locale)}`).join(' · ') || undefined}
        >
          {() => <WhereCard book={book} where={where} averageOver={averageOver} language={language} t={t} onCategory={onCategory} onPayee={onPayee} />}
        </FoldCard>

        {rhythm}

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

/** How a figure moved against the months before: an arrow and the percentage, in the panel's inks — good news green, the other amber. */
function Delta({ pct, upIsGood, t }: { pct: number | null; upIsGood: boolean; t: Strings }) {
  if (pct === null || Math.abs(pct) < 1) return null;
  const up = pct > 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const p = formatPercent(Math.abs(pct), t.locale);
  return (
    <span className={`inline-flex items-center gap-0.5 text-caption font-semibold tabular-nums ${up === upIsGood ? 'text-on-hero-pos' : 'text-on-hero-warn'}`}>
      <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} aria-hidden="true" />
      <span aria-hidden="true">{p}</span>
      <span className="sr-only">{fmt(up ? t.whereChangeMore : t.whereChangeLess, { p })}</span>
    </span>
  );
}

/**
 * The period at a glance, on the hero: what it comes to as a sentence, the
 * savings rate as a ring against the 20 % of 50/30/20, Ø saved running to
 * its value, and Ø income and Ø spending on the panel — each with its line
 * over the months and how it moved against as many months before (D1: what
 * was put aside counts as saved, and is named). Averages run over finished
 * months only; the caption says which.
 */
function PeriodHero({ all, done, running, t, onExplain }: { all: MonthPoint[]; done: MonthPoint[]; running: MonthKey | null; t: Strings; onExplain: (e: Explain) => void }) {
  const s = savings(done);
  const change = useMemo(() => periodChange(all, done), [all, done]);
  const span = monthSpanLabel(done.map(p => p.key), t.locale);
  const approx = (c: number) => formatMoneyApprox(c, t.locale);
  const signed = (c: number) => `${c > 0 ? '+' : ''}${approx(c)}`;
  const rate = s.rate === null ? null : Math.round(s.rate * 100);
  const ratePct = rate === null ? '' : formatPercent(rate, t.locale);
  const target = fmt(t.targetPct, { p: 20 });
  const tiles = [
    { label: t.kpiIncome, value: approx(s.averageIncome), line: done.map(p => p.income), pct: change?.income ?? null, upIsGood: true },
    { label: t.kpiExpenses, value: approx(s.averageExpense), line: done.map(p => p.spending), pct: change?.spending ?? null, upIsGood: false },
  ];
  const explain = (): Explain => ({
    title: t.explainKpi,
    definition: t.explainKpiDef,
    calc: [
      fmt(t.explainKpiCalc, { income: approx(s.averageIncome), spending: approx(s.averageExpense), saved: approx(s.averageSaved) }),
      ...(s.averageInvested > 0 ? [fmt(t.explainKpiInvested, { invested: approx(s.averageInvested) })] : []),
      ...(change ? [fmt(t.whereChangeCaption, { span: monthSpanLabel(change.before, t.locale) })] : []),
    ],
    months: fmt(t.explainMonths, { span }),
    excluded: t.explainKpiOut,
  });
  return (
    <section className="rounded-lg hero hero-glow hero-art overflow-hidden text-on-hero p-[18px]" aria-labelledby="period-title">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-on-hero-mute tabular-nums wrap-prose">
            {running ? fmt(t.kpiCaptionRunning, { span, month: monthLabel(running, t.locale, 'name') }) : fmt(t.kpiCaption, { span })}
          </p>
          <h2 id="period-title" className="mt-1 display text-heading font-semibold wrap-compound">{savingsHeadline(done, t)}</h2>
        </div>
        <ExplainButton name={t.explainKpi} t={t} onClick={() => onExplain(explain())} onHero />
      </div>

      {/* With large text the figure drops under the ring rather than being cut off beside it. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        {rate !== null && (
          <RingMeter value={s.rate ?? 0} target={0.2} label={`${t.savingsRateTitle} ${ratePct}, ${target}`}>
            <span className="rounded-num text-heading font-bold">{ratePct.replace(/\s/g, '')}</span>
          </RingMeter>
        )}
        <div className="min-w-0 flex-1 basis-[9.5rem]">
          <p className="text-caption text-on-hero-mute wrap-compound">{t.kpiSaved}</p>
          {/* Never wider than the card: it grows with the text size only as far as the phone's width lets it. */}
          <p className="rounded-num text-[clamp(1.5rem,8.5vw,2rem)] leading-[1.2] font-bold whitespace-nowrap" aria-hidden="true">
            <CountingMoney cents={s.averageSaved} money={signed} />
          </p>
          <p className="sr-only">{spoken(signed(s.averageSaved), t.amountHidden)}</p>
          {rate !== null && <p className="text-caption text-on-hero-mute tabular-nums wrap-prose">{`${t.savingsRateTitle} · ${target}`}</p>}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map(x => (
          <div key={x.label} className="min-w-0 rounded-sm hero-panel px-3 py-2.5">
            <dt className="text-caption text-on-hero-soft wrap-compound">{x.label}</dt>
            <dd>
              <span className="block rounded-num text-body font-semibold text-on-hero">{x.value}</span>
              <span className="mt-1 flex items-center justify-between gap-2 min-h-[28px]">
                <Delta pct={x.pct} upIsGood={x.upIsGood} t={t} />
                <Sparkline values={x.line} className="ms-auto text-on-hero-soft" />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {s.averageInvested > 0 && (
        <p className="mt-2.5 text-caption text-on-hero-mute tabular-nums wrap-prose">{fmt(t.kpiInvested, { amount: approx(s.averageInvested) })}</p>
      )}
    </section>
  );
}

/**
 * *Wann du Geld ausgibst*: everyday spending by weekday over the months in
 * view — the priciest one named in the title when one clearly leads — and
 * the picked month day by day as a calendar. A day tapped writes out its
 * date, its amount and what it was; without one, the month's total and what
 * that comes to a day. Fixed costs stay out, as in the pace (D3).
 */
function RhythmCard({ book, pattern, months, month, t, onExplain }: { book: Book; /** `weekdayPattern` over `months` (the view computes it once, for the headline too). */ pattern: ReturnType<typeof weekdayPattern>; months: MonthKey[]; month: MonthKey; t: Strings; onExplain: (e: Explain) => void }) {
  const calendar = useMemo(() => monthDays(book, month), [book, month]);
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => setDay(null), [month]);
  if (!pattern.total.some(v => v > 0)) return null;
  const money = (c: number) => formatMoney(c, t.locale);
  const weekday = (wd: number, style: 'long' | 'short') => new Intl.DateTimeFormat(t.locale, { weekday: style }).format(new Date(2024, 0, 1 + wd));
  const span = monthSpanLabel(months, t.locale);
  const picked = day === null ? null : calendar.days[day - 1];
  const readout = picked
    ? [`${weekday(picked.weekday, 'short')} ${dayLabel(picked.date, t.locale)}`, money(picked.amount), picked.top, picked.count > 1 ? fmt(t.tagEntries, { n: picked.count }) : null].filter(Boolean).join(' · ')
    : calendar.elapsed > 0
      ? `${money(calendar.total)} · ${fmt(t.perDay, { amount: formatMoneyApprox(Math.round(calendar.total / calendar.elapsed), t.locale) })}`
      : '';
  const first = firstWeekday(t.locale);
  const explain = (): Explain => ({
    title: t.rhythmTitle,
    definition: t.explainRhythmDef,
    calc: Array.from({ length: 7 }, (_, i) => (first + i) % 7).map(wd => `${weekday(wd, 'long')}: Ø ${formatMoneyApprox(pattern.average[wd], t.locale)}`),
    months: fmt(t.explainMonths, { span }),
    excluded: t.explainPaceOut,
  });
  return (
    <Card
      title={pattern.top === null ? t.rhythmTitle : fmt(t.rhythmTop, { day: weekday(pattern.top, 'long') })}
      sub={fmt(t.rhythmSub, { span })}
      action={<ExplainButton name={t.rhythmTitle} t={t} onClick={() => onExplain(explain())} />}
    >
      <WeekdayBars pattern={pattern} t={t} />
      <div className="mt-5 pt-4 hairline-t">
        <h4 className="text-label font-semibold text-fg wrap-compound">{capitalize(monthLabel(month, t.locale))}</h4>
        <p className="text-caption text-fg-mute tabular-nums wrap-prose min-h-[1.125rem]" role="status">{readout}</p>
        <div className="mt-3">
          <HeatCalendar month={calendar} t={t} selected={day} onSelect={setDay} />
        </div>
      </div>
    </Card>
  );
}

/** A span of months in a few signs, for the period menu beside a card's title: "Juni – Okt.", across years "Nov. 25 – Okt. 26". */
function shortSpan(keys: MonthKey[], locale: string): string {
  if (!keys.length) return '';
  const first = parseMonthKey(keys[0]);
  const last = parseMonthKey(keys[keys.length - 1]);
  const f = new Intl.DateTimeFormat(locale, first.year === last.year ? { month: 'short' } : { month: 'short', year: '2-digit' });
  const of = (k: { year: number; month: number }) => f.format(new Date(k.year, k.month - 1, 1));
  return keys.length === 1 ? of(first) : `${of(first)} – ${of(last)}`;
}

/** Rows shown before "Alle n Kategorien". */
const WHERE_ROWS = 8;

/**
 * Where the money goes, two ways in one card: by category — the average
 * month over the finished months in view, its share, how it moved against
 * as many months before, its budget as a tick on the bar; a row opens the
 * category's screen — or by payee ("Lidl" 6× · 12 %) over this month or the
 * last 2, 3, 6 or 12, a row opening that payee's sheet.
 *
 * One period for all of it, in the card's corner. Until one is picked each
 * view keeps its own: the categories the page's months (their first option,
 * named by its span in short — the line under the title has it in full),
 * payees and tags this month. A period picked for the
 * categories gives the average month over the started months in it — this
 * month alone is what it has cost so far.
 */
function WhereCard({ book, where, averageOver, language, t, onCategory, onPayee }: {
  book: Book;
  /** `whereRows` over `averageOver` (the view computes it once, for the headline too). */
  where: ReturnType<typeof whereRows>;
  /** The months the averages run over. */
  averageOver: MonthKey[];
  language: string;
  t: Strings;
  onCategory: (id: string) => void;
  onPayee: (key: string) => void;
}) {
  const { entries, categories } = book.data;
  const [chosenView, setView] = useState<'categories' | 'payees' | 'tags'>('categories');
  // 0: nothing picked yet — the page's months for the categories, this month for payees and tags.
  const [picked, setPeriod] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState(false);
  const now = monthKeyOf();
  // The page's months are just this month (a first month): "Dieser Monat" says it.
  const pageIsNow = averageOver.length === 1 && averageOver[0] === now;
  const periodMonths = useMemo(() => monthsEnding(now, picked || 1), [now, picked]);
  const payeeMonths = periodMonths;
  const payees = useMemo(() => topNames(entries, categories, payeeMonths), [entries, categories, payeeMonths]);
  // The Tags breakdown appears only once any entry has a tag (plan 26).
  const hasTags = useMemo(() => entries.some(e => e.tags?.length), [entries]);
  const tags = useMemo(() => tagTotals(entries, categories, periodMonths), [entries, categories, periodMonths]);
  // Fall back to categories if the tags view was open but tags are gone.
  const view = chosenView === 'tags' && !hasTags ? 'categories' : chosenView;
  const period = view === 'categories' && !pageIsNow ? picked : picked || 1;
  // The categories over a picked period: the started months in it (an average over months without a page would be too low).
  const ownMonths = useMemo(() => periodMonths.filter(k => book.months.includes(k)), [periodMonths, book]);
  const ownWhere = useMemo(() => whereRows(book, ownMonths), [book, ownMonths]);
  const shown = period === 0 ? where : ownWhere;
  const shownOver = period === 0 ? averageOver : ownMonths;
  const shownTotal = shown.rows.reduce((sum, r) => sum + r.average, 0);
  const total = payees.reduce((sum, p) => sum + p.total, 0);
  const tagTotal = tags.reduce((sum, x) => sum + x.amount, 0);
  const payeeSpan = monthSpanLabel(payeeMonths, t.locale);
  const rows = allRows ? shown.rows : shown.rows.slice(0, WHERE_ROWS);
  const scale = Math.max(1, ...shown.rows.map(r => Math.max(r.average, monthlyLimit(r.category) ?? 0)));
  const periods = [1, 2, 3, 6, 12].map(n => ({ value: n, label: n === 1 ? t.periodThisMonth : fmt(t.periodLastN, { n }) }));

  return (
    <Card
      title={t.whereMoneyGoes}
      sub={view === 'categories'
        // One month is what it has cost; several are their average month.
        ? (shownOver.length === 1 && period !== 0
          ? (shownTotal ? fmt(t.whereSub, { span: monthSpanLabel(shownOver, t.locale), total: formatMoney(shownTotal, t.locale) }) : monthSpanLabel(shownOver, t.locale))
          : shownOver.length ? fmt(t.averageFrom, { span: monthSpanLabel(shownOver, t.locale) }) : payeeSpan)
        : view === 'tags'
          ? (tagTotal ? fmt(t.whereSub, { span: payeeSpan, total: formatMoney(tagTotal, t.locale) }) : payeeSpan)
          : total ? fmt(t.whereSub, { span: payeeSpan, total: formatMoney(total, t.locale) }) : payeeSpan}
      action={(
        <MenuPicker
          label={t.wherePeriod}
          value={period}
          onChange={n => { setPeriod(n); setExpanded(false); setAllRows(false); }}
          options={view === 'categories' && !pageIsNow ? [{ value: 0, label: shortSpan(averageOver, t.locale) }, ...periods] : periods}
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
        ) : shown.rows.length === 0 ? (
          <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>
        ) : (
          <>
            {shown.rows.length > 1 && (
              // The whole split at a glance; the rows under it carry every name and figure.
              <ShareBar
                className="mb-2"
                label={shown.rows.map(r => `${displayName(r.category.names, language)} ${formatPercent(Math.round(r.share * 100), t.locale)}`).join(', ')}
                items={shown.rows.map(r => ({ key: r.category.id, hue: r.category.hue, value: r.average }))}
              />
            )}
            <ul className="-mx-4 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
              {rows.map((r, i) => <WhereRowButton key={r.category.id} row={r} index={i} scale={scale} language={language} t={t} onOpen={() => onCategory(r.category.id)} />)}
            </ul>
            {!allRows && shown.rows.length > rows.length && (
              <button
                type="button"
                onClick={() => { tapLight(); setAllRows(true); }}
                className="mt-1 -mb-2 h-tap w-full text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
              >
                {fmt(t.whereAllCategories, { n: shown.rows.length })}
              </button>
            )}
            <p className="text-caption text-fg-mute mt-3 wrap-prose tabular-nums">
              {t.whereTapHint}
              {shown.before.length > 0 && shown.rows.some(r => r.change) && ` ${fmt(t.whereChangeCaption, { span: monthSpanLabel(shown.before, t.locale) })}`}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

/** One category: emoji · name · Ø · share · change chip, its bar in its colour with the budget as a 2 px tick; a tap opens its screen. */
function WhereRowButton({ row: r, index, scale, language, t, onOpen }: {
  row: WhereRow;
  /** Its place in the list: the bars run out one after another. */
  index: number;
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
          <span className="bar-grow absolute inset-y-0 start-0 rounded-full bg-hue-chart" style={{ width: `${Math.max(1, (r.average / scale) * 100)}%`, animationDelay: `${Math.min(index * 50, 400)}ms` }} />
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
