import { Strings } from '../translations';
import { Group, Screen } from '../ui/Screen';
import { tapLight } from '../ui/haptics';

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Group title={title}>
      <ol className="px-4 py-3 space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-accent-dim text-accent text-label font-semibold num inline-flex items-center justify-center" aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 flex-1 text-body text-fg wrap-prose pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </Group>
  );
}

/**
 * Mehr › Werkzeuge › Automatisch erfassen (plan 19, iPhone): how to set up the two
 * Shortcuts automations — after an Apple Pay payment, and on a banking app's
 * notification — and whether what they capture is booked at once or waits
 * under *Neu* to be looked through. Nothing happens until an automation
 * exists; the app itself asks for nothing here.
 */
export function CaptureView({ review, t, onBack, onReview }: {
  /** *Erst prüfen* instead of *Gleich buchen*. */
  review: boolean;
  t: Strings;
  onBack: () => void;
  onReview: (review: boolean) => void;
}) {
  return (
    <Screen title={t.captureRow} subtitle={t.captureIntro} onBack={onBack} backLabel={t.back} tabbed>
      <Group title={t.captureMode} footer={t.captureModeFooter}>
        <div role="radiogroup" aria-label={t.captureMode} className="p-3 grid grid-cols-2 gap-2">
          {[false, true].map(value => {
            const on = review === value;
            return (
              <button
                key={String(value)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { tapLight(); onReview(value); }}
                className={`min-h-tap px-3 rounded-full text-label border-[1.5px] transition-colors focus-visible:ring-focus wrap-compound ${
                  on ? 'bg-accent-dim text-accent border-current font-semibold' : 'bg-surface-2 text-fg border-transparent font-medium'}`}
              >
                {value ? t.captureReview : t.captureDirect}
              </button>
            );
          })}
        </div>
      </Group>
      <Steps title={t.captureWallet} steps={[t.captureStep1, t.captureWallet2, t.captureWallet3, t.captureWallet4, t.captureDone]} />
      <Steps title={t.captureNote} steps={[t.captureStep1, t.captureNote2, t.captureNote3, t.captureNote4, t.captureDone]} />
    </Screen>
  );
}
