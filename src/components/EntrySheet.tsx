import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Category, Entry, EntryDraft, MonthKey, Repeat } from '../types';
import { amountToInput, cleanText, displayName, monthKeyOf, parseAmount, suggestNames, normalizeDigits } from '../logic';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field, Label, Segmented } from '../ui/Field';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';

export type EntrySheetMode =
  | { kind: 'new'; month: MonthKey; categoryId: string }
  | { kind: 'edit'; entry: Entry }
  | null;

interface Props {
  mode: EntrySheetMode;
  categories: Category[];
  /** All entries — the name suggestions come from earlier months. */
  entries: Entry[];
  language: string;
  t: Strings;
  onClose: () => void;
  onCreate: (month: MonthKey, draft: EntryDraft) => void;
  onSave: (id: string, draft: EntryDraft) => void;
  onDelete: (id: string) => void;
}

/**
 * New or edited entry. The amount comes first and gets the keyboard straight
 * away; a tap on a suggested name ("Miete") fills in what it was last time
 * when the amount is still empty. Paid / open, repeat and the due day default
 * from the category, so most entries are amount + name + save.
 */
export function EntrySheet({ mode, categories, entries, language, t, onClose, onCreate, onSave, onDelete }: Props) {
  const editing = mode?.kind === 'edit' ? mode.entry : null;
  const month = mode?.kind === 'edit' ? mode.entry.month : mode?.month ?? monthKeyOf();

  const [categoryId, setCategoryId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [paid, setPaid] = useState(true);
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [dueText, setDueText] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState({ paid: false, repeat: false });
  const [showError, setShowError] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const amountId = useId();

  const category = categories.find(c => c.id === categoryId);
  const income = category?.kind === 'income';

  /** Fresh entries: open when they repeat (rent is planned at the start of the month) or lie ahead. */
  const defaultPaid = (c: Category | undefined) => c?.repeat === 'none' && month <= monthKeyOf();

  const reset = (keepCategory?: string) => {
    const c = categories.find(x => x.id === (keepCategory ?? (mode?.kind === 'new' ? mode.categoryId : ''))) ?? categories[0];
    setCategoryId(c?.id ?? '');
    setAmountText('');
    setName('');
    setPaid(defaultPaid(c));
    setRepeat(c?.repeat ?? 'none');
    setDueText('');
    setNote('');
    setTouched({ paid: false, repeat: false });
    setShowError(false);
  };

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      const e = mode.entry;
      setCategoryId(e.categoryId);
      setAmountText(amountToInput(e.amount, t.locale));
      setName(e.name);
      setPaid(e.paid);
      setRepeat(e.repeat);
      setDueText(e.dueDay ? String(e.dueDay) : '');
      setNote(e.note ?? '');
      setTouched({ paid: true, repeat: true });
      setShowError(false);
    } else {
      reset();
      // Focus after the sheet has mounted; preventScroll keeps the page still.
      requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
    }
  }, [mode]);

  // The chosen category may sit off-screen in the rail (Einkaufen is fifth):
  // bring it into view whenever the sheet opens on it.
  useEffect(() => {
    if (!mode) return;
    const id = requestAnimationFrame(() => {
      const chip = railRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      const rail = railRef.current;
      if (chip && rail) rail.scrollTo({ left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2 });
    });
    return () => cancelAnimationFrame(id);
  }, [mode, categoryId]);

  const amount = parseAmount(amountText, t.locale);
  const due = /^\d{1,2}$/.test(dueText.trim()) ? Number(dueText) : undefined;
  const dueValid = dueText.trim() === '' || (due !== undefined && due >= 1 && due <= 31);
  const valid = amount !== null && !!category && dueValid;

  const suggestions = useMemo(
    () => (editing || !categoryId ? [] : suggestNames({ entries, categoryId, query: name, lang: language, limit: 10 })),
    [editing, entries, categoryId, name, language],
  );

  const pickCategory = (c: Category) => {
    tapLight();
    setCategoryId(c.id);
    if (!touched.repeat) setRepeat(c.repeat);
    if (!touched.paid) setPaid(defaultPaid(c));
  };

  const draft = (): EntryDraft | null => {
    if (!valid || amount === null || !category) return null;
    const d: EntryDraft = {
      categoryId,
      name: cleanText(name) || displayName(category.names, language),
      amount,
      paid,
      repeat,
    };
    if (due !== undefined) d.dueDay = due;
    const n = cleanText(note, 200);
    if (n) d.note = n;
    return d;
  };

  const save = (next = false) => {
    const d = draft();
    if (!d) { setShowError(true); return; }
    if (editing) onSave(editing.id, d);
    else onCreate(month, d);
    if (next) {
      reset(categoryId);
      setPaid(paid);
      setTouched({ paid: true, repeat: false });
      amountRef.current?.focus({ preventScroll: true });
    } else onClose();
  };

  const title = editing ? t.editEntry : income ? t.newIncome : t.newExpense;

  return (
    <Sheet open={!!mode} title={title} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: () => save(), disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        {/* Amount — the one thing every entry needs. */}
        <div className="text-center pt-1">
          <label htmlFor={amountId} className="eyebrow text-fg-mute">{t.amount}</label>
          {/* Written the way amounts are shown everywhere: "−45,12 €", left to right. */}
          <div dir="ltr" className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className={`rounded-num text-[32px] font-semibold ${income ? 'text-pos' : 'text-fg-mute'}`} aria-hidden="true">
              {income ? '+' : '−'}
            </span>
            <input
              ref={amountRef}
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="0,00"
              value={amountText}
              onChange={e => { setAmountText(normalizeDigits(e.target.value)); setShowError(false); }}
              aria-invalid={showError && amount === null}
              aria-describedby={showError && amount === null ? `${amountId}-err` : undefined}
              style={{ width: `${Math.max(4, amountText.length || 4) + 0.6}ch` }}
              className="min-w-0 max-w-full bg-transparent rounded-num text-[clamp(40px,13vw,52px)] leading-[1.15] font-bold text-center text-fg placeholder:text-fg-faint/60 caret-accent outline-none"
            />
            <span className="rounded-num text-[32px] font-semibold text-fg-mute" aria-hidden="true">€</span>
          </div>
          {showError && amount === null && (
            <p id={`${amountId}-err`} role="alert" className="text-caption text-neg mt-2">{t.amountInvalid}</p>
          )}
        </div>

        <div>
          <Field
            label={income ? t.fromWhom : t.whatFor}
            value={name}
            onChange={setName}
            placeholder={income ? t.fromWhomPlaceholder : t.whatForPlaceholder}
            maxLength={80}
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="sentences"
          />
          {suggestions.length > 0 && (
            <div className="mt-2 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label={t.suggestions}>
              {suggestions.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    tapLight();
                    setName(s.name);
                    if (s.last) {
                      // What it was last time — only where nothing was typed yet.
                      if (!amountText.trim() && s.last.repeat !== 'none') setAmountText(amountToInput(s.last.amount, t.locale));
                      if (!dueText.trim() && s.last.dueDay) setDueText(String(s.last.dueDay));
                      if (!touched.repeat) setRepeat(s.last.repeat);
                    }
                  }}
                  className="shrink-0 min-h-[38px] px-4 rounded-full bg-surface-2 text-label font-medium text-fg active:scale-[0.97] transition-transform focus-visible:ring-focus"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>{t.category}</Label>
          <div ref={railRef} className="relative -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label={t.category}>
            {categories.map(c => {
              const on = c.id === categoryId;
              const cname = displayName(c.names, language);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-hue={c.hue}
                  onClick={() => pickCategory(c)}
                  className={`shrink-0 min-h-[44px] ps-2 pe-4 rounded-full inline-flex items-center gap-2 text-label border-2 transition-colors focus-visible:ring-focus ${
                    on ? 'bg-hue-bg text-hue-ink border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
                >
                  <span className="emoji text-[20px]" aria-hidden="true">{c.emoji}</span>
                  {cname}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>{t.status}</Label>
          <Segmented<'paid' | 'open'>
            label={t.status}
            value={paid ? 'paid' : 'open'}
            onChange={v => { setPaid(v === 'paid'); setTouched(x => ({ ...x, paid: true })); }}
            options={[
              { value: 'paid', label: income ? t.statusReceived : t.statusPaid },
              { value: 'open', label: income ? t.statusExpected : t.statusOpen },
            ]}
          />
        </div>

        <div>
          <Label>{t.repeat}</Label>
          <Segmented<Repeat>
            label={t.repeat}
            value={repeat}
            onChange={v => { setRepeat(v); setTouched(x => ({ ...x, repeat: true })); }}
            options={[
              { value: 'none', label: t.repeatNone },
              { value: 'monthly', label: t.repeatMonthly },
              { value: 'yearly', label: t.repeatYearly },
            ]}
          />
          <p className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">
            {repeat === 'monthly' ? t.repeatHintMonthly : repeat === 'yearly' ? t.repeatHintYearly : t.repeatHintNone}
          </p>
        </div>

        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
          <Field
            label={t.dueDay}
            value={dueText}
            onChange={v => setDueText(normalizeDigits(v).replace(/\D/g, '').slice(0, 2))}
            placeholder={t.dueDayPlaceholder}
            inputMode="numeric"
            maxLength={2}
            aria-invalid={!dueValid}
            title={t.dueDayHint}
          />
          <Field label={t.note} value={note} onChange={setNote} placeholder={t.notePlaceholder} maxLength={200} />
        </div>
        {!dueValid && <p role="alert" className="text-caption text-neg -mt-4 px-1">{t.dueDayHint}</p>}

        <div className="grid gap-2 pt-1">
          <Button type="submit" full size="lg" disabled={!valid}>{t.save}</Button>
          {!editing && (
            <Button variant="secondary" full disabled={!valid} onClick={() => save(true)}>{t.saveAndNext}</Button>
          )}
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onDelete(editing.id); onClose(); }}>{t.deleteEntry}</Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
