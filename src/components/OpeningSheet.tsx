import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MonthKey } from '../types';
import { amountToInput, formatMoney, monthLabel, parseAmount } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  month: MonthKey;
  /** The opening in use now (manual or carried). */
  current: number;
  overridden: boolean;
  /** Where the automatic carry-over comes from, and how much it is. */
  prevKey?: MonthKey;
  carried?: number;
  t: Strings;
  onClose: () => void;
  /** `undefined` = go back to the automatic carry-over. */
  onSave: (cents: number | undefined) => void;
}

/**
 * The balance a month starts with. Normally carried over from the month
 * before; set by hand for the very first month, or when the real account has
 * drifted from the book. Can be negative (an overdrawn account).
 */
export function OpeningSheet({ open, month, current, overridden, prevKey, carried, t, onClose, onSave }: Props) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(overridden || !prevKey ? (current ? (current < 0 ? '-' : '') + amountToInput(Math.abs(current), t.locale) : '') : '');
  }, [open]);

  const negative = /^\s*[-−]/.test(text);
  const abs = parseAmount(text.replace(/^\s*[-−]\s*/, ''), t.locale);
  const value = abs === null ? null : negative ? -abs : abs;

  const save = () => {
    if (value === null) return;
    onSave(value);
    onClose();
  };

  return (
    <Sheet open={open} title={prevKey ? t.openingTitle : t.startingBalance} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: save, disabled: value === null }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">
          {monthLabel(month, t.locale)} — {prevKey ? t.openingBody : t.openingFirstBody}
        </p>
        <Field
          label={prevKey ? t.carryManual : t.startingBalance}
          value={text}
          onChange={setText}
          placeholder={carried !== undefined ? amountToInput(carried, t.locale) : '0,00'}
          inputMode="decimal"
          autoFocus
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
        />
        <div className="grid gap-2">
          <Button type="submit" full size="lg" disabled={value === null}>{t.save}</Button>
          {prevKey && carried !== undefined && overridden && (
            <Button variant="ghost" full icon={RotateCcw} onClick={() => { onSave(undefined); onClose(); }}>
              {fmt(t.openingAuto, { month: monthLabel(prevKey, t.locale), amount: formatMoney(carried, t.locale) })}
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
