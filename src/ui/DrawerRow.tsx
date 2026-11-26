import { ComponentType, ReactNode } from 'react';
import { tapLight } from './haptics';

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * A row of the menu drawer, the way fuel-app draws its menu (November 2026,
 * Ahmad): no card, no chevron, no line under it — the icon, the label, and at
 * the end a count, a value or a switch. `main` rows are the pages (the icon
 * in the accent, the label in body type); the others are the quieter links
 * and settings (a grey icon, label type). A button when `onClick` is set.
 */
export function DrawerRow({ icon: I, label, sub, end, onClick, main, danger, tour, nav }: {
  icon: Icon;
  label: string;
  /** A short line under the label (a setting's state). */
  sub?: string;
  /** At the row's end: a count, a value, a switch. */
  end?: ReactNode;
  onClick?: () => void;
  main?: boolean;
  danger?: boolean;
  /** What a tour points at (src/guide.ts). */
  tour?: string;
  /** The page a row opens, for the scripts (`data-nav-tile`, scripts/nav.mjs). */
  nav?: string;
}) {
  const body = (
    <>
      <I className={`shrink-0 ${main ? 'w-[22px] h-[22px]' : 'w-5 h-5'} ${danger ? 'text-neg' : main ? 'text-accent' : 'text-fg-mute'}`} strokeWidth={2.1} />
      <span className="min-w-0 flex-1 text-start">
        <span className={`block wrap-compound ${main ? 'text-body font-semibold' : 'text-label font-medium'} ${danger ? 'text-neg' : 'text-fg'}`}>{label}</span>
        {sub && <span className="block text-caption text-fg-mute wrap-compound">{sub}</span>}
      </span>
      {end}
    </>
  );
  const shell = `w-full ${main ? 'min-h-12' : 'min-h-11'} flex items-center gap-4 rounded-md px-3 py-1.5`;
  if (!onClick) return <div className={shell} data-tour={tour}>{body}</div>;
  return (
    <button
      type="button"
      data-tour={tour}
      data-nav-tile={nav}
      aria-label={sub ? undefined : label}
      onClick={() => { tapLight(); onClick(); }}
      className={`${shell} transition-colors active:bg-surface-2 focus-visible:ring-focus`}
    >
      {body}
    </button>
  );
}

/** A count or a value at a row's end, quiet. */
export function DrawerValue({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-caption font-semibold text-fg-mute tabular-nums">{children}</span>;
}
