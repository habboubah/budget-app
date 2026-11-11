import { perShort } from '../repeatLabel';
import { useEffect, useState } from 'react';
import { Category, Contract } from '../types';
import { formatMoney, isIsoDay } from '../logic';
import { ContractItem, nextDeadline } from '../contracts';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { MenuPicker } from '../ui/Card';
import { Picture } from '../ui/Picture';

interface Props {
  /** The contract whose details are edited; null while closed. */
  item: ContractItem | null;
  category?: Category;
  t: Strings;
  onClose: () => void;
  /** `undefined`: no details any more. */
  onSave: (item: ContractItem, contract: Contract | undefined) => void;
}

const NOTICE = [0, 1, 2, 3, 6, 12];
const RENEWS = [1, 3, 6, 12, 24];

/** "Montag, 30. November 2026" — a deadline worth reading in full. */
const longDate = (iso: string, locale: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
};

/**
 * A recurring cost's contract details: when it runs until, the notice it
 * needs, how long it renews by when not cancelled, a note (the customer
 * number). Says at once by when to cancel, and removes details that are there.
 */
export function ContractSheet({ item, category, t, onClose, onSave }: Props) {
  const [end, setEnd] = useState('');
  const [notice, setNotice] = useState(0);
  const [renews, setRenews] = useState(12);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!item) return;
    setEnd(item.contract?.end ?? '');
    setNotice(item.contract?.notice ?? 0);
    setRenews(item.contract?.renews ?? 12);
    setNote(item.contract?.note ?? '');
  }, [item]);
  if (!item) return null;

  const it = item;
  const draft: Contract = {
    ...(isIsoDay(end) ? { end } : {}),
    ...(notice ? { notice } : {}),
    ...(renews !== 12 ? { renews } : {}),
    ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}),
  };
  const deadline = nextDeadline(draft);
  const months = (n: number) => (n === 1 ? t.monthOne : fmt(t.averageSpanN, { n }));
  const money = (c: number) => formatMoney(c, t.locale);
  const save = () => { onSave(it, Object.keys(draft).length ? draft : undefined); onClose(); };

  return (
    <Sheet open title={it.name} closeLabel={t.cancel} onClose={onClose} action={{ label: t.save, onClick: save }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        <div className="flex items-center gap-3">
          <Picture emoji={category?.emoji} name={it.name} hue={category?.hue} size="md" />
          <p className="min-w-0 flex-1 text-label text-fg-mute wrap-prose tabular-nums">
            {it.repeat === 'monthly' || it.every
              ? `${money(it.amount)} ${perShort(t, it)} · ${fmt(t.perYear, { amount: money(it.yearly) })}`
              : fmt(t.perYear, { amount: money(it.amount) })}
          </p>
        </div>
        <Field label={t.contractEnd} type="date" value={end} onChange={setEnd} />
        <div className="space-y-1">
          <div className="min-h-control flex items-center justify-between gap-3">
            <span className="text-label text-fg">{t.contractNotice}</span>
            <MenuPicker label={t.contractNotice} value={notice} onChange={setNotice}
              options={NOTICE.map(n => ({ value: n, label: n === 0 ? t.contractNoticeNone : months(n) }))} />
          </div>
          <div className="min-h-control flex items-center justify-between gap-3">
            <span className="text-label text-fg">{t.contractRenews}</span>
            <MenuPicker label={t.contractRenews} value={renews} onChange={setRenews}
              options={RENEWS.map(n => ({ value: n, label: months(n) }))} />
          </div>
        </div>
        <Field label={t.note} value={note} onChange={setNote} placeholder={t.contractNotePlaceholder} maxLength={200} />
        {deadline && (
          <p className="rounded-md bg-surface-2 px-3 py-2.5 text-label text-fg wrap-prose" role="status">
            {fmt(t.contractResult, { cancelBy: longDate(deadline.cancelBy, t.locale), end: longDate(deadline.endsOn, t.locale) })}
          </p>
        )}
        <div className="grid gap-2">
          <Button type="submit" full size="lg">{t.save}</Button>
          {it.contract && (
            <Button variant="ghost" full onClick={() => { onSave(it, undefined); onClose(); }}>{t.contractRemove}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
