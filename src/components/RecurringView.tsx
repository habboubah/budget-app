import { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import { Category } from '../types';
import { formatMoney, monthLabel, spoken } from '../logic';
import { ActiveSeries } from '../recurring';
import { perShort, repeatName } from '../repeatLabel';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

/**
 * Mehr › Wiederkehrende Posten: every recurring entry still running, the
 * monthly ones first, then the rarer ones (every 2, 3, 6 months, yearly) —
 * each with its amount, the month it last happened and the month it comes
 * next. A tap opens that last month and the entry in it.
 */
export function RecurringView({ items, categories, t, onBack, onOpen }: {
  items: ActiveSeries[];
  categories: Category[];
  t: Strings;
  onBack: () => void;
  onOpen: (s: ActiveSeries) => void;
}) {
  const byId = new Map(categories.map(c => [c.id, c]));
  const groups = [
    { title: t.repeatMonthly, list: items.filter(s => s.every === 1) },
    { title: t.recurringRarer, list: items.filter(s => s.every !== 1) },
  ].filter(g => g.list.length);
  return (
    <Screen title={t.recurringTitle} subtitle={items.length ? t.recurringHint : undefined} onBack={onBack} backLabel={t.back} tabbed>
      {items.length === 0 ? <Empty emoji="🔁" title={t.recurringNone} /> : groups.map(g => (
        <section key={g.title}>
          <h2 className="px-4 pb-1.5 eyebrow text-fg-mute">{g.title} · {g.list.length}</h2>
          <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {g.list.map(s => {
              const c = byId.get(s.latest.categoryId);
              const income = c?.kind === 'income';
              const money = formatMoney(income ? s.latest.amount : -s.latest.amount, t.locale, 'exceptZero');
              const last = fmt(t.recurringLast, { month: monthLabel(s.last.month, t.locale) });
              const next = fmt(t.recurringNext, { month: monthLabel(s.next, t.locale) });
              return (
                <li key={s.seriesId}>
                  <button
                    type="button"
                    onClick={() => { tapLight(); onOpen(s); }}
                    aria-label={[s.latest.name, `${spoken(money, t.amountHidden)} ${perShort(t, s.latest)}`, repeatName(t, s.latest), last, next].join(', ')}
                    className="w-full min-h-tap px-4 py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
                  >
                    <Picture emoji={c?.emoji} name={s.latest.name} hue={c?.hue} size="sm" />
                    <span className="min-w-0 flex-1" aria-hidden="true">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="min-w-0 flex-1 basis-[7rem] text-body text-fg wrap-compound">{s.latest.name}</span>
                        <span className="ms-auto shrink-0 flex items-baseline gap-1">
                          <span className={`rounded-num text-body font-semibold ${income ? 'text-pos' : 'text-fg'}`}>{money}</span>
                          <span className="text-caption text-fg-mute">{perShort(t, s.latest)}</span>
                        </span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-caption text-fg-mute tabular-nums">
                        {s.every !== 1 && <><span className="font-medium text-fg">{repeatName(t, s.latest)}</span><span>·</span></>}
                        <span>{last}</span><span>·</span><span>{next}</span>
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Screen>
  );
}
