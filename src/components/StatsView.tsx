import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppData, MonthKey } from '../types';
import {
  MonthBalance, addMonths, balanceFor, categoryBreakdown, displayName, formatMoney, monthKeyOf, monthLabel, topNames,
} from '../logic';
import {
  bestWorst, budgetSplit, categoryAverages, categoryMatrix, commitments, finishedMonths, forecast, monthSeries,
  monthsToYearEnd, reserveMonths, savings, unusual,
} from '../insights';
import { Strings, fmt, plural } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { IconButton } from '../ui/Button';
import { Segmented } from '../ui/Field';
import { Picture } from '../ui/Picture';
import { CountingMoney } from '../ui/CountingMoney';
import { AverageBars, BalanceChart, IncomeExpenseLines, BudgetSplitBar, CategoryMonthChart, IncomeExpenseChart, SavedSpark } from './Charts';

interface Props {
  /** The month the detail section at the bottom shows. */
  month: MonthKey;
  balances: MonthBalance[];
  data: AppData;
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
}

type Range = 'last12' | 'all';

/**
 * Statistics, from the long view to the single month, the reading last:
 *  1. all months — income vs expenses (columns), balance at month end,
 *     income and expenses as lines, the average per category (income first),
 *     and each category per month (income and expenses together);
 *  2. one month in detail — what was saved, where the money went;
 *  3. insights — savings rate, emergency reserve, forecast, 50/30/20, fixed
 *     commitments, what was unusual, best and weakest month.
 */
export function StatsView({ month, balances, data, language, t, onMonth }: Props) {
  const { entries, categories } = data;
  const [range, setRange] = useState<Range>('last12');
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const today = new Date();
  const current = monthKeyOf(today);

  const all = useMemo(() => monthSeries(balances), [balances]);
  const points = useMemo(() => (range === 'all' ? all : all.slice(-12)), [all, range]);
  const keys = useMemo(() => points.map(p => p.key), [points]);
  const averages = useMemo(() => categoryAverages(entries, categories, keys), [entries, categories, keys]);
  // Income and expenses in one chart (the legend chips hide either).
  const matrix = useMemo(() => categoryMatrix(entries, categories, keys), [entries, categories, keys]);

  // Insights average over finished months (the running one is half entered).
  const finished = useMemo(() => finishedMonths(all, today), [all]);
  const sv = savings(finished);
  const nowBalance = balanceFor(balances, current);
  const reserve = reserveMonths(nowBalance.now, sv.averageExpense);
  const shownReserve = reserve === null ? 0 : Math.round(reserve * 10) / 10;
  const split = budgetSplit(entries, categories, finished.map(p => p.key));
  const latest = [...all].reverse().find(p => p.key <= current)?.key ?? all[all.length - 1]?.key;
  const fixed = latest ? commitments(data, latest) : { items: [], monthly: 0, yearly: 0 };
  const odd = unusual(entries, categories, month, all.map(p => p.key), today);
  const bw = bestWorst(points);
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

      {averages.length > 0 && (
        <Card title={t.averageByCategory} sub={plural(points.length, t.averageOverOne, t.averageOver)}>
          <AverageBars items={averages} language={language} t={t} />
        </Card>
      )}

      {matrix.categories.length > 0 && (
        <Card title={t.categoriesPerMonth}>
          <CategoryMonthChart matrix={matrix} months={keys} selected={month} language={language} t={t} onPick={onMonth} />
        </Card>
      )}

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

      {/* --------------------------------------------- one month in detail */}
      <MonthDetail month={month} balances={balances} data={data} language={language} t={t} onMonth={onMonth} />

      {/* ------------------------------------------------------ insights */}
      <h2 className="px-1 pt-2 display text-title2 font-bold text-fg">{t.insightsTitle}</h2>
      {finished.length < 2 && <p className="px-2 -mt-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        {sv.rate !== null && (
          <Card title={t.savingsRateTitle}>
            <p className={`rounded-num text-[2.25rem] leading-none font-bold ${sv.rate < 0 ? 'text-neg' : 'text-fg'}`}>
              {Math.round(sv.rate * 100)} %
            </p>
            <p className="text-label text-fg-mute mt-2 wrap-prose">
              {fmt(sv.months === 1 ? t.savingsRateBodyOne : t.savingsRateBody, { amount: money(sv.averageSaved), n: sv.months })}
            </p>
            {points.length > 1 && <div className="mt-3"><SavedSpark points={points} /></div>}
          </Card>
        )}

        {reserve !== null && (
          <Card title={t.reserveTitle}>
            <p className="rounded-num text-[2.25rem] leading-none font-bold text-fg">
              {fmt(t.reserveValue, { n: new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 }).format(reserve) })}
            </p>
            <ReserveMeter months={shownReserve} />
            {/* Judged on the value shown: "6 Monate" must not read as "more than 6". */}
            <p className={`text-label font-semibold mt-2 ${shownReserve < 3 ? 'text-warn' : 'text-pos'}`}>
              {shownReserve < 3 ? t.reserveLow : shownReserve <= 6 ? t.reserveOk : t.reserveHigh}
            </p>
            <p className="text-caption text-fg-mute mt-1 wrap-prose">
              {fmt(t.reserveBody, { balance: money(nowBalance.now), expense: money(sv.averageExpense) })}
            </p>
          </Card>
        )}

        {sv.months > 0 && (
          <Card title={t.forecastTitle}>
            <dl className="grid grid-cols-2 gap-3">
              {monthsToYearEnd(current) > 0 && (
                <div>
                  <dt className="text-caption text-fg-mute">{fmt(t.forecastYearEnd, { month: monthLabel(`${current.slice(0, 4)}-12`, t.locale) })}</dt>
                  <dd className="text-heading font-semibold text-fg num mt-0.5">≈ {money(forecast(nowBalance.end, sv.averageSaved, monthsToYearEnd(current)))}</dd>
                </div>
              )}
              <div>
                <dt className="text-caption text-fg-mute">{t.forecastIn12}</dt>
                <dd className="text-heading font-semibold text-fg num mt-0.5">≈ {money(forecast(nowBalance.end, sv.averageSaved, 12))}</dd>
              </div>
            </dl>
            <p className="text-caption text-fg-mute mt-2 wrap-prose">
              {fmt(sv.averageSaved >= 0 ? t.forecastBody : t.forecastBodyNeg, { amount: money(Math.abs(sv.averageSaved)) })}
            </p>
          </Card>
        )}

        {split.income > 0 && (
          <Card title={t.splitTitle}>
            <BudgetSplitBar split={split} t={t} />
            <p className="text-caption text-fg-mute mt-3 wrap-prose">{t.splitBody}</p>
          </Card>
        )}

        <Card title={t.commitmentsTitle}>
          {fixed.items.length === 0 ? (
            <p className="text-label text-fg-mute wrap-prose">{t.commitmentsNone}</p>
          ) : (
            <>
              <p className="text-heading font-semibold text-fg tabular-nums">{fmt(t.commitmentsLine, { monthly: money(fixed.monthly), yearly: money(fixed.yearly) })}</p>
              {sv.averageIncome > 0 && (
                <p className="text-caption text-fg-mute mt-1 wrap-prose">{fmt(t.commitmentsShare, { p: Math.round((fixed.monthly / sv.averageIncome) * 100) })}</p>
              )}
              <ul className="mt-3 divide-hairline-inset">
                {fixed.items.slice(0, 6).map(i => {
                  const c = categories.find(x => x.id === i.categoryId);
                  return (
                    <li key={`${i.name}-${i.categoryId}`} className="relative py-2 flex items-start gap-2" style={{ '--sep': '0px' } as CSSProperties}>
                      <span className="emoji text-[15px] mt-0.5" aria-hidden="true">{c?.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-label text-fg wrap-compound">{i.name}</span>
                        <span className="block text-caption text-fg-mute tabular-nums">
                          {i.repeat === 'yearly' ? t.repeatsYearly : fmt(t.perYear, { amount: money(i.yearly) })}
                        </span>
                      </span>
                      <span className="text-label font-semibold text-fg num">{money(i.repeat === 'monthly' ? i.monthly : i.yearly)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {all.length > 2 && (
          <Card title={fmt(t.unusualTitle, { month: monthLabel(month, t.locale) })}>
            {odd.length === 0 ? (
              <p className="text-label text-fg-mute wrap-prose">{t.unusualNone}</p>
            ) : (
              <ul className="space-y-3">
                {odd.map(u => {
                  const up = u.diff > 0;
                  const Icon = up ? ArrowUpRight : ArrowDownRight;
                  return (
                    <li key={u.category.id} className="flex items-start gap-3">
                      <Picture emoji={u.category.emoji} name={displayName(u.category.names, language)} hue={u.category.hue} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{displayName(u.category.names, language)}</span>
                          <span className="text-label font-semibold text-fg num">{money(u.total)}</span>
                        </div>
                        <p className={`flex items-center gap-1 text-caption font-semibold tabular-nums ${up ? 'text-warn' : 'text-pos'}`}>
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          {fmt(up ? t.unusualMore : t.unusualLess, { pct: Math.round(Math.abs(u.diff) / u.usual * 100), usual: money(u.usual) })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {bw && (
          <Card title={t.bestWorstTitle}>
            <dl className="grid grid-cols-2 gap-3">
              {[{ label: t.bestMonth, p: bw.best }, { label: t.worstMonth, p: bw.worst }].map(({ label, p }) => (
                <button key={label} type="button" onClick={() => onMonth(p.key)}
                  className="text-start rounded-sm -m-1 p-1 active:bg-surface-2 focus-visible:ring-focus">
                  <dt className="text-caption text-fg-mute">{label}</dt>
                  <dd className="text-label font-semibold text-fg mt-0.5">{monthLabel(p.key, t.locale)}</dd>
                  <dd className={`text-heading font-semibold num ${p.saved < 0 ? 'text-neg' : 'text-pos'}`}>{money(p.saved, 'exceptZero')}</dd>
                </button>
              ))}
            </dl>
          </Card>
        )}
      </div>
    </Screen>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-md bg-surface card-edge p-4">
      <h3 className="text-label font-semibold text-fg wrap-compound">{title}</h3>
      {sub && <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 0–12 months of spending; the recommended 3–6 marked on the track. */
function ReserveMeter({ months }: { months: number }) {
  const pct = (m: number) => `${(Math.min(m, 12) / 12) * 100}%`;
  return (
    <div className="relative mt-3 h-2 rounded-full bg-surface-2" aria-hidden="true">
      <div className="absolute inset-y-0 rounded-full bg-pos-dim" style={{ insetInlineStart: pct(3), width: `${(3 / 12) * 100}%` }} />
      <div className={`absolute inset-y-0 start-0 rounded-full ${months < 3 ? 'bg-warn' : 'bg-pos'}`} style={{ width: pct(months) }} />
      {[3, 6].map(m => <div key={m} className="absolute -top-1 -bottom-1 w-px bg-fg-faint" style={{ insetInlineStart: pct(m) }} />)}
    </div>
  );
}

/** The bottom section: one month — what was saved, where the money went. */
function MonthDetail({ month, balances, data, language, t, onMonth }: Props) {
  const { entries, categories } = data;
  const [by, setBy] = useState<'category' | 'name'>('category');
  const b = balanceFor(balances, month);
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const income = b.incomePaid + b.incomeOpen;
  const expenses = b.expensePaid + b.expenseOpen;
  const saved = income - expenses;
  const rate = income > 0 ? Math.round((saved / income) * 100) : null;
  const slices = useMemo(() => categoryBreakdown(entries, categories, month), [entries, categories, month]);
  const names = useMemo(() => topNames(entries, categories, month, 8), [entries, categories, month]);
  const byId = new Map(categories.map(c => [c.id, c]));
  const maxSlice = Math.max(1, ...slices.map(s => s.total));
  const maxName = Math.max(1, ...names.map(n => n.total));

  return (
    <>
      <div className="pt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1 px-1">
          <p className="eyebrow text-fg-mute">{t.monthDetail}</p>
          <h2 className="display text-title2 font-bold text-fg wrap-compound">{monthLabel(month, t.locale)}</h2>
        </div>
        <span className="inline-flex rounded-full float-chrome shrink-0">
          <IconButton label={t.prevMonth} icon={ChevronLeft} className="rtl:rotate-180 !text-fg" onClick={() => onMonth(addMonths(month, -1))} />
          <IconButton label={t.nextMonth} icon={ChevronRight} className="rtl:rotate-180 !text-fg" onClick={() => onMonth(addMonths(month, 1))} />
        </span>
      </div>

      {b.count === 0 ? (
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      ) : (
        <>
          {/* The month in three numbers, on the hero like the month page; "saved"
              (or "overspent" — said in words) is the one it leads with. */}
          <section className="hero hero-glow rounded-lg overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <p className="eyebrow text-on-hero-mute">{saved >= 0 ? t.saved : t.overspent}</p>
              <p className="rounded-num text-[2.5rem] leading-none font-bold mt-2 text-on-hero">
                <span className="sr-only">{money(saved < 0 ? -saved : saved)}</span>
                <span aria-hidden="true"><CountingMoney cents={saved < 0 ? -saved : saved} money={money} /></span>
              </p>
              {rate !== null && saved > 0 && <p className="text-label text-on-hero-mute mt-1.5">{fmt(t.savingsRate, { p: rate })}</p>}
            </div>
            <div className="mx-2 mb-2 rounded-md hero-panel px-3.5 py-3 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-caption text-on-hero-soft">{t.income}</p>
                <p className="text-body font-semibold num text-on-hero-pos mt-0.5">{money(income, 'exceptZero')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-caption text-on-hero-soft">{t.expenses}</p>
                <p className="text-body font-semibold num text-on-hero mt-0.5">{money(expenses ? -expenses : 0)}</p>
              </div>
            </div>
          </section>

          {expenses > 0 && (
            <section className="space-y-3">
              <h3 className="px-1 display text-heading font-semibold text-fg">{t.whereMoneyWent}</h3>
              <Segmented<'category' | 'name'> label={t.whereMoneyWent} value={by} onChange={setBy}
                options={[{ value: 'category', label: t.byCategory }, { value: 'name', label: t.byName }]} />
              <div className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset">
                {by === 'category'
                  ? slices.map(s => {
                    const name = displayName(s.category.names, language);
                    return (
                      <div key={s.category.id} data-hue={s.category.hue} className="relative px-4 py-3 flex items-center gap-3" style={{ '--sep': '4.25rem' } as CSSProperties}>
                        <Picture emoji={s.category.emoji} name={name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{name}</span>
                            <span className="text-body font-semibold text-fg num">{money(s.total)}</span>
                          </div>
                          <SplitBar paid={s.paid} open={s.open} max={maxSlice} />
                          <p className="text-caption text-fg-mute mt-1 tabular-nums">
                            {fmt(t.ofExpenses, { p: Math.round((s.total / expenses) * 100) })}
                            {s.open > 0 && <> · <span className="text-warn font-semibold">{fmt(t.inclOpen, { amount: money(s.open) })}</span></>}
                          </p>
                        </div>
                      </div>
                    );
                  })
                  : names.map(n => {
                    const c = byId.get(n.categoryId);
                    return (
                      <div key={n.name} data-hue={c?.hue} className="relative px-4 py-3" style={{ '--sep': '1rem' } as CSSProperties}>
                        <div className="flex items-baseline gap-2">
                          {c && <span className="emoji text-[17px] self-center" title={displayName(c.names, language)} aria-hidden="true">{c.emoji}</span>}
                          <span className="min-w-0 flex-1 text-body text-fg wrap-compound">
                            {n.name}
                            {n.count > 1 && <span className="text-caption text-fg-mute tabular-nums"> · {fmt(t.timesCount, { n: n.count })}</span>}
                          </span>
                          <span className="text-body font-semibold text-fg num">{money(n.total)}</span>
                        </div>
                        <SplitBar paid={n.total} open={0} max={maxName} />
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </>
      )}
    </>
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
