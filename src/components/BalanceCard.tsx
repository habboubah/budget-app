import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { MonthBalance } from '../logic';
import { formatMoney, monthLabel } from '../logic';
import { Strings, fmt, plural } from '../translations';
import { tapLight } from '../ui/haptics';

interface Props {
  balance: MonthBalance;
  t: Strings;
  /** Opens the opening-balance sheet. */
  onOpening: () => void;
}

/**
 * The card at the top of a month: the two numbers the app is opened for.
 *
 * On top, big, what is on the account now (only what is ticked as paid), with
 * a ring for how many of the month's bills are paid. Below it the month reads
 * like a sum on paper — carry-over, plus income, minus expenses — down to the
 * result: what will be left at the end of the month once everything open is
 * settled.
 */
export function BalanceCard({ balance: b, t, onOpening }: Props) {
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  const income = b.incomePaid + b.incomeOpen;
  const expenses = b.expensePaid + b.expenseOpen;
  const carryLabel = b.overridden
    ? t.carryManual
    : b.prevKey
      ? fmt(t.carryFrom, { month: b.prevKey.slice(0, 4) === b.key.slice(0, 4)
        // Same year: the month's name says it all ("aus Oktober").
        ? new Intl.DateTimeFormat(t.locale, { month: 'long' }).format(new Date(Number(b.prevKey.slice(0, 4)), Number(b.prevKey.slice(5, 7)) - 1, 1))
        : monthLabel(b.prevKey, t.locale, 'long') })
      : t.startingBalance;

  return (
    <section className="rounded-lg bg-surface card-edge overflow-hidden" aria-label={`${t.balanceNow}, ${t.balanceEnd}`}>
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fg-mute">{t.balanceNow}</p>
          <BigMoney text={money(b.now)} negative={b.now < 0} />
        </div>
        {b.expenseCount > 0 && (
          <PaidRing paid={b.expensePaidCount} total={b.expenseCount} label={fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })} />
        )}
      </div>

      {/* The sum behind "Monatsende": carry-over + income − expenses = end. */}
      <div className="mx-5 hairline-t" />
      <button
        type="button"
        onClick={() => { tapLight(); onOpening(); }}
        className="w-full px-5 min-h-[46px] flex items-center gap-2 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="min-w-0 flex-1 text-label text-fg-mute wrap-prose">{carryLabel}</span>
        <span className={`text-label font-semibold num ${b.openingNow < 0 ? 'text-neg' : 'text-fg'}`}>{money(b.openingNow)}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" aria-hidden="true" />
      </button>
      <div className="px-5 pb-1">
        <div className="min-h-[34px] flex items-center gap-2">
          <span className="min-w-0 flex-1 text-label text-fg-mute">{t.income}</span>
          <span className="text-label font-semibold num text-pos me-6">{money(income, 'exceptZero')}</span>
        </div>
        <div className="min-h-[34px] flex items-center gap-2">
          <span className="min-w-0 flex-1 text-label text-fg-mute">{t.expenses}</span>
          <span className="text-label font-semibold num text-fg me-6">{money(expenses ? -expenses : 0)}</span>
        </div>
      </div>

      <div className="mx-5 hairline-t" />
      <div className="px-5 pt-3 pb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-fg">{t.balanceEnd}</p>
          {b.count > 0 && (
            <p className={`text-caption mt-0.5 wrap-prose ${b.openCount ? 'text-warn' : 'text-fg-mute'}`}>
              {b.openCount ? plural(b.openCount, t.afterOpenOne, t.afterOpenMany) : t.allSettled}
            </p>
          )}
        </div>
        <p className={`rounded-num text-heading font-bold me-6 ${b.end < 0 ? 'text-neg' : 'text-fg'}`}>{money(b.end)}</p>
      </div>
    </section>
  );
}

/**
 * The balance, as large as it fits: the figure in SF Rounded, the currency
 * sign smaller and quieter beside it ("35.773,20 €", "€35,773.20").
 */
function BigMoney({ text, negative }: { text: string; negative: boolean }) {
  const m = /^([^\d−-]*?)\s*([−-]?[\d.,\u00a0\u202f]*\d)\s*([^\d]*)$/.exec(text);
  const [before, figure, after] = m ? [m[1], m[2], m[3]] : ['', text, ''];
  const sign = 'text-[0.6em] font-semibold text-fg-mute';
  return (
    <p className={`rounded-num font-bold mt-1 text-[clamp(30px,9.5vw,42px)] leading-[1.1] wrap-prose ${negative ? 'text-neg' : 'text-fg'}`}>
      {before && <span className={`${sign} me-1`}>{before}</span>}
      {figure}
      {after && <span className={`${sign} ms-1`}>{after}</span>}
    </p>
  );
}

/** Apple-Fitness-style ring: how many of the month's bills are paid. */
function PaidRing({ paid, total, label }: { paid: number; total: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const ratio = total ? paid / total : 0;
  return (
    <div
      className="shrink-0 relative w-[60px] h-[60px]"
      role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={paid} aria-label={label} title={label}
    >
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="7" className="stroke-surface-2" />
        <motion.circle
          cx="30" cy="30" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          className="stroke-accent-fill"
          style={{ opacity: ratio > 0 ? 1 : 0 }}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center rounded-num text-caption font-bold text-fg" aria-hidden="true">
        {paid}/{total}
      </span>
    </div>
  );
}
