import { CSSProperties, useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { AppData, Category, MonthKey } from '../types';
import { displayName, formatMoney, formatMoneyApprox, formatMoneyShort, monthLabel } from '../logic';
import { monthBudgets, suggestLimit } from '../budgets';
import { Strings, fmt } from '../translations';
import { Card } from '../ui/Card';
import { Menu } from '../ui/Menu';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { BudgetBar } from './BudgetBar';

/**
 * The month's budgets at a glance — how many are within their budget, and per
 * budget what is left, its bar with the month's pace, and (running month)
 * what that leaves per day. A row opens its budget; "Budget festlegen" picks
 * a spending category that has none yet, with the average it would suggest.
 */
export function BudgetsCard({ data, month, language, t, onBudget }: {
  data: AppData;
  month: MonthKey;
  language: string;
  t: Strings;
  onBudget: (c: Category) => void;
}) {
  const money = (c: number) => formatMoney(c, t.locale);
  const short = (c: number) => formatMoneyShort(c, t.locale);
  const { items, within } = monthBudgets(data, month);
  const [pickAt, setPickAt] = useState<HTMLElement | null>(null);
  const without = data.categories.filter(c => c.kind === 'expense' && !c.limit);

  return (
    <Card
      title={t.budgetsTitle}
      sub={items.length ? `${monthLabel(month, t.locale)} · ${fmt(t.budgetsWithin, { n: within, total: items.length })}` : undefined}
    >
      {items.length === 0 ? (
        <p className="text-label text-fg-mute wrap-prose">{t.budgetsNone}</p>
      ) : (
        <ul className="-mx-4 divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
          {items.map(({ category: c, status: s }) => {
            const name = displayName(c.names, language);
            const over = s.left < 0;
            // Spent counts what is still open; the bar shows that part lighter.
            const used = fmt(t.budgetOf, { spent: money(s.spent), limit: short(s.limit) });
            return (
              <li key={c.id} data-hue={c.hue}>
                <button
                  type="button"
                  onClick={() => { tapLight(); onBudget(c); }}
                  className="w-full min-h-tap px-4 py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
                >
                  <Picture emoji={c.emoji} name={name} size="sm" />
                  <span className="min-w-0 flex-1">
                    {/* The name, and what is left (or how far over) — labelled right beside it. */}
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="min-w-0 flex-1 basis-[7rem] text-body text-fg wrap-compound">{name}</span>
                      <span className="ms-auto shrink-0 flex items-baseline gap-1.5">
                        <span className={`block rounded-num text-body font-semibold ${over ? 'text-neg' : 'text-fg'}`}>{money(Math.abs(s.left))}</span>
                        <span className={`text-caption ${over ? 'font-semibold text-neg' : 'text-fg-mute'}`}>{over ? t.budgetOverLabel : t.budgetLeftLabel}</span>
                      </span>
                    </span>
                    <BudgetBar status={s} className="mt-2" />
                    <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-caption">
                      <span className="text-fg-mute tabular-nums">
                        {used}
                        {s.perDay !== null && ` · ${fmt(t.perDay, { amount: formatMoneyApprox(s.perDay, t.locale) })}`}
                      </span>
                      {s.ahead && <span className="ms-auto font-medium text-warn">{t.budgetAhead}</span>}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {without.length > 0 && (
        <button
          type="button"
          aria-haspopup="menu"
          onClick={e => { tapLight(); setPickAt(e.currentTarget); }}
          className="mt-2 -mx-4 -mb-4 w-[calc(100%+2rem)] min-h-[48px] px-4 py-2 flex items-center gap-3 hairline-t text-start active:bg-surface-2 transition-colors focus-visible:ring-focus rounded-b-md"
        >
          <span className="w-6 h-6 rounded-full bg-accent-fill text-accent-fill-ink inline-flex items-center justify-center shrink-0" aria-hidden="true">
            <Plus className="w-4 h-4" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body text-accent">{t.budgetsAdd}</span>
            <span className="block text-caption text-fg-mute wrap-prose">{t.budgetsAddSub}</span>
          </span>
        </button>
      )}
      <Menu
        anchor={pickAt}
        label={t.budgetsAdd}
        groups={[without.map(c => {
          const s = suggestLimit(data, c.id);
          return {
            key: c.id,
            label: displayName(c.names, language),
            sub: s ? fmt(s.months === 1 ? t.budgetSuggestOne : t.budgetSuggestMany, { amount: short(s.amount), n: s.months }) : undefined,
            onSelect: () => onBudget(c),
          };
        })]}
        onClose={() => setPickAt(null)}
      />
    </Card>
  );
}
