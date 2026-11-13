import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FlaskConical, X } from 'lucide-react';
import { tapLight } from '../ui/haptics';

/**
 * While someone looks around with the test data they started with (plan
 * 39, the welcome screen's *Erst mit Testdaten ansehen*): a small capsule
 * above the tab bar, on every tab, that says so — and takes the test data
 * out again to begin with one's own. Where the guide's "‹ Anleitung"
 * capsule sits, and under every sheet and menu like it.
 */
export function DemoPill({ show, title, label, onRemove }: {
  show: boolean;
  /** Shown: "Testdaten". */
  title: string;
  /** Read out: "Entfernen und selbst starten". */
  label: string;
  onRemove: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-[35] flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}
    >
      <AnimatePresence>
        {show && (
          <motion.button
            key="demo-pill"
            type="button"
            data-demo-pill
            onClick={() => { tapLight(); onRemove(); }}
            aria-label={`${title}: ${label}`}
            title={label}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className="pointer-events-auto max-w-full min-h-tap ps-3.5 pe-3 inline-flex items-center gap-2 rounded-full glass-chrome shadow-e2 text-label font-semibold text-fg active:opacity-60 focus-visible:ring-focus"
          >
            <FlaskConical className="w-[18px] h-[18px] shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
            <span className="min-w-0 truncate" aria-hidden="true">{title}</span>
            <X className="w-[18px] h-[18px] shrink-0 text-fg-mute" strokeWidth={2.4} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
