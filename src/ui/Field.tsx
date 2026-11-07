import React, { useEffect, useId, useRef } from 'react';
import { tapLight } from './haptics';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className' | 'value'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Hide the visible label (it still names the input for VoiceOver). */
  hideLabel?: boolean;
  trailing?: React.ReactNode;
  /** The input itself, for focusing it from outside. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/** A labelled text input. Focus on mount uses preventScroll — the DOM
 *  `autofocus` attribute inside a sheet scrolls the page behind it. */
export function Field({ label, value, onChange, hideLabel, trailing, autoFocus, inputRef, ...rest }: FieldProps) {
  const id = useId();
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'block eyebrow text-fg-mute mb-1.5 px-1'}>{label}</label>
      <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg placeholder:text-fg-faint outline-none"
          {...rest}
        />
        {trailing}
      </div>
    </div>
  );
}

/** iOS segmented control: a capsule track with a sliding capsule thumb. */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex bg-surface-2 rounded-full p-1 gap-1">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { tapLight(); onChange(o.value); }}
            className={`flex-1 min-h-[38px] px-2 rounded-full text-label transition-colors focus-visible:ring-focus wrap-compound ${
              on ? 'bg-raised text-fg font-semibold shadow-e1' : 'text-fg font-medium active:bg-raised/60'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A small caption above a group of controls inside a sheet. */
export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block eyebrow text-fg-mute mb-1.5 px-1">{children}</label>;
}
