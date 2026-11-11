import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AppData, Category } from '../types';
import { amountToInput, displayName, formatMoneyShort, normalizeDigits, parseAmount, currencySymbol } from '../logic';
import { suggestLimit } from '../budgets';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Segmented } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

interface Props {
  /** The category whose budget is set; null while closed. */
  category: Category | null;
  /** For the suggestion: the last finished months' spending. */
  data: AppData;
  language: string;
  t: Strings;
  onClose: () => void;
  /** `undefined`: no budget any more. `how`: for the year, or with the rest carried into the next month (schema 25). */
  onSave: (category: Category, limit: number | undefined, how?: BudgetHow) => void;
  /** *Verlauf ansehen*: the category's own screen. */
  onHistory?: (category: Category) => void;
}

/** "Vorschlag: 650 € (Ø 3 Monate)" under a budget field — tap to take it. */
export function BudgetSuggestion({ suggestion, t, onTake }: {
  suggestion: { amount: number; months: number };
  t: Strings;
  onTake: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onTake(); }}
      className="hit-44 mt-2.5 min-h-[36px] max-w-full rounded-full bg-accent-dim ps-3 pe-3.5 py-1.5 inline-flex items-center gap-1.5 text-label font-medium text-accent text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
    >
      <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span className="min-w-0 wrap-prose tabular-nums">
        {fmt(suggestion.months === 1 ? t.budgetSuggestOne : t.budgetSuggestMany, { amount: formatMoneyShort(suggestion.amount, t.locale), n: suggestion.months })}
      </span>
    </button>
  );
}

/** How a budget counts: per month (the default), per year, or per month with the rest carried on. */
export interface BudgetHow { per: 'month' | 'year'; rollover: boolean }

/**
 * A spending category's budget: one amount — a month by default, the same
 * every month; for the whole year (clothes, holidays); or a month whose rest
 * moves into the next (schema 25). Offers what the category cost on average
 * over the last finished months (rounded up) as a start — times twelve for a
 * year — and removes a budget that is there.
 */
export function BudgetSheet({ category, data, language, t, onClose, onSave, onHistory }: Props) {
  const [text, setText] = useState('');
  const [per, setPer] = useState<'month' | 'year'>('month');
  const [rollover, setRollover] = useState(false);
  useEffect(() => {
    if (!category) return;
    setText(category.limit ? amountToInput(category.limit, t.locale) : '');
    setPer(category.limit && category.limitPer === 'year' ? 'year' : 'month');
    setRollover(!!category.limit && !!category.rollover);
  }, [category]);
  if (!category) return null;

  const c = category;
  const name = displayName(c.names, language);
  const monthly = suggestLimit(data, c.id);
  const suggestion = monthly && per === 'year' ? { ...monthly, amount: monthly.amount * 12 } : monthly;
  const value = parseAmount(text, t.locale);
  const valid = value !== null && value > 0;
  const save = () => {
    if (!valid) return;
    onSave(c, value!, { per, rollover: per === 'month' && rollover });
    onClose();
  };

  return (
    <Sheet open title={t.budgetsTitle} closeLabel={t.cancel} onClose={onClose} action={{ label: t.save, onClick: save, disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <div className="flex items-center gap-3">
          <Picture emoji={c.emoji} name={name} hue={c.hue} size="md" />
          <p className="min-w-0 flex-1 text-label text-fg-mute wrap-prose">{fmt(t.budgetAsk, { name })}</p>
        </div>
        <Segmented
          label={t.budgetTitle}
          value={per}
          options={[{ value: 'month', label: t.budgetPerMonth }, { value: 'year', label: t.budgetPerYear }]}
          onChange={setPer}
        />
        <div>
          <Field
            label={per === 'year' ? t.budgetFieldYear : t.budgetField}
            value={text}
            onChange={v => setText(normalizeDigits(v))}
            placeholder={suggestion ? amountToInput(suggestion.amount, t.locale) : '0,00'}
            inputMode="decimal"
            autoFocus
            enterKeyHint="done"
            trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
          />
          {suggestion && suggestion.amount !== value && (
            <BudgetSuggestion suggestion={suggestion} t={t} onTake={() => setText(amountToInput(suggestion.amount, t.locale))} />
          )}
        </div>
        {per === 'month' ? (
          <div>
            <div className="min-h-tap flex items-center gap-3">
              <span className="min-w-0 flex-1 text-body text-fg wrap-prose" aria-hidden="true">{t.budgetRollover}</span>
              <Switch checked={rollover} onChange={setRollover} label={t.budgetRollover} />
            </div>
            <p className="text-caption text-fg-mute wrap-prose">{t.budgetRolloverHint}</p>
          </div>
        ) : (
          <p className="text-caption text-fg-mute wrap-prose">{t.budgetYearHint}</p>
        )}
        <div className="grid gap-2">
          <Button type="submit" full size="lg" disabled={!valid}>{t.save}</Button>
          {c.limit !== undefined && (
            <Button variant="ghost" full onClick={() => { onSave(c, undefined); onClose(); }}>{t.budgetRemove}</Button>
          )}
          {onHistory && (
            <Button variant="ghost" full onClick={() => { onClose(); onHistory(c); }}>{t.budgetHistory}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
