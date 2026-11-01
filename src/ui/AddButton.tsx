import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { tapMedium } from './haptics';

/**
 * The round add button, bottom right in thumb reach. Portalled to <body> so
 * the screen's slide-in transform can't capture `position: fixed`.
 * `aboveTabs` lifts it over the tab bar.
 */
export function AddButton({ label, onClick, aboveTabs }: { label: string; onClick: () => void; aboveTabs?: boolean }) {
  return createPortal(
    <div className="fixed inset-x-0 z-20 pointer-events-none" style={{ bottom: `calc(${aboveTabs ? 84 : 24}px + env(safe-area-inset-bottom))` }}>
      <div className="mx-auto w-full max-w-xl px-5 flex justify-end">
        <motion.button
          type="button"
          aria-label={label}
          title={label}
          onClick={() => { tapMedium(); onClick(); }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
          className="pointer-events-auto w-[60px] h-[60px] rounded-full bg-accent-fill text-accent-fill-ink shadow-e2 inline-flex items-center justify-center focus-visible:ring-focus"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>,
    document.body,
  );
}
