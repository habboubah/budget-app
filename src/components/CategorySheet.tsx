import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Budget, Category, CategoryKind, Hue, Repeat } from '../types';
import { cleanText, displayName, uid } from '../logic';
import { CATEGORY_EMOJIS, budgetOf } from '../data/defaults';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label, Segmented } from '../ui/Field';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { EmojiPicker, HuePicker } from '../ui/PicturePicker';
import { Switch } from '../ui/Switch';

export type CategorySheetMode = { kind: 'new' } | { kind: 'edit'; category: Category } | null;

/** Create a category, or rename / repaint / retype one. */
export function CategorySheet({ mode, language, t, onClose, onCreate, onSave, onDelete }: {
  mode: CategorySheetMode;
  language: string;
  t: Strings;
  onClose: () => void;
  onCreate: (c: Category) => void;
  onSave: (id: string, patch: Partial<Category>) => void;
  onDelete: (c: Category) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.category : null;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [hue, setHue] = useState<Hue>('sky');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [budget, setBudget] = useState<Budget>('want');
  const [standard, setStandard] = useState(true);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      const c = mode.category;
      setName(displayName(c.names, language)); setEmoji(c.emoji); setHue(c.hue); setKind(c.kind); setRepeat(c.repeat); setBudget(budgetOf(c)); setStandard(c.standard !== false);
    } else {
      setName(''); setEmoji('📦'); setHue('sky'); setKind('expense'); setRepeat('none'); setBudget('want'); setStandard(true);
    }
  }, [mode]);

  const clean = cleanText(name, 40);
  const save = () => {
    if (!clean) return;
    if (editing) {
      // Renaming in one language replaces the built-in translations: the
      // user's name is the name now, whatever the app language.
      const names = clean === displayName(editing.names, language) ? editing.names : { [language]: clean };
      onSave(editing.id, { names, emoji, hue, kind, repeat, budget, standard });
    } else {
      onCreate({ id: uid(), names: { [language]: clean }, emoji, hue, kind, repeat, budget, standard });
    }
    onClose();
  };

  return (
    <Sheet open={!!mode} title={editing ? t.editCategory : t.newCategory} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !clean }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        <div className="flex items-end gap-3">
          <Picture emoji={emoji} name={clean || '?'} hue={hue} size="lg" />
          <div className="flex-1 min-w-0">
            <Field label={t.categoryName} value={name} onChange={setName} placeholder={t.categoryNamePlaceholder}
              maxLength={40} autoFocus={!editing} enterKeyHint="done" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 rounded-md bg-surface-2 ps-4 pe-1">
            <span className="flex-1 min-w-0 text-body text-fg">{t.inNewMonths}</span>
            <Switch checked={standard} onChange={setStandard} label={t.inNewMonths} />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.inNewMonthsHint}</p>
        </div>
        <div>
          <Label>{t.kind}</Label>
          <Segmented<CategoryKind>
            label={t.kind}
            value={kind}
            onChange={setKind}
            options={[{ value: 'expense', label: t.kindExpense }, { value: 'income', label: t.kindIncome }]}
          />
        </div>
        {kind === 'expense' && (
          <div>
            <Label>{t.budgetKind}</Label>
            <Segmented<Budget>
              label={t.budgetKind}
              value={budget}
              onChange={setBudget}
              options={[{ value: 'need', label: t.budgetNeed }, { value: 'want', label: t.budgetWant }, { value: 'save', label: t.budgetSave }]}
            />
            <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.budgetKindHint}</p>
          </div>
        )}
        <div>
          <Label>{t.defaultRepeat}</Label>
          <Segmented<Repeat>
            label={t.defaultRepeat}
            value={repeat}
            onChange={setRepeat}
            options={[
              { value: 'none', label: t.repeatNone },
              { value: 'monthly', label: t.repeatMonthly },
              { value: 'yearly', label: t.repeatYearly },
            ]}
          />
        </div>
        <div>
          <Label>{t.picture}</Label>
          <EmojiPicker value={emoji} emojis={CATEGORY_EMOJIS} onChange={setEmoji} label={t.picture} />
        </div>
        <div>
          <Label>{t.colour}</Label>
          <HuePicker value={hue} onChange={setHue} label={t.colour} />
        </div>
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!clean}>{editing ? t.save : t.add}</Button>
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.deleteCategory}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
