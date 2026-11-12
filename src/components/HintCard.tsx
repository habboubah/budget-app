import { ComponentType } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { IconButton } from '../ui/Button';

/**
 * One tip on the month page (plan 37, src/tips.ts): a sentence, the one
 * thing to do about it, and ✕ — either way it never comes back. A gesture's
 * tip (plan 39) is the sentence alone, under the gesture's own symbol: there
 * is nothing to open, only something to try on the entries below.
 */
export function HintCard({ text, action, hideLabel, onAction, onHide, icon: Icon = Lightbulb }: {
  text: string;
  action?: string;
  hideLabel: string;
  onAction?: () => void;
  onHide: () => void;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <section className={`rounded-md bg-surface card-edge ps-4 pe-2 pt-2 ${action ? 'pb-3' : 'pb-4'}`} aria-label={text}>
      <div className="flex items-start gap-3">
        <span className="mt-2 w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <Icon className="w-4 h-4" strokeWidth={2.4} />
        </span>
        <p className="min-w-0 flex-1 pt-3 text-body text-fg wrap-prose">{text}</p>
        <IconButton label={hideLabel} icon={X} onClick={onHide} />
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="ms-11 mt-1 min-h-tap px-1 -mx-1 inline-flex items-center text-body font-semibold text-accent text-start rounded-sm active:opacity-60 focus-visible:ring-focus wrap-compound"
        >
          {action}
        </button>
      )}
    </section>
  );
}
