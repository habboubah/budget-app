import { CSSProperties } from 'react';
import { CalendarPlus, Repeat as RepeatIcon } from 'lucide-react';
import { Category, Entry, MonthKey } from '../types';
import { formatMoney, monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';

interface Props {
  month: MonthKey;
  /** Where the monthly entries come from (the last started month). */
  from?: MonthKey;
  /** What starting would carry over. */
  candidates: Entry[];
  categories: Category[];
  t: Strings;
  onStart: (carry: boolean) => void;
}

/**
 * A month that hasn't been started: what starting it would bring along — the
 * recurring entries, shown so nothing comes as a surprise — and the two ways
 * in: with them, or empty.
 */
export function StartMonthCard({ month, from, candidates, categories, t, onStart }: Props) {
  const n = candidates.length;
  const shown = candidates.slice(0, 6);
  const fromLabel = from ? monthLabel(from, t.locale) : '';
  const byId = new Map(categories.map(c => [c.id, c]));

  return (
    <section className="rounded-md bg-surface card-edge p-5 space-y-4" aria-labelledby="start-title">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-sm bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <CalendarPlus className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h2 id="start-title" className="display text-heading font-bold text-fg wrap-compound">
            {fmt(t.notStartedTitle, { month: monthLabel(month, t.locale) })}
          </h2>
          <p className="text-label text-fg-mute mt-1 wrap-prose">
            {n === 0 ? t.startBodyNone : fmt(n === 1 ? t.startBodyOne : t.startBody, { n, from: fromLabel })}
          </p>
        </div>
      </div>

      {n > 0 && (
        <div>
          <p className="eyebrow text-fg-mute mb-2">{t.carryPreview}</p>
          <ul className="rounded-sm bg-surface-2 divide-hairline-inset">
            {shown.map(e => {
              const c = byId.get(e.categoryId);
              return (
                <li key={e.id} className="relative px-3 py-2 flex items-center gap-3" style={{ '--sep': '0.75rem' } as CSSProperties}>
                  <Picture emoji={c?.emoji} name={e.name} hue={c?.hue} size="sm" />
                  <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{e.name}</span>
                  {e.repeat === 'yearly' && <RepeatIcon className="w-3.5 h-3.5 text-fg-mute" aria-label={t.repeatsYearly} />}
                  <span className={`text-label font-semibold num ${c?.kind === 'income' ? 'text-pos' : 'text-fg'}`}>
                    {formatMoney(e.amount, t.locale)}
                  </span>
                </li>
              );
            })}
            {n > shown.length && (
              <li className="px-3 py-2 text-caption text-fg-mute">+ {n - shown.length}</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        <Button full size="lg" onClick={() => onStart(true)}>{t.startWith}</Button>
        {n > 0 && <Button full variant="secondary" onClick={() => onStart(false)}>{t.startEmpty}</Button>}
      </div>
    </section>
  );
}
