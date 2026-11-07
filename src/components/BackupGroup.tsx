import { useRef, useState } from 'react';
import { Download, FileDown, FileUp, Upload } from 'lucide-react';
import { AppData } from '../types';
import { Strings } from '../translations';
import { isoDay, makeBackup, parseBackup, toCsv } from '../logic';
import { downloadFile } from '../export';
import { Group, Row, IconTile } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';

/**
 * Sichern und übertragen → Datensicherung: everything as one JSON file,
 * loaded back the same way. → Excel: the old budget spreadsheet in, and
 * every entry out again as a CSV that opens in Excel.
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
        <Row label={t.exportData} leading={<IconTile icon={Download} hue="blue" />} onClick={exportNow} />
        <Row label={t.importData} leading={<IconTile icon={Upload} hue="sky" />} onClick={() => file.current?.click()} />
      </Group>
      <Group title={t.excelSection} footer={t.excelHint}>
        <Row label={t.importExcel} sub={t.importExcelSub} leading={<IconTile icon={FileUp} hue="leaf" />} onClick={onImportExcel} />
        <Row label={t.exportCsv} leading={<IconTile icon={FileDown} hue="mint" />} onClick={exportCsv} />
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
