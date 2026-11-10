import { createContext, useContext, useEffect, useState } from 'react';

/** From this width on there is room for two columns: the month and a pane beside it (plan 22). */
export const WIDE_FROM = 700;

const query = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(`(min-width: ${WIDE_FROM}px)`) : null);

/**
 * Whether the window is wide enough for the two-column layout — by width,
 * never by device: an iPad in Split View gets the phone layout, a wide phone
 * the columns. `html[data-split]` tells the fixed chrome (tab bar, dock).
 */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const q = query();
    if (!q) return;
    const on = () => setWide(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (wide) document.documentElement.dataset.split = '';
    else delete document.documentElement.dataset.split;
    return () => { delete document.documentElement.dataset.split; };
  }, [wide]);
  return wide;
}

/**
 * What a screen scrolls in: the window on a phone, its own column when there
 * are two. `undefined` = the window; `null` = a column not mounted yet.
 */
export const ScrollerContext = createContext<HTMLElement | null | undefined>(undefined);
export const useScroller = () => useContext(ScrollerContext);
