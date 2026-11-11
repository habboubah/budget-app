import { useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Category, Entry } from '../types';
import { dayLabel, displayName, formatMoney, isoDay, spoken } from '../logic';
import { DueItem } from '../due';
import { Strings, fmt } from '../translations';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { rise } from '../ui/stagger';

/** How many cards the rail shows; the rest are one tap away ("Alle 9"). */
const RAIL = 8;

/**
 * "Demnächst fällig" on the running month: what is still open, overdue
 * first, then by day — across every category, as a rail of cards to swipe
 * through. A card opens its entry; its circle ticks it off. "Alle" opens the
 * whole list, day by day.
 */
export function DueSoonRail({ items, categories, language, t, onEdit, onTick, onAll }: {
  items: DueItem[];
  categories: Category[];
  language: string;
  t: Strings;
  onEdit: (e: Entry) => void;
  onTick: (e: Entry) => void;
  onAll: () => void;
}) {
  const headingId = useId();
  return (
    <motion.section variants={rise} aria-labelledby={headingId}>
      <div className="px-1 mb-2.5 flex items-baseline gap-2">
        <h2 id={headingId} className="min-w-0 flex-1 display text-heading font-bold text-fg wrap-compound tracking-[-0.02em]">{t.dueTitle}</h2>
        <button
          type="button"
          onClick={() => { tapLight(); onAll(); }}
          className="shrink-0 -my-3 -me-2 h-tap px-2 rounded-sm text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus"
        >
          {fmt(t.dueAll, { n: items.length })}
        </button>
      </div>
      {/* Bleeds to the screen's edges, so the next card peeks in. */}
      {/* Room below for the cards' shadow, which the scroller would clip. */}
      <ul className="-mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pt-0.5 pb-5 -mb-4">
        <AnimatePresence initial={false}>
          {items.slice(0, RAIL).map(item => (
            <motion.li
              key={item.entry.id}
              layout="position"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              className="snap-start shrink-0 w-[9.75rem] flex"
            >
              <DueCard item={item} category={categories.find(c => c.id === item.entry.categoryId)} language={language} t={t}
                onEdit={() => onEdit(item.entry)} onTick={() => onTick(item.entry)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}

/** When it is due, in words: "Heute", "Morgen", "Sa., 14. Nov." — "überfällig" goes beside it. */
export function dueWhen(item: DueItem, t: Strings): string {
  if (!item.day) return t.dateNone;
  const today = new Date();
  if (item.day === isoDay(today)) return t.dateToday;
  if (item.day === isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))) return t.dueTomorrow;
  const [y, m, d] = item.day.split('-').map(Number);
  return new Intl.DateTimeFormat(t.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
}

function DueCard({ item, category, language, t, onEdit, onTick }: {
  item: DueItem;
  category?: Category;
  language: string;
  t: Strings;
  onEdit: () => void;
  onTick: () => void;
}) {
  const e = item.entry;
  const income = category?.kind === 'income';
  const money = formatMoney(e.amount, t.locale, income ? 'always' : 'auto');
  const status = item.overdue ? t.overdue : income ? t.expected : t.open;
  const when = dueWhen(item, t);
  const tickLabel = `${income ? t.markReceived : t.markPaid} — ${e.name}`;
  return (
    <div data-hue={category?.hue} className="relative w-full rounded-md bg-surface card-edge hue-tint flex">
      {/* The card opens the entry; the circle beside it — a sibling, never nested — ticks it off. */}
      <button
        type="button"
        onClick={() => { tapLight(); onEdit(); }}
        aria-label={`${fmt(t.editNamed, { name: e.name })}, ${spoken(formatMoney(e.amount, t.locale), t.amountHidden)}, ${when}, ${status}`}
        className="press w-full min-w-0 p-3.5 flex flex-col text-start rounded-md active:bg-surface-2 focus-visible:ring-focus"
      >
        {/* The category's picture leads; the circle beside it ticks the bill off. */}
        <Picture emoji={category?.emoji} name={category ? displayName(category.names, language) : e.name} size="sm" plain />
        <span className="mt-3 block text-label font-semibold text-fg wrap-compound">{e.name}</span>
        {/* When, and — in words, never by colour alone — whether it is late or still expected. */}
        <span className={`mt-0.5 block text-caption font-medium tabular-nums wrap-prose ${item.overdue ? 'text-neg' : 'text-fg-mute'}`}>
          {item.day && item.overdue ? dayLabel(item.day, t.locale) : when}
          {' · '}
          <span className={item.overdue ? '' : 'text-warn'}>{status}</span>
        </span>
        <span className={`mt-auto pt-3 block rounded-num text-body font-bold ${income ? 'text-pos' : 'text-fg'}`}>{money}</span>
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={false}
        aria-label={tickLabel}
        title={tickLabel}
        onClick={onTick}
        className="absolute top-2 end-1.5 w-tap h-tap rounded-full inline-flex items-center justify-center active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className={`w-[24px] h-[24px] rounded-full border-2 ${item.overdue ? 'border-neg' : 'border-fg-faint'}`} aria-hidden="true" />
      </button>
    </div>
  );
}
