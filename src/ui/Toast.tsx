import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastState {
  key: number;
  label: string;
  action?: { label: string; run: () => void };
}

/** One toast at a time; a new one replaces the old. Undo stays offered for 5s. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((label: string, action?: ToastState['action']) => {
    window.clearTimeout(timer.current);
    setToast({ key: Date.now(), label, action });
    timer.current = window.setTimeout(() => setToast(null), action ? 5000 : 2200);
  }, []);
  const hide = useCallback(() => { window.clearTimeout(timer.current); setToast(null); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show, hide };
}

/**
 * The snackbar: confirmation of a quiet action, and the undo for a reversible
 * one — in place of a confirm dialog. `raised` lifts it above the tab bar.
 */
export function Toast({ toast, onDone, raised }: { toast: ToastState | null; onDone: () => void; raised?: boolean }) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-[55] flex justify-center px-4 pointer-events-none"
      style={{ bottom: `calc(${raised ? 96 : 24}px + env(safe-area-inset-bottom))` }}
    >
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.key}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
            className="pointer-events-auto flex items-center gap-2 bg-fg text-bg rounded-full ps-5 pe-2 py-1.5 shadow-e2 max-w-full"
          >
            <span className="text-label font-semibold py-2 min-w-0 wrap-compound">{toast.label}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => { toast.action?.run(); onDone(); }}
                className="shrink-0 min-h-[40px] px-4 rounded-full bg-accent-fill text-accent-fill-ink font-semibold text-label active:scale-[0.96] transition-transform focus-visible:ring-focus"
              >
                {toast.action.label}
              </button>
            ) : <span className="w-3" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
