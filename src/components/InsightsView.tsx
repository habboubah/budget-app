import { CSSProperties, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppData, Category, MonthKey } from '../types';
import {
  MonthBalance, addMonths, balanceFor, displayName, formatMoney, formatPercent, monthKeyOf, monthLabel, monthSpanLabel, monthsEnding,
} from '../logic';
import {
  bestWorst, biggestExpenses, budgetRule, budgetSplit, categoryTrends, commitments, finishedMonths, forecast, missingRegulars,
  monthSeries, monthsToYearEnd, newNames, priceChanges, reserveMonths, savings, unusual, unusualBasis,
} from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Picture } from '../ui/Picture';
import { Card, MenuPicker } from '../ui/Card';
import { tapLight } from '../ui/haptics';
import { BUCKET_STYLE, BudgetSplitBar, RuleBar, SavingsRateChart } from './Charts';

interface Props {
  /** The month the hints at the bottom are about. */
  month: MonthKey;
  balances: MonthBalance[];
  data: AppData;
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
}

/** The savings target of the 50/30/20 rule, also the line in the savings-rate chart. */
const SAVE_TARGET = 20;

/**
 * The insights, a tab of their own: first the long view over finished months
 * — savings rate (month by month against the 20 % target), 50/30/20 (each
 * part against its share, in euros, month by month), reserve, forecast,
 * commitments, trends, best and weakest month — then hints for one month
 * (switchable): unusual, biggest expenses (both over a period), new names,
 * missing regulars, new prices.
 */
export function InsightsView({ month, balances, data, language, t, onMonth }: Props) {
  const { entries, categories } = data;
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const today = new Date();
  const current = monthKeyOf(today);

  const all = useMemo(() => monthSeries(balances), [balances]);
  const points = useMemo(() => all.slice(-12), [all]);
  // Averages over finished months (the running one is half entered).
  const finished = useMemo(() => finishedMonths(all, today), [all]);
  const finishedKeys = finished.map(p => p.key);
  const sv = savings(finished);
  const nowBalance = balanceFor(balances, current);
  const reserve = reserveMonths(nowBalance.now, sv.averageExpense);
  const shownReserve = reserve === null ? 0 : Math.round(reserve * 10) / 10;
  const rule = useMemo(() => budgetRule(entries, categories, finishedKeys), [entries, categories, finishedKeys.join()]);
  const split = budgetSplit(entries, categories, finishedKeys);
  const latest = [...all].reverse().find(p => p.key <= current)?.key ?? all[all.length - 1]?.key;
  const fixed = latest ? commitments(data, latest) : { items: [], monthly: 0, yearly: 0 };
  const bw = bestWorst(points);
  const trends = categoryTrends(entries, categories, finishedKeys);
  const allKeys = all.map(p => p.key);

  // Hints for one month; "unusual" and "biggest" also over a few months ending with it.
  const [oddPeriod, setOddPeriod] = useState(1);
  const [bigPeriod, setBigPeriod] = useState(1);
  const periodLabel = (n: number) => (n === 1 ? (month === current ? t.periodThisMonth : monthLabel(month, t.locale)) : fmt(t.periodLastN, { n }));
  // Only periods with at least two months before them to compare with.
  const oddPeriods = [1, 2, 3, 6].filter(n => n === 1 || unusualBasis(monthsEnding(month, n), allKeys).length >= 2);
  const oddN = oddPeriods.includes(oddPeriod) ? oddPeriod : 1;
  const oddMonths = monthsEnding(month, oddN);
  const odd = unusual(entries, categories, oddMonths, allKeys, today);
  const bigMonths = monthsEnding(month, bigPeriod);
  const biggest = biggestExpenses(entries, categories, bigMonths, bigPeriod === 1 ? 3 : 5);
  const fresh = newNames(entries, categories, month);
  const missing = missingRegulars(entries, month);
  const changes = priceChanges(entries, categories, month);

  const catOf = (id: string) => categories.find(c => c.id === id);
  const pct = (part: number, whole: number) => Math.round(Math.abs(part) / Math.max(1, whole) * 100);
  const ratePct = sv.rate === null ? null : Math.round(sv.rate * 100);

  if (!all.some(p => p.income || p.expense)) {
    return (
      <Screen title={t.insightsTitle} tabbed>
        <Empty emoji="💡" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.insightsEmpty} />
      </Screen>
    );
  }

  return (
    <Screen title={t.insightsTitle} eyebrow={finished.length ? fmt(t.averageFrom, { span: monthSpanLabel(finishedKeys, t.locale) }) : undefined} tabbed>
      {finished.length < 2 && <p className="px-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* ------------------------------------------------- savings rate */}
        {ratePct !== null && (
          <Card title={t.savingsRateTitle} className="sm:col-span-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className={`rounded-num text-[2.25rem] leading-none font-bold ${ratePct < 0 ? 'text-neg' : 'text-fg'}`}>{formatPercent(ratePct, t.locale)}</p>
              <p className={`text-label font-semibold tabular-nums ${ratePct >= SAVE_TARGET ? 'text-pos' : 'text-warn'}`}>
                {ratePct >= SAVE_TARGET ? fmt(t.savingsAbove, { p: SAVE_TARGET }) : fmt(t.savingsBelow, { d: SAVE_TARGET - ratePct, p: SAVE_TARGET })}
              </p>
            </div>
            <p className="text-label text-fg-mute mt-2 wrap-prose">
              {fmt(sv.months === 1 ? t.savingsRateBodyOne : t.savingsRateBody, { amount: money(sv.averageSaved), n: sv.months })}
            </p>
            {points.length > 1 && (
              <div className="mt-4">
                <SavingsRateChart points={points} selected={month} t={t} onPick={onMonth} target={SAVE_TARGET} />
              </div>
            )}
          </Card>
        )}

        {/* --------------------------------------------------- 50/30/20 */}
        {rule.income > 0 && (
          <Card title={t.splitTitle} sub={fmt(t.averageFrom, { span: monthSpanLabel(finishedKeys, t.locale) })} className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 display text-heading font-semibold text-fg tabular-nums">{fmt(t.splitMet, { n: rule.met })}</p>
              <span className="flex gap-1" aria-hidden="true">
                {rule.parts.map(p => (
                  <span key={p.bucket} className={`w-2.5 h-2.5 rounded-full ${p.ok ? 'bg-pos' : 'border-[1.75px] border-fg-faint'}`} />
                ))}
              </span>
            </div>
            <div className="mt-3"><BudgetSplitBar split={split} t={t} /></div>

            <ul className="mt-4 space-y-4">
              {rule.parts.map(p => {
                const diff = Math.abs(p.amount - p.budget);
                const note = p.bucket === 'save'
                  ? fmt(p.ok ? t.splitAhead : t.splitShort, { amount: money(diff) })
                  : fmt(p.ok ? t.splitWithin : t.splitOver, { amount: money(diff) });
                return (
                  <li key={p.bucket}>
                    <div className="flex items-baseline gap-2">
                      <span className={`w-2.5 h-2.5 rounded-[3px] shrink-0 self-center ${BUCKET_STYLE[p.bucket].className}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-label font-semibold text-fg">{BUCKET_STYLE[p.bucket].label(t)}</span>
                      <span className={`text-label font-bold num ${p.bucket === 'save' && p.amount < 0 ? 'text-neg' : 'text-fg'}`}>
                        {p.share === null ? '–' : formatPercent(p.share, t.locale)}
                      </span>
                      <span className="text-caption text-fg-mute tabular-nums whitespace-nowrap">{fmt(t.targetPct, { p: p.target })}</span>
                    </div>
                    <RuleBar part={p} />
                    <p className="mt-1.5 text-caption tabular-nums wrap-prose">
                      <span className="text-fg-mute">{fmt(t.splitPerMonth, { amount: money(p.amount) })} · </span>
                      <span className={`font-semibold ${p.ok ? 'text-pos' : 'text-warn'}`}>{note}</span>
                    </p>
                    {p.top.length > 0 && (
                      <p className="mt-0.5 text-caption text-fg-mute tabular-nums wrap-prose">
                        {p.top.map(x => `${x.category.emoji} ${displayName(x.category.names, language)} ${money(x.amount)}`).join(' · ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {rule.months.length > 1 && (
              <div className="mt-4 pt-3 hairline-t">
                <p className="text-label text-fg tabular-nums">
                  {fmt(t.splitMonths, { n: rule.months.filter(m => m.met === 3).length, total: rule.months.length })}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {rule.months.map(m => (
                    <li key={m.key}>
                      <button
                        type="button"
                        onClick={() => { tapLight(); onMonth(m.key); }}
                        aria-label={fmt(t.splitMonthMet, { month: monthLabel(m.key, t.locale), n: m.met })}
                        className="h-8 ps-2 pe-2.5 rounded-full bg-surface-2 inline-flex items-center gap-1.5 text-caption font-semibold text-fg tabular-nums active:opacity-60 focus-visible:ring-focus"
                      >
                        <span className={`w-2 h-2 rounded-full ${m.met === 3 ? 'bg-pos' : m.met === 2 ? 'bg-warn' : 'bg-neg'}`} aria-hidden="true" />
                        {monthLabel(m.key, t.locale, 'month')}
                        <span className="text-fg-mute font-medium">{m.met}/3</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-caption text-fg-mute mt-3 wrap-prose">{t.splitBody}</p>
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

        {trends.length > 0 && (
          <Card title={t.trendTitle} sub={t.trendSub}>
            <ul className="space-y-3">
              {trends.map(x => (
                <HintRow key={x.category.id} category={x.category} language={language} name={displayName(x.category.names, language)}
                  value={money(x.recent)}
                  note={fmt(x.diff > 0 ? t.trendMore : t.trendLess, { pct: pct(x.diff, x.earlier), before: money(x.earlier) })}
                  tone={x.diff > 0 ? 'text-warn' : 'text-pos'} up={x.diff > 0} />
              ))}
            </ul>
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

      {/* ------------------------------------------------- one month's hints */}
      <div className="pt-2 flex items-end gap-2">
        <div className="min-w-0 flex-1 px-1">
          <p className="eyebrow text-fg-mute">{t.insightsMonth}</p>
          <h2 className="display text-title2 font-bold text-fg wrap-compound">{monthLabel(month, t.locale)}</h2>
        </div>
        <span className="inline-flex rounded-full float-chrome shrink-0">
          {[{ label: t.prevMonth, icon: ChevronLeft, step: -1 }, { label: t.nextMonth, icon: ChevronRight, step: 1 }].map(({ label, icon: Icon, step }) => (
            <button
              key={step} type="button" aria-label={label} title={label}
              onClick={() => { tapLight(); onMonth(addMonths(month, step)); }}
              className="h-tap w-tap inline-flex items-center justify-center rounded-full text-fg active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <Icon className="w-[22px] h-[22px] rtl:rotate-180" strokeWidth={2.2} />
            </button>
          ))}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {all.length > 2 && (
          <Card
            title={oddN === 1 ? fmt(t.unusualTitle, { month: monthLabel(month, t.locale) }) : t.unusualPlain}
            sub={oddN === 1 ? undefined : monthSpanLabel(oddMonths, t.locale)}
            action={oddPeriods.length > 1 && (
              <MenuPicker label={t.wherePeriod} value={oddN} onChange={setOddPeriod}
                options={oddPeriods.map(n => ({ value: n, label: periodLabel(n) }))} />
            )}
          >
            {odd.length === 0 ? (
              <p className="text-label text-fg-mute wrap-prose">{t.unusualNone}</p>
            ) : (
              <ul className="space-y-3">
                {odd.map(u => {
                  const up = u.diff > 0;
                  const line = oddN === 1 ? (up ? t.unusualMore : t.unusualLess) : (up ? t.unusualMoreN : t.unusualLessN);
                  return (
                    <HintRow key={u.category.id} category={u.category} language={language} name={displayName(u.category.names, language)}
                      value={money(u.total)}
                      note={fmt(line, { pct: Math.round(Math.abs(u.diff) / u.usual * 100), usual: money(u.usual) })}
                      tone={up ? 'text-warn' : 'text-pos'} up={up} />
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {(biggest.length > 0 || bigPeriod > 1) && (
          <Card
            title={bigPeriod === 1 ? fmt(t.biggestTitle, { month: monthLabel(month, t.locale) }) : t.biggestPlain}
            sub={bigPeriod === 1 ? undefined : monthSpanLabel(bigMonths, t.locale)}
            action={(
              <MenuPicker label={t.wherePeriod} value={bigPeriod} onChange={setBigPeriod}
                options={[1, 2, 3, 6].map(n => ({ value: n, label: periodLabel(n) }))} />
            )}
          >
            {biggest.length === 0 ? (
              <p className="text-label text-fg-mute wrap-prose">{t.whereNone}</p>
            ) : (
              <ul className="space-y-3">
                {biggest.map(({ entry: x, share }) => (
                  <HintRow key={x.id} category={catOf(x.categoryId)} language={language} name={x.name} value={money(x.amount)}
                    note={bigPeriod === 1
                      ? fmt(t.biggestShare, { pct: Math.round(share * 100) })
                      : `${fmt(t.biggestShare, { pct: Math.round(share * 100) })} · ${monthLabel(x.month, t.locale, 'short')}`} />
                ))}
              </ul>
            )}
          </Card>
        )}

        {fresh.length > 0 && (
          <Card title={fmt(t.newTitle, { month: monthLabel(month, t.locale) })} sub={t.newSub}>
            <ul className="space-y-3">
              {fresh.map(x => (
                <HintRow key={x.id} category={catOf(x.categoryId)} language={language} name={x.name} value={money(x.amount)}
                  note={displayName(catOf(x.categoryId)?.names, language)} />
              ))}
            </ul>
          </Card>
        )}

        {missing.length > 0 && (
          <Card title={fmt(t.missingTitle, { month: monthLabel(month, t.locale) })} sub={t.missingSub}>
            <ul className="space-y-3">
              {missing.map(x => (
                <HintRow key={x.name} category={catOf(x.categoryId)} language={language} name={x.name}
                  note={fmt(t.missingLine, { amount: money(x.usual) })} tone="text-warn" />
              ))}
            </ul>
          </Card>
        )}

        {changes.length > 0 && (
          <Card title={fmt(t.priceTitle, { month: monthLabel(month, t.locale) })}>
            <ul className="space-y-3">
              {changes.map(x => (
                <HintRow key={x.name} category={catOf(x.categoryId)} language={language} name={x.name}
                  value={`${money(x.before)} → ${money(x.now)}`}
                  note={fmt(t.priceLine, { pct: `${x.diff > 0 ? '+' : '−'}${pct(x.diff, x.before)}`, diff: money(x.diff, 'exceptZero') })}
                  tone={x.diff > 0 ? 'text-warn' : 'text-pos'} up={x.diff > 0} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Screen>
  );
}

/**
 * One line of a hint card: the category's picture, a name, an amount, and
 * a short note — coloured (and with an arrow) when it says up or down.
 */
function HintRow({ category, language, name, value, note, tone = 'text-fg-mute', up }: {
  category?: Category;
  language: string;
  name: string;
  value?: string;
  note: string;
  tone?: string;
  /** An arrow up or down before the note; none when not given. */
  up?: boolean;
}) {
  const Icon = up === undefined ? null : up ? ArrowUpRight : ArrowDownRight;
  return (
    <li className="flex items-start gap-3">
      {category && <Picture emoji={category.emoji} name={displayName(category.names, language)} hue={category.hue} size="sm" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{name}</span>
          {value && <span className="text-label font-semibold text-fg num whitespace-nowrap">{value}</span>}
        </div>
        <p className={`flex items-center gap-1 text-caption font-semibold tabular-nums ${tone}`}>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
          <span className="wrap-prose">{note}</span>
        </p>
      </div>
    </li>
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
