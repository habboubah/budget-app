import { BudgetStatus } from './budgets';
import { formatMoneyShort } from './logic';
import { Strings, fmt } from './translations';

/** "Budget 300 €" — or "Jahresbudget 600 €" for a budget that runs over the year (schema 25). */
export function budgetLine(t: Strings, s: Pick<BudgetStatus, 'limit' | 'period'>): string {
  return fmt(s.period === 'year' ? t.budgetLineYear : t.budgetLine, { amount: formatMoneyShort(s.limit, t.locale) });
}

/** "inkl. 45 € Übertrag" / "abzgl. 20 € Übertrag" — what a rollover budget took over from the months before. */
export function budgetCarried(t: Strings, s: Pick<BudgetStatus, 'carried'>): string {
  return fmt(s.carried > 0 ? t.budgetCarriedPlus : t.budgetCarriedMinus, { amount: formatMoneyShort(Math.abs(s.carried), t.locale) });
}
