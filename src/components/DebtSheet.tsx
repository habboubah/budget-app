import { useEffect, useState } from 'react';
import { ChevronDown, Check, Trash2 } from 'lucide-react';
import { Debt, MonthKey } from '../types';
import { amountToInput, cleanText, formatMoney, isMonthKey, monthKeyOf, normalizeDigits, parseAmount } from '../logic';
import { DebtPlan, PaymentSeries } from '../insights';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label } from '../ui/Field';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { tapLight } from '../ui/haptics';
import { debtLine, interestLine } from './DebtsView';

export type DebtSheetMode = { kind: 'new' } | { kind: 'edit'; debt: Debt; plan: DebtPlan } | null;
export type DebtDraft = Omit<Debt, 'id' | 'createdAt'>;

/**
 * A debt or a loan, or money lent (plan 31): which way it goes, a name, what
 * it was and since when, and — optional — the interest a year, the monthly
 * payment and the recurring entry it is paid with. A debt being changed
 * shows what it comes to first: what is left, when it ends, the interest
 * still to come, what was paid back.
 */
export function DebtSheet({ mode, series, t, onClose, onCreate, onSave, onDelete }: {
  mode: DebtSheetMode;
  /** The monthly series it can be paid with (`paymentSeries`). */
  series: PaymentSeries[];
  t: Strings;
  onClose: () => void;
  onCreate: (d: DebtDraft) => void;
  onSave: (id: string, d: DebtDraft) => void;
  onDelete: (debt: Debt) => void;
}) {
  const editing = mode?.kind === 'edit' ? mode.debt : null;
  const [direction, setDirection] = useState<Debt['direction']>('owe');
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [start, setStart] = useState('');
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');
  const [seriesId, setSeriesId] = useState<string | undefined>(undefined);
  const [seriesAt, setSeriesAt] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!mode) return;
    const d = mode.kind === 'edit' ? mode.debt : null;
    setDirection(d?.direction ?? 'owe');
    setName(d?.name ?? '');
    setPrincipal(d ? amountToInput(d.principal, t.locale) : '');
    setStart(d?.start ?? monthKeyOf());
    setRate(d?.rate ? new Intl.NumberFormat(t.locale, { maximumFractionDigits: 3, useGrouping: false }).format(d.rate) : '');
    setPayment(d?.payment ? amountToInput(d.payment, t.locale) : '');
    setSeriesId(d?.seriesId);
  }, [mode]);

  const owe = direction === 'owe';
  const clean = cleanText(name, 40);
  const principalValue = parseAmount(principal, t.locale);
  const rateValue = rate.trim() ? Number(normalizeDigits(rate).replace(',', '.').replace(/\s|%/g, '')) : 0;
  const rateInvalid = rate.trim() !== '' && (!Number.isFinite(rateValue) || rateValue < 0 || rateValue > 100);
  const paymentValue = payment.trim() ? parseAmount(payment, t.locale) : null;
  const paymentInvalid = payment.trim() !== '' && paymentValue === null;
  const startKey: MonthKey | undefined = isMonthKey(start) ? start : undefined;
  const canSave = !!clean && principalValue !== null && principalValue > 0 && !!startKey && !rateInvalid && !paymentInvalid;
  // The series that fit: payments out for a debt, money coming in for money lent.
  const fitting = series.filter(s => s.income !== owe || s.seriesId === seriesId);
  const chosen = series.find(s => s.seriesId === seriesId);

  const save = () => {
    if (!canSave || principalValue === null || !startKey) return;
    const draft: DebtDraft = {
      name: clean, direction, principal: principalValue, start: startKey,
      ...(owe && rateValue > 0 ? { rate: Math.round(rateValue * 1000) / 1000 } : {}),
      ...(paymentValue ? { payment: paymentValue } : {}),
      ...(seriesId && series.some(s => s.seriesId === seriesId) ? { seriesId } : {}),
    };
    if (editing) onSave(editing.id, draft);
    else onCreate(draft);
    onClose();
  };

  const plan = mode?.kind === 'edit' ? mode.plan : null;
  return (
    <Sheet open={!!mode} title={editing ? t.debtEdit : t.debtNew} closeLabel={t.cancel} onClose={onClose}
      action={{ label: editing ? t.save : t.add, onClick: save, disabled: !canSave }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-5">
        {plan && (
          <div className="rounded-md bg-surface-2 px-4 py-3">
            <p className="text-body font-semibold text-fg wrap-prose">{debtLine(plan, t)}</p>
            {interestLine(plan, t) && <p className="text-caption text-fg-mute mt-0.5 wrap-prose">{interestLine(plan, t)}</p>}
            {plan.paid > 0 && <p className="text-caption text-fg-mute mt-0.5 wrap-prose">{fmt(t.debtPaidSoFar, { amount: formatMoney(plan.paid, t.locale) })}</p>}
          </div>
        )}
        <div role="radiogroup" aria-label={t.debtDirection} className="grid grid-cols-2 gap-2">
          {(['owe', 'owed'] as const).map(d => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => { tapLight(); setDirection(d); }}
              className={`min-h-tap px-3 rounded-full text-label border-[1.5px] transition-colors focus-visible:ring-focus wrap-compound ${
                direction === d ? 'bg-accent-dim text-accent border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
            >
              {d === 'owe' ? t.debtOwe : t.debtOwed}
            </button>
          ))}
        </div>
        <Field label={t.debtName} value={name} onChange={setName} placeholder={owe ? t.debtNamePlaceholder : t.debtNamePlaceholderOwed} maxLength={40} autoFocus={!editing} enterKeyHint="done" />
        <Field
          label={t.debtPrincipal}
          value={principal}
          onChange={v => setPrincipal(normalizeDigits(v))}
          inputMode="decimal"
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
        />
        <div>
          <Label htmlFor="debt-start">{t.debtStart}</Label>
          <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
            <input id="debt-start" type="month" value={start} onChange={e => setStart(e.target.value)} className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg outline-none" />
          </div>
        </div>
        {owe && (
          <div>
            <Field
              label={t.debtRate}
              value={rate}
              onChange={v => setRate(normalizeDigits(v))}
              inputMode="decimal"
              enterKeyHint="done"
              trailing={<span className="text-body text-fg-mute" aria-hidden="true">%</span>}
            />
            <p className={`text-caption mt-1.5 px-1 wrap-prose ${rateInvalid ? 'text-neg' : 'text-fg-mute'}`}>{t.debtRateHint}</p>
          </div>
        )}
        <div>
          <Field
            label={t.debtPayment}
            value={payment}
            onChange={v => setPayment(normalizeDigits(v))}
            placeholder={chosen ? amountToInput(chosen.amount, t.locale) : ''}
            inputMode="decimal"
            enterKeyHint="done"
            trailing={<span className="text-body text-fg-mute" aria-hidden="true">€</span>}
          />
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">{t.debtPaymentHint}</p>
        </div>
        <div>
          <Label>{t.debtSeries}</Label>
          <button
            type="button"
            aria-haspopup="menu"
            onClick={e => { tapLight(); setSeriesAt(e.currentTarget); }}
            className="w-full min-h-control px-4 rounded-sm bg-surface-2 flex items-center gap-2 text-start text-body text-fg active:opacity-70 focus-visible:ring-focus"
          >
            <span className="min-w-0 flex-1 wrap-compound">
              {chosen ? `${chosen.name} · ${formatMoney(chosen.amount, t.locale)}` : t.debtSeriesNone}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <Menu
            anchor={seriesAt}
            label={t.debtSeries}
            groups={[[
              { key: 'none', label: t.debtSeriesNone, icon: seriesId ? undefined : Check, onSelect: () => setSeriesId(undefined) },
              ...fitting.map(s => ({ key: s.seriesId, label: s.name, sub: formatMoney(s.amount, t.locale), icon: s.seriesId === seriesId ? Check : undefined, onSelect: () => setSeriesId(s.seriesId) })),
            ]]}
            onClose={() => setSeriesAt(null)}
          />
        </div>
        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!canSave}>{editing ? t.save : t.add}</Button>
          {editing && <Button variant="danger" full icon={Trash2} onClick={() => { onClose(); onDelete(editing); }}>{t.debtDelete}</Button>}
        </div>
      </form>
    </Sheet>
  );
}
