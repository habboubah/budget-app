import { useEffect, useId, useState } from 'react';
import { ArrowLeftRight, Check, ChevronRight, Circle, FileUp, Hand, X } from 'lucide-react';
import { amountToInput, formatMoney, normalizeDigits, parseAmount } from '../logic';
import { Strings, fmt } from '../translations';
import { Button, IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';

/** A step's number, or a tick once it is done. */
function StepMark({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 text-caption font-bold num transition-colors ${
        done ? 'hero' : 'bg-accent-dim text-accent'}`}
    >
      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : n}
    </span>
  );
}

/**
 * The first month's setup, instead of a balance card full of zeros and a page
 * of instructions: three things to do, each done right here or one tap away —
 * the balance now (typed in the card), the salary, the fixed costs. The Excel
 * sheet is the way in for someone who has one; "Später" puts it all off, and
 * once the balance is in, "Fertig" ends the setup.
 */
export function SetupCard({ t, balance, salaryDone, fixedCount, canSalary, canFixed, onBalance, onSalary, onFixed, onImportExcel, onFinish }: {
  t: Strings;
  /** The balance now, once given; undefined while step one is open. */
  balance?: number;
  salaryDone: boolean;
  /** Monthly spending entries in the month so far. */
  fixedCount: number;
  /** Whether there is an income / spending category to put them in. */
  canSalary: boolean;
  canFixed: boolean;
  onBalance: (cents: number) => void;
  onSalary: () => void;
  onFixed: () => void;
  onImportExcel: () => void;
  /** "Später" before the balance, "Fertig" after it. */
  onFinish: () => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  const hintId = useId();
  const given = balance !== undefined;
  const [editing, setEditing] = useState(!given);
  const [text, setText] = useState('');
  useEffect(() => { if (!given) setEditing(true); }, [given]);

  // Like the opening sheet: an overdrawn account starts with a minus.
  const negative = /^\s*[-−]/.test(text);
  const abs = parseAmount(text.replace(/^\s*[-−]\s*/, ''), t.locale);
  const value = abs === null ? null : negative ? -abs : abs;
  const save = () => {
    if (value === null) return;
    tapLight();
    onBalance(value);
    setEditing(false);
  };
  const change = () => {
    tapLight();
    setText(balance === undefined ? '' : (balance < 0 ? '-' : '') + amountToInput(Math.abs(balance), t.locale));
    setEditing(true);
    requestAnimationFrame(() => document.getElementById(fieldId)?.focus({ preventScroll: true }));
  };
  const allDone = given && salaryDone && fixedCount > 0;
  const doneMark = (done: boolean) => done && <span className="sr-only">, {t.setupStepDone}</span>;

  const stepButton = (n: number, done: boolean, title: string, sub: string, onClick: () => void) => (
    <li>
      <button
        type="button"
        onClick={() => { tapLight(); onClick(); }}
        className="-mx-2 w-[calc(100%+1rem)] min-h-tap px-2 py-2.5 rounded-sm flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <StepMark n={n} done={done} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg wrap-compound">{title}{doneMark(done)}</span>
          <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{sub}</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-fg-faint rtl:rotate-180" aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <section className="rounded-md bg-surface card-edge p-5" aria-labelledby={titleId}>
      <h2 id={titleId} className="display text-heading font-semibold text-fg wrap-compound">{t.setupTitle}</h2>
      <p className="text-label text-fg-mute mt-1 wrap-prose">{t.setupSub}</p>

      <ol className="mt-3">
        <li className="py-2.5 flex items-start gap-3">
          <StepMark n={1} done={given && !editing} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <>
                <label htmlFor={fieldId} className="block text-body font-semibold text-fg wrap-compound">{t.setupBalance}</label>
                <form onSubmit={e => { e.preventDefault(); save(); }} className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0 grow basis-[7rem] flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
                    <input
                      id={fieldId}
                      value={text}
                      onChange={e => setText(normalizeDigits(e.target.value))}
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      placeholder={amountToInput(0, t.locale)}
                      aria-describedby={hintId}
                      className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg tabular-nums placeholder:text-fg-faint outline-none"
                    />
                    <span className="text-body text-fg-mute" aria-hidden="true">€</span>
                  </div>
                  <Button type="submit" disabled={value === null}>{t.setupBalanceSave}</Button>
                </form>
                <p id={hintId} className="text-caption text-fg-mute mt-1.5 wrap-prose">{t.setupBalanceHint}</p>
              </>
            ) : (
              <div className="min-h-7 flex flex-wrap items-center gap-x-3">
                <p className="text-body font-semibold text-fg tabular-nums wrap-prose">
                  {fmt(t.setupBalanceDone, { amount: formatMoney(balance ?? 0, t.locale) })}{doneMark(true)}
                </p>
                <button type="button" onClick={change}
                  className="hit-44 text-label font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus">
                  {t.setupChange}
                </button>
              </div>
            )}
          </div>
        </li>
        {canSalary && stepButton(2, salaryDone, t.setupSalary, salaryDone ? t.setupSalaryDone : t.setupSalarySub, onSalary)}
        {canFixed && stepButton(canSalary ? 3 : 2, fixedCount > 0, t.setupFixed,
          fixedCount > 0 ? fmt(t.setupFixedDone, { n: fixedCount }) : t.setupFixedSub, onFixed)}
      </ol>

      <div className="mt-3 -mx-2 flex flex-wrap items-center gap-2">
        <Button variant="ghost" icon={FileUp} onClick={onImportExcel}>{t.importExcel}</Button>
        <Button variant={allDone ? 'primary' : given ? 'secondary' : 'ghost'} onClick={onFinish} className="ms-auto">
          {given ? t.done : t.setupLater}
        </Button>
      </div>
    </section>
  );
}

/**
 * After the setup, once there is something to try them on: the three
 * gestures of the month page, on one card that goes for good with ✕.
 */
export function TipsCard({ t, onDismiss }: { t: Strings; onDismiss: () => void }) {
  const titleId = useId();
  const tips = [
    { icon: Circle, text: t.tipTick },
    { icon: ArrowLeftRight, text: t.tipSwipe },
    { icon: Hand, text: t.tipHold },
  ];
  return (
    <section className="rounded-md bg-surface card-edge ps-5 pe-2 pt-2 pb-5" aria-labelledby={titleId}>
      <div className="flex items-center gap-2">
        <h2 id={titleId} className="min-w-0 flex-1 display text-heading font-semibold text-fg wrap-compound">{t.tipsTitle}</h2>
        <IconButton label={t.tipsHide} icon={X} onClick={onDismiss} />
      </div>
      <ul className="mt-1 pe-3 space-y-3">
        {tips.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
              <Icon className="w-4 h-4" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1 pt-1 text-label text-fg wrap-prose">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
