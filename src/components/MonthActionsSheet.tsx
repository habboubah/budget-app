import { Camera, ChevronsDownUp, ChevronsUpDown, FileSpreadsheet, Repeat as RepeatIcon, Trash2, Wallet } from 'lucide-react';
import { MonthKey } from '../types';
import { monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Group, Row } from '../ui/Screen';

/** The month's "⋯": correct the opening balance, fetch missing recurring entries, fold all categories, import bank transactions, delete the month. */
export function MonthActionsSheet({ open, month, started, prevKey, missing, allCollapsed, t, onClose, onOpening, onPull, onCollapseAll, onImportCsv, onImportPhoto, onDelete }: {
  open: boolean;
  month: MonthKey;
  started: boolean;
  prevKey?: MonthKey;
  /** Recurring entries of earlier months this month doesn't have yet. */
  missing: number;
  /** Every category is folded down — the row offers to unfold them all. */
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
  const run = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <Sheet open={open} title={monthLabel(month, t.locale)} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4">
        <Group>
          <Row
            label={prevKey ? t.openingTitle : t.startingBalance}
            leading={<Wallet className="w-5 h-5 text-accent" aria-hidden="true" />}
            onClick={run(onOpening)}
          />
          {started && prevKey && (
            <Row
              label={fmt(t.pullRecurring, { month: monthLabel(prevKey, t.locale, 'long') })}
              sub={missing ? fmt(t.pullRecurringSub, { n: missing }) : t.nothingToPull}
              leading={<RepeatIcon className="w-5 h-5 text-accent" aria-hidden="true" />}
              onClick={missing ? run(onPull) : undefined}
            />
          )}
          {started && (
            <Row
              label={allCollapsed ? t.expandAll : t.collapseAll}
              leading={allCollapsed
                ? <ChevronsUpDown className="w-5 h-5 text-accent" aria-hidden="true" />
                : <ChevronsDownUp className="w-5 h-5 text-accent" aria-hidden="true" />}
              onClick={run(() => onCollapseAll(!allCollapsed))}
            />
          )}
        </Group>
        <Group>
          <Row
            label={t.importPhoto}
            sub={t.importPhotoSub}
            leading={<Camera className="w-5 h-5 text-accent" aria-hidden="true" />}
            onClick={run(onImportPhoto)}
          />
          <Row
            label={t.importCsv}
            sub={t.importCsvSub}
            leading={<FileSpreadsheet className="w-5 h-5 text-accent" aria-hidden="true" />}
            onClick={run(onImportCsv)}
          />
        </Group>
        {started && (
          <Group>
            <Row
              label={t.deleteMonth}
              sub={t.deleteMonthSub}
              danger
              leading={<Trash2 className="w-5 h-5 text-neg" aria-hidden="true" />}
              onClick={run(onDelete)}
            />
          </Group>
        )}
      </div>
    </Sheet>
  );
}
