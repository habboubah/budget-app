import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { tapLight } from './haptics';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** The ⓧ inside the field. */
  clearLabel: string;
  /** The text button beside it while searching ("Abbrechen"). */
  cancelLabel: string;
}

/**
 * The iOS search field under a large title: a capsule with a magnifier, a ⓧ
 * once something is typed, and *Abbrechen* sliding in beside it while it is in
 * use, which empties it and puts the keyboard away. Esc clears, then leaves;
 * the keyboard's search key just puts the keyboard away — the list filters as
 * you type.
 */
export function SearchField({ value, onChange, placeholder, clearLabel, cancelLabel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const active = focused || value !== '';

  return (
    <div role="search" className="flex items-center">
      <div
        onClick={() => input.current?.focus()}
        className="min-w-0 flex-1 h-11 rounded-full bg-surface card-edge flex items-center gap-2 ps-3.5 pe-1.5 cursor-text"
      >
        <Search className="w-[18px] h-[18px] shrink-0 text-fg-mute" strokeWidth={2.4} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={ev => onChange(ev.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={ev => {
            if (ev.key === 'Escape') {
              ev.preventDefault();
              if (value) onChange('');
              else input.current?.blur();
            } else if (ev.key === 'Enter') {
              input.current?.blur();
            }
          }}
          className="min-w-0 flex-1 h-full appearance-none bg-transparent text-body text-fg placeholder:text-fg-faint outline-none"
        />
        {value && (
          <button
            type="button"
            aria-label={clearLabel}
            title={clearLabel}
            // Keep the keyboard up: clearing is for typing something else.
            onPointerDown={ev => ev.preventDefault()}
            onClick={() => { onChange(''); input.current?.focus(); }}
            className="hit-44 shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center active:opacity-60 focus-visible:ring-focus"
          >
            <span className="w-[18px] h-[18px] rounded-full bg-fg-mute text-surface inline-flex items-center justify-center" aria-hidden="true">
              <X className="w-3 h-3" strokeWidth={3.5} />
            </span>
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {active && (
          <motion.button
            type="button"
            // Pressing it must not blur the field first (that would hide it mid-tap).
            onPointerDown={ev => ev.preventDefault()}
            onClick={() => { tapLight(); onChange(''); input.current?.blur(); }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="shrink-0 h-11 overflow-hidden whitespace-nowrap text-body text-accent active:opacity-50 focus-visible:ring-focus rounded-sm"
          >
            <span className="ps-3 pe-1">{cancelLabel}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
