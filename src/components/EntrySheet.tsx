import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronUp, Hash, Plus, Repeat as RepeatIcon, Star, Trash2 } from 'lucide-react';
import { Category, Entry, EntryDraft, Favorite, Goal, MonthKey, Repeat } from '../types';
import { budgetOf } from '../data/defaults';
import {
  amountToInput, cleanText, dayLabel, daysInMonth, defaultEntryDate, displayName, evalAmount, formatMoney, formatMoneyShort, isIsoDay, isoDay, monthKeyOf, normalizeTags, parseAmount, suggestNames,
  normalizeDigits, topCategories,
} from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { tapLight } from '../ui/haptics';

export type EntrySheetMode =
  /** `preset`: what the first run's steps fill in ("Gehalt", monthly); the repeat stays for "save & next". */
  | { kind: 'new'; month: MonthKey; categoryId: string; preset?: { name?: string; repeat?: Repeat; amount?: number; paid?: boolean } }
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
  /** Pinned favourites, shown as chips at the top of a new entry (plan 09). */
  favorites?: Favorite[];
  /** Tap a favourite chip (one-tap add); `pin` from a long press opens it pre-filled. */
  onUseFavorite?: (fav: Favorite, pin?: boolean) => void;
  /** Pin the current entry as a favourite; returns false when the limit is reached. */
  onPinFavorite?: (fav: Omit<Favorite, 'id'>) => boolean;
  /** Open savings goals, for the "Für: …" pill on a Sparen category (plan 12). */
  goals?: Goal[];
}

/** A compact control in the entry sheet's last row (date, status, repeat, note). */
// A full 44 px tall (not a hit area around it): the date pill's tap has to land on the input itself.
const PILL = 'relative min-h-tap max-w-full ps-2 pe-3 rounded-full inline-flex items-center gap-1 bg-surface-2 text-label font-medium text-fg transition-opacity active:opacity-60';

/**
 * New or edited entry, top to bottom: the amount — the one thing every entry
 * needs, so a new one opens on it with the decimal pad up — then the name
 * with three suggestions from the user's own earlier entries (all of them
 * behind a button), the category (three, the rest behind a button), and one
 * row of pills: the date ("Heute", the system's date picker), paid or still
 * open (a tap switches), how it repeats (a menu) and a note. On an iPhone the
 * whole sheet fits above the decimal pad.
 *
 * A tap on a suggestion ("Miete") takes the entry to that name's category and
 * fills in what it was last time when it repeats and the amount is still
 * empty. A new entry — income or expense — is paid / received and happens
 * once unless changed, so most entries are amount + name + save. (A due day
 * is no longer asked for; one already on an entry is kept.)
 */
export function EntrySheet({ mode, categories, featured, entries, language, t, onClose, onCreate, onSave, onDelete, favorites = [], onUseFavorite, onPinFavorite, goals = [] }: Props) {
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
  const [noteOpen, setNoteOpen] = useState(false);
  /** Tags as typed (space- or comma-separated); normalised into the draft (plan 26). */
  const [tagText, setTagText] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState(false);
  const [showError, setShowError] = useState(false);
  /** The operator key row (plan 08) only while the amount is being typed. */
  const [amountFocused, setAmountFocused] = useState(false);
  /** Turned on once this entry has been pinned as a favourite in this session (plan 09). */
  const [pinned, setPinned] = useState(false);
  /** The savings goal this entry fills, on a Sparen category (plan 12). */
  const [goalId, setGoalId] = useState<string | undefined>(undefined);
  const [goalMenuAt, setGoalMenuAt] = useState<HTMLElement | null>(null);
  const [repeatAt, setRepeatAt] = useState<HTMLElement | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);
  const amountId = useId();

  const category = categories.find(c => c.id === categoryId);
  const income = category?.kind === 'income';
  /** A savings category: it can fill a goal (plan 12). */
  const isSaving = category?.kind === 'expense' && budgetOf(category) === 'save';
  const openGoalsList = goals.filter(g => !g.closedAt);
  const chosenGoal = goals.find(g => g.id === goalId);

  /** Insert an operator at the caret of the amount field, keeping focus (plan 08). */
  const insertOp = (op: string) => {
    const el = amountRef.current;
    if (!el) return;
    const start = el.selectionStart ?? amountText.length;
    const end = el.selectionEnd ?? amountText.length;
    const next = amountText.slice(0, start) + op + amountText.slice(end);
    setAmountText(next);
    setShowError(false);
    // Put the caret after the inserted operator, next frame (after React re-renders).
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      const at = start + op.length;
      el.setSelectionRange(at, at);
    });
  };

  const reset = (keepCategory?: string) => {
    const c = categories.find(x => x.id === (keepCategory ?? (mode?.kind === 'new' ? mode.categoryId : ''))) ?? categories[0];
    setCategoryId(c?.id ?? '');
    setAmountText('');
    setName('');
    // A new entry: paid, once — the way most receipts are.
    setPaid(true);
    setRepeat(mode?.kind === 'new' ? mode.preset?.repeat ?? 'none' : 'none');
    setDueText('');
    setDateText(defaultEntryDate(month));
    setNote('');
    setNoteOpen(false);
    setTagText('');
    setTagsOpen(false);
    setShowError(false);
    setAllCategories(false);
    setAllSuggestions(false);
    setGoalId(undefined);
  };

  useEffect(() => {
    if (!mode) return;
    setPinned(false);
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
      setNoteOpen(!!e.note);
      setTagText((e.tags ?? []).map(x => `#${x}`).join(' '));
      setTagsOpen(!!e.tags?.length);
      setAllCategories(false);
      setShowError(false);
      setGoalId(e.goalId);
    } else {
      reset();
      if (mode.preset?.name) setName(mode.preset.name);
      // A hint's "Eintragen" (a regular payment still missing): its usual amount, still open.
      if (mode.preset?.amount) setAmountText(amountToInput(mode.preset.amount, t.locale));
      if (mode.preset?.paid === false) setPaid(false);
      // The amount first, with the decimal pad. After the sheet has mounted;
      // preventScroll keeps the page still.
      requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
    }
  }, [mode]);

  // A plain amount, or a small sum ("12,50+4,80") the field can add up (plan 08).
  const computed = evalAmount(amountText, t.locale);
  const amount = parseAmount(amountText, t.locale) ?? computed;
  const isExpression = computed !== null;
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
  // Tag suggestions: tags already in use, minus those already typed (plan 26).
  const tagSuggestions = useMemo(() => {
    const used = new Set<string>();
    for (const e of entries) for (const x of e.tags ?? []) used.add(x);
    const chosen = new Set(normalizeTags(tagText.split(/[,\s]+/)));
    return [...used].filter(x => !chosen.has(x)).slice(0, 8);
  }, [entries, tagText]);
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
    // The goal link only on a Sparen category (plan 12).
    if (isSaving && goalId && goals.some(g => g.id === goalId)) d.goalId = goalId;
    const tags = normalizeTags(tagText.split(/[,\s]+/));
    if (tags.length) d.tags = tags;
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
      amountRef.current?.focus({ preventScroll: true });
    } else onClose();
  };

  const title = editing ? t.editEntry : income ? t.newIncome : t.newExpense;
  const dateLabel = !dateText ? t.dateNone : dateText === isoDay() ? t.dateToday : dayLabel(dateText, t.locale);
  const statusLabel = paid ? (income ? t.statusReceived : t.statusPaid) : (income ? t.statusExpected : t.statusOpen);
  const repeats: { value: Repeat; label: string; sub: string }[] = [
    { value: 'none', label: t.repeatNone, sub: t.repeatHintNone },
    { value: 'monthly', label: t.repeatMonthly, sub: t.repeatHintMonthly },
    { value: 'yearly', label: t.repeatYearly, sub: t.repeatHintYearly },
  ];

  return (
    <Sheet open={!!mode} title={title} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: () => save(), disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
        {/* Favourites (plan 09): one tap adds; a long press opens pre-filled. New entries only. */}
        {!editing && favorites.length > 0 && onUseFavorite && (
          <div className="-mt-1 flex flex-wrap gap-2" aria-label={t.favorites}>
            {favorites.map(f => {
              const c = categories.find(x => x.id === f.categoryId);
              return (
                <FavoriteChip
                  key={f.id}
                  emoji={c?.emoji}
                  name={f.name}
                  amount={f.amount !== undefined ? formatMoneyShort(f.amount, t.locale) : undefined}
                  onTap={() => { onUseFavorite(f); onClose(); }}
                  onHold={() => onUseFavorite(f, true)}
                />
              );
            })}
          </div>
        )}
        {/* Amount — the one thing every entry needs, so it comes first. */}
        <div className="text-center">
          <label htmlFor={amountId} className="eyebrow text-fg-mute">{t.amount}</label>
          {/* Written the way amounts are shown everywhere: "−45,12 €", left to right. */}
          <div dir="ltr" className="mt-0.5 flex items-baseline justify-center gap-1.5">
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
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                nameRef.current?.focus({ preventScroll: true });
              }}
              aria-invalid={showError && amount === null}
              aria-describedby={showError && amount === null ? `${amountId}-err` : undefined}
              style={{ width: `${Math.max(4, amountText.length || 4) + 0.6}ch` }}
              className="min-w-0 max-w-full bg-transparent rounded-num text-[clamp(40px,13vw,52px)] leading-[1.15] font-bold text-center text-fg placeholder:text-fg-faint/60 caret-accent outline-none"
            />
            <span className="rounded-num text-[32px] font-semibold text-fg-mute" aria-hidden="true">€</span>
          </div>
          {/* The running sum, announced politely — "= 17,30 €" (plan 08). */}
          {isExpression && amount !== null && (
            <p dir="ltr" aria-live="polite" className="text-label text-accent font-semibold mt-1 rounded-num">
              = {formatMoney(amount, t.locale)}
            </p>
          )}
          {showError && amount === null && (
            <p id={`${amountId}-err`} role="alert" className="text-caption text-neg mt-1">{t.amountInvalid}</p>
          )}
        </div>

        {/* The savings goal this fills (plan 12): only for a Sparen category, only when goals exist. */}
        {isSaving && openGoalsList.length > 0 && (
          <button
            type="button"
            onClick={e => setGoalMenuAt(e.currentTarget)}
            className="min-h-tap px-3.5 rounded-full bg-surface-2 inline-flex items-center gap-1.5 text-label font-medium text-fg active:scale-[0.97] transition-transform focus-visible:ring-focus"
          >
            {chosenGoal ? (
              <>
                <span className="emoji text-[15px]" aria-hidden="true">{chosenGoal.emoji}</span>
                <span className="wrap-compound">{fmt(t.entryForGoal, { name: chosenGoal.name })}</span>
              </>
            ) : (
              <span className="text-fg-mute">{t.entryForGoalNone}</span>
            )}
          </button>
        )}

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
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="sentences"
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              // Back to the amount while it is missing; otherwise the keyboard can go.
              if (amount === null) amountRef.current?.focus({ preventScroll: true });
              else nameRef.current?.blur();
            }}
          />
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.suggestions}>
              {shownSuggestions.map(s => {
                const on = s.name === name;
                return (
                  <button
                    key={s.name}
                    type="button"
                    aria-pressed={on}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      tapLight();
                      setName(s.name);
                      setAllSuggestions(false);
                      // A name that belongs to another category takes the entry there ("Lidl" → Lebensmittel).
                      const home = s.categoryId !== categoryId ? categories.find(c => c.id === s.categoryId) : undefined;
                      if (home) pickCategory(home);
                      let filled = !!amountText.trim();
                      // What it was last time — only where nothing was typed yet.
                      if (s.last && !filled && s.last.repeat !== 'none') { setAmountText(amountToInput(s.last.amount, t.locale)); filled = true; }
                      // To the amount while it still needs typing; otherwise the keyboard can go.
                      if (filled) nameRef.current?.blur();
                      else amountRef.current?.focus({ preventScroll: true });
                    }}
                    className={`hit-44 min-h-[36px] max-w-full px-3.5 rounded-full inline-flex items-center gap-1 text-label font-medium active:scale-[0.97] transition-transform focus-visible:ring-focus wrap-compound text-start ${
                      on ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-fg'}`}
                  >
                    {on && <Check className="w-4 h-4 shrink-0" strokeWidth={2.8} aria-hidden="true" />}
                    {s.name}
                  </button>
                );
              })}
              {suggestions.length > 3 && (
                <button
                  type="button"
                  aria-expanded={allSuggestions}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { tapLight(); setAllSuggestions(v => !v); }}
                  className="hit-44 min-h-[36px] px-3.5 rounded-full inline-flex items-center gap-1 text-label font-semibold text-accent bg-accent-dim active:opacity-70 focus-visible:ring-focus"
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

        {/* The category: all at a glance, wrapping — no sideways sliding. */}
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
                onMouseDown={e => e.preventDefault()}
                onClick={() => pickCategory(c)}
                className={`hit-44 min-h-[40px] max-w-full ps-1.5 pe-3.5 rounded-full inline-flex items-center gap-1.5 text-label border-2 transition-colors focus-visible:ring-focus ${
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
              onMouseDown={e => e.preventDefault()}
              onClick={() => { tapLight(); setAllCategories(v => !v); }}
              className="hit-44 min-h-[40px] px-3.5 rounded-full inline-flex items-center gap-1 text-label font-semibold text-accent bg-accent-dim active:opacity-70 focus-visible:ring-focus"
            >
              {allCategories ? t.fewerCategories : fmt(t.allCategories, { n: categories.length })}
              {allCategories
                ? <ChevronUp className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                : <ChevronDown className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
            </button>
          )}
        </div>

        {/* The rest in one row: when, paid or open, how it repeats, a note. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.entryDetails}>
          {/* The system's date picker, under a pill: the input lies invisibly over it. */}
          <label className={`${PILL} focus-within:ring-focus ${dateValid ? '' : 'text-neg'}`}>
            <CalendarDays className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
            <span aria-hidden="true">{dateLabel}</span>
            <input
              type="date"
              value={dateText}
              min={firstDay}
              max={lastDay}
              onChange={e => setDateText(e.target.value)}
              onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* not allowed here: the tap still focuses it */ } }}
              aria-label={`${t.date}: ${dateLabel}`}
              aria-invalid={!dateValid}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={paid}
            // The name stays; the switch says whether it is.
            aria-label={income ? t.statusReceived : t.statusPaid}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { tapLight(); setPaid(v => !v); }}
            className={`${PILL} focus-visible:ring-focus`}
          >
            <span
              className={`w-4 h-4 shrink-0 rounded-full inline-flex items-center justify-center ${paid ? 'bg-swipe-paid text-on-color' : 'border-[1.75px] border-warn'}`}
              aria-hidden="true"
            >
              {paid && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
            </span>
            <span className={paid ? '' : 'text-warn'} aria-hidden="true">{statusLabel}</span>
          </button>
          <button
            type="button"
            aria-haspopup="menu"
            aria-label={`${t.repeat}: ${repeats.find(r => r.value === repeat)!.label}`}
            onMouseDown={e => e.preventDefault()}
            onClick={e => { tapLight(); setRepeatAt(e.currentTarget); }}
            className={`${PILL} focus-visible:ring-focus`}
          >
            <RepeatIcon className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
            <span aria-hidden="true">{repeats.find(r => r.value === repeat)!.label}</span>
          </button>
          {!noteOpen && (
            <button
              type="button"
              onClick={() => { tapLight(); setNoteOpen(true); requestAnimationFrame(() => noteRef.current?.focus({ preventScroll: true })); }}
              className={`${PILL} text-fg-mute focus-visible:ring-focus`}
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
              {t.note}
            </button>
          )}
          {!tagsOpen && (
            <button
              type="button"
              onClick={() => { tapLight(); setTagsOpen(true); requestAnimationFrame(() => tagRef.current?.focus({ preventScroll: true })); }}
              className={`${PILL} text-fg-mute focus-visible:ring-focus`}
            >
              <Hash className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
              {t.tag}
            </button>
          )}
        </div>
        {!dateValid && <p role="alert" className="text-caption text-neg px-1">{t.dateHint}</p>}
        <Menu
          anchor={repeatAt}
          label={t.repeat}
          groups={[repeats.map(r => ({
            key: r.value, label: r.label, sub: r.sub, icon: r.value === repeat ? Check : undefined, onSelect: () => setRepeat(r.value),
          }))]}
          onClose={() => setRepeatAt(null)}
        />

        <Menu
          anchor={goalMenuAt}
          label={t.entryForGoalNone}
          groups={[[
            { key: 'none', label: t.entryForGoalClear, icon: goalId ? undefined : Check, onSelect: () => setGoalId(undefined) },
            ...openGoalsList.map(g => ({ key: g.id, label: g.name, icon: g.id === goalId ? Check : undefined, onSelect: () => setGoalId(g.id) })),
          ]]}
          onClose={() => setGoalMenuAt(null)}
        />

        {noteOpen && (
          <Field inputRef={noteRef} label={t.note} value={note} onChange={setNote} placeholder={t.notePlaceholder} maxLength={200} enterKeyHint="done" />
        )}

        {tagsOpen && (
          <div>
            <Field inputRef={tagRef} label={t.tags} value={tagText} onChange={setTagText} placeholder={t.tagPlaceholder} maxLength={160} enterKeyHint="done" />
            {tagSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagSuggestions.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { tapLight(); setTagText(tt => (normalizeTags(tt.split(/[,\s]+/)).includes(tag) ? tt : `${tt.trim()} #${tag}`.trim())); }}
                    className="hit-44 min-h-[34px] px-3 rounded-full bg-surface-2 text-fg-mute text-label active:scale-[0.97] transition-transform focus-visible:ring-focus"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-2 pt-2">
          <Button type="submit" full size="lg" disabled={!valid}>{t.save}</Button>
          {!editing && (
            <Button variant="secondary" full disabled={!valid} onClick={() => save(true)}>{t.saveAndNext}</Button>
          )}
          {onPinFavorite && !!category && !!cleanText(name) && (
            <Button variant="ghost" full icon={pinned ? Check : Star} disabled={pinned}
              onClick={() => {
                const ok = onPinFavorite({
                  name: cleanText(name) || displayName(category.names, language),
                  categoryId,
                  ...(amount !== null ? { amount } : {}),
                  ...(repeat !== 'none' ? { repeat } : {}),
                });
                if (ok) setPinned(true);
              }}>
              {pinned ? t.favoriteSaved : t.pinFavorite}
            </Button>
          )}
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onDelete(editing.id); onClose(); }}>{t.deleteEntry}</Button>
          )}
        </div>
      </form>
      {/* The + − × ÷ row, only while the amount is being typed (plan 08). */}
      <OperatorKeys show={amountFocused} t={t} onInsert={insertOp} />
    </Sheet>
  );
}

/**
 * A slim row of calculator keys pinned to the top of the keyboard while the
 * amount field is focused (plan 08). Portalled to <body> and positioned on the
 * visual viewport's bottom edge, the same way the sheet follows the keyboard.
 * Keys use onMouseDown/preventDefault so the field keeps focus (and the
 * keyboard stays up) when a key is pressed.
 */
function OperatorKeys({ show, t, onInsert }: { show: boolean; t: Strings; onInsert: (op: string) => void }) {
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    const v = window.visualViewport;
    if (!show || !v) return;
    const update = () => setBottom(Math.max(0, window.innerHeight - v.height - v.offsetTop));
    update();
    v.addEventListener('resize', update);
    v.addEventListener('scroll', update);
    return () => { v.removeEventListener('resize', update); v.removeEventListener('scroll', update); };
  }, [show]);
  if (!show) return null;
  const keys: { op: string; label: string }[] = [
    { op: '+', label: t.calcPlus },
    { op: '−', label: t.calcMinus },
    { op: '×', label: t.calcTimes },
    { op: '÷', label: t.calcDivide },
  ];
  return createPortal(
    <div className="fixed inset-x-0 z-[60] pointer-events-none" style={{ bottom }}>
      <div className="mx-auto w-full max-w-xl px-2 pb-1">
        <div className="pointer-events-auto flex gap-1 rounded-sm bg-surface-2 p-1 glass-chrome">
          {keys.map(k => (
            <button
              key={k.op}
              type="button"
              aria-label={k.label}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { tapLight(); onInsert(k.op); }}
              className="flex-1 min-h-[44px] rounded-[10px] bg-surface text-fg text-[20px] font-semibold active:scale-[0.96] transition-transform focus-visible:ring-focus"
            >
              {k.op}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * A favourite as a chip (plan 09): a short tap uses it, a long press (500 ms)
 * opens it pre-filled. The long press cancels the tap so it never does both.
 */
function FavoriteChip({ emoji, name, amount, onTap, onHold }: {
  emoji?: string;
  name: string;
  amount?: string;
  onTap: () => void;
  onHold: () => void;
}) {
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = () => {
    held.current = false;
    timer.current = setTimeout(() => { held.current = true; tapLight(); onHold(); }, 500);
  };
  const end = () => { if (timer.current) clearTimeout(timer.current); };
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onClick={() => { if (!held.current) { tapLight(); onTap(); } }}
      className="hit-44 min-h-[40px] max-w-full ps-2 pe-3 rounded-full bg-surface-2 text-fg inline-flex items-center gap-1.5 text-label font-medium active:scale-[0.97] transition-transform focus-visible:ring-focus wrap-compound text-start"
    >
      {emoji && <span className="emoji text-[15px]" aria-hidden="true">{emoji}</span>}
      <span className="wrap-compound">{name}</span>
      {amount && <span className="text-fg-mute num" dir="ltr">{amount}</span>}
    </button>
  );
}
