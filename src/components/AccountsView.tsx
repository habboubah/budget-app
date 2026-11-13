import { Plus } from 'lucide-react';
import { AccountKind } from '../types';
import { AccountTotal, accountName, formatMoney } from '../logic';
import { Strings, fmt } from '../translations';
import { Screen, Group, Row } from '../ui/Screen';
import { Picture } from '../ui/Picture';

/**
 * Mehr › Haushaltsbuch › Konten (pushed, plan 30). Every book has its
 * main account; cash, a savings account or any other come in here, and only
 * then does anything about accounts show elsewhere. Each account with what
 * is on it now; with more than one, *Vermögen* — all of them together.
 */
export function AccountsView({ totals, t, onBack, onEdit, onAdd }: {
  totals: { accounts: AccountTotal[]; now: number };
  t: Strings;
  onBack: () => void;
  onEdit: (id: string) => void;
  onAdd: (kind: AccountKind) => void;
}) {
  const kindLabel: Record<AccountKind, string> = { bank: t.accountKindBank, cash: t.accountKindCash, savings: t.accountKindSavings };
  const several = totals.accounts.length > 1;
  return (
    <Screen title={t.accountsTitle} onBack={onBack} backLabel={t.back}>
      <div className="space-y-6">
        <Group footer={several ? fmt(t.wealthLine, { amount: formatMoney(totals.now, t.locale), n: totals.accounts.length }) : t.accountsFooter}>
          {totals.accounts.map(({ account: a, now }) => {
            const name = accountName(a, t.accountMain);
            return (
              <Row
                key={a.id}
                label={name}
                sub={name !== kindLabel[a.kind] ? kindLabel[a.kind] : undefined}
                leading={<Picture emoji={a.emoji} name={name} hue={a.hue} size="sm" />}
                trailing={<span className={`shrink-0 text-body font-medium num ${now < 0 ? 'text-neg' : 'text-fg'}`}>{formatMoney(now, t.locale)}</span>}
                onClick={() => onEdit(a.id)}
                ariaLabel={`${fmt(t.editNamed, { name })}, ${formatMoney(now, t.locale)}`}
              />
            );
          })}
        </Group>
        <Group footer={several ? t.accountsFooter : undefined}>
          {([['cash', t.accountAddCash], ['savings', t.accountAddSavings], ['bank', t.accountAddOther]] as const).map(([kind, label]) => (
            <Row
              key={kind}
              label={<span className="text-accent">{label}</span>}
              leading={<span className="w-9 h-9 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true"><Plus className="w-5 h-5" /></span>}
              onClick={() => onAdd(kind)}
              ariaLabel={label}
            />
          ))}
        </Group>
      </div>
    </Screen>
  );
}
