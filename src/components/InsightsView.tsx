import React, { useMemo } from 'react';
import { Category, MonthKey } from '../types';
import { formatMoney, monthKeyOf, monthLabel } from '../logic';
import { ChevronRight, Wallet } from 'lucide-react';
import { Book, Insight, contractHints, financeCheck, finishedKeys, outlook, pace, runway, savings, upToNow, yearlyReserve } from '../insights';
import { ContractItem, contractItems } from '../contracts';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { BudgetsCard } from './BudgetsCard';
import { ContractsCard } from './ContractsCard';
import { PaceCard } from './PaceCard';
import { OutlookCard } from './OutlookCard';
import { RunwayCard } from './RunwayCard';
import { ReserveCard } from './ReserveCard';
import { GoalsCard } from './GoalsCard';
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
  /** Push the Spartöpfe screen (plan 12). */
  onGoals: () => void;
  /** Turn the yearly reserve into a savings goal (plans 11 + 12). */
  onReserveGoal: (target: number, due?: MonthKey) => void;
  /** *Kann ich mir das leisten?* under the Ausblick. */
  onWhatIf: () => void;
  /** Reisen und Projekte: a card once there is one. */
  projects?: React.ReactNode;
  onExplain: (e: Explain) => void;
  /** Once there is more than one account (plan 30): all of them together, "Vermögen", and the way to the accounts. */
  wealth?: { now: number; count: number; onOpen: () => void };
  /** Schulden (plan 31): App builds the card, only once a debt exists. */
  debts?: React.ReactNode;
}

/**
 * Planen answers *Wie läuft es, was kommt, was tue ich?* (§7), in this
 * order, one time scope per card: *November bis heute* (everyday spending
 * against a usual month — it needs no setup, so it comes before budgets),
 * the running month's Budgets, *Nächste 30 Tage* (the account day by day,
 * from what is still open), *Ausblick* (the next twelve months), *Abos &
 * Verträge* with what is new and what is missing, then the slots for plans
 * 11 (Rücklage), 12 (Spartöpfe) and 31 (Schulden), and *Finanz-Check*.
 * Looking back is Statistik's.
 */
export function InsightsView({ book, language, t, hidden, onBudget, onContract, onContractsAll, onReport, onAdd, onDue, onGoals, onReserveGoal, onWhatIf, onExplain, wealth, debts, projects }: Props) {
  const data = book.data;
  const today = new Date();
  const current = monthKeyOf(today);
  const p = useMemo(() => pace(book, today), [book]);
  const next = useMemo(() => runway(book, today), [book]);
  const ahead = useMemo(() => outlook(book, today), [book]);
  const reserve = useMemo(() => yearlyReserve(book, today, ahead), [book, ahead]);
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

      {next && <RunwayCard runway={next} t={t} onDue={onDue} onExplain={onExplain} />}

      {ahead && <OutlookCard outlook={ahead} categories={data.categories} t={t} onExplain={onExplain} onWhatIf={onWhatIf} />}

      <ContractsCard items={contracts} categories={data.categories} averageIncome={averageIncome}
        fresh={hints.fresh} missing={hints.missing} t={t} onOpen={onContract} onAll={onContractsAll} onAdd={onAdd} />

      {reserve && (
        <ReserveCard
          reserve={reserve}
          categories={data.categories}
          t={t}
          onCreateGoal={() => onReserveGoal(reserve.upcoming.reduce((s, u) => s + u.amount, 0) || reserve.monthly * 12, reserve.upcoming[0]?.month)}
        />
      )}

      <GoalsCard data={data} t={t} today={today} onOpen={onGoals} />

      {wealth && (
        <button
          type="button"
          onClick={wealth.onOpen}
          className="w-full rounded-md bg-surface card-edge px-[16px] py-3.5 flex items-center gap-3 text-start active:bg-surface-2 transition-colors focus-visible:ring-focus"
        >
          <span className="w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
            <Wallet className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block eyebrow text-fg-mute">{t.wealth}</span>
            <span className="block text-body text-fg wrap-compound">
              {fmt(t.wealthLine, { amount: formatMoney(wealth.now, t.locale), n: wealth.count })}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
        </button>
      )}

      {debts}
      {projects}

      {check ? (
        <FinanceCheckCard check={check} points={chart} data={data} language={language} t={t} onReport={onReport} onDue={onDue} onExplain={onExplain} />
      ) : (
        <p className="px-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>
      )}
    </Screen>
  );
}
