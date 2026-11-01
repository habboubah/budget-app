import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import { tapLight } from './haptics';

interface Props {
  title: string;
  /** A small line above the large title (today's date on home). */
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Header-right controls. Keep to two. */
  actions?: React.ReactNode;
  /** Something shown left of the large title. */
  leading?: React.ReactNode;
  /** Extra bottom padding for a docked bar. */
  docked?: boolean;
  /** A tab screen: bottom padding clears the tab bar and the add button above it. */
  tabbed?: boolean;
  /** Replaces the plain large title (the month switcher). */
  titleSlot?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Every screen's shell: a compact bar (back, centred title once scrolled,
 * actions) over a large title that scrolls with the content. The bar is a
 * solid colour, never blurred — backdrop-filter is the most expensive thing to
 * put over a scrolling list in a WebView.
 */
export function Screen({ title, eyebrow, subtitle, onBack, backLabel, actions, leading, docked, tabbed, titleSlot, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 48);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className={`mx-auto w-full max-w-xl min-h-screen ${tabbed ? 'pb-safe-tabs' : docked ? 'pb-safe-dock' : 'pb-16'}`}>
      <header className="sticky top-0 z-30 bg-bg safe-top">
        {/* Sides size to their content and the title takes what is left, so a
            wide action can never sit on top of it. */}
        <div className="px-2 min-h-chrome grid grid-cols-[minmax(48px,auto)_minmax(0,1fr)_minmax(48px,auto)] gap-2 items-center">
          <div className="justify-self-start">
            {onBack && (
              <button
                type="button" onClick={() => { tapLight(); onBack(); }}
                title={backLabel} aria-label={backLabel}
                className="h-tap min-w-tap px-1 inline-flex items-center justify-center rounded-full text-accent active:opacity-50 transition-opacity focus-visible:ring-focus"
              >
                <ChevronLeft className="w-7 h-7 rtl:rotate-180" strokeWidth={2.25} />
              </button>
            )}
          </div>
          <span
            aria-hidden="true"
            className={`min-w-0 display text-chrome-title font-bold text-fg text-center truncate transition-opacity duration-150 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          >
            {title}
          </span>
          <div className="justify-self-end flex items-center gap-1 pr-1">{actions}</div>
        </div>
        <div className={`h-px bg-hairline transition-opacity duration-150 ${scrolled ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
      </header>

      <div className="px-5 pt-1 pb-4 flex items-center gap-4">
        {leading}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow text-fg-mute mb-1.5">{eyebrow}</p>}
          {titleSlot ?? <h1 className="display text-title font-extrabold text-fg wrap-compound">{title}</h1>}
          {subtitle && <div className="text-label text-fg-mute mt-1 wrap-prose">{subtitle}</div>}
        </div>
      </div>

      <main className="px-4 space-y-5">{children}</main>
    </div>
  );
}

/** A grouped card of rows. */
export function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-2 pb-2 text-label font-semibold text-fg-mute wrap-compound">{title}</h2>}
      <div className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset">{children}</div>
      {footer && <p className="px-2 pt-2 text-caption text-fg-mute wrap-prose">{footer}</p>}
    </section>
  );
}

/** One row in a Group. A button when `onClick` is set. */
export function Row({ label, sub, leading, trailing, onClick, ariaLabel, danger }: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  danger?: boolean;
}) {
  const sep = { '--sep': leading ? '68px' : '1rem' } as React.CSSProperties;
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 text-start">
        <span className={`block text-body wrap-compound ${danger ? 'text-neg font-semibold' : 'text-fg'}`}>{label}</span>
        {sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{sub}</span>}
      </span>
      {trailing}
    </>
  );
  const shell = 'relative w-full min-h-chrome px-4 py-2.5 flex items-center gap-3';
  if (!onClick) return <div className={shell} style={sep}>{body}</div>;
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }} aria-label={ariaLabel} style={sep}
      className={`${shell} transition-colors active:bg-surface-2 focus-visible:ring-focus`}
    >
      {body}
    </button>
  );
}

/** Empty state: what is missing, and the action that fixes it. */
export function Empty({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="emoji text-[64px] mb-4" aria-hidden="true">{emoji}</div>
      <p className="display text-heading font-bold text-fg wrap-compound">{title}</p>
      {body && <p className="text-label text-fg-mute mt-2 wrap-prose max-w-xs mx-auto">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * A row whose body opens something and which also carries its own buttons
 * (edit, delete). The body and the buttons are siblings, never nested — a
 * button inside a button is invalid and unreachable for VoiceOver.
 */
export function ActionRow({ label, sub, leading, onClick, ariaLabel, actions }: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  actions: React.ReactNode;
}) {
  const sep = { '--sep': leading ? '68px' : '1rem' } as React.CSSProperties;
  return (
    <div className="relative w-full min-h-chrome flex items-center pe-1" style={sep}>
      <button
        type="button" onClick={() => { tapLight(); onClick(); }} aria-label={ariaLabel}
        className="flex-1 min-w-0 self-stretch px-4 py-2.5 flex items-center gap-3 text-start transition-colors active:bg-surface-2 focus-visible:ring-focus"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block text-body text-fg wrap-compound">{label}</span>
          {sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{sub}</span>}
        </span>
      </button>
      <span className="shrink-0 flex items-center">{actions}</span>
    </div>
  );
}

/**
 * The one primary action of a screen, pinned above the home indicator in
 * thumb reach. Pair it with `<Screen docked>` so the last row can scroll
 * clear of it. Portalled to <body>: the screen's slide-in transform would
 * otherwise capture `position: fixed` and carry the bar along with it.
 */
export function Dock({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dock-fade">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
