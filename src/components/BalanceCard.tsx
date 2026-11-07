import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { MonthBalance } from '../logic';
import { formatMoney, monthLabel, monthLeft } from '../logic';
import { Strings, fmt, plural } from '../translations';
import { tapLight } from '../ui/haptics';
import { useCountUp } from '../ui/useCountUp';
import { CountingMoney } from '../ui/CountingMoney';

interface Props {
  balance: MonthBalance;
  t: Strings;
  /** Opens the opening-balance sheet. */
  onOpening: () => void;
}

/**
 * The card at the top of a month: the two numbers the app is opened for, on
 * the accent's gradient (the hero).
 *
 * On top, big, what is on the account now (only what is ticked as paid), with
 * a ring for how many of the month's bills are paid, and small beneath it
 * what was carried over. Below, the month in two columns, paid and still
 * pending — income and expenses — and beneath them what will
 * be left once everything pending is settled.
 */
export function BalanceCard({ balance: b, t, onOpening }: Props) {
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  // Open bills of earlier months still to settle, and everything open in all.
  const carryOpen = b.openingEnd - b.openingNow;
  // Income less expenses this month: ticked so far, and still pending.
  const left = monthLeft(b);
  const endLabel = b.openCount ? plural(b.openCount, t.afterPendingOne, t.afterPendingMany) : t.allSettled;
  const carryLabel = b.overridden
    ? t.carryManual
    : b.prevKey
      ? fmt(t.carryFrom, { month: b.prevKey.slice(0, 4) === b.key.slice(0, 4)
        // Same year: the month's name says it all ("aus Oktober").
        ? new Intl.DateTimeFormat(t.locale, { month: 'long' }).format(new Date(Number(b.prevKey.slice(0, 4)), Number(b.prevKey.slice(5, 7)) - 1, 1))
        : monthLabel(b.prevKey, t.locale, 'long') })
      : t.startingBalance;

  return (
    <section className="hero hero-glow rounded-lg overflow-hidden" aria-label={`${t.balanceNow}, ${t.afterPending}`}>
      <div className="ps-5 pe-4 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-on-hero-mute">{t.balanceNow}</p>
            <BigMoney cents={b.now} money={money} />
          </div>
          {b.expenseCount > 0 && (
            <PaidRing paid={b.expensePaidCount} total={b.expenseCount} label={fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })} />
          )}
        </div>
        {/* Where the month started from — a small frosted chip; tap to correct it. */}
        <button
          type="button"
          onClick={() => { tapLight(); onOpening(); }}
          className="mt-3 max-w-full hero-panel rounded-[14px] ps-3 pe-2 py-1.5 inline-flex items-center gap-1.5 text-caption text-start active:scale-[0.97] transition-transform duration-150 focus-visible:ring-focus"
        >
          <span className="min-w-0 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-on-hero-soft font-medium">{carryLabel}</span>
            <span className={`num font-semibold ${b.openingNow < 0 ? 'text-on-hero-neg' : 'text-on-hero'}`}>{money(b.openingNow)}</span>
            {carryOpen !== 0 && <span className="text-on-hero-warn font-medium tabular-nums">· {fmt(t.inclOpen, { amount: money(carryOpen) })}</span>}
          </span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-on-hero-soft rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Income and expenses, paid and still pending side by side, and what the
          month leaves over (both columns, without the carry-over); under them
          the balance once everything pending is settled. On a frosted panel,
          so the money colours read on any accent. */}
      <div className="mx-2 mb-2 rounded-md hero-panel px-3.5 pt-2.5 pb-3">
        <table className="w-full text-label">
          <thead>
            <tr className="text-caption text-on-hero-soft">
              <td />
              <th scope="col" className="ps-3 pb-1 text-end font-medium">{t.colPaid}</th>
              <th scope="col" className="ps-3 pb-1 text-end font-medium">{t.colOpen}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="py-1.5 text-start font-normal text-on-hero-mute">{t.income}</th>
              <MoneyCell text={money(b.incomePaid, 'exceptZero')} tone={b.incomePaid ? 'text-on-hero-pos' : 'text-on-hero-soft'} />
              <MoneyCell text={money(b.incomeOpen, 'exceptZero')} tone={b.incomeOpen ? 'text-on-hero-warn' : 'text-on-hero-soft'} />
            </tr>
            <tr>
              <th scope="row" className="py-1.5 text-start font-normal text-on-hero-mute">{t.expenses}</th>
              <MoneyCell text={money(b.expensePaid ? -b.expensePaid : 0)} tone={b.expensePaid ? 'text-on-hero' : 'text-on-hero-soft'} />
              <MoneyCell text={money(b.expenseOpen ? -b.expenseOpen : 0)} tone={b.expenseOpen ? 'text-on-hero-warn' : 'text-on-hero-soft'} />
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-on-hero/15">
              <th scope="row" className="pt-2.5 pb-1 text-start font-semibold text-on-hero">{t.leftThisMonth}</th>
              <MoneyCell strong text={money(left.paid, 'exceptZero')}
                tone={left.paid > 0 ? 'text-on-hero-pos' : left.paid < 0 ? 'text-on-hero-neg' : 'text-on-hero-soft'} />
              <MoneyCell strong text={money(left.open, 'exceptZero')} tone={left.open ? 'text-on-hero-warn' : 'text-on-hero-soft'} />
            </tr>
          </tfoot>
        </table>

        {/* Both columns together: what will be left once everything open is settled. */}
        <div className="mt-1.5 pt-2.5 border-t border-on-hero/15 flex items-end gap-3">
          <p className="min-w-0 flex-1 text-caption text-on-hero-mute wrap-prose tabular-nums">
            {b.count > 0 ? endLabel : null}
          </p>
          <p className={`rounded-num text-heading font-bold ${b.end < 0 ? 'text-on-hero-neg' : 'text-on-hero'}`}>
            <span className="sr-only">{`${b.count > 0 ? endLabel : t.afterPending}: ${money(b.end)}`}</span>
            <span aria-hidden="true"><span className="text-on-hero-soft font-semibold me-1">=</span><CountingMoney cents={b.end} money={money} /></span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** One amount in the paid / open table. */
function MoneyCell({ text, tone, strong }: { text: string; tone: string; strong?: boolean }) {
  return (
    <td className={`ps-3 text-end num whitespace-nowrap ${strong ? 'pt-2.5 pb-1 font-bold' : 'py-1.5 font-semibold'} ${tone}`}>{text}</td>
  );
}

/**
 * The balance, as large as it fits: the figure in SF Rounded, the currency
 * sign smaller and quieter beside it ("35.773,20 €", "€35,773.20"). It runs
 * to a new value rather than jumping; VoiceOver reads only the final one.
 */
function BigMoney({ cents, money }: { cents: number; money: (c: number) => string }) {
  const text = money(useCountUp(cents));
  const m = /^([^\d−-]*?)\s*([−-]?[\d.,\u00a0\u202f]*\d)\s*([^\d]*)$/.exec(text);
  const [before, figure, after] = m ? [m[1], m[2], m[3]] : ['', text, ''];
  const sign = 'text-[0.6em] font-semibold text-on-hero-mute';
  return (
    <p className="rounded-num font-bold mt-1 text-[clamp(32px,10vw,44px)] leading-[1.1] wrap-prose text-on-hero">
      <span className="sr-only">{money(cents)}</span>
      <span aria-hidden="true">
        {before && <span className={`${sign} me-1`}>{before}</span>}
        {figure}
        {after && <span className={`${sign} ms-1`}>{after}</span>}
      </span>
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
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="7" className="stroke-on-hero/25" />
        <motion.circle
          cx="30" cy="30" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          className="stroke-on-hero"
          style={{ opacity: ratio > 0 ? 1 : 0 }}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
        />
      </svg>
      {/* The count shrinks as it grows, so "25/29" stays inside the ring. */}
      <span
        className={`absolute inset-0 flex items-center justify-center rounded-num font-bold text-on-hero ${
          `${paid}/${total}`.length <= 3 ? 'text-caption' : `${paid}/${total}`.length <= 5 ? 'text-[11px]' : 'text-[9px]'}`}
        aria-hidden="true"
      >
        {paid}/{total}
      </span>
    </div>
  );
}
