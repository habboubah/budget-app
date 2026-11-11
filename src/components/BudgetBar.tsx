import { motion } from 'motion/react';
import { BudgetStatus } from '../budgets';

/**
 * A budget as a bar, in the category's colour: what is paid solid, what is
 * still open lighter beyond it, against the whole budget; over it, the whole
 * bar turns red. In the running month a thin tick marks how far the month
 * has come — spending to the left of it is on pace. Decorative: the words
 * beside it say the same.
 */
export function BudgetBar({ status, className = '' }: { status: BudgetStatus; className?: string }) {
  const share = (c: number) => `${Math.max(0, Math.min(1, c / status.limit)) * 100}%`;
  const over = status.left < 0;
  const spring = { type: 'spring' as const, duration: 0.5, bounce: 0 };
  return (
    <span aria-hidden="true" className={`relative block h-[7px] rounded-full bg-fg/10 ${className}`}>
      {over ? (
        <span className="absolute inset-0 rounded-full bg-neg" />
      ) : (
        <>
          {/* Paid and open together, light; paid drawn over it, solid. */}
          <motion.span className="absolute inset-y-0 start-0 rounded-full bg-hue-chart opacity-35" initial={false}
            animate={{ width: share(status.spent) }} transition={spring} />
          <motion.span className="absolute inset-y-0 start-0 rounded-full bg-hue-chart" initial={false}
            animate={{ width: share(status.paid) }} transition={spring} />
        </>
      )}
      {status.elapsed > 0 && status.elapsed < 1 && (
        <span className="absolute -top-[3px] -bottom-[3px] w-[2px] -ms-px rounded-full bg-fg/55" style={{ insetInlineStart: `${status.elapsed * 100}%` }} />
      )}
    </span>
  );
}
