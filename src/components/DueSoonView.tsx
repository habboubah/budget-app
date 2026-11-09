import { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppData, Category, Entry } from '../types';
import { dayLabel, displayName, formatMoney, monthLabel, spoken } from '../logic';
import { DueGroup, DueItem, dueGroups, dueSoon, dueTotals, nextMonthDue } from '../due';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { tapLight } from '../ui/haptics';
import { dueWhen } from './DueSoonRail';

/**
 * Everything still to pay or to come in, day by day: overdue first, then
 * today, tomorrow and the days after, then what has no day. A row opens its
 * entry; its circle ticks it off. At the end, what the next month brings
 * along — its own open entries once started, else the recurring ones it
 * will copy in (a preview; nothing to tick yet).
 */
export function DueSoonView({ data, language, t, onBack, onEdit, onTick }: {
  data: AppData;
  language: string;
  t: Strings;
  onBack: () => void;
  onEdit: (e: Entry) => void;
  onTick: (e: Entry) => void;
}) {
  const today = new Date();
  const items = dueSoon(data.entries, today);
  const groups = dueGroups(items, today);
  const next = nextMonthDue(data, today);
  const byId = new Map(data.categories.map(c => [c.id, c]));
  const kindOf = (id: string) => byId.get(id)?.kind ?? 'expense';
  const sum = dueTotals(items, kindOf);
  const money = (c: number) => formatMoney(c, t.locale);
  const subtitle = [sum.out ? fmt(t.dueToPay, { amount: money(sum.out) }) : '', sum.in ? fmt(t.dueToCome, { amount: money(sum.in) }) : '']
    .filter(Boolean).join(' · ');

  const title = (g: DueGroup) => {
    if (g.kind === 'overdue') return t.dueOverdue;
    if (g.kind === 'undated') return t.dateNone;
    if (g.kind === 'today') return t.dateToday;
    if (g.kind === 'tomorrow') return t.dueTomorrow;
    const [y, m, d] = g.day!.split('-').map(Number);
    return new Intl.DateTimeFormat(t.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
  };

  return (
    <Screen title={t.dueTitle} subtitle={subtitle || undefined} onBack={onBack} backLabel={t.back} tabbed>
      {items.length === 0 && <Empty emoji="✅" title={t.nothingOpen} body={t.dueNothing} />}
      <AnimatePresence initial={false}>
        {groups.map(g => (
          <motion.section key={g.key} layout="position" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <h2 className={`px-4 pb-1.5 eyebrow wrap-compound ${g.kind === 'overdue' ? 'text-neg' : 'text-fg-mute'}`}>{title(g)}</h2>
            <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '52px' } as CSSProperties}>
              <AnimatePresence initial={false}>
                {g.items.map(item => (
                  <motion.li key={item.entry.id} layout="position" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                    <DueRow item={item} category={byId.get(item.entry.categoryId)} language={language} t={t}
                      onEdit={() => onEdit(item.entry)} onTick={() => onTick(item.entry)} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>

      {next.items.length > 0 && (
        <section>
          <h2 className="px-4 pb-1.5 eyebrow text-fg-mute wrap-compound">{fmt(t.dueNext, { month: monthLabel(next.month, t.locale) })}</h2>
          <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '52px' } as CSSProperties}>
            {next.items.map(item => (
              <li key={item.entry.id}>
                {next.started
                  ? <DueRow item={item} category={byId.get(item.entry.categoryId)} language={language} t={t}
                      onEdit={() => onEdit(item.entry)} onTick={() => onTick(item.entry)} />
                  : <DueRow item={item} category={byId.get(item.entry.categoryId)} language={language} t={t} />}
              </li>
            ))}
          </ul>
          {!next.started && <p className="px-4 pt-2 text-caption text-fg-mute wrap-prose">{t.dueNextBody}</p>}
        </section>
      )}
    </Screen>
  );
}

/** One due entry: its category's picture, name, when, the amount; the circle ticks it off. A preview has neither. */
function DueRow({ item, category, language, t, onEdit, onTick }: {
  item: DueItem;
  category?: Category;
  language: string;
  t: Strings;
  onEdit?: () => void;
  onTick?: () => void;
}) {
  const e = item.entry;
  const income = category?.kind === 'income';
  const cname = category ? displayName(category.names, language) : '';
  const status = item.overdue ? t.overdue : income ? t.expected : t.open;
  const when = dueWhen(item, t);
  // As on the month page: the circle first, then what it is, the amount last.
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-body text-fg wrap-compound">{e.name}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-caption text-fg-mute mt-0.5">
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="emoji text-[13px]" aria-hidden="true">{category?.emoji}</span>
            <span className="wrap-compound">{cname}</span>
          </span>
          {/* The day where no group header says it: overdue ones, and next month's preview. */}
          {item.day && (item.overdue || !onTick) && <><span aria-hidden="true">·</span><span className="whitespace-nowrap">{dayLabel(item.day, t.locale)}</span></>}
          {onTick && <><span aria-hidden="true">·</span><span className={`font-medium ${item.overdue ? 'text-neg' : 'text-warn'}`}>{status}</span></>}
        </span>
      </span>
      <span className={`shrink-0 text-body font-medium num ${income ? 'text-pos' : onTick ? 'text-fg' : 'text-fg-mute'}`}>
        {formatMoney(e.amount, t.locale, income ? 'always' : 'auto')}
      </span>
    </>
  );
  if (!onEdit || !onTick) {
    // A preview: nothing to tick or open yet.
    return (
      <div className="min-h-[56px] flex items-center">
        <span className="w-[52px] shrink-0 flex items-center justify-center" aria-hidden="true">
          <span className="w-[24px] h-[24px] rounded-full border-[1.75px] border-dashed border-fg-faint" />
        </span>
        <span className="flex-1 min-w-0 pe-4 py-2.5 flex items-center gap-3">{body}</span>
      </div>
    );
  }
  const tickLabel = `${income ? t.markReceived : t.markPaid} — ${e.name}`;
  return (
    <div data-hue={category?.hue} className="flex items-stretch min-h-[56px]">
      <button
        type="button"
        role="checkbox"
        aria-checked={false}
        aria-label={tickLabel}
        title={tickLabel}
        onClick={onTick}
        className="w-[52px] shrink-0 flex items-center justify-center active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className={`w-[24px] h-[24px] rounded-full border-[1.75px] ${item.overdue ? 'border-neg' : 'border-fg-faint'}`} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => { tapLight(); onEdit(); }}
        aria-label={`${fmt(t.editNamed, { name: e.name })}, ${spoken(formatMoney(e.amount, t.locale), t.amountHidden)}, ${when}, ${status}`}
        className="flex-1 min-w-0 pe-4 py-2.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        {body}
      </button>
    </div>
  );
}
