import { useRef, useState } from 'react';
import { Download, FileDown, FileUp, Upload } from 'lucide-react';
import { AppData } from '../types';
import { Strings } from '../translations';
import { isoDay, makeBackup, parseBackup, toCsv } from '../logic';
import { decryptBackup, encryptBackup, isEncryptedBackup } from '../crypto';
import { LIMITS } from '../limits';
import { downloadFile } from '../export';
import { Group, Row, IconTile } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';
import { BackupExportSheet } from './BackupExportSheet';
import { BackupPasswordSheet } from './BackupPasswordSheet';

/**
 * Sichern und übertragen → Datensicherung: everything as one file, encrypted
 * with a password by default (plan 04), loaded back the same way. → Excel: the
 * old budget spreadsheet in, and every entry out again as a CSV that opens in
 * Excel (not protected).
 */
export function BackupGroup({ data, language, t, onImport, onImportExcel, toast, onExported }: {
  data: AppData;
  language: string;
  t: Strings;
  onImport: (data: AppData) => void;
  /** Opens the file picker for an .xlsx (handled in App, so the intro card can use it too). */
  onImportExcel: () => void;
  toast: (label: string) => void;
  /** A copy just left the device — resets plan 03's 90-day nudge. */
  onExported?: () => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pending, setPending] = useState<AppData | null>(null);
  /** The text of an encrypted file waiting for its password. */
  const [locked, setLocked] = useState<string | null>(null);

  const backupJson = () => JSON.stringify(makeBackup(data), null, 2);

  const doExport = async (password: string | undefined) => {
    if (password === undefined) {
      await downloadFile(`spartopf-backup-${isoDay()}.json`, backupJson(), 'application/json');
    } else {
      const sealed = await encryptBackup(backupJson(), password);
      await downloadFile(`spartopf-backup-${isoDay()}.spartopf`, sealed, 'application/octet-stream');
    }
    onExported?.();
  };

  const exportCsv = () => {
    const csv = toCsv(data, language, {
      header: t.csvHeader.split(';'),
      income: t.csvIncome,
      expense: t.csvExpense,
      paid: t.paidState,
      open: t.open,
      repeat: { none: t.repeatNone, monthly: t.repeatMonthly, yearly: t.repeatYearly },
      currency: t.csvCurrency,
      tags: t.csvTags,
      transfer: t.transfer,
      account: t.account,
      mainAccount: t.accountMain,
    });
    void downloadFile(`spartopf-${isoDay()}.csv`, csv, 'text/csv').then(() => onExported?.()).catch(() => {});
  };

  /** parseBackup, then refuse an unreasonably large book (plan 05). */
  const accept = (parsed: ReturnType<typeof parseBackup>): boolean => {
    if (!parsed.ok) { toast(t[parsed.error]); return true; }
    if (parsed.data.entries.length > LIMITS.backupEntries) { toast(t.importTooLarge); return true; }
    setPending(parsed.data);
    return true;
  };

  /** A plain or encrypted backup, loaded from disk. */
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (file.current) file.current.value = '';
    if (f.size > LIMITS.backupBytes) { toast(t.importTooLarge); return; }
    const text = await f.text();
    if (isEncryptedBackup(text)) { setLocked(text); return; }
    accept(parseBackup(text));
  };

  const unlock = async (password: string): Promise<boolean> => {
    if (!locked) return false;
    try {
      const parsed = parseBackup(await decryptBackup(locked, password));
      setLocked(null);
      accept(parsed);
      return true;
    } catch {
      return false; // wrong password or a tampered file
    }
  };

  return (
    <>
      <Group title={t.backup} footer={t.backupHint}>
        <Row label={t.exportData} leading={<IconTile icon={Download} hue="blue" />} onClick={() => setExportOpen(true)} />
        <Row label={t.importData} leading={<IconTile icon={Upload} hue="sky" />} onClick={() => file.current?.click()} />
      </Group>
      <Group title={t.excelSection} footer={`${t.excelHint} ${t.csvNotProtected}`}>
        <Row label={t.importExcel} sub={t.importExcelSub} leading={<IconTile icon={FileUp} hue="leaf" />} onClick={onImportExcel} />
        <Row label={t.exportCsv} leading={<IconTile icon={FileDown} hue="mint" />} onClick={exportCsv} />
      </Group>
      <input ref={file} type="file" accept="application/json,.json,.spartopf" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={e => void onFile(e.target.files?.[0])} />
      <BackupExportSheet open={exportOpen} t={t} onClose={() => setExportOpen(false)} onExport={doExport} />
      <BackupPasswordSheet open={!!locked} t={t} onClose={() => setLocked(null)} onUnlock={unlock} />
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
