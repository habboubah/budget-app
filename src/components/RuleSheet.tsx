import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Category, Rule } from '../types';
import { cleanText, displayName } from '../logic';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label, Segmented } from '../ui/Field';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

export type RuleSheetMode = { kind: 'new'; preset?: Partial<Rule> } | { kind: 'edit'; rule: Rule } | null;
export type RuleDraft = Omit<Rule, 'id' | 'createdAt'>;

/**
 * Create or edit an import rule (plan 20): a field + text to match, then
 * either a category (and optional name), or "nicht übernehmen" for a transfer.
 */
export function RuleSheet({ mode, categories, language, t, onClose, onCreate, onSave, onDelete }: {
  mode: RuleSheetMode;
  categories: Category[];
  language: string;
  t: Strings;
  onClose: () => void;
  onCreate: (draft: RuleDraft) => void;
  onSave: (id: string, patch: Partial<Rule>) => void;
  onDelete: (rule: Rule) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.rule : null;
  const [field, setField] = useState<Rule['match']['field']>('payee');
  const [contains, setContains] = useState('');
  const [skip, setSkip] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!mode) return;
    const r = mode.kind === 'edit' ? mode.rule : mode.preset;
    setField(r?.match?.field ?? 'payee');
    setContains(r?.match?.contains ?? '');
    const s = r?.set;
    setSkip(!!s && 'skip' in s);
    setCategoryId(s && !('skip' in s) ? s.categoryId ?? '' : '');
    setName(s && !('skip' in s) ? s.name ?? '' : '');
  }, [mode]);

  const expenses = categories.filter(c => c.kind === 'expense');
  const canSave = contains.trim().length > 0 && (skip || !!categoryId || !!cleanText(name));

  const save = () => {
    if (!canSave) return;
    const set: Rule['set'] = skip
      ? { skip: true }
      : { ...(categoryId ? { categoryId } : {}), ...(cleanText(name) ? { name: cleanText(name) } : {}) };
    const draft: RuleDraft = { match: { field, contains: contains.trim() }, set };
    if (editing) onSave(editing.id, draft);
    else onCreate(draft);
    onClose();
  };

  return (
    <Sheet open={!!mode} title={editing ? t.ruleEdit : t.ruleNew} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <div>
          <Label>{t.ruleWhen}</Label>
          <Segmented<Rule['match']['field']>
            label={t.ruleWhen}
            value={field}
            onChange={setField}
            options={[
              { value: 'payee', label: t.rulePayee },
              { value: 'name', label: t.ruleName },
              { value: 'purpose', label: t.rulePurpose },
            ]}
          />
        </div>
        <Field label={t.ruleContains} value={contains} onChange={setContains} placeholder="REWE" maxLength={80} autoFocus={!editing} enterKeyHint="done" />
        <div className="flex items-center gap-3 rounded-md bg-surface-2 ps-4 pe-1 min-h-control">
          <span className="flex-1 min-w-0 text-body text-fg wrap-compound">{t.ruleSkip}</span>
          <Switch checked={skip} onChange={setSkip} label={t.ruleSkip} />
        </div>
        {!skip && (
          <>
            <div>
              <Label htmlFor="rule-cat">{t.ruleCategory}</Label>
              <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
                <select id="rule-cat" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg outline-none">
                  <option value="">{t.ruleCategoryKeep}</option>
                  {expenses.map(c => <option key={c.id} value={c.id}>{displayName(c.names, language)}</option>)}
                </select>
              </div>
            </div>
            <Field label={t.ruleRename} value={name} onChange={setName} placeholder={t.ruleRenamePlaceholder} maxLength={80} enterKeyHint="done" />
          </>
        )}
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!canSave}>{editing ? t.save : t.add}</Button>
          {editing && <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.ruleDelete}</Button>}
        </div>
      </form>
    </Sheet>
  );
}
