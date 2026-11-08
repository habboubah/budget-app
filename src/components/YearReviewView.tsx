import { CSSProperties, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Share2 } from 'lucide-react';
import { Category } from '../types';
import { displayName, formatMoney, formatMoneyApprox, formatMoneyEstimate, formatMoneyShort, formatPercent, monthLabel } from '../logic';
import { Book, Fraction, nearFraction, yearReview } from '../insights';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { IncomeExpenseChart } from './Charts';
import { ShareImage } from '../shareImage';

const FRACTION: Record<Fraction, 'fracHalf' | 'fracThird' | 'fracQuarter' | 'fracFifth' | 'fracTenth'> = {
  half: 'fracHalf', third: 'fracThird', quarter: 'fracQuarter', fifth: 'fracFifth', tenth: 'fracTenth',
};

/**
 * The Jahresrückblick (§9.7, plan 13), from its seasonal card on Statistik:
 * the year in three numbers, its months, the dearest categories against the
 * year before, the payees, the biggest expense and the best month — then
 * *Für {year + 1}*: fixed costs, the yearly bills as a monthly reserve, and
 * budgets from the last twelve months to take over in one undoable step.
 * It can be shared as a picture, made only on tap, without amounts unless
 * switched on (D7).
 */
export function YearReviewView({ book, year, language, t, onBack, onApplyBudgets, onShare }: {
  book: Book;
  year: string;
  language: string;
  t: Strings;
  onBack: () => void;
  onApplyBudgets: (budgets: { category: Category; amount: number }[]) => void;
  onShare: (image: ShareImage) => void;
}) {
  const y = useMemo(() => yearReview(book, year, new Date()), [book, year]);
  const [amounts, setAmounts] = useState(false);
  const money = (c: number) => formatMoney(c, t.locale);
  const approx = (c: number) => formatMoneyApprox(c, t.locale);
  const est = (c: number) => formatMoneyEstimate(Math.abs(c), t.locale);
  const next = String(Number(year) + 1);
  if (!y.months.length) {
    return (
      <Screen title={t.yearTitle} eyebrow={year} onBack={onBack} backLabel={t.back} tabbed>
        <Empty emoji="🗓️" title={fmt(t.statsEmptyTitle, { month: year })} />
      </Screen>
    );
  }
  const fraction = y.rate !== null && y.rate > 0 ? nearFraction(y.rate) : null;
  const share = fraction ? t[FRACTION[fraction]] : y.rate !== null ? formatPercent(Math.round(y.rate * 100), t.locale) : '';
  const headline = y.saved < 0 ? fmt(t.yearHeadlineOver, { year, amount: est(y.saved) }) : fmt(t.yearHeadline, { year, amount: est(y.saved), share });
  const tiles = [
    { label: t.yearIn, value: approx(y.income) },
    { label: t.yearOut, value: approx(y.spending) },
    { label: t.saved, value: approx(y.saved), tone: y.saved < 0 ? 'text-neg' : 'text-fg' },
  ];
  const name = (c: Category) => displayName(c.names, language);
  const image = (): ShareImage => {
    const rate = y.rate === null ? null : formatPercent(Math.round(y.rate * 100), t.locale);
    const lines = [
      amounts ? headline : rate ? fmt(t.yearImageRate, { p: rate }) : fmt(t.yearImageTitle, { year }),
      ...(amounts ? [`${t.yearIn} ${approx(y.income)} · ${t.yearOut} ${approx(y.spending)}`] : []),
      y.top.length ? fmt(t.yearImageTop, { names: y.top.slice(0, 3).map(x => (amounts ? `${name(x.category)} ${approx(x.amount)}` : name(x.category))).join(', ') }) : '',
      y.best ? fmt(t.yearImageBest, { month: monthLabel(y.best.key, t.locale, 'name') }) : '',
    ].filter(Boolean);
    return { title: fmt(t.yearImageTitle, { year }), lines, footer: t.yearImageFooter };
  };

  return (
    <Screen title={t.yearTitle} eyebrow={year} onBack={onBack} backLabel={t.back} tabbed>
      <section className="rounded-md hero hero-glow text-on-hero p-[16px]">
        <h2 className="display text-heading font-semibold tabular-nums wrap-prose">{headline}</h2>
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-sm hero-panel p-3">
          {tiles.map(x => (
            <div key={x.label} className="min-w-0">
              <dt className="text-caption text-on-hero-soft wrap-compound">{x.label}</dt>
              <dd className={`rounded-num text-body font-semibold ${x.tone === 'text-neg' ? 'text-on-hero-neg' : 'text-on-hero'}`}>{x.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Card title={t.yearMonths}>
        <IncomeExpenseChart points={y.points} selected="" t={t} />
      </Card>

      {y.top.length > 0 && (
        <Card title={t.yearTop}>
          <ul className="-mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
            {y.top.map(x => {
              const change = x.lastYear ? Math.round(((x.amount - x.lastYear) / x.lastYear) * 100) : null;
              const Arrow = change !== null && change > 0 ? ArrowUpRight : ArrowDownRight;
              return (
                <li key={x.category.id} className="min-h-tap px-4 py-2 flex items-baseline gap-2">
                  <span className="emoji text-[15px]" aria-hidden="true">{x.category.emoji}</span>
                  <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{name(x.category)}</span>
                  {x.lastYear !== null && (
                    change === null || x.lastYear === 0 ? (
                      <span className="shrink-0 text-caption text-fg-mute">{t.yearNew}</span>
                    ) : Math.abs(change) >= 1 && (
                      <span className={`shrink-0 inline-flex items-center gap-0.5 text-caption font-semibold tabular-nums ${change > 0 ? 'text-warn' : 'text-pos'}`}>
                        <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} aria-hidden="true" />
                        {fmt(t.yearVsLast, { p: formatPercent(Math.abs(change), t.locale), year: String(Number(year) - 1) })}
                      </span>
                    )
                  )}
                  <span className="shrink-0 rounded-num text-label font-semibold text-fg">{money(x.amount)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {y.payees.length > 0 && (
        <Card title={t.yearPayees}>
          <ul className="-mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
            {y.payees.map(p => (
              <li key={p.name} className="min-h-tap px-4 py-2 flex items-baseline gap-2">
                <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{p.name}</span>
                <span className="shrink-0 text-caption text-fg-mute tabular-nums">{fmt(t.timesCount, { n: p.count })}</span>
                <span className="shrink-0 rounded-num text-label font-semibold text-fg">{money(p.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(y.biggest || y.best) && (
        <dl className="grid grid-cols-2 gap-2">
          {y.biggest && (
            <div className="min-w-0 rounded-md bg-surface card-edge px-3 py-2.5">
              <dt className="text-caption text-fg-mute">{t.yearBiggest}</dt>
              <dd className="text-label text-fg wrap-compound">{y.biggest.name}</dd>
              <dd className="rounded-num text-heading font-semibold text-fg">{money(y.biggest.amount)}</dd>
            </div>
          )}
          {y.best && (
            <div className="min-w-0 rounded-md bg-surface card-edge px-3 py-2.5">
              <dt className="text-caption text-fg-mute">{t.yearBest}</dt>
              <dd className="text-label text-fg wrap-compound">{monthLabel(y.best.key, t.locale, 'name')}</dd>
              <dd className="rounded-num text-heading font-semibold text-pos">{formatMoney(y.best.saved, t.locale, 'exceptZero')}</dd>
            </div>
          )}
        </dl>
      )}

      <Card title={fmt(t.yearNext, { year: next })}>
        <p className="text-body text-fg tabular-nums wrap-prose">{fmt(t.yearNextFixed, { amount: approx(y.next.fixedMonthly) })}</p>
        {y.next.yearly > 0 && (
          <p className="text-body text-fg tabular-nums mt-1 wrap-prose">
            {fmt(t.yearNextYearly, { amount: approx(y.next.yearly), monthly: formatMoneyShort(y.next.reserveMonthly, t.locale) })}
          </p>
        )}
        {y.next.budgets.length > 0 && (
          <div className="mt-4 pt-3 hairline-t">
            <h4 className="text-label font-semibold text-fg">{t.yearNextBudgets}</h4>
            <ul className="mt-1 space-y-1">
              {y.next.budgets.map(b => (
                <li key={b.category.id} className="min-h-[36px] flex items-baseline gap-2">
                  <span className="emoji text-[15px]" aria-hidden="true">{b.category.emoji}</span>
                  <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{name(b.category)}</span>
                  {b.current !== undefined && b.current !== b.amount && (
                    <span className="shrink-0 text-caption text-fg-mute line-through tabular-nums">{formatMoneyShort(b.current, t.locale)}</span>
                  )}
                  <span className="shrink-0 rounded-num text-label font-semibold text-fg">{formatMoneyShort(b.amount, t.locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Button variant="secondary" full onClick={() => onApplyBudgets(y.next.budgets)}>{t.yearApply}</Button>
            </div>
          </div>
        )}
      </Card>

      <section className="rounded-md bg-surface card-edge p-[16px] space-y-3">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{t.yearShowAmounts}</span>
          <Switch checked={amounts} onChange={setAmounts} label={t.yearShowAmounts} />
        </div>
        <p className="text-caption text-fg-mute wrap-prose">{t.yearShareNote}</p>
        <Button variant="primary" full icon={Share2} onClick={() => onShare(image())}>{t.yearShare}</Button>
      </section>
    </Screen>
  );
}
