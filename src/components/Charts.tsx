import { ReactNode, useRef, useState } from 'react';
import { MonthKey } from '../types';
import { HistoryPoint, formatMoney, monthLabel, parseMonthKey } from '../logic';
import { Strings } from '../translations';
import { useWidth } from '../ui/useWidth';

/*
 * Two small hand-drawn SVG charts for the statistics screen, following the
 * dataviz skill: thin marks (columns ≤ 24px with a 4px rounded end, square at
 * the baseline; a 2px line), a 2px surface gap between touching columns, a
 * hairline solid grid, one y-axis, text in text tokens — never the series
 * colour — a legend for two series and none for one, and a tooltip on hover,
 * tap and keyboard focus that never gates a value (the table below the charts
 * has every number).
 */

const PLOT_H = 150;
const AXIS_H = 22;
const PAD_L = 40;
const PAD_R = 6;
const PAD_T = 10;

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
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

const narrowMonth = (key: MonthKey, locale: string) => {
  const { year, month } = parseMonthKey(key);
  return new Intl.DateTimeFormat(locale, { month: 'narrow' }).format(new Date(year, month - 1, 1));
};

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  // Keep the card inside the chart: flip to the left half past the middle.
  const left = Math.max(0, Math.min(x - 98, width - 196));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 w-[196px] rounded-sm bg-raised card-edge shadow-e2 px-3 py-2 whitespace-nowrap"
      style={{ left }}
    >
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-caption text-fg-mute">
          <span className={`w-2.5 h-2.5 rounded-[3px] ${i.className}`} aria-hidden="true" />
          {i.label}
        </span>
      ))}
    </div>
  );
}

interface ChartProps {
  points: HistoryPoint[];
  selected: MonthKey;
  t: Strings;
  onPick: (key: MonthKey) => void;
}

/** Income and expenses per month, side by side. Tap a month to open it. */
export function IncomeExpenseChart({ points, selected, t, onPick }: ChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(1, ...points.map(p => Math.max(p.income, p.expense)));
  const ticks = niceTicks(0, max);
  const top = ticks[ticks.length - 1];
  const plotW = width - PAD_L - PAD_R;
  const slot = plotW / points.length;
  const barW = Math.max(3, Math.min(12, (slot - 8) / 2));
  const y = (v: number) => PAD_T + PLOT_H - (v / top) * PLOT_H;
  const base = PAD_T + PLOT_H;
  const a = active !== null ? points[active] : null;
  const money = (c: number) => formatMoney(c, t.locale);

  return (
    <div>
      <Legend items={[{ label: t.chartLegendIncome, className: 'bg-chart-in' }, { label: t.chartLegendExpenses, className: 'bg-chart-out' }]} />
      <div ref={box} className="relative" onPointerLeave={() => setActive(null)}>
        <svg width={width} height={PAD_T + PLOT_H + AXIS_H} className="block overflow-visible" aria-hidden="true">
          {ticks.map(v => (
            <g key={v}>
              <line x1={PAD_L} x2={width - PAD_R} y1={y(v)} y2={y(v)} className="stroke-hairline" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-mute text-micro num">{compact(v, t.locale)}</text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = PAD_L + slot * i + slot / 2;
            const on = p.key === selected;
            return (
              <g key={p.key} opacity={active === null || active === i ? 1 : 0.45}>
                <path d={columnPath(cx - barW - 1, barW, y(p.income), base)} className="fill-chart-in" />
                <path d={columnPath(cx + 1, barW, y(p.expense), base)} className="fill-chart-out" />
                <text x={cx} y={base + 15} textAnchor="middle"
                  className={`text-micro ${on ? 'fill-fg font-bold' : 'fill-fg-mute'}`}>{narrowMonth(p.key, t.locale)}</text>
              </g>
            );
          })}
        </svg>
        {/* Hit targets: the whole column slot, bigger than the marks. */}
        <div className="absolute inset-0 flex" style={{ paddingLeft: PAD_L, paddingRight: PAD_R }}>
          {points.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className="flex-1 h-full rounded-sm focus-visible:ring-focus"
              aria-label={`${monthLabel(p.key, t.locale)}: ${t.income} ${money(p.income)}, ${t.expenses} ${money(p.expense)}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => onPick(p.key)}
            />
          ))}
        </div>
        {a && active !== null && (
          <Tooltip x={PAD_L + slot * active + slot / 2} width={width}>
            <p className="text-caption font-semibold text-fg-mute">{monthLabel(a.key, t.locale)}</p>
            <TipRow swatch="bg-chart-in" value={money(a.income)} label={t.income} />
            <TipRow swatch="bg-chart-out" value={money(a.expense)} label={t.expenses} />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function TipRow({ swatch, value, label }: { swatch: string; value: string; label: string }) {
  return (
    <p className="flex items-center gap-2 mt-1">
      <span className={`w-3 h-0.5 rounded-full ${swatch}`} aria-hidden="true" />
      <span className="text-label font-bold text-fg num">{value}</span>
      <span className="text-caption text-fg-mute">{label}</span>
    </p>
  );
}

/** The balance at each month's end, as one line. */
export function BalanceChart({ points, selected, t, onPick }: ChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [active, setActive] = useState<number | null>(null);

  const values = points.map(p => p.end);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Not from zero: a balance chart is about the change. Padded so a flat line
  // still sits mid-plot instead of on an edge.
  const pad = Math.max((hi - lo) * 0.15, 5000);
  const ticks = niceTicks(lo - pad, hi + pad);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const plotW = width - PAD_L - PAD_R;
  const slot = plotW / points.length;
  const x = (i: number) => PAD_L + slot * i + slot / 2;
  const y = (v: number) => PAD_T + PLOT_H - ((v - yLo) / (yHi - yLo)) * PLOT_H;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.end).toFixed(1)}`).join('');
  const last = points.length - 1;
  const a = active !== null ? points[active] : null;
  const money = (c: number) => formatMoney(c, t.locale);

  return (
    <div ref={box} className="relative" onPointerLeave={() => setActive(null)}>
      <svg width={width} height={PAD_T + PLOT_H + AXIS_H} className="block overflow-visible" aria-hidden="true">
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD_L} x2={width - PAD_R} y1={y(v)} y2={y(v)} className="stroke-hairline" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-mute text-micro num">{compact(v, t.locale)}</text>
          </g>
        ))}
        {yLo < 0 && yHi > 0 && <line x1={PAD_L} x2={width - PAD_R} y1={y(0)} y2={y(0)} className="stroke-fg-faint" strokeWidth={1} />}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD_T} y2={PAD_T + PLOT_H} className="stroke-fg-faint" strokeWidth={1} />}
        <path d={d} fill="none" className="stroke-chart-line" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <text key={p.key} x={x(i)} y={PAD_T + PLOT_H + 15} textAnchor="middle"
            className={`text-micro ${p.key === selected ? 'fill-fg font-bold' : 'fill-fg-mute'}`}>{narrowMonth(p.key, t.locale)}</text>
        ))}
        {[...new Set([last, active ?? last])].map(i => (
          <circle key={i} cx={x(i)} cy={y(points[i].end)} r={5} className="fill-chart-line stroke-surface" strokeWidth={2} />
        ))}
      </svg>
      {/* The last value, labelled directly — the one the reader came for. */}
      {active === null && (
        <span
          className="absolute text-caption font-bold text-fg num whitespace-nowrap"
          style={{ right: Math.max(0, width - x(last) - 4), top: Math.max(0, y(points[last].end) - 26) }}
        >
          {money(points[last].end)}
        </span>
      )}
      <div className="absolute inset-0 flex" style={{ paddingLeft: PAD_L, paddingRight: PAD_R }}>
        {points.map((p, i) => (
          <button
            key={p.key}
            type="button"
            className="flex-1 h-full rounded-sm focus-visible:ring-focus"
            aria-label={`${monthLabel(p.key, t.locale)}: ${t.balanceOverTime} ${money(p.end)}`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => onPick(p.key)}
          />
        ))}
      </div>
      {a && active !== null && (
        <Tooltip x={x(active)} width={width}>
          <p className="text-caption font-semibold text-fg-mute">{monthLabel(a.key, t.locale)}</p>
          <TipRow swatch="bg-chart-line" value={money(a.end)} label={t.balanceEnd} />
        </Tooltip>
      )}
    </div>
  );
}
