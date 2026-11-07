import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronsUpDown } from 'lucide-react';
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
  /** Under the large title, scrolling with it — the search field, as on iOS. */
  accessory?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Every screen's shell, the iOS way: a large title that scrolls with the
 * content, and a bar that stays — back on the left, round floating buttons on
 * the right, the title appearing small in the middle once the large one has
 * scrolled away. No divider: where the content meets the bar it fades out
 * (a gradient, never a blur — backdrop-filter over a scrolling list is too
 * expensive in a WebView).
 */
export function Screen({ title, eyebrow, subtitle, onBack, backLabel, actions, leading, docked, tabbed, titleSlot, accessory, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  // At the very top the bar is see-through, so the page's accent light shows
  // behind it; once anything scrolls under it, it turns solid (as iOS does).
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 44); setAtTop(window.scrollY < 1); };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className={`relative isolate mx-auto w-full max-w-xl min-h-screen ${tabbed ? 'pb-safe-tabs' : docked ? 'pb-safe-dock' : 'pb-16'}`}>
      {/* The accent's light at the top of the page, while the page rests at the
          top; it fades as the bar turns solid, so the two never meet in a seam.
          Wider than the column so it never shows an edge (App clips the overflow). */}
      <div
        aria-hidden="true"
        className={`absolute -z-10 top-0 h-[380px] inset-x-[-50vw] accent-wash pointer-events-none transition-opacity duration-200 ${atTop ? 'opacity-100' : 'opacity-0'}`}
      />
      <header className={`sticky top-0 z-30 safe-top transition-[background-color] duration-200 ${atTop ? 'bg-transparent' : 'bg-bg'}`}>
        {/* Sides size to their content and the title takes what is left, so a
            wide action can never sit on top of it. */}
        <div className="px-3 min-h-[54px] grid grid-cols-[minmax(44px,auto)_minmax(0,1fr)_minmax(44px,auto)] gap-2 items-center">
          <div className="justify-self-start">
            {onBack && (
              <button
                type="button" onClick={() => { tapLight(); onBack(); }}
                title={backLabel} aria-label={backLabel}
                className="h-tap w-tap inline-flex items-center justify-center rounded-full glass-chrome text-fg active:scale-[0.92] transition-transform focus-visible:ring-focus"
              >
                <ChevronLeft className="w-6 h-6 -ms-0.5 rtl:rotate-180" strokeWidth={2.25} />
              </button>
            )}
          </div>
          <span
            aria-hidden="true"
            className={`min-w-0 display text-chrome-title font-semibold text-fg text-center truncate transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          >
            {title}
          </span>
          <div className="justify-self-end flex items-center gap-2">{actions}</div>
        </div>
        {/* Scroll edge: the content fades into the bar instead of meeting a line. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-full h-5 pointer-events-none edge-fade-top transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
        />
      </header>

      <div className={`px-5 pt-0.5 ${accessory ? 'pb-3' : 'pb-4'} flex items-center gap-4`}>
        {leading}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow text-fg-mute mb-0.5">{eyebrow}</p>}
          {titleSlot ?? <h1 className="display text-title font-bold text-fg wrap-compound tracking-[-0.025em]">{title}</h1>}
          {subtitle && <div className="text-label text-fg-mute mt-1 wrap-prose">{subtitle}</div>}
        </div>
      </div>
      {accessory && <div className="px-4 pb-5">{accessory}</div>}

      <main className="px-4 space-y-6">{children}</main>
    </div>
  );
}

/** A grouped card of rows (an iOS inset grouped section). */
export function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-4 pb-1.5 eyebrow text-fg-mute wrap-compound">{title}</h2>}
      <div className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset">{children}</div>
      {footer && <p className="px-4 pt-2 text-caption text-fg-mute wrap-prose">{footer}</p>}
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
  const sep = { '--sep': leading ? '58px' : '1rem' } as React.CSSProperties;
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
  const shell = 'relative w-full min-h-[52px] px-4 py-2.5 flex items-center gap-3';
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

/**
 * A row in a Group that picks one of a few values, as iOS Settings' pop-up
 * rows: the label, then the choice and ⌃⌄ at the end. The system's own
 * picker opens on a tap anywhere on the row — a native select lies invisibly
 * over it, so VoiceOver reads one pop-up button with its value.
 */
export function MenuRow<V extends string>({ label, leading, value, options, onChange }: {
  label: string;
  leading?: React.ReactNode;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  const sep = { '--sep': leading ? '58px' : '1rem' } as React.CSSProperties;
  return (
    <label className="relative w-full min-h-[52px] px-4 py-2.5 flex items-center gap-3 transition-colors active:bg-surface-2 focus-within:ring-focus" style={sep}>
      {leading}
      {/* Side by side while both fit; with large text the choice moves under the label. */}
      <span className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="min-w-0 max-w-full text-body text-fg wrap-compound">{label}</span>
        <span className="ms-auto min-w-0 max-w-full inline-flex items-center gap-1 text-body text-fg-mute" aria-hidden="true">
          <span className="min-w-0 wrap-compound">{options.find(o => o.value === value)?.label}</span>
          <ChevronsUpDown className="w-4 h-4 shrink-0" strokeWidth={2.4} />
        </span>
      </span>
      {/* 17px: WebKit zooms the page into a focused control under 16px. */}
      <select
        aria-label={label}
        value={value}
        onChange={e => { tapLight(); onChange(e.target.value as V); }}
        className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer text-body"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** A text button in the bar ("Bearbeiten", "Fertig"): a glass capsule, as iOS 26 draws them. */
export function BarButton({ children, onClick, strong }: { children: React.ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onClick(); }}
      className={`h-tap px-4 rounded-full glass-chrome text-body text-accent whitespace-nowrap active:scale-[0.96] transition-transform focus-visible:ring-focus ${
        strong ? 'font-semibold' : 'font-medium'}`}
    >
      {children}
    </button>
  );
}

/**
 * The coloured square in front of a settings row, as in iOS Settings: a white
 * symbol on one of the category hues (their chart step is saturated enough).
 */
export function IconTile({ icon: Icon, hue }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string }) {
  return (
    <span data-hue={hue} aria-hidden="true" className="w-[30px] h-[30px] rounded-[8px] bg-hue-chart text-on-color inline-flex items-center justify-center shrink-0">
      <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
    </span>
  );
}

/** Empty state: what is missing, and the action that fixes it. */
export function Empty({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="emoji text-[64px] mb-4" aria-hidden="true">{emoji}</div>
      <p className="display text-heading font-semibold text-fg wrap-compound">{title}</p>
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
  const sep = { '--sep': leading ? '60px' : '1rem' } as React.CSSProperties;
  return (
    <div className="relative w-full min-h-[52px] flex items-center pe-1" style={sep}>
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
