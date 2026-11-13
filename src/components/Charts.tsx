import { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Category, Hue, MonthKey } from '../types';
import { MonthPoint, BudgetSplit, MonthDays, Outlook, OutlookItem, Pace, RulePart, Runway, WeekdayPattern, firstWeekday, heatLevel } from '../insights';
import {
  MASK, areAmountsHidden, compactMoney, dayLabel, displayName, formatMoney, formatMoneyApprox, formatMoneyEstimate, formatMoneyShort, formatPercent, monthKeyOf, monthLabel, parseMonthKey,
  dateAt, isoDay, spoken,
} from '../logic';
import { Strings, fmt } from '../translations';
import { useWidth } from '../ui/useWidth';
import { tapLight } from '../ui/haptics';

/*
 * The statistics charts, hand-drawn in SVG and following the dataviz skill:
 * slim marks (columns ≤ 16px here with a round data end, square on the
 * baseline; a 2.5px line, smoothed without ever overshooting a value), a
 * surface gap between touching columns, a dotted hairline grid on a solid
 * baseline, one y-axis, text in text tokens — never a series
 * colour — a legend for two or more series and none for one, and a tooltip on
 * hover, tap and keyboard focus that never gates a value: the table under the
 * charts has every number.
 *
 * With many months a plot scrolls sideways under a fixed y-axis and opens on
 * the newest month.
 *
 * Charts come in moving: columns grow from the baseline one after another
 * (`chart-grow`), a line is drawn from the left (`reveal`: the marks' clip
 * runs across the plot, the grid stays), the newest point pulses twice.
 * Once, when they appear — and not at all under reduced motion.
 *
 * And they answer the finger: where the plot doesn't scroll, a touch drags
 * across the slots — a tick for each — and the tooltip and the band behind
 * the marks slide along instead of jumping.
 */

/** How a column grows from the baseline at `base` (px in the plot), the i-th a little later. */
function grow(base: number, i: number): { className: string; style: CSSProperties } {
  return { className: 'chart-grow', style: { transformOrigin: `0px ${base}px`, animationDelay: `${Math.min(i * 28, 420)}ms` } };
}

/**
 * A smooth line through the points that never overshoots one (monotone cubic,
 * Fritsch–Carlson): between two months it stays between their values, so the
 * curve claims nothing the numbers don't. The tangents come from the whole
 * series, so a stretch of it (`from`…`to`) joins the next one without a kink.
 */
export function smoothPath(pts: { x: number; y: number }[], from = 0, to = pts.length - 1): string {
  const n = pts.length;
  if (n < 2 || to <= from) return '';
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / ((pts[i + 1].x - pts[i].x) || 1));
  const m = pts.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  const f = (v: number) => v.toFixed(1);
  let out = `M${f(pts[from].x)},${f(pts[from].y)}`;
  for (let i = from; i < to; i++) {
    const h = (pts[i + 1].x - pts[i].x) / 3;
    out += `C${f(pts[i].x + h)},${f(pts[i].y + m[i] * h)} ${f(pts[i + 1].x - h)},${f(pts[i + 1].y - m[i + 1] * h)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
  }
  return out;
}

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

/** Euro cents → a short axis label ("4.000", "1,5 Mio.", "4K"): `compactMoney` in logic.ts. */
export const compact = compactMoney;

/**
 * A label of words and an amount written inside a plot ("sonst ≈ 1.050 €"):
 * the plots run left to right, so in Arabic the label is isolated to run
 * right to left as one unit — the word on the right — with its amount kept
 * left to right. Without it the word lands on the wrong side of the number.
 */
function plotLabel(template: string, amount: string, t: Strings, key = 'amount'): string {
  const text = fmt(template, { [key]: `\u2066${amount}\u2069` });
  return t.dir === 'rtl' ? `\u2067${text}\u2069` : text;
}

/** A column with a round data end and a square foot on the baseline. */
function columnPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  if (h <= 0.5) return '';
  const r = Math.min(6, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

/** A column hanging down from the zero line to `bottom` (a negative value), rounded at its foot. */
function columnPathDown(x: number, w: number, bottom: number, base: number): string {
  const h = bottom - base;
  if (h <= 0.5) return '';
  const r = Math.min(6, w / 2, h);
  return `M${x},${base}V${bottom - r}Q${x},${bottom} ${x + r},${bottom}H${x + w - r}Q${x + w},${bottom} ${x + w},${bottom - r}V${base}Z`;
}

function axisMonth(key: MonthKey, locale: string, wide: boolean): string {
  const { year, month } = parseMonthKey(key);
  return new Intl.DateTimeFormat(locale, { month: wide ? 'short' : 'narrow' }).format(new Date(year, month - 1, 1));
}

/* ----------------------------------------------------------------- frame */

interface FrameProps {
  /** One key per slot along the x-axis: months (YYYY-MM) unless `axis` and `tipTitle` say otherwise. */
  slots: string[];
  /** Narrowest a slot may get before the plot scrolls. */
  minSlot: number;
  ticks: number[];
  y: (v: number) => number;
  selected?: string;
  t: Strings;
  /** Hit-target label per slot (VoiceOver reads the values from it). */
  label: (i: number) => string;
  onPick?: (key: string) => void;
  /** The marks, given each slot's centre and width. */
  marks: (cx: (i: number) => number, slot: number, active: number | null) => ReactNode;
  tooltip: (i: number) => ReactNode;
  /** A zero line inside the plot (a balance below zero). */
  zero?: boolean;
  /** The y-axis labels; money in short form unless given ("20 %"). */
  tickLabel?: (v: number) => string;
  /** The x-axis label under a slot (null: none); a month's short name, and the year under January, unless given. */
  axis?: (i: number, wide: boolean) => { text: string; sub?: string } | null;
  /** The tooltip's heading; the month's name unless given. */
  tipTitle?: (i: number) => string;
  /**
   * Hit targets for runs of slots (the weeks of a day chart): VoiceOver and
   * the keyboard step through these, while a finger or the mouse scrubs
   * across every slot — one capture over the plot instead of thirty tiny
   * buttons. Without it, every slot is its own target.
   */
  groups?: { from: number; to: number; label: string }[];
  /** A line chart: the plot is uncovered from the left when it appears. */
  reveal?: boolean;
}

/**
 * Shared chart frame: the y-axis stays put on the left, the plot scrolls when
 * the slots don't fit, every slot's whole width is the hit target (or a
 * group's, with scrubbing in between), and the tooltip stays inside the
 * visible part. Months and days share it.
 */
function ChartFrame({ slots, minSlot, ticks, y, selected, t, label, onPick, marks, tooltip, zero, tickLabel, axis, tipTitle, groups, reveal }: FrameProps) {
  const months = slots;
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [active, setActive] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const reduce = useReducedMotion();
  const revealId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // The slot a dragging finger reached last: a tap after a drag picks that one.
  const scrubbed = useRef<number | null>(null);
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
  // A chart that picks nothing on tap (a sheet's, Ausblick) with slots narrower
  // than a finger: neighbouring slots share one 44 pt target, read together;
  // scrubbing still shows each one.
  const targets = groups ?? (!onPick && slot < 44 && months.length > 1 ? (() => {
    const k = Math.ceil(44 / slot);
    const out: { from: number; to: number; label: string }[] = [];
    for (let from = 0; from < months.length; from += k) {
      const to = Math.min(months.length - 1, from + k - 1);
      const run = { from, to, label: Array.from({ length: to - from + 1 }, (_, j) => label(from + j)).join('; ') };
      // A short last run joins the one before it.
      const prev = out[out.length - 1];
      if (prev && to - from + 1 < k) out[out.length - 1] = { from: prev.from, to, label: `${prev.label}; ${run.label}` };
      else out.push(run);
    }
    return out;
  })() : undefined);

  // Open on the newest month.
  useLayoutEffect(() => {
    const s = scroller.current;
    if (s) { s.scrollLeft = s.scrollWidth; setScrollLeft(s.scrollLeft); }
  }, [months.length, plotW]);

  const tipW = 196;
  const tipLeft = active === null ? 0
    : Math.max(scrollLeft, Math.min(cx(active) - tipW / 2, scrollLeft + visible - tipW));
  // A plot that fits is dragged across (the page still scrolls up and down); one that scrolls keeps its sideways pan.
  const fits = plotW <= visible + 0.5;
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && !targets) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(months.length - 1, Math.floor((e.clientX - r.left) / slot)));
    if (i === active) return;
    if (e.pointerType !== 'mouse' && active !== null) { tapLight(); scrubbed.current = i; }
    setActive(i);
  };
  const drawn = marks(cx, slot, active);

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
            {/* A dotted grid over a solid floor: the lines guide the eye without caging the marks. */}
            {ticks.map((v, i) => (
              <line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)} className="stroke-hairline" strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : '1.5 4.5'} strokeLinecap="round" />
            ))}
            {zero && <line x1={0} x2={plotW} y1={y(0)} y2={y(0)} className="stroke-fg-faint" strokeWidth={1} />}
            {active !== null && (
              // The band behind the slot in hand; it slides to the next one.
              <rect x={-Math.max(3, slot / 2 - 2)} width={Math.max(6, slot - 4)} y={PAD_T - 4} height={PLOT_H + 4}
                rx={Math.min(10, Math.max(3, slot / 2 - 2))} className="fill-fg chart-band" opacity={0.06}
                style={{ transform: `translateX(${cx(active)}px)` }} />
            )}
            {reveal ? (
              // A line chart is drawn from the left: the clip runs across the marks once, the grid stays put.
              <>
                <defs>
                  <clipPath id={revealId}>
                    {reduce
                      ? <rect x={0} y={0} width={plotW} height={H} />
                      : <motion.rect x={0} y={0} height={H} initial={{ width: 0 }} animate={{ width: plotW }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} />}
                  </clipPath>
                </defs>
                <g clipPath={`url(#${revealId})`}>{drawn}</g>
              </>
            ) : drawn}
            {months.map((m, i) => {
              const on = m === selected;
              const lab = axis ? axis(i, wide) : { text: axisMonth(m, t.locale, wide), sub: m.endsWith('-01') || i === 0 ? m.slice(0, 4) : undefined };
              if (!lab) return null;
              // In a narrow first slot a centred label would be cut off by the plot's edge: it starts at the edge instead.
              const edge = i === 0 && slot < 34;
              const at = { x: edge ? 0 : cx(i), textAnchor: edge ? 'start' as const : 'middle' as const };
              return (
                <g key={m}>
                  <text {...at} y={PAD_T + PLOT_H + 15} className={`text-micro ${on ? 'fill-fg font-bold' : 'fill-fg-mute'}`}>
                    {lab.text}
                  </text>
                  {lab.sub && (
                    <text {...at} y={PAD_T + PLOT_H + 29} className="text-micro fill-fg-mute num">{lab.sub}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {targets ? (
            // Runs of slots as targets; between them a finger (or the mouse) scrubs slot by slot.
            <div
              className="absolute inset-0 flex touch-pan-y"
              onPointerDown={e => { if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={scrub}
            >
              {targets.map(g => (
                <button
                  key={g.from}
                  type="button"
                  className="h-full shrink-0 rounded-sm focus-visible:ring-focus"
                  style={{ width: slot * (g.to - g.from + 1) }}
                  aria-label={g.label}
                  onFocus={() => setActive(g.to)}
                  onBlur={() => setActive(null)}
                  onClick={() => { tapLight(); onPick?.(months[g.to]); }}
                />
              ))}
            </div>
          ) : (
            // Hit targets: the whole slot, bigger than any mark; a finger put down drags across them.
            <div
              className={`absolute inset-0 flex ${fits ? 'touch-pan-y' : ''}`}
              onPointerDown={() => { scrubbed.current = null; }}
              onPointerMove={fits ? scrub : undefined}
            >
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
                  onClick={() => {
                    const k = scrubbed.current ?? i;
                    scrubbed.current = null;
                    tapLight(); setActive(k); onPick?.(months[k]);
                  }}
                />
              ))}
            </div>
          )}
          {active !== null && (
            // Follows the slot in hand: it glides along rather than jumping.
            <motion.div
              role="status"
              className="pointer-events-none absolute top-0 left-0 z-10 rounded-sm bg-raised card-edge shadow-e2 px-3 py-2 whitespace-nowrap"
              style={{ width: tipW }}
              initial={{ x: tipLeft, opacity: 0 }}
              animate={{ x: tipLeft, opacity: 1 }}
              transition={{ x: { type: 'spring', duration: 0.28, bounce: 0 }, opacity: { duration: 0.12 } }}
            >
              <p className="text-caption font-semibold text-fg-mute">{tipTitle ? tipTitle(active) : monthLabel(months[active], t.locale)}</p>
              {tooltip(active)}
            </motion.div>
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
  /** A month tapped; without it, a tap only shows the values. */
  onPick?: (key: MonthKey) => void;
}

/* ------------------------------------------------- income vs expenses */

/**
 * A column's fill: its series colour, a touch lighter towards the foot, so a
 * row of columns has some depth without a second colour. `className` sets
 * the colour as text (`text-chart-in`); the gradient runs over the plot, so
 * equal heights are shaded alike.
 */
function ColumnShade({ id, base, className }: { id: string; base: number; className: string }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={PAD_T} y2={base} className={className}>
      <stop offset="0" stopColor="currentColor" />
      <stop offset="1" stopColor="currentColor" stopOpacity={0.7} />
    </linearGradient>
  );
}

/** A plain column segment, square at both ends (the paid part under an open one). */
function rectPath(x: number, w: number, top: number, base: number): string {
  return base - top <= 0.5 ? '' : `M${x},${base}V${top}H${x + w}V${base}Z`;
}

/** What a month kept, in whole units with its sign ("+1.283", "−320"): the label over a month's columns. "••••" while amounts are hidden (plan 06). */
export function savedLabel(cents: number, locale: string): string {
  if (areAmountsHidden()) return MASK;
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
  const hi = Math.max(1, ...points.flatMap(p => [on('in') ? p.income : 0, on('out') ? p.spending : 0]));
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
    in: { total: (p: MonthPoint) => p.income, open: (p: MonthPoint) => p.incomeOpen ?? 0, fill: 'fill-chart-in', ink: 'text-chart-in', swatch: 'bg-chart-in', label: t.income },
    // Ausgaben without what was put into savings categories (D1): that counts as saved, and the tooltip names it.
    out: { total: (p: MonthPoint) => p.spending, open: (p: MonthPoint) => p.spendingOpen ?? 0, fill: 'fill-chart-out', ink: 'text-chart-out', swatch: 'bg-chart-out', label: t.expenses },
  } as const;
  const anyOpen = points.some(p => kinds.some(kind => series[kind].open(p) > 0));
  const parts = (p: MonthPoint) => [
    ...kinds.map(kind => `${series[kind].label} ${money(series[kind].total(p))}`),
    both && `${p.saved < 0 ? t.overspent : t.saved} ${money(Math.abs(p.saved))}`,
    p.invested > 0 && `${t.invested} ${money(p.invested)}`,
  ].filter(Boolean).join(', ');
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={[
        { key: 'in', label: t.chartLegendIncome, className: 'bg-chart-in' },
        { key: 'out', label: t.chartLegendExpenses, className: 'bg-chart-out' },
      ]} />
      <ChartFrame
        slots={points.map(p => p.key)} minSlot={30} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(points[i].key, t.locale)}: ${parts(points[i])}`}
        marks={(cx, slot, active) => {
          const w = Math.max(4, Math.min(14, (slot - 14) / 2));
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
                {kinds.map(kind => <ColumnShade key={kind} id={`${hatch}-shade-${kind}`} base={base} className={series[kind].ink} />)}
              </defs>
              {points.map((p, i) => {
                const x0 = cx(i) - (k * w + (k - 1) * 3) / 2;
                const running = p.key === now;
                return (
                  <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
                    {kinds.map((kind, j) => {
                      const s = series[kind];
                      const total = s.total(p);
                      const open = Math.min(total, s.open(p));
                      const paid = total - open;
                      const x = x0 + j * (w + 3);
                      return (
                        <g key={kind} {...grow(base, i * 2 + j)}>
                          {paid > 0 && <path d={open > 0 ? rectPath(x, w, y(paid), base) : columnPath(x, w, y(paid), base)} fill={`url(#${hatch}-shade-${kind})`} />}
                          {open > 0 && <path d={columnPath(x, w, y(total), y(paid))} fill={`url(#${hatch}-${kind})`} />}
                        </g>
                      );
                    })}
                    {labelled && (p.income || p.expense) ? (
                      <text
                        x={cx(i)} y={y(Math.max(p.income, p.expense)) - 6} textAnchor="middle"
                        className={`chart-fade text-micro font-bold num ${running ? 'fill-fg-mute' : p.saved < 0 ? 'fill-neg' : 'fill-fg'}`}
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
              {p.invested > 0 && <p className="ps-5 text-caption text-fg-mute tabular-nums">{fmt(t.investedOf, { amount: money(p.invested) })}</p>}
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
      slots={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
      zero={yLo < 0 && yHi > 0} reveal
      label={i => `${monthLabel(points[i].key, t.locale)}: ${t.balanceOverTime} ${money(points[i].end)}`}
      marks={(cx, _slot, active) => {
        const pts = points.map((p, i) => ({ x: cx(i), y: y(p.end) }));
        const path = (from: number, to: number) => smoothPath(pts, from, to);
        const line = path(0, last);
        const solid = running > 0 ? path(0, running - 1) : running === 0 ? '' : line;
        const dashed = running > 0 ? path(running - 1, running) : '';
        const area = line && `${line}L${cx(last).toFixed(1)},${base.toFixed(1)}L${cx(0).toFixed(1)},${base.toFixed(1)}Z`;
        const stroke = (d: string, className: string, side: 'up' | 'down', dash?: string) => d && (
          <path d={d} fill="none" className={className} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={dash} clipPath={`url(#${clip}-${side})`} />
        );
        return (
          <>
            <defs>
              <clipPath id={`${clip}-up`}><rect x={0} y={0} width="100%" height={base} /></clipPath>
              <clipPath id={`${clip}-down`}><rect x={0} y={base} width="100%" height={H - base} /></clipPath>
              {/* The wash under the line thins out towards the floor (and, below zero, towards the bottom). */}
              <linearGradient id={`${clip}-wash`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={PAD_T} y2={base} className="text-chart-line">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.3} />
                <stop offset="1" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${clip}-under`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={base} y2={PAD_T + PLOT_H} className="text-neg">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.04} />
                <stop offset="1" stopColor="currentColor" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            {area && <path d={area} fill={`url(#${clip}-wash)`} clipPath={`url(#${clip}-up)`} />}
            {area && <path d={area} fill={`url(#${clip}-under)`} clipPath={`url(#${clip}-down)`} />}
            {stroke(solid, 'stroke-chart-line', 'up')}
            {stroke(solid, 'stroke-neg', 'down')}
            {stroke(dashed, 'stroke-chart-line', 'up', '4 4')}
            {stroke(dashed, 'stroke-neg', 'down', '4 4')}
            {/* A soft halo marks the newest point — where the line stands today. */}
            <circle cx={cx(last)} cy={y(points[last].end)} r={11} className={`chart-pulse ${points[last].end < 0 ? 'fill-neg' : 'fill-chart-line'}`} opacity={0.16}
              style={{ transformOrigin: `${cx(last)}px ${y(points[last].end)}px` }} />
            {[...new Set([last, active ?? last])].map(i => (
              <circle
                key={i} cx={cx(i)} cy={y(points[i].end)} r={5} strokeWidth={projected(i) ? 2.5 : 2}
                className={projected(i)
                  ? `fill-surface ${points[i].end < 0 ? 'stroke-neg' : 'stroke-chart-line'}`
                  : `${points[i].end < 0 ? 'fill-neg' : 'fill-chart-line'} stroke-surface`}
              />
            ))}
            {active === null && (
              // The newest value, labelled directly — the one the reader came for.
              <text x={cx(last) - 10} y={y(points[last].end) - 14} textAnchor="end" className="fill-fg text-caption font-bold num chart-halo">
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
 * One category's total per month as columns in its own colour — the first
 * chart of its *Kategorie* screen (and of a payee's sheet). The part still
 * open is hatched; a dashed Ø line (fg-mute) and a dashed budget line (fg)
 * run across, each labelled at its end.
 */
export function CategoryTrendChart({ category, values, open, months, selected, language, t, onPick, average, limit, label: seriesLabel }: {
  category: Pick<Category, 'hue' | 'names'>;
  /** month → total of the category */
  values: Map<MonthKey, number>;
  /** month → what of it is still open (hatched) */
  open?: Map<MonthKey, number>;
  months: MonthKey[];
  selected?: MonthKey;
  language: string;
  t: Strings;
  onPick?: (key: MonthKey) => void;
  /** Ø per month, drawn as a dashed line. */
  average?: number;
  /** The monthly budget, drawn as a dashed line. */
  limit?: number;
  /** The series' name in the tooltip (the category's unless given). */
  label?: string;
}) {
  const hatch = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const value = (m: MonthKey) => values.get(m) ?? 0;
  const ticks = niceTicks(0, Math.max(1, ...months.map(value), average ?? 0, limit ?? 0));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = PAD_T + PLOT_H;
  const money = (c: number) => formatMoney(c, t.locale);
  const name = seriesLabel ?? displayName(category.names, language);
  // Both lines labelled at the end; when they would touch, the lower one's label goes under its line.
  const lines = [
    average ? { key: 'avg', v: average, text: plotLabel(t.catAvgLine, formatMoneyApprox(average, t.locale), t), className: 'stroke-fg-mute', ink: 'fill-fg-mute' } : null,
    limit ? { key: 'limit', v: limit, text: plotLabel(t.catBudgetLine, formatMoneyShort(limit, t.locale), t), className: 'stroke-fg', ink: 'fill-fg' } : null,
  ].filter((l): l is NonNullable<typeof l> => !!l);
  const close = lines.length === 2 && Math.abs(y(lines[0].v) - y(lines[1].v)) < 14;
  return (
    <div data-hue={category.hue}>
      <ChartFrame
        slots={months} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(months[i], t.locale)}: ${name} ${money(value(months[i]))}${open?.get(months[i]) ? `, ${fmt(t.inclOpen, { amount: money(open.get(months[i])!) })}` : ''}`}
        marks={(cx, slot, active) => {
          const w = Math.max(4, Math.min(16, slot * 0.44));
          const end = cx(months.length - 1) + slot / 2;
          return (
            <>
              <defs>
                <pattern id={hatch} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width={5} height={5} className="fill-hue-chart" opacity={0.32} />
                  <rect width={2.2} height={5} className="fill-hue-chart" />
                </pattern>
                <ColumnShade id={`${hatch}-shade`} base={base} className="text-hue-chart" />
              </defs>
              {months.map((m, i) => {
                const total = value(m);
                const pending = Math.min(total, open?.get(m) ?? 0);
                const paid = total - pending;
                const x = cx(i) - w / 2;
                return (
                  <g key={m} opacity={active === null || active === i ? 1 : 0.45}>
                    <g {...grow(base, i)}>
                      {paid > 0 && <path d={pending > 0 ? rectPath(x, w, y(paid), base) : columnPath(x, w, y(paid), base)} fill={`url(#${hatch}-shade)`} />}
                      {pending > 0 && <path d={columnPath(x, w, y(total), y(paid))} fill={`url(#${hatch})`} />}
                    </g>
                  </g>
                );
              })}
              {lines.map((l, i) => {
                const below = close && i === (lines[0].v <= lines[1].v ? 0 : 1);
                return (
                  <g key={l.key}>
                    <line x1={0} x2={end} y1={y(l.v)} y2={y(l.v)} className={l.className} strokeWidth={1.5} strokeDasharray="5 4" />
                    <text x={end - 4} y={y(l.v) + (below ? 12 : -5)} textAnchor="end" className={`text-micro font-semibold num chart-halo ${l.ink}`}>{l.text}</text>
                  </g>
                );
              })}
            </>
          );
        }}
        tooltip={i => (
          <>
            <TipRow swatch="bg-hue-chart" value={money(value(months[i]))} label={name} />
            {!!open?.get(months[i]) && <p className="ps-5 text-caption text-fg-mute tabular-nums">{fmt(t.inclOpen, { amount: money(open.get(months[i])!) })}</p>}
          </>
        )}
      />
      {months.some(m => (open?.get(m) ?? 0) > 0) && <p className="text-caption text-fg-mute mt-1 wrap-prose">{t.hatchNote}</p>}
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
            <div className="bar-grow mt-1.5 h-3 rounded-full bg-hue-chart" style={{ width: `${Math.max(1, (average / max) * 100)}%`, animationDelay: `${Math.min(i * 40, 400)}ms` }} aria-hidden="true" />
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
        // Green, not amber: amber means "open" across the app.
        { key: 'rate', label: t.savingsRateTitle, className: 'bg-chart-in' },
        ...(anyOver ? [{ key: 'over', label: t.overspent, className: 'bg-neg' }] : []),
        { key: 'target', label: fmt(t.targetPct, { p: target }), className: '!h-0 !rounded-none border-t-2 border-dashed border-fg-mute' },
      ]} />
      <ChartFrame
        slots={points.map(p => p.key)} minSlot={26} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        zero={yLo < 0}
        // Tight on the narrow axis: "−100%" without the space.
        tickLabel={v => percent(v).replace(/\s/g, '')}
        label={i => `${monthLabel(points[i].key, t.locale)}${visible(rates[i]) ? `: ${percent(rates[i]!)}, ${
          points[i].saved < 0 ? t.overspent : t.saved} ${money(Math.abs(points[i].saved))}` : ''}`}
        marks={(cx, slot, active) => {
          const w = Math.max(4, Math.min(16, slot * 0.44));
          const end = cx(points.length - 1) + slot / 2;
          return (
            <>
              {points.map((p, i) => {
                const r = rates[i];
                if (!visible(r)) return null;
                return (
                  <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
                    <g {...grow(base, i)}>
                      {r >= 0
                        ? <path d={columnPath(cx(i) - w / 2, w, y(r), base)} className="fill-chart-in" />
                        : <path d={columnPathDown(cx(i) - w / 2, w, y(r), base)} className="fill-neg" />}
                    </g>
                  </g>
                );
              })}
              {goal && <line x1={0} x2={end} y1={y(target)} y2={y(target)} className="stroke-fg-mute" strokeWidth={1.5} strokeDasharray="5 4" />}
            </>
          );
        }}
        tooltip={i => (!visible(rates[i]) ? null : (
          <>
            <TipRow swatch={rates[i]! < 0 ? 'bg-neg' : 'bg-chart-in'} value={percent(rates[i]!)} label={t.savingsRateTitle} />
            <TipRow value={money(Math.abs(points[i].saved))} label={points[i].saved < 0 ? t.overspent : t.saved} />
          </>
        ))}
      />
    </div>
  );
}

/* ------------------------------------------------- this month so far */

/**
 * *November bis heute* (STATISTICS_AND_INSIGHTS.md §9.1): everyday spending
 * day by day — this month solid up to today with its value written at the
 * dot, dashed from there to the month's end ("≈"), a usual month as a thin
 * fg-mute line with a light band (25th–75th percentile) and a hairline at
 * today. VoiceOver steps through the weeks (`groups`); a finger scrubs
 * across every day.
 */
export function PaceChart({ pace: p, now, t, groups }: {
  pace: Pace;
  /** This month's name, for the legend and the tooltip. */
  now: string;
  t: Strings;
  /** The week targets with their labels (built by the card, which has the words). */
  groups: { from: number; to: number; label: string }[];
}) {
  const [hidden, toggle] = useHidden();
  const showNow = !hidden.includes('now');
  const showUsual = !hidden.includes('usual') && !!p.usual;
  const money = (c: number) => formatMoney(c, t.locale);
  const days = Array.from({ length: p.days }, (_, i) => String(i + 1));
  const today = p.day - 1;
  const proj = p.usual && p.usualToday !== null ? p.usual.map((u, i) => (i >= today ? p.spent + u - p.usualToday! : null)) : null;
  const hi = Math.max(1,
    showNow ? p.spent : 0, showNow ? p.projected ?? 0 : 0,
    showUsual ? p.usualTotal ?? 0 : 0, showUsual && p.band ? Math.max(...p.band.hi) : 0);
  const ticks = niceTicks(0, hi);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const dayName = (i: number) => dayLabel(dateAt(p.month, i + 1), t.locale);
  const num = new Intl.NumberFormat(t.locale);
  const legend = [
    { key: 'now', label: now, className: 'bg-chart-out' },
    ...(p.usual ? [{ key: 'usual', label: t.paceLegendUsual, className: '!h-0.5 !rounded-full bg-fg-mute' }] : []),
  ];
  return (
    <div>
      {p.usual && <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={legend} />}
      <ChartFrame
        slots={days} minSlot={8} ticks={ticks} y={y} t={t} reveal
        label={i => dayName(i)}
        groups={groups}
        // Weekly ticks along the bottom, today's day among them.
        axis={i => (i % 7 === 0 || i === today ? { text: num.format(i + 1) } : null)}
        tipTitle={i => (i === today ? `${dayName(i)} · ${t.paceToday}` : dayName(i))}
        marks={(cx, _slot, active) => {
          const line = (vals: (number | null)[], from = 0, to = vals.length - 1) => {
            let d = '';
            for (let i = from; i <= to; i++) { const v = vals[i]; if (v === null) continue; d += `${d ? 'L' : 'M'}${cx(i).toFixed(1)},${y(v).toFixed(1)}`; }
            return d;
          };
          const last = p.days - 1;
          const usualEnd = p.usualTotal ?? 0;
          const projEnd = p.projected ?? 0;
          // The two end labels keep apart: the higher above its point, the lower under it.
          const projAbove = projEnd >= usualEnd;
          return (
            <>
              {showUsual && p.band && (
                <path
                  d={`${line(p.band.hi)}${p.band.lo.map((_, i) => `L${cx(last - i).toFixed(1)},${y(p.band!.lo[last - i]).toFixed(1)}`).join('')}Z`}
                  className="fill-fg" opacity={0.07}
                />
              )}
              <line x1={cx(today)} x2={cx(today)} y1={PAD_T} y2={PAD_T + PLOT_H} className="stroke-fg-faint" strokeWidth={1} />
              {active !== null && active !== today && (
                <line x1={cx(active)} x2={cx(active)} y1={PAD_T} y2={PAD_T + PLOT_H} className="stroke-hairline" strokeWidth={2} />
              )}
              {showUsual && p.usual && (
                <>
                  <path d={line(p.usual)} fill="none" className="stroke-fg-mute" strokeWidth={1.25} strokeLinejoin="round" />
                  <text x={cx(last)} y={y(usualEnd) + (projAbove && showNow && proj ? 13 : -6)} textAnchor="end" className="fill-fg-mute text-micro font-semibold num chart-halo">
                    {plotLabel(t.paceUsualEnd, formatMoneyEstimate(usualEnd, t.locale), t)}
                  </text>
                </>
              )}
              {showNow && (
                <>
                  {proj && <path d={line(proj, today)} fill="none" className="stroke-chart-out" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />}
                  <path d={line(p.actual)} fill="none" className="stroke-chart-out" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={cx(today)} cy={y(p.spent)} r={4.5} className="fill-chart-out stroke-surface" strokeWidth={2} />
                  <text
                    x={cx(today) + (today < p.days / 2 ? 8 : -8)} y={y(p.spent) - 10}
                    textAnchor={today < p.days / 2 ? 'start' : 'end'} className="fill-fg text-caption font-bold num chart-halo"
                  >
                    {money(p.spent)}
                  </text>
                  {proj && (
                    <>
                      <circle cx={cx(last)} cy={y(projEnd)} r={4} className="fill-surface stroke-chart-out" strokeWidth={2.5} />
                      <text x={cx(last) - 8} y={y(projEnd) + (projAbove || !showUsual ? -9 : 15)} textAnchor="end" className="fill-fg text-micro font-bold num chart-halo">
                        {`≈ ${formatMoneyEstimate(projEnd, t.locale)}`}
                      </text>
                    </>
                  )}
                </>
              )}
            </>
          );
        }}
        tooltip={i => (
          <>
            {showNow && i <= today && <TipRow swatch="bg-chart-out" value={money(p.actual[i])} label={now} />}
            {showNow && i > today && proj?.[i] != null && <TipRow swatch="bg-chart-out" value={`≈ ${formatMoneyEstimate(proj[i]!, t.locale)}`} label={now} />}
            {showUsual && p.usual && <TipRow swatch="bg-fg-mute" value={money(p.usual[i])} label={t.paceLegendUsual} />}
          </>
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------ outlook */

/**
 * *Ausblick* (§9.5): this month's end and the next twelve as one dashed line
 * — dashed means projected, as in the balance chart — inside a band from
 * pricey to calm months, a dot on each month with a yearly bill, the zero
 * line with red below it, and the last value written at its hollow end point.
 */
export function OutlookChart({ outlook: o, t }: { outlook: Outlook; t: Strings }) {
  const clip = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pts = [{ key: o.from.key, mid: o.from.end, lo: o.from.end, hi: o.from.end, big: [] as OutlookItem[] }, ...o.months];
  const lo = Math.min(...pts.map(p => p.lo));
  const hi = Math.max(...pts.map(p => p.hi));
  const pad = Math.max((hi - lo) * 0.15, 5000);
  const ticks = niceTicks(lo - pad, hi + pad);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const base = Math.min(PAD_T + PLOT_H, Math.max(PAD_T, y(0)));
  const est = (c: number) => formatMoneyEstimate(c, t.locale);
  const last = pts.length - 1;
  const bills = (p: (typeof pts)[number]) => p.big.filter(b => !b.income);
  return (
    <ChartFrame
      // Thirteen points must fit a phone's card without scrolling: 18 px each (an iPhone SE leaves about 250 px).
      slots={pts.map(p => p.key)} minSlot={18} ticks={ticks} y={y} t={t} reveal
      zero={yLo < 0 && yHi > 0}
      label={i => {
        const p = pts[i];
        const head = o.ranged && i > 0
          ? fmt(t.outlookPointRangeAria, { month: monthLabel(p.key, t.locale), amount: est(p.mid), lo: est(p.lo), hi: est(p.hi) })
          : fmt(t.outlookPointAria, { month: monthLabel(p.key, t.locale), amount: est(p.mid) });
        const b = bills(p);
        return b.length ? `${head}. ${b.map(x => `${x.name} ${formatMoney(x.amount, t.locale)}`).join(', ')}` : head;
      }}
      marks={(cx, _slot, active) => {
        const path = (key: 'mid' | 'lo' | 'hi') => pts.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('');
        const band = `${path('hi')}${[...pts].reverse().map((p, j) => `L${cx(last - j).toFixed(1)},${y(p.lo).toFixed(1)}`).join('')}Z`;
        return (
          <>
            <defs>
              <clipPath id={`${clip}-up`}><rect x={0} y={0} width="100%" height={base} /></clipPath>
              <clipPath id={`${clip}-down`}><rect x={0} y={base} width="100%" height={H - base} /></clipPath>
            </defs>
            {o.ranged && <path d={band} className="fill-chart-line" opacity={0.14} clipPath={`url(#${clip}-up)`} />}
            {o.ranged && <path d={band} className="fill-neg" opacity={0.14} clipPath={`url(#${clip}-down)`} />}
            <path d={path('mid')} fill="none" className="stroke-chart-line" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" clipPath={`url(#${clip}-up)`} />
            <path d={path('mid')} fill="none" className="stroke-neg" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" clipPath={`url(#${clip}-down)`} />
            {pts.map((p, i) => (bills(p).length && i !== last ? (
              <circle key={p.key} cx={cx(i)} cy={y(p.mid)} r={3.5} className={p.mid < 0 ? 'fill-neg' : 'fill-chart-line'} />
            ) : null))}
            {active !== null && active !== last && <circle cx={cx(active)} cy={y(pts[active].mid)} r={4.5} className="fill-surface stroke-chart-line" strokeWidth={2} />}
            <circle cx={cx(last)} cy={y(pts[last].mid)} r={4.5} className={`fill-surface ${pts[last].mid < 0 ? 'stroke-neg' : 'stroke-chart-line'}`} strokeWidth={2.5} />
            {active === null && (
              <text x={cx(last) - 8} y={y(pts[last].mid) - 11} textAnchor="end" className="fill-fg text-caption font-bold num chart-halo">{`≈ ${est(pts[last].mid)}`}</text>
            )}
          </>
        );
      }}
      tooltip={i => {
        const p = pts[i];
        return (
          <>
            <TipRow swatch={p.mid < 0 ? 'bg-neg' : 'bg-chart-line'} value={`≈ ${est(p.mid)}`} label={t.balanceEnd} />
            {o.ranged && i > 0 && <p className="ps-5 text-caption text-fg-mute tabular-nums">{`${est(p.lo)} – ${est(p.hi)}`}</p>}
            {bills(p).slice(0, 2).map(b => <p key={b.name} className="ps-5 text-caption text-fg-mute tabular-nums truncate">{`${b.name} ${formatMoney(b.amount, t.locale)}`}</p>)}
          </>
        );
      }}
    />
  );
}

/* --------------------------------------------------------------- small */

/**
 * Part of a whole as one thin bar — each category in its own colour, 2px
 * apart (U4's "where it goes this month"). Decorative next to its words;
 * the label says it all for VoiceOver.
 */
export function ShareBar({ items, label, className = '' }: {
  items: { key: string; hue?: Hue; value: number }[];
  label: string;
  className?: string;
}) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  if (total <= 0) return null;
  return (
    <div role="img" aria-label={label} className={`flex gap-[3px] h-3 rounded-full overflow-hidden ${className}`}>
      {items.filter(i => i.value > 0).map(i => (
        <div key={i.key} data-hue={i.hue} className="h-full bg-hue-chart first:rounded-s-full last:rounded-e-full" style={{ width: `${(i.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

/**
 * Two short bars for a hint (Apple Health's highlights): what it is about,
 * solid, against what it is compared with, lighter — each with its value.
 */
export function MiniBars({ hue, rows }: { hue?: Hue; rows: { label: string; value: number; text: string; faded?: boolean }[] }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)));
  return (
    <div data-hue={hue} className="mt-2 space-y-1" aria-hidden="true">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-[5.5rem] shrink-0 text-micro text-fg-mute tabular-nums wrap-compound">{r.label}</span>
          <span className="min-w-0 flex-1 flex items-center gap-1.5">
            <span className="bar-grow h-2.5 rounded-full bg-hue-chart" style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%`, opacity: r.faded ? 0.35 : 1 }} />
            <span className="shrink-0 text-micro font-semibold text-fg num">{r.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------ the next 30 days */

/**
 * *Nächste 30 Tage* (Planen): the account day by day from today — a stepped
 * line, since a balance moves on the day a bill goes out or the salary comes
 * in, dashed like every line that lies ahead. A dot on each day something
 * is booked (the step says which way), a ring on the lowest point with its
 * value, the last value at the end; red below zero. VoiceOver
 * steps through the weeks (`groups`); a finger scrubs across every day.
 */
export function RunwayChart({ runway: r, t, groups }: {
  runway: Runway;
  t: Strings;
  groups: { from: number; to: number; label: string }[];
}) {
  const clip = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const values = r.days.map(d => d.balance);
  const lo = Math.min(r.start, ...values);
  const hi = Math.max(r.start, ...values);
  const pad = Math.max((hi - lo) * 0.18, 5000);
  const ticks = niceTicks(lo - pad, hi + pad);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const base = Math.min(PAD_T + PLOT_H, Math.max(PAD_T, y(0)));
  const money = (c: number) => formatMoney(c, t.locale);
  const last = r.days.length - 1;
  const low = r.lowest.index;
  const dayName = (i: number) => dayLabel(r.days[i].date, t.locale);
  const monthOf = (i: number) => r.days[i].date.slice(0, 7);
  const monthShort = (i: number) => {
    const [yy, mm] = r.days[i].date.split('-').map(Number);
    return new Intl.DateTimeFormat(t.locale, { month: 'short' }).format(new Date(yy, mm - 1, 1));
  };
  const num = new Intl.NumberFormat(t.locale);
  return (
    <ChartFrame
      slots={r.days.map(d => d.date)} minSlot={8} ticks={ticks} y={y} t={t} reveal
      zero={yLo < 0 && yHi > 0}
      label={dayName}
      groups={groups}
      // A tick a week, the month named under the first and wherever it turns.
      axis={i => (i % 7 === 0 ? { text: num.format(Number(r.days[i].date.slice(8))), sub: i === 0 || monthOf(i) !== monthOf(i - 7) ? monthShort(i) : undefined } : null)}
      tipTitle={i => (i === 0 ? `${dayName(i)} · ${t.paceToday}` : dayName(i))}
      marks={(cx, _slot, active) => {
        // Stepped: the balance holds until the day something is booked.
        let line = `M${cx(0).toFixed(1)},${y(values[0]).toFixed(1)}`;
        for (let i = 1; i <= last; i++) line += `H${cx(i).toFixed(1)}V${y(values[i]).toFixed(1)}`;
        const area = `${line}L${cx(last).toFixed(1)},${base.toFixed(1)}L${cx(0).toFixed(1)},${base.toFixed(1)}Z`;
        const fill = (v: number) => (v < 0 ? 'fill-neg' : 'fill-chart-line');
        const ring = (v: number) => (v < 0 ? 'stroke-neg' : 'stroke-chart-line');
        // The lowest point's label goes under it, the end's above — they keep apart.
        const lowY = Math.min(PAD_T + PLOT_H - 5, y(values[low]) + 18);
        const lowAnchor = low < 4 ? 'start' : low > last - 4 ? 'end' : 'middle';
        // The end's label goes above its point — under it when the line comes down to it, so it stays off the line.
        const endBelow = values.slice(Math.max(0, last - 10), last).some(v => y(v) < y(values[last]) - 6);
        const endY = endBelow ? Math.min(PAD_T + PLOT_H - 5, y(values[last]) + 19) : Math.max(PAD_T + 8, y(values[last]) - 11);
        return (
          <>
            <defs>
              <clipPath id={`${clip}-up`}><rect x={0} y={0} width="100%" height={base} /></clipPath>
              <clipPath id={`${clip}-down`}><rect x={0} y={base} width="100%" height={H - base} /></clipPath>
              <linearGradient id={`${clip}-wash`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={PAD_T} y2={base} className="text-chart-line">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.26} />
                <stop offset="1" stopColor="currentColor" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${clip}-under`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={base} y2={PAD_T + PLOT_H} className="text-neg">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.04} />
                <stop offset="1" stopColor="currentColor" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${clip}-wash)`} clipPath={`url(#${clip}-up)`} />
            <path d={area} fill={`url(#${clip}-under)`} clipPath={`url(#${clip}-down)`} />
            <path d={line} fill="none" className="stroke-chart-line" strokeWidth={2} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip}-up)`} />
            <path d={line} fill="none" className="stroke-neg" strokeWidth={2} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip}-down)`} />
            {r.days.map((d, i) => (d.items.length && i !== 0 && i !== low && i !== last ? (
              <circle key={d.date} cx={cx(i)} cy={y(values[i])} r={3.5} strokeWidth={1.5}
                className={`stroke-surface ${fill(values[i])}`} />
            ) : null))}
            {/* Today: where the line starts. */}
            <circle cx={cx(0)} cy={y(values[0])} r={4.5} strokeWidth={2} className={`${fill(values[0])} stroke-surface`} />
            {active !== null && active !== 0 && active !== low && active !== last && (
              <circle cx={cx(active)} cy={y(values[active])} r={4.5} strokeWidth={2} className={`fill-surface ${ring(values[active])}`} />
            )}
            {low !== 0 && low !== last && (
              <>
                <circle cx={cx(low)} cy={y(values[low])} r={9} className={`chart-pulse ${fill(values[low])}`} opacity={0.16}
                  style={{ transformOrigin: `${cx(low)}px ${y(values[low])}px` }} />
                <circle cx={cx(low)} cy={y(values[low])} r={4.5} strokeWidth={2.5} className={`fill-surface ${ring(values[low])}`} />
                {active === null && (
                  <text x={cx(low)} y={lowY} textAnchor={lowAnchor} className="fill-fg text-micro font-bold num chart-halo">{money(values[low])}</text>
                )}
              </>
            )}
            <circle cx={cx(last)} cy={y(values[last])} r={4.5} strokeWidth={2.5} className={`fill-surface ${ring(values[last])}`} />
            {active === null && (
              <text x={cx(last) - 8} y={endY} textAnchor="end" className="fill-fg text-caption font-bold num chart-halo">{money(values[last])}</text>
            )}
          </>
        );
      }}
      tooltip={i => {
        const d = r.days[i];
        return (
          <>
            {/* The day is the heading and there is one line: the amount needs no name beside it. */}
            <TipRow swatch={d.balance < 0 ? 'bg-neg' : 'bg-chart-line'} value={money(d.balance)} label="" />
            {d.items.slice(0, 3).map((x, k) => (
              <p key={k} className="ps-5 text-caption text-fg-mute tabular-nums truncate">
                {`${x.name} ${x.income || x.amount < 0 ? '+' : '−'}${money(Math.abs(x.amount))}`}
              </p>
            ))}
          </>
        );
      }}
    />
  );
}

/* ------------------------------------------------------------- figures */

/**
 * A small line beside a figure (a stat tile's trend): no axis, no labels,
 * the last point marked. It takes the colour of the text around it, is drawn
 * once from the left, and says nothing to VoiceOver — the figure does.
 */
export function Sparkline({ values, width = 76, height = 28, className = '' }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const span = (Math.max(...values) - lo) || 1;
  const pts = values.map((v, i) => ({ x: 2 + (i * (width - 7)) / (values.length - 1), y: 4 + (1 - (v - lo) / span) * (height - 8) }));
  const end = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={`shrink-0 ${className}`} aria-hidden="true">
      <path d={smoothPath(pts)} pathLength={1} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="spark-draw" />
      <circle cx={end.x} cy={end.y} r={2.75} fill="currentColor" className="chart-fade" />
    </svg>
  );
}

/**
 * One ratio as a ring — a meter bent round, never a part-to-whole (that
 * stays a bar): the arc runs from the top as far as `value` (0–1) on a
 * track of the same ink, a notch outside marks the `target`. The figure
 * itself is written in the middle (`children`); `label` says it all for
 * VoiceOver. It sweeps in once.
 */
export function RingMeter({ value, target, size = 96, stroke = 9, label, children }: {
  value: number;
  target?: number;
  size?: number;
  stroke?: number;
  label: string;
  children: ReactNode;
}) {
  const v = Math.max(0, Math.min(1, value));
  const c = size / 2;
  const r = c - stroke / 2 - 6;
  const notch = (a: number, from: number, to: number) => {
    const rad = a * 2 * Math.PI;
    return { x1: c + from * Math.cos(rad), y1: c + from * Math.sin(rad), x2: c + to * Math.cos(rad), y2: c + to * Math.sin(rad) };
  };
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Turned a quarter back, so the arc starts at twelve o'clock. */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block -rotate-90" aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity={0.22} strokeWidth={stroke} />
        {v > 0 && (
          <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
            pathLength={100} strokeDasharray="100 100" strokeDashoffset={100 - v * 100} className="ring-sweep" />
        )}
        {target !== undefined && (
          <line {...notch(target, r + stroke / 2 + 1.5, r + stroke / 2 + 6)} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">{children}</div>
    </div>
  );
}

/* --------------------------------------------------- when the money goes */

/** A weekday's name: 1 January 2024 was a Monday. */
const weekdayName = (weekday: number, locale: string, style: 'long' | 'short' | 'narrow') =>
  new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2024, 0, 1 + weekday));

/**
 * The average per weekday as seven columns, the week in the locale's order:
 * one of them stands out — the priciest, or the one tapped — with its value
 * written above it, the rest step back (emphasis, not seven colours). Every
 * column is a button that says its day and its average.
 */
export function WeekdayBars({ pattern, t }: { pattern: WeekdayPattern; t: Strings }) {
  const [picked, setPicked] = useState<number | null>(null);
  const first = firstWeekday(t.locale);
  const order = Array.from({ length: 7 }, (_, i) => (first + i) % 7);
  const max = Math.max(1, ...pattern.average);
  const shown = picked ?? pattern.top ?? pattern.average.indexOf(Math.max(...pattern.average));
  const BAR_H = 84;
  return (
    // No gap: on an iPhone SE each day's column is then just the 44 pt a finger needs; the bars keep their own width.
    <div className="flex">
      {order.map((wd, i) => {
        const v = pattern.average[wd];
        const on = wd === shown;
        const amount = formatMoneyApprox(v, t.locale);
        return (
          <button
            key={wd}
            type="button"
            aria-pressed={picked === wd}
            aria-label={`${weekdayName(wd, t.locale, 'long')}: Ø ${spoken(amount, t.amountHidden)}`}
            onClick={() => { tapLight(); setPicked(p => (p === wd ? null : wd)); }}
            className="flex-1 min-w-0 flex flex-col items-center rounded-sm focus-visible:ring-focus"
          >
            <span className={`h-4 text-micro font-bold num whitespace-nowrap transition-opacity ${on ? 'text-fg opacity-100' : 'opacity-0'}`} aria-hidden="true">{amount}</span>
            <span className="mt-1 w-full flex items-end justify-center" style={{ height: BAR_H }} aria-hidden="true">
              <span
                className="col-grow w-full max-w-[26px] rounded-t-[7px] rounded-b-[2px] bg-chart-out transition-opacity"
                style={{ height: Math.max(3, Math.round((v / max) * BAR_H)), opacity: on ? 1 : 0.34, animationDelay: `${i * 45}ms` }}
              />
            </span>
            <span className={`mt-1.5 text-micro ${on ? 'text-fg font-bold' : 'text-fg-mute'}`} aria-hidden="true">{weekdayName(wd, t.locale, 'short')}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A day's shade in the calendar: nothing, three tints of the accent, then the accent itself (its ink on it). */
const HEAT = ['bg-surface-2 text-fg-mute', 'heat-1 text-fg', 'heat-2 text-fg', 'heat-3 text-fg', 'bg-accent-fill text-accent-fill-ink font-semibold'] as const;

/**
 * A month as a calendar, each day shaded by what went out on it (one hue,
 * more is darker — `heatLevel`). A day with spending carries its sum under
 * its number — whole units, no currency sign, thousands as "1,2k"
 * (`dayAmount`): the square is about 40 px wide. A day is a button: it says
 * its date and amount, and picking it lets the card write them out in full.
 * Days still to come are outlined; today carries a dot. The legend runs from
 * less to more.
 */
export function HeatCalendar({ month: m, t, selected, onSelect }: {
  month: MonthDays;
  t: Strings;
  /** The picked day (the n-th of the month), if any. */
  selected: number | null;
  onSelect: (day: number | null) => void;
}) {
  const first = firstWeekday(t.locale);
  const order = Array.from({ length: 7 }, (_, i) => (first + i) % 7);
  const lead = m.days.length ? (m.days[0].weekday - first + 7) % 7 : 0;
  const today = isoDay();
  const num = new Intl.NumberFormat(t.locale);
  // A sum that fits a square, at most four signs: "45", "380", "1,2k", "12k". Not while the amounts are hidden.
  const whole = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 0, useGrouping: false });
  const tenth = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1, useGrouping: false });
  const dayAmount = (cents: number) => {
    if (areAmountsHidden() || cents <= 0) return null;
    const units = cents / 100;
    if (units < 999.5) return whole.format(Math.max(1, Math.round(units)));
    return `${units < 9950 ? tenth.format(units / 1000) : whole.format(units / 1000)}k`;
  };
  return (
    <div>
      <div className="grid grid-cols-7 gap-[5px]" aria-hidden="true">
        {order.map(wd => <span key={wd} className="text-center text-micro text-fg-mute">{weekdayName(wd, t.locale, 'narrow')}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-[5px]" role="group" aria-label={monthLabel(m.month, t.locale)}>
        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} aria-hidden="true" />)}
        {m.days.map((d, i) => {
          const level = d.future ? 0 : heatLevel(d.amount, m.max);
          const on = selected === d.day;
          const sum = d.future ? null : dayAmount(d.amount);
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={on}
              aria-label={`${dayLabel(d.date, t.locale)}: ${spoken(formatMoney(d.amount, t.locale), t.amountHidden)}`}
              onClick={() => { tapLight(); onSelect(on ? null : d.day); }}
              className={`heat-pop hit-44 relative aspect-square rounded-[10px] flex flex-col items-center justify-center text-caption tabular-nums focus-visible:ring-focus ${
                d.future ? 'border border-dashed border-hairline text-fg-mute' : HEAT[level]} ${on ? 'heat-on' : ''}`}
              style={{ animationDelay: `${Math.min(i * 14, 420)}ms` }}
            >
              {/* With a sum under it the day steps back: smaller, and the sum is what is read. */}
              <span className={sum ? 'text-[11px] leading-[13px]' : undefined}>{num.format(Number(d.date.slice(8)))}</span>
              {/* Physical sizes, like the square: its width does not grow with the text size (the day's line above the calendar does). */}
              {sum && <span className="max-w-full px-px text-[11px] leading-[13px] font-semibold whitespace-nowrap overflow-hidden" aria-hidden="true">{sum}</span>}
              {d.date === today && <span className={`absolute w-1 h-1 rounded-full bg-current ${sum ? 'top-[3px] end-[3px]' : 'bottom-[4px]'}`} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-micro text-fg-mute" aria-hidden="true">
        {t.heatLess}
        {HEAT.map((c, i) => <span key={i} className={`w-3 h-3 rounded-[4px] ${c}`} />)}
        {t.heatMore}
      </div>
    </div>
  );
}
