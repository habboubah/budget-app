import { CSSProperties, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarPlus, Check, Repeat as RepeatIcon } from 'lucide-react';
import { CountingMoney } from '../ui/CountingMoney';
import { Category, Entry, MonthKey } from '../types';
import { formatMoney, monthLabel, spoken } from '../logic';
import { Strings, fmt } from '../translations';
import { Button } from '../ui/Button';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';

interface Props {
  month: MonthKey;
  /** Where the monthly entries come from (the last started month). */
  from?: MonthKey;
  /** What starting would carry over. */
  candidates: Entry[];
  categories: Category[];
  t: Strings;
  /** `skip`: the ids of the candidates the user took out — they stay behind. */
  onStart: (carry: boolean, skip?: Set<string>) => void;
}

/**
 * A month that hasn't been started: what starting it would bring along — every
 * recurring entry, each with its tick, all ticked to begin with — and the two
 * ways in: with the ticked ones, or empty. A tap on a row takes it out (this
 * month only: the entry keeps repeating in the months after). The parts of a
 * split payment go in or out together.
 */
export function StartMonthCard({ month, from, candidates, categories, t, onStart }: Props) {
  const n = candidates.length;
  const [skip, setSkip] = useState<Set<string>>(() => new Set());
  const byId = new Map(categories.map(c => [c.id, c]));
  const picked = candidates.filter(e => !skip.has(e.id));
  const chosen = picked.length;
  // What the ticked entries add up to: income, expenses, and what that leaves
  // (the carry-over aside, like *Monatssaldo* on the balance card).
  const byKind = (kind: 'income' | 'expense') =>
    picked.filter(e => (byId.get(e.categoryId)?.kind ?? 'expense') === kind).reduce((sum, e) => sum + e.amount, 0);
  const fromLabel = from ? monthLabel(from, t.locale) : '';

  const income = byKind('income');
  const expense = byKind('expense');
  const rest = income - expense;
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  /** What VoiceOver reads for an amount: the amount, or "Betrag verborgen". */
  const say = (text: string) => spoken(text, t.amountHidden);

  const toggle = (e: Entry) => {
    tapLight();
    const ids = e.splitId ? candidates.filter(x => x.splitId === e.splitId).map(x => x.id) : [e.id];
    setSkip(prev => {
      const next = new Set(prev);
      const out = !prev.has(e.id);
      for (const id of ids) { if (out) next.add(id); else next.delete(id); }
      return next;
    });
  };

  return (
    <section className="rounded-md bg-surface card-edge p-5 space-y-4" aria-labelledby="start-title">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-sm bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <CalendarPlus className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h2 id="start-title" className="display text-heading font-semibold text-fg wrap-compound">
            {fmt(t.notStartedTitle, { month: monthLabel(month, t.locale) })}
          </h2>
          <p className="text-label text-fg-mute mt-1 wrap-prose">
            {n === 0 ? t.startBodyNone : fmt(n === 1 ? t.startBodyOne : t.startBody, { n, from: fromLabel })}
          </p>
        </div>
      </div>

      {n > 0 && (
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
            <p id="carry-title" className="eyebrow text-fg-mute">{t.carryPreview}</p>
            <p className="text-caption font-semibold text-fg-mute num" aria-live="polite">{fmt(t.carryChosen, { n: chosen, total: n })}</p>
          </div>
          <ul className="rounded-sm bg-surface-2 divide-hairline-inset overflow-hidden" aria-labelledby="carry-title">
            {candidates.map(e => {
              const c = byId.get(e.categoryId);
              const on = !skip.has(e.id);
              return (
                <li key={e.id} className="relative" style={{ '--sep': '2.875rem' } as CSSProperties}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(e)}
                    className="w-full min-h-tap px-3 py-2 flex items-center gap-3 text-start active:bg-fg/5 transition-colors focus-visible:ring-focus"
                  >
                    <span
                      className={`w-[22px] h-[22px] shrink-0 rounded-full inline-flex items-center justify-center transition-colors ${
                        on ? 'bg-accent-fill text-accent-fill-ink' : 'border-[1.75px] border-fg-faint'}`}
                      aria-hidden="true"
                    >
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.span
                            key="check"
                            className="inline-flex"
                            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}
                          >
                            <Check className="w-[13px] h-[13px]" strokeWidth={3.25} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className={`min-w-0 flex-1 flex items-center gap-3 transition-opacity ${on ? '' : 'opacity-45'}`}>
                      <Picture emoji={c?.emoji} name={e.name} hue={c?.hue} size="sm" />
                      <span className={`min-w-0 flex-1 text-label text-fg wrap-compound ${on ? '' : 'line-through decoration-fg-faint'}`}>{e.name}</span>
                      {e.repeat === 'yearly' && <RepeatIcon className="w-3.5 h-3.5 shrink-0 text-fg-mute" aria-label={t.repeatsYearly} />}
                      <span className={`shrink-0 text-label font-semibold num ${on ? (c?.kind === 'income' ? 'text-pos' : 'text-fg') : 'text-fg-mute line-through'}`}>
                        {formatMoney(e.amount, t.locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-caption text-fg-mute mt-2 px-1 wrap-prose">{t.carryHint}</p>

          {/* The ticked entries added up — it follows every tick. */}
          <dl className="mt-4 rounded-sm bg-surface-2 px-4 py-1" aria-live="polite">
            <div className="min-h-[40px] flex items-center justify-between gap-3">
              <dt className="text-label text-fg-mute wrap-compound">{t.income}</dt>
              <dd className="text-label font-semibold text-pos num">
                <span className="sr-only">{say(money(income))}</span>
                <span aria-hidden="true"><CountingMoney cents={income} money={c => money(c)} /></span>
              </dd>
            </div>
            <div className="min-h-[40px] flex items-center justify-between gap-3 border-t border-hairline">
              <dt className="text-label text-fg-mute wrap-compound">{t.expenses}</dt>
              <dd className="text-label font-semibold text-fg num">
                <span className="sr-only">{say(money(-expense))}</span>
                <span aria-hidden="true"><CountingMoney cents={-expense} money={c => money(c)} /></span>
              </dd>
            </div>
            <div className="min-h-[48px] flex items-center justify-between gap-3 border-t border-hairline">
              <dt className="text-body font-semibold text-fg wrap-compound">{t.leftThisMonth}</dt>
              <dd className={`text-body font-bold num ${rest > 0 ? 'text-pos' : rest < 0 ? 'text-neg' : 'text-fg'}`}>
                <span className="sr-only">{say(money(rest, 'exceptZero'))}</span>
                <span aria-hidden="true"><CountingMoney cents={rest} money={c => money(c, 'exceptZero')} /></span>
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="grid gap-2">
        <Button full size="lg" onClick={() => onStart(true, skip)}>{t.startWith}</Button>
        {n > 0 && <Button full variant="secondary" onClick={() => onStart(false)}>{t.startEmpty}</Button>}
      </div>
    </section>
  );
}
