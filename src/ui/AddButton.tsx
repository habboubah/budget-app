import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';
import { tapMedium } from './haptics';

/**
 * The add button: a 56 px rounded square on the accent's gradient
 * (`add-fab`), floating at the bottom's trailing end, in thumb reach and
 * where the guide says it is ("unten rechts"). Since the tab bar gave way to
 * the menu (☰, November 2026) it sits where the bar's end used to be. Only the month page shows it
 * (App passes `add` there alone). It stays put while the page scrolls: it used
 * to tuck itself away on the way down (so it wouldn't sit on the amounts at the
 * row ends), which read as a button that sometimes vanished (November 2026,
 * Ahmad). The page's bottom padding (`pb-safe-add`) keeps the last row clear.
 *
 * It answers the finger the moment it lands — it gives, the plus begins to
 * turn — and says what it did: while the sheet it opened is up the plus stays
 * a cross, and turns back with a little spring when the sheet goes. A tap also
 * sends one ring of light out of it. All springs, so a second touch takes
 * over from wherever the first one left it.
 */
export function AddButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  const [taps, setTaps] = useState(0);
  const calm = useReducedMotion();
  return createPortal(
    <div
      className="fixed inset-x-0 z-30 pointer-events-none"
      // Just clear of the home indicator (16 px on a phone without one).
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 4px)' }}
    >
      <div className="mx-auto max-w-xl px-[16px] flex justify-end">
        <motion.button
          type="button"
          data-tour="add"
          aria-label={label}
          title={label}
          onClick={() => { tapMedium(); setTaps(n => n + 1); onClick(); }}
          initial="away"
          animate={open ? 'open' : 'rest'}
          whileTap="down"
          variants={{
            away: calm ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 28 },
            rest: { opacity: 1, scale: 1, y: 0 },
            open: { opacity: 1, scale: 1, y: 0 },
            // In at once, without a bounce; the spring below is the way back out.
            down: { scale: 0.9, transition: { type: 'spring', duration: 0.16, bounce: 0 } },
          }}
          transition={{ type: 'spring', duration: 0.42, bounce: 0.35 }}
          className={`relative w-[56px] h-[56px] add-fab text-on-hero inline-flex items-center justify-center focus-visible:ring-focus pointer-events-auto`}
        >
          {taps > 0 && !calm && (
            <motion.span
              key={taps}
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] add-burst pointer-events-none"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            />
          )}
          <motion.span
            className="relative inline-flex"
            variants={{ away: { rotate: -90 }, rest: { rotate: 0 }, open: { rotate: 45 }, down: { rotate: 45 } }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
          >
            <Plus className="w-[26px] h-[26px]" strokeWidth={2.6} />
          </motion.span>
        </motion.button>
      </div>
    </div>,
    document.body,
  );
}
