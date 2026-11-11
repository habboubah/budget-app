import { AppData, Category, Entry, MonthKey } from '../types';
import { addMonths, intervalOf } from '../logic';
import { budgetOf } from '../data/defaults';

/*
 * 50/30/20 — of net income, ~50 % for needs, ~30 % for wants, ~20 % saved —
 * and what is promised every month before it begins (the commitments).
 */

export interface BudgetSplit {
  income: number;
  needs: number;
  wants: number;
  /** income − needs − wants (money moved into savings counts here); negative when more went out than came in. */
  saved: number;
}

/** 50/30/20: the average month split into needs, wants and what was left or put aside. */
export function budgetSplit(entries: Entry[], categories: Category[], months: MonthKey[]): BudgetSplit {
  const inRange = new Set(months);
  const byId = new Map(categories.map(c => [c.id, c]));
  let income = 0;
  let needs = 0;
  let wants = 0;
  for (const e of entries) {
    if (!inRange.has(e.month)) continue;
    const c = byId.get(e.categoryId);
    if (!c) continue;
    if (c.kind === 'income') income += e.amount;
    else if (budgetOf(c) === 'need') needs += e.amount;
    else if (budgetOf(c) === 'want') wants += e.amount;
    // 'save' (an ETF plan, a savings account): not spent — it stays in `saved`.
  }
  const n = Math.max(1, months.length);
  const out = { income: Math.round(income / n), needs: Math.round(needs / n), wants: Math.round(wants / n) };
  return { ...out, saved: out.income - out.needs - out.wants };
}

export type Bucket = 'need' | 'want' | 'save';

export interface RulePart {
  bucket: Bucket;
  /** The rule's share of income: 50, 30, 20. */
  target: number;
  /** Per month on average: needs or wants spent, or what was saved (income − needs − wants). */
  amount: number;
  /** The target share of the average income, in cents. */
  budget: number;
  /** amount / income in %, or null without income. */
  share: number | null;
  /** Needs and wants within their share, saving at least its share. */
  ok: boolean;
  /** Its biggest categories, per month on average (for saving: the "save" ones, an ETF plan). */
  top: { category: Category; amount: number }[];
}

export interface RuleCheck {
  income: number;
  parts: RulePart[];
  /** How many of the three the average month meets. */
  met: number;
  /** Each month with income: how many of the three it met. */
  months: { key: MonthKey; met: number }[];
}

const TARGETS: [Bucket, number][] = [['need', 50], ['want', 30], ['save', 20]];

function ruleParts(split: BudgetSplit, top: (b: Bucket) => RulePart['top'] = () => []): RulePart[] {
  const amounts: Record<Bucket, number> = { need: split.needs, want: split.wants, save: split.saved };
  return TARGETS.map(([bucket, target]) => {
    const amount = amounts[bucket];
    const budget = Math.round((split.income * target) / 100);
    const ok = split.income > 0 && (bucket === 'save' ? amount >= budget : amount <= budget);
    return { bucket, target, amount, budget, share: split.income > 0 ? (amount / split.income) * 100 : null, ok, top: top(bucket) };
  });
}

/**
 * How the average month (over `months`) keeps to 50/30/20: each part against
 * its share of income — in % and in euros — with its biggest categories, how
 * many of the three it meets, and the same count month by month.
 */
export function budgetRule(all: Entry[], categories: Category[], months: MonthKey[]): RuleCheck {
  const inRange = new Set(months);
  // The months' entries once; every split below reads only those.
  const entries = all.filter(e => inRange.has(e.month));
  const split = budgetSplit(entries, categories, months);
  const n = Math.max(1, months.length);
  const sums = new Map<string, number>();
  for (const e of entries) if (inRange.has(e.month)) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
  const top = (b: Bucket) => categories
    .filter(c => c.kind === 'expense' && budgetOf(c) === b && (sums.get(c.id) ?? 0) > 0)
    .map(c => ({ category: c, amount: Math.round((sums.get(c.id) ?? 0) / n) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const parts = ruleParts(split, top);
  const perMonth = months
    .map(key => ({ key, split: budgetSplit(entries, categories, [key]) }))
    .filter(m => m.split.income > 0)
    .map(m => ({ key: m.key, met: ruleParts(m.split).filter(p => p.ok).length }));
  return { income: split.income, parts, met: parts.filter(p => p.ok).length, months: perMonth };
}

export interface Commitment {
  name: string;
  categoryId: string;
  /** Per month (a yearly one spread over twelve). */
  monthly: number;
  yearly: number;
  repeat: 'monthly' | 'yearly';
}

/**
 * Recurring expenses: every monthly entry of `month` and every yearly entry
 * of the twelve months up to it — what is promised before the month begins.
 */
export function commitments(data: AppData, month: MonthKey): { items: Commitment[]; monthly: number; yearly: number } {
  const kind = new Map(data.categories.map(c => [c.id, c.kind]));
  const from = addMonths(month, -11);
  const items: Commitment[] = [];
  const seen = new Set<string>();
  for (const e of data.entries) {
    if (kind.get(e.categoryId) !== 'expense' || seen.has(e.seriesId)) continue;
    if (e.repeat === 'monthly' && e.month === month) {
      seen.add(e.seriesId);
      items.push({ name: e.name, categoryId: e.categoryId, monthly: e.amount, yearly: e.amount * 12, repeat: 'monthly' });
    } else if (e.repeat === 'yearly' && e.month >= from && e.month <= month) {
      seen.add(e.seriesId);
      // A quarterly bill comes four times a year, a half-yearly one twice (schema 24).
      const n = intervalOf(e);
      items.push({ name: e.name, categoryId: e.categoryId, monthly: Math.round(e.amount / n), yearly: Math.round(e.amount * 12 / n), repeat: 'yearly' });
    }
  }
  items.sort((a, b) => b.yearly - a.yearly);
  return { items, monthly: items.reduce((s, i) => s + i.monthly, 0), yearly: items.reduce((s, i) => s + i.yearly, 0) };
}
