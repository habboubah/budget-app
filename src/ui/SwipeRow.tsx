import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { tapLight, tapMedium } from './haptics';

export interface SwipeAction {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Background of the action: a token class such as `bg-swipe-paid`. */
  className: string;
  run: () => void;
}

const SLOP = 10;
const REVEAL = 88; // the delete button's width once uncovered
const project = (v: number) => (v / 1000) * 0.99 / (1 - 0.99); // Apple's momentum projection (snappy)
const spring = { type: 'spring' as const, bounce: 0, duration: 0.35 };

/**
 * A list row with swipe actions, as in Mail and Reminders (touch only — a
 * mouse drags rows to sort them instead):
 *   swipe toward the end  → `leading`, done as soon as it is let go past the
 *                           threshold (mark paid / open), then springs back;
 *   swipe toward the start → uncovers `trailing` (delete) as a button; a long
 *                           or fast swipe runs it straight away.
 * The row follows the finger 1:1, resists past its ends, and a vertical move
 * is left to the page — `touch-action: pan-y` keeps scrolling native.
 * Everything the actions do is also reachable without swiping.
 */
export function SwipeRow({ leading, trailing, locked, children }: {
  leading?: SwipeAction;
  trailing?: SwipeAction;
  /** While true (an entry is being dragged), swipes don't start. */
  locked?: boolean;
  children: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const quietUntil = useRef(0);
  const live = useRef({ leading, trailing, locked });
  live.current = { leading, trailing, locked };

  const leadingOpacity = useTransform(x, v => (v > 0 ? 1 : 0));
  const trailingOpacity = useTransform(x, v => (v < 0 ? 1 : 0));

  const close = () => { setOpen(false); animate(x, 0, spring); };

  // An uncovered delete button closes again when the page scrolls.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    window.addEventListener('scroll', onScroll, { passive: true, once: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || live.current.locked) return;
    const el = root.current!;
    const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    const width = el.offsetWidth;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const start = x.get();
    let mode: 'undecided' | 'swipe' | 'scroll' = 'undecided';
    let armed = false;
    const history: { t: number; x: number }[] = [];

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (mode === 'undecided') {
        if (live.current.locked) return;
        if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) { mode = 'scroll'; return; }
        if (Math.abs(dx) <= SLOP || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        mode = 'swipe';
        try { el.setPointerCapture(e.pointerId); } catch { /* already released */ }
      }
      if (mode !== 'swipe') return;
      let logical = start * dir + dx * dir;
      const { leading: l, trailing: tr } = live.current;
      if (logical > 0 && !l) logical = 0;
      if (logical < 0 && !tr) logical = 0;
      // Rubber-band past the ends instead of a hard stop.
      const max = width * 0.75;
      if (Math.abs(logical) > max) {
        const over = Math.abs(logical) - max;
        logical = Math.sign(logical) * (max + (over * width * 0.55) / (width + 0.55 * over));
      }
      x.set(logical * dir);
      history.push({ t: ev.timeStamp, x: logical });
      if (history.length > 5) history.shift();
      const nowArmed = logical > 80 || logical < -width * 0.5;
      if (nowArmed !== armed) { armed = nowArmed; if (armed) tapLight(); }
    };

    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      if (mode !== 'swipe') return;
      quietUntil.current = Date.now() + 400;
      const logical = x.get() * dir;
      const first = history[0];
      const last = history[history.length - 1];
      const v = first && last && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0;
      const projected = logical + project(v);
      const { leading: l, trailing: tr } = live.current;

      if (logical > 0) {
        if (l && (logical > 80 || projected > 160)) { tapMedium(); l.run(); }
        setOpen(false);
        animate(x, 0, { ...spring, velocity: v * dir });
        return;
      }
      if (tr && (logical < -width * 0.5 || projected < -width * 0.7)) {
        tapMedium();
        setOpen(false);
        animate(x, -width * dir, { ...spring, velocity: v * dir }).then(() => { tr.run(); x.set(0); });
        return;
      }
      if (tr && projected < -REVEAL / 2) {
        setOpen(true);
        animate(x, -REVEAL * dir, { ...spring, velocity: v * dir });
        return;
      }
      setOpen(false);
      animate(x, 0, { ...spring, velocity: v * dir });
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  };

  return (
    <div ref={root} className="relative overflow-hidden" style={{ touchAction: 'pan-y' }} onPointerDown={onPointerDown}>
      {leading && (
        <motion.div aria-hidden="true" style={{ opacity: leadingOpacity }}
          className={`absolute inset-0 flex items-center justify-start ps-5 text-on-color ${leading.className}`}>
          <span className="flex flex-col items-center gap-0.5 text-caption font-semibold">
            <leading.icon className="w-6 h-6" strokeWidth={2.2} />{leading.label}
          </span>
        </motion.div>
      )}
      {trailing && (
        <motion.div style={{ opacity: trailingOpacity }}
          className={`absolute inset-0 flex items-stretch justify-end ${trailing.className}`}>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            onClick={() => { close(); trailing.run(); }}
            className="min-w-[88px] flex flex-col items-center justify-center gap-0.5 text-on-color text-caption font-semibold"
          >
            <trailing.icon className="w-6 h-6" strokeWidth={2.2} />{trailing.label}
          </button>
        </motion.div>
      )}
      <motion.div
        style={{ x }}
        className="relative bg-surface"
        onClickCapture={ev => {
          // The tap that ends a swipe, or that closes an uncovered action, opens nothing.
          if (Date.now() < quietUntil.current || open) {
            ev.preventDefault(); ev.stopPropagation();
            if (open) close();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
