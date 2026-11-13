import { ArrowLeftRight, BarChart3, ChevronsDownUp, ChevronsUpDown, Download, Repeat as RepeatIcon, Scale, Trash2, Wallet } from 'lucide-react';
import { MonthKey } from '../types';
import { monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Menu, MenuItem } from '../ui/Menu';

/**
 * The month's "⋯", as an iOS pull-down menu, all of it on one level: the
 * month's report, the balance (match it against the bank; or, before the
 * book has one, enter it) and everything that imports — one row, its ways
 * are on the sheet it opens; then what is needed now and then: fetch missing
 * recurring entries, fold all categories; and, set apart, delete the month.
 * *Umbuchen* joins the first group once the book has a second account
 * (plan 30). (Plan 39 had put the second half behind a *Mehr* row; on
 * Ahmad's word, 13 November 2026, nothing is a second tap away any more —
 * only the imports keep their sheet.)
 */
export function MonthActionsMenu({ anchor, month, started, prevKey, missing, allCollapsed, given, t, onClose, onOpening, onReconcile, onBalanceNow, onPull, onCollapseAll, onImport, onDelete, onReport, onTransfer }: {
  /** The "⋯" button it opens from; null while closed. */
  anchor: HTMLElement | null;
  month: MonthKey;
  started: boolean;
  prevKey?: MonthKey;
  /** Recurring entries of earlier months this month doesn't have yet. */
  missing: number;
  /** Every category is folded down — the item offers to unfold them all. */
  allCollapsed: boolean;
  /** The book knows what is on the account (`balanceGiven`): there is something to check. */
  given: boolean;
  t: Strings;
  onClose: () => void;
  /** The opening balance and the bank match are one account's: not offered for "Alle Konten" (plan 30). */
  onOpening?: () => void;
  onReconcile?: () => void;
  /** No balance yet: the row asks for it instead. */
  onBalanceNow?: () => void;
  onPull: () => void;
  onCollapseAll: (collapse: boolean) => void;
  /** The sheet with every way to import (ImportSheet). */
  onImport: () => void;
  onDelete: () => void;
  /** The month's report (plan 13); only for a started month. */
  onReport?: () => void;
  /** Umbuchen (plan 30): once there is more than one account. */
  onTransfer?: () => void;
}) {
  const balance: MenuItem[] = started && !given && onBalanceNow
    ? [{ key: 'balanceNow', label: t.noBalanceAsk, icon: Wallet, onSelect: onBalanceNow }]
    : started && onReconcile
      ? [{ key: 'reconcile', label: t.balanceCheck, icon: Scale, onSelect: onReconcile }]
      : onOpening
        ? [{ key: 'opening', label: prevKey ? t.openingTitle : t.startingBalance, icon: Wallet, onSelect: onOpening }]
        : [];
  const main: MenuItem[] = [
    ...(started && onReport ? [{ key: 'report', label: t.reportTitle, sub: t.monthReportSub, icon: BarChart3, onSelect: onReport }] : []),
    ...balance,
    ...(started && onTransfer ? [{ key: 'transfer', label: t.transferNew, sub: t.transferNewSub, icon: ArrowLeftRight, onSelect: onTransfer }] : []),
    { key: 'import', label: t.importMenu, sub: t.importMenuSub, icon: Download, onSelect: onImport },
  ];

  const rest: MenuItem[] = [];
  if (started && prevKey) {
    rest.push({
      key: 'pull',
      label: fmt(t.pullRecurring, { month: monthLabel(prevKey, t.locale, 'long') }),
      sub: missing ? fmt(t.pullRecurringSub, { n: missing }) : t.nothingToPull,
      icon: RepeatIcon,
      disabled: !missing,
      onSelect: onPull,
    });
  }
  if (started) {
    rest.push({
      key: 'fold',
      label: allCollapsed ? t.expandAll : t.collapseAll,
      icon: allCollapsed ? ChevronsUpDown : ChevronsDownUp,
      onSelect: () => onCollapseAll(!allCollapsed),
    });
  }
  const danger: MenuItem[] = started
    ? [{ key: 'delete', label: t.deleteMonth, sub: t.deleteMonthSub, icon: Trash2, destructive: true, onSelect: onDelete }]
    : [];
  const label = fmt(t.monthActionsOf, { month: monthLabel(month, t.locale) });
  return <Menu anchor={anchor} label={label} groups={[main, rest, danger]} onClose={onClose} />;
}
