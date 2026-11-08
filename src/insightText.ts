import { formatMoney, formatMoneyApprox, formatMoneyWhole, formatPercent, monthLabel, monthSpanLabel } from './logic';
import { Insight } from './insights';
import { Strings, fmt } from './translations';

/*
 * A hint in words: the rules (src/insights/highlights.ts) give data, this
 * picks the sentence for its kind and variant and formats the numbers —
 * rounded in sentences (no cents from 10 €), exact amounts stay on the
 * month page. Pure, so every kind is tested in every language.
 */

export interface InsightWords {
  /** The finding, one sentence. */
  text: string;
  /** What it is measured on ("Verglichen mit Mai – Oktober"). */
  basis?: string;
  /** The next step's label. */
  action?: string;
}

export function insightText(i: Insight, t: Strings, categoryName: (id: string) => string): InsightWords {
  const money = (c: number) => formatMoneyApprox(Math.abs(c), t.locale);
  const month = (k = i.months[0]) => monthLabel(k, t.locale, 'name');
  const v = i.values;
  const category = i.categoryId ? categoryName(i.categoryId) : '';
  const span = i.basis?.length ? monthSpanLabel(i.basis, t.locale) : '';
  const compared = span ? fmt(t.hintBasisUsual, { span }) : undefined;
  const action = i.action ? {
    category: t.hintActionCategory, budget: t.hintActionBudget, month: t.hintActionMonth, report: t.hintActionReport,
    add: t.hintActionAdd, contracts: t.hintActionContracts,
  }[i.action.kind] : undefined;
  const say = (text: string, basis?: string): InsightWords => ({ text, ...(basis ? { basis } : {}), ...(action ? { action } : {}) });

  switch (i.kind) {
    case 'unusual':
      if (i.variant === 'running') return say(fmt(t.hintUnusualRunning, { category, total: money(v.total), usual: money(v.usual) }), compared);
      return say(fmt(i.variant === 'more' ? t.hintUnusualMore : t.hintUnusualLess, { category, diff: money(v.diff), month: month() }), compared);
    case 'trend':
      return say(
        fmt(i.variant === 'up' ? t.hintTrendUp : t.hintTrendDown, { category, month: month(), diff: money(v.diff) }),
        fmt(t.hintBasisTrend, { recent: monthSpanLabel(i.months, t.locale), earlier: span }),
      );
    case 'betterMonth':
      return say(fmt(i.variant === 'better' ? t.hintBetterMonth : t.hintWorseMonth, { month: month(), diff: money(v.diff) }), compared);
    case 'record':
      return say(fmt(i.variant === 'best' ? t.hintRecordBest : t.hintRecordWorst, {
        since: month(i.basis?.[0]), month: month(), saved: formatMoneyApprox(v.saved, t.locale),
      }), compared);
    case 'dataCheck':
      return i.variant === 'stale'
        ? say(fmt(t.hintDataStale, { days: v.days }))
        : say(fmt(t.hintDataOpen, { month: month(), count: v.count, sum: money(v.sum) }));
    case 'bigExpense':
      return say(fmt(t.hintBigExpense, { name: i.name ?? '', amount: money(v.amount), pct: formatPercent(v.pct, t.locale), month: month() }));
    case 'priceChange':
      return say(fmt(t.hintPriceChange, {
        name: i.name ?? '', before: formatMoney(v.before, t.locale), now: formatMoney(v.now, t.locale),
        yearly: formatMoneyWhole(v.yearly, t.locale, 'exceptZero'),
      }), fmt(t.hintBasisPrice, { month: month() }));
    case 'newRecurring':
      return say(fmt(t.hintNewRecurring, { month: month(), name: i.name ?? '', amount: formatMoney(v.amount, t.locale) }));
    case 'missing':
      return say(fmt(i.variant === 'income' ? t.hintMissingIncome : t.hintMissing, { name: i.name ?? '', usual: formatMoney(v.usual, t.locale) }),
        fmt(t.hintBasisMissing, { day: v.day }));
  }
}
