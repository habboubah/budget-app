import React, { useMemo } from 'react';
import { Category, MonthKey } from '../types';
import { formatMoney, formatMoneyShort, formatMoneyWhole, monthKeyOf, monthLabel } from '../logic';
import { ChevronRight, Wallet } from 'lucide-react';
import { Book, Insight, contractHints, financeCheck, finishedKeys, goalProgress, openGoals, outlook, pace, runway, savings, upToNow, yearlyReserve } from '../insights';
import { ContractItem, contractItems, contractTotals } from '../contracts';
import { monthBudgets } from '../budgets';
import { CardsOpen, cardOpen, toggleAllCards, toggleCard } from '../fold';
import { Strings, fmt } from '../translations';
import { Screen, Empty } from '../ui/Screen';
import { Fold, FoldAllButton, FoldCard } from '../ui/FoldCard';
import { BudgetsCard } from './BudgetsCard';
import { ContractsCard } from './ContractsCard';
import { PaceCard } from './PaceCard';
import { OutlookCard, outlookHeadline } from './OutlookCard';
import { RunwayCard, runwayHeadline } from './RunwayCard';
import { ReserveCard } from './ReserveCard';
import { GoalsCard } from './GoalsCard';
import { FinanceCheckCard, checkHeadline } from './FinanceCheckCard';
import { Explain } from './ExplainSheet';

interface Props {
  book: Book;
  language: string;
  t: Strings;
  /** Dismissed hints (a view preference). */
  hidden: string[];
  /** The cards as headlines (plan 39, src/fold.ts): null shows every card whole, a list the headlines with these opened. */
  open: CardsOpen;
  onOpen: (open: CardsOpen) => void;
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
  /** Reisen und Projekte: a card once there is one, and what it comes to in a line. */
  projects?: { card: React.ReactNode; headline?: string };
  onExplain: (e: Explain) => void;
  /** Once there is more than one account (plan 30): all of them together, "Vermögen", and the way to the accounts. */
  wealth?: { now: number; count: number; onOpen: () => void };
  /** Schulden (plan 31): App builds the card, only once a debt exists — and what it comes to in a line. */
  debts?: { card: React.ReactNode; headline?: string };
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
 *
 * The cards can show as headlines (plan 39): each one row with its finding —
 * "Budgets · 3 von 4 im Rahmen" — that opens in place, and the bar's button
 * folds or unfolds them all. A new book starts that way, with what has
 * nothing to say yet left out and two invitations in its place (*Budget
 * festlegen*, *Für etwas sparen?*); a book in use shows every card whole, as
 * it always did. *November bis heute* is the answer and never folds.
 */
export function InsightsView({ book, language, t, hidden, open, onOpen, onBudget, onContract, onContractsAll, onReport, onAdd, onDue, onGoals, onReserveGoal, onWhatIf, onExplain, wealth, debts, projects }: Props) {
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
  /** A card's fold, by its id; nothing folds while every card shows whole. */
  const fold = (id: string): Fold | undefined => (open === null ? undefined : { open: cardOpen(open, id), toggle: () => onOpen(toggleCard(open, id)), less: t.less });
  const headlines = open !== null;
  const budgets = useMemo(() => monthBudgets(data, current), [data, current]);
  const goals = useMemo(() => {
    const list = openGoals(data).map(g => ({ target: g.target, saved: goalProgress(data, g, today).saved }));
    return { count: list.length, saved: list.reduce((s, g) => s + g.saved, 0), target: list.reduce((s, g) => s + g.target, 0) };
  }, [data]);
  const totals = contractTotals(contracts);
  // The contracts in a line: how many, and what they come to a month — whole amounts, the year left to the card.
  const contractsLine = fmt(t.contractsSub, { n: contracts.length, monthly: formatMoneyWhole(totals.monthly, t.locale), yearly: '' }).split(' · ').slice(0, 2).join(' · ');
  const showContracts = !headlines || contracts.length > 0 || hints.fresh.length > 0 || hints.missing.length > 0;
  // The bar's button folds every card at once: worth its place once there are a few of them.
  const folding = [budgets.items.length > 0, !!next, !!ahead, showContracts, !!reserve, goals.count > 0, !!debts, !!projects, !!check].filter(Boolean).length;

  if (!book.points.some(x => x.income || x.expense)) {
    return (
      <Screen title={t.insightsTitle} tabbed>
        <Empty emoji="💡" title={fmt(t.statsEmptyTitle, { month: monthLabel(current, t.locale) })} body={t.insightsEmpty} />
      </Screen>
    );
  }

  return (
    <Screen
      title={t.insightsTitle}
      tabbed
      actions={(!headlines || folding >= 3) && <FoldAllButton whole={!headlines} foldLabel={t.foldCards} unfoldLabel={t.unfoldCards} onToggle={() => onOpen(toggleAllCards(open))} />}
    >
      {book.months.includes(current) && (p.spent > 0 || p.verdict === 'stale') && (
        <div data-tour="plan-pace"><PaceCard pace={p} categories={data.categories} language={language} t={t} onReport={() => onReport(current)} onExplain={onExplain} lean={headlines} /></div>
      )}

      {headlines && budgets.items.length === 0 ? (
        // No budget yet: the invitation, not a card about nothing.
        <div data-tour="plan-budgets"><BudgetsCard data={data} month={current} language={language} t={t} onBudget={onBudget} invite /></div>
      ) : (
        <FoldCard
          tour="plan-budgets" fold={fold('budgets')} title={t.budgetsTitle}
          headline={budgets.items.length ? fmt(t.budgetsWithin, { n: budgets.within, total: budgets.items.length }) : undefined}
          tone={budgets.within < budgets.items.length ? 'warn' : undefined}
        >
          {() => <BudgetsCard data={data} month={current} language={language} t={t} onBudget={onBudget} />}
        </FoldCard>
      )}

      {next && (
        <FoldCard tour="plan-runway" fold={fold('runway')} title={t.runwayTitle} headline={runwayHeadline(next, t)} tone={next.lowest.balance < 0 ? 'neg' : undefined}>
          {() => <RunwayCard runway={next} t={t} onDue={onDue} onExplain={onExplain} />}
        </FoldCard>
      )}

      {ahead && (
        <FoldCard
          tour="plan-outlook" fold={fold('outlook')} title={t.outlookTitle} headline={outlookHeadline(ahead, t)}
          tone={ahead.headline.kind === 'neg' ? 'neg' : ahead.headline.kind === 'warn' ? 'warn' : undefined}
        >
          {() => <OutlookCard outlook={ahead} categories={data.categories} t={t} onExplain={onExplain} onWhatIf={onWhatIf} />}
        </FoldCard>
      )}

      {/* As headlines, the contracts wait until there is one — or something to say about one. */}
      {showContracts && (
        <FoldCard tour="plan-contracts" fold={fold('contracts')} title={t.contractsTitle} headline={contracts.length ? contractsLine : undefined}>
          {() => (
            <ContractsCard items={contracts} categories={data.categories} averageIncome={averageIncome}
              fresh={hints.fresh} missing={hints.missing} t={t} onOpen={onContract} onAll={onContractsAll} onAdd={onAdd} />
          )}
        </FoldCard>
      )}

      {reserve && (
        <FoldCard
          fold={fold('reserve')} title={t.reserveTitle}
          headline={fmt(t.reserveMonthly, { amount: formatMoneyShort(reserve.monthly, t.locale) })} tone={reserve.shortfall ? 'warn' : undefined}
        >
          {() => (
            <ReserveCard
              reserve={reserve}
              categories={data.categories}
              t={t}
              onCreateGoal={() => onReserveGoal(reserve.upcoming.reduce((s, u) => s + u.amount, 0) || reserve.monthly * 12, reserve.upcoming[0]?.month)}
            />
          )}
        </FoldCard>
      )}

      {goals.count === 0 ? (
        // Without a goal the card is one quiet row already — the invitation.
        <div data-tour="plan-goals"><GoalsCard data={data} t={t} today={today} onOpen={onGoals} /></div>
      ) : (
        <FoldCard
          tour="plan-goals" fold={fold('goals')} title={t.goalsTitle}
          headline={fmt(t.goalSaved, { saved: formatMoneyShort(goals.saved, t.locale), target: formatMoneyShort(goals.target, t.locale) })}
        >
          {() => <GoalsCard data={data} t={t} today={today} onOpen={onGoals} />}
        </FoldCard>
      )}

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

      {debts && <FoldCard fold={fold('debts')} title={t.debtsCardTitle} headline={debts.headline}>{() => debts.card}</FoldCard>}
      {projects && <FoldCard fold={fold('projects')} title={t.projectsTitle} headline={projects.headline}>{() => projects.card}</FoldCard>}

      {check ? (
        <FoldCard fold={fold('check')} title={t.checkTitle} headline={checkHeadline(check, t)} tone={check.plus.ok ? undefined : 'warn'}>
          {() => <FinanceCheckCard check={check} points={chart} data={data} language={language} t={t} onReport={onReport} onDue={onDue} onExplain={onExplain} />}
        </FoldCard>
      ) : (
        <p className="px-2 text-label text-fg-mute wrap-prose">{t.needMoreMonths}</p>
      )}
    </Screen>
  );
}
