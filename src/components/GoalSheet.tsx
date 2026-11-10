import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Goal, Hue, MonthKey } from '../types';
import { amountToInput, cleanText, isMonthKey, normalizeDigits, parseAmount, currencySymbol } from '../logic';
import { CATEGORY_EMOJIS } from '../data/defaults';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label } from '../ui/Field';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { EmojiPicker, HuePicker } from '../ui/PicturePicker';

export type GoalSheetMode = { kind: 'new'; preset?: { name?: string; target?: number; due?: MonthKey } } | { kind: 'edit'; goal: Goal } | null;
export type GoalDraft = Omit<Goal, 'id' | 'createdAt' | 'closedAt'>;

/**
 * Create or edit a savings goal (plan 12): name, emoji, colour, target, and
 * optionally a month to reach it by and an amount already saved.
 */
export function GoalSheet({ mode, t, onClose, onCreate, onSave, onDelete }: {
  mode: GoalSheetMode;
  t: Strings;
  onClose: () => void;
  onCreate: (draft: GoalDraft) => void;
  onSave: (id: string, patch: Partial<Goal>) => void;
  onDelete: (goal: Goal) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.goal : null;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [hue, setHue] = useState<Hue>('mint');
  const [target, setTarget] = useState('');
  const [due, setDue] = useState('');
  const [start, setStart] = useState('');

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      const g = mode.goal;
      setName(g.name); setEmoji(g.emoji); setHue(g.hue);
      setTarget(amountToInput(g.target, t.locale));
      setDue(g.due ?? '');
      setStart(g.start ? amountToInput(g.start, t.locale) : '');
    } else {
      setName(mode.preset?.name ?? '');
      setEmoji('🎯'); setHue('mint');
      setTarget(mode.preset?.target ? amountToInput(mode.preset.target, t.locale) : '');
      setDue(mode.preset?.due ?? '');
      setStart('');
    }
  }, [mode]);

  const clean = cleanText(name, 40);
  const targetValue = parseAmount(target, t.locale);
  const startValue = start.trim() ? parseAmount(start, t.locale) : null;
  const dueKey: MonthKey | undefined = isMonthKey(due) ? due : undefined;
  const dueInvalid = due.trim() !== '' && !dueKey;
  const canSave = !!clean && targetValue !== null && targetValue > 0 && !dueInvalid;

  const save = () => {
    if (!canSave || targetValue === null) return;
    const draft: GoalDraft = {
      name: clean, emoji, hue, target: targetValue,
      ...(dueKey ? { due: dueKey } : {}),
      ...(startValue && startValue > 0 ? { start: startValue } : {}),
    };
    if (editing) onSave(editing.id, { ...draft, due: dueKey, start: startValue && startValue > 0 ? startValue : undefined });
    else onCreate(draft);
    onClose();
  };

  return (
    <Sheet open={!!mode} title={editing ? t.goalEdit : t.goalNew} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        <div className="flex items-end gap-3">
          <Picture emoji={emoji} name={clean || '?'} hue={hue} size="lg" />
          <div className="flex-1 min-w-0">
            <Field label={t.goalName} value={name} onChange={setName} placeholder={t.goalNamePlaceholder} maxLength={40} autoFocus={!editing} enterKeyHint="done" />
          </div>
        </div>
        <Field
          label={t.goalTarget}
          value={target}
          onChange={v => setTarget(normalizeDigits(v))}
          inputMode="decimal"
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
        />
        <div>
          <Label htmlFor="goal-due">{t.goalDue}</Label>
          <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
            <input
              id="goal-due"
              type="month"
              value={due}
              onChange={e => setDue(e.target.value)}
              className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg outline-none"
            />
          </div>
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.goalDueHint}</p>
        </div>
        <Field
          label={t.goalStart}
          value={start}
          onChange={v => setStart(normalizeDigits(v))}
          inputMode="decimal"
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
        />
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
            <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.goalDelete}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
