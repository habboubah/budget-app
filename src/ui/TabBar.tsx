import { ComponentType, Fragment, useState } from 'react';
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
 * soft pill in the accent's tint — and, in its middle, the round add button
 * on the accent's gradient, in thumb reach on every tab. (It stood beside the
 * capsule until November 2026: on a 320–360 px phone the capsule and a 62 px
 * button side by side were crowded. Inside, the bar has the whole width and
 * every tab a little more of it.) The page shows through the glass; a short
 * fade keeps the home indicator's strip calm.
 *
 * Portalled so a screen's slide-in transform can't capture `position: fixed`.
 */

/**
 * The add button: the hero as a lit dome (`add-orb`), 58 px, raised half
 * out of the capsule and set in a ring of the page's own colour
 * (the 5 px ring in `add-orb`), so it reads as cut into the bar — the one primary action. It answers the finger the moment it lands — the dome gives,
 * the plus begins to turn — and
 * says what it did: while the sheet it opened is up the plus stays a cross,
 * and turns back with a little spring when the sheet goes. A tap also sends
 * one ring of light out of it, like a paid tick's. All springs, so a second
 * touch takes over from wherever the first one left it.
 */
function AddButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  const [taps, setTaps] = useState(0);
  const calm = useReducedMotion();
  return (
    <motion.button
      type="button"
      data-tour="add"
      aria-label={label}
      title={label}
      onClick={() => { tapMedium(); setTaps(n => n + 1); onClick(); }}
      initial="away"
      animate={open ? 'open' : 'rest'}
      whileTap="down"
      variants={{
        away: { scale: 0.6, opacity: 0 },
        rest: { scale: 1, opacity: 1 },
        open: { scale: 1, opacity: 1 },
        // In at once, without a bounce; the spring below is the way back out.
        down: { scale: 0.88, transition: { type: 'spring', duration: 0.16, bounce: 0 } },
      }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.45 }}
      className="relative place-self-center -translate-y-[14px] w-[58px] h-[58px] rounded-full hero add-orb text-on-hero inline-flex items-center justify-center focus-visible:ring-focus"
    >
      {taps > 0 && !calm && (
        <motion.span
          key={taps}
          aria-hidden="true"
          className="absolute inset-0 rounded-full add-burst pointer-events-none"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
      <motion.span
        className="relative inline-flex"
        variants={{ away: { rotate: -90 }, rest: { rotate: 0 }, open: { rotate: 45 }, down: { rotate: 45 } }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
      >
        <Plus className="w-[28px] h-[28px]" strokeWidth={2.6} />
      </motion.span>
    </motion.button>
  );
}

export function TabBar<T extends string>({ tabs, active, onChange, label, add }: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  /** The round add button in the bar's middle; hidden while there is nothing to add to. `open`: the sheet it opens is up. */
  add?: { label: string; onClick: () => void; open?: boolean } | null;
}) {
  const middle = Math.ceil(tabs.length / 2);
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
            style={{ gridTemplateColumns: `repeat(${tabs.length + (add ? 1 : 0)}, minmax(0, 1fr))` }}
          >
            {tabs.map(({ id, label: name, icon: Icon }, i) => {
              const on = id === active;
              return (
                <Fragment key={id}>
                  {/* The add button takes the middle slot, between the second tab and the third. */}
                  {add && i === middle && <AddButton label={add.label} open={!!add.open} onClick={add.onClick} />}
                  <button
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
                </Fragment>
              );
            })}
          </div>
        </div>
      </nav>
    </>,
    document.body,
  );
}
