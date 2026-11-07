import { highlightRanges } from '../logic';

/**
 * A text with the words of a search marked — the way Spotlight shows why
 * something was found: an accent tint with full ink (even inside a grey note,
 * where grey on the tint would be too faint), no padding, so Arabic letters
 * stay joined.
 */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const ranges = query ? highlightRanges(text, query) : [];
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([start, end], i) => {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(<mark key={i} className="bg-mark text-fg rounded-[3px]">{text.slice(start, end)}</mark>);
    at = end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
