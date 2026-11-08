import { CSSProperties } from 'react';
import { Category } from '../types';
import { formatMoney, formatMoneyEstimate, monthLabel, monthSpanLabel } from '../logic';
import { Outlook, bigItems } from '../insights';
import { Strings, fmt } from '../translations';
import { Picture } from '../ui/Picture';
import { OutlookChart } from './Charts';
import { Explain, ExplainButton } from './ExplainSheet';

/** The sentence over the chart: where the account ends up, or the first month it gets tight or goes below zero. */
export function outlookHeadline(o: Outlook, t: Strings): string {
  const month = monthLabel(o.headline.month, t.locale, o.headline.kind === 'normal' ? 'long' : 'name');
  const amount = formatMoneyEstimate(o.headline.amount, t.locale);
  return fmt(o.headline.kind === 'neg' ? t.outlookNeg : o.headline.kind === 'warn' ? t.outlookWarn : t.outlookNormal, { month, amount });
}

/**
 * *Ausblick* on Planen (§9.5; replaces *Prognose*): the account at the end of
 * each of the next twelve months — a dashed line inside a band from pricey
 * to calm months, rounded, its basis named — and the big items coming up
 * (yearly bills, entries already planned).
 */
export function OutlookCard({ outlook: o, categories, t, onExplain }: {
  outlook: Outlook;
  categories: Category[];
  t: Strings;
  onExplain: (e: Explain) => void;
}) {
  const est = (c: number) => formatMoneyEstimate(c, t.locale);
  const end = o.months[o.months.length - 1];
  const items = bigItems(o).slice(0, 5);
  const byId = new Map(categories.map(c => [c.id, c]));
  const tone = o.headline.kind === 'neg' ? 'text-neg' : o.headline.kind === 'warn' ? 'text-warn' : 'text-fg';
  const firstOpen = o.months.find(m => !m.started) ?? o.months[0];
  const explain = (): Explain => ({
    title: t.outlookTitle,
    definition: t.explainOutlookDef,
    calc: [fmt(t.explainOutlookCalc, {
      start: est(o.from.end), fixed: formatMoney(firstOpen?.fixed ?? 0, t.locale, 'exceptZero'), everyday: formatMoney(o.everyday.mid, t.locale, 'exceptZero'),
    })],
    months: fmt(t.explainMonths, { span: monthSpanLabel(o.basis, t.locale) }),
    excluded: t.explainOutlookOut,
  });
  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="outlook-title">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fg-mute">{t.outlookTitle}</p>
          <h3 id="outlook-title" className={`display text-heading font-semibold tabular-nums wrap-prose ${tone}`}>{outlookHeadline(o, t)}</h3>
          <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">{fmt(t.outlookSub, { span: monthSpanLabel(o.basis, t.locale) })}</p>
        </div>
        <ExplainButton name={t.outlookTitle} t={t} onClick={() => onExplain(explain())} />
      </div>
      <div className="mt-3"><OutlookChart outlook={o} t={t} /></div>
      {(o.ranged || items.length > 0) && end && (
        <p className="text-caption text-fg-mute mt-1 tabular-nums wrap-prose">
          {[o.ranged ? fmt(t.outlookBand, { lo: est(end.lo), hi: est(end.hi) }) : null, items.length ? t.outlookDots : null].filter(Boolean).join(' · ')}
        </p>
      )}
      {items.length > 0 && (
        <div className="mt-4 pt-3 hairline-t">
          <h4 className="text-label font-semibold text-fg">{t.outlookBig}</h4>
          <ul className="mt-1 -mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {items.map(i => {
              const c = byId.get(i.categoryId);
              return (
                <li key={`${i.month}-${i.name}`} className="min-h-tap px-4 py-2.5 flex items-center gap-3">
                  <Picture emoji={c?.emoji} name={i.name} hue={c?.hue} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-fg wrap-compound">{i.name}</span>
                    <span className="block text-caption text-fg-mute tabular-nums">
                      {monthLabel(i.month, t.locale)} · {i.kind === 'yearly' ? t.outlookYearly : t.outlookPlanned}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-num text-body font-semibold text-fg">{formatMoney(i.amount, t.locale)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
