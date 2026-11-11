import { ChevronRight } from 'lucide-react';
import { dayLabel, formatMoney, formatMoneyWhole } from '../logic';
import { Runway } from '../insights';
import { Strings, fmt } from '../translations';
import { tapLight } from '../ui/haptics';
import { RunwayChart } from './Charts';
import { Explain, ExplainButton } from './ExplainSheet';
import { StatTiles } from './StatTiles';

/** The sentence over the chart: the lowest point of the days ahead, or the first day the account is below zero. */
export function runwayHeadline(r: Runway, t: Strings): string {
  const below = r.days.find(d => d.balance < 0);
  return below
    ? fmt(t.runwayNeg, { day: dayLabel(below.date, t.locale), amount: formatMoney(below.balance, t.locale) })
    : fmt(t.runwayLow, { amount: formatMoney(r.lowest.balance, t.locale), day: dayLabel(r.lowest.date, t.locale) });
}

/**
 * *Nächste 30 Tage* on Planen: the account day by day from today, from what
 * is entered and still open — each bill on its day, the salary on its — so
 * the lowest point before the next money comes in shows, which neither the
 * month's two balances nor the twelve-month Ausblick can say. Nothing is
 * estimated: everyday spending not entered yet is not in it, and the sub-line
 * says so. Three figures under the chart (what comes in, what goes out, the
 * last day's balance) and the way to *Demnächst fällig*. VoiceOver reads the headline and
 * steps through the weeks.
 */
export function RunwayCard({ runway: r, t, onDue, onExplain }: {
  runway: Runway;
  t: Strings;
  /** Push "Demnächst fällig". */
  onDue: () => void;
  onExplain: (e: Explain) => void;
}) {
  const money = (c: number) => formatMoney(c, t.locale);
  const whole = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoneyWhole(c, t.locale, sign);
  const day = (i: number) => dayLabel(r.days[i].date, t.locale);
  const last = r.days.length - 1;
  // Weeks as VoiceOver's steps; the days after the fourth week join it.
  const weeks = [0, 1, 2, 3].map(k => ({ from: k * 7, to: k === 3 ? last : k * 7 + 6 }));
  const groups = weeks.map(w => ({ ...w, label: `${day(w.from)} – ${day(w.to)}: ${money(r.days[w.to].balance)}` }));
  const negative = r.lowest.balance < 0;
  const explain = (): Explain => ({
    title: t.runwayTitle,
    definition: t.explainRunwayDef,
    calc: [fmt(t.explainRunwayCalc, { now: money(r.start), out: money(r.out), in: money(r.in), end: money(r.end), day: day(last) })],
    excluded: t.explainRunwayOut,
  });
  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="runway-title">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fg-mute">{t.runwayTitle}</p>
          <h3 id="runway-title" className={`display text-heading font-semibold tabular-nums wrap-prose ${negative ? 'text-neg' : 'text-fg'}`}>{runwayHeadline(r, t)}</h3>
          <p className="text-caption text-fg-mute mt-0.5 wrap-prose">{t.runwaySub}</p>
        </div>
        <ExplainButton name={t.runwayTitle} t={t} onClick={() => onExplain(explain())} />
      </div>
      <div className="mt-3"><RunwayChart runway={r} t={t} groups={groups} /></div>
      <StatTiles className="mt-3" items={[
        { label: t.income, value: whole(r.in, 'exceptZero') },
        { label: t.expenses, value: whole(-r.out, 'exceptZero') },
        { label: day(last), value: whole(r.end), tone: r.end < 0 ? 'neg' : undefined },
      ]} />
      <button
        type="button"
        onClick={() => { tapLight(); onDue(); }}
        className="mt-2 -mb-2 -mx-1 px-1 h-tap w-[calc(100%+0.5rem)] flex items-center gap-1 text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
      >
        <span className="flex-1 text-start">{t.dueTitle}</span>
        <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </section>
  );
}
