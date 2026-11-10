import { useRef, useState } from 'react';
import { Download, FileDown, FileUp, Upload } from 'lucide-react';
import { AppData } from '../types';
import { Strings } from '../translations';
import { attachmentBytes, attachmentIds, backupFiles, isoDay, keepAttachments, makeBackup, parseBackup, toCsv } from '../logic';
import { exportFiles, importFiles } from '../receipts';
import { fmt } from '../translations';
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
/** Bytes as megabytes with one decimal, at least 0,1 ("42 MB", "0,4 MB"). */
function megabytes(bytes: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: bytes < 10 * 1024 * 1024 ? 1 : 0 }).format(Math.max(0.1, bytes / (1024 * 1024)))} MB`;
}

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
  /** A backup read and waiting for the user's yes: the book, and the receipts it carries (plan 27). */
  const [pending, setPending] = useState<{ data: AppData; files: Record<string, string> } | null>(null);
  /** The text of an encrypted file waiting for its password. */
  const [locked, setLocked] = useState<string | null>(null);

  /** The book — and, when entries have receipts, the files themselves as `files` (id → base64). */
  const backupJson = async () => {
    const backup = makeBackup(data);
    const files = attachmentIds(data).size ? await exportFiles(data) : {};
    return JSON.stringify(Object.keys(files).length ? { ...backup, files } : backup, null, 2);
  };

  const doExport = async (password: string | undefined) => {
    if (password === undefined) {
      await downloadFile(`spartopf-backup-${isoDay()}.json`, await backupJson(), 'application/json');
    } else {
      const sealed = await encryptBackup(await backupJson(), password);
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
  const accept = (text: string): boolean => {
    const parsed = parseBackup(text);
    if (!parsed.ok) { toast(t[parsed.error]); return true; }
    if (parsed.data.entries.length > LIMITS.backupEntries) { toast(t.importTooLarge); return true; }
    setPending({ data: parsed.data, files: backupFiles(text, LIMITS.imageBytes) });
    return true;
  };

  /** The receipts first, then the book — with only the receipts that are really there. */
  const restore = async () => {
    if (!pending) return;
    const { data: book, files } = pending;
    setPending(null);
    const have = await importFiles(files, attachmentIds(book)).catch(() => new Set<string>());
    onImport(keepAttachments(book, have));
    toast(t.importDone);
  };

  /** A plain or encrypted backup, loaded from disk. */
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (file.current) file.current.value = '';
    if (f.size > LIMITS.backupBytes) { toast(t.importTooLarge); return; }
    const text = await f.text();
    if (isEncryptedBackup(text)) { setLocked(text); return; }
    accept(text);
  };

  const unlock = async (password: string): Promise<boolean> => {
    if (!locked) return false;
    try {
      const text = await decryptBackup(locked, password);
      setLocked(null);
      accept(text);
      return true;
    } catch {
      return false; // wrong password or a tampered file
    }
  };

  return (
    <>
      <Group title={t.backup} footer={attachmentBytes(data) > 0 ? `${t.backupHint} ${fmt(t.receiptsSize, { size: megabytes(attachmentBytes(data), t.locale) })}` : t.backupHint}>
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
        onConfirm={() => void restore()}
      />
    </>
  );
}
