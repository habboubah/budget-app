import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';
import { tapMedium } from './haptics';

/**
 * The add button: one of the bar's round glass buttons, like ☰ beside it and
 * ‹ › and ⋯ across (44 px, `glass-chrome`, the same press) — only its plus is
 * in the accent, so it is still the one to find (November 2026: on the
 * accent's gradient it stood out of the group, Ahmad). It sits
 * in the month page's bar next to ☰ and floats with the bar as the page
 * scrolls (Ahmad, November 2026; it floated at the bottom's trailing end
 * before, and in the tab bar before that). Screen draws it from
 * `MenuContext.add`, so only the month page's root has it.
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
  return (
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
        away: calm ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 0.6 },
        rest: { opacity: 1, scale: 1 },
        open: { opacity: 1, scale: 1 },
        // In at once, without a bounce; the spring below is the way back out.
        // The bar's buttons give to 0.92 under the finger; this one the same.
        down: { scale: 0.92, transition: { type: 'spring', duration: 0.16, bounce: 0 } },
      }}
      transition={{ type: 'spring', duration: 0.42, bounce: 0.35 }}
      className="relative h-tap w-tap rounded-full glass-chrome text-accent inline-flex items-center justify-center focus-visible:ring-focus"
    >
      {taps > 0 && !calm && (
        <motion.span
          key={taps}
          aria-hidden="true"
          className="absolute inset-0 rounded-full add-burst pointer-events-none"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
      <motion.span
        className="relative inline-flex"
        variants={{ away: { rotate: -90 }, rest: { rotate: 0 }, open: { rotate: 45 }, down: { rotate: 45 } }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.span>
    </motion.button>
  );
}
