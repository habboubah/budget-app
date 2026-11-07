import React, { ComponentType, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useDialog } from './useDialog';
import { tapLight } from './haptics';

export interface MenuItem {
  key: string;
  label: string;
  /** A quieter second line. */
  sub?: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Red, as iOS draws "Delete". */
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

interface Props {
  /** The button the menu opens from — it is placed against it. Null: closed. */
  anchor: HTMLElement | null;
  /** Names the menu for VoiceOver. */
  label: string;
  /** Items in groups; a band separates the groups, as on iOS. */
  groups: MenuItem[][];
  onClose: () => void;
}

/**
 * iOS's pull-down menu: opens from its button (below it, or above when there
 * is more room there), against the button's end edge, on glass. A tap outside
 * closes it without reaching what is underneath; Escape, Tab-trap and focus
 * return come from useDialog; the arrow keys walk the items.
 */
export function Menu(props: Props) {
  return createPortal(
    <AnimatePresence>
      {props.anchor && <MenuPanel key="menu" {...props} anchor={props.anchor} />}
    </AnimatePresence>,
    document.body,
  );
}

type Place = { left: number; top?: number; bottom?: number; width: number; maxHeight: number; origin: string };

/** The safe-area insets as pixels (env() isn't readable from script directly). */
function safeInsets(): { top: number; bottom: number } {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  probe.remove();
  return out;
}

function MenuPanel({ anchor, label, groups, onClose }: Props & { anchor: HTMLElement }) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(true, panel, onClose);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const safe = safeInsets();
    const width = Math.min(288, vw - 16);
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    // The menu's end edge on the button's end edge, kept on screen.
    const left = Math.min(Math.max(8, rtl ? r.left : r.right - width), vw - 8 - width);
    const below = vh - safe.bottom - r.bottom - 16;
    const above = r.top - safe.top - 16;
    const natural = panel.current?.scrollHeight ?? 320;
    const down = below >= Math.min(natural, 360) || below >= above;
    const origin = `${rtl ? 'left' : 'right'} ${down ? 'top' : 'bottom'}`;
    setPlace(down
      ? { left, top: r.bottom + 8, width, maxHeight: Math.max(140, below), origin }
      : { left, bottom: vh - r.top + 8, width, maxHeight: Math.max(140, above), origin });
    // The first item takes the focus, so the arrow keys and VoiceOver start inside.
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true }));
  }, [anchor]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next].focus();
  };

  return (
    <div
      className="fixed inset-0 z-[70]"
      // Outside the menu: close, and don't let the tap reach the page.
      onPointerDown={e => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}
      onClick={e => e.stopPropagation()}
    >
      <motion.div
        ref={panel}
        role="menu"
        aria-label={label}
        onKeyDown={onKey}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', duration: 0.32, bounce: 0.16 }}
        style={{
          position: 'fixed',
          left: place?.left ?? 0,
          top: place?.top,
          bottom: place?.bottom,
          width: place?.width ?? 288,
          maxHeight: place?.maxHeight,
          transformOrigin: place?.origin,
          visibility: place ? 'visible' : 'hidden',
        }}
        className="glass-menu rounded-[22px] overflow-y-auto overscroll-contain no-scrollbar"
      >
        {groups.filter(g => g.length).map((group, gi) => (
          <div key={gi} role="group" className={gi ? 'border-t-[6px] border-fg/[0.06]' : ''}>
            {group.map((item, i) => {
              const Icon = item.icon;
              const tone = item.disabled ? 'text-fg-faint' : item.destructive ? 'text-neg' : 'text-fg';
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { tapLight(); onClose(); item.onSelect(); }}
                  className={`relative w-full min-h-[48px] px-4 py-2.5 flex items-center gap-3 text-start transition-colors focus-visible:ring-focus ${
                    item.disabled ? '' : 'active:bg-fg/10'} ${i ? 'border-t border-hairline' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-body wrap-compound ${tone}`}>{item.label}</span>
                    {item.sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{item.sub}</span>}
                  </span>
                  {Icon && <Icon className={`w-5 h-5 shrink-0 ${tone}`} strokeWidth={2} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
