import { useRef, useState } from 'react';
import { Download, FileDown, FileUp, Upload } from 'lucide-react';
import { AppData } from '../types';
import { Strings } from '../translations';
import { isoDay, makeBackup, parseBackup, toCsv } from '../logic';
import { downloadFile } from '../export';
import { Group, Row } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';

/**
 * Settings → Datensicherung: everything as one JSON file, loaded back the
 * same way. Settings → Excel: the old budget spreadsheet in, and every entry
 * out again as a CSV that opens in Excel.
 */
export function BackupGroup({ data, language, t, onImport, onImportExcel, toast }: {
  data: AppData;
  language: string;
  t: Strings;
  onImport: (data: AppData) => void;
  /** Opens the file picker for an .xlsx (handled in App, so the intro card can use it too). */
  onImportExcel: () => void;
  toast: (label: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);

  const exportNow = () => {
    void downloadFile(`spartopf-backup-${isoDay()}.json`, JSON.stringify(makeBackup(data), null, 2), 'application/json')
      .catch(() => { /* share sheet dismissed */ });
  };

  const exportCsv = () => {
    const csv = toCsv(data, language, {
      header: t.csvHeader.split(';'),
      income: t.csvIncome,
      expense: t.csvExpense,
      paid: t.paidState,
      open: t.open,
      repeat: { none: t.repeatNone, monthly: t.repeatMonthly, yearly: t.repeatYearly },
    });
    void downloadFile(`spartopf-${isoDay()}.csv`, csv, 'text/csv').catch(() => {});
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const parsed = parseBackup(await f.text());
    if (file.current) file.current.value = '';
    if (!parsed.ok) { toast(t[parsed.error]); return; }
    setPending(parsed.data);
  };

  return (
    <>
      <Group title={t.backup} footer={t.backupHint}>
        <Row label={t.exportData} leading={<Download className="w-5 h-5 text-accent" aria-hidden="true" />} onClick={exportNow} />
        <Row label={t.importData} leading={<Upload className="w-5 h-5 text-accent" aria-hidden="true" />} onClick={() => file.current?.click()} />
      </Group>
      <Group title={t.excelSection} footer={t.excelHint}>
        <Row label={t.importExcel} sub={t.importExcelSub} leading={<FileUp className="w-5 h-5 text-accent" aria-hidden="true" />} onClick={onImportExcel} />
        <Row label={t.exportCsv} leading={<FileDown className="w-5 h-5 text-accent" aria-hidden="true" />} onClick={exportCsv} />
      </Group>
      <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onFile(e.target.files?.[0])} />
      <Confirm
        open={!!pending}
        title={t.importConfirmTitle}
        body={t.importConfirmBody}
        confirmLabel={t.importData}
        cancelLabel={t.cancel}
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) onImport(pending); setPending(null); toast(t.importDone); }}
      />
    </>
  );
}
