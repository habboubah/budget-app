import { ComponentType, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';
import { tapLight, tapMedium } from './haptics';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * The tab bar as iOS 26 draws it: a floating Liquid Glass capsule above the
 * home indicator — Monat · Statistik · Planen · Mehr, the current one on a
 * soft pill in the accent's tint. The add button is not in it: it floats on
 * its own just above the bar's trailing end (see `AddButton`). It sat in the
 * bar's middle until November 2026, and beside the capsule before that.
 * The page shows through the glass; a short fade keeps the home indicator's
 * strip calm.
 *
 * Portalled so a screen's slide-in transform can't capture `position: fixed`.
 */

/**
 * The add button: a 56 px rounded square on the accent's gradient
 * (`add-fab`), floating above the tab bar's trailing end, in thumb reach and
 * where the guide says it is ("unten rechts"). Only the month page shows it
 * (App passes `add` there alone). Scrolling down the month tucks it away so it
 * doesn't sit on the amounts at the row ends; scrolling back up, reaching the
 * top or the end, or focusing it brings it back.
 *
 * It answers the finger the moment it lands — it gives, the plus begins to
 * turn — and says what it did: while the sheet it opened is up the plus stays
 * a cross, and turns back with a little spring when the sheet goes. A tap also
 * sends one ring of light out of it. All springs, so a second touch takes
 * over from wherever the first one left it.
 */
function AddButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  const [taps, setTaps] = useState(0);
  const calm = useReducedMotion();
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const check = () => {
      frame = 0;
      const y = window.scrollY;
      const end = document.documentElement.scrollHeight - window.innerHeight;
      if (y < 24 || y > end - 24) { setTucked(false); last = y; return; }
      const dy = y - last;
      if (Math.abs(dy) < 8) return;
      setTucked(dy > 0);
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);
  const away = tucked && !open;
  return createPortal(
    <div
      className="fixed inset-x-0 z-30 pointer-events-none"
      // The bar's own gap above the home indicator, its 62 px and 14 px of air.
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom) - 6px, 14px) + 76px)' }}
    >
      <div className="mx-auto max-w-xl px-[16px] flex justify-end">
        <motion.button
          type="button"
          data-tour="add"
          aria-label={label}
          title={label}
          onFocus={() => setTucked(false)}
          onClick={() => { tapMedium(); setTaps(n => n + 1); onClick(); }}
          initial="away"
          animate={away ? 'away' : open ? 'open' : 'rest'}
          whileTap="down"
          variants={{
            away: calm ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 28 },
            rest: { opacity: 1, scale: 1, y: 0 },
            open: { opacity: 1, scale: 1, y: 0 },
            // In at once, without a bounce; the spring below is the way back out.
            down: { scale: 0.9, transition: { type: 'spring', duration: 0.16, bounce: 0 } },
          }}
          transition={{ type: 'spring', duration: 0.42, bounce: 0.35 }}
          className={`relative w-[56px] h-[56px] add-fab text-on-hero inline-flex items-center justify-center focus-visible:ring-focus ${away ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
          {taps > 0 && !calm && (
            <motion.span
              key={taps}
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] add-burst pointer-events-none"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            />
          )}
          <motion.span
            className="relative inline-flex"
            variants={{ away: { rotate: -90 }, rest: { rotate: 0 }, open: { rotate: 45 }, down: { rotate: 45 } }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
          >
            <Plus className="w-[26px] h-[26px]" strokeWidth={2.6} />
          </motion.span>
        </motion.button>
      </div>
    </div>,
    document.body,
  );
}

export function TabBar<T extends string>({ tabs, active, onChange, label, add }: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  /** The add button floating above the bar's trailing end; only where it's passed (the month page), and while there is something to add to. `open`: the sheet it opens is up. */
  add?: { label: string; onClick: () => void; open?: boolean } | null;
}) {
  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-20 h-[calc(60px+env(safe-area-inset-bottom))] edge-fade-bottom opacity-80 pointer-events-none" />
      <nav
        aria-label={label}
        className="fixed inset-x-0 z-30 pointer-events-none"
        style={{ bottom: 'max(calc(env(safe-area-inset-bottom) - 6px), 14px)' }}
      >
        {/* Physical spacing: the bar is chrome, its size doesn't follow the text (iOS doesn't either). */}
        <div className="mx-auto max-w-xl px-[16px]">
          <div
            data-tour="tabs"
            className="pointer-events-auto h-[62px] p-[4px] rounded-full glass-chrome grid"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map(({ id, label: name, icon: Icon }) => {
              const on = id === active;
              return (
                  <button
                    key={id}
                    type="button"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => { if (!on) tapLight(); onChange(id); }}
                    className={`relative min-w-0 rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:ring-focus ${
                      on ? 'text-accent' : 'text-fg active:text-fg-mute'}`}
                  >
                    {on && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-accent-dim"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    {/* The chosen tab's symbol lands with a small bounce. */}
                    <motion.span
                      key={on ? 'on' : 'off'}
                      className="relative inline-flex"
                      initial={on ? { scale: 0.72, y: 2 } : false}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', duration: 0.45, bounce: 0.5 }}
                    >
                      <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.4 : 1.9} />
                    </motion.span>
                    {/* Barely grows with large text, as iOS tab labels don't: a label has 56 px on the narrowest phone, ~68 px on most. */}
                    <span className={`relative text-[clamp(11px,0.6875rem,12px)] leading-tight truncate max-w-full px-[4px] ${on ? 'font-semibold' : 'font-medium'}`}>{name}</span>
                  </button>
              );
            })}
          </div>
        </div>
      </nav>
      {add && <AddButton label={add.label} open={!!add.open} onClick={add.onClick} />}
    </>,
    document.body,
  );
}
