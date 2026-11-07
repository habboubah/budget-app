import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { MotionValue, animate, useMotionValue } from 'motion/react';

/**
 * iOS's back gesture for a pushed screen: a finger from the leading edge
 * drags the screen away 1:1, the screen under it slides in from a little
 * behind; let go past a third of the width — or with a flick — and it goes
 * back, finishing at the finger's speed; otherwise it springs home.
 *
 * Bind `edge` to a thin strip along the leading edge (touch-action: none, so
 * the page doesn't scroll while the finger moves sideways); move the screen by
 * `x`. `swiping` is true while the screen underneath should be drawn, and
 * `popped` tells the navigation that this back needs no transition of its own.
 * Touch only — a mouse uses the back button.
 */
export function useEdgeSwipeBack(onBack: () => void, rtl: boolean): {
  x: MotionValue<number>;
  swiping: boolean;
  popped: React.MutableRefObject<boolean>;
  edge: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  };
} {
  const x = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);
  const popped = useRef(false);
  const back = useRef(onBack);
  back.current = onBack;
  const drag = useRef<{ id: number; x0: number; samples: { t: number; d: number }[] } | null>(null);
  const dir = rtl ? -1 : 1;

  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const width = window.innerWidth;
    const travelled = Math.abs(x.get());
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const speed = first && last && last.t > first.t ? (last.d - first.d) / (last.t - first.t) : 0; // px per ms
    if (!cancelled && (travelled > width / 3 || speed > 0.45)) {
      // Carry on at the finger's pace, then pop without a second transition.
      const remaining = Math.max(0.12, Math.min(0.3, (width - travelled) / Math.max(1.2, speed * 1000) ));
      void animate(x, width * dir, { type: 'tween', duration: remaining, ease: [0.25, 1, 0.5, 1] }).then(() => {
        popped.current = true;
        back.current();
        x.jump(0);
        setSwiping(false);
      });
    } else {
      void animate(x, 0, { type: 'spring', stiffness: 520, damping: 46 }).then(() => setSwiping(false));
    }
  };

  return {
    x,
    swiping,
    popped,
    edge: {
      onPointerDown: e => {
        if (e.pointerType !== 'touch' || drag.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x0: e.clientX, samples: [] };
        setSwiping(true);
      },
      onPointerMove: e => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const travelled = Math.max(0, (e.clientX - d.x0) * dir);
        x.set(travelled * dir);
        d.samples.push({ t: e.timeStamp, d: travelled });
        if (d.samples.length > 5) d.samples.shift();
      },
      onPointerUp: e => end(e, false),
      onPointerCancel: e => end(e, true),
    },
  };
}
