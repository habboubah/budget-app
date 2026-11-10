import { useEffect, useState } from 'react';
import { CalendarDays, Check, Trash2 } from 'lucide-react';
import { Account, Entry, MonthKey, Repeat } from '../types';
import {
  MAIN_ACCOUNT, TransferDraft, accountName, amountToInput, cleanText, dayLabel, periodOf, periodRange, defaultEntryDate, isIsoDay, normalizeDigits, parseAmount,
} from '../logic';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label } from '../ui/Field';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

export type TransferSheetMode =
  | { kind: 'new'; month: MonthKey; from?: string; to?: string }
  /** Both sides of the transfer being changed (either may be missing in a book edited by hand). */
  | { kind: 'edit'; out?: Entry; in?: Entry }
  | null;

/**
 * Umbuchen (plan 30): money from one account to another — "200 € vom Giro
 * aufs Bargeld". Two linked entries, neither income nor expense. The amount
 * first, then from where and to where (two rows of the accounts), a name,
 * the day, whether it has happened yet and whether it repeats monthly.
 */
export function TransferSheet({ mode, accounts, t, onClose, onCreate, onSave, onDelete }: {
  mode: TransferSheetMode;
  accounts: Account[];
  t: Strings;
  onClose: () => void;
  onCreate: (d: TransferDraft) => void;
  onSave: (pairId: string, patch: Omit<TransferDraft, 'month'>) => void;
  onDelete: (pairId: string) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode : null;
  const side = editing ? editing.out ?? editing.in : undefined;
  const month = mode?.kind === 'new' ? mode.month : side?.month ?? '';
  const [amountText, setAmountText] = useState('');
  const [from, setFrom] = useState(MAIN_ACCOUNT);
  const [to, setTo] = useState(MAIN_ACCOUNT);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [paid, setPaid] = useState(true);
  const [monthly, setMonthly] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setTried(false);
    if (mode.kind === 'new') {
      const first = mode.from ?? MAIN_ACCOUNT;
      setFrom(first);
      setTo(mode.to ?? accounts.find(a => a.id !== first)?.id ?? MAIN_ACCOUNT);
      setAmountText('');
      setName('');
      setDate(defaultEntryDate(mode.month));
      setPaid(true);
      setMonthly(false);
    } else if (side) {
      setFrom(mode.out?.accountId ?? MAIN_ACCOUNT);
      setTo(mode.in?.accountId ?? MAIN_ACCOUNT);
      setAmountText(amountToInput(side.amount, t.locale));
      setName(side.name);
      setDate(side.date ?? '');
      setPaid(side.paid);
      setMonthly(side.repeat === 'monthly');
    }
  }, [mode]);

  const amount = parseAmount(amountText, t.locale);
  const same = from === to;
  const firstDay = month ? periodRange(month).first : undefined;
  const lastDay = month ? periodRange(month).last : undefined;
  const dateValid = !date || (isIsoDay(date) && periodOf(date) === month);
  const valid = amount !== null && amount > 0 && !same && dateValid;
  const label = (a: Account) => accountName(a, t.accountMain);

  const draft = (): Omit<TransferDraft, 'month'> | null => {
    if (!valid || amount === null) return null;
    const repeat: Repeat = monthly ? 'monthly' : 'none';
    return { from, to, amount, name: cleanText(name) || t.transferDefaultName, date: date || undefined, paid, repeat };
  };

  const save = () => {
    const d = draft();
    if (!d) { setTried(true); return; }
    if (editing && side?.transfer) onSave(side.transfer.pairId, d);
    else onCreate({ ...d, month });
    onClose();
  };

  const picker = (title: string, value: string, set: (id: string) => void) => (
    <div role="radiogroup" aria-label={title}>
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {accounts.map(a => {
          const on = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-hue={a.hue}
              onClick={() => { tapLight(); set(a.id); }}
              className={`min-h-tap ps-1.5 pe-3.5 rounded-full inline-flex items-center gap-2 text-label border-[1.5px] transition-colors focus-visible:ring-focus ${
                on ? 'bg-hue-bg text-hue-ink border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
            >
              <Picture emoji={a.emoji} name={label(a)} hue={a.hue} size="xs" />
              {label(a)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Sheet open={!!mode} title={editing ? t.transferEdit : t.transferNew} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">{t.transferHint}</p>
        <Field
          label={t.amount}
          value={amountText}
          onChange={v => setAmountText(normalizeDigits(v))}
          inputMode="decimal"
          autoFocus={!editing}
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
        />
        {picker(t.transferFrom, from, setFrom)}
        {picker(t.transferTo, to, setTo)}
        {same && tried && <p role="alert" className="text-caption text-neg px-1">{t.transferSame}</p>}
        <Field label={t.transferName} value={name} onChange={setName} placeholder={t.transferDefaultName} maxLength={80} enterKeyHint="done" />
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.entryDetails}>
          <label className={`relative min-h-tap ps-2 pe-3 rounded-full inline-flex items-center gap-1 bg-surface-2 text-label font-medium focus-within:ring-focus ${dateValid ? 'text-fg' : 'text-neg'}`}>
            <CalendarDays className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
            <span aria-hidden="true">{date ? dayLabel(date, t.locale) : t.date}</span>
            <input
              type="date"
              value={date}
              min={firstDay}
              max={lastDay}
              onChange={e => setDate(e.target.value)}
              onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* the tap still focuses it */ } }}
              aria-label={`${t.date}: ${date ? dayLabel(date, t.locale) : ''}`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={paid}
            aria-label={t.transferDoneSwitch}
            onClick={() => { tapLight(); setPaid(v => !v); }}
            className="min-h-tap ps-2 pe-3 rounded-full inline-flex items-center gap-1 bg-surface-2 text-label font-medium text-fg active:opacity-60 focus-visible:ring-focus"
          >
            <span className={`w-4 h-4 shrink-0 rounded-full inline-flex items-center justify-center ${paid ? 'bg-swipe-paid text-on-color' : 'border-[1.75px] border-warn'}`} aria-hidden="true">
              {paid && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
            </span>
            <span className={paid ? '' : 'text-warn'} aria-hidden="true">{paid ? t.transferDoneState : t.open}</span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={monthly}
            onClick={() => { tapLight(); setMonthly(v => !v); }}
            className={`min-h-tap px-3 rounded-full inline-flex items-center gap-1 text-label font-medium active:opacity-60 focus-visible:ring-focus ${monthly ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-fg'}`}
          >
            {t.transferMonthly}
          </button>
        </div>
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!valid}>{editing ? t.save : t.add}</Button>
          {editing && side?.transfer && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(side.transfer!.pairId); }}>{t.transferDelete}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
