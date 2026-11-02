import { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { MonthKey } from '../types';
import { MonthBalance, addMonths, formatMoney, monthKeyOf, parseMonthKey } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { tapLight } from '../ui/haptics';

interface Props {
  open: boolean;
  selected: MonthKey;
  balances: MonthBalance[];
  t: Strings;
  onPick: (m: MonthKey) => void;
  onClose: () => void;
}

/**
 * Tap the month's name: every month with entries, newest first and grouped by
 * year, each with what it ended on — one tap to any of them instead of
 * stepping with ‹ ›. The current month and the one after the newest are
 * always offered, so a new month is one tap away too.
 */
export function MonthPickerSheet({ open, selected, balances, t, onPick, onClose }: Props) {
  const current = monthKeyOf();
  const started = balances.filter(b => b.started);
  const keys = new Set(started.map(b => b.key));
  keys.add(current);
  keys.add(selected);
  const newest = [...keys].sort().pop()!;
  keys.add(addMonths(newest, 1));
  const byKey = new Map(started.map(b => [b.key, b]));
  const sorted = [...keys].sort().reverse();
  const years = [...new Set(sorted.map(k => parseMonthKey(k).year))];
  const monthName = (k: MonthKey) => {
    const { year, month } = parseMonthKey(k);
    return new Intl.DateTimeFormat(t.locale, { month: 'long' }).format(new Date(year, month - 1, 1));
  };

  return (
    <Sheet open={open} title={t.pickMonth} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-5 pb-2">
        {years.map(y => (
          <section key={y}>
            <h3 className="px-4 pb-1.5 eyebrow text-fg-mute num">{y}</h3>
            <ul className="rounded-md bg-surface-2/60 overflow-hidden divide-hairline-inset" style={{ '--sep': '1rem' } as CSSProperties}>
              {sorted.filter(k => parseMonthKey(k).year === y).map(k => {
                const b = byKey.get(k);
                const on = k === selected;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      aria-current={on ? 'date' : undefined}
                      onClick={() => { tapLight(); onPick(k); onClose(); }}
                      className="w-full min-h-[54px] px-4 py-2 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block text-body ${on ? 'font-semibold text-accent' : 'text-fg'}`}>
                          {monthName(k)}
                          {k === current && <span className="ms-2 text-caption font-semibold text-fg-mute">{t.thisMonth}</span>}
                        </span>
                        <span className="block text-caption text-fg-mute mt-0.5">
                          {b ? fmt(t.monthEndAmount, { amount: formatMoney(b.end, t.locale) }) : t.monthNotStarted}
                        </span>
                      </span>
                      {on && <Check className="w-5 h-5 text-accent shrink-0" strokeWidth={2.6} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
