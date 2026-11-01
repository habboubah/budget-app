import React from 'react';
import { tapLight } from './haptics';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ink';
type Size = 'md' | 'lg';

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ className?: string }>;
  full?: boolean;
  className?: string;
}

// A minimum height plus padding, not a fixed height: the 48px floor is the
// touch target, the padding lets a long German label (or 200% text) grow the
// button instead of being clipped by it.
const sizes: Record<Size, string> = {
  md: 'min-h-control py-2 px-5 text-body',
  lg: 'min-h-chrome py-3 px-6 text-heading',
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent-fill text-accent-fill-ink shadow-e1',
  secondary: 'bg-surface-2 text-fg',
  danger: 'bg-neg-dim text-neg',
  ghost: 'bg-transparent text-accent active:bg-accent-dim',
  /** The ink-black call to action: sits beside the petrol one without competing. */
  ink: 'bg-fg text-bg shadow-e1',
};

export function Button({
  variant = 'primary', size = 'md', icon: Icon, full = false, disabled, children, onClick, className = '', ...rest
}: Props) {
  return (
    <button
      // Before the spread so an explicit type="submit" still wins; without a
      // type, a <button> in a <form> silently submits it.
      type="button"
      {...rest}
      disabled={disabled}
      // Don't steal focus from an open input: tapping Save would otherwise
      // start closing the keyboard before the click even runs.
      onMouseDown={e => e.preventDefault()}
      onClick={e => { if (!disabled) { tapLight(); onClick?.(e); } }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md display font-bold',
        'transition-[transform,opacity] duration-100 select-none active:scale-[0.97] focus-visible:ring-focus',
        sizes[size],
        disabled ? 'bg-surface-2 text-fg-faint cursor-not-allowed active:scale-100' : variants[variant],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Required: an unlabelled icon button is invisible to VoiceOver. */
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: 'default' | 'accent' | 'danger' | 'filled';
  className?: string;
}

export function IconButton({ label, icon: Icon, tone = 'default', onClick, className = '', ...rest }: IconButtonProps) {
  const tones = {
    default: 'text-fg-mute active:bg-surface-2',
    accent: 'text-accent active:bg-accent-dim',
    danger: 'text-neg active:bg-neg-dim',
    filled: 'bg-surface text-fg card-edge !rounded-sm active:bg-surface-2',
  };
  return (
    <button
      {...rest}
      type="button"
      title={label}
      aria-label={label}
      onClick={e => { tapLight(); onClick?.(e); }}
      className={[
        'h-tap w-tap shrink-0 inline-flex items-center justify-center rounded-full',
        'transition-transform duration-100 active:scale-[0.92] focus-visible:ring-focus',
        tones[tone], className,
      ].join(' ')}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={2.1} />
    </button>
  );
}
