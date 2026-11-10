import { CSSProperties } from 'react';
import { ChevronRight, HandCoins, Plus } from 'lucide-react';
import { DebtPlan } from '../insights';
import { formatMoney, monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Screen, Empty, Group, Row, Dock } from '../ui/Screen';
import { Button } from '../ui/Button';

/** What a debt comes to, in one line: what is left and when it ends — or that it is paid off. */
export function debtLine(p: DebtPlan, t: Strings): string {
  const owe = p.debt.direction === 'owe';
  if (p.done) return owe ? t.debtPaidOff : t.debtPaidBack;
  const left = fmt(t.debtLeft, { amount: formatMoney(p.left, t.locale) });
  const when = p.payoff
    ? fmt(owe ? t.debtFreeIn : t.debtBackIn, { month: monthLabel(p.payoff, t.locale, 'long') })
    : p.never ? t.debtNever : t.debtNoPayment;
  return `${left} · ${when}`;
}

/** The interest still to come, when there is any. */
export function interestLine(p: DebtPlan, t: Strings): string | undefined {
  return p.interestLeft ? fmt(t.debtInterestLeft, { amount: formatMoney(p.interestLeft, t.locale) }) : undefined;
}

/**
 * Optionen → Haushaltsbuch → Schulden und Kredite (pushed, plan 31): loans
 * and debts, then money lent — each with what is left and when it ends.
 * The way in for the first one; Planen's card appears once there is one.
 */
export function DebtsView({ overview, t, onBack, onNew, onEdit }: {
  overview: { plans: DebtPlan[]; owe: number; owed: number };
  t: Strings;
  onBack: () => void;
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  const group = (dir: 'owe' | 'owed') => overview.plans.filter(p => p.debt.direction === dir);
  const rows = (plans: DebtPlan[]) => plans.map(p => {
    const sub = [debtLine(p, t), interestLine(p, t)].filter(Boolean).join(' · ');
    return (
      <Row
        key={p.debt.id}
        label={p.debt.name}
        sub={sub}
        leading={<span className="w-9 h-9 rounded-[10px] bg-surface-2 text-fg-mute inline-flex items-center justify-center shrink-0" aria-hidden="true"><HandCoins className="w-5 h-5" /></span>}
        trailing={<ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />}
        onClick={() => onEdit(p.debt.id)}
        ariaLabel={`${fmt(t.editNamed, { name: p.debt.name })}, ${sub}`}
      />
    );
  });
  const owe = group('owe');
  const owed = group('owed');
  return (
    <>
      <Screen title={t.debtsTitle} onBack={onBack} backLabel={t.back} docked>
        {overview.plans.length === 0 ? (
          <Empty emoji="🤝" title={t.debtsEmpty} body={t.debtsEmptyBody} action={<Button icon={Plus} onClick={onNew}>{t.debtAdd}</Button>} />
        ) : (
          <div className="space-y-6">
            {owe.length > 0 && <Group title={fmt(t.debtsOweTotal, { amount: formatMoney(overview.owe, t.locale) })}>{rows(owe)}</Group>}
            {owed.length > 0 && <Group title={fmt(t.debtsOwedTotal, { amount: formatMoney(overview.owed, t.locale) })} footer={t.debtsFooter}>{rows(owed)}</Group>}
            {owed.length === 0 && <p className="px-[16px] -mt-4 text-caption text-fg-mute wrap-prose">{t.debtsFooter}</p>}
          </div>
        )}
      </Screen>
      {overview.plans.length > 0 && <Dock><Button full size="lg" icon={Plus} onClick={onNew}>{t.debtAdd}</Button></Dock>}
    </>
  );
}

/**
 * Schulden on Planen (plan 31): there only once a debt exists. What is owed
 * in total, the open ones with what is left and when they end, and the way to
 * all of them.
 */
export function DebtsCard({ overview, t, onOpen, onEdit }: {
  overview: { plans: DebtPlan[]; owe: number; owed: number };
  t: Strings;
  onOpen: () => void;
  onEdit: (id: string) => void;
}) {
  const open = overview.plans.filter(p => !p.done);
  const shown = (open.length ? open : overview.plans).slice(0, 3);
  const totals = [
    overview.owe ? fmt(t.debtsOweTotal, { amount: formatMoney(overview.owe, t.locale) }) : '',
    overview.owed ? fmt(t.debtsOwedTotal, { amount: formatMoney(overview.owed, t.locale) }) : '',
  ].filter(Boolean).join(' · ');
  return (
    <section className="rounded-md bg-surface card-edge p-[16px]" aria-labelledby="debts-title">
      <div className="flex items-center gap-2">
        <p id="debts-title" className="min-w-0 flex-1 eyebrow text-fg-mute">{t.debtsCardTitle}</p>
        <button type="button" onClick={onOpen} className="shrink-0 min-h-tap -my-2 inline-flex items-center gap-0.5 text-caption text-accent font-medium active:opacity-60 focus-visible:ring-focus">
          {t.debtsAll}<ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      {totals && <p className="mt-1 text-body font-semibold text-fg wrap-prose">{totals}</p>}
      <ul className="mt-2 -mx-4 divide-hairline-inset" style={{ '--sep': '1rem' } as CSSProperties}>
        {shown.map(p => (
          <li key={p.debt.id}>
            <button
              type="button"
              onClick={() => onEdit(p.debt.id)}
              className="w-full min-h-[52px] px-4 py-2.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body text-fg wrap-compound">{p.debt.name}</span>
                <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{[debtLine(p, t), interestLine(p, t)].filter(Boolean).join(' · ')}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
