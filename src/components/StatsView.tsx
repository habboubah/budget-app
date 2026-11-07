import { CSSProperties, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AppData, Category, MonthKey } from '../types';
import {
  MonthBalance, NameTotal, displayName, formatMoney, formatMoneyApprox, formatPercent, monthKeyOf, monthLabel, monthSpanLabel, monthsEnding, topNames,
} from '../logic';
import { Fraction, MonthPoint, balanceChange, categoryAverages, categoryMatrix, monthSeries, nearFraction, savings } from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Segmented } from '../ui/Field';
import { Card, MenuPicker } from '../ui/Card';
import { AverageBars, BalanceChart, CategoryTrendChart, IncomeExpenseChart } from './Charts';
import { tapLight } from '../ui/haptics';

interface Props {
  /** The month highlighted in the charts (tapping one picks another). */
  month: MonthKey;
  balances: MonthBalance[];
  data: AppData;
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
}

type Range = '6' | '12' | 'all';

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
 * Statistics, the long view (planning is a tab of its own). For a period —
 * 6 or 12 months, or all — three averages from the finished months first,
 * then one chart of income against expenses with what was left written over
 * each month, the balance at each month's end, where the money goes (by
 * category, each with its trend, or by payee), and every number in a table.
 * The titles say what the charts show.
 */
export function StatsView({ month, balances, data, language, t, onMonth }: Props) {
  const [range, setRange] = useState<Range>('6');
  const money = (c: number) => formatMoney(c, t.locale);
  const now = monthKeyOf();

  const all = useMemo(() => monthSeries(balances), [balances]);
  const points = useMemo(() => (range === 'all' ? all : all.slice(-Number(range))), [all, range]);
  const keys = useMemo(() => points.map(p => p.key), [points]);
  // Averages over the finished months in view, as Planen does: the running
  // month is half entered and would pull them down.
  const done = useMemo(() => points.filter(p => p.key < now), [points, now]);
  const doneKeys = useMemo(() => done.map(p => p.key), [done]);

  if (!all.some(p => p.income || p.expense)) {
    return (
      <Screen title={t.statsTitle} tabbed>
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      </Screen>
    );
  }

  return (
    <Screen title={t.statsTitle} eyebrow={monthSpanLabel(keys, t.locale)} tabbed>
      <Segmented<Range> label={t.wherePeriod} value={range} onChange={setRange} options={[
        { value: '6', label: fmt(t.averageSpanN, { n: 6 }) },
        { value: '12', label: fmt(t.averageSpanN, { n: 12 }) },
        { value: 'all', label: t.rangeAllShort },
      ]} />

      {done.length > 0 && <Averages done={done} running={keys.includes(now) ? now : null} t={t} />}

      <Card title={savingsHeadline(done, t)} sub={t.chartIoSub}>
        <IncomeExpenseChart points={points} selected={month} t={t} onPick={onMonth} />
      </Card>

      {points.length > 1 && (
        <Card title={balanceHeadline(points, t)} sub={t.balanceOverTime}>
          <BalanceChart points={points} selected={month} t={t} onPick={onMonth} />
        </Card>
      )}

      <WhereCard
        data={data} months={keys} averageOver={doneKeys.length ? doneKeys : keys}
        selected={month} language={language} t={t} onPick={onMonth}
      />

      {/* Every value of the charts, without hovering. */}
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
                <th className="text-end font-semibold py-1.5 px-2">{t.saved}</th>
                <th className="text-end font-semibold py-1.5 ps-2">{t.balanceEnd}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map(p => (
                <tr key={p.key} className={`hairline-t ${p.key === month ? 'font-bold' : ''}`}>
                  <td className="py-1.5 pe-2 text-fg whitespace-nowrap">{monthLabel(p.key, t.locale, 'short')}</td>
                  <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.income)}</td>
                  <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.expense)}</td>
                  <td className={`py-1.5 px-2 text-end whitespace-nowrap ${p.saved < 0 ? 'text-neg' : 'text-fg'}`}>{money(p.saved)}</td>
                  <td className={`py-1.5 ps-2 text-end whitespace-nowrap ${p.end < 0 ? 'text-neg' : 'text-fg'}`}>{money(p.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Screen>
  );
}

/**
 * Ø income, Ø expenses, Ø saved over the finished months in view — the three
 * numbers the page opens on — and which months they come from. They wrap
 * under each other when large text no longer fits three abreast.
 */
function Averages({ done, running, t }: { done: MonthPoint[]; running: MonthKey | null; t: Strings }) {
  const s = savings(done);
  const span = monthSpanLabel(done.map(p => p.key), t.locale);
  const approx = (c: number) => formatMoneyApprox(c, t.locale);
  const items = [
    { label: t.kpiIncome, value: approx(s.averageIncome), tone: 'text-fg' },
    { label: t.kpiExpenses, value: approx(s.averageExpense), tone: 'text-fg' },
    { label: t.kpiSaved, value: `${s.averageSaved > 0 ? '+' : ''}${approx(s.averageSaved)}`, tone: s.averageSaved < 0 ? 'text-neg' : 'text-pos' },
  ];
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
      <p className="text-caption text-fg-mute mt-2 px-1 wrap-prose">
        {running ? fmt(t.kpiCaptionRunning, { span, month: monthLabel(running, t.locale, 'name') }) : fmt(t.kpiCaption, { span })}
      </p>
    </section>
  );
}

/**
 * Where the money goes, two ways in one card: by category — the average
 * month over the finished months in view, largest first, a tap opening that
 * category's months as one series in its own colour — or by payee ("Lidl" 6×
 * · 12 %) over this month or the last 2, 3, 6 or 12.
 */
function WhereCard({ data, months, averageOver, selected, language, t, onPick }: {
  data: AppData;
  /** The months in view (the trend under a category). */
  months: MonthKey[];
  /** The months the averages run over. */
  averageOver: MonthKey[];
  selected: MonthKey;
  language: string;
  t: Strings;
  onPick: (key: MonthKey) => void;
}) {
  const { entries, categories } = data;
  const [view, setView] = useState<'categories' | 'payees'>('categories');
  const [open, setOpen] = useState<string | null>(null);
  const [period, setPeriod] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const averages = useMemo(
    () => categoryAverages(entries, categories, averageOver).filter(a => a.category.kind === 'expense'),
    [entries, categories, averageOver],
  );
  const matrix = useMemo(() => categoryMatrix(entries, categories, months, 'expense'), [entries, categories, months]);
  const payeeMonths = useMemo(() => monthsEnding(monthKeyOf(), period), [period]);
  const payees = useMemo(() => topNames(entries, categories, payeeMonths), [entries, categories, payeeMonths]);
  const total = payees.reduce((sum, p) => sum + p.total, 0);
  const payeeSpan = monthSpanLabel(payeeMonths, t.locale);
  const trend = (c: Category) => new Map(months.map(m => [m, matrix.values.get(m)?.get(c.id) ?? 0]));

  return (
    <Card
      title={t.whereMoneyGoes}
      sub={view === 'categories'
        ? fmt(t.averageFrom, { span: monthSpanLabel(averageOver, t.locale) })
        : total ? fmt(t.whereSub, { span: payeeSpan, total: formatMoney(total, t.locale) }) : payeeSpan}
      action={view === 'payees' && (
        <MenuPicker
          label={t.wherePeriod}
          value={period}
          onChange={n => { setPeriod(n); setExpanded(false); }}
          options={[1, 2, 3, 6, 12].map(n => ({ value: n, label: n === 1 ? t.periodThisMonth : fmt(t.periodLastN, { n }) }))}
        />
      )}
    >
      <Segmented<'categories' | 'payees'> label={t.whereMoneyGoes} value={view} onChange={setView} options={[
        { value: 'categories', label: t.categories },
        { value: 'payees', label: t.payees },
      ]} />
      <div className="mt-4">
        {view === 'payees' ? (
          <PayeesList payees={payees} total={total} categories={categories} language={language} t={t}
            expanded={expanded} onExpand={() => setExpanded(true)} />
        ) : averages.length === 0 ? (
          <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>
        ) : (
          <>
            <AverageBars
              items={averages} language={language} t={t}
              selected={open} onSelect={id => setOpen(o => (o === id ? null : id))}
              detail={c => (
                <CategoryTrendChart category={c} values={trend(c)} months={months} selected={selected} language={language} t={t} onPick={onPick} />
              )}
            />
            {!open && <p className="text-caption text-fg-mute mt-3 wrap-prose">{t.whereTapHint}</p>}
          </>
        )}
      </div>
    </Card>
  );
}

/** Payee by payee, largest first, the first ten until "All (n)"; each bar in its category's colour. */
function PayeesList({ payees, total, categories, language, t, expanded, onExpand }: {
  payees: NameTotal[];
  total: number;
  categories: Category[];
  language: string;
  t: Strings;
  expanded: boolean;
  onExpand: () => void;
}) {
  if (payees.length === 0) return <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>;
  const shown = expanded ? payees : payees.slice(0, 10);
  const max = Math.max(1, ...payees.map(p => p.total));
  const byId = new Map(categories.map(c => [c.id, c]));
  const money = (c: number) => formatMoney(c, t.locale);
  return (
    <>
      <ol className="-my-1 divide-hairline-inset" style={{ '--sep': '0px' } as CSSProperties}>
        {shown.map(n => {
          const c = byId.get(n.categoryId);
          return (
            <li key={n.name} data-hue={c?.hue} className="py-2.5">
              <div className="flex items-baseline gap-2">
                {c && <span className="emoji text-[17px] self-center" title={displayName(c.names, language)} aria-hidden="true">{c.emoji}</span>}
                <span className="min-w-0 flex-1 text-body text-fg wrap-compound">
                  {n.name}
                  <span className="text-caption text-fg-mute tabular-nums">
                    {' · '}{n.count > 1 && <>{fmt(t.timesCount, { n: n.count })} · </>}{fmt(t.ofExpenses, { p: Math.round((n.total / Math.max(1, total)) * 100) })}
                  </span>
                </span>
                <span className="text-body font-semibold text-fg num">{money(n.total)}</span>
              </div>
              <div className="mt-2 h-2 flex" aria-hidden="true">
                <span className="h-full rounded-full bg-hue-chart" style={{ width: `${(n.total / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      {!expanded && payees.length > shown.length && (
        <button
          type="button"
          onClick={() => { tapLight(); onExpand(); }}
          className="mt-2 -mb-2 h-tap w-full text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
        >
          {fmt(t.allPayees, { n: payees.length })}
        </button>
      )}
    </>
  );
}
