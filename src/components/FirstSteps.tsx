import { Check, ChevronRight, ListChecks, X } from 'lucide-react';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Button, IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';

/** One of the first things to do, and whether the book has it. */
export interface FirstStep {
  id: 'balance' | 'income' | 'fixed' | 'expense';
  label: string;
  sub: string;
  done: boolean;
  /** Goes to the step's place on the month page, then opens its sheet. */
  run: () => void;
}

/**
 * What is left of setting the book up, as one slim row on the month page
 * (plan 39): "Erste Schritte · 2 von 4". It opens the list; ✕ puts it away
 * for good, and it goes by itself once every step is done. In place of the
 * setup card, which stood on the page with its three steps until finished.
 *
 * The steps the start's questions answered are not among them (App leaves
 * them out). With a single step left to list — the start answered the rest —
 * the row is that step: its words, and a tap does it; a list of one is no list.
 */
export function FirstStepsRow({ steps, t, onOpen, onHide }: { steps: FirstStep[]; t: Strings; onOpen: () => void; onHide: () => void }) {
  const done = steps.filter(s => s.done).length;
  const only = steps.length === 1 && !steps[0].done ? steps[0] : null;
  return (
    <section data-steps className="rounded-md bg-surface card-edge flex items-center" aria-label={t.stepsTitle}>
      <button
        type="button"
        onClick={() => { tapLight(); if (only) only.run(); else onOpen(); }}
        className="min-w-0 flex-1 min-h-[56px] ps-4 pe-1 py-2 flex items-center gap-3 text-start rounded-s-md active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <ListChecks className="w-4 h-4" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg wrap-compound">{only ? only.label : t.stepsTitle}</span>
          {only
            ? <span className="block text-caption text-fg-mute wrap-prose">{only.sub}</span>
            : <span className="block text-caption text-fg-mute tabular-nums">{fmt(t.tourStep, { n: done, total: steps.length })}</span>}
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-fg-faint rtl:rotate-180" aria-hidden="true" />
      </button>
      <IconButton label={t.hintClose} icon={X} onClick={onHide} className="me-1" />
    </section>
  );
}

/**
 * The steps themselves, and the way to the guide. A tap leads to where the
 * step lives on the month page and opens its sheet there (`run`, App's
 * `stepTo`) — a ticked one too: there is more than one fixed cost to add.
 */
export function FirstStepsSheet({ open, steps, t, onClose, onGuide }: {
  open: boolean;
  steps: FirstStep[];
  t: Strings;
  onClose: () => void;
  onGuide: () => void;
}) {
  return (
    <Sheet open={open} title={t.stepsTitle} closeLabel={t.close} onClose={onClose}>
      <ol className="-mx-2">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => { tapLight(); onClose(); s.run(); }}
              className="w-full min-h-tap px-2 py-2.5 rounded-sm flex items-center gap-3 text-start transition-colors active:bg-surface-2 focus-visible:ring-focus"
            >
              <span
                aria-hidden="true"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 text-caption font-bold num ${s.done ? 'hero' : 'bg-accent-dim text-accent'}`}
              >
                {s.done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-body font-semibold wrap-compound ${s.done ? 'text-fg-mute' : 'text-fg'}`}>
                  {s.label}{s.done && <span className="sr-only">, {t.setupStepDone}</span>}
                </span>
                {!s.done && <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{s.sub}</span>}
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-fg-faint rtl:rotate-180" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 pb-1">
        <Button variant="ghost" full onClick={() => { onClose(); onGuide(); }}>{t.guideAll}</Button>
      </div>
    </Sheet>
  );
}
