import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, X } from 'lucide-react';
import { tapLight } from '../ui/haptics';

/**
 * The way back to the guide after *Zeigen* or a tour led to another tab, the
 * month page or one of its sheets — where no back button would lead there.
 * A small capsule above the tab bar, as iOS shows "◀ Einstellungen" after a
 * link: "‹ Anleitung" returns to the topic that was open, ✕ lets it go. It
 * sits under every sheet and menu (z-35), so it never covers one; the tour
 * hides it while it runs.
 */
export function GuideBackPill({ show, title, label, closeLabel, onBack, onClose }: {
  show: boolean;
  /** The guide's name, shown: "Anleitung". */
  title: string;
  /** Read out: "Zurück zur Anleitung". */
  label: string;
  closeLabel: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-[35] flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key="guide-back"
            data-guide-back
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className="pointer-events-auto max-w-full flex items-center rounded-full glass-chrome shadow-e2 p-[3px]"
          >
            <button
              type="button"
              onClick={() => { tapLight(); onBack(); }}
              aria-label={label}
              title={label}
              className="min-h-tap min-w-0 ps-2 pe-3.5 inline-flex items-center gap-1 rounded-full text-body font-semibold text-accent active:opacity-60 focus-visible:ring-focus"
            >
              <ChevronLeft className="w-5 h-5 shrink-0 rtl:rotate-180" strokeWidth={2.6} aria-hidden="true" />
              <span className="min-w-0 truncate" aria-hidden="true">{title}</span>
            </button>
            <span className="w-px h-5 bg-fg/15 shrink-0" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
              className="h-tap w-tap shrink-0 inline-flex items-center justify-center rounded-full text-fg-mute active:opacity-60 focus-visible:ring-focus"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
