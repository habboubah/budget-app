import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * A number that runs to its new value instead of jumping — the balance after
 * a bill is ticked, or when the month changes — so the eye sees which way it
 * moved. Integer steps (cents), a strong ease-out, interruptible: a second
 * change mid-run carries on from where the number is. The first value shows
 * as it is; with reduced motion every value does.
 */
export function useCountUp(value: number, duration = 0.55): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (reduce || current.current === value) {
      current.current = value;
      setShown(value);
      return;
    }
    const run = animate(current.current, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: v => {
        current.current = v;
        setShown(Math.round(v));
      },
    });
    return () => run.stop();
  }, [value, reduce, duration]);

  return shown;
}
