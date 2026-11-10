import { Lightbulb, X } from 'lucide-react';
import { IconButton } from '../ui/Button';

/**
 * One tip on the month page (plan 37, src/tips.ts): a sentence, the one
 * thing to do about it, and ✕ — either way it never comes back.
 */
export function HintCard({ text, action, hideLabel, onAction, onHide }: {
  text: string;
  action: string;
  hideLabel: string;
  onAction: () => void;
  onHide: () => void;
}) {
  return (
    <section className="rounded-md bg-surface card-edge ps-4 pe-2 pt-2 pb-3" aria-label={text}>
      <div className="flex items-start gap-3">
        <span className="mt-2 w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <Lightbulb className="w-4 h-4" strokeWidth={2.4} />
        </span>
        <p className="min-w-0 flex-1 pt-3 text-body text-fg wrap-prose">{text}</p>
        <IconButton label={hideLabel} icon={X} onClick={onHide} />
      </div>
      <button
        type="button"
        onClick={onAction}
        className="ms-11 mt-1 min-h-tap px-1 -mx-1 inline-flex items-center text-body font-semibold text-accent text-start rounded-sm active:opacity-60 focus-visible:ring-focus wrap-compound"
      >
        {action}
      </button>
    </section>
  );
}
