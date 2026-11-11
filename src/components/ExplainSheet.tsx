import { Info } from 'lucide-react';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { tapLight } from '../ui/haptics';

/** What a "So berechnet" sheet says: built by the screen that has the numbers. */
export interface Explain {
  /** The figure's name ("Sparquote"). */
  title: string;
  /** The definition, in two sentences. */
  definition: string;
  /** The user's own numbers, one line each ("1.270 € gespart ÷ 3.800 € Einnahmen = 33 %"). */
  calc?: string[];
  /** The months it stands on, in words. */
  months?: string;
  /** What isn't in it. */
  excluded?: string;
}

/**
 * *So berechnet* (§9.8): a key figure explains itself — its definition, the
 * user's numbers in one line, the months used and what is left out. For an
 * app that promises correct maths, showing it is cheap trust.
 */
export function ExplainSheet({ explain, t, onClose }: { explain: Explain | null; t: Strings; onClose: () => void }) {
  if (!explain) return null;
  return (
    <Sheet open title={t.explainTitle} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4 pb-2">
        <h3 className="display text-heading font-semibold text-fg wrap-compound">{explain.title}</h3>
        <p className="text-body text-fg wrap-prose">{explain.definition}</p>
        {!!explain.calc?.length && (
          <div className="rounded-sm bg-surface-2 px-4 py-3 space-y-1">
            {explain.calc.map(line => <p key={line} className="text-label font-semibold text-fg tabular-nums wrap-prose">{line}</p>)}
          </div>
        )}
        {explain.months && <p className="text-label text-fg-mute tabular-nums wrap-prose">{explain.months}</p>}
        {explain.excluded && (
          <p className="text-label text-fg-mute wrap-prose">
            <span className="font-semibold text-fg">{t.explainNotIn}: </span>{explain.excluded}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** The ⓘ beside a key figure: a full 44 pt target, named after the figure. */
export function ExplainButton({ name, t, onClick, onHero }: { name: string; t: Strings; onClick: () => void; /** On the gradient hero: its own ink. */ onHero?: boolean }) {
  const label = fmt(t.explainOpen, { name });
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => { tapLight(); onClick(); }}
      className={`shrink-0 -my-2.5 -me-2.5 h-tap w-tap inline-flex items-center justify-center rounded-full transition-colors focus-visible:ring-focus ${
        onHero ? 'text-on-hero active:opacity-60' : 'text-fg-mute active:bg-surface-2'}`}
    >
      <Info className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
