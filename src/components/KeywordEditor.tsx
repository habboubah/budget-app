import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, X } from 'lucide-react';
import { keywordKey, normalizeKeywords } from '../logic';
import { Strings, fmt } from '../translations';
import { Field, Label } from '../ui/Field';
import { tapLight } from '../ui/haptics';

/** Chips shown before "Alle (n)". */
const AT_A_GLANCE = 15;

/** "Lidl, Aldi; Rewe" → three keywords. */
const split = (text: string) => text.split(/[,;\n]+/).map(w => w.trim()).filter(Boolean);

/**
 * A category's keywords in its sheet (plan 32): every one as a chip — a tap
 * edits it in place, ✕ removes it — a field that adds one (or several,
 * comma-separated) at the front, ideas from the user's own entries, and for
 * a built-in a way back to what ships. Nothing is stored before the sheet is
 * saved, so *Abbrechen* undoes it all.
 */
export function KeywordEditor({ keywords, onChange, ideas, ideasLabel, alsoIn, onReset, t }: {
  keywords: string[];
  onChange: (next: string[]) => void;
  /** Words to add with one tap: frequent names here, or a built-in's keywords for a new category. */
  ideas: string[];
  ideasLabel: string;
  /** The other categories that have this word as a keyword too. */
  alsoIn: (word: string) => string[];
  /** Shown while a built-in's list differs from what ships. */
  onReset?: () => void;
  t: Strings;
}) {
  const [text, setText] = useState('');
  const [all, setAll] = useState(false);
  const [editAt, setEditAt] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const noteId = useId();
  const keys = useMemo(() => new Set(keywords.map(keywordKey)), [keywords]);

  useEffect(() => { if (editAt !== null) editRef.current?.focus({ preventScroll: true }); }, [editAt]);

  const typed = split(text);
  const duplicate = typed.length === 1 && keys.has(keywordKey(typed[0])) ? typed[0] : null;
  const owners = typed.length === 1 && !duplicate ? alsoIn(typed[0]) : [];
  const canAdd = typed.some(w => !keys.has(keywordKey(w)) && keywordKey(w));

  // New words go first, so they are in sight even with the list folded.
  const add = (words: string[]) => {
    const next = normalizeKeywords([...words, ...keywords]) ?? keywords;
    if (next.length !== keywords.length) { tapLight(); onChange(next); }
  };
  const submit = () => { if (canAdd) { add(typed); setText(''); } };
  const remove = (i: number) => { tapLight(); onChange(keywords.filter((_, j) => j !== i)); };
  const commitEdit = () => {
    if (editAt === null) return;
    const i = editAt;
    setEditAt(null);
    const word = editText.trim();
    if (!word) { remove(i); return; }
    onChange(normalizeKeywords(keywords.map((w, j) => (j === i ? word : w))) ?? keywords);
  };

  const shown = all ? keywords : keywords.slice(0, AT_A_GLANCE);
  const freshIdeas = ideas.filter(w => !keys.has(keywordKey(w)));

  return (
    <div>
      <Label>
        {t.keywords}
        {keywords.length > 0 && <span className="text-fg-faint font-medium"> · {keywords.length}</span>}
      </Label>
      {keywords.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-3" aria-label={t.keywords}>
          {shown.map((word, i) => (
            <li key={keywordKey(word)} className="max-w-full">
              {editAt === i ? (
                <input
                  ref={editRef}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditAt(null); }
                  }}
                  maxLength={40}
                  enterKeyHint="done"
                  autoComplete="off"
                  aria-label={fmt(t.keywordEdit, { word })}
                  style={{ width: `${Math.min(28, Math.max(6, [...editText].length + 2))}ch` }}
                  className="min-h-[36px] max-w-full px-3.5 rounded-full bg-surface-2 ring-2 ring-accent text-label text-fg outline-none"
                />
              ) : (
                <span className="inline-flex max-w-full items-center rounded-full bg-surface-2">
                  <button
                    type="button"
                    onClick={() => { tapLight(); setEditText(word); setEditAt(i); }}
                    aria-label={fmt(t.keywordEdit, { word })}
                    className="min-h-[36px] min-w-0 ps-3.5 pe-1 rounded-s-full text-label font-medium text-fg wrap-compound text-start active:opacity-60 focus-visible:ring-focus"
                  >
                    {word}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={fmt(t.keywordRemove, { word })}
                    className="hit-44 w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-fg-mute active:opacity-60 focus-visible:ring-focus"
                  >
                    <X className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ))}
          {keywords.length > AT_A_GLANCE && (
            <li>
              <button
                type="button"
                aria-expanded={all}
                onClick={() => { tapLight(); setAll(v => !v); }}
                className="hit-44 min-h-[36px] px-3.5 rounded-full inline-flex items-center gap-1 text-label font-semibold text-accent bg-accent-dim active:opacity-70 focus-visible:ring-focus"
              >
                {all ? t.fewerSuggestions : fmt(t.allSuggestions, { n: keywords.length })}
                {all ? <ChevronUp className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" /> : <ChevronDown className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="text-caption text-fg-mute mb-3 px-1 wrap-prose">{t.keywordsNone}</p>
      )}

      {/* Inside the category sheet's form: Enter adds here instead of saving the sheet. */}
      <Field
        label={t.keywordAdd}
        hideLabel
        value={text}
        onChange={setText}
        placeholder={t.keywordAddPlaceholder}
        maxLength={200}
        enterKeyHint="done"
        autoComplete="off"
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        aria-describedby={duplicate || owners.length ? noteId : undefined}
        trailing={
          <button
            type="button"
            onClick={submit}
            disabled={!canAdd}
            aria-label={t.keywordAdd}
            className="hit-44 -me-2 w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full bg-accent-fill text-accent-fill-ink disabled:opacity-30 active:scale-95 transition-transform focus-visible:ring-focus"
          >
            <Plus className="w-5 h-5" strokeWidth={2.6} aria-hidden="true" />
          </button>
        }
      />
      {(duplicate || owners.length > 0) && (
        <p id={noteId} className="text-caption text-fg-mute mt-1.5 px-1 wrap-prose">
          {duplicate ? fmt(t.keywordDuplicate, { word: duplicate }) : fmt(t.keywordAlsoIn, { names: owners.join(', ') })}
        </p>
      )}

      {freshIdeas.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow text-fg-mute mb-1.5 px-1">{ideasLabel}</p>
          <div className="flex flex-wrap gap-2">
            {freshIdeas.map(w => (
              <button
                key={w}
                type="button"
                onClick={() => add([w])}
                aria-label={fmt(t.keywordAddOne, { word: w })}
                className="hit-44 min-h-[36px] max-w-full ps-2.5 pe-3.5 rounded-full inline-flex items-center gap-1 bg-accent-dim text-accent text-label font-medium wrap-compound text-start active:scale-[0.97] transition-transform focus-visible:ring-focus"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.6} aria-hidden="true" />
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-caption text-fg-mute mt-2 px-1 wrap-prose">{t.keywordsHint}</p>
      {onReset && (
        <button
          type="button"
          onClick={() => { tapLight(); onReset(); }}
          className="mt-1 min-h-tap px-1 inline-flex items-center gap-1.5 text-label font-medium text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
          {t.keywordsReset}
        </button>
      )}
    </div>
  );
}
