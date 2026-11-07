import { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import { Category } from '../types';
import { dayLabel, formatMoney, monthLabel } from '../logic';
import { ContractItem, contractTotals, daysUntil } from '../contracts';
import { Strings, fmt } from '../translations';
import { Card, CardAction } from '../ui/Card';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

/** A day for a contract line: "30. Nov." this year, "30. Sept. 2027" in another. */
export function contractDate(iso: string, locale: string): string {
  if (iso.slice(0, 4) === String(new Date().getFullYear())) return dayLabel(iso, locale);
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
}

/** When a contract is next on: its last day to cancel once known, else its next payment. */
export function contractWhen(item: ContractItem, t: Strings): string {
  if (item.deadline) return fmt(t.contractCancelBy, { date: contractDate(item.deadline.cancelBy, t.locale) });
  const { next } = item;
  if (next.date) return fmt(next.open ? t.contractDue : t.contractNext, { date: contractDate(next.date, t.locale) });
  return fmt(next.open ? t.contractDueMonth : t.contractNextMonth, { month: monthLabel(next.month, t.locale, 'name') });
}

/**
 * One contract: its category's picture, the name, what one payment costs
 * ("13,99 € mtl."), and in the line below when it is next on — the last day
 * to cancel once its end is known, amber within 60 days — and how its price
 * last changed. Opens its contract details.
 */
export function ContractRow({ item, category, t, onOpen }: {
  item: ContractItem;
  category?: Category;
  t: Strings;
  onOpen: (item: ContractItem) => void;
}) {
  const soon = !!item.deadline && daysUntil(item.deadline.cancelBy) <= 60;
  const when = contractWhen(item, t);
  const change = item.change && fmt(t.contractChange, {
    amount: formatMoney(item.change.by, t.locale, 'always'), month: monthLabel(item.change.since, t.locale, 'month'),
  });
  const per = item.repeat === 'monthly' ? t.perMonthShort : t.perYearShort;
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onOpen(item); }}
      aria-label={[item.name, `${formatMoney(item.amount, t.locale)} ${per}`, when, change].filter(Boolean).join(', ')}
      className="w-full min-h-tap px-4 py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
    >
      <Picture emoji={category?.emoji} name={item.name} hue={category?.hue} size="sm" />
      <span className="min-w-0 flex-1" aria-hidden="true">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 flex-1 basis-[7rem] text-body text-fg wrap-compound">{item.name}</span>
          <span className="ms-auto shrink-0 flex items-baseline gap-1">
            <span className="rounded-num text-body font-semibold text-fg">{formatMoney(item.amount, t.locale)}</span>
            <span className="text-caption text-fg-mute">{per}</span>
          </span>
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-caption text-fg-mute tabular-nums">
          <span className={soon ? 'font-semibold text-warn' : ''}>{when}</span>
          {change && <><span>·</span><span>{change}</span></>}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

/**
 * Abos & Verträge on Planen: what the recurring costs add up to, how much of
 * the income they take before the month begins, and the first four — those
 * with a deadline coming up first. "Alle (n)" pushes the whole list.
 */
export function ContractsCard({ items, categories, averageIncome, t, onOpen, onAll }: {
  items: ContractItem[];
  categories: Category[];
  averageIncome: number;
  t: Strings;
  onOpen: (item: ContractItem) => void;
  onAll: () => void;
}) {
  const money = (c: number) => formatMoney(c, t.locale);
  const totals = contractTotals(items);
  const shown = items.slice(0, 4);
  const byId = new Map(categories.map(c => [c.id, c]));
  return (
    <Card
      title={t.contractsTitle}
      sub={items.length ? fmt(t.contractsSub, { n: items.length, monthly: money(totals.monthly), yearly: money(totals.yearly) }) : undefined}
      action={items.length > shown.length && <CardAction onClick={onAll}>{fmt(t.allPayees, { n: items.length })}</CardAction>}
    >
      {items.length === 0 ? (
        <p className="text-label text-fg-mute wrap-prose">{t.commitmentsNone}</p>
      ) : (
        <>
          {averageIncome > 0 && (
            <p className="-mt-1 mb-1 text-caption text-fg-mute wrap-prose">{fmt(t.commitmentsShare, { p: Math.round((totals.monthly / averageIncome) * 100) })}</p>
          )}
          <ul className="-mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {shown.map(i => (
              <li key={i.seriesId}><ContractRow item={i} category={byId.get(i.categoryId)} t={t} onOpen={onOpen} /></li>
            ))}
          </ul>
          {!items.some(i => i.contract) && <p className="mt-3 text-caption text-fg-mute wrap-prose">{t.contractsHint}</p>}
        </>
      )}
    </Card>
  );
}
