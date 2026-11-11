/**
 * A row of small figures under a chart — a label and a number each, on the
 * card's own fill. They sit side by side and wrap under each other when
 * large text no longer fits them abreast; the amounts line up at the bottom
 * even where a label wraps. Red only for an amount below zero.
 */
export function StatTiles({ items, className = '' }: {
  items: { label: string; value: string; tone?: 'neg' }[];
  className?: string;
}) {
  return (
    <dl className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(i => (
        <div key={i.label} className="flex-1 basis-[6rem] min-w-0 flex flex-col justify-between rounded-sm bg-surface-2 px-3 py-2.5">
          <dt className="text-caption text-fg-mute wrap-compound tabular-nums">{i.label}</dt>
          <dd className={`mt-0.5 rounded-num text-label font-semibold whitespace-nowrap ${i.tone === 'neg' ? 'text-neg' : 'text-fg'}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
