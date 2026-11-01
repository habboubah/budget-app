import { CSSProperties, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import {
  MonthBalance, addMonths, averageByCategory, balanceFor, categoryBreakdown, displayName, formatMoney, history,
  monthLabel, topNames,
} from '../logic';
import { Strings, fmt, plural } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { IconButton } from '../ui/Button';
import { Segmented } from '../ui/Field';
import { Picture } from '../ui/Picture';
import { BalanceChart, IncomeExpenseChart } from './Charts';

interface Props {
  month: MonthKey;
  balances: MonthBalance[];
  categories: Category[];
  entries: Entry[];
  language: string;
  t: Strings;
  onMonth: (m: MonthKey) => void;
}

/**
 * Where the money went, and how much is being saved: the month in three
 * numbers, its expenses by category and by shop, then the last twelve months.
 */
export function StatsView({ month, balances, categories, entries, language, t, onMonth }: Props) {
  const [by, setBy] = useState<'category' | 'name'>('category');
  const b = balanceFor(balances, month);
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const income = b.incomePaid + b.incomeOpen;
  const expenses = b.expensePaid + b.expenseOpen;
  const saved = income - expenses;
  const rate = income > 0 ? Math.round((saved / income) * 100) : null;

  const slices = useMemo(() => categoryBreakdown(entries, categories, month), [entries, categories, month]);
  const names = useMemo(() => topNames(entries, categories, month, 8), [entries, categories, month]);
  const points = useMemo(() => history(balances, month, 12).filter(p => p.started), [balances, month]);
  const averages = useMemo(() => averageByCategory(entries, categories, points.map(p => p.key)), [entries, categories, points]);
  const byId = new Map(categories.map(c => [c.id, c]));
  const maxSlice = Math.max(1, ...slices.map(s => s.total));
  const maxName = Math.max(1, ...names.map(n => n.total));

  return (
    <Screen
      title={t.statsTitle}
      eyebrow={monthLabel(month, t.locale)}
      tabbed
      actions={
        <>
          <IconButton label={t.prevMonth} icon={ChevronLeft} tone="accent" className="rtl:rotate-180" onClick={() => onMonth(addMonths(month, -1))} />
          <IconButton label={t.nextMonth} icon={ChevronRight} tone="accent" className="rtl:rotate-180" onClick={() => onMonth(addMonths(month, 1))} />
        </>
      }
    >
      {b.count === 0 ? (
        <Empty emoji="📊" title={fmt(t.statsEmptyTitle, { month: monthLabel(month, t.locale) })} body={t.statsEmptyBody} />
      ) : (
        <>
          {/* The month in three numbers; "saved" is the one it leads with. */}
          <section className="rounded-md bg-surface card-edge p-5">
            <p className="eyebrow text-fg-mute">{saved >= 0 ? t.saved : t.overspent}</p>
            <p className={`text-[2.5rem] leading-none font-semibold tracking-tight mt-2 ${saved < 0 ? 'text-neg' : 'text-fg'}`}>
              {money(saved < 0 ? -saved : saved)}
            </p>
            {rate !== null && saved > 0 && (
              <p className="text-label text-fg-mute mt-1.5">{fmt(t.savingsRate, { p: rate })}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 hairline-t">
              <div className="min-w-0">
                <p className="text-caption text-fg-mute">{t.income}</p>
                <p className="text-body font-semibold text-pos mt-0.5">{money(income, 'exceptZero')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-caption text-fg-mute">{t.expenses}</p>
                <p className="text-body font-semibold text-fg mt-0.5">{money(expenses ? -expenses : 0)}</p>
              </div>
            </div>
          </section>

          {expenses > 0 && (
            <section className="space-y-3">
              <h2 className="px-2 display text-heading font-bold text-fg">{t.whereMoneyWent}</h2>
              <Segmented<'category' | 'name'>
                label={t.whereMoneyWent}
                value={by}
                onChange={setBy}
                options={[{ value: 'category', label: t.byCategory }, { value: 'name', label: t.byName }]}
              />
              <div className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset">
                {by === 'category'
                  ? slices.map(s => {
                    const name = displayName(s.category.names, language);
                    const share = Math.round((s.total / expenses) * 100);
                    return (
                      <div key={s.category.id} data-hue={s.category.hue} className="relative px-4 py-3 flex items-center gap-3" style={{ '--sep': '4.25rem' } as CSSProperties}>
                        <Picture emoji={s.category.emoji} name={name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{name}</span>
                            <span className="text-body font-semibold text-fg num">{money(s.total)}</span>
                          </div>
                          <SplitBar paid={s.paid} open={s.open} max={maxSlice} />
                          <p className="text-caption text-fg-mute mt-1 num">
                            {fmt(t.ofExpenses, { p: share })}
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
                            {n.count > 1 && <span className="text-caption text-fg-mute num"> · {fmt(t.timesCount, { n: n.count })}</span>}
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

      {points.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-2 display text-heading font-bold text-fg">{fmt(t.lastMonths, { n: points.length })}</h2>
          <div className="rounded-md bg-surface card-edge p-4">
            <h3 className="text-label font-semibold text-fg mb-2">{t.incomeVsExpenses}</h3>
            <IncomeExpenseChart points={points} selected={month} t={t} onPick={onMonth} />
          </div>
          {points.length > 1 && (
            <div className="rounded-md bg-surface card-edge p-4">
              <h3 className="text-label font-semibold text-fg mb-3">{t.balanceOverTime}</h3>
              <BalanceChart points={points} selected={month} t={t} onPick={onMonth} />
            </div>
          )}
          {/* Every value of both charts, without hovering. */}
          <details className="rounded-md bg-surface card-edge group">
            <summary className="min-h-control px-4 flex items-center gap-2 text-label font-semibold text-accent cursor-pointer list-none focus-visible:ring-focus rounded-md">
              <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 rtl:rotate-180" aria-hidden="true" />
              {t.showTable}
            </summary>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full text-caption num">
                <thead className="text-fg-mute">
                  <tr>
                    <th className="text-start font-semibold py-1.5 pe-2">{t.tabMonth}</th>
                    <th className="text-end font-semibold py-1.5 px-2">{t.income}</th>
                    <th className="text-end font-semibold py-1.5 px-2">{t.expenses}</th>
                    <th className="text-end font-semibold py-1.5 ps-2">{t.balanceEnd}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map(p => (
                    <tr key={p.key} className={`hairline-t ${p.key === month ? 'font-bold' : ''}`}>
                      <td className="py-1.5 pe-2 text-fg whitespace-nowrap">{monthLabel(p.key, t.locale, 'short')}</td>
                      <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.income)}</td>
                      <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{money(p.expense)}</td>
                      <td className={`py-1.5 ps-2 text-end whitespace-nowrap ${p.end < 0 ? 'text-neg' : 'text-fg'}`}>{money(p.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}

      {averages.length > 0 && points.length > 1 && (
        <section>
          <h2 className="px-2 pb-2 display text-heading font-bold text-fg">{t.averagePerMonth}</h2>
          <div className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset">
            {averages.map(a => {
              const name = displayName(a.category.names, language);
              return (
                <div key={a.category.id} className="relative min-h-chrome px-4 py-2 flex items-center gap-3" style={{ '--sep': '4.25rem' } as CSSProperties}>
                  <Picture emoji={a.category.emoji} name={name} hue={a.category.hue} size="md" />
                  <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{name}</span>
                  <span className="text-body font-semibold text-fg num">{money(a.average)}</span>
                </div>
              );
            })}
          </div>
          <p className="px-2 pt-2 text-caption text-fg-mute">{plural(points.length, t.averageOverOne, t.averageOver)}</p>
        </section>
      )}
    </Screen>
  );
}

/**
 * A thin bar for one amount against the largest: paid in the category's ink,
 * still open in a lighter step of it, a 2px surface gap between the two.
 */
function SplitBar({ paid, open, max }: { paid: number; open: number; max: number }) {
  const pw = (paid / max) * 100;
  const ow = (open / max) * 100;
  return (
    <div className="mt-2 h-2 flex gap-[2px]" aria-hidden="true">
      {paid > 0 && <span className="h-full rounded-full bg-hue-ink" style={{ width: `${pw}%` }} />}
      {open > 0 && <span className="h-full rounded-full bg-hue-ink opacity-35" style={{ width: `${ow}%` }} />}
    </div>
  );
}
