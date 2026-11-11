import { useEffect, useMemo, useState } from 'react';
import { AppData, MonthKey } from '../types';
import { addMonths, amountToInput, currencySymbol, formatMoneyEstimate, isMonthKey, monthLabel, normalizeDigits, parseAmount } from '../logic';
import { DebtPlan, Outlook, extraPayment, whatIf, whatIfRange } from '../insights';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Segmented } from '../ui/Field';
import { Button } from '../ui/Button';
import { MenuRow } from '../ui/Screen';

type Mode = 'once' | 'monthly' | 'debt';

interface Props {
  open: boolean;
  outlook: Outlook;
  data: AppData;
  /** The debts still being paid off — with any, an extra payment can be tried too. */
  debts: DebtPlan[];
  t: Strings;
  onClose: () => void;
  /** *Als offenen Eintrag vormerken*: the entry sheet, filled in and open. */
  onPlan: (plan: { amount: number; month: MonthKey; monthly: boolean }) => void;
}

/** One figure of the answer: what it is, the estimate with the plan, and the one without beside it. */
function Line({ label, value, sub, tone = 'text-fg' }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="min-h-tap px-4 py-2.5 flex items-baseline gap-3">
      <span className="min-w-0 flex-1 text-body text-fg wrap-prose">{label}</span>
      <span className="shrink-0 text-end">
        <span className={`block rounded-num text-body font-semibold ${tone}`}>{value}</span>
        <span className="block text-caption text-fg-mute tabular-nums">{sub}</span>
      </span>
    </div>
  );
}

/**
 * *Kann ich mir das leisten?* (Planen › Ausblick): a purchase in a month, a
 * new monthly cost, or — with a debt — more paid off every month, tried
 * against the Ausblick and the debt's schedule. Nothing is saved; a purchase
 * or a monthly cost can be put down as an open entry from here.
 */
export function WhatIfSheet({ open, outlook, data, debts, t, onClose, onPlan }: Props) {
  const range = whatIfRange(outlook);
  const [mode, setMode] = useState<Mode>('once');
  const [text, setText] = useState('');
  const [month, setMonth] = useState<MonthKey>(range.min);
  const [debtId, setDebtId] = useState('');
  useEffect(() => {
    if (!open) return;
    setMode('once'); setText(''); setMonth(range.min); setDebtId(debts[0]?.debt.id ?? '');
  }, [open]);
  // A monthly cost starts next month unless said otherwise; a purchase is this month's.
  const pick = (m: Mode) => { setMode(m); setMonth(m === 'monthly' ? addMonths(range.min, 1) : range.min); };

  const amount = parseAmount(text, t.locale);
  const valid = amount !== null && amount > 0;
  const inRange = isMonthKey(month) && month >= range.min && month <= range.max;
  // Every figure here is an estimate, and is marked as one.
  const est = (c: number) => `≈ ${formatMoneyEstimate(c, t.locale)}`;
  const long = (k: MonthKey) => monthLabel(k, t.locale);

  const result = useMemo(() => (valid && inRange && mode !== 'debt'
    ? whatIf(outlook, mode === 'once' ? { once: { amount: amount!, month } } : { monthly: { amount: amount!, from: month } }) : null),
  [outlook, mode, amount, month, valid, inRange]);
  const debt = debts.find(d => d.debt.id === debtId) ?? debts[0];
  const extra = useMemo(() => (valid && mode === 'debt' && debt ? extraPayment(data, debt.debt, amount!) : null), [data, debt, mode, amount, valid]);

  if (!open) return null;
  const tone = result?.verdict === 'short' ? 'text-neg' : result?.verdict === 'tight' ? 'text-warn' : 'text-pos';
  return (
    <Sheet open title={t.whatIfTitle} closeLabel={t.cancel} onClose={onClose}>
      <div className="space-y-5">
        <Segmented<Mode>
          label={t.whatIfTitle}
          value={mode}
          options={[
            { value: 'once', label: t.repeatNone }, { value: 'monthly', label: t.repeatMonthly },
            ...(debts.length ? [{ value: 'debt' as const, label: t.whatIfDebt }] : []),
          ]}
          onChange={pick}
        />
        <Field
          label={mode === 'debt' ? t.whatIfExtra : t.amount}
          value={text}
          onChange={v => setText(normalizeDigits(v))}
          placeholder={amountToInput(mode === 'once' ? 50000 : 5000, t.locale)}
          inputMode="decimal"
          autoFocus
          enterKeyHint="done"
          trailing={<span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>}
        />
        {mode !== 'debt' && (
          <Field
            label={mode === 'once' ? t.whatIfWhen : t.whatIfFrom}
            type="month"
            value={month}
            onChange={setMonth}
            min={range.min}
            max={range.max}
            aria-invalid={!inRange || undefined}
          />
        )}
        {mode === 'debt' && debts.length > 1 && (
          <div className="rounded-md bg-surface card-edge">
            <MenuRow<string>
              label={t.whatIfDebt}
              value={debt.debt.id}
              onChange={setDebtId}
              options={debts.map(d => ({ value: d.debt.id, label: d.debt.name }))}
            />
          </div>
        )}

        {/* The answer follows what is typed; it is an estimate, and says so. */}
        <div aria-live="polite" className="space-y-2">
          {result && (
            <>
              <p className={`text-heading font-semibold wrap-prose ${tone}`}>
                {result.verdict === 'ok' ? t.whatIfOk
                  : fmt(result.verdict === 'short' ? t.whatIfShort : t.whatIfTight, {
                    month: long(result.first!), amount: est(result.months.find(m => m.key === result.first)!.after),
                  })}
              </p>
              <div className="rounded-md bg-surface card-edge divide-hairline-inset">
                <Line
                  label={fmt(t.whatIfLow, { month: long(result.low.after.month) })}
                  value={est(result.low.after.amount)}
                  sub={fmt(t.whatIfWithout, { amount: est(result.low.before.amount) })}
                  tone={result.low.after.amount < 0 ? 'text-neg' : 'text-fg'}
                />
                <Line
                  label={fmt(t.whatIfEnd, { month: long(result.end.month) })}
                  value={est(result.end.after)}
                  sub={fmt(t.whatIfWithout, { amount: est(result.end.before) })}
                  tone={result.end.after < 0 ? 'text-neg' : 'text-fg'}
                />
              </div>
            </>
          )}
          {extra && (
            <>
              <p className={`text-heading font-semibold wrap-prose ${extra.after ? 'text-pos' : 'text-warn'}`}>
                {!extra.after ? t.whatIfDebtNever
                  : extra.before && extra.monthsEarlier !== null
                    ? fmt(t.whatIfDebtResult, { after: long(extra.after), before: long(extra.before), n: extra.monthsEarlier })
                    : fmt(t.whatIfDebtNoEnd, { after: long(extra.after) })}
              </p>
              {extra.after && !!extra.interestSaved && (
                <p className="text-body text-fg tabular-nums wrap-prose">{fmt(t.whatIfInterest, { amount: est(extra.interestSaved) })}</p>
              )}
            </>
          )}
          {(result || extra) && <p className="text-caption text-fg-mute wrap-prose">{t.whatIfBasis}</p>}
        </div>

        {result && (
          <Button full variant="secondary" onClick={() => { onClose(); onPlan({ amount: amount!, month, monthly: mode === 'monthly' }); }}>
            {t.whatIfPlan}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
