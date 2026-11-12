import { useEffect, useState } from 'react';
import { amountToInput, parseAmount, normalizeDigits, currencySymbol } from '../logic';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

/**
 * "How much is on your account right now?" — for a book that has no balance
 * yet (plan 39): the balance card asks for it, and so does the month's "⋯".
 * One figure, as the banking app shows it; App turns it into the running
 * month's opening (what is ticked since came after the month began). May be
 * negative, for an overdrawn account.
 */
export function BalanceNowSheet({ open, t, onClose, onSave }: {
  open: boolean;
  t: Strings;
  onClose: () => void;
  onSave: (cents: number) => void;
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);

  const negative = /^\s*[-−]/.test(text);
  const abs = parseAmount(text.replace(/^\s*[-−]\s*/, ''), t.locale);
  const value = abs === null ? null : negative ? -abs : abs;

  const save = () => {
    if (value === null) return;
    onSave(value);
    onClose();
  };

  return (
    <Sheet open={open} title={t.balanceNow} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: save, disabled: value === null }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <div>
          <Field
            label={t.setupBalance}
            value={text}
            onChange={v => setText(normalizeDigits(v))}
            placeholder={amountToInput(0, t.locale)}
            inputMode="decimal"
            autoFocus
            enterKeyHint="done"
            trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
          />
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.setupBalanceHint}</p>
        </div>
        <Button type="submit" full size="lg" disabled={value === null}>{t.save}</Button>
      </form>
    </Sheet>
  );
}
