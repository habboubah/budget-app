import { monthlyLimit } from '../budgets';
import { perShort } from '../repeatLabel';
import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import {
  dayLabel, displayName, formatMoney, formatMoneyApprox, formatMoneyShort, formatPercent, monthKeyOf, monthLabel, monthSpanLabel,
} from '../logic';
import { Book, categoryDetail } from '../insights';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { CategoryTrendChart } from './Charts';

interface Props {
  book: Book;
  categoryId: string;
  /** Statistik's period: the months in view. */
  months: MonthKey[];
  language: string;
  t: Strings;
  onBack: () => void;
  onBudget: (c: Category) => void;
  onEntry: (e: Entry) => void;
  onPayee: (key: string) => void;
  onContracts: () => void;
}

/** A section of the screen: a heading over a white card of rows. */
function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="px-[16px] pb-1.5 flex items-end gap-2">
        <h2 className="min-w-0 flex-1 eyebrow text-fg-mute wrap-compound">{title}</h2>
        {action}
      </div>
      <div className="rounded-md bg-surface card-edge overflow-hidden">{children}</div>
    </section>
  );
}

/** Payees shown before "Alle (n)". */
const PAYEES = 8;

/**
 * One category (§9.4), pushed from *Wofür das Geld geht*, a hint or the
 * budget sheet: its headline (the trend, or its average and share), its
 * months as the same chart as before with the Ø and the budget dashed, three
 * tiles (so far, Ø, the year), the budget, where its money goes, its biggest
 * entries and its fixed costs. Sections without content are left out.
 */
export function CategoryView({ book, categoryId, months, language, t, onBack, onBudget, onEntry, onPayee, onContracts }: Props) {
  const today = new Date();
  const d = useMemo(() => categoryDetail(book, categoryId, months, today), [book, categoryId, months]);
  const [allPayees, setAllPayees] = useState(false);
  if (!d) {
    return (
      <Screen title={t.categories} onBack={onBack} backLabel={t.back} tabbed>
        <Empty emoji="🗂️" title={t.catEmpty} />
      </Screen>
    );
  }
  const c = d.category;
  const name = displayName(c.names, language);
  const money = (x: number) => formatMoney(x, t.locale);
  const approx = (x: number) => formatMoneyApprox(x, t.locale);
  const now = monthKeyOf(today);
  const part = d.part === 'income' ? t.income : d.part === 'need' ? t.budgetNeed : d.part === 'want' ? t.budgetWant : t.budgetSave;
  const enough = d.finished.length >= 2;
  const headline = d.trend && d.trendSince
    ? fmt(d.trend.diff > 0 ? t.catTrendUp : t.catTrendDown, { month: monthLabel(d.trendSince, t.locale, 'name'), diff: approx(Math.abs(d.trend.diff)) })
    : d.share !== null && enough
      ? fmt(d.part === 'income' ? t.catAverageIncome : t.catAverage, { amount: approx(d.average), share: formatPercent(Math.round(d.share * 100), t.locale) })
      : fmt(t.catAveragePlain, { amount: approx(d.average) });
  const values = new Map([...d.values].map(([k, v]) => [k, v.total]));
  const open = new Map([...d.values].map(([k, v]) => [k, v.open]));
  const spending = c.kind === 'expense' && d.part !== 'save';
  const payees = allPayees ? d.payees : d.payees.slice(0, PAYEES);
  const tiles = [
    { label: fmt(t.catSoFar, { month: monthLabel(now, t.locale, 'name') }), value: money(d.soFar) },
    { label: t.catAvgTile, value: approx(d.average) },
    { label: fmt(t.catYearTile, { year: now.slice(0, 4) }), value: approx(d.yearToDate) },
  ];
  const nothing = !d.months.some(k => (d.values.get(k)?.total ?? 0) > 0);

  return (
    <Screen
      title={name}
      eyebrow={`${part} · ${monthSpanLabel(d.months, t.locale)}`}
      leading={<Picture emoji={c.emoji} name={name} hue={c.hue} size="lg" />}
      onBack={onBack} backLabel={t.back} tabbed
    >
      {nothing ? (
        <Empty emoji={c.emoji || '🗂️'} title={t.catEmpty} />
      ) : (
        <>
          <section className="rounded-md bg-surface card-edge p-[16px]">
            <h2 className={`display text-heading font-semibold tabular-nums wrap-prose ${d.trend ? (d.trend.diff > 0 ? 'text-warn' : 'text-pos') : 'text-fg'}`}>{headline}</h2>
            <p className="text-caption text-fg-mute mt-0.5 wrap-prose">{t.catChartSub}</p>
            <div className="mt-3">
              <CategoryTrendChart
                category={c} values={values} open={open} months={d.months} language={language} t={t}
                average={enough ? d.average : undefined} limit={spending ? monthlyLimit(c) : undefined}
              />
            </div>
          </section>

          <section>
            <dl className="flex flex-wrap gap-2">
              {tiles.map(x => (
                <div key={x.label} className="flex-1 basis-[6.5rem] min-w-0 flex flex-col justify-between rounded-md bg-surface card-edge px-3 py-2.5">
                  <dt className="text-caption text-fg-mute wrap-compound">{x.label}</dt>
                  <dd className="mt-0.5 rounded-num text-heading font-semibold text-fg">{x.value}</dd>
                </div>
              ))}
            </dl>
            {d.lastYear !== null && (
              <p className="text-caption text-fg-mute mt-2 px-1 tabular-nums wrap-prose">
                {fmt(t.catLastYear, { year: String(Number(now.slice(0, 4)) - 1), amount: approx(d.lastYear) })}
              </p>
            )}
          </section>

          {spending && (
            <button
              type="button"
              onClick={() => { tapLight(); onBudget(c); }}
              className="w-full min-h-[52px] rounded-md bg-surface card-edge px-4 py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <span className="min-w-0 flex-1">
                {d.budget ? (
                  <span className="block text-body text-fg tabular-nums wrap-prose">
                    {d.budget.months
                      ? fmt(t.catBudgetKept, { amount: formatMoneyShort(d.budget.limit, t.locale), n: d.budget.kept, total: d.budget.months })
                      : fmt(t.catBudgetNoMonths, { amount: formatMoneyShort(d.budget.limit, t.locale) })}
                  </span>
                ) : (
                  <>
                    <span className="block text-body text-accent">{t.catBudgetSet}</span>
                    {d.suggestion && <span className="block text-caption text-fg-mute tabular-nums">{fmt(t.catBudgetSuggest, { amount: formatMoneyShort(d.suggestion.amount, t.locale) })}</span>}
                  </>
                )}
              </span>
              {d.budget && <span className="shrink-0 text-label font-semibold text-accent">{t.catBudgetChange}</span>}
              <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}

          {d.payees.length > 0 && (
            <Section
              title={t.catPayees}
              action={!allPayees && d.payees.length > PAYEES && (
                <button type="button" onClick={() => { tapLight(); setAllPayees(true); }}
                  className="-my-3 -me-2 h-tap px-2 text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm">
                  {fmt(t.allPayees, { n: d.payees.length })}
                </button>
              )}
            >
              <ul className="divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
                {payees.map(p => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => { tapLight(); onPayee(p.key); }}
                      className="w-full min-h-tap px-4 py-2.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-body text-fg wrap-compound">{p.name}</span>
                        <span className="block text-caption text-fg-mute tabular-nums">{fmt(t.catPayeeLine, { n: p.count, amount: approx(p.average) })}</span>
                      </span>
                      <span className="shrink-0 rounded-num text-body font-semibold text-fg">{money(p.total)}</span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.biggest.length > 0 && (
            <Section title={t.catBiggest}>
              <ul className="divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
                {d.biggest.map(e => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => { tapLight(); onEntry(e); }}
                      className="w-full min-h-tap px-4 py-2.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-body text-fg wrap-compound">{e.name}</span>
                        <span className="block text-caption text-fg-mute tabular-nums">
                          {e.date ? `${dayLabel(e.date, t.locale)} ${e.month.slice(0, 4)}` : monthLabel(e.month, t.locale)}
                          {!e.paid && ` · ${t.open}`}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-num text-body font-semibold ${e.paid ? 'text-fg' : 'text-fg-mute'}`}>{money(e.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.fixed.length > 0 && (
            <Section title={t.catFixed}>
              <ul className="divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
                {d.fixed.map(e => (
                  <li key={e.seriesId} className="min-h-tap px-4 py-2.5 flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{e.name}</span>
                    <span className="shrink-0 text-caption text-fg-mute">{perShort(t, e)}</span>
                    <span className="shrink-0 rounded-num text-body font-semibold text-fg">{money(e.amount)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => { tapLight(); onContracts(); }}
                className="w-full min-h-tap px-4 flex items-center gap-2 hairline-t text-label font-semibold text-accent active:bg-surface-2 transition-colors focus-visible:ring-focus"
              >
                <span className="flex-1 text-start">{t.catFixedLink}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
              </button>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}
