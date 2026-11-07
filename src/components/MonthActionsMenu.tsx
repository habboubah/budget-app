import { Camera, ChevronsDownUp, ChevronsUpDown, FileSpreadsheet, Repeat as RepeatIcon, Trash2, Wallet } from 'lucide-react';
import { MonthKey } from '../types';
import { monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Menu, MenuItem } from '../ui/Menu';

/**
 * The month's "⋯", as an iOS pull-down menu: correct the opening balance,
 * fetch missing recurring entries, fold all categories; import bank
 * transactions; delete the month.
 */
export function MonthActionsMenu({ anchor, month, started, prevKey, missing, allCollapsed, t, onClose, onOpening, onPull, onCollapseAll, onImportCsv, onImportPhoto, onDelete }: {
  /** The "⋯" button it opens from; null while closed. */
  anchor: HTMLElement | null;
  month: MonthKey;
  started: boolean;
  prevKey?: MonthKey;
  /** Recurring entries of earlier months this month doesn't have yet. */
  missing: number;
  /** Every category is folded down — the item offers to unfold them all. */
  allCollapsed: boolean;
  t: Strings;
  onClose: () => void;
  onOpening: () => void;
  onPull: () => void;
  onCollapseAll: (collapse: boolean) => void;
  /** Bank transactions from a CSV export, or from a photo / screenshot. */
  onImportCsv: () => void;
  onImportPhoto: () => void;
  onDelete: () => void;
}) {
  const month1: MenuItem[] = [
    { key: 'opening', label: prevKey ? t.openingTitle : t.startingBalance, icon: Wallet, onSelect: onOpening },
  ];
  if (started && prevKey) {
    month1.push({
      key: 'pull',
      label: fmt(t.pullRecurring, { month: monthLabel(prevKey, t.locale, 'long') }),
      sub: missing ? fmt(t.pullRecurringSub, { n: missing }) : t.nothingToPull,
      icon: RepeatIcon,
      disabled: !missing,
      onSelect: onPull,
    });
  }
  if (started) {
    month1.push({
      key: 'fold',
      label: allCollapsed ? t.expandAll : t.collapseAll,
      icon: allCollapsed ? ChevronsUpDown : ChevronsDownUp,
      onSelect: () => onCollapseAll(!allCollapsed),
    });
  }
  const imports: MenuItem[] = [
    { key: 'photo', label: t.importPhoto, sub: t.importPhotoSub, icon: Camera, onSelect: onImportPhoto },
    { key: 'csv', label: t.importCsv, sub: t.importCsvSub, icon: FileSpreadsheet, onSelect: onImportCsv },
  ];
  const danger: MenuItem[] = started
    ? [{ key: 'delete', label: t.deleteMonth, sub: t.deleteMonthSub, icon: Trash2, destructive: true, onSelect: onDelete }]
    : [];
  return <Menu anchor={anchor} label={fmt(t.monthActionsOf, { month: monthLabel(month, t.locale) })} groups={[month1, imports, danger]} onClose={onClose} />;
}
