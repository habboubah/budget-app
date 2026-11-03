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
 * a ring for how many of the month's bills are paid, and small beneath it
 * what was carried over. Below, the month in two columns, paid and still open
 * — income, expenses, down to the month end — and the two together: what will
 * be left once everything open is settled.
 */
export function BalanceCard({ balance: b, t, onOpening }: Props) {
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  // Open bills of earlier months still to settle, and everything open in all.
  const carryOpen = b.openingEnd - b.openingNow;
  const endOpen = b.end - b.now;
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
          {/* Where the month started from — small, in the accent, tap to correct it. */}
          <button
            type="button"
            onClick={() => { tapLight(); onOpening(); }}
            className="mt-1.5 -mx-1 px-1 rounded-sm inline-flex flex-wrap items-center gap-x-1.5 text-caption text-start active:opacity-60 focus-visible:ring-focus"
          >
            <span className="text-accent font-medium">{carryLabel}</span>
            <span className={`num font-semibold ${b.openingNow < 0 ? 'text-neg' : 'text-accent'}`}>{money(b.openingNow)}</span>
            {carryOpen !== 0 && <span className="text-warn font-medium tabular-nums">· {fmt(t.inclOpen, { amount: money(carryOpen) })}</span>}
            <ChevronRight className="w-3.5 h-3.5 text-accent rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        {b.expenseCount > 0 && (
          <PaidRing paid={b.expensePaidCount} total={b.expenseCount} label={fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })} />
        )}
      </div>

      {/* Income and expenses, paid and still open side by side, down to the
          month end in both columns (with the carry-over above); both together
          make the month-end balance. */}
      <div className="mx-5 hairline-t" />
      <div className="px-5 pt-2.5">
        <table className="w-full text-label">
          <thead>
            <tr className="text-caption text-fg-mute">
              <td />
              <th scope="col" className="ps-3 pb-1 text-end font-medium">{t.colPaid}</th>
              <th scope="col" className="ps-3 pb-1 text-end font-medium">{t.colOpen}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="py-1.5 text-start font-normal text-fg-mute">{t.income}</th>
              <MoneyCell text={money(b.incomePaid, 'exceptZero')} tone={b.incomePaid ? 'text-pos' : 'text-fg-mute'} />
              <MoneyCell text={money(b.incomeOpen, 'exceptZero')} tone={b.incomeOpen ? 'text-warn' : 'text-fg-mute'} />
            </tr>
            <tr>
              <th scope="row" className="py-1.5 text-start font-normal text-fg-mute">{t.expenses}</th>
              <MoneyCell text={money(b.expensePaid ? -b.expensePaid : 0)} tone={b.expensePaid ? 'text-fg' : 'text-fg-mute'} />
              <MoneyCell text={money(b.expenseOpen ? -b.expenseOpen : 0)} tone={b.expenseOpen ? 'text-warn' : 'text-fg-mute'} />
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-hairline">
              <th scope="row" className="pt-2.5 pb-1.5 text-start font-semibold text-fg">{t.balanceEnd}</th>
              <MoneyCell text={money(b.now)} tone={b.now < 0 ? 'text-neg' : 'text-fg'} strong />
              <MoneyCell text={money(endOpen, 'exceptZero')} tone={endOpen ? 'text-warn' : 'text-fg-mute'} strong />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Both columns together: what will be left once everything open is settled. */}
      <div className="px-5 pt-1 pb-4 flex items-end gap-3">
        <p className={`min-w-0 flex-1 text-caption wrap-prose ${b.openCount ? 'text-warn' : 'text-fg-mute'}`}>
          {b.count > 0 ? (b.openCount ? plural(b.openCount, t.afterOpenOne, t.afterOpenMany) : t.allSettled) : null}
        </p>
        <p className={`rounded-num text-heading font-bold ${b.end < 0 ? 'text-neg' : 'text-fg'}`} aria-label={`${t.balanceEnd}: ${money(b.end)}`}>
          <span className="text-fg-faint font-semibold me-1" aria-hidden="true">=</span>{money(b.end)}
        </p>
      </div>
    </section>
  );
}

/** One amount in the paid / open table. */
function MoneyCell({ text, tone, strong }: { text: string; tone: string; strong?: boolean }) {
  return (
    <td className={`ps-3 text-end num whitespace-nowrap ${strong ? 'pt-2.5 pb-1.5 font-bold' : 'py-1.5 font-semibold'} ${tone}`}>{text}</td>
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
      {/* The count shrinks as it grows, so "25/29" stays inside the ring. */}
      <span
        className={`absolute inset-0 flex items-center justify-center rounded-num font-bold text-fg ${
          `${paid}/${total}`.length <= 3 ? 'text-caption' : `${paid}/${total}`.length <= 5 ? 'text-[11px]' : 'text-[9px]'}`}
        aria-hidden="true"
      >
        {paid}/{total}
      </span>
    </div>
  );
}
