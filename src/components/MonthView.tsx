import { Category, Entry, MonthKey } from '../types';
import { MonthBalance, entriesOf, monthKeyOf, monthLabel, sortEntries } from '../logic';
import { Strings } from '../translations';
import { Screen } from '../ui/Screen';
import { BalanceCard } from './BalanceCard';
import { CategorySection } from './CategorySection';

interface Props {
  month: MonthKey;
  balance: MonthBalance;
  categories: Category[];
  entries: Entry[];
  language: string;
  t: Strings;
  onAdd: (categoryId: string) => void;
  onEdit: (e: Entry) => void;
  onToggle: (e: Entry) => void;
  onOpening: () => void;
}

/**
 * One month — one sheet of the Excel file. The balance card, then every
 * category in the user's order: income first, then fixed costs, car, extras…
 */
export function MonthView({ month, balance, categories, entries, language, t, onAdd, onEdit, onToggle, onOpening }: Props) {
  const today = new Date();
  const mine = entriesOf(entries, month);

  return (
    <Screen
      title={monthLabel(month, t.locale)}
      eyebrow={month === monthKeyOf(today) ? t.thisMonth : undefined}
      docked
    >
      <BalanceCard balance={balance} t={t} onOpening={onOpening} />

      {categories.map(c => (
        <CategorySection
          key={c.id}
          category={c}
          entries={sortEntries(mine.filter(e => e.categoryId === c.id))}
          language={language}
          t={t}
          today={today}
          onAdd={() => onAdd(c.id)}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      ))}
    </Screen>
  );
}
