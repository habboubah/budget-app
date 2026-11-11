import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Project } from '../types';
import { amountToInput, cleanText, currencySymbol, isIsoDay, normalizeDigits, parseAmount, projectTag } from '../logic';
import { ProjectStatus } from '../insights';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { EmojiPicker } from '../ui/PicturePicker';
import { projectLine } from './ProjectsView';

export type ProjectSheetMode = { kind: 'new' } | { kind: 'edit'; status: ProjectStatus } | null;
export type ProjectDraft = Omit<Project, 'id' | 'createdAt'>;

const EMOJIS = ['🧳', '🏖️', '✈️', '🏕️', '🚚', '🏠', '🛠️', '👶', '💍', '🎂', '🎄', '🚗', '🎓', '🐶', '🎁', '⚽'];

/**
 * Create or edit a trip or project (schema 28): its name — the tag follows
 * from it — a budget, its first and last day, and for a trip abroad the
 * currency amounts are typed in with its rate. An existing one shows what it
 * has cost so far, and can be closed or deleted (its entries keep their tag).
 */
export function ProjectSheet({ mode, taken, t, onClose, onCreate, onSave, onDelete }: {
  mode: ProjectSheetMode;
  /** The tags other projects use: a new one must differ. */
  taken: string[];
  t: Strings;
  onClose: () => void;
  onCreate: (draft: ProjectDraft) => void;
  onSave: (id: string, patch: Partial<ProjectDraft>) => void;
  onDelete: (project: Project) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.status.project : null;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🧳');
  const [budget, setBudget] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currency, setCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!mode) return;
    const p = mode.kind === 'edit' ? mode.status.project : null;
    setName(p?.name ?? ''); setEmoji(p?.emoji ?? '🧳');
    setBudget(p?.budget ? amountToInput(p.budget, t.locale) : '');
    setFrom(p?.from ?? ''); setTo(p?.to ?? '');
    setCurrency(p?.currency ?? ''); setRate(p?.rate ? String(p.rate).replace('.', t.locale.startsWith('en') ? '.' : ',') : '');
    setClosed(!!p?.closed);
  }, [mode]);
  if (!mode) return null;

  const clean = cleanText(name, 40);
  // The tag stays what it was once entries may carry it.
  const tag = editing?.tag ?? projectTag(clean);
  const clash = !editing && !!tag && taken.includes(tag);
  const budgetValue = budget.trim() ? parseAmount(budget, t.locale) : null;
  const budgetBad = budget.trim() !== '' && !(budgetValue !== null && budgetValue > 0);
  const datesBad = (from !== '' && !isIsoDay(from)) || (to !== '' && !isIsoDay(to)) || (!!from && !!to && to < from);
  const code = currency.trim().toUpperCase();
  const rateValue = Number(normalizeDigits(rate).replace(',', '.'));
  const foreign = code !== '' || rate.trim() !== '';
  const foreignBad = foreign && !(/^[A-Z]{3}$/.test(code) && Number.isFinite(rateValue) && rateValue > 0);
  const canSave = !!clean && !!tag && !clash && !budgetBad && !datesBad && !foreignBad;

  const save = () => {
    if (!canSave) return;
    const draft: ProjectDraft = {
      name: clean, emoji, tag,
      ...(budgetValue ? { budget: budgetValue } : {}),
      ...(from ? { from } : {}), ...(to ? { to } : {}),
      ...(foreign ? { currency: code, rate: rateValue } : {}),
      ...(closed ? { closed: true } : {}),
    };
    if (editing) onSave(editing.id, { ...draft, budget: draft.budget, from: draft.from, to: draft.to, currency: draft.currency, rate: draft.rate, closed: draft.closed });
    else onCreate(draft);
    onClose();
  };

  return (
    <Sheet open title={editing ? editing.name : t.projectAdd} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        {mode.kind === 'edit' && (
          <p className="text-label text-fg-mute tabular-nums wrap-prose">{projectLine(mode.status, t)} · {fmt(t.projectEntries, { n: mode.status.count })}</p>
        )}
        <div>
          <Field label={t.projectName} value={name} onChange={setName} placeholder={t.projectNamePlaceholder} maxLength={40} autoFocus={!editing} enterKeyHint="done" aria-invalid={clash || undefined} />
          <p className={`text-caption mt-1.5 px-1 wrap-prose ${clash ? 'text-neg' : 'text-fg-mute'}`} role={clash ? 'alert' : undefined}>
            {clash ? t.projectTagTaken : tag ? fmt(t.projectTagHint, { tag: `#${tag}` }) : t.projectTagEmpty}
          </p>
        </div>
        <Field
          label={t.projectBudget}
          value={budget}
          onChange={v => setBudget(normalizeDigits(v))}
          inputMode="decimal"
          enterKeyHint="done"
          aria-invalid={budgetBad || undefined}
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
        />
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.projectFrom} type="date" value={from} onChange={setFrom} aria-invalid={datesBad || undefined} />
            <Field label={t.projectTo} type="date" value={to} min={from || undefined} onChange={setTo} aria-invalid={datesBad || undefined} />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.projectDatesHint}</p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.projectCurrency} value={currency} onChange={v => setCurrency(v.toUpperCase().slice(0, 3))} placeholder="TRY" maxLength={3} autoCapitalize="characters" aria-invalid={foreignBad || undefined} />
            <Field label={fmt(t.projectRate, { one: `1 ${currencySymbol()}` })} value={rate} onChange={v => setRate(normalizeDigits(v))} placeholder="38,5" inputMode="decimal" aria-invalid={foreignBad || undefined} />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.projectCurrencyHint}</p>
        </div>
        <div>
          <EmojiPicker value={emoji} emojis={EMOJIS} onChange={setEmoji} label={t.picture} />
        </div>
        {editing && (
          <div className="min-h-tap flex items-center gap-3">
            <span className="min-w-0 flex-1 text-body text-fg wrap-prose" aria-hidden="true">{t.projectClose}</span>
            <Switch checked={closed} onChange={setClosed} label={t.projectClose} />
          </div>
        )}
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!canSave}>{editing ? t.save : t.add}</Button>
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.projectDelete}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
