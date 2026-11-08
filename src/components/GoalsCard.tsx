import { CSSProperties } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { AppData } from '../types';
import { formatMoneyShort } from '../logic';
import { goalProgress, openGoals } from '../insights';
import { Strings, fmt } from '../translations';
import { Picture } from '../ui/Picture';

/**
 * Spartöpfe on Planen (plan 12). With goals, a compact card listing the open
 * ones with a progress bar and a link to the full screen. Without any, one
 * quiet row — "Für etwas sparen?" — not a big empty card.
 */
export function GoalsCard({ data, t, today, onOpen }: {
  data: AppData;
  t: Strings;
  today: Date;
  onOpen: () => void;
}) {
  const open = openGoals(data);

  if (open.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-md bg-surface card-edge px-[16px] py-3.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <Plus className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{t.goalsEmptyPrompt}</span>
        <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="goals-title">
      <div className="flex items-center gap-2">
        <p id="goals-title" className="min-w-0 flex-1 eyebrow text-fg-mute">{t.goalsTitle}</p>
        <button type="button" onClick={onOpen} className="shrink-0 inline-flex items-center gap-0.5 text-caption text-accent font-medium active:opacity-60 focus-visible:ring-focus">
          {t.goalsAll}<ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-2 -mx-4 divide-hairline-inset" style={{ '--sep': '60px' } as CSSProperties}>
        {open.slice(0, 3).map(g => {
          const p = goalProgress(data, g, today);
          return (
            <li key={g.id} data-hue={g.hue} className="px-4 py-2.5 flex items-center gap-3">
              <Picture emoji={g.emoji} name={g.name} hue={g.hue} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{g.name}</span>
                  <span className="shrink-0 text-caption text-fg-mute tabular-nums">
                    {fmt(t.goalSaved, { saved: formatMoneyShort(p.saved, t.locale), target: formatMoneyShort(g.target, t.locale) })}
                  </span>
                </span>
                <span className="mt-1 block h-[6px] rounded-full bg-hue-bg overflow-hidden" aria-hidden="true">
                  <span className={`block h-full rounded-full ${p.reached ? 'bg-pos' : 'bg-hue-chart'}`} style={{ width: `${Math.round(p.fraction * 100)}%` }} />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
