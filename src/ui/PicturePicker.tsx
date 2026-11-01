import { Check } from 'lucide-react';
import { HUES, Hue } from '../types';
import { tapLight } from './haptics';

/** Keep only the last emoji typed (iOS emoji keyboard, or a paste). */
function lastGrapheme(s: string): string {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    const parts = [...new Seg(undefined, { granularity: 'grapheme' }).segment(s.trim())].map(p => p.segment);
    return parts[parts.length - 1] ?? '';
  }
  return [...s.trim()].slice(-1).join('');
}

/** A grid of emoji for a category, plus any emoji from the keyboard (from shopping-list's picker, without photos). */
export function EmojiPicker({ value, emojis, onChange, label }: {
  value: string;
  emojis: string[];
  onChange: (emoji: string) => void;
  label: string;
}) {
  // Make sure the current emoji is pickable even if it isn't in the preset grid.
  const grid = value && !emojis.includes(value) ? [value, ...emojis] : emojis;
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1">
      {grid.map(e => {
        const on = value === e;
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={e}
            onClick={() => { tapLight(); onChange(e); }}
            className={`h-11 rounded-sm inline-flex items-center justify-center transition-colors focus-visible:ring-focus ${
              on ? 'bg-accent-dim ring-2 ring-accent' : 'active:bg-surface-2'}`}
          >
            <span className="emoji text-[24px]">{e}</span>
          </button>
        );
      })}
      <input
        aria-label="Emoji"
        inputMode="text"
        placeholder="＋"
        value=""
        onChange={e => { const g = lastGrapheme(e.target.value); if (g) onChange(g); }}
        className="h-11 w-full rounded-sm bg-surface-2 text-center text-[22px] placeholder:text-fg-faint outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}

/** Colour swatches for a category. */
export function HuePicker({ value, onChange, label }: { value: Hue; onChange: (h: Hue) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {HUES.map(h => {
        const on = h === value;
        return (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={h}
            data-hue={h}
            onClick={() => { tapLight(); onChange(h); }}
            className={`w-11 h-11 rounded-full bg-hue-bg text-hue-ink inline-flex items-center justify-center border-2 transition-transform active:scale-90 focus-visible:ring-focus ${
              on ? 'border-current' : 'border-transparent'}`}
          >
            {on && <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
