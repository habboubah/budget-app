import { FileUp } from 'lucide-react';
import { Strings } from '../translations';
import { Button } from '../ui/Button';

/**
 * Shown on the first month until dismissed: the order the app is meant to be
 * filled in — the order of the Excel sheet — and the one gesture that matters.
 */
export function IntroCard({ t, needsStart, onStartingBalance, onImportExcel, onDismiss }: {
  t: Strings;
  /** No starting balance yet: offer to enter it. */
  needsStart: boolean;
  onStartingBalance: () => void;
  /** Bring the months over from the Excel sheet instead of typing them. */
  onImportExcel: () => void;
  onDismiss: () => void;
}) {
  const steps = [t.introStep1, t.introStep2, t.introStep3, t.introStep4, t.introStep5];
  return (
    <section className="rounded-md bg-surface card-edge p-5" aria-labelledby="intro-title">
      <h2 id="intro-title" className="display text-heading font-bold text-fg wrap-compound">{t.introTitle}</h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-accent-dim text-accent text-caption font-bold num inline-flex items-center justify-center shrink-0 mt-px" aria-hidden="true">
              {i + 1}
            </span>
            <span className="text-label text-fg wrap-prose">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {needsStart && <Button onClick={onStartingBalance}>{t.setStartingBalance}</Button>}
        <Button variant="secondary" icon={FileUp} onClick={onImportExcel}>{t.introExcel}</Button>
        <Button variant="ghost" onClick={onDismiss}>{t.introDismiss}</Button>
      </div>
    </section>
  );
}
