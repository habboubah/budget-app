import { tapLight } from './haptics';

/**
 * An iOS-style on/off switch. A real `role="switch"` for VoiceOver; the whole
 * 48px box is the touch target, the track inside it is drawn smaller.
 */
export function Switch({ checked, onChange, label, className = '' }: {
  checked: boolean;
  onChange: (on: boolean) => void;
  /** Required: names what is switched ("Familie in jedem neuen Monat"). */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => { tapLight(); onChange(!checked); }}
      className={`h-tap min-w-[56px] shrink-0 inline-flex items-center justify-center rounded-full focus-visible:ring-focus ${className}`}
    >
      <span className={`relative w-[46px] h-[28px] rounded-full transition-colors duration-200 ${checked ? 'bg-accent-fill' : 'bg-fg-faint/35'}`} aria-hidden="true">
        <span
          className={`absolute top-[3px] start-[3px] w-[22px] h-[22px] rounded-full bg-surface shadow-e1 transition-transform duration-200 ${
            checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0'}`}
        />
      </span>
    </button>
  );
}
