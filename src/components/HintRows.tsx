import { CSSProperties, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, EyeOff, Info, MoreHorizontal } from 'lucide-react';
import { Category } from '../types';
import { displayName, formatMoneyApprox, monthLabel, monthSpanLabel } from '../logic';
import { Insight } from '../insights';
import { insightText } from '../insightText';
import { Strings, fmt } from '../translations';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { Picture } from '../ui/Picture';
import { tapLight } from '../ui/haptics';
import { MiniBars } from './Charts';
import { Explain } from './ExplainSheet';

/** The tone's ink: amber for "more", green for "better", quiet for news and records — never red. */
const TONE = { warn: 'text-warn', pos: 'text-pos', neutral: 'text-fg' } as const;

/** The two bars a hint compares, where it compares two amounts (§9.2). */
function bars(i: Insight, t: Strings): { label: string; value: number; text: string; faded?: boolean }[] | null {
  const money = (c: number) => formatMoneyApprox(c, t.locale);
  const month = (k: string) => monthLabel(k, t.locale, 'month');
  const v = i.values;
  if (i.kind === 'unusual') {
    const now = i.variant === 'running' ? fmt(t.catSoFar, { month: month(i.months[0]) }) : month(i.months[0]);
    return [{ label: now, value: v.total, text: money(v.total) }, { label: t.reportUsual, value: v.usual, text: money(v.usual), faded: true }];
  }
  if (i.kind === 'trend' && i.basis) {
    return [
      { label: monthSpanLabel(i.months, t.locale), value: v.recent, text: money(v.recent) },
      { label: monthSpanLabel(i.basis, t.locale), value: v.earlier, text: money(v.earlier), faded: true },
    ];
  }
  if (i.kind === 'betterMonth') {
    return [{ label: month(i.months[0]), value: v.saved, text: money(v.saved) }, { label: t.reportUsual, value: v.usual, text: money(v.usual), faded: true }];
  }
  return null;
}

/**
 * One hint: its category's picture, the finding in one sentence (an arrow
 * when it says up or down), what it is measured on, two small bars where it
 * compares amounts, its next step as a 44 pt text button, and "⋯" with
 * *Ausblenden* and *Wie berechnet?*.
 */
export function HintRow({ insight: i, category, language, t, onAction, onHide, onHow, compact }: {
  insight: Insight;
  category?: Category;
  language: string;
  t: Strings;
  onAction?: (i: Insight) => void;
  onHide?: (i: Insight) => void;
  onHow?: (i: Insight) => void;
  /** In a report: the sentence and its basis only. */
  compact?: boolean;
}) {
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const words = insightText(i, t, id => displayName(category?.id === id ? category.names : undefined, language) || id);
  // An arrow says up or down beside the words (colour is never alone); a month's result and a record go without.
  const Arrow = i.kind === 'betterMonth' || i.kind === 'record' ? null
    : i.tone === 'warn' ? ArrowUpRight : i.tone === 'pos' ? ArrowDownRight : null;
  const mini = compact ? null : bars(i, t);
  const name = category ? displayName(category.names, language) : i.name ?? '';
  // A hint about a whole month has no category: a calendar, or a notepad for data to check.
  const emoji = category?.emoji ?? (i.kind === 'dataCheck' ? '📝' : i.categoryId ? undefined : '📅');
  return (
    <li className="py-3 flex items-start gap-3">
      <Picture emoji={emoji} name={name || '•'} hue={category?.hue} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={`flex items-start gap-1 text-label font-semibold tabular-nums ${TONE[i.tone]}`}>
          {Arrow && <Arrow className="w-4 h-4 mt-[0.2em] shrink-0" strokeWidth={2.4} aria-hidden="true" />}
          <span className="min-w-0 wrap-prose">{words.text}</span>
        </p>
        {words.basis && <p className="text-caption text-fg-mute mt-0.5 tabular-nums wrap-prose">{words.basis}</p>}
        {mini && <MiniBars hue={category?.hue} rows={mini} />}
        {!compact && words.action && onAction && (
          <button
            type="button"
            onClick={() => { tapLight(); onAction(i); }}
            className="mt-1 -ms-2 h-tap min-w-tap px-2 text-start rounded-sm text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus"
          >
            {words.action}
          </button>
        )}
      </div>
      {!compact && (onHide || onHow) && (
        <>
          <IconButton
            label={fmt(t.hintMenu, { hint: words.text })}
            icon={MoreHorizontal}
            aria-haspopup="menu"
            className="-me-2 -mt-2"
            onClick={e => setMenuAt(e.currentTarget)}
          />
          <Menu
            anchor={menuAt}
            label={fmt(t.hintMenu, { hint: words.text })}
            groups={[[
              ...(onHow ? [{ key: 'how', label: t.hintHow, icon: Info, onSelect: () => onHow(i) }] : []),
              ...(onHide ? [{ key: 'hide', label: t.hintHide, icon: EyeOff, onSelect: () => onHide(i) }] : []),
            ]]}
            onClose={() => setMenuAt(null)}
          />
        </>
      )}
    </li>
  );
}

/** A hint's "Wie berechnet?": the rule behind its kind, its own sentence, the months it is measured on. */
export function hintExplain(i: Insight, t: Strings, categoryName: (id: string) => string): Explain {
  const words = insightText(i, t, categoryName);
  const material = formatMoneyApprox(i.values.material ?? 2500, t.locale);
  const definition = {
    unusual: fmt(t.explainHintUnusual, { material }), trend: t.explainHintTrend, betterMonth: fmt(t.explainHintMonth, { material }),
    record: t.explainHintRecord, dataCheck: t.explainHintData, bigExpense: t.explainHintBig, priceChange: t.explainHintPrice,
    newRecurring: t.explainHintNew, missing: t.explainHintMissing,
  }[i.kind];
  const months = [...(i.basis ?? []), ...i.months].sort();
  return {
    title: words.text,
    definition,
    ...(words.basis ? { calc: [words.basis] } : {}),
    ...(months.length ? { months: fmt(t.explainMonths, { span: monthSpanLabel([...new Set(months)], t.locale) }) } : {}),
  };
}

/** *Das fällt auf* on Statistik: the top three hints, hidden when there is nothing to say. No period control — each row names its months. */
export function HighlightsCard({ items, categories, language, t, onAction, onHide, onHow }: {
  items: Insight[];
  categories: Category[];
  language: string;
  t: Strings;
  onAction: (i: Insight) => void;
  onHide: (i: Insight) => void;
  onHow: (i: Insight) => void;
}) {
  if (!items.length) return null;
  const byId = new Map(categories.map(c => [c.id, c]));
  return (
    <Card title={t.highlightsTitle}>
      <ul className="-my-3 divide-hairline-inset" style={{ '--sep': '48px' } as CSSProperties}>
        {items.map(i => (
          <HintRow key={i.id} insight={i} category={i.categoryId ? byId.get(i.categoryId) : undefined} language={language} t={t}
            onAction={onAction} onHide={onHide} onHow={onHow} />
        ))}
      </ul>
    </Card>
  );
}
