import { CSSProperties, ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { Category, MonthKey } from '../types';
import { MonthPoint, BudgetSplit, RulePart } from '../insights';
import { displayName, formatMoney, formatPercent, monthKeyOf, monthLabel, parseMonthKey } from '../logic';
import { Strings, fmt } from '../translations';
import { useWidth } from '../ui/useWidth';
import { tapLight } from '../ui/haptics';

/*
 * The statistics charts, hand-drawn in SVG and following the dataviz skill:
 * thin marks (columns ≤ 12px here, a 4px rounded end, square on the
 * baseline; a 2px line), a 2px surface gap between touching columns, a
 * hairline solid grid, one y-axis, text in text tokens — never a series
 * colour — a legend for two or more series and none for one, and a tooltip on
 * hover, tap and keyboard focus that never gates a value: the table under the
 * charts has every number.
 *
 * With many months a plot scrolls sideways under a fixed y-axis and opens on
 * the newest month.
 */

const PLOT_H = 150;
const AXIS_H = 34;
const AXIS_W = 40;
const PAD_T = 10;
const H = PAD_T + PLOT_H + AXIS_H;

/** Clean ticks spanning [lo, hi]: steps of 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceTicks(lo: number, hi: number, count = 3): number[] {
  if (hi === lo) { hi = lo + 1; }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.999; v += step) out.push(Math.round(v));
  return out;
}

/** Euro cents → a short axis label in the reader's own way of writing it:
 *  "4.000", "1,5 Mio." in German, "4k" in English, "4 آلاف" in Arabic. */
export function compact(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100).replace('-', '−');
}

/** A column with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  if (h <= 0.5) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

/** A column hanging down from the zero line to `bottom` (a negative value), rounded at its foot. */
function columnPathDown(x: number, w: number, bottom: number, base: number): string {
  const h = bottom - base;
  if (h <= 0.5) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${bottom - r}Q${x},${bottom} ${x + r},${bottom}H${x + w - r}Q${x + w},${bottom} ${x + w},${bottom - r}V${base}Z`;
}

function axisMonth(key: MonthKey, locale: string, wide: boolean): string {
  const { year, month } = parseMonthKey(key);
  return new Intl.DateTimeFormat(locale, { month: wide ? 'short' : 'narrow' }).format(new Date(year, month - 1, 1));
}

/* ----------------------------------------------------------------- frame */

interface FrameProps {
  months: MonthKey[];
  /** Narrowest a month's slot may get before the plot scrolls. */
  minSlot: number;
  ticks: number[];
  y: (v: number) => number;
  selected: MonthKey;
  t: Strings;
  /** Hit-target label per month (VoiceOver reads the values from it). */
  label: (i: number) => string;
  onPick: (key: MonthKey) => void;
  /** The marks, given each slot's centre and width. */
  marks: (cx: (i: number) => number, slot: number, active: number | null) => ReactNode;
  tooltip: (i: number) => ReactNode;
  /** A zero line inside the plot (a balance below zero). */
  zero?: boolean;
  /** The y-axis labels; money in short form unless given ("20 %"). */
  tickLabel?: (v: number) => string;
}

/**
 * Shared chart frame: the y-axis stays put on the left, the plot scrolls when
 * the months don't fit, every month's whole slot is the hit target, and the
 * tooltip stays inside the visible part.
 */
function ChartFrame({ months, minSlot, ticks, y, selected, t, label, onPick, marks, tooltip, zero, tickLabel }: FrameProps) {
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [active, setActive] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  // The axis is as wide as its longest label ("27.500" in German, "20 ألف" in
  // Arabic, larger with Dynamic Type) — measured, so nothing is cut off.
  const labels = ticks.map(v => (tickLabel ? tickLabel(v) : compact(v, t.locale)));
  const axisRef = useRef<SVGSVGElement>(null);
  const [axisW, setAxisW] = useState(AXIS_W);
  useLayoutEffect(() => {
    const texts = axisRef.current ? [...axisRef.current.querySelectorAll('text')] : [];
    const longest = Math.max(0, ...texts.map(el => el.getComputedTextLength()));
    if (longest) setAxisW(Math.max(28, Math.ceil(longest) + 10));
  }, [labels.join('|')]);
  const visible = Math.max(80, width - axisW);
  const plotW = Math.max(visible, months.length * minSlot);
  const slot = plotW / Math.max(1, months.length);
  const cx = (i: number) => slot * i + slot / 2;
  const wide = slot >= 34;

  // Open on the newest month.
  useLayoutEffect(() => {
    const s = scroller.current;
    if (s) { s.scrollLeft = s.scrollWidth; setScrollLeft(s.scrollLeft); }
  }, [months.length, plotW]);

  const tipW = 196;
  const tipLeft = active === null ? 0
    : Math.max(scrollLeft, Math.min(cx(active) - tipW / 2, scrollLeft + visible - tipW));

  return (
    <div ref={box} dir="ltr" className="relative flex" onPointerLeave={() => setActive(null)}>
      <svg ref={axisRef} width={axisW} height={H} className="shrink-0" aria-hidden="true">
        {ticks.map((v, i) => (
          <text key={v} x={axisW - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-mute text-micro num">{labels[i]}</text>
        ))}
      </svg>
      {/* Older months hide to the left: a fade says there is more. */}
      {scrollLeft > 4 && (
        <div className="pointer-events-none absolute z-[5] top-0 w-8 bg-gradient-to-r from-surface to-transparent" style={{ left: axisW, height: H }} aria-hidden="true" />
      )}
      <div
        ref={scroller}
        className="relative flex-1 min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar"
        onScroll={e => setScrollLeft(e.currentTarget.scrollLeft)}
      >
        <div className="relative" style={{ width: plotW, height: H }}>
          <svg width={plotW} height={H} className="block" aria-hidden="true">
            {ticks.map(v => <line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)} className="stroke-hairline" strokeWidth={1} />)}
            {zero && <line x1={0} x2={plotW} y1={y(0)} y2={y(0)} className="stroke-fg-faint" strokeWidth={1} />}
            {active !== null && <line x1={cx(active)} x2={cx(active)} y1={PAD_T} y2={PAD_T + PLOT_H} className="stroke-hairline" strokeWidth={slot} opacity={0.5} />}
            {marks(cx, slot, active)}
            {months.map((m, i) => {
              const on = m === selected;
              const january = m.endsWith('-01') || i === 0;
              return (
                <g key={m}>
                  <text x={cx(i)} y={PAD_T + PLOT_H + 15} textAnchor="middle" className={`text-micro ${on ? 'fill-fg font-bold' : 'fill-fg-mute'}`}>
                    {axisMonth(m, t.locale, wide)}
                  </text>
                  {january && (
                    <text x={cx(i)} y={PAD_T + PLOT_H + 29} textAnchor="middle" className="text-micro fill-fg-mute num">{m.slice(0, 4)}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {/* Hit targets: the whole slot of a month, bigger than any mark. */}
          <div className="absolute inset-0 flex">
            {months.map((m, i) => (
              <button
                key={m}
                type="button"
                className="h-full shrink-0 rounded-sm focus-visible:ring-focus"
                style={{ width: slot }}
                aria-label={label(i)}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => { tapLight(); setActive(i); onPick(m); }}
              />
            ))}
          </div>
          {active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 rounded-sm bg-raised card-edge shadow-e2 px-3 py-2 whitespace-nowrap"
              style={{ left: tipLeft, width: tipW }}
            >
              <p className="text-caption font-semibold text-fg-mute">{monthLabel(months[active], t.locale)}</p>
              {tooltip(active)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TipRow({ swatch, swatchStyle, value, label }: { swatch?: string; swatchStyle?: CSSProperties; value: string; label: string }) {
  return (
    <p className="flex items-center gap-2 mt-1">
      <span className={`w-3 h-0.5 rounded-full shrink-0 ${swatch ?? ''}`} style={swatchStyle} aria-hidden="true" />
      <span className="text-label font-bold text-fg num">{value}</span>
      <span className="text-caption text-fg-mute truncate">{label}</span>
    </p>
  );
}

/** Which series are switched off in a chart's legend, and a toggle for one. */
function useHidden(): [string[], (key: string) => void] {
  const [hidden, setHidden] = useState<string[]>([]);
  return [hidden, key => setHidden(h => (h.includes(key) ? h.filter(x => x !== key) : [...h, key]))];
}

/**
 * The legend is also the filter: one aria-pressed chip per series, its
 * swatch the series colour (or the category's, under `hue`); a tap hides or
 * shows it and the axis rescales to what is left.
 */
export function LegendToggles({ items, hidden, onToggle, label }: {
  items: { key: string; label: string; className: string; hue?: string }[];
  hidden: string[];
  onToggle: (key: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={label}>
      {items.map(i => {
        const on = !hidden.includes(i.key);
        return (
          <button
            key={i.key}
            type="button"
            aria-pressed={on}
            data-hue={i.hue}
            onClick={() => { tapLight(); onToggle(i.key); }}
            className={`hit-44 min-h-[36px] ps-2.5 pe-3 rounded-full inline-flex items-center gap-1.5 text-caption font-semibold border transition-colors focus-visible:ring-focus ${
              on ? 'bg-surface text-fg border-hairline' : 'bg-transparent text-fg-mute border-dashed border-hairline'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${on ? i.className : 'border border-fg-faint'}`} aria-hidden="true" />
            {i.label}
          </button>
        );
      })}
    </div>
  );
}

interface SeriesProps {
  points: MonthPoint[];
  selected: MonthKey;
  t: Strings;
  onPick: (key: MonthKey) => void;
}

/* ------------------------------------------------- income vs expenses */

/** A plain column segment, square at both ends (the paid part under an open one). */
function rectPath(x: number, w: number, top: number, base: number): string {
  return base - top <= 0.5 ? '' : `M${x},${base}V${top}H${x + w}V${base}Z`;
}

/** What a month kept, in whole units with its sign ("+1.283", "−320"): the label over a month's columns. */
export function savedLabel(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: 'exceptZero' })
    .format(Math.round(cents / 100)).replace('-', '−');
}

/**
 * Income and expenses side by side, month by month, and above each pair what
 * was left — written, not drawn, so amber keeps meaning "open" — or how much
 * more went out, in red. The part of a column still open or expected is
 * hatched: the running month's salary before it comes in, a bill not paid
 * yet; the running month's label is an estimate ("≈"). Either series can be
 * switched off in the legend.
 */
export function IncomeExpenseChart({ points, selected, t, onPick }: SeriesProps) {
  const [hidden, toggle] = useHidden();
  const hatch = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const on = (k: string) => !hidden.includes(k);
  const both = on('in') && on('out');
  const hi = Math.max(1, ...points.flatMap(p => [on('in') ? p.income : 0, on('out') ? p.expense : 0]));
  const ticks = niceTicks(0, hi);
  const top = ticks[ticks.length - 1];
  // Room above the top grid line for the label over the tallest column.
  const room = both ? 14 : 0;
  const y = (v: number) => PAD_T + room + (PLOT_H - room) * (1 - v / top);
  const base = y(0);
  const money = (c: number) => formatMoney(c, t.locale);
  const now = monthKeyOf();
  const kinds = (['in', 'out'] as const).filter(on);
  const k = Math.max(1, kinds.length);
  const series = {
    in: { total: (p: MonthPoint) => p.income, open: (p: MonthPoint) => p.incomeOpen ?? 0, fill: 'fill-chart-in', swatch: 'bg-chart-in', label: t.income },
    out: { total: (p: MonthPoint) => p.expense, open: (p: MonthPoint) => p.expenseOpen ?? 0, fill: 'fill-chart-out', swatch: 'bg-chart-out', label: t.expenses },
  } as const;
  const anyOpen = points.some(p => kinds.some(kind => series[kind].open(p) > 0));
  const parts = (p: MonthPoint) => [
    ...kinds.map(kind => `${series[kind].label} ${money(series[kind].total(p))}`),
    both && `${p.saved < 0 ? t.overspent : t.saved} ${money(Math.abs(p.saved))}`,
  ].filter(Boolean).join(', ');
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={[
        { key: 'in', label: t.chartLegendIncome, className: 'bg-chart-in' },
        { key: 'out', label: t.chartLegendExpenses, className: 'bg-chart-out' },
      ]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={30} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(points[i].key, t.locale)}: ${parts(points[i])}`}
        marks={(cx, slot, active) => {
          const w = Math.max(4, Math.min(12, (slot - 12) / 2));
          // Written over the columns only where a month has room for it; the tooltip and table have them always.
          const labelled = both && slot >= 40;
          return (
            <>
              <defs>
                {kinds.map(kind => (
                  <pattern key={kind} id={`${hatch}-${kind}`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width={5} height={5} className={series[kind].fill} opacity={0.32} />
                    <rect width={2.2} height={5} className={series[kind].fill} />
                  </pattern>
                ))}
              </defs>
              {points.map((p, i) => {
                const x0 = cx(i) - (k * w + (k - 1) * 2) / 2;
                const running = p.key === now;
                return (
                  <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
                    {kinds.map((kind, j) => {
                      const s = series[kind];
                      const total = s.total(p);
                      const open = Math.min(total, s.open(p));
                      const paid = total - open;
                      const x = x0 + j * (w + 2);
                      return (
                        <g key={kind}>
                          {paid > 0 && <path d={open > 0 ? rectPath(x, w, y(paid), base) : columnPath(x, w, y(paid), base)} className={s.fill} />}
                          {open > 0 && <path d={columnPath(x, w, y(total), y(paid))} fill={`url(#${hatch}-${kind})`} />}
                        </g>
                      );
                    })}
                    {labelled && (p.income || p.expense) ? (
                      <text
                        x={cx(i)} y={y(Math.max(p.income, p.expense)) - 6} textAnchor="middle"
                        className={`text-micro font-bold num ${running ? 'fill-fg-mute' : p.saved < 0 ? 'fill-neg' : 'fill-fg'}`}
                      >
                        {/* The running month is an estimate: muted, and "≈" where there is room for it. */}
                        {`${running && slot >= 56 ? '≈ ' : ''}${savedLabel(p.saved, t.locale)}`}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </>
          );
        }}
        tooltip={i => {
          const p = points[i];
          return (
            <>
              {kinds.map(kind => {
                const s = series[kind];
                const open = s.open(p);
                return (
                  <div key={kind}>
                    <TipRow swatch={s.swatch} value={money(s.total(p))} label={s.label} />
                    {open > 0 && <p className="ps-5 text-caption text-fg-mute tabular-nums">{fmt(t.inclOpen, { amount: money(open) })}</p>}
                  </div>
                );
              })}
              {both && <TipRow value={money(Math.abs(p.saved))} label={p.saved < 0 ? t.overspent : t.saved} />}
            </>
          );
        }}
      />
      {anyOpen && <p className="text-caption text-fg-mute mt-1 wrap-prose">{t.hatchNote}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ balance */

/**
 * The balance at each month's end, as one line with a light wash beneath it,
 * like income and expenses over time. Not from zero (a balance chart is about
 * the change), so the wash runs down to the bottom of the plot — or to the
 * zero line when the balance dips below it, the part underneath in red.
 */
export function BalanceChart({ points, selected, t, onPick }: SeriesProps) {
  const clip = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const values = points.map(p => p.end);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Padded so a flat line still sits mid-plot instead of on an edge.
  const pad = Math.max((hi - lo) * 0.15, 5000);
  const ticks = niceTicks(lo - pad, hi + pad);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const base = Math.min(PAD_T + PLOT_H, Math.max(PAD_T, y(0)));
  const last = points.length - 1;
  const money = (c: number) => formatMoney(c, t.locale);
  // The running month's end is a projection (open entries still to come):
  // its stretch of the line is dashed and its point hollow.
  const running = points.findIndex(p => p.key === monthKeyOf());
  const projected = (i: number) => i === running;
  return (
    <ChartFrame
      months={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
      zero={yLo < 0 && yHi > 0}
      label={i => `${monthLabel(points[i].key, t.locale)}: ${t.balanceOverTime} ${money(points[i].end)}`}
      marks={(cx, _slot, active) => {
        const path = (from: number, to: number) => points.slice(from, to + 1)
          .map((p, j) => `${j ? 'L' : 'M'}${cx(from + j).toFixed(1)},${y(p.end).toFixed(1)}`).join('');
        const line = path(0, last);
        const solid = running > 0 ? path(0, running - 1) : running === 0 ? '' : line;
        const dashed = running > 0 ? path(running - 1, running) : '';
        const area = `${line}L${cx(last).toFixed(1)},${base.toFixed(1)}L${cx(0).toFixed(1)},${base.toFixed(1)}Z`;
        const stroke = (d: string, className: string, side: 'up' | 'down', dash?: string) => d && (
          <path d={d} fill="none" className={className} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={dash} clipPath={`url(#${clip}-${side})`} />
        );
        return (
          <>
            <defs>
              <clipPath id={`${clip}-up`}><rect x={0} y={0} width="100%" height={base} /></clipPath>
              <clipPath id={`${clip}-down`}><rect x={0} y={base} width="100%" height={H - base} /></clipPath>
            </defs>
            <path d={area} className="fill-chart-line" opacity={0.13} clipPath={`url(#${clip}-up)`} />
            <path d={area} className="fill-neg" opacity={0.14} clipPath={`url(#${clip}-down)`} />
            {stroke(solid, 'stroke-chart-line', 'up')}
            {stroke(solid, 'stroke-neg', 'down')}
            {stroke(dashed, 'stroke-chart-line', 'up', '4 4')}
            {stroke(dashed, 'stroke-neg', 'down', '4 4')}
            {[...new Set([last, active ?? last])].map(i => (
              <circle
                key={i} cx={cx(i)} cy={y(points[i].end)} r={4.5} strokeWidth={projected(i) ? 2.5 : 2}
                className={projected(i)
                  ? `fill-surface ${points[i].end < 0 ? 'stroke-neg' : 'stroke-chart-line'}`
                  : `${points[i].end < 0 ? 'fill-neg' : 'fill-chart-line'} stroke-surface`}
              />
            ))}
            {active === null && (
              // The newest value, labelled directly — the one the reader came for.
              <text x={cx(last) - 8} y={y(points[last].end) - 11} textAnchor="end" className="fill-fg text-caption font-bold num">
                {money(points[last].end)}
              </text>
            )}
          </>
        );
      }}
      tooltip={i => <TipRow swatch={points[i].end < 0 ? 'bg-neg' : 'bg-chart-line'} value={money(points[i].end)} label={t.balanceEnd} />}
    />
  );
}

/* ------------------------------------------------- one category's trend */

/**
 * One category's total per month as columns in its own colour — opened under
 * its row in "Wofür das Geld geht", one series instead of every category at
 * once.
 */
export function CategoryTrendChart({ category, values, months, selected, language, t, onPick }: {
  category: Category;
  /** month → total of the category */
  values: Map<MonthKey, number>;
  months: MonthKey[];
  selected: MonthKey;
  language: string;
  t: Strings;
  onPick: (key: MonthKey) => void;
}) {
  const value = (m: MonthKey) => values.get(m) ?? 0;
  const ticks = niceTicks(0, Math.max(1, ...months.map(value)));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = PAD_T + PLOT_H;
  const money = (c: number) => formatMoney(c, t.locale);
  const name = displayName(category.names, language);
  return (
    <div data-hue={category.hue}>
      <ChartFrame
        months={months} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(months[i], t.locale)}: ${name} ${money(value(months[i]))}`}
        marks={(cx, slot, active) => months.map((m, i) => {
          const w = Math.max(4, Math.min(12, slot * 0.4));
          return (
            <path key={m} d={columnPath(cx(i) - w / 2, w, y(value(m)), base)} className="fill-hue-chart"
              opacity={active === null || active === i ? 1 : 0.45} />
          );
        })}
        tooltip={i => <TipRow swatch="bg-hue-chart" value={money(value(months[i]))} label={name} />}
      />
    </div>
  );
}

/* ------------------------------------------------------------- figures */

/**
 * Average per month and category as ranked bars, the value at the tip. With
 * `onSelect` every row is a button that opens `detail` under it (one at a
 * time, `selected`).
 */
export function AverageBars({ items, language, t, selected, onSelect, detail }: {
  items: { category: Category; average: number }[];
  language: string;
  t: Strings;
  selected?: string | null;
  onSelect?: (categoryId: string) => void;
  detail?: (category: Category) => ReactNode;
}) {
  const max = Math.max(1, ...items.map(i => i.average));
  return (
    <ul className="space-y-3">
      {items.map(({ category: c, average }, i) => {
        const name = displayName(c.names, language);
        // Income comes first; a hairline where the expenses begin.
        const firstExpense = c.kind === 'expense' && items[i - 1]?.category.kind === 'income';
        const open = selected === c.id;
        const row = (
          <>
            <div className="flex items-baseline gap-2">
              <span className="emoji text-[15px]" aria-hidden="true">{c.emoji}</span>
              <span className="min-w-0 flex-1 text-label text-fg wrap-compound text-start">{name}</span>
              <span className={`text-label font-semibold num ${c.kind === 'income' ? 'text-pos' : 'text-fg'}`}>{formatMoney(average, t.locale)}</span>
            </div>
            <div className="mt-1.5 h-3 rounded-e-[4px] bg-hue-chart" style={{ width: `${Math.max(1, (average / max) * 100)}%` }} aria-hidden="true" />
          </>
        );
        return (
          <li key={c.id} data-hue={c.hue} className={firstExpense ? 'pt-3 hairline-t' : ''}>
            {onSelect ? (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => { tapLight(); onSelect(c.id); }}
                className="block w-full min-h-control -my-1 py-1 rounded-sm text-start focus-visible:ring-focus active:opacity-70"
              >
                {row}
              </button>
            ) : row}
            {open && detail && <div className="mt-3">{detail(c)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The 50/30/20 check as one tall segmented bar — needs, wants, saved, as a
 * share of income — each block labelled with its share, plus the targets.
 */
/** The three parts of 50/30/20: their order, colours and names. */
export const BUCKET_STYLE = {
  need: { className: 'bg-chart-out', label: (t: Strings) => t.budgetNeed },
  want: { className: 'bg-chart-want', label: (t: Strings) => t.budgetWant },
  // Green, as in this card before: amber (chart-save) sits too close to the wants' rust.
  save: { className: 'bg-chart-in', label: (t: Strings) => t.saved },
} as const;

/**
 * Where the average month's income went, as one bar: needs, wants and what
 * was left (saved), each as wide as its share. When more went out than came
 * in, the bar is measured on what went out.
 */
export function BudgetSplitBar({ split, t }: { split: BudgetSplit; t: Strings }) {
  const parts = [
    { key: 'need', value: split.needs },
    { key: 'want', value: split.wants },
    { key: 'save', value: Math.max(0, split.saved) },
  ] as const;
  const total = Math.max(1, split.income, split.needs + split.wants);
  const pct = (v: number) => (split.income > 0 ? Math.round((v / split.income) * 100) : 0);
  return (
    <div
      className="flex gap-[2px] h-3 rounded-full overflow-hidden" role="img"
      aria-label={parts.map(p => `${BUCKET_STYLE[p.key].label(t)} ${pct(p.value)} %`).join(', ')}
    >
      {parts.filter(p => p.value > 0).map(p => (
        <div key={p.key} className={`${BUCKET_STYLE[p.key].className} h-full rounded-full`} style={{ width: `${(p.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

/**
 * One part of 50/30/20 against its target: its share of income as a bar on
 * a 0–100 % track with the target marked, so over (needs, wants) or short
 * (saving) shows at a glance.
 */
export function RuleBar({ part }: { part: RulePart }) {
  const share = Math.max(0, Math.min(100, part.share ?? 0));
  return (
    <div className="relative mt-2 h-2 rounded-full bg-surface-2" aria-hidden="true">
      <div className={`absolute inset-y-0 start-0 rounded-full ${BUCKET_STYLE[part.bucket].className}`} style={{ width: `${share}%` }} />
      <div className="absolute -top-1 -bottom-1 w-[2px] rounded-full bg-fg" style={{ insetInlineStart: `calc(${part.target}% - 1px)` }} />
    </div>
  );
}

/* --------------------------------------------------------- savings rate */

/**
 * The share of income each month kept, as columns — above zero saved, below
 * overspent (red) — against the 20 % of the 50/30/20 rule as a dashed line.
 * Months without income have no rate and no column.
 */
export function SavingsRateChart({ points, selected, t, onPick, target = 20 }: SeriesProps & { target?: number }) {
  const [hidden, toggle] = useHidden();
  const up = !hidden.includes('rate');
  const down = !hidden.includes('over');
  const goal = !hidden.includes('target');
  // Clamped: a month with little income can reach −300 %, which would flatten the rest.
  const rates = points.map(p => (p.rate === null ? null : Math.max(-100, Math.min(100, p.rate * 100))));
  const visible = (r: number | null): r is number => r !== null && (r < 0 ? down : up);
  const known = rates.filter(visible);
  const anyOver = rates.some(r => r !== null && r < 0);
  const ticks = niceTicks(Math.min(0, ...known), Math.max(goal ? target + 5 : 1, ...known));
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const base = y(0);
  const money = (c: number) => formatMoney(c, t.locale);
  const percent = (v: number) => formatPercent(v, t.locale);
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={[
        { key: 'rate', label: t.savingsRateTitle, className: 'bg-chart-save' },
        ...(anyOver ? [{ key: 'over', label: t.overspent, className: 'bg-neg' }] : []),
        { key: 'target', label: fmt(t.targetPct, { p: target }), className: '!h-0 !rounded-none border-t-2 border-dashed border-fg-mute' },
      ]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={26} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        zero={yLo < 0}
        // Tight on the narrow axis: "−100%" without the space.
        tickLabel={v => percent(v).replace(/\s/g, '')}
        label={i => `${monthLabel(points[i].key, t.locale)}${visible(rates[i]) ? `: ${percent(rates[i]!)}, ${
          points[i].saved < 0 ? t.overspent : t.saved} ${money(Math.abs(points[i].saved))}` : ''}`}
        marks={(cx, slot, active) => {
          const w = Math.max(4, Math.min(12, slot * 0.4));
          const end = cx(points.length - 1) + slot / 2;
          return (
            <>
              {points.map((p, i) => {
                const r = rates[i];
                if (!visible(r)) return null;
                return (
                  <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
                    {r >= 0
                      ? <path d={columnPath(cx(i) - w / 2, w, y(r), base)} className="fill-chart-save" />
                      : <path d={columnPathDown(cx(i) - w / 2, w, y(r), base)} className="fill-neg" />}
                  </g>
                );
              })}
              {goal && <line x1={0} x2={end} y1={y(target)} y2={y(target)} className="stroke-fg-mute" strokeWidth={1.5} strokeDasharray="5 4" />}
            </>
          );
        }}
        tooltip={i => (!visible(rates[i]) ? null : (
          <>
            <TipRow swatch={rates[i]! < 0 ? 'bg-neg' : 'bg-chart-save'} value={percent(rates[i]!)} label={t.savingsRateTitle} />
            <TipRow value={money(Math.abs(points[i].saved))} label={points[i].saved < 0 ? t.overspent : t.saved} />
          </>
        ))}
      />
    </div>
  );
}
