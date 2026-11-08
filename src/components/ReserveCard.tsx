import { CSSProperties } from 'react';
import { Category } from '../types';
import { formatMoney, formatMoneyShort, monthLabel } from '../logic';
import { YearlyReserve } from '../insights';
import { Strings, fmt } from '../translations';
import { Picture } from '../ui/Picture';

/**
 * Rücklage für jährliche Kosten on Planen (plan 11, F3): how much to set aside
 * a month for the book's yearly bills, the next ones coming up, and whether
 * the account covers them. Shown only when the book has a yearly entry
 * (the view renders it conditionally).
 */
export function ReserveCard({ reserve, categories, t }: {
  reserve: YearlyReserve;
  categories: Category[];
  t: Strings;
}) {
  const byId = new Map(categories.map(c => [c.id, c]));
  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="reserve-title">
      <p className="eyebrow text-fg-mute">{t.reserveTitle}</p>
      <h3 id="reserve-title" className="display text-heading font-semibold text-fg tabular-nums wrap-prose">
        {fmt(t.reserveMonthly, { amount: formatMoneyShort(reserve.monthly, t.locale) })}
      </h3>
      {reserve.shortfall ? (
        <p className="text-caption text-warn font-medium mt-0.5 tabular-nums wrap-prose">
          {fmt(t.reserveShortfall, {
            month: monthLabel(reserve.shortfall.month, t.locale, 'name'),
            amount: formatMoneyShort(reserve.shortfall.amount, t.locale),
          })}
        </p>
      ) : (
        <p className="text-caption text-fg-mute mt-0.5 wrap-prose">{t.reserveCovered}</p>
      )}
      {reserve.upcoming.length > 0 && (
        <div className="mt-4 pt-3 hairline-t">
          <h4 className="text-label font-semibold text-fg">{t.reserveUpcoming}</h4>
          <ul className="mt-1 -mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {reserve.upcoming.map(i => {
              const c = byId.get(i.categoryId);
              return (
                <li key={`${i.month}-${i.name}`} className="min-h-tap px-4 py-2.5 flex items-center gap-3">
                  <Picture emoji={c?.emoji} name={i.name} hue={c?.hue} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-fg wrap-compound">{i.name}</span>
                    <span className="block text-caption text-fg-mute tabular-nums">{monthLabel(i.month, t.locale, 'name')}</span>
                  </span>
                  <span className="shrink-0 rounded-num text-body font-semibold text-fg">{formatMoney(i.amount, t.locale)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
