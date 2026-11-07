import { useId, useState } from 'react';
import { motion } from 'motion/react';
import { CircleMinus, Gauge, Plus } from 'lucide-react';
import { Category } from '../types';
import { displayName } from '../logic';
import { Strings } from '../translations';
import { Picture } from '../ui/Picture';
import { Menu } from '../ui/Menu';
import { tapLight } from '../ui/haptics';
import { rise } from '../ui/stagger';

/**
 * The month's categories with nothing in them yet: one row of chips at the
 * end of the page instead of a card each. A chip opens a menu — add an entry,
 * or take the category out of this month. It is a drop target like a card
 * (`data-drop-category`): an entry dragged onto it moves there, and the
 * category, no longer empty, comes back as a card in its place.
 */
export function EmptyCategories({ categories, language, t, dropOn, onAdd, onRemove, onBudget }: {
  categories: Category[];
  language: string;
  t: Strings;
  /** The category an entry is being dragged over, if it is one of these. */
  dropOn: string | null;
  onAdd: (c: Category) => void;
  onRemove: (c: Category) => void;
  /** Give a spending category a monthly budget (it then gets its card back). */
  onBudget: (c: Category) => void;
}) {
  const [menu, setMenu] = useState<{ at: HTMLElement; category: Category } | null>(null);
  const headingId = useId();
  const open = menu?.category;
  return (
    <motion.section variants={rise} aria-labelledby={headingId} className="px-1">
      <h2 id={headingId} className="mb-2 text-caption font-semibold text-fg-mute">{t.emptyCategories}</h2>
      <ul className="flex flex-wrap gap-2">
        {categories.map(c => {
          const name = displayName(c.names, language);
          return (
            <li key={c.id} className="max-w-full">
              <button
                type="button"
                data-hue={c.hue}
                data-drop-category={c.id}
                aria-haspopup="menu"
                aria-expanded={open?.id === c.id ? true : undefined}
                onClick={e => { tapLight(); setMenu({ at: e.currentTarget, category: c }); }}
                className={`max-w-full min-h-tap rounded-full bg-surface card-edge ps-1.5 pe-4 py-1.5 inline-flex items-center gap-2 text-label text-fg text-start transition-[outline-color,transform] duration-150 active:scale-[0.97] focus-visible:ring-focus ${
                  dropOn === c.id ? 'outline-2 outline-accent -outline-offset-2' : 'outline-transparent'}`}
              >
                <Picture emoji={c.emoji} name={name} size="xs" />
                <span className="min-w-0 wrap-compound">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Menu
        anchor={menu?.at ?? null}
        label={open ? displayName(open.names, language) : ''}
        groups={open ? [
          [
            { key: 'add', label: t.addEntry, icon: Plus, onSelect: () => onAdd(open) },
            ...(open.kind === 'expense' ? [{ key: 'budget', label: t.budgetMenu, icon: Gauge, onSelect: () => onBudget(open) }] : []),
          ],
          [{ key: 'remove', label: t.removeFromThisMonth, icon: CircleMinus, onSelect: () => onRemove(open) }],
        ] : []}
        onClose={() => setMenu(null)}
      />
    </motion.section>
  );
}
