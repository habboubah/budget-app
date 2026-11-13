import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown, ChevronLeft, FlaskConical, Languages } from 'lucide-react';
import { MonthKey } from '../types';
import { amountToInput, currencySymbol, dayLabel, formatMoney, normalizeDigits, parseAmount } from '../logic';
import { LANGUAGE_NAMES, Language, Strings, languages } from '../translations';
import { StartAnswers, StartPlan, startPlan } from '../start';
import { Button } from '../ui/Button';
import { CountingMoney } from '../ui/CountingMoney';
import { tapLight } from '../ui/haptics';

type Step = 'welcome' | 'balance' | 'income' | 'fixed' | 'done';
const QUESTIONS: Step[] = ['balance', 'income', 'fixed'];

/** A typed amount in cents; `signed` lets an overdrawn account start with a minus. */
function read(text: string, locale: string, signed = false): number | null {
  const negative = signed && /^\s*[-−]/.test(text);
  const abs = parseAmount(text.replace(/^\s*[-−]\s*/, ''), locale);
  return abs === null ? null : negative ? -abs : abs;
}
const readDay = (text: string): number | undefined => {
  const n = /^\d{1,2}$/.test(text.trim()) ? Number(text) : NaN;
  return n >= 1 && n <= 31 ? n : undefined;
};

/**
 * The start (plan 39): what a new book opens with, instead of the month page
 * with a setup card on it. One screen of welcome — what the app is for, that
 * nothing leaves the device, and three ways on: begin, bring data along, or
 * look around with the test data first. Then three questions, one a screen
 * and each one skippable (*Später*): what is on the account, what comes in
 * every month, what goes out every month. Paid or open is never asked — the
 * day of the month says it (`startPlan`). The last screen is what the app is
 * for: what will be left at the end of the month.
 *
 * Shown instead of the app, like the lock screen; a chunk of its own, since
 * only a new book ever needs it.
 */
export function StartFlow({ t, language, month, fixedNames, canIncome, canFixed, onLanguage, onApply, onFinish, onHaveData, onDemo }: {
  t: Strings;
  language: Language;
  month: MonthKey;
  /** The fixed costs asked about, named in the app's language. */
  fixedNames: string[];
  /** Whether there is a category to put income / fixed costs into. */
  canIncome: boolean;
  canFixed: boolean;
  onLanguage: (lang: Language) => void;
  /** The answers, once, before the last screen: App writes the entries and the opening. */
  onApply: (answers: StartAnswers) => void;
  /** Into the app. */
  onFinish: () => void;
  onHaveData: () => void;
  onDemo: () => void;
}) {
  const [step, setStep] = useState<Step>('welcome');
  const [balanceText, setBalanceText] = useState('');
  const [incomeText, setIncomeText] = useState('');
  const [incomeDay, setIncomeDay] = useState('');
  const [fixed, setFixed] = useState(() => fixedNames.map(name => ({ name, amount: '', day: '' })));
  const [plan, setPlan] = useState<StartPlan | null>(null);
  const titleId = useId();
  const first = useRef<HTMLInputElement>(null);
  // Each question opens on its field.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (QUESTIONS.includes(step)) requestAnimationFrame(() => first.current?.focus({ preventScroll: true }));
  }, [step]);

  const steps = QUESTIONS.filter(s => (s === 'income' ? canIncome : s === 'fixed' ? canFixed : true));
  const at = steps.indexOf(step);
  const balance = read(balanceText, t.locale, true);
  const income = read(incomeText, t.locale);
  const fixedFilled = fixed.map(f => ({ name: f.name, amount: read(f.amount, t.locale) ?? 0, day: readDay(f.day) })).filter(f => f.amount > 0);

  /** On from a question; `keep` false leaves its answer out (*Später*). */
  const next = (keep: boolean) => {
    tapLight();
    const skipped = { balance: step === 'balance' && !keep, income: step === 'income' && !keep, fixed: step === 'fixed' && !keep };
    if (skipped.balance) setBalanceText('');
    if (skipped.income) { setIncomeText(''); setIncomeDay(''); }
    if (at < steps.length - 1) { setStep(steps[at + 1]); return; }
    // The last question: write what was answered, then show what it comes to.
    const answers: StartAnswers = {
      ...(balance !== null && !skipped.balance ? { balance } : {}),
      ...(income && !skipped.income ? { income: { amount: income, day: readDay(incomeDay) } } : {}),
      fixed: skipped.fixed ? [] : fixedFilled,
    };
    const made = startPlan(answers, month, t.setupSalaryName);
    onApply(answers);
    // Nothing answered at all: nothing to show for it.
    if (answers.balance === undefined && !made.entries.length) { onFinish(); return; }
    setPlan(made);
    setStep('done');
  };
  const back = () => { tapLight(); setStep(at > 0 ? steps[at - 1] : 'welcome'); };

  const money = (c: number) => formatMoney(c, t.locale);
  const amountField = 'flex-1 min-w-0 bg-transparent py-3 text-body text-fg tabular-nums placeholder:text-fg-faint outline-none';
  const box = 'flex items-center gap-2 bg-surface rounded-sm card-edge px-4 min-h-control focus-within:ring-2 focus-within:ring-accent';
  const dayField = (value: string, onChange: (v: string) => void, label: string) => (
    <label className={`${box} w-[4.75rem] shrink-0 px-3`}>
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={e => onChange(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 2))}
        inputMode="numeric"
        autoComplete="off"
        placeholder={t.startDay}
        className={`${amountField} text-center`}
      />
    </label>
  );

  if (step === 'welcome') {
    return (
      <main className="min-h-screen bg-bg accent-wash safe-top flex flex-col" aria-labelledby={titleId}>
        {/* The language follows the phone; whoever wants another finds it here, before anything is read. */}
        <div className="px-[16px] pt-3 flex justify-end">
          <label className="relative h-tap inline-flex items-center rounded-full focus-within:ring-focus">
            <span className="h-9 ps-3 pe-2.5 rounded-full glass-chrome inline-flex items-center gap-1.5 text-label font-semibold text-fg" aria-hidden="true">
              <Languages className="w-4 h-4 text-fg-mute" strokeWidth={2.2} />
              {LANGUAGE_NAMES[language]}
              <ChevronDown className="w-4 h-4 text-fg-mute" strokeWidth={2.5} />
            </span>
            <select
              aria-label={t.language}
              value={language}
              onChange={e => onLanguage(e.target.value as Language)}
              className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer text-body"
            >
              {languages.map(l => <option key={l} value={l}>{LANGUAGE_NAMES[l]}</option>)}
            </select>
          </label>
        </div>
        <motion.div
          className="flex-1 mx-auto w-full max-w-xl px-[28px] flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src="/icon.svg" alt="" className="w-24 h-24 rounded-[24px] shadow-e2" />
          <h1 id={titleId} className="mt-6 display text-title font-bold text-fg tracking-[-0.025em] wrap-compound">{t.appName}</h1>
          <p className="mt-3 text-body text-fg wrap-prose">{t.startLead}</p>
          <p className="mt-3 text-label text-fg-mute wrap-prose">{t.aboutBody}</p>
        </motion.div>
        <div className="mx-auto w-full max-w-xl px-[20px] pb-safe-8 grid gap-1.5">
          <Button size="lg" full data-start="go" onClick={() => setStep(steps[0] ?? 'balance')}>{t.startGo}</Button>
          <Button variant="ghost" full data-start="data" onClick={onHaveData}>{t.startHaveData}</Button>
          <Button variant="ghost" full icon={FlaskConical} data-start="demo" onClick={onDemo}>{t.startDemo}</Button>
        </div>
      </main>
    );
  }

  if (step === 'done' && plan) {
    const open = plan.entries.filter(e => !e.paid).slice(0, 3);
    return (
      <main className="min-h-screen bg-bg accent-wash safe-top flex flex-col" aria-labelledby={titleId}>
        <motion.div
          className="flex-1 mx-auto w-full max-w-xl px-[20px] pt-10 flex flex-col justify-center"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="mx-auto w-14 h-14 rounded-full hero hero-glow text-on-hero inline-flex items-center justify-center" aria-hidden="true">
            <Check className="w-7 h-7" strokeWidth={3} />
          </span>
          <h1 id={titleId} className="mt-5 display text-title2 font-bold text-fg text-center wrap-compound">{t.startDoneTitle}</h1>
          {plan.end !== undefined && (
            <section className="mt-6 rounded-lg hero hero-glow hero-art overflow-hidden px-5 pt-5 pb-5 text-center" data-start="end">
              <p className="eyebrow text-on-hero-mute wrap-prose">{t.startDoneEnd}</p>
              <p className="mt-1.5 rounded-num font-extrabold text-[clamp(34px,11vw,46px)] leading-[1.06] tracking-[-0.02em] text-on-hero">
                <span className="sr-only">{money(plan.end)}</span>
                <span aria-hidden="true"><CountingMoney cents={plan.end} money={money} /></span>
              </p>
            </section>
          )}
          {open.length > 0 && (
            <ul className="mt-4 rounded-md bg-surface card-edge divide-hairline-inset overflow-hidden">
              {open.map(e => (
                <li key={`${e.name}-${e.date}`} className="min-h-[52px] px-[16px] py-2.5 flex items-center gap-3">
                  <span className="w-[22px] h-[22px] shrink-0 rounded-full border-2 border-warn" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-fg wrap-compound">{e.name}</span>
                    <span className="block text-caption text-fg-mute">
                      {dayLabel(e.date, t.locale)} · <span className="text-warn">{e.kind === 'income' ? t.expected : t.open}</span>
                    </span>
                  </span>
                  <span className={`shrink-0 text-body font-semibold num ${e.kind === 'income' ? 'text-pos' : 'text-fg-mute'}`}>
                    {formatMoney(e.kind === 'income' ? e.amount : -e.amount, t.locale, e.kind === 'income' ? 'always' : 'auto')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 px-1 text-label text-fg-mute text-center wrap-prose">{t.startDoneHint}</p>
        </motion.div>
        <div className="mx-auto w-full max-w-xl px-[20px] pt-6 pb-safe-8">
          <Button size="lg" full data-start="finish" onClick={onFinish}>{t.startDoneGo}</Button>
        </div>
      </main>
    );
  }

  const heading = step === 'balance' ? t.setupBalance : step === 'income' ? t.startIncome : t.startFixed;
  const hint = step === 'balance' ? t.setupBalanceHint : step === 'income' ? t.setupSalarySub : t.setupFixedSub;
  const answered = step === 'balance' ? balance !== null : step === 'income' ? !!income : fixedFilled.length > 0;
  return (
    <main className="min-h-screen bg-bg accent-wash safe-top" aria-labelledby={titleId}>
      <div className="mx-auto w-full max-w-xl px-[16px] pt-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <span className="justify-self-start">
          <button
            type="button" onClick={back} aria-label={t.back} title={t.back}
            className="h-tap w-tap rounded-full glass-chrome text-fg inline-flex items-center justify-center active:scale-[0.92] transition-transform focus-visible:ring-focus"
          >
            <ChevronLeft className="w-[22px] h-[22px] rtl:rotate-180" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </span>
        {/* Where this is among the questions. */}
        <span className="flex items-center gap-1.5" role="img" aria-label={`${at + 1} / ${steps.length}`}>
          {steps.map((s, i) => <span key={s} className={`h-1.5 rounded-full transition-all ${i === at ? 'w-5 bg-accent-fill' : 'w-1.5 bg-fg/20'}`} />)}
        </span>
        <span className="justify-self-end">
          <Button variant="ghost" data-start="later" onClick={() => next(false)}>{t.setupLater}</Button>
        </span>
      </div>
      <motion.form
        key={step}
        onSubmit={e => { e.preventDefault(); if (answered) next(true); }}
        className="mx-auto w-full max-w-xl px-[20px] pt-6 pb-safe-8"
        initial={{ opacity: 0, x: 24 * (t.dir === 'rtl' ? -1 : 1) }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 id={titleId} className="display text-title2 font-bold text-fg tracking-[-0.02em] wrap-compound">{heading}</h1>
        <p className="mt-2 text-label text-fg-mute wrap-prose">{hint}</p>

        {step === 'balance' && (
          <label className={`${box} mt-6 min-h-[64px]`}>
            <span className="sr-only">{heading}</span>
            <input
              ref={first}
              data-start="balance"
              value={balanceText}
              onChange={e => setBalanceText(normalizeDigits(e.target.value))}
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              placeholder={amountToInput(0, t.locale)}
              className="flex-1 min-w-0 bg-transparent py-3 rounded-num text-[28px] font-bold text-fg placeholder:text-fg-faint outline-none"
            />
            <span className="rounded-num text-[22px] font-semibold text-fg-mute" aria-hidden="true">{currencySymbol()}</span>
          </label>
        )}

        {step === 'income' && (
          <>
            {/* The day beside the amount; under it once large text leaves the amount no room (the basis is in rem). */}
            <div className="mt-6 flex flex-wrap items-stretch gap-2">
              <label className={`${box} flex-1 min-w-0 basis-[12rem]`}>
                <span className="sr-only">{t.amount}</span>
                <span className="rounded-num text-body font-semibold text-pos" aria-hidden="true">+</span>
                <input
                  ref={first}
                  data-start="income"
                  value={incomeText}
                  onChange={e => setIncomeText(normalizeDigits(e.target.value))}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  placeholder={amountToInput(0, t.locale)}
                  className={amountField}
                />
                <span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>
              </label>
              {dayField(incomeDay, setIncomeDay, t.startDay)}
            </div>
            <p className="mt-2 px-1 text-caption text-fg-mute wrap-prose">{t.startDayHint}</p>
          </>
        )}

        {step === 'fixed' && (
          <>
            <ul className="mt-6 space-y-2">
              {fixed.map((f, i) => (
                // Name, amount, day in a line; with large text the amount goes under the name and the day under both.
                <li key={f.name} className="flex flex-wrap items-stretch gap-2">
                  <label className={`${box} flex-wrap gap-y-0 flex-1 min-w-0 basis-[13rem]`}>
                    <span className="min-w-0 flex-1 basis-[5.5rem] py-1 text-body text-fg wrap-compound">{f.name}</span>
                    <span className="min-w-0 flex-1 basis-[7rem] flex items-center gap-2">
                      <input
                        ref={i === 0 ? first : undefined}
                        data-start={`fixed-${i}`}
                        value={f.amount}
                        onChange={e => setFixed(list => list.map((x, j) => (j === i ? { ...x, amount: normalizeDigits(e.target.value) } : x)))}
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder={amountToInput(0, t.locale)}
                        aria-label={f.name}
                        className="min-w-0 flex-1 bg-transparent py-3 text-body text-fg text-end tabular-nums placeholder:text-fg-faint outline-none"
                      />
                      <span className="text-body text-fg-mute" aria-hidden="true">{currencySymbol()}</span>
                    </span>
                  </label>
                  {dayField(f.day, v => setFixed(list => list.map((x, j) => (j === i ? { ...x, day: v } : x))), `${f.name}: ${t.startDay}`)}
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-caption text-fg-mute wrap-prose">{t.startDayHint}</p>
          </>
        )}

        <div className="mt-6">
          <Button type="submit" size="lg" full disabled={!answered} data-start="next">{t.tourNext}</Button>
        </div>
      </motion.form>
    </main>
  );
}
