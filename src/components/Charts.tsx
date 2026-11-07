import { CSSProperties, ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Category, MonthKey } from '../types';
import { MonthPoint, CategoryMatrix, BudgetSplit, RulePart } from '../insights';
import { displayName, formatMoney, formatPercent, monthLabel, parseMonthKey } from '../logic';
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
          <text key={v} x={AXIS_W - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-mute text-micro num">{tickLabel ? tickLabel(v) : compact(v, t.locale)}</text>
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
    <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label={label}>
      {items.map(i => {
        const on = !hidden.includes(i.key);
        return (
          <button
            key={i.key}
            type="button"
            aria-pressed={on}
            data-hue={i.hue}
            onClick={() => { tapLight(); onToggle(i.key); }}
            className={`min-h-[36px] ps-2.5 pe-3 rounded-full inline-flex items-center gap-1.5 text-caption font-semibold border transition-colors focus-visible:ring-focus ${
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

/**
 * Income, expenses and what each month saved, side by side; a month that
 * spent more than came in shows the overspend as a red column below the zero
 * line — above means saved, below means overspent, whatever the colours.
 * Each of the four can be switched off in the legend.
 */
export function IncomeExpenseChart({ points, selected, t, onPick }: SeriesProps) {
  const [hidden, toggle] = useHidden();
  const on = (k: string) => !hidden.includes(k);
  const anyOver = points.some(p => p.saved < 0);
  const savedOn = (p: MonthPoint) => (p.saved >= 0 ? on('save') : on('over'));
  const lo = Math.min(0, ...points.filter(p => p.saved < 0 && on('over')).map(p => p.saved));
  const hi = Math.max(1, ...points.flatMap(p => [on('in') ? p.income : 0, on('out') ? p.expense : 0, p.saved > 0 && on('save') ? p.saved : 0]));
  const ticks = niceTicks(lo, hi);
  const yLo = ticks[0];
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (top - yLo)) * PLOT_H;
  const base = y(0);
  const money = (c: number) => formatMoney(c, t.locale);
  // The columns still shown, packed together.
  const kinds = (['in', 'out', 'saved'] as const).filter(k => (k === 'saved' ? on('save') || (anyOver && on('over')) : on(k)));
  const k = Math.max(1, kinds.length);
  const parts = (p: MonthPoint) => [
    on('in') && `${t.income} ${money(p.income)}`,
    on('out') && `${t.expenses} ${money(p.expense)}`,
    savedOn(p) && `${p.saved < 0 ? t.overspent : t.saved} ${money(Math.abs(p.saved))}`,
  ].filter(Boolean).join(', ');
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={[
        { key: 'in', label: t.chartLegendIncome, className: 'bg-chart-in' },
        { key: 'out', label: t.chartLegendExpenses, className: 'bg-chart-out' },
        { key: 'save', label: t.saved, className: 'bg-chart-save' },
        ...(anyOver ? [{ key: 'over', label: t.overspent, className: 'bg-neg' }] : []),
      ]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={30} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        zero={yLo < 0}
        label={i => `${monthLabel(points[i].key, t.locale)}: ${parts(points[i])}`}
        marks={(cx, slot, active) => points.map((p, i) => {
          const w = Math.max(3, Math.min(10, (slot - 12) / 3));
          const x0 = cx(i) - (k * w + (k - 1) * 2) / 2;
          return (
            <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
              {kinds.map((kind, j) => {
                const x = x0 + j * (w + 2);
                if (kind === 'in') return <path key={kind} d={columnPath(x, w, y(p.income), base)} className="fill-chart-in" />;
                if (kind === 'out') return <path key={kind} d={columnPath(x, w, y(p.expense), base)} className="fill-chart-out" />;
                if (p.saved >= 0) return on('save') ? <path key={kind} d={columnPath(x, w, y(p.saved), base)} className="fill-chart-save" /> : null;
                return on('over') ? <path key={kind} d={columnPathDown(x, w, y(p.saved), base)} className="fill-neg" /> : null;
              })}
            </g>
          );
        })}
        tooltip={i => (
          <>
            {on('in') && <TipRow swatch="bg-chart-in" value={money(points[i].income)} label={t.income} />}
            {on('out') && <TipRow swatch="bg-chart-out" value={money(points[i].expense)} label={t.expenses} />}
            {savedOn(points[i]) && (points[i].saved < 0
              ? <TipRow swatch="bg-neg" value={money(-points[i].saved)} label={t.overspent} />
              : <TipRow swatch="bg-chart-save" value={money(points[i].saved)} label={t.saved} />)}
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

/* ----------------------------------------------- income and expenses, lines */

/**
 * Income and expenses month by month as two lines, each with a light wash
 * down to zero (as saved and overspent below), read like the balance line:
 * the newest values labelled at the end of each line, every month in the
 * tooltip. Either line can be switched off in the legend.
 */
export function IncomeExpenseLines({ points, selected, t, onPick }: SeriesProps) {
  const [hidden, toggle] = useHidden();
  const series = [
    { key: 'income', value: (p: MonthPoint) => p.income, stroke: 'stroke-chart-in', fill: 'fill-chart-in', swatch: 'bg-chart-in', label: t.income },
    { key: 'expense', value: (p: MonthPoint) => p.expense, stroke: 'stroke-chart-out', fill: 'fill-chart-out', swatch: 'bg-chart-out', label: t.expenses },
  ];
  const shown = series.filter(s => !hidden.includes(s.key));
  const ticks = niceTicks(0, Math.max(1, ...points.flatMap(p => shown.map(s => s.value(p)))));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = y(0);
  const last = points.length - 1;
  const money = (c: number) => formatMoney(c, t.locale);
  // The higher line's label above its last point, the lower one's below, so they never overlap.
  const highest = shown.reduce<(typeof series)[number] | undefined>((a, s) => (!a || s.value(points[last]) > a.value(points[last]) ? s : a), undefined);
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle}
        items={[{ key: 'income', label: t.chartLegendIncome, className: 'bg-chart-in' }, { key: 'expense', label: t.chartLegendExpenses, className: 'bg-chart-out' }]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        label={i => `${monthLabel(points[i].key, t.locale)}: ${shown.map(s => `${s.label} ${money(s.value(points[i]))}`).join(', ')}`}
        marks={(cx, _slot, active) => (
          <>
            {shown.map(s => {
              const line = points.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(s.value(p)).toFixed(1)}`).join('');
              return (
                <g key={s.key}>
                  <path d={`${line}L${cx(last).toFixed(1)},${base.toFixed(1)}L${cx(0).toFixed(1)},${base.toFixed(1)}Z`} className={s.fill} opacity={0.13} />
                  <path d={line} fill="none" className={s.stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}
            {shown.map(s => [...new Set([last, active ?? last])].map(i => (
              <circle key={`${s.key}-${i}`} cx={cx(i)} cy={y(s.value(points[i]))} r={4.5} className={`${s.fill} stroke-surface`} strokeWidth={2} />
            )))}
            {active === null && shown.map(s => {
              const above = s === highest;
              return (
                <text key={s.key} x={cx(last) - 8} y={y(s.value(points[last])) + (above ? -11 : 19)} textAnchor="end" className="fill-fg text-caption font-bold num">
                  {money(s.value(points[last]))}
                </text>
              );
            })}
          </>
        )}
        tooltip={i => (
          <>
            {shown.map(s => <TipRow key={s.key} swatch={s.swatch} value={money(s.value(points[i]))} label={s.label} />)}
          </>
        )}
      />
    </div>
  );
}

/* ------------------------------------------------ saved and overspent */

/**
 * What each month saved, as one line around the zero line: above it saved,
 * below it overspent — the line and a light wash down (or up) to zero take
 * the colour of the side they are on, so a month that crosses turns red right
 * where it does. The newest value is labelled at the end, every month in the
 * tooltip. Either side can be switched off in the legend.
 */
export function SavedLines({ points, selected, t, onPick }: SeriesProps) {
  const [hidden, toggle] = useHidden();
  const clip = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const values = points.map(p => p.saved);
  const anyOver = values.some(v => v < 0);
  const up = !hidden.includes('save');
  const down = !hidden.includes('over');
  const visible = (v: number) => (v < 0 ? down : up);
  const ticks = niceTicks(down ? Math.min(0, ...values) : 0, up ? Math.max(1, ...values) : 1);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const base = y(0);
  const last = points.length - 1;
  const money = (c: number) => formatMoney(c, t.locale);
  const lastValue = values[last];
  return (
    <div>
      <LegendToggles label={t.chartShow} hidden={hidden} onToggle={toggle} items={[
        { key: 'save', label: t.saved, className: 'bg-chart-save' },
        ...(anyOver ? [{ key: 'over', label: t.overspent, className: 'bg-neg' }] : []),
      ]} />
      <ChartFrame
        months={points.map(p => p.key)} minSlot={22} ticks={ticks} y={y} selected={selected} t={t} onPick={onPick}
        zero={yLo < 0}
        label={i => `${monthLabel(points[i].key, t.locale)}${visible(values[i]) ? `: ${values[i] < 0 ? t.overspent : t.saved} ${money(Math.abs(values[i]))}` : ''}`}
        marks={(cx, _slot, active) => {
          const line = points.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(p.saved).toFixed(1)}`).join('');
          const area = `${line}L${cx(last).toFixed(1)},${base.toFixed(1)}L${cx(0).toFixed(1)},${base.toFixed(1)}Z`;
          return (
            <>
              <defs>
                <clipPath id={`${clip}-up`}><rect x={0} y={0} width="100%" height={Math.max(0, base)} /></clipPath>
                <clipPath id={`${clip}-down`}><rect x={0} y={base} width="100%" height={Math.max(0, H - base)} /></clipPath>
              </defs>
              {up && <path d={area} className="fill-chart-save" opacity={0.16} clipPath={`url(#${clip}-up)`} />}
              {down && <path d={area} className="fill-neg" opacity={0.14} clipPath={`url(#${clip}-down)`} />}
              {up && <path d={line} fill="none" className="stroke-chart-save" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip}-up)`} />}
              {down && <path d={line} fill="none" className="stroke-neg" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip}-down)`} />}
              {[...new Set([last, active ?? last])].filter(i => visible(values[i])).map(i => (
                <circle key={i} cx={cx(i)} cy={y(values[i])} r={4.5} className={`${values[i] < 0 ? 'fill-neg' : 'fill-chart-save'} stroke-surface`} strokeWidth={2} />
              ))}
              {active === null && visible(lastValue) && (
                // The newest value, labelled directly: above the point when saved, below when overspent.
                <text x={cx(last) - 8} y={y(lastValue) + (lastValue < 0 ? 19 : -11)} textAnchor="end" className="fill-fg text-caption font-bold num">
                  {formatMoney(lastValue, t.locale, 'exceptZero')}
                </text>
              )}
            </>
          );
        }}
        tooltip={i => (!visible(values[i]) ? null : values[i] < 0
          ? <TipRow swatch="bg-neg" value={money(-values[i])} label={t.overspent} />
          : <TipRow swatch="bg-chart-save" value={money(values[i])} label={t.saved} />)}
      />
    </div>
  );
}

/* -------------------------------------------------- categories × months */

/**
 * Each category's total per month as a group of thin columns — one column
 * per category, in the user's category order and colour. Tapping a legend
 * chip hides or shows that category (the card's "show all / hide all" sets
 * them all at once, so `hidden` lives with the card); the plot scrolls when
 * the groups need the room.
 */
export function CategoryMonthChart({ matrix, months, selected, language, t, onPick, hidden, setHidden }: {
  matrix: CategoryMatrix;
  months: MonthKey[];
  selected: MonthKey;
  language: string;
  t: Strings;
  onPick: (key: MonthKey) => void;
  /** Ids of the categories switched off in the legend. */
  hidden: string[];
  setHidden: (update: (hidden: string[]) => string[]) => void;
}) {
  // A category that disappears from the range (deleted, no money any more) drops out of `hidden` too.
  useEffect(() => { setHidden(h => h.filter(id => matrix.categories.some(c => c.id === id))); }, [matrix.categories, setHidden]);
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
      <LegendToggles
        label={t.categories}
        hidden={hidden}
        onToggle={id => setHidden(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]))}
        items={matrix.categories.map(c => ({ key: c.id, label: name(c), className: 'bg-hue-chart', hue: c.hue }))}
      />
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
        // Income comes first; a hairline where the expenses begin.
        const firstExpense = c.kind === 'expense' && items[i - 1]?.category.kind === 'income';
        return (
          <li key={c.id} data-hue={c.hue} className={firstExpense ? 'pt-3 hairline-t' : ''}>
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
