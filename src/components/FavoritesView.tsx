import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Category, Favorite } from '../types';
import { Strings } from '../translations';
import { displayName, formatMoneyShort } from '../logic';
import { ActionRow, Empty, Group, Screen } from '../ui/Screen';
import { IconButton } from '../ui/Button';

/**
 * Mehr › Haushaltsbuch › Favoriten (pushed, plan 09): the pinned entries,
 * to reorder (up / down) and remove (with an undo toast). Pinning happens in
 * the entry sheet; this screen only manages what is there.
 */
export function FavoritesView({ favorites, categories, t, language, onReorder, onRemove, onBack }: {
  favorites: Favorite[];
  categories: Category[];
  t: Strings;
  language: string;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
}) {
  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= favorites.length) return;
    const ids = favorites.map(f => f.id);
    [ids[index], ids[to]] = [ids[to], ids[index]];
    onReorder(ids);
  };

  return (
    <Screen title={t.favoritesManage} onBack={onBack} backLabel={t.back} tabbed>
      {favorites.length === 0 ? (
        <Empty emoji="⭐️" title={t.favoritesEmpty} body={t.favoritesEmptyBody} />
      ) : (
        <Group footer={t.favoritesFooter}>
          {favorites.map((f, i) => {
            const c = categories.find(x => x.id === f.categoryId);
            return (
              <ActionRow
                key={f.id}
                label={<span className="inline-flex items-center gap-1.5">{c?.emoji && <span className="emoji text-[15px]" aria-hidden="true">{c.emoji}</span>}{f.name}</span>}
                sub={[c ? displayName(c.names, language) : '', f.amount !== undefined ? formatMoneyShort(f.amount, t.locale) : ''].filter(Boolean).join(' · ')}
                onClick={() => {}}
                ariaLabel={f.name}
                actions={
                  <>
                    <IconButton label={`${t.moveUp} — ${f.name}`} icon={ArrowUp} onClick={() => move(i, -1)} className={i === 0 ? 'opacity-30 pointer-events-none' : ''} />
                    <IconButton label={`${t.moveDown} — ${f.name}`} icon={ArrowDown} onClick={() => move(i, 1)} className={i === favorites.length - 1 ? 'opacity-30 pointer-events-none' : ''} />
                    <IconButton label={`${t.deleteEntry} — ${f.name}`} icon={Trash2} tone="danger" onClick={() => onRemove(f.id)} />
                  </>
                }
              />
            );
          })}
        </Group>
      )}
    </Screen>
  );
}
