import { ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { tapLight, tapMedium } from './haptics';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * The tab bar as iOS draws it today: a floating capsule above the home
 * indicator — Monat · Statistik · Einstellungen, the current one on a soft
 * pill — and, beside it, the round add button, in thumb reach on every tab.
 * The page fades out behind it rather than being cut off by a bar.
 *
 * Solid, not blurred (backdrop-filter over a scrolling page is too expensive
 * in a WebView). Portalled so a screen's slide-in transform can't capture
 * `position: fixed`.
 */
export function TabBar<T extends string>({ tabs, active, onChange, label, add }: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
  /** The round add button next to the bar; hidden while there is nothing to add to. */
  add?: { label: string; onClick: () => void } | null;
}) {
  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-20 h-[calc(96px+env(safe-area-inset-bottom))] edge-fade-bottom pointer-events-none" />
      <nav
        aria-label={label}
        className="fixed inset-x-0 z-30 pointer-events-none"
        style={{ bottom: 'max(calc(env(safe-area-inset-bottom) - 6px), 14px)' }}
      >
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3">
          <div
            className="pointer-events-auto flex-1 min-w-0 h-[62px] p-1 rounded-full float-chrome grid"
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
                      className="absolute inset-0 rounded-full bg-surface-2"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <Icon className="relative w-[22px] h-[22px]" strokeWidth={on ? 2.3 : 1.9} />
                  <span className={`relative text-chrome truncate max-w-full px-1 ${on ? 'font-semibold' : 'font-medium'}`}>{name}</span>
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {add && (
              <motion.button
                key="add"
                type="button"
                aria-label={add.label}
                title={add.label}
                onClick={() => { tapMedium(); add.onClick(); }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.25 }}
                className="pointer-events-auto shrink-0 w-[62px] h-[62px] rounded-full bg-accent-fill text-accent-fill-ink shadow-e2 inline-flex items-center justify-center focus-visible:ring-focus"
              >
                <Plus className="w-7 h-7" strokeWidth={2.4} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>,
    document.body,
  );
}
