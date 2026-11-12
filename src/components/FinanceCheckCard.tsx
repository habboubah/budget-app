import { CSSProperties, ReactNode, useState } from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { AppData, MonthKey } from '../types';
import { displayName, formatMoney, formatMoneyApprox, formatMoneyEstimate, formatPercent, monthLabel, monthSpanLabel } from '../logic';
import { FinanceCheck, MonthPoint, RESERVE_MAX, RESERVE_MIN, budgetRule, budgetSplit } from '../insights';
import { Strings, fmt } from '../translations';
import { Card } from '../ui/Card';
import { tapLight } from '../ui/haptics';
import { BUCKET_STYLE, BudgetSplitBar, RuleBar, SavingsRateChart } from './Charts';
import { Explain, ExplainButton } from './ExplainSheet';

/** The savings target of the 50/30/20 rule, also the line in the savings-rate chart. */
const SAVE_TARGET = 20;

type Status = 'ok' | 'watch' | 'late';

/** ✓ in green, ! in amber — red only for something overdue — and the state in words for VoiceOver. */
function Glyph({ status, t }: { status: Status; t: Strings }) {
  const word = status === 'ok' ? t.checkStatusOk : status === 'watch' ? t.checkStatusWatch : t.checkStatusLate;
  return (
    <span className={`w-7 h-7 rounded-full shrink-0 inline-flex items-center justify-center ${status === 'ok' ? 'bg-pos-dim text-pos' : status === 'watch' ? 'bg-warn-dim text-warn' : 'bg-neg-dim text-neg'}`}>
      {status === 'ok' ? <Check className="w-4 h-4" strokeWidth={3} aria-hidden="true" /> : <AlertCircle className="w-4 h-4" strokeWidth={2.6} aria-hidden="true" />}
      <span className="sr-only">{word}</span>
    </span>
  );
}

/** One row: the glyph, its name and sentence, the months it stands on; a tap opens its detail. */
function CheckRow({ status, name, line, basis, open, onToggle, children, t }: {
  status: Status;
  name: string;
  line: string;
  basis?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  t: Strings;
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { tapLight(); onToggle(); }}
        className="w-full min-h-tap px-4 py-3 flex items-start gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <Glyph status={status} t={t} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg wrap-compound">{name}</span>
          <span className="block text-label text-fg tabular-nums wrap-prose">{line}</span>
          {basis && <span className="block text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">{basis}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 mt-1 shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </li>
  );
}

/** 0–12 months; the recommended 3–6 marked on the track. */
function ReserveMeter({ months }: { months: number }) {
  const pct = (m: number) => `${(Math.min(m, 12) / 12) * 100}%`;
  return (
    <div className="relative mt-3 h-2 rounded-full bg-surface-2" aria-hidden="true">
      <div className="absolute inset-y-0 rounded-full bg-pos-dim" style={{ insetInlineStart: pct(RESERVE_MIN), width: `${((RESERVE_MAX - RESERVE_MIN) / 12) * 100}%` }} />
      <div className={`absolute inset-y-0 start-0 rounded-full ${months < RESERVE_MIN ? 'bg-warn' : 'bg-pos'}`} style={{ width: pct(months) }} />
      {[RESERVE_MIN, RESERVE_MAX].map(m => <div key={m} className="absolute -top-1 -bottom-1 w-px bg-fg-faint" style={{ insetInlineStart: pct(m) }} />)}
    </div>
  );
}

/** 50/30/20 over the same months: each part against its share, in euros, its biggest categories, month by month. */
function RuleBlock({ data, months, language, t, onMonth }: { data: AppData; months: MonthKey[]; language: string; t: Strings; onMonth: (m: MonthKey) => void }) {
  const { entries, categories } = data;
  const rule = budgetRule(entries, categories, months);
  const split = budgetSplit(entries, categories, months);
  const money = (c: number) => formatMoney(c, t.locale);
  if (rule.income <= 0) return null;
  return (
    <div className="mt-5 pt-4 hairline-t">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-label font-semibold text-fg tabular-nums wrap-prose">{t.splitTitle} · {fmt(t.splitMet, { n: rule.met })}</p>
        <span className="flex gap-1" aria-hidden="true">
          {rule.parts.map(p => <span key={p.bucket} className={`w-2.5 h-2.5 rounded-full ${p.ok ? 'bg-pos' : 'border-[1.75px] border-fg-faint'}`} />)}
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
          <p className="text-label text-fg tabular-nums">{fmt(t.splitMonths, { n: rule.months.filter(m => m.met === 3).length, total: rule.months.length })}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {rule.months.map(m => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => { tapLight(); onMonth(m.key); }}
                  aria-label={fmt(t.splitMonthMet, { month: monthLabel(m.key, t.locale), n: m.met })}
                  className="hit-44 h-9 ps-2.5 pe-3 rounded-full bg-surface-2 inline-flex items-center gap-1.5 text-caption font-semibold text-fg tabular-nums active:opacity-60 focus-visible:ring-focus"
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
    </div>
  );
}

/** The check in one line (Planen as headlines, plan 39): its first indicator — the share kept, and in how many months. */
export function checkHeadline(check: FinanceCheck, t: Strings): string {
  const { plus } = check;
  return plus.rate === null ? t.checkPlusNoIncome
    : fmt(t.checkPlusLine, { p: formatPercent(Math.round(plus.rate * 100), t.locale), n: plus.plusMonths, total: plus.months.length });
}

/**
 * *Finanz-Check* (§9.6, D4): three plain indicators instead of a score — more
 * in than out, bills on time, the reserve in months of Grundbedarf (D5) —
 * each with a glyph, a sentence and its months; a tap opens the detail (the
 * savings-rate chart and 50/30/20, the due list, the reserve meter).
 */
export function FinanceCheckCard({ check, points, data, language, t, onReport, onDue, onExplain }: {
  check: FinanceCheck;
  /** The months for the savings-rate chart (up to twelve, up to today). */
  points: MonthPoint[];
  data: AppData;
  language: string;
  t: Strings;
  onReport: (m: MonthKey) => void;
  onDue: () => void;
  onExplain: (e: Explain) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen(o => (o === id ? null : id));
  const money = (c: number) => formatMoney(c, t.locale);
  const { plus, onTime, reserve } = check;
  const span = monthSpanLabel(plus.months, t.locale);
  const ratePct = plus.rate === null ? null : Math.round(plus.rate * 100);
  const reserveShown = reserve ? Math.round(reserve.months * 10) / 10 : 0;
  const n1 = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 });
  const explainRate = (): Explain => ({
    title: t.savingsRateTitle,
    definition: t.explainRateDef,
    calc: ratePct === null ? [] : [fmt(t.explainRateCalc, { saved: money(plus.saved), income: money(plus.income), rate: formatPercent(ratePct, t.locale) })],
    months: fmt(t.explainMonths, { span }),
    excluded: t.explainKpiOut,
  });
  const explainReserve = (): Explain | null => reserve && ({
    title: t.checkReserve,
    definition: t.explainReserveDef,
    calc: [fmt(t.explainReserveCalc, { balance: formatMoneyEstimate(reserve.balance, t.locale), need: formatMoneyEstimate(reserve.grundbedarf.value, t.locale), n: n1.format(reserve.months) })],
    months: fmt(t.explainMonths, { span: monthSpanLabel(reserve.grundbedarf.months, t.locale) }),
    excluded: t.explainReserveOut,
  });
  return (
    <Card title={t.checkTitle} sub={span}>
      <ul className="-mx-4 -mb-4 divide-hairline-inset" style={{ '--sep': '56px' } as CSSProperties}>
        <CheckRow
          status={plus.ok ? 'ok' : 'watch'} t={t}
          name={t.checkPlus}
          line={ratePct === null ? t.checkPlusNoIncome : fmt(t.checkPlusLine, { p: formatPercent(ratePct, t.locale), n: plus.plusMonths, total: plus.months.length })}
          open={open === 'plus'} onToggle={() => toggle('plus')}
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className={`rounded-num text-[2.25rem] leading-none font-bold ${ratePct !== null && ratePct < 0 ? 'text-neg' : 'text-fg'}`}>{ratePct === null ? '–' : formatPercent(ratePct, t.locale)}</p>
            {ratePct !== null && (
              <p className={`text-label font-semibold tabular-nums ${ratePct >= SAVE_TARGET ? 'text-pos' : 'text-warn'}`}>
                {ratePct >= SAVE_TARGET ? fmt(t.savingsAbove, { p: SAVE_TARGET }) : fmt(t.savingsBelow, { d: SAVE_TARGET - ratePct, p: SAVE_TARGET })}
              </p>
            )}
            <span className="ms-auto"><ExplainButton name={t.savingsRateTitle} t={t} onClick={() => onExplain(explainRate())} /></span>
          </div>
          {points.length > 1 && (
            <div className="mt-4">
              <SavingsRateChart points={points} selected="" t={t} onPick={onReport} target={SAVE_TARGET} />
            </div>
          )}
          <RuleBlock data={data} months={plus.months} language={language} t={t} onMonth={onReport} />
        </CheckRow>
        <CheckRow
          status={onTime.ok ? 'ok' : 'late'} t={t}
          name={t.checkOnTime}
          line={onTime.ok ? t.checkOnTimeOk : fmt(t.checkOnTimeLate, { n: onTime.count, amount: formatMoneyApprox(onTime.sum, t.locale) })}
          open={open === 'due'} onToggle={() => toggle('due')}
        >
          <button
            type="button"
            onClick={() => { tapLight(); onDue(); }}
            className="-ms-1 h-tap px-1 rounded-sm text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus"
          >
            {t.checkDue}
          </button>
        </CheckRow>
        {reserve && (
          <CheckRow
            status={reserve.ok ? 'ok' : 'watch'} t={t}
            name={t.checkReserve}
            line={fmt(t.checkReserveLine, { n: n1.format(reserve.months) })}
            basis={monthSpanLabel(reserve.grundbedarf.months, t.locale)}
            open={open === 'reserve'} onToggle={() => toggle('reserve')}
          >
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-label text-fg tabular-nums wrap-prose">
                {fmt(t.checkReserveBody, { balance: formatMoneyEstimate(reserve.balance, t.locale), need: formatMoneyEstimate(reserve.grundbedarf.value, t.locale) })}
              </p>
              <ExplainButton name={t.checkReserve} t={t} onClick={() => { const e = explainReserve(); if (e) onExplain(e); }} />
            </div>
            <ReserveMeter months={reserveShown} />
            {/* Judged on the value shown: "6 Monate" must not read as "more than 6". */}
            <p className={`text-label font-semibold mt-2 ${reserveShown < RESERVE_MIN ? 'text-warn' : 'text-pos'}`}>
              {reserveShown < RESERVE_MIN ? t.reserveLow : reserveShown <= RESERVE_MAX ? t.reserveOk : t.reserveHigh}
            </p>
            <p className="text-caption text-fg-mute mt-1 wrap-prose">{t.checkReserveNote}</p>
          </CheckRow>
        )}
      </ul>
    </Card>
  );
}
