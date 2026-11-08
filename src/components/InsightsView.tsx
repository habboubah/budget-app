import { useMemo } from 'react';
import { Category, MonthKey } from '../types';
import { monthKeyOf, monthLabel } from '../logic';
import { Book, Insight, contractHints, financeCheck, finishedKeys, outlook, pace, savings, upToNow } from '../insights';
import { ContractItem, contractItems } from '../contracts';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { BudgetsCard } from './BudgetsCard';
import { ContractsCard } from './ContractsCard';
import { PaceCard } from './PaceCard';
import { OutlookCard } from './OutlookCard';
import { FinanceCheckCard } from './FinanceCheckCard';
import { Explain } from './ExplainSheet';

interface Props {
  book: Book;
  language: string;
  t: Strings;
  /** Dismissed hints (a view preference). */
  hidden: string[];
  /** Set or change a category's monthly budget. */
  onBudget: (c: Category) => void;
  /** Open a recurring cost's contract details. */
  onContract: (item: ContractItem) => void;
  /** Push the whole list of contracts. */
  onContractsAll: () => void;
  /** Push a month's report. */
  onReport: (m: MonthKey) => void;
  /** A missing regular payment's "Eintragen": the entry sheet, prefilled and open. */
  onAdd: (i: Insight) => void;
  /** Push "Demnächst fällig". */
  onDue: () => void;
  onExplain: (e: Explain) => void;
}

/**
 * Planen answers *Wie läuft es, was kommt, was tue ich?* (§7), in this
 * order, one time scope per card: *November bis heute* (everyday spending
 * against a usual month — it needs no setup, so it comes before budgets),
 * the running month's Budgets, *Ausblick* (the next twelve months), *Abos &
 * Verträge* with what is new and what is missing, then the slots for plans
 * 11 (Rücklage), 12 (Spartöpfe) and 31 (Schulden), and *Finanz-Check*.
 * Looking back is Statistik's.
 */
export function InsightsView({ book, language, t, hidden, onBudget, onContract, onContractsAll, onReport, onAdd, onDue, onExplain }: Props) {
  const data = book.data;
  const today = new Date();
  const current = monthKeyOf(today);
  const p = useMemo(() => pace(book, today), [book]);
  const ahead = useMemo(() => outlook(book, today), [book]);
  const check = useMemo(() => financeCheck(book, today), [book]);
  const latest = [...book.months].reverse().find(k => k <= current) ?? book.months[book.months.length - 1];
  const contracts = useMemo(() => (latest ? contractItems(data, latest, today) : []), [data, latest]);
  const hints = useMemo(() => contractHints(book, today, hidden), [book, hidden]);
  const finished = finishedKeys(book, today, 6);
  const averageIncome = savings(book.points.filter(x => finished.includes(x.key))).averageIncome;
  const chart = useMemo(() => upToNow(book.points, today).slice(-12), [book]);

  if (!book.points.some(x => x.income || x.expense)) {
    return (
      <Screen title={t.insightsTitle} tabbed>
        <Empty emoji="💡" title={fmt(t.statsEmptyTitle, { month: monthLabel(current, t.locale) })} body={t.insightsEmpty} />
      </Screen>
    );
  }

  return (
    <Screen title={t.insightsTitle} tabbed>
      {book.months.includes(current) && (p.spent > 0 || p.verdict === 'stale') && (
        <PaceCard pace={p} categories={data.categories} language={language} t={t} onReport={() => onReport(current)} onExplain={onExplain} />
      )}

      <BudgetsCard data={data} month={current} language={language} t={t} onBudget={onBudget} />

      {ahead && <OutlookCard outlook={ahead} categories={data.categories} t={t} onExplain={onExplain} />}

      <ContractsCard items={contracts} categories={data.categories} averageIncome={averageIncome}
        fresh={hints.fresh} missing={hints.missing} t={t} onOpen={onContract} onAll={onContractsAll} onAdd={onAdd} />

      {/* Slots: Rücklage für jährliche Kosten (plan 11), Spartöpfe (plan 12), Schulden (plan 31). */}

      {check ? (
        <FinanceCheckCard check={check} points={chart} data={data} language={language} t={t} onReport={onReport} onDue={onDue} onExplain={onExplain} />
      ) : (
        <p className="px-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>
      )}
    </Screen>
  );
}
