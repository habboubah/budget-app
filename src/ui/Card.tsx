import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { tapLight } from './haptics';

/**
 * A white card with a heading — the statistics' and insights' building block:
 * a title, an optional caption under it, and an optional control beside it
 * (a pull-down, a text button).
 */
export function Card({ title, sub, action, className = '', children }: {
  title: string;
  sub?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-md bg-surface card-edge p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-label font-semibold text-fg wrap-compound">{title}</h3>
          {sub && <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A card's text button beside its title ("Show all"); the tap area is a full 44px. */
export function CardAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onClick(); }}
      className="shrink-0 -my-3 -me-2 h-tap px-2 text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
    >
      {children}
    </button>
  );
}

/**
 * A pull-down beside a card's title: the choice in a small capsule, the
 * system's own picker on tap (a native select lies invisibly over it).
 */
export function MenuPicker<V extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <label className="relative shrink-0 -my-2.5 -me-1 h-tap flex items-center focus-within:ring-focus rounded-full">
      <span className="h-8 ps-3 pe-2 rounded-full bg-surface-2 inline-flex items-center gap-1 text-caption font-semibold text-accent tabular-nums whitespace-nowrap" aria-hidden="true">
        {options.find(o => o.value === value)?.label}
        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      <select
        aria-label={label}
        value={String(value)}
        onChange={e => { tapLight(); onChange(options.find(o => String(o.value) === e.target.value)!.value); }}
        className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer"
      >
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </label>
  );
}
