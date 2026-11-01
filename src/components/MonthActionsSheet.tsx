import { Repeat as RepeatIcon, Trash2, Wallet } from 'lucide-react';
import { MonthKey } from '../types';
import { monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Group, Row } from '../ui/Screen';

/** The month's "⋯": correct the opening balance, fetch missing recurring entries, delete the month. */
export function MonthActionsSheet({ open, month, started, prevKey, missing, t, onClose, onOpening, onPull, onDelete }: {
  open: boolean;
  month: MonthKey;
  started: boolean;
  prevKey?: MonthKey;
  /** Recurring entries of earlier months this month doesn't have yet. */
  missing: number;
  t: Strings;
  onClose: () => void;
  onOpening: () => void;
  onPull: () => void;
  onDelete: () => void;
}) {
  const run = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <Sheet open={open} title={monthLabel(month, t.locale)} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4">
        <Group>
          <Row
            label={prevKey ? t.openingTitle : t.startingBalance}
            leading={<Wallet className="w-5 h-5 text-accent" aria-hidden="true" />}
            onClick={run(onOpening)}
          />
          {started && prevKey && (
            <Row
              label={fmt(t.pullRecurring, { month: monthLabel(prevKey, t.locale, 'long') })}
              sub={missing ? fmt(t.pullRecurringSub, { n: missing }) : t.nothingToPull}
              leading={<RepeatIcon className="w-5 h-5 text-accent" aria-hidden="true" />}
              onClick={missing ? run(onPull) : undefined}
            />
          )}
        </Group>
        {started && (
          <Group>
            <Row
              label={t.deleteMonth}
              sub={t.deleteMonthSub}
              danger
              leading={<Trash2 className="w-5 h-5 text-neg" aria-hidden="true" />}
              onClick={run(onDelete)}
            />
          </Group>
        )}
      </div>
    </Sheet>
  );
}
