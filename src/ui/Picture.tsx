import { Hue } from '../types';

type Size = 'xs' | 'sm' | 'md' | 'lg';

// Box in px (physical, like a touch target), glyph in px so an emoji never
// outgrows its tile when the user enlarges text.
const box: Record<Size, string> = {
  xs: 'w-8 h-8 rounded-full',
  sm: 'w-9 h-9 rounded-[10px]',
  md: 'w-11 h-11 rounded-sm',
  lg: 'w-[60px] h-[60px] rounded-md',
};
const glyph: Record<Size, string> = {
  xs: 'text-[17px]',
  sm: 'text-[20px]',
  md: 'text-[24px]',
  lg: 'text-[34px]',
};
const initialSize: Record<Size, string> = {
  xs: 'text-[13px]',
  sm: 'text-[15px]',
  md: 'text-[18px]',
  lg: 'text-[26px]',
};

/**
 * A category's picture: its emoji on a tile of its colour, else the name's
 * first letter — so every section has something the eye finds before it reads.
 *
 * Decorative: the name always sits next to it, so it is hidden from VoiceOver.
 */
export function Picture({ emoji, name, size = 'md', hue, className = '' }: {
  emoji?: string;
  name: string;
  size?: Size;
  /** Paint the tile in this hue; otherwise it inherits from the nearest `data-hue`. */
  hue?: Hue;
  className?: string;
}) {
  const shell = `${box[size]} shrink-0 inline-flex items-center justify-center overflow-hidden select-none bg-hue-bg ${className}`;
  if (emoji) {
    return (
      <span data-hue={hue} className={shell} aria-hidden="true">
        <span className={`emoji ${glyph[size]}`}>{emoji}</span>
      </span>
    );
  }
  const letter = [...name.trim()][0]?.toLocaleUpperCase() ?? '?';
  return (
    <span data-hue={hue} className={`${shell} text-hue-ink display font-bold ${initialSize[size]}`} aria-hidden="true">
      {letter}
    </span>
  );
}
