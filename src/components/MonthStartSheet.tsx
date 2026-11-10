import { useEffect, useMemo, useState } from 'react';
import { MAX_MONTH_START, dayLabel, isoDay, monthLabel, periodOf, periodRange } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Label } from '../ui/Field';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';

const DAYS = Array.from({ length: MAX_MONTH_START }, (_, i) => i + 1);

/** "25. Okt. – 24. Nov." — the days a month runs over. */
export function periodLabel(key: string, t: Strings, start?: number): string {
  const { first, last } = periodRange(key, start);
  return fmt(t.monthPeriod, { from: dayLabel(first, t.locale), to: dayLabel(last, t.locale) });
}

/**
 * Monat beginnt am (plan 32): the day the book's month begins — the 1st, or
 * the day the salary comes, up to the 28th. Before anything changes the sheet
 * says which days the running month would cover and how many entries would
 * move to another month; the change itself can be undone.
 */
export function MonthStartSheet({ open, current, moved, t, onClose, onSave }: {
  open: boolean;
  current: number;
  /** How many entries would change their month with this day. */
  moved: (day: number) => number;
  t: Strings;
  onClose: () => void;
  onSave: (day: number) => void;
}) {
  const [day, setDay] = useState(current);
  useEffect(() => { if (open) setDay(current); }, [open]);

  const count = useMemo(() => (open && day !== current ? moved(day) : 0), [open, day, current]);
  const running = periodOf(isoDay(new Date()), day);
  const changed = day !== current;
  const save = () => { if (changed) onSave(day); onClose(); };

  return (
    <Sheet open={open} title={t.monthStartRow} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: save, disabled: !changed }}>
      <div className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">{t.monthStartHint}</p>
        <div role="radiogroup" aria-label={t.monthStartRow}>
          <Label>{t.monthStartDay}</Label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(d => {
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { tapLight(); setDay(d); }}
                  className={`min-h-tap rounded-sm num text-body border-[1.5px] transition-colors focus-visible:ring-focus ${
                    on ? 'bg-accent-dim text-accent border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-md bg-surface-2 px-4 py-3" aria-live="polite">
          <p className="text-body font-semibold text-fg wrap-prose">
            {monthLabel(running, t.locale)}: {periodLabel(running, t, day)}
          </p>
          {changed && (
            <p className="text-caption text-fg-mute mt-0.5 wrap-prose">
              {count ? fmt(t.monthStartMoved, { n: count }) : t.monthStartMovedNone}
            </p>
          )}
        </div>
        <Button full size="lg" disabled={!changed} onClick={save}>{t.save}</Button>
      </div>
    </Sheet>
  );
}
