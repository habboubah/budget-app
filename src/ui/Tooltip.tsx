import React, { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { tapLight } from './haptics';

/** How long a finger rests on the button before its tip shows. */
const PRESS_MS = 450;
/** How long the mouse rests on it. */
const HOVER_MS = 350;
/** A tip shown by a long press goes away by itself after this. */
const TOUCH_SHOW_MS = 3200;

type Place = { left: number; top: number; arrow: number; below: boolean };

/**
 * A short explanation for a small button whose symbol alone may not say
 * enough (the month page's filters). It shows on hover after a moment, on
 * keyboard focus, and — where there is no hover — on a long press, which
 * then does not also press the button. Below the button (above it when there
 * is no room), kept inside the screen, with a little arrow pointing at it.
 * Escape, scrolling or a tap elsewhere hide it. The button gets
 * `aria-describedby`, so VoiceOver reads the explanation after its label.
 */
export function Tooltip({ text, children }: { text: string; children: React.ReactElement }) {
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  /** A long press just showed the tip: the click that follows the lift is swallowed. */
  const swallow = useRef(false);

  const clear = () => { window.clearTimeout(timer.current); window.clearTimeout(hideTimer.current); };
  const show = () => { clear(); setOpen(true); };
  const hide = () => { clear(); setOpen(false); };
  useEffect(() => clear, []);

  // Where the bubble goes, once it has a size.
  useLayoutEffect(() => {
    if (!open) { setPlace(null); return; }
    const a = wrap.current?.getBoundingClientRect();
    const b = bubble.current?.getBoundingClientRect();
    if (!a || !b) return;
    const margin = 12;
    const vw = document.documentElement.clientWidth;
    const center = a.left + a.width / 2;
    const left = Math.min(Math.max(center - b.width / 2, margin), vw - b.width - margin);
    const below = a.bottom + 10 + b.height <= window.innerHeight - margin || a.top - 10 - b.height < margin;
    setPlace({ left, top: below ? a.bottom + 10 : a.top - 10 - b.height, arrow: center - left, below });
  }, [open, text]);

  // While it shows: Escape, a scroll or a touch anywhere else put it away.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) hide(); };
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('pointerdown', away, true);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('scroll', hide);
      window.removeEventListener('pointerdown', away, true);
    };
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    clear();
    timer.current = window.setTimeout(() => {
      swallow.current = true;
      tapLight();
      setOpen(true);
      hideTimer.current = window.setTimeout(() => setOpen(false), TOUCH_SHOW_MS);
    }, PRESS_MS);
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') window.clearTimeout(timer.current);
  };
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clear();
    timer.current = window.setTimeout(() => setOpen(true), HOVER_MS);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') hide(); else window.clearTimeout(timer.current);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (swallow.current) { swallow.current = false; e.preventDefault(); e.stopPropagation(); return; }
    hide();
  };
  const onFocus = (e: React.FocusEvent) => {
    if ((e.target as HTMLElement).matches?.(':focus-visible')) show();
  };

  const child = isValidElement<{ 'aria-describedby'?: string }>(children)
    ? cloneElement(children, { 'aria-describedby': id })
    : children;

  return (
    <span
      ref={wrap}
      className="relative inline-flex shrink-0 select-none [-webkit-touch-callout:none]"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClickCapture={onClickCapture}
      onContextMenu={e => { if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'mouse') return; e.preventDefault(); }}
      onFocus={onFocus}
      onBlur={hide}
    >
      {child}
      {/* Always in the document, so aria-describedby has something to read. */}
      <span id={id} className="sr-only">{text}</span>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="tip"
              ref={bubble}
              role="tooltip"
              aria-hidden="true"
              className="fixed z-[80] max-w-[min(280px,calc(100vw-24px))] rounded-[14px] bg-fg text-bg px-3.5 py-2.5 text-caption font-medium leading-snug shadow-e2 pointer-events-none wrap-prose"
              style={{
                left: place?.left ?? -9999,
                top: place?.top ?? -9999,
                transformOrigin: place ? `${place.arrow}px ${place.below ? 0 : '100%'}` : 'center',
              }}
              initial={{ opacity: 0, scale: 0.92, y: place?.below === false ? 4 : -4 }}
              animate={{ opacity: place ? 1 : 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', duration: 0.28, bounce: 0.2 }}
            >
              {text}
              {place && (
                <span
                  aria-hidden="true"
                  className={`absolute w-3 h-3 bg-fg rotate-45 rounded-[2px] ${place.below ? '-top-1' : '-bottom-1'}`}
                  style={{ left: place.arrow - 6 }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
