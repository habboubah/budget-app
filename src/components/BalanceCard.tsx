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
 * The dark card at the top of a month: the two numbers the app is opened for.
 * "Jetzt" counts only what is ticked as paid; "Monatsende" also counts what is
 * still open. Below them, how far the month's bills are paid, and the three
 * numbers that explain the end balance: carry-over, income, expenses.
 */
export function BalanceCard({ balance: b, t, onOpening }: Props) {
  const money = (c: number, sign: 'auto' | 'always' = 'auto') => formatMoney(c, t.locale, sign);
  const income = b.incomePaid + b.incomeOpen;
  const expenses = b.expensePaid + b.expenseOpen;
  const ratio = b.expenseCount ? b.expensePaidCount / b.expenseCount : 0;
  const carryLabel = b.overridden
    ? t.carryManual
    : b.prevKey
      ? fmt(t.carryFrom, { month: monthLabel(b.prevKey, t.locale, 'month') })
      : t.startingBalance;

  return (
    <section className="rounded-lg bg-hero text-hero-ink p-5 shadow-e2" aria-label={`${t.balanceNow}, ${t.balanceEnd}`}>
      <p className="eyebrow text-hero-mute">{t.balanceNow}</p>
      <p className={`display text-display font-bold num mt-2 wrap-prose ${b.now < 0 ? 'text-hero-neg' : ''}`}>{money(b.now)}</p>

      <div className="mt-5 flex items-end justify-between gap-x-4 gap-y-1 flex-wrap">
        <div className="min-w-0">
          <p className="eyebrow text-hero-mute">{t.balanceEnd}</p>
          <p className="text-caption text-hero-mute mt-1 wrap-prose">
            {b.openCount ? plural(b.openCount, t.afterOpenOne, t.afterOpenMany) : t.allSettled}
          </p>
        </div>
        <p className={`display text-heading font-bold num ${b.end < 0 ? 'text-hero-neg' : ''}`}>{money(b.end)}</p>
      </div>

      {b.expenseCount > 0 && (
        <div className="mt-4">
          <div
            className="h-2 rounded-full bg-hero-track overflow-hidden" role="progressbar"
            aria-valuemin={0} aria-valuemax={b.expenseCount} aria-valuenow={b.expensePaidCount}
            aria-label={fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })}
          >
            <motion.div
              className="h-full rounded-full bg-hero-bar"
              initial={false}
              animate={{ width: `${Math.round(ratio * 100)}%` }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            />
          </div>
          <p className="text-caption text-hero-mute mt-1.5">
            {fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })}
          </p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-hero-track grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => { tapLight(); onOpening(); }}
          className="min-w-0 -mx-2 -my-1 px-2 py-1 rounded-sm text-start active:bg-hero-track transition-colors focus-visible:ring-focus"
        >
          <span className="flex items-center gap-0.5 text-caption text-hero-mute wrap-compound">
            <span className="min-w-0">{carryLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
          </span>
          <span className={`block text-label font-bold num mt-0.5 ${b.openingNow < 0 ? 'text-hero-neg' : ''}`}>{money(b.openingNow)}</span>
        </button>
        <div className="min-w-0">
          <span className="block text-caption text-hero-mute">{t.income}</span>
          <span className="block text-label font-bold num mt-0.5 text-hero-pos">{money(income, 'always')}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-caption text-hero-mute">{t.expenses}</span>
          <span className="block text-label font-bold num mt-0.5">{money(-expenses)}</span>
        </div>
      </div>
    </section>
  );
}
