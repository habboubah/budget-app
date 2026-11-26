import { Compass } from 'lucide-react';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { tapLight } from '../ui/haptics';

/** A page's ⓘ, read: the guide topic's title, its one sentence, its steps and its tip — the words already in the app's language. */
export interface PageInfoText { title: string; sum: string; steps: string[]; tip?: string }

/**
 * What a page is for (src/ui/pageInfo.ts): the guide's topic for it, in a
 * sheet over the page — what it does in a sentence, how to use it step by
 * step, a tip — and a way into the whole guide at that topic.
 */
export function PageInfoSheet({ info, t, onClose, onGuide }: { info: PageInfoText | null; t: Strings; onClose: () => void; onGuide: () => void }) {
  if (!info) return null;
  return (
    <Sheet open title={t.pageInfo} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4 pb-2">
        <h3 className="display text-heading font-semibold text-fg wrap-compound">{info.title}</h3>
        <p className="text-body text-fg wrap-prose">{info.sum}</p>
        {info.steps.length > 0 && (
          <ol className="space-y-2.5">
            {info.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" className="mt-px shrink-0 size-6 rounded-full bg-accent-dim text-accent text-caption font-bold inline-flex items-center justify-center tabular-nums">{i + 1}</span>
                <span className="min-w-0 text-label text-fg wrap-prose">{step}</span>
              </li>
            ))}
          </ol>
        )}
        {info.tip && <p className="rounded-sm bg-surface-2 px-4 py-3 text-label text-fg-mute wrap-prose">{info.tip}</p>}
        <button
          type="button"
          onClick={() => { tapLight(); onGuide(); }}
          className="w-full min-h-tap rounded-full bg-accent-dim text-accent text-body font-semibold inline-flex items-center justify-center gap-2 active:opacity-70 focus-visible:ring-focus"
        >
          <Compass className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
          {t.pageInfoGuide}
        </button>
      </div>
    </Sheet>
  );
}
