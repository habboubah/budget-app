import { ChevronRight } from 'lucide-react';
import { Category } from '../types';
import { addMonths, dayLabel, displayName, formatMoney, formatMoneyApprox, formatMoneyEstimate, formatPercent, monthLabel, monthSpanLabel } from '../logic';
import { Pace } from '../insights';
import { Strings, fmt } from '../translations';
import { tapLight } from '../ui/haptics';
import { PaceChart, ShareBar } from './Charts';
import { Explain, ExplainButton } from './ExplainSheet';

/** The headline's ink: amber when faster than usual, green when slower, plain otherwise. */
const TONE = { above: 'text-warn', below: 'text-pos' } as const;

/** The sentence at the top of the card (§9.1's table). */
export function paceHeadline(p: Pace, t: Strings): string {
  const money = (c: number) => formatMoneyApprox(Math.abs(c), t.locale);
  const day = dayLabel(`${p.month}-${String(p.day).padStart(2, '0')}`, t.locale);
  switch (p.verdict) {
    case 'none': return fmt(t.paceNone, { amount: money(p.spent) });
    case 'early': return fmt(t.paceEarly, { amount: money(p.spent) });
    case 'stale': return fmt(t.paceStale, { n: p.staleDays });
    case 'within': return t.paceWithin;
    case 'below': return fmt(t.paceBelow, { amount: money(p.diff), day });
    case 'above': return fmt(t.paceAbove, { amount: money(p.diff), day });
  }
}

/**
 * *November bis heute* on top of Planen: everyday spending so far against a
 * usual month at the same day, where it would end, and where it goes this
 * month — with *Monatsbericht ›* for the whole story. Fixed costs stay out
 * (D3). VoiceOver reads the headline and the three figures, then steps
 * through the weeks; *Als Tabelle* has every week's values.
 */
export function PaceCard({ pace: p, categories, language, t, onReport, onExplain }: {
  pace: Pace;
  categories: Category[];
  language: string;
  t: Strings;
  onReport: () => void;
  onExplain: (e: Explain) => void;
}) {
  const monthName = monthLabel(p.month, t.locale, 'name');
  const money = (c: number) => formatMoney(c, t.locale);
  const est = (c: number) => formatMoneyEstimate(c, t.locale);
  const headline = paceHeadline(p, t);
  const day = (d: number) => dayLabel(`${p.month}-${String(d).padStart(2, '0')}`, t.locale);
  const today = p.day - 1;
  const proj = (i: number) => (p.usual && p.usualToday !== null ? p.spent + p.usual[i] - p.usualToday : null);
  const at = (i: number) => (i <= today ? money(p.actual[i]) : proj(i) !== null ? `≈ ${est(proj(i)!)}` : '–');
  // Four weeks; the days after the 28th join the fourth, so no target is narrower than a week (44 pt).
  const weeks = [0, 1, 2, 3].map(k => ({ from: k * 7, to: k === 3 ? p.days - 1 : k * 7 + 6 }));
  const groups = weeks.map((w, k) => ({
    ...w,
    label: fmt(t.paceWeekAria, {
      n: k + 1, from: day(w.from + 1), to: day(w.to + 1), month: monthName,
      spent: at(w.from <= today && today < w.to ? today : w.to), usual: p.usual ? money(p.usual[w.to]) : '–',
    }),
  }));
  const summary = p.usual && p.usualToday !== null && p.projected !== null
    ? fmt(t.paceAria, { headline, spent: money(p.spent), day: day(p.day), usual: money(p.usualToday), projected: est(p.projected) })
    : fmt(t.paceAriaNone, { headline, spent: money(p.spent) });
  const byId = new Map(categories.map(c => [c.id, c]));
  const shares = p.shares.slice(0, 3).map(s => {
    const c = byId.get(s.categoryId);
    return `${c ? displayName(c.names, language) : ''} ${formatPercent(Math.round((s.amount / Math.max(1, p.spent)) * 100), t.locale)}`;
  });
  const explain = (): Explain => ({
    title: fmt(t.paceEyebrow, { month: monthName }),
    definition: p.method === 'linear' ? t.explainPaceDefLinear : t.explainPaceDef,
    calc: p.usual && p.usualToday !== null && p.usualTotal !== null && p.projected !== null ? [
      fmt(t.explainPaceCalc, { spent: money(p.spent), day: day(p.day), usual: money(p.usualToday) }),
      fmt(t.explainPaceProj, { spent: money(p.spent), usualEnd: money(p.usualTotal), usualToday: money(p.usualToday), projected: est(p.projected) }),
    ] : [fmt(t.paceAriaNone, { headline: monthName, spent: money(p.spent) })],
    ...(p.basis.length ? { months: fmt(t.explainMonths, { span: monthSpanLabel(p.basis, t.locale) }) } : {}),
    excluded: t.explainPaceOut,
  });
  const tone = p.verdict === 'above' || p.verdict === 'below' ? TONE[p.verdict] : 'text-fg';

  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="pace-title">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fg-mute">{fmt(t.paceEyebrow, { month: monthName })}</p>
          <h3 id="pace-title" className={`display text-heading font-semibold tabular-nums wrap-prose ${tone}`}>{headline}</h3>
          <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">
            {p.verdict === 'none' ? t.paceSubNone : fmt(t.paceSub, { span: monthSpanLabel(p.basis, t.locale) })}
            {p.basis.length === 1 && ` · ${t.paceBasisOne}`}
          </p>
        </div>
        <ExplainButton name={fmt(t.paceEyebrow, { month: monthName })} t={t} onClick={() => onExplain(explain())} />
      </div>
      <p className="sr-only">{summary}</p>
      <div className="mt-3">
        <PaceChart pace={p} now={monthName} t={t} groups={groups} />
      </div>
      {p.verdict === 'none' && (
        <p className="text-caption text-fg-mute mt-2 wrap-prose">{fmt(t.paceNoneBody, { month: monthLabel(addMonths(p.month, 1), t.locale, 'name') })}</p>
      )}
      {p.method === 'linear' && <p className="text-caption text-fg-mute mt-2 wrap-prose">{t.paceLinearNote}</p>}
      {p.shares.length > 0 && (
        <div className="mt-4">
          <ShareBar
            label={shares.join(', ')}
            items={p.shares.map(s => ({ key: s.categoryId, hue: byId.get(s.categoryId)?.hue, value: s.amount }))}
          />
          <p className="mt-1.5 text-caption text-fg-mute tabular-nums wrap-prose" aria-hidden="true">{shares.join(' · ')}</p>
        </div>
      )}
      <details className="mt-3 group">
        <summary className="min-h-tap -mx-1 px-1 flex items-center gap-2 text-label font-semibold text-accent cursor-pointer list-none focus-visible:ring-focus rounded-sm">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 rtl:rotate-180" aria-hidden="true" />
          {t.showTable}
        </summary>
        <table className="w-full text-caption tabular-nums">
          <thead className="text-fg-mute">
            <tr>
              <th className="text-start font-semibold py-1.5 pe-2">{fmt(t.paceWeek, { n: '' }).trim()}</th>
              <th className="text-end font-semibold py-1.5 px-2">{monthName}</th>
              <th className="text-end font-semibold py-1.5 ps-2">{t.paceColUsual}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, k) => (
              <tr key={k} className="hairline-t">
                <td className="py-1.5 pe-2 text-fg whitespace-nowrap">{`${day(w.from + 1)} – ${day(w.to + 1)}`}</td>
                <td className="py-1.5 px-2 text-end text-fg whitespace-nowrap">{at(w.from <= today && today < w.to ? today : w.to)}</td>
                <td className="py-1.5 ps-2 text-end text-fg whitespace-nowrap">{p.usual ? money(p.usual[w.to]) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <button
        type="button"
        onClick={() => { tapLight(); onReport(); }}
        className="mt-1 -mb-2 -mx-1 px-1 h-tap w-[calc(100%+0.5rem)] flex items-center gap-1 text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
      >
        <span className="flex-1 text-start">{t.reportTitle}</span>
        <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </section>
  );
}
