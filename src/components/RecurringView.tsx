import { CSSProperties, useState } from 'react';
import { CalendarDays, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Category } from '../types';
import { formatMoney, monthLabel, spoken } from '../logic';
import { ActiveSeries } from '../recurring';
import { perShort, repeatName } from '../repeatLabel';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Picture } from '../ui/Picture';
import { IconButton } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { SwipeRow } from '../ui/SwipeRow';
import { tapLight } from '../ui/haptics';

/**
 * Mehr › Wiederkehrende Posten: every recurring entry still running, in one
 * group per interval — monthly, every 2 months, quarterly, half-yearly,
 * yearly — each with its amount, the month it last happened and the month it
 * comes next. A tap changes it right here (its newest entry, the one the next
 * months copy); "⋯" also opens the month it last happened in, or removes it
 * (as does a swipe), with an undo.
 */
export function RecurringView({ items, categories, t, onBack, onEdit, onOpen, onRemove }: {
  items: ActiveSeries[];
  categories: Category[];
  t: Strings;
  onBack: () => void;
  onEdit: (s: ActiveSeries) => void;
  onOpen: (s: ActiveSeries) => void;
  onRemove: (s: ActiveSeries) => void;
}) {
  const byId = new Map(categories.map(c => [c.id, c]));
  const [menu, setMenu] = useState<{ at: HTMLElement; s: ActiveSeries } | null>(null);
  // `items` comes sorted by interval, so the groups keep that order.
  const groups: { every: number; title: string; list: ActiveSeries[] }[] = [];
  for (const s of items) {
    const g = groups.find(x => x.every === s.every);
    if (g) g.list.push(s); else groups.push({ every: s.every, title: repeatName(t, s.latest), list: [s] });
  }
  return (
    <Screen title={t.recurringTitle} subtitle={items.length ? t.recurringHint : undefined} onBack={onBack} backLabel={t.back} tabbed>
      {items.length === 0 ? <Empty emoji="🔁" title={t.recurringNone} /> : groups.map(g => (
        <section key={g.every}>
          <h2 className="px-4 pb-1.5 eyebrow text-fg-mute">{g.title} · {g.list.length}</h2>
          <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {g.list.map(s => {
              const c = byId.get(s.latest.categoryId);
              const income = c?.kind === 'income';
              const money = formatMoney(income ? s.latest.amount : -s.latest.amount, t.locale, 'exceptZero');
              const last = fmt(t.recurringLast, { month: monthLabel(s.last.month, t.locale) });
              const next = fmt(t.recurringNext, { month: monthLabel(s.next, t.locale) });
              const options = fmt(t.recurringMenu, { name: s.latest.name });
              return (
                <li key={s.seriesId} className="relative bg-surface">
                  <SwipeRow trailing={{ label: t.recurringRemove, icon: Trash2, className: 'bg-swipe-delete', run: () => onRemove(s) }}>
                    <div className="flex items-center bg-surface">
                      <button
                        type="button"
                        onClick={() => { tapLight(); onEdit(s); }}
                        aria-label={[fmt(t.editNamed, { name: s.latest.name }), `${spoken(money, t.amountHidden)} ${perShort(t, s.latest)}`, repeatName(t, s.latest), last, next].join(', ')}
                        className="flex-1 min-w-0 min-h-tap ps-4 pe-1 py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2"
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
                            <span>{last}</span><span>·</span><span>{next}</span>
                          </span>
                        </span>
                      </button>
                      <IconButton
                        label={options}
                        icon={MoreHorizontal}
                        aria-haspopup="menu"
                        className="me-1 shrink-0"
                        onClick={e => setMenu({ at: e.currentTarget, s })}
                      />
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Menu
        anchor={menu?.at ?? null}
        label={menu ? fmt(t.recurringMenu, { name: menu.s.latest.name }) : ''}
        groups={menu ? [
          [
            { key: 'edit', label: t.edit, icon: Pencil, onSelect: () => onEdit(menu.s) },
            { key: 'month', label: fmt(t.openMonth, { month: monthLabel(menu.s.last.month, t.locale) }), icon: CalendarDays, onSelect: () => onOpen(menu.s) },
          ],
          [{ key: 'remove', label: t.recurringRemove, sub: t.recurringRemoveSub, icon: Trash2, destructive: true, onSelect: () => onRemove(menu.s) }],
        ] : []}
        onClose={() => setMenu(null)}
      />
    </Screen>
  );
}
