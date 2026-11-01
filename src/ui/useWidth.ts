import { RefObject, useLayoutEffect, useState } from 'react';

/** The rendered width of an element, kept current — charts draw in real pixels. */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 340): number {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return width;
}
