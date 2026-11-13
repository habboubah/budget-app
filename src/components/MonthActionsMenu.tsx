import { useRef, useState } from 'react';
import { ArrowLeftRight, BarChart3, ChevronsDownUp, ChevronsUpDown, Download, MoreHorizontal, Repeat as RepeatIcon, Scale, Trash2, Wallet } from 'lucide-react';
import { MonthKey } from '../types';
import { monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Menu, MenuItem } from '../ui/Menu';

/**
 * The month's "⋯", as an iOS pull-down menu — four rows (plan 39): the
 * month's report, the balance (match it against the bank; or, before the
 * book has one, enter it), everything that imports on one sheet, and *Mehr*
 * for what is needed now and then: fetch missing recurring entries, fold all
 * categories, delete the month. *Umbuchen* joins them once the book has a
 * second account (plan 30).
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
  // *Mehr* opens a second menu from the same button; the first has closed by then.
  const button = useRef<HTMLElement | null>(null);
  if (anchor) button.current = anchor;
  const [more, setMore] = useState<HTMLElement | null>(null);

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
    ...(started ? [{ key: 'more', label: t.more, icon: MoreHorizontal, onSelect: () => setMore(button.current) }] : []),
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
  return (
    <>
      <Menu anchor={anchor} label={label} groups={[main]} onClose={onClose} />
      <Menu anchor={more} label={`${label} – ${t.more}`} groups={[rest, danger]} onClose={() => setMore(null)} />
    </>
  );
}
