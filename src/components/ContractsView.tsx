import { CSSProperties } from 'react';
import { Category } from '../types';
import { formatMoney } from '../logic';
import { ContractItem, contractTotals } from '../contracts';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { ContractRow } from './ContractsCard';

/**
 * Every recurring cost as a contract (pushed from Planen): deadlines coming
 * up first, then the dearest. A row opens its contract details — when it
 * runs until, the notice it needs, how it renews.
 */
export function ContractsView({ items, categories, t, onBack, onOpen }: {
  items: ContractItem[];
  categories: Category[];
  t: Strings;
  onBack: () => void;
  onOpen: (item: ContractItem) => void;
}) {
  const totals = contractTotals(items);
  const money = (c: number) => formatMoney(c, t.locale);
  const byId = new Map(categories.map(c => [c.id, c]));
  return (
    <Screen
      title={t.contractsTitle}
      subtitle={items.length ? fmt(t.contractsSub, { n: items.length, monthly: money(totals.monthly), yearly: money(totals.yearly) }) : undefined}
      onBack={onBack} backLabel={t.back} tabbed
    >
      {items.length === 0 ? (
        <Empty emoji="📄" title={t.contractsTitle} body={t.commitmentsNone} />
      ) : (
        <>
          <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '64px' } as CSSProperties}>
            {items.map(i => (
              <li key={i.seriesId}><ContractRow item={i} category={byId.get(i.categoryId)} t={t} onOpen={onOpen} /></li>
            ))}
          </ul>
          <p className="px-4 text-caption text-fg-mute wrap-prose">{t.contractsHint}</p>
        </>
      )}
    </Screen>
  );
}
