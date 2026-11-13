import { ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { tapLight } from './haptics';

/** How a page's cards fold: whether this one is open, and what a tap does. Absent: the page shows every card whole. */
export interface Fold { open: boolean; toggle: () => void; less: string }

/**
 * A card of Planen or Statistik that can show as its headline (plan 39): one
 * row — what the card is called, and under it what it has found — that opens
 * in place to the card itself; *Weniger* under the open card folds it again.
 * Without `fold` it is the card and nothing else, as the pages always were.
 * The card is only built once it is open: a folded page draws no charts.
 */
export function FoldCard({ title, headline, tone, fold, tour, children }: {
  title: string;
  /** What the card has found, in one line; without one the title stands alone. */
  headline?: string;
  /** The finding is bad news (red) or a warning (amber). */
  tone?: 'neg' | 'warn';
  fold?: Fold;
  /** What a tour points at (src/guide.ts): the row or the card, whichever shows. */
  tour?: string;
  children: () => ReactNode;
}) {
  if (!fold) return <div data-tour={tour}>{children()}</div>;
  if (fold.open) {
    return (
      <div data-tour={tour}>
        {children()}
        <div className="flex justify-end">
          <button
            type="button"
            aria-expanded="true"
            aria-label={`${title}: ${fold.less}`}
            onClick={() => { tapLight(); fold.toggle(); }}
            className="h-tap ps-3 pe-2 inline-flex items-center gap-1 text-label font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus"
          >
            {fold.less}
            <ChevronUp className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div data-tour={tour}>
      <button
        type="button"
        aria-expanded="false"
        onClick={() => { tapLight(); fold.toggle(); }}
        className="w-full min-h-[60px] rounded-md bg-surface card-edge px-[16px] py-3 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="min-w-0 flex-1">
          {headline ? (
            <>
              <span className="block eyebrow text-fg-mute wrap-compound">{title}</span>
              <span className={`block mt-0.5 text-body font-semibold tabular-nums wrap-prose ${tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : 'text-fg'}`}>{headline}</span>
            </>
          ) : (
            <span className="block text-body font-semibold text-fg wrap-compound">{title}</span>
          )}
        </span>
        <ChevronDown className="w-5 h-5 shrink-0 text-fg-faint" strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The bar's button on a page of such cards: from every card whole to
 * headlines, and back — round, on the bar's glass, like the month page's.
 */
export function FoldAllButton({ whole, foldLabel, unfoldLabel, onToggle }: {
  /** Every card shows whole. */
  whole: boolean;
  foldLabel: string;
  unfoldLabel: string;
  onToggle: () => void;
}) {
  const label = whole ? foldLabel : unfoldLabel;
  const Icon = whole ? ChevronsDownUp : ChevronsUpDown;
  return (
    <button
      type="button"
      data-fold-all
      aria-label={label}
      title={label}
      onClick={() => { tapLight(); onToggle(); }}
      className="h-tap w-tap inline-flex items-center justify-center rounded-full glass-chrome text-fg active:scale-[0.92] transition-transform focus-visible:ring-focus"
    >
      <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
