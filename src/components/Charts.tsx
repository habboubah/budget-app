import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Category, MonthKey } from '../types';
import { MonthPoint, CategoryMatrix, BudgetSplit } from '../insights';
import { displayName, formatMoney, monthLabel, parseMonthKey } from '../logic';
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

/** Euro cents → a short axis label: "0", "800", "2k", "27,5k". */
function compact(cents: number, locale: string): string {
  const euros = cents / 100;
  if (Math.abs(euros) < 1000) return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(euros).replace('-', '−');
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(euros / 1000).replace('-', '−')}k`;
}

/** A column with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  if (h <= 0.5) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
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
}

/**
 * Shared chart frame: the y-axis stays put on the left, the plot scrolls when
 * the months don't fit, every month's whole slot is the hit target, and the
 * tooltip stays inside the visible part.
 */
function ChartFrame({ months, minSlot, ticks, y, selected, t, label, onPick, marks, tooltip, zero }: FrameProps) {
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [active, setActive] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const visible = Math.max(80, width - AXIS_W);
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
      <svg width={AXIS_W} height={H} className="shrink-0" aria-hidden="true">
        {ticks.map(v => (
          <text key={v} x={AXIS_W - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-mute text-micro num">{compact(v, t.locale)}</text>
        ))}
      </svg>
      {/* Older months hide to the left: a fade says there is more. */}
      {scrollLeft > 4 && (
        <div className="pointer-events-none absolute z-[5] top-0 w-8 bg-gradient-to-r from-surface to-transparent" style={{ left: AXIS_W, height: H }} aria-hidden="true" />
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

export function Legend({ items }: { items: { label: string; className?: string; style?: CSSProperties }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-caption text-fg-mute">
          <span className={`w-2.5 h-2.5 rounded-[3px] ${i.className ?? ''}`} style={i.style} aria-hidden="true" />
          {i.label}
        </span>
      ))}
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

/** Income and expenses per month, side by side. */
export function IncomeExpenseChart({ points, selected, t, onPick }: SeriesProps) {
  const ticks = niceTicks(0, Math.max(1, ...points.map(p => Math.max(p.income, p.expense))));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = PAD_T + PLOT_H;
  const money = (c: number) => formatMoney(c, t.locale);
  return (
    <div>
      <Legend items={[{ label: t.chartLegendIncome, className: 'bg-chart-in' }, { label: t.chartLegendExpenses, className: 'bg-chart-out' }]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(points[i].key, t.locale)}: ${t.income} ${money(points[i].income)}, ${t.expenses} ${money(points[i].expense)}`}
        marks={(cx, slot, active) => points.map((p, i) => {
          const w = Math.max(3, Math.min(12, (slot - 10) / 2));
          return (
            <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
              <path d={columnPath(cx(i) - w - 1, w, y(p.income), base)} className="fill-chart-in" />
              <path d={columnPath(cx(i) + 1, w, y(p.expense), base)} className="fill-chart-out" />
            </g>
          );
        })}
        tooltip={i => (
          <>
            <TipRow swatch="bg-chart-in" value={money(points[i].income)} label={t.income} />
            <TipRow swatch="bg-chart-out" value={money(points[i].expense)} label={t.expenses} />
            <p className={`text-caption font-semibold mt-1 num ${points[i].saved < 0 ? 'text-neg' : 'text-fg-mute'}`}>
              {points[i].saved < 0 ? t.overspent : t.saved}: {money(Math.abs(points[i].saved))}
            </p>
          </>
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------ balance */

/** The balance at each month's end, as one line. */
export function BalanceChart({ points, selected, t, onPick }: SeriesProps) {
  const values = points.map(p => p.end);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Not from zero: a balance chart is about the change. Padded so a flat line
  // still sits mid-plot instead of on an edge.
  const pad = Math.max((hi - lo) * 0.15, 5000);
  const ticks = niceTicks(lo - pad, hi + pad);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const last = points.length - 1;
  const money = (c: number) => formatMoney(c, t.locale);
  return (
    <ChartFrame
      months={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
      zero={yLo < 0 && yHi > 0}
      label={i => `${monthLabel(points[i].key, t.locale)}: ${t.balanceOverTime} ${money(points[i].end)}`}
      marks={(cx, _slot, active) => (
        <>
          <path
            d={points.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(p.end).toFixed(1)}`).join('')}
            fill="none" className="stroke-chart-line" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          />
          {[...new Set([last, active ?? last])].map(i => (
            <circle key={i} cx={cx(i)} cy={y(points[i].end)} r={5} className="fill-chart-line stroke-surface" strokeWidth={2} />
          ))}
          {active === null && (
            // The newest value, labelled directly — the one the reader came for.
            <text x={cx(last) - 8} y={y(points[last].end) - 12} textAnchor="end" className="fill-fg text-caption font-bold num">
              {money(points[last].end)}
            </text>
          )}
        </>
      )}
      tooltip={i => <TipRow swatch="bg-chart-line" value={money(points[i].end)} label={t.balanceEnd} />}
    />
  );
}

/* -------------------------------------------------- categories × months */

/**
 * Each category's total per month as a group of thin columns — one column
 * per category, in the user's category order and colour. Tapping a legend
 * chip hides or shows that category; the plot scrolls when the groups need
 * the room.
 */
export function CategoryMonthChart({ matrix, months, selected, language, t, onPick }: {
  matrix: CategoryMatrix;
  months: MonthKey[];
  selected: MonthKey;
  language: string;
  t: Strings;
  onPick: (key: MonthKey) => void;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  // A category that disappears from the range (another kind, deleted) drops out of `hidden` too.
  useEffect(() => { setHidden(h => h.filter(id => matrix.categories.some(c => c.id === id))); }, [matrix.categories]);
  const shown = matrix.categories.filter(c => !hidden.includes(c.id));
  const k = Math.max(1, shown.length);
  const max = Math.max(1, ...months.flatMap(m => shown.map(c => matrix.values.get(m)?.get(c.id) ?? 0)));
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = PAD_T + PLOT_H;
  const money = (c: number) => formatMoney(c, t.locale);
  const name = (c: Category) => displayName(c.names, language);
  const value = (m: MonthKey, c: Category) => matrix.values.get(m)?.get(c.id) ?? 0;

  return (
    <div>
      {/* The legend is also the filter: aria-pressed chips, the swatch is the column colour. */}
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label={t.categories}>
        {matrix.categories.map(c => {
          const on = !hidden.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              data-hue={c.hue}
              onClick={() => { tapLight(); setHidden(h => (on ? [...h, c.id] : h.filter(x => x !== c.id))); }}
              className={`min-h-[36px] ps-2.5 pe-3 rounded-full inline-flex items-center gap-1.5 text-caption font-semibold border transition-colors focus-visible:ring-focus ${
                on ? 'bg-surface text-fg border-hairline' : 'bg-transparent text-fg-mute border-dashed border-hairline'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-[3px] ${on ? 'bg-hue-chart' : 'border border-fg-faint'}`} aria-hidden="true" />
              {name(c)}
            </button>
          );
        })}
      </div>
      <ChartFrame
        months={months} minSlot={k * 9 + 12} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(months[i], t.locale)}: ${shown.map(c => `${name(c)} ${money(value(months[i], c))}`).join(', ')}`}
        marks={(cx, slot, active) => {
          const w = Math.max(3, Math.min(10, (slot - 10) / k - 2));
          const groupW = k * w + (k - 1) * 2;
          return months.map((m, i) => (
            <g key={m} opacity={active === null || active === i ? 1 : 0.45}>
              {shown.map((c, j) => (
                <path key={c.id} data-hue={c.hue} d={columnPath(cx(i) - groupW / 2 + j * (w + 2), w, y(value(m, c)), base)} className="fill-hue-chart" />
              ))}
            </g>
          ));
        }}
        tooltip={i => shown
          .map(c => ({ c, v: value(months[i], c) }))
          .map(({ c, v }) => (
            <span key={c.id} data-hue={c.hue} className="block">
              <TipRow swatch="bg-hue-chart" value={money(v)} label={name(c)} />
            </span>
          ))}
      />
    </div>
  );
}

/* ------------------------------------------------------------- figures */

/** Average per month and category as ranked bars, the value at the tip. */
export function AverageBars({ items, language, t }: {
  items: { category: Category; average: number }[];
  language: string;
  t: Strings;
}) {
  const max = Math.max(1, ...items.map(i => i.average));
  return (
    <ul className="space-y-3">
      {items.map(({ category: c, average }, i) => {
        const name = displayName(c.names, language);
        const firstIncome = c.kind === 'income' && items[i - 1]?.category.kind !== 'income';
        return (
          <li key={c.id} data-hue={c.hue} className={firstIncome && i > 0 ? 'pt-3 hairline-t' : ''}>
            <div className="flex items-baseline gap-2">
              <span className="emoji text-[15px]" aria-hidden="true">{c.emoji}</span>
              <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{name}</span>
              <span className={`text-label font-semibold num ${c.kind === 'income' ? 'text-pos' : 'text-fg'}`}>{formatMoney(average, t.locale)}</span>
            </div>
            <div className="mt-1.5 h-3 rounded-e-[4px] bg-hue-chart" style={{ width: `${Math.max(1, (average / max) * 100)}%` }} aria-hidden="true" />
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
export function BudgetSplitBar({ split, t }: { split: BudgetSplit; t: Strings }) {
  const parts = [
    { key: 'needs', label: t.budgetNeed, value: split.needs, target: 50, className: 'bg-chart-out' },
    { key: 'wants', label: t.budgetWant, value: split.wants, target: 30, className: 'bg-chart-want' },
    { key: 'saved', label: t.saved, value: Math.max(0, split.saved), target: 20, className: 'bg-chart-in' },
  ];
  const total = Math.max(1, split.income, split.needs + split.wants);
  const pct = (v: number) => (split.income > 0 ? Math.round((v / split.income) * 100) : 0);
  return (
    <div>
      <div
        className="flex gap-[2px] h-7 rounded-[4px] overflow-hidden" role="img"
        aria-label={parts.map(p => `${p.label} ${pct(p.value)} % (${fmt(t.targetPct, { p: p.target })})`).join(', ')}
      >
        {parts.filter(p => p.value > 0).map(p => {
          const w = (p.value / total) * 100;
          return (
            <div key={p.key} className={`${p.className} h-full flex items-center rounded-[4px] ps-2`} style={{ width: `${w}%` }}>
              {w >= 12 && <span className="text-caption font-bold text-chart-label num">{pct(p.value)} %</span>}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {parts.map(p => (
          <li key={p.key} className="min-w-0">
            <span className="flex items-center gap-1.5 text-caption text-fg-mute">
              <span className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${p.className}`} aria-hidden="true" />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="block text-label font-bold text-fg num mt-0.5">{split.income > 0 ? `${pct(p.key === 'saved' ? split.saved : p.value)} %` : '–'}</span>
            <span className="block text-caption text-fg-mute tabular-nums">{fmt(t.targetPct, { p: p.target })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Saved per month as tiny columns around a zero line — the trend in the savings tile. */
export function SavedSpark({ points }: { points: MonthPoint[] }) {
  const max = Math.max(1, ...points.map(p => Math.abs(p.saved)));
  const h = 36;
  const mid = points.some(p => p.saved < 0) ? h / 2 : h;
  const scale = points.some(p => p.saved < 0) ? h / 2 : h;
  const w = 100 / Math.max(1, points.length);
  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="w-full h-9" aria-hidden="true">
      {points.map((p, i) => {
        const v = (Math.abs(p.saved) / max) * scale;
        return (
          <rect key={p.key} x={i * w + w * 0.18} width={w * 0.64} y={p.saved >= 0 ? mid - v : mid} height={Math.max(0.5, v)}
            className={p.saved >= 0 ? 'fill-chart-in' : 'fill-neg'} rx={1} />
        );
      })}
    </svg>
  );
}
