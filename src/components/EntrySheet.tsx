import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Category, Entry, EntryDraft, MonthKey, Repeat } from '../types';
import {
  amountToInput, cleanText, daysInMonth, defaultEntryDate, displayName, isIsoDay, monthKeyOf, parseAmount, suggestNames, normalizeDigits,
  topCategories,
} from '../logic';
import { Strings, fmt } from '../translations';
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
  /** The categories of the month the entry goes into — shown first; the rest behind "More". */
  featured: string[];
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
 * New or edited entry, top to bottom: the date (today), the name — no label,
 * the keyboard goes there first — with three suggestions from the user's own
 * earlier entries (all of them behind a button), the category (three, the
 * rest behind a button), then the amount. A tap on a suggestion ("Miete")
 * takes the entry to that name's category, fills in what it was last time
 * when the amount is still empty, and moves on to the amount. A new entry —
 * income or expense — is paid / received and happens once unless changed
 * (a suggestion doesn't change that), so most entries are name + amount + save. (A due day is no longer asked
 * for; one already on an entry, or on the suggestion's last entry, is kept.)
 */
export function EntrySheet({ mode, categories, featured, entries, language, t, onClose, onCreate, onSave, onDelete }: Props) {
  const editing = mode?.kind === 'edit' ? mode.entry : null;
  const month = mode?.kind === 'edit' ? mode.entry.month : mode?.month ?? monthKeyOf();

  const [categoryId, setCategoryId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [paid, setPaid] = useState(true);
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [dueText, setDueText] = useState('');
  const [dateText, setDateText] = useState('');
  const [note, setNote] = useState('');
  const [allCategories, setAllCategories] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState(false);
  const [showError, setShowError] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountId = useId();

  const category = categories.find(c => c.id === categoryId);
  const income = category?.kind === 'income';


  const reset = (keepCategory?: string) => {
    const c = categories.find(x => x.id === (keepCategory ?? (mode?.kind === 'new' ? mode.categoryId : ''))) ?? categories[0];
    setCategoryId(c?.id ?? '');
    setAmountText('');
    setName('');
    // A new entry: paid, once — the way most receipts are.
    setPaid(true);
    setRepeat('none');
    setDueText('');
    setDateText(defaultEntryDate(month));
    setNote('');
    setShowError(false);
    setAllCategories(false);
    setAllSuggestions(false);
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
      setDateText(e.date ?? '');
      setNote(e.note ?? '');
      setAllCategories(false);
      setShowError(false);
    } else {
      reset();
      // Focus after the sheet has mounted; preventScroll keeps the page still.
      requestAnimationFrame(() => nameRef.current?.focus({ preventScroll: true }));
    }
  }, [mode]);

  const amount = parseAmount(amountText, t.locale);
  const due = /^\d{1,2}$/.test(dueText.trim()) ? Number(dueText) : undefined;
  const dueValid = dueText.trim() === '' || (due !== undefined && due >= 1 && due <= 31);
  // A date inside the entry's month, or none (entries from before dates existed).
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const dateValid = dateText === '' || (isIsoDay(dateText) && dateText >= firstDay && dateText <= lastDay);
  const valid = amount !== null && !!category && dueValid && dateValid;

  const suggestions = useMemo(
    // From every month and category, narrowed with each letter typed.
    () => (editing || !categoryId ? [] : suggestNames({ entries, categoryId, categories, query: name, lang: language, limit: 60 })),
    [editing, entries, categoryId, categories, name, language],
  );
  // Three at a glance; the rest behind "All".
  const shownSuggestions = allSuggestions ? suggestions : suggestions.slice(0, 3);
  // Three at a glance (this month's and the most used, the chosen one always
  // among them), every category behind "All".
  const inView = useMemo(
    () => topCategories({ categories, entries, selectedId: categoryId, featured }),
    [categories, entries, categoryId, featured],
  );
  const shownCategories = allCategories ? categories : inView;
  const hiddenCount = categories.length - inView.length;

  const pickCategory = (c: Category) => {
    tapLight();
    setCategoryId(c.id);
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
    if (dateText) d.date = dateText;
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
      const keepDate = dateText;
      reset(categoryId);
      setDateText(keepDate); // a stack of receipts is usually from one day
      setPaid(paid);
      nameRef.current?.focus({ preventScroll: true });
    } else onClose();
  };

  const title = editing ? t.editEntry : income ? t.newIncome : t.newExpense;

  return (
    <Sheet open={!!mode} title={title} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: () => save(), disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-6">
        {/* When — today unless changed; always inside the entry's month. */}
        <div>
          <Field
            label={t.date}
            type="date"
            value={dateText}
            onChange={setDateText}
            min={firstDay}
            max={lastDay}
            aria-invalid={!dateValid}
          />
          {!dateValid && <p role="alert" className="text-caption text-neg mt-1.5 px-1">{t.dateHint}</p>}
        </div>

        {/* What for — the placeholder says it; three of the user's own names below. */}
        <div>
          <Field
            inputRef={nameRef}
            label={income ? t.fromWhom : t.whatFor}
            hideLabel
            value={name}
            onChange={v => { setName(v); setAllSuggestions(false); }}
            placeholder={income ? t.fromWhomPlaceholder : t.whatForPlaceholder}
            maxLength={80}
            enterKeyHint="next"
            autoComplete="off"
            autoCapitalize="sentences"
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              amountRef.current?.focus({ preventScroll: true });
            }}
          />
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.suggestions}>
              {shownSuggestions.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    tapLight();
                    setName(s.name);
                    setAllSuggestions(false);
                    // A name that belongs to another category takes the entry there ("Lidl" → Lebensmittel).
                    const home = s.categoryId !== categoryId ? categories.find(c => c.id === s.categoryId) : undefined;
                    if (home) pickCategory(home);
                    let filled = !!amountText.trim();
                    if (s.last) {
                      // What it was last time — only where nothing was typed yet.
                      if (!filled && s.last.repeat !== 'none') { setAmountText(amountToInput(s.last.amount, t.locale)); filled = true; }
                    }
                    // On to the amount while it still needs typing; otherwise the keyboard can go.
                    if (filled) nameRef.current?.blur();
                    else amountRef.current?.focus({ preventScroll: true });
                  }}
                  className="min-h-[36px] max-w-full px-3.5 rounded-full bg-surface-2 text-label font-medium text-fg active:scale-[0.97] transition-transform focus-visible:ring-focus wrap-compound text-start"
                >
                  {s.name}
                </button>
              ))}
              {suggestions.length > 3 && (
                <button
                  type="button"
                  aria-expanded={allSuggestions}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { tapLight(); setAllSuggestions(v => !v); }}
                  className="min-h-[36px] px-3.5 rounded-full inline-flex items-center gap-1 text-label font-semibold text-accent bg-accent-dim active:opacity-70 focus-visible:ring-focus"
                >
                  {allSuggestions ? t.fewerSuggestions : fmt(t.allSuggestions, { n: suggestions.length })}
                  {allSuggestions
                    ? <ChevronUp className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                    : <ChevronDown className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>{t.category}</Label>
          {/* All at a glance, wrapping — no sideways sliding. */}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.category}>
            {shownCategories.map(c => {
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
                  className={`min-h-[40px] max-w-full ps-1.5 pe-3.5 rounded-full inline-flex items-center gap-1.5 text-label border-2 transition-colors focus-visible:ring-focus ${
                    on ? 'bg-hue-bg text-hue-ink border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
                >
                  <span className="emoji text-[18px] w-7 text-center" aria-hidden="true">{c.emoji}</span>
                  <span className="min-w-0 wrap-compound text-start">{cname}</span>
                </button>
              );
            })}
            {hiddenCount > 0 && (
              <button
                type="button"
                aria-expanded={allCategories}
                onClick={() => { tapLight(); setAllCategories(v => !v); }}
                className="min-h-[40px] px-3.5 rounded-full inline-flex items-center gap-1 text-label font-semibold text-accent bg-accent-dim active:opacity-70 focus-visible:ring-focus"
              >
                {allCategories ? t.fewerCategories : fmt(t.allCategories, { n: categories.length })}
                {allCategories
                  ? <ChevronUp className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                  : <ChevronDown className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

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
          <Label>{t.status}</Label>
          <Segmented<'paid' | 'open'>
            label={t.status}
            value={paid ? 'paid' : 'open'}
            onChange={v => setPaid(v === 'paid')}
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
            onChange={setRepeat}
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

        <Field label={t.note} value={note} onChange={setNote} placeholder={t.notePlaceholder} maxLength={200} />

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
