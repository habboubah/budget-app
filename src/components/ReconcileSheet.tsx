import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { EntryDraft, MonthKey } from '../types';
import { amountToInput, formatMoney, isoDay, monthLabel, normalizeDigits, parseAmount, reconcile } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Field';

/**
 * Match the app's "Kontostand jetzt" against what the bank shows (plan 10).
 * One field, one difference, two ways to fix it: book a "Kontoabgleich" entry
 * (the default) or move the month's opening balance. Both are undoable.
 */
export function ReconcileSheet({ open, month, now, currentOpening, extraId, incomeId, t, onClose, onBook, onAdjustOpening, onAgree }: {
  open: boolean;
  month: MonthKey;
  /** The app's current account balance (cents). */
  now: number;
  /** The month's opening balance in effect now (manual or carried). */
  currentOpening: number;
  extraId: string;
  incomeId: string;
  t: Strings;
  onClose: () => void;
  /** Book the difference as a paid entry. */
  onBook: (entry: EntryDraft) => void;
  /** Move the month's opening balance to this value. */
  onAdjustOpening: (opening: number) => void;
  /** No difference: just record that it was matched today. */
  onAgree: () => void;
}) {
  const [text, setText] = useState('');
  const [how, setHow] = useState<'entry' | 'opening'>('entry');
  useEffect(() => { if (open) { setText(''); setHow('entry'); } }, [open]);

  const bank = parseAmount(text, t.locale);
  const result = bank === null ? null
    : reconcile(now, bank, { extraId, incomeId, name: t.reconcileEntryName, currentOpening, date: isoDay() });

  const save = () => {
    if (!result) return;
    if (result.diff === 0) onAgree();
    else if (how === 'entry' && result.entry) onBook(result.entry);
    else if (result.opening !== undefined) onAdjustOpening(result.opening);
    onClose();
  };

  const diffLine = () => {
    if (!result) return null;
    if (result.diff === 0) return <p className="text-label text-pos font-semibold">{t.reconcileAgrees} ✓</p>;
    const less = result.diff < 0;
    return (
      <p className="text-label text-fg wrap-prose">
        {fmt(less ? t.reconcileLess : t.reconcileMore, { amount: formatMoney(Math.abs(result.diff), t.locale) })}
      </p>
    );
  };

  return (
    <Sheet open={open} title={t.reconcileTitle} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: save, disabled: bank === null }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">{monthLabel(month, t.locale)} — {t.reconcileBody}</p>
        <Field
          label={t.reconcileBankLabel}
          value={text}
          onChange={v => setText(normalizeDigits(v))}
          placeholder={amountToInput(now, t.locale)}
          inputMode="decimal"
          autoFocus
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
        />
        {diffLine()}
        {result && result.diff !== 0 && (
          <Segmented<'entry' | 'opening'>
            label={t.reconcileHow}
            value={how}
            onChange={setHow}
            options={[
              { value: 'entry', label: t.reconcileAsEntry },
              { value: 'opening', label: t.reconcileAsOpening },
            ]}
          />
        )}
        <Button type="submit" full size="lg" icon={result?.diff === 0 ? Check : undefined} disabled={bank === null}>
          {result?.diff === 0 ? t.reconcileConfirmAgree : t.save}
        </Button>
      </form>
    </Sheet>
  );
}
