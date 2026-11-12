import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useDialog } from './useDialog';

interface Props {
  open: boolean;
  title: string;
  /** Header-right text action; defaults to closing the sheet. */
  closeLabel: string;
  onClose: () => void;
  /** Optional primary action in the header (iOS: "Save" top-right). */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  children: React.ReactNode;
}

/**
 * Bottom sheet — taken from pizza-driver-log's, which had already been fought
 * over on iOS: it follows the *visual* viewport so the keyboard never covers
 * its buttons, owns the scroll lock and focus trap (useDialog), drags to
 * dismiss only from the grabber/title bar so a long form still scrolls, and is
 * portalled so a transformed screen wrapper can't capture `position: fixed`.
 */
export function Sheet({ open, title, closeLabel, onClose, action, children }: Props) {
  const [vv, setVv] = useState<{ height: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const v = window.visualViewport;
    if (!open || !v) return;
    const update = () => setVv({ height: v.height, top: v.offsetTop });
    update();
    v.addEventListener('resize', update);
    v.addEventListener('scroll', update);
    return () => {
      v.removeEventListener('resize', update);
      v.removeEventListener('scroll', update);
    };
  }, [open]);

  const panel = useRef<HTMLDivElement>(null);
  useDialog(open, panel, onClose);
  const dragControls = useDragControls();

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-end sm:items-center justify-center transition-[height,top] duration-200 ease-out"
      style={vv ? { height: vv.height, top: vv.top } : { bottom: 0 }}
    >
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 scrim" onClick={onClose} aria-hidden="true"
        onMouseDown={e => e.preventDefault()}
      />
      <motion.div
        ref={panel}
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
        className="relative bg-surface w-full max-w-lg rounded-t-[32px] sm:rounded-lg shadow-e3 max-h-[92%] overflow-y-auto overscroll-contain"
      >
        <div className="sticky top-0 z-10 bg-surface">
          <div className="flex justify-center pt-2 pb-1 cursor-grab touch-none" onPointerDown={e => dragControls.start(e)}>
            <div className="h-[5px] w-9 rounded-full bg-fg-faint/40" aria-hidden="true" />
          </div>
          {/* iOS 26's sheet toolbar: close on a round glass button, the
              confirming action filled in the accent; their words stay for
              VoiceOver (and as a tooltip). */}
          <div
            className="px-3 pb-2 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 touch-none"
            onPointerDown={e => { if (e.target === e.currentTarget) dragControls.start(e); }}
          >
            <button
              type="button" onClick={onClose}
              onMouseDown={e => e.preventDefault()}
              aria-label={closeLabel} title={closeLabel}
              className="h-tap w-tap rounded-full glass-chrome text-fg inline-flex items-center justify-center active:scale-[0.92] transition-transform focus-visible:ring-focus"
            >
              <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <h2 className="min-w-0 display text-chrome-title font-semibold text-fg text-center wrap-compound">{title}</h2>
            {action ? (
              <button
                type="button" onClick={action.onClick} disabled={action.disabled}
                onMouseDown={e => e.preventDefault()}
                aria-label={action.label} title={action.label}
                data-tour="sheet-save"
                className={`h-tap w-tap rounded-full inline-flex items-center justify-center transition-[transform,background-color] active:scale-[0.92] focus-visible:ring-focus ${
                  action.disabled ? 'bg-surface-2 text-fg-faint' : 'bg-accent-fill text-accent-fill-ink accent-lift'}`}
              >
                <Check className="w-5 h-5" strokeWidth={2.8} aria-hidden="true" />
              </button>
            ) : <span aria-hidden="true" />}
          </div>
        </div>
        <div className="px-5 pt-2 pb-safe-8">{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}

/**
 * A small yes/no dialog for the few actions that cannot be undone (delete
 * everything, replace data with a backup). Everything else uses undo instead.
 */
export function Confirm({ open, title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(open, panel, onCancel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 scrim" onClick={onCancel} aria-hidden="true" />
      <motion.div
        ref={panel}
        role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
        className="relative w-full max-w-sm bg-surface rounded-lg shadow-e2 p-6 text-center"
      >
        <h2 id="confirm-title" className="display text-heading font-semibold text-fg wrap-compound">{title}</h2>
        <p id="confirm-body" className="text-label text-fg-mute mt-2 wrap-prose">{body}</p>
        <div className="mt-6 grid gap-2">
          <button
            type="button" onClick={onConfirm}
            className={`min-h-control rounded-full font-semibold text-body active:scale-[0.98] transition-transform focus-visible:ring-focus ${
              danger ? 'bg-neg text-surface' : 'bg-accent-fill text-accent-fill-ink'}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button" onClick={onCancel}
            className="min-h-control rounded-full font-semibold text-body text-fg bg-surface-2 active:scale-[0.98] transition-transform focus-visible:ring-focus"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
