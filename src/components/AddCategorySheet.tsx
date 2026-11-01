import { Plus } from 'lucide-react';
import { Category, MonthKey } from '../types';
import { displayName, monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Group, Row } from '../ui/Screen';
import { Picture } from '../ui/Picture';

/**
 * Put a category into one month: every category the month doesn't show yet
 * (taken out earlier, or not one of the standard ones), one tap each — or a
 * brand-new category.
 */
export function AddCategorySheet({ open, month, hidden, language, t, onClose, onPick, onCreate }: {
  open: boolean;
  month: MonthKey;
  /** Categories not in this month yet, in the user's order. */
  hidden: Category[];
  language: string;
  t: Strings;
  onClose: () => void;
  onPick: (c: Category) => void;
  onCreate: () => void;
}) {
  return (
    <Sheet open={open} title={t.addCategoryTitle} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-label text-fg-mute wrap-prose">{fmt(t.addCategoryBody, { month: monthLabel(month, t.locale) })}</p>
        {hidden.length === 0 ? (
          <p className="text-label text-fg wrap-prose">{t.allCategoriesShown}</p>
        ) : (
          <Group>
            {hidden.map(c => {
              const name = displayName(c.names, language);
              return (
                <Row
                  key={c.id}
                  label={<span className="font-semibold">{name}</span>}
                  sub={c.kind === 'income' ? t.kindIncome : t.kindExpense}
                  leading={<Picture emoji={c.emoji} name={name} hue={c.hue} size="md" />}
                  trailing={<Plus className="w-5 h-5 text-accent" aria-hidden="true" />}
                  ariaLabel={`${t.add}: ${name}`}
                  onClick={() => { onPick(c); onClose(); }}
                />
              );
            })}
          </Group>
        )}
        <Group>
          <Row
            label={<span className="text-accent font-semibold">{t.createCategory}</span>}
            leading={<span className="w-11 h-11 rounded-sm bg-accent-dim text-accent inline-flex items-center justify-center" aria-hidden="true"><Plus className="w-5 h-5" /></span>}
            onClick={() => { onClose(); onCreate(); }}
          />
        </Group>
      </div>
    </Sheet>
  );
}
