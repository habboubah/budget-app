import { CSSProperties, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AppData, MonthKey } from '../types';
import {
  MonthBalance, displayName, formatMoney, monthKeyOf, monthLabel, monthSpanLabel, monthsEnding, topNames,
} from '../logic';
import {
  averageMonths, averageSpans, categoryAverages, categoryMatrix, finishedMonths, monthSeries,
} from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Segmented } from '../ui/Field';
import { Card, CardAction, MenuPicker } from '../ui/Card';
import { AverageBars, BalanceChart, IncomeExpenseLines, CategoryMonthChart, IncomeExpenseChart, SavedLines } from './Charts';
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

type Range = 'last12' | 'all';

/**
 * Statistics, the long view (the insights are a tab of their own): income vs
 * expenses (columns), balance at month end, income and expenses as lines,
 * saved and overspent, the average per category over the last few finished
 * months (income first), each category per month (income and expenses
 * together), where the money went by payee over a period, and every number
 * in a table.
 */
export function StatsView({ month, balances, data, language, t, onMonth }: Props) {
  const { entries, categories } = data;
  const [range, setRange] = useState<Range>('last12');
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const today = new Date();

  const all = useMemo(() => monthSeries(balances), [balances]);
  const points = useMemo(() => (range === 'all' ? all : all.slice(-12)), [all, range]);
  const keys = useMemo(() => points.map(p => p.key), [points]);
  // Averages per category over the last few finished months (3 unless picked otherwise).
  const [avgSpan, setAvgSpan] = useState(3);
  const spans = averageSpans(finishedMonths(all, today, Infinity).length);
  const span = spans.includes(avgSpan) ? avgSpan : 0;
  const avgKeys = useMemo(() => averageMonths(all, span, today), [all, span]);
  const averages = useMemo(() => categoryAverages(entries, categories, avgKeys), [entries, categories, avgKeys]);
  // Income and expenses in one chart (the legend chips hide either, the card's button all of them).
  const matrix = useMemo(() => categoryMatrix(entries, categories, keys), [entries, categories, keys]);
  const [hiddenCats, setHiddenCats] = useState<string[]>([]);

  const avgIncome = Math.round(points.reduce((s, p) => s + p.income, 0) / Math.max(1, points.length));
  const avgExpense = Math.round(points.reduce((s, p) => s + p.expense, 0) / Math.max(1, points.length));

  if (!all.some(p => p.income || p.expense)) {
    return (
      <Screen title={t.statsTitle} tabbed>
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      </Screen>
    );
  }

  return (
    <Screen title={t.statsTitle} eyebrow={range === 'all' ? t.allMonths : fmt(t.lastMonths, { n: points.length })} tabbed>
      {all.length > 12 && (
        <Segmented<Range> label={t.statsTitle} value={range} onChange={setRange}
          options={[{ value: 'last12', label: t.rangeLast12 }, { value: 'all', label: t.rangeAll }]} />
      )}

      {/* ---------------------------------------------------- all months */}
      <Card title={t.incomeVsExpenses} sub={fmt(t.averagesLine, { in: money(avgIncome), out: money(avgExpense) })}>
        <IncomeExpenseChart points={points} selected={month} t={t} onPick={onMonth} />
      </Card>

      {points.length > 1 && (
        <Card title={t.balanceOverTime}>
          <BalanceChart points={points} selected={month} t={t} onPick={onMonth} />
        </Card>
      )}

      {points.length > 1 && (
        <Card title={t.incomeExpensesOverTime}>
          <IncomeExpenseLines points={points} selected={month} t={t} onPick={onMonth} />
        </Card>
      )}

      {points.length > 1 && (
        <Card title={t.savedOverTime}>
          <SavedLines points={points} selected={month} t={t} onPick={onMonth} />
        </Card>
      )}

      {averages.length > 0 && (
        <Card
          title={t.averageByCategory}
          sub={fmt(t.averageFrom, { span: monthSpanLabel(avgKeys, t.locale) })}
          action={spans.length > 1 && (
            <MenuPicker
              label={t.averageSpanLabel}
              value={span}
              onChange={setAvgSpan}
              options={spans.map(n => ({ value: n, label: n ? fmt(t.averageSpanN, { n }) : t.averageSpanAll }))}
            />
          )}
        >
          <AverageBars items={averages} language={language} t={t} />
        </Card>
      )}

      {matrix.categories.length > 0 && (
        <Card
          title={t.categoriesPerMonth}
          action={matrix.categories.length > 1 && (
            <CardAction onClick={() => setHiddenCats(hiddenCats.length ? [] : matrix.categories.map(c => c.id))}>
              {hiddenCats.length ? t.chartShowAll : t.chartHideAll}
            </CardAction>
          )}
        >
          <CategoryMonthChart matrix={matrix} months={keys} selected={month} language={language} t={t} onPick={onMonth}
            hidden={hiddenCats} setHidden={setHiddenCats} />
        </Card>
      )}

      {/* Payee by payee, over the period picked. */}
      <PayeesCard data={data} language={language} t={t} />

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
 * Where the money went, payee by payee ("Lidl" 6× · 12 %), over this month or
 * the last 2, 3, 6 or 12 — pending bills included, largest first, the first
 * ten until "All (n)". Each bar is in its category's colour.
 */
function PayeesCard({ data, language, t }: { data: AppData; language: string; t: Strings }) {
  const { entries, categories } = data;
  const [period, setPeriod] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const months = useMemo(() => monthsEnding(monthKeyOf(), period), [period]);
  const payees = useMemo(() => topNames(entries, categories, months), [entries, categories, months]);
  const total = payees.reduce((sum, p) => sum + p.total, 0);
  const shown = expanded ? payees : payees.slice(0, 10);
  const max = Math.max(1, ...payees.map(p => p.total));
  const byId = new Map(categories.map(c => [c.id, c]));
  const money = (c: number) => formatMoney(c, t.locale);
  const span = monthSpanLabel(months, t.locale);

  return (
    <Card
      title={t.whereMoneyWent}
      sub={total ? fmt(t.whereSub, { span, total: money(total) }) : span}
      action={(
        <MenuPicker
          label={t.wherePeriod}
          value={period}
          onChange={n => { setPeriod(n); setExpanded(false); }}
          options={[1, 2, 3, 6, 12].map(n => ({ value: n, label: n === 1 ? t.periodThisMonth : fmt(t.periodLastN, { n }) }))}
        />
      )}
    >
      {payees.length === 0 ? (
        <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>
      ) : (
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
                  <SplitBar paid={n.total} open={0} max={max} />
                </li>
              );
            })}
          </ol>
          {!expanded && payees.length > shown.length && (
            <button
              type="button"
              onClick={() => { tapLight(); setExpanded(true); }}
              className="mt-2 -mb-2 h-tap w-full text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
            >
              {fmt(t.allPayees, { n: payees.length })}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * A thin bar for one amount against the largest: paid in the category's
 * chart colour, still open in a lighter step of it, a 2px surface gap between.
 */
function SplitBar({ paid, open, max }: { paid: number; open: number; max: number }) {
  return (
    <div className="mt-2 h-2 flex gap-[2px]" aria-hidden="true">
      {paid > 0 && <span className="h-full rounded-full bg-hue-chart" style={{ width: `${(paid / max) * 100}%` }} />}
      {open > 0 && <span className="h-full rounded-full bg-hue-chart opacity-35" style={{ width: `${(open / max) * 100}%` }} />}
    </div>
  );
}
