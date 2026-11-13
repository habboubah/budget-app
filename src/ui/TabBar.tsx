import { ComponentType, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
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
export function TabBar<T extends string>({ tabs, active, onChange, label, add }: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  /** The round add button in the bar's middle; hidden while there is nothing to add to. */
  add?: { label: string; onClick: () => void } | null;
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
                  {add && i === middle && (
                    <motion.button
                      type="button"
                      data-tour="add"
                      aria-label={add.label}
                      title={add.label}
                      onClick={() => { tapMedium(); add.onClick(); }}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileTap={{ scale: 0.9, rotate: 90 }}
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.25 }}
                      className="place-self-center w-[52px] h-[52px] rounded-full hero text-on-hero inline-flex items-center justify-center focus-visible:ring-focus"
                    >
                      <Plus className="w-[26px] h-[26px]" strokeWidth={2.4} />
                    </motion.button>
                  )}
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
