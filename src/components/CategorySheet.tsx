import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AppData, Budget, Category, CategoryKind, Hue, Repeat } from '../types';
import { amountToInput, cleanText, displayName, normalizeDigits, parseAmount, uid } from '../logic';
import { suggestLimit } from '../budgets';
import { CATEGORY_EMOJIS, budgetOf } from '../data/defaults';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label, Segmented } from '../ui/Field';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { EmojiPicker, HuePicker } from '../ui/PicturePicker';
import { Switch } from '../ui/Switch';
import { BudgetSuggestion } from './BudgetSheet';
import { KeywordEditor } from './KeywordEditor';
import { isShippedList, keywordIdeas, keywordOwners, keywordsForName, keywordsOf } from '../keywords';
import { shippedKeywords } from '../data/keywords';

export type CategorySheetMode = { kind: 'new' } | { kind: 'edit'; category: Category } | null;

/**
 * Create a category, or rename / retype / repaint one: its name, whether it
 * is money in or out, its keywords (plan 32: what typed as an entry's name
 * points here), a spending category's monthly budget (with what it cost on
 * average as a suggestion), whether every new month starts with it, how it
 * counts for 50/30/20, its picture and colour.
 */
export function CategorySheet({ mode, data, language, t, onClose, onCreate, onSave, onDelete }: {
  mode: CategorySheetMode;
  /** For the budget suggestion: the last finished months' spending. */
  data: AppData;
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
  /** The monthly budget as typed; empty: none. */
  const [limit, setLimit] = useState('');
  /** Its keywords as they stand in the editor; stored only once changed (else a built-in keeps following what ships). */
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsChanged, setKeywordsChanged] = useState(false);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      const c = mode.category;
      setName(displayName(c.names, language)); setEmoji(c.emoji); setHue(c.hue); setKind(c.kind); setRepeat(c.repeat); setBudget(budgetOf(c)); setStandard(c.standard !== false);
      setLimit(c.limit ? amountToInput(c.limit, t.locale) : '');
      setKeywords(keywordsOf(c, language));
    } else {
      setName(''); setEmoji('📦'); setHue('sky'); setKind('expense'); setRepeat('none'); setBudget('want'); setStandard(true); setLimit('');
      setKeywords([]);
    }
    setKeywordsChanged(false);
  }, [mode]);

  const clean = cleanText(name, 40);
  const limitValue = limit.trim() ? parseAmount(limit, t.locale) : null;
  const limitInvalid = kind === 'expense' && limit.trim() !== '' && !(limitValue !== null && limitValue > 0);
  const suggestion = editing && kind === 'expense' ? suggestLimit(data, editing.id) : null;
  const canSave = !!clean && !limitInvalid;
  const changeKeywords = (next: string[]) => { setKeywords(next); setKeywordsChanged(true); };
  // Ideas: names often entered here that no keyword catches; for a new one, the closest built-in's keywords ("Fitness" → Gym …).
  const ideas = useMemo(
    () => (editing ? keywordIdeas({ category: editing, keywords, entries: data.entries, lang: language }) : keywordsForName(clean, language)),
    [editing, keywords, data.entries, language, clean],
  );
  const canReset = !!editing && shippedKeywords(editing.id, language).length > 0 && !isShippedList(editing, keywords, language);

  const save = () => {
    if (!canSave) return;
    // A budget only for spending; an income category drops one it had.
    const next = { emoji, hue, kind, repeat, budget, standard, limit: kind === 'expense' && limitValue ? limitValue : undefined };
    if (editing) {
      // Renaming in one language replaces the built-in translations: the
      // user's name is the name now, whatever the app language.
      const names = clean === displayName(editing.names, language) ? editing.names : { [language]: clean };
      // Keywords only once touched; a list that says what ships goes back to following it.
      const words = keywordsChanged ? { keywords: isShippedList(editing, keywords, language) ? undefined : keywords } : {};
      onSave(editing.id, { names, ...next, ...words });
    } else {
      const { limit: l, ...rest } = next;
      onCreate({ id: uid(), names: { [language]: clean }, ...rest, ...(l ? { limit: l } : {}), ...(keywords.length ? { keywords } : {}) });
    }
    onClose();
  };

  return (
    <Sheet open={!!mode} title={editing ? t.editCategory : t.newCategory} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        <div className="flex items-end gap-3">
          <Picture emoji={emoji} name={clean || '?'} hue={hue} size="lg" />
          <div className="flex-1 min-w-0">
            <Field label={t.categoryName} value={name} onChange={setName} placeholder={t.categoryNamePlaceholder}
              maxLength={40} autoFocus={!editing} enterKeyHint="done" />
          </div>
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
        <KeywordEditor
          keywords={keywords}
          onChange={changeKeywords}
          ideas={ideas}
          ideasLabel={editing ? t.keywordIdeas : t.suggestions}
          alsoIn={word => keywordOwners(data.categories, word, language, editing?.id)}
          onReset={canReset ? () => changeKeywords(shippedKeywords(editing!.id, language)) : undefined}
          t={t}
        />
        {kind === 'expense' && (
          <div>
            <Field
              label={t.budgetField}
              value={limit}
              onChange={v => setLimit(normalizeDigits(v))}
              inputMode="decimal"
              enterKeyHint="done"
              aria-invalid={limitInvalid || undefined}
              trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
            />
            {suggestion && suggestion.amount !== limitValue && (
              <BudgetSuggestion suggestion={suggestion} t={t} onTake={() => setLimit(amountToInput(suggestion.amount, t.locale))} />
            )}
            <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.budgetFieldHint}</p>
          </div>
        )}
        <div>
          <div className="flex items-center gap-3 rounded-md bg-surface-2 ps-4 pe-1">
            <span className="flex-1 min-w-0 text-body text-fg">{t.inNewMonths}</span>
            <Switch checked={standard} onChange={setStandard} label={t.inNewMonths} />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.inNewMonthsHint}</p>
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
          <Label>{t.picture}</Label>
          <EmojiPicker value={emoji} emojis={CATEGORY_EMOJIS} onChange={setEmoji} label={t.picture} />
        </div>
        <div>
          <Label>{t.colour}</Label>
          <HuePicker value={hue} onChange={setHue} label={t.colour} />
        </div>
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!canSave}>{editing ? t.save : t.add}</Button>
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.deleteCategory}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
