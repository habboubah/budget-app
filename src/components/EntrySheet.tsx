import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarOff, Camera, Check, ChevronDown, ChevronUp, FileText, HandCoins, Hash, Image as ImageIcon, Landmark, Paperclip, ScanText, X, Plus, Repeat as RepeatIcon, Sparkles, SpellCheck, Split, ShieldCheck, Star, Trash2, Undo2 } from 'lucide-react';
import { Attachment, Category, Entry, EntryDraft, Favorite, Goal, Interval, MonthKey, Project, Repeat, TAX_KINDS, TaxKind } from '../types';
import { taxKindLabel } from './TaxView';
import { fromProjectCurrency } from '../insights/projects';
import { REPEAT_CHOICES, repeatName } from '../repeatLabel';
import { shiftDay } from '../contracts';
import { NotAReceiptError, addAttachment, attachmentBlob, dropAttachment, readReceipt } from '../receipts';
import { readImageText } from '../ocr';
import { FileTooLargeError } from '../limits';
import { ReceiptViewer } from './ReceiptViewer';
import { budgetOf } from '../data/defaults';
import {
  amountToInput, cleanText, dayLabel, dayLabelYear, shiftDays, isMonthKey, monthLabel, periodRange, defaultEntryDate, displayName, evalAmount, formatMoney, withAmounts, formatMoneyShort, isIsoDay, isoDay, monthKeyOf, normalizeTags, parseAmount, suggestNames,
  normalizeDigits, topCategories, MAIN_ACCOUNT, MAX_ATTACHMENTS, currencySymbol } from '../logic';
import { buildKeywordIndex, completeNames, correctTypo, guessCategories } from '../keywords';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { tapLight } from '../ui/haptics';

export type EntrySheetMode =
  /** `preset`: what the first run's steps fill in ("Gehalt", monthly); the repeat stays for "save & next". */
  | { kind: 'new'; month: MonthKey; categoryId: string; preset?: { name?: string; repeat?: Repeat; amount?: number; paid?: boolean; note?: string } }
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
  /** Pinned favourites, shown as chips at the top of a new entry (plan 09): a tap fills the sheet in, nothing is saved yet. */
  favorites?: Favorite[];
  /** Pin the current entry as a favourite; returns false when the limit is reached. */
  onPinFavorite?: (fav: Omit<Favorite, 'id'>) => boolean;
  /** Open savings goals, for the "Für: …" pill on a Sparen category (plan 12). */
  goals?: Goal[];
  /** Split this (existing) payment into parts (plan 21). */
  onSplit?: (entry: Entry) => void;
  /** Take the category the typed name points to, until one is tapped (plan 32; Kategorien → switch). Off: only point it out. */
  autoCategory?: boolean;
  /** The accounts, once there is more than one (plan 30): an account pill joins the details. */
  accounts?: { id: string; label: string; emoji: string }[];
  /** The account a new entry goes into (the one the month shows). */
  defaultAccount?: string;
  /** The debts still open, once there is one (plan 31): a pill links the entry to one — an extra payment, money paid back. */
  debts?: { id: string; name: string }[];
  /** The trips and projects running today (schema 28): a pill each puts the entry under one — and, for a trip abroad, takes the amount in its currency. */
  projects?: Project[];
  /** Offer the tax mark (schema 29): switched on under Optionen › Steuerliste, or the book already has marked entries. */
  taxMarks?: boolean;
  /** Says why a receipt couldn't be attached or read (plan 27). */
  onNotice?: (text: string) => void;
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
 *
 * While the name is typed (plan 32, src/keywords.ts) the suggestions complete
 * it from earlier names and every category's keywords, a typo gets "Meintest
 * du …?", and the categories it points to move to the front with a ✦ and a
 * short pop. A sure match is also chosen — for a new entry, until the user
 * taps a category, and only with `autoCategory`; emptying the name goes back
 * to the category the sheet opened with.
 */
export function EntrySheet({ mode, categories, featured, entries, language, t, onClose, onCreate, onSave, onDelete, favorites = [], onPinFavorite, goals = [], onSplit, autoCategory = true, accounts, defaultAccount = MAIN_ACCOUNT, debts, projects = [], taxMarks = false, onNotice }: Props) {
  const editing = mode?.kind === 'edit' ? mode.entry : null;
  const month = mode?.kind === 'edit' ? mode.entry.month : mode?.month ?? monthKeyOf();

  const [categoryId, setCategoryId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [name, setName] = useState('');
  const [paid, setPaid] = useState(true);
  const [repeat, setRepeat] = useState<Repeat>('none');
  // A yearly entry's interval when it isn't twelve months, and a recurring entry's last month (schema 24).
  const [refund, setRefund] = useState(false);
  // Marked for the tax return (schema 29), and the menu it is picked from.
  const [tax, setTax] = useState<TaxKind | undefined>(undefined);
  const [taxAt, setTaxAt] = useState<HTMLElement | null>(null);
  const [every, setEvery] = useState<Interval | undefined>(undefined);
  const [until, setUntil] = useState('');
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
  /** The name was typed in this sheet: only then are categories guessed (not for a preset or an entry being opened). */
  const [nameTyped, setNameTyped] = useState(false);
  /** A category (or a name suggestion) was tapped: no more automatic picking. */
  const [categoryChosen, setCategoryChosen] = useState(false);
  /** The category the sheet opened with, for when the name is emptied again. */
  const [baseCategory, setBaseCategory] = useState('');
  const [goalMenuAt, setGoalMenuAt] = useState<HTMLElement | null>(null);
  /** The account it is paid from or into (plan 30). */
  const [accountId, setAccountId] = useState(MAIN_ACCOUNT);
  const [accountAt, setAccountAt] = useState<HTMLElement | null>(null);
  /** The debt it pays off (plan 31). */
  const [debtId, setDebtId] = useState<string | undefined>(undefined);
  const [debtAt, setDebtAt] = useState<HTMLElement | null>(null);
  /** Receipts and documents (plan 27): what is attached, the one being looked at, and what is busy. */
  const [files, setFiles] = useState<Attachment[]>([]);
  // What the receipt is kept for (schema 27): the warranty's last day, the last day to return it.
  const [warranty, setWarranty] = useState('');
  const [returnBy, setReturnBy] = useState('');
  const [fileAt, setFileAt] = useState<HTMLElement | null>(null);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const [fileBusy, setFileBusy] = useState<'adding' | 'reading' | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const pickInput = useRef<HTMLInputElement>(null);
  /** Stored during this visit and not yet part of a saved entry: they go again if the sheet is left without saving. */
  const fresh = useRef<Set<string>>(new Set());
  const [repeatAt, setRepeatAt] = useState<HTMLElement | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);
  const amountId = useId();

  const category = categories.find(c => c.id === categoryId);
  const income = category?.kind === 'income';
  /** Money back in an expense category (schema 26): it reads like income in the sheet, and is saved with a negative amount. */
  const isRefund = refund && !income;
  const gain = income || isRefund;
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
    setBaseCategory(c?.id ?? '');
    setNameTyped(false);
    setCategoryChosen(false);
    setAmountText('');
    setName('');
    // A new entry: paid, once — the way most receipts are.
    setPaid(true);
    setRepeat(mode?.kind === 'new' ? mode.preset?.repeat ?? 'none' : 'none');
    setEvery(undefined);
    setUntil('');
    setRefund(false);
    setTax(undefined);
    setDueText('');
    setDateText(defaultEntryDate(month));
    setNote('');
    setNoteOpen(false);
    // A trip in progress — a project with both its dates, running today — is where a new entry most likely belongs.
    setTagText(projects.filter(p => p.from && p.to).map(p => `#${p.tag}`).join(' '));
    setTagsOpen(false);
    setShowError(false);
    setAllCategories(false);
    setAllSuggestions(false);
    setGoalId(undefined);
    setAccountId(defaultAccount);
    setDebtId(undefined);
    setFiles([]);
    setWarranty('');
    setReturnBy('');
  };

  useEffect(() => {
    if (!mode) return;
    setPinned(false);
    if (mode.kind === 'edit') {
      const e = mode.entry;
      setCategoryId(e.categoryId);
      setAmountText(amountToInput(Math.abs(e.amount), t.locale));
      setName(e.name);
      setPaid(e.paid);
      setRepeat(e.repeat);
      setEvery(e.repeat === 'yearly' ? e.every : undefined);
      setUntil(e.until ?? '');
      setRefund(!!e.refund);
      setTax(e.tax);
      setDueText(e.dueDay ? String(e.dueDay) : '');
      setDateText(e.date ?? '');
      setNote(e.note ?? '');
      setNoteOpen(!!e.note);
      setTagText((e.tags ?? []).map(x => `#${x}`).join(' '));
      setTagsOpen(!!e.tags?.length);
      setAllCategories(false);
      setShowError(false);
      setGoalId(e.goalId);
      setAccountId(e.accountId ?? MAIN_ACCOUNT);
      setDebtId(e.debtId);
      setFiles(e.files ?? []);
      setWarranty(e.warrantyUntil ?? '');
      setReturnBy(e.returnUntil ?? '');
      // An entry being edited keeps its category: guesses are only pointed out.
      setNameTyped(false);
      setCategoryChosen(true);
      setBaseCategory(e.categoryId);
    } else {
      reset();
      if (mode.preset?.name) setName(mode.preset.name);
      // A hint's "Eintragen" (a regular payment still missing): its usual amount, still open.
      if (mode.preset?.amount) setAmountText(amountToInput(mode.preset.amount, t.locale));
      if (mode.preset?.paid === false) setPaid(false);
      // A scanned invoice: its reference and IBAN, to pay it from the banking app.
      if (mode.preset?.note) { setNote(mode.preset.note); setNoteOpen(true); }
      // The amount first, with the decimal pad. After the sheet has mounted;
      // preventScroll keeps the page still.
      requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
    }
  }, [mode]);

  // A plain amount, or a small sum ("12,50+4,80") the field can add up (plan 08).
  const computed = evalAmount(amountText, t.locale);
  const typed = parseAmount(amountText, t.locale) ?? computed;
  // Under a trip abroad, a new entry's amount is typed in the trip's currency and saved in the book's (schema 28).
  const tagSet = new Set(normalizeTags(tagText.split(/[,\s]+/)));
  const abroad = mode?.kind === 'new' ? projects.find(p => p.currency && p.rate && tagSet.has(p.tag)) : undefined;
  const amount = typed !== null && abroad ? fromProjectCurrency(typed, abroad) : typed;
  const isExpression = computed !== null;
  const due = /^\d{1,2}$/.test(dueText.trim()) ? Number(dueText) : undefined;
  const dueValid = dueText.trim() === '' || (due !== undefined && due >= 1 && due <= 31);
  // A date inside the entry's month, or none (entries from before dates existed).
  const { first: firstDay, last: lastDay } = periodRange(month);
  const dateValid = dateText === '' || (isIsoDay(dateText) && dateText >= firstDay && dateText <= lastDay);
  const valid = amount !== null && !!category && dueValid && dateValid;

  // Earlier names and every category's keywords, read once per change of them (plan 32). App
  // passes fresh arrays on each render, so the categories are compared by what matters here.
  const categoriesKey = JSON.stringify(categories.map(c => [c.id, c.names, c.keywords ?? null]));
  const featuredKey = featured.join(',');
  const keywordIndex = useMemo(() => buildKeywordIndex({ categories, entries, lang: language }), [categoriesKey, entries, language]);
  /** The categories the typed name points to, best first — the sure ones only, when there are. */
  const guesses = useMemo(
    () => (nameTyped ? guessCategories(keywordIndex, name, { featured }) : []),
    [nameTyped, keywordIndex, name, featuredKey],
  );
  /** "Lidel" → "Lidl". */
  const correction = useMemo(() => (nameTyped ? correctTypo(keywordIndex, name) : null), [nameTyped, keywordIndex, name]);

  /** The name as typed: it may also pick the category (see above). */
  const typeName = (v: string) => {
    setName(v);
    setAllSuggestions(false);
    setNameTyped(true);
    if (!autoCategory || categoryChosen) return;
    const best = guessCategories(keywordIndex, v, { featured })[0];
    if (best?.sure) setCategoryId(best.categoryId);
    else if (!cleanText(v)) setCategoryId(baseCategory);
  };

  const suggestions = useMemo(() => {
    if ((editing && !nameTyped) || !categoryId) return [];
    // Nothing typed: this category's names first, from every month (and its built-in ideas).
    if (!cleanText(name)) return suggestNames({ entries, categoryId, categories, query: '', lang: language, limit: 60 });
    // Typed: what completes it — earlier names, then keywords, then what a typo probably meant.
    const all = completeNames(keywordIndex, name, { categoryId });
    return correction ? all.filter(s => s.name !== correction) : all;
  }, [editing, nameTyped, entries, categoryId, categories, name, language, keywordIndex, correction]);
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
  // What the name points to comes first ("filtered"), then the chosen one, then the usual three.
  const guessed = new Set(guesses.map(g => g.categoryId));
  const atGlance = useMemo(() => {
    if (!guesses.length) return inView;
    const first = [...guesses.map(g => g.categoryId), categoryId, ...inView.map(c => c.id)];
    const ids = [...new Set(first)].filter(id => categories.some(c => c.id === id));
    const size = Math.max(3, guesses.length + (guesses.some(g => g.categoryId === categoryId) ? 0 : 1));
    return ids.slice(0, size).map(id => categories.find(c => c.id === id)!);
  }, [guesses, inView, categoryId, categories]);
  const shownCategories = allCategories ? categories : atGlance;
  const hiddenCount = categories.length - atGlance.length;
  /** Changes when other categories are pointed to: their chips pop again. */
  const guessKey = guesses.map(g => g.categoryId).join(',');

  const pickCategory = (c: Category) => {
    tapLight();
    setCategoryId(c.id);
    setCategoryChosen(true);
  };

  /**
   * A favourite fills the sheet in — name, category, amount, repeat — and
   * nothing is saved before *Sichern*: the amount is focused with all of it
   * selected, as it is what usually changes (a deleted category falls to
   * Sonstiges).
   */
  const fillFrom = (f: Favorite) => {
    tapLight();
    const c = categories.find(x => x.id === f.categoryId) ?? categories.find(x => x.id === 'extra') ?? categories[0];
    if (c) setCategoryId(c.id);
    setCategoryChosen(true);
    setName(f.name);
    setNameTyped(false);
    setAllSuggestions(false);
    setRepeat(f.repeat ?? 'none');
    setEvery(undefined);
    setAmountText(f.amount !== undefined ? amountToInput(f.amount, t.locale) : '');
    setShowError(false);
    requestAnimationFrame(() => {
      const el = amountRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.select();
    });
  };

  const draft = (): EntryDraft | null => {
    if (!valid || amount === null || !category) return null;
    const d: EntryDraft = {
      categoryId,
      name: cleanText(name) || displayName(category.names, language),
      amount: isRefund ? -amount : amount,
      refund: isRefund || undefined,
      tax: income ? undefined : tax,
      paid,
      repeat,
      // Always said, so an edit can take the interval or the end off again (schema 24).
      every: repeat === 'yearly' ? every : undefined,
      until: repeat !== 'none' && isMonthKey(until) && until >= month ? until : undefined,
    };
    if (due !== undefined) d.dueDay = due;
    if (dateText) d.date = dateText;
    // What was typed abroad is kept as the note when there is none: "450,00 TRY".
    const n = cleanText(note, 200) || (abroad && typed !== null ? `${amountToInput(typed, t.locale)} ${abroad.currency}` : '');
    if (n) d.note = n;
    // The goal link only on a Sparen category (plan 12).
    if (isSaving && goalId && goals.some(g => g.id === goalId)) d.goalId = goalId;
    const tags = normalizeTags(tagText.split(/[,\s]+/));
    if (tags.length) d.tags = tags;
    // Always said once accounts show, so moving an entry back to the main account clears its account (plan 30).
    if (accounts) d.accountId = accountId === MAIN_ACCOUNT || !accounts.some(a => a.id === accountId) ? undefined : accountId;
    // The same for the debt link (plan 31): said whenever debts show, so it can be taken off again.
    if (debts) d.debtId = debtId && debts.some(x => x.id === debtId) ? debtId : undefined;
    // Always said, so the last receipt can be taken off again (plan 27).
    d.files = files.length ? files : undefined;
    // The same for what the receipt is kept for (schema 27).
    d.warrantyUntil = isIsoDay(warranty) ? warranty : undefined;
    d.returnUntil = isIsoDay(returnBy) ? returnBy : undefined;
    return d;
  };

  /* ---- Receipts (plan 27). */
  // Left without saving: what was stored during this visit goes again.
  useEffect(() => {
    if (mode) return;
    for (const id of fresh.current) void dropAttachment(id);
    fresh.current.clear();
  }, [mode]);

  const attach = async (input: HTMLInputElement | null) => {
    const f = input?.files?.[0];
    if (input) input.value = '';
    if (!f) return;
    if (files.length >= MAX_ATTACHMENTS) { onNotice?.(t.receiptTooMany); return; }
    setFileBusy('adding');
    try {
      const added = await addAttachment(f);
      fresh.current.add(added.id);
      setFiles(prev => [...prev, added]);
    } catch (error) {
      onNotice?.(error instanceof FileTooLargeError ? t.importTooLarge : error instanceof NotAReceiptError ? t.receiptNotReadable : t.receiptFailed);
    } finally {
      setFileBusy(null);
    }
  };

  const detach = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    // One of this visit's goes at once; a saved entry's stays until the next launch, like a deleted entry's.
    if (fresh.current.delete(id)) void dropAttachment(id);
  };

  /** Betrag vom Beleg lesen: the total, and the shop when no name is typed yet — read on the device. */
  const readFromReceipt = async () => {
    const photo = files.find(f => f.type === 'image/jpeg');
    if (!photo || fileBusy) return;
    setFileBusy('reading');
    try {
      const blob = await attachmentBlob(photo);
      const found = blob ? readReceipt(await readImageText(blob)) : {};
      if (!found.amount && !found.shop) { onNotice?.(t.receiptNothingRead); return; }
      if (found.amount) setAmountText(amountToInput(found.amount, t.locale));
      if (found.shop && !name.trim()) setName(found.shop);
    } catch {
      onNotice?.(t.receiptNothingRead);
    } finally {
      setFileBusy(null);
    }
  };

  const save = (next = false) => {
    const d = draft();
    if (!d) { setShowError(true); return; }
    fresh.current.clear(); // saved with the entry
    if (editing) onSave(editing.id, d);
    else onCreate(month, d);
    if (next) {
      const keepDate = dateText;
      reset(categoryId);
      setDateText(keepDate); // a stack of receipts is usually from one day
      setPaid(paid);
      setAccountId(accountId); // and paid from the same account
      amountRef.current?.focus({ preventScroll: true });
    } else onClose();
  };

  const title = editing ? t.editEntry : income ? t.newIncome : isRefund ? t.refund : t.newExpense;
  const dateLabel = !dateText ? t.dateNone : dateText === isoDay() ? t.dateToday : dayLabel(dateText, t.locale);
  const statusLabel = paid ? (gain ? t.statusReceived : t.statusPaid) : (gain ? t.statusExpected : t.statusOpen);
  const repeats = REPEAT_CHOICES.map(c => ({
    ...c,
    label: repeatName(t, c),
    sub: c.repeat === 'none' ? t.repeatHintNone : c.repeat === 'monthly' ? t.repeatHintMonthly : c.every ? fmt(t.repeatHintEvery, { n: c.every }) : t.repeatHintYearly,
  }));
  const repeatLabel = repeatName(t, { repeat, every });
  const untilLabel = isMonthKey(until) ? fmt(t.repeatUntil, { month: monthLabel(until, t.locale) }) : t.repeatNoEnd;

  return (
    <Sheet open={!!mode} title={title} closeLabel={t.cancel} onClose={onClose}
      action={{ label: t.save, onClick: () => save(), disabled: !valid }}>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
        {/* Favourites (plan 09): a tap fills the sheet in, to check or change before saving. New entries only. */}
        {!editing && favorites.length > 0 && (
          <div className="-mt-1 flex flex-wrap gap-2" role="group" aria-label={t.favorites}>
            {favorites.map(f => {
              const c = categories.find(x => x.id === f.categoryId);
              return (
                <FavoriteChip
                  key={f.id}
                  emoji={c?.emoji}
                  name={f.name}
                  amount={f.amount !== undefined ? formatMoneyShort(f.amount, t.locale) : undefined}
                  on={name === f.name && categoryId === (c?.id ?? 'extra')}
                  onTap={() => fillFrom(f)}
                />
              );
            })}
          </div>
        )}
        {/* Amount — the one thing every entry needs, so it comes first: on a
            panel in the chosen category's colour, which follows the category. */}
        <div data-hue={category?.hue} className="-mt-2 text-center rounded-md hue-tint px-3 pt-2 pb-2">
          <label htmlFor={amountId} className="eyebrow text-fg-mute">{t.amount}</label>
          {/* Written the way amounts are shown everywhere: "−45,12 €", left to right. */}
          <div dir="ltr" className="mt-0.5 flex items-baseline justify-center gap-1.5">
            <span className={`rounded-num text-[32px] font-semibold ${gain ? 'text-pos' : 'text-fg-mute'}`} aria-hidden="true">
              {gain ? '+' : '−'}
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
              className="min-w-0 max-w-full bg-transparent rounded-num text-[clamp(40px,13vw,52px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-center text-fg placeholder:text-fg-faint/60 caret-accent outline-none"
            />
            <span className="rounded-num text-[32px] font-semibold text-fg-mute" aria-hidden="true">{abroad ? abroad.currency : currencySymbol()}</span>
          </div>
          {/* Typed in the trip's currency: what it comes to in the book's. */}
          {abroad && amount !== null && !isExpression && (
            <p dir="ltr" aria-live="polite" className="text-label text-accent font-semibold mt-1 rounded-num">
              = {withAmounts(() => formatMoney(amount, t.locale))}
            </p>
          )}
          {/* The running sum, announced politely — "= 17,30 €" (plan 08). What is
              being typed, so shown even while amounts are hidden (plan 06). */}
          {isExpression && amount !== null && (
            <p dir="ltr" aria-live="polite" className="text-label text-accent font-semibold mt-1 rounded-num">
              = {withAmounts(() => formatMoney(amount, t.locale))}
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
            onChange={typeName}
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
          {/* A typo: one tap fixes it (and may pick the category, as typing would). */}
          {correction && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { tapLight(); typeName(correction); }}
              className="mt-2 min-h-tap max-w-full px-1 inline-flex items-center gap-1.5 text-label font-medium text-accent text-start wrap-compound active:opacity-60 focus-visible:ring-focus rounded-sm"
            >
              <SpellCheck className="w-4 h-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {fmt(t.didYouMean, { word: correction })}
            </button>
          )}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.suggestions}>
              {shownSuggestions.map(s => {
                const on = s.name === name;
                // A name from another category shows where picking it takes the entry.
                const elsewhere = s.categoryId !== categoryId ? categories.find(c => c.id === s.categoryId) : undefined;
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
                      setNameTyped(false);
                      setCategoryChosen(true);
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
                    {!on && elsewhere && <span className="emoji text-[15px]" aria-hidden="true">{elsewhere.emoji}</span>}
                    {s.name}
                    {!on && elsewhere && <span className="sr-only">, {displayName(elsewhere.names, language)}</span>}
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

        {/* The category: all at a glance, wrapping — no sideways sliding. What the name points to leads, with a ✦. */}
        <div>
        {guesses.length > 0 && (
          <p className="mb-2 px-1 flex items-center gap-1.5 text-caption text-fg-mute wrap-compound" aria-live="polite">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            {fmt(t.categoryMatch, { word: guesses[0].word })}
          </p>
        )}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.category}>
          {shownCategories.map(c => {
            const on = c.id === categoryId;
            const cname = displayName(c.names, language);
            const hint = guessed.has(c.id);
            return (
              <button
                key={hint ? `${c.id}:${guessKey}` : c.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-hue={c.hue}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pickCategory(c)}
                className={`hit-44 min-h-[40px] max-w-full ps-1.5 pe-3.5 rounded-full inline-flex items-center gap-1.5 text-label border-2 transition-colors focus-visible:ring-focus ${
                  on ? 'bg-hue-bg text-hue-ink border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'} ${hint ? 'suggest-pop' : ''}`}
              >
                <span className="emoji text-[18px] w-7 text-center" aria-hidden="true">{c.emoji}</span>
                <span className="min-w-0 wrap-compound text-start">{cname}</span>
                {hint && <Sparkles className={`w-3.5 h-3.5 shrink-0 ${on ? '' : 'text-accent'}`} strokeWidth={2.2} aria-hidden="true" />}
                {hint && <span className="sr-only">, {t.suggestedCategory}</span>}
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
            aria-label={gain ? t.statusReceived : t.statusPaid}
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
            aria-label={`${t.repeat}: ${repeatLabel}`}
            onMouseDown={e => e.preventDefault()}
            onClick={e => { tapLight(); setRepeatAt(e.currentTarget); }}
            className={`${PILL} focus-visible:ring-focus`}
          >
            <RepeatIcon className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
            <span aria-hidden="true">{repeatLabel}</span>
          </button>
          {/* A recurring entry may end: the last month it comes back in (an instalment plan, a contract that runs out). */}
          {repeat !== 'none' && (
            <label className={`${PILL} focus-within:ring-focus`}>
              <CalendarOff className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
              <span aria-hidden="true">{untilLabel}</span>
              <input
                type="month"
                value={until}
                min={month}
                onChange={e => setUntil(e.target.value)}
                onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* not allowed here: the tap still focuses it */ } }}
                aria-label={`${t.repeatEnds}: ${untilLabel}`}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          )}
          {/* Money back — a return, a reimbursement: it lowers this category's spending instead of counting as income. */}
          {!income && (
            <button
              type="button"
              aria-pressed={refund}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { tapLight(); setRefund(v => !v); }}
              className={`${PILL} focus-visible:ring-focus ${refund ? 'text-pos' : 'text-fg-mute'}`}
            >
              <Undo2 className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>{t.refund}</span>
            </button>
          )}
          {/* For the tax return: which kind of cost this is. Only once the list is in use. */}
          {!income && (taxMarks || !!tax) && (
            <button
              type="button"
              aria-haspopup="menu"
              aria-label={`${t.taxPill}: ${tax ? taxKindLabel(tax, t) : t.taxNone}`}
              onMouseDown={e => e.preventDefault()}
              onClick={e => { tapLight(); setTaxAt(e.currentTarget); }}
              className={`${PILL} focus-visible:ring-focus ${tax ? '' : 'text-fg-mute'}`}
            >
              <Landmark className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
              <span aria-hidden="true" className="truncate">{tax ? taxKindLabel(tax, t) : t.taxPill}</span>
            </button>
          )}
          {/* A trip or project running today: one tap files the entry under it (its tag). */}
          {projects.map(p => {
            const on = tagSet.has(p.tag);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  tapLight();
                  setTagText(tt => (on
                    ? normalizeTags(tt.split(/[,\s]+/)).filter(x => x !== p.tag).map(x => `#${x}`).join(' ')
                    : `${tt.trim()} #${p.tag}`.trim()));
                }}
                className={`${PILL} focus-visible:ring-focus ${on ? 'text-accent' : 'text-fg-mute'}`}
              >
                <span className="emoji text-[15px] leading-none" aria-hidden="true">{p.emoji}</span>
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
          {accounts && (() => {
            const a = accounts.find(x => x.id === accountId) ?? accounts[0];
            return (
              <button
                type="button"
                aria-haspopup="menu"
                aria-label={`${t.account}: ${a.label}`}
                onMouseDown={e => e.preventDefault()}
                onClick={e => { tapLight(); setAccountAt(e.currentTarget); }}
                className={`${PILL} focus-visible:ring-focus`}
              >
                <span className="emoji text-[15px] leading-none" aria-hidden="true">{a.emoji}</span>
                <span aria-hidden="true" className="truncate">{a.label}</span>
              </button>
            );
          })()}
          {debts && (() => {
            const chosenDebt = debts.find(x => x.id === debtId);
            return (
              <button
                type="button"
                aria-haspopup="menu"
                aria-label={chosenDebt ? fmt(t.entryForDebt, { name: chosenDebt.name }) : t.entryForDebtNone}
                onMouseDown={e => e.preventDefault()}
                onClick={e => { tapLight(); setDebtAt(e.currentTarget); }}
                className={`${PILL} focus-visible:ring-focus ${chosenDebt ? '' : 'text-fg-mute'}`}
              >
                <HandCoins className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
                <span aria-hidden="true" className="truncate">{chosenDebt ? chosenDebt.name : t.entryForDebtNone}</span>
              </button>
            );
          })()}
          <button
            type="button"
            aria-haspopup="menu"
            aria-label={files.length ? `${t.receipt}: ${files.length}` : t.receiptAdd}
            disabled={fileBusy === 'adding'}
            onMouseDown={e => e.preventDefault()}
            onClick={e => { tapLight(); setFileAt(e.currentTarget); }}
            className={`${PILL} text-fg-mute disabled:opacity-50 focus-visible:ring-focus`}
          >
            <Paperclip className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span aria-hidden="true">{fileBusy === 'adding' ? t.receiptAdding : t.receipt}</span>
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
        {isRefund && <p className="text-caption text-fg-mute px-1 wrap-prose">{t.refundHint}</p>}
        <Menu
          anchor={taxAt}
          label={t.taxPill}
          groups={[[
            { key: 'none', label: t.taxNone, icon: tax ? undefined : Check, onSelect: () => setTax(undefined) },
            ...TAX_KINDS.map(k => ({ key: k, label: taxKindLabel(k, t), icon: k === tax ? Check : undefined, onSelect: () => setTax(k) })),
          ]]}
          onClose={() => setTaxAt(null)}
        />
        <Menu
          anchor={repeatAt}
          label={t.repeat}
          groups={[repeats.map(r => ({
            key: `${r.repeat}${r.every ?? ''}`, label: r.label, sub: r.sub,
            icon: r.repeat === repeat && (r.repeat !== 'yearly' || r.every === every) ? Check : undefined,
            onSelect: () => { setRepeat(r.repeat); setEvery(r.every); },
          }))]}
          onClose={() => setRepeatAt(null)}
        />

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t.receipt}>
            {files.map(f => (
              <li key={f.id} className="max-w-full inline-flex items-stretch rounded-full bg-surface-2 text-label font-medium text-fg">
                <button
                  type="button"
                  onClick={() => { tapLight(); setViewing(f); }}
                  aria-label={fmt(t.receiptView, { name: f.name })}
                  className="min-w-0 min-h-tap ps-3 pe-1 inline-flex items-center gap-1.5 rounded-s-full active:opacity-60 focus-visible:ring-focus"
                >
                  {f.type === 'application/pdf'
                    ? <FileText className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
                    : <ImageIcon className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />}
                  <span className="truncate" aria-hidden="true">{f.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { tapLight(); detach(f.id); }}
                  aria-label={fmt(t.receiptRemove, { name: f.name })}
                  className="w-tap min-h-tap shrink-0 inline-flex items-center justify-center rounded-e-full text-fg-mute active:opacity-60 focus-visible:ring-focus"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            ))}
            {files.some(f => f.type === 'image/jpeg') && (
              <li>
                <button
                  type="button"
                  onClick={() => { tapLight(); void readFromReceipt(); }}
                  disabled={!!fileBusy}
                  className="min-h-tap px-3 rounded-full inline-flex items-center gap-1.5 bg-accent-dim text-label font-medium text-accent disabled:opacity-50 active:opacity-60 focus-visible:ring-focus"
                >
                  <ScanText className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {fileBusy === 'reading' ? t.receiptReading : t.receiptRead}
                </button>
              </li>
            )}
          </ul>
        )}
        {/* With a receipt: how long it is good for. A first tap sets the usual (14 days to return, two years of warranty), the date can then be changed or cleared. */}
        {(files.length > 0 || !!warranty || !!returnBy) && !income && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.receiptDates}>
            {([
              { value: returnBy, set: setReturnBy, add: t.returnAdd, until: t.returnUntil, usual: shiftDays(dateText || isoDay(), 14), Icon: Undo2 },
              { value: warranty, set: setWarranty, add: t.warrantyAdd, until: t.warrantyUntil, usual: shiftDay(dateText || isoDay(), 24), Icon: ShieldCheck },
            ]).map(({ value, set, add, until, usual, Icon }) => (value ? (
              <label key={add} className={`${PILL} focus-within:ring-focus`}>
                <Icon className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2} aria-hidden="true" />
                <span aria-hidden="true">{fmt(until, { date: dayLabelYear(value, t.locale) })}</span>
                <input
                  type="date"
                  value={value}
                  onChange={e => set(e.target.value)}
                  onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* not allowed here: the tap still focuses it */ } }}
                  aria-label={fmt(until, { date: dayLabelYear(value, t.locale) })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            ) : (
              <button key={add} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { tapLight(); set(usual); }}
                className={`${PILL} text-fg-mute focus-visible:ring-focus`}>
                <Icon className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>{add}</span>
              </button>
            )))}
          </div>
        )}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => void attach(e.currentTarget)} />
        <input ref={pickInput} type="file" accept="image/*,application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => void attach(e.currentTarget)} />
        <Menu
          anchor={fileAt}
          label={t.receiptAdd}
          groups={[[
            { key: 'camera', label: t.receiptCamera, icon: Camera, onSelect: () => cameraInput.current?.click() },
            { key: 'pick', label: t.receiptPick, icon: ImageIcon, onSelect: () => pickInput.current?.click() },
          ]]}
          onClose={() => setFileAt(null)}
        />

        {debts && (
          <Menu
            anchor={debtAt}
            label={t.entryForDebtNone}
            groups={[[
              { key: 'none', label: t.entryForDebtClear, icon: debtId ? undefined : Check, onSelect: () => setDebtId(undefined) },
              ...debts.map(x => ({ key: x.id, label: x.name, icon: x.id === debtId ? Check : undefined, onSelect: () => setDebtId(x.id) })),
            ]]}
            onClose={() => setDebtAt(null)}
          />
        )}

        {accounts && (
          <Menu
            anchor={accountAt}
            label={t.account}
            groups={[accounts.map(a => ({ key: a.id, label: `${a.emoji} ${a.label}`, icon: a.id === accountId ? Check : undefined, onSelect: () => setAccountId(a.id) }))]}
            onClose={() => setAccountAt(null)}
          />
        )}

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
          {onPinFavorite && !isRefund && !!category && !!cleanText(name) && (
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
          {editing && onSplit && !income && !editing.refund && !editing.splitId && (
            <Button variant="ghost" full icon={Split} onClick={() => { onClose(); onSplit(editing); }}>{t.splitPayAction}</Button>
          )}
          {editing && (
            <Button variant="danger" full icon={Trash2} onClick={() => { onDelete(editing.id); onClose(); }}>{t.deleteEntry}</Button>
          )}
        </div>
      </form>
      <ReceiptViewer file={viewing} t={t} onClose={() => setViewing(null)} />
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

/** A favourite as a chip (plan 09): a tap fills the sheet in; pressed while the sheet holds it. */
function FavoriteChip({ emoji, name, amount, on, onTap }: {
  emoji?: string;
  name: string;
  amount?: string;
  on: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onMouseDown={e => e.preventDefault()}
      onClick={onTap}
      className={`hit-44 min-h-[40px] max-w-full ps-2 pe-3 rounded-full inline-flex items-center gap-1.5 text-label font-medium active:scale-[0.97] transition-transform focus-visible:ring-focus wrap-compound text-start ${
        on ? 'bg-accent-dim text-accent' : 'bg-surface-2 text-fg'}`}
    >
      {emoji && <span className="emoji text-[15px]" aria-hidden="true">{emoji}</span>}
      <span className="wrap-compound">{name}</span>
      {amount && <span className={`num ${on ? '' : 'text-fg-mute'}`} dir="ltr">{amount}</span>}
    </button>
  );
}
