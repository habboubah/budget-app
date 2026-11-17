import { Camera, ChevronRight, FileSpreadsheet, FileText, QrCode } from 'lucide-react';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Group, IconTile, Row } from '../ui/Screen';

export type ImportKind = 'photo' | 'csv' | 'pdf' | 'invoice';

/**
 * Every way to bring entries in without typing, on one sheet (plan 39): a
 * photo or screenshot of the banking app, the bank's CSV, a statement PDF, an
 * invoice's QR code — each with the sentence that
 * says what it takes. The month's "⋯" has one row for it instead of four,
 * and the explanations are read here, where one is picked.
 */
export function ImportSheet({ open, t, onClose, onPick }: {
  open: boolean;
  t: Strings;
  onClose: () => void;
  /** Called in the tap itself, so a file picker may open from it. */
  onPick: (kind: ImportKind) => void;
}) {
  const rows: { kind: ImportKind; label: string; sub: string; icon: typeof Camera; hue: string }[] = [
    { kind: 'photo', label: t.importPhoto, sub: t.importPhotoSub, icon: Camera, hue: 'sky' },
    { kind: 'csv', label: t.importCsv, sub: t.importCsvSub, icon: FileSpreadsheet, hue: 'mint' },
    { kind: 'pdf', label: t.importPdf, sub: t.importPdfSub, icon: FileText, hue: 'tomato' },
    { kind: 'invoice', label: t.scanInvoice, sub: t.scanInvoiceSub, icon: QrCode, hue: 'lavender' },
  ];
  return (
    <Sheet open={open} title={t.importMenu} closeLabel={t.close} onClose={onClose}>
      <div className="-mx-1 pb-2">
        <Group>
          {rows.map(r => (
            <Row
              key={r.kind}
              label={r.label}
              sub={r.sub}
              leading={<IconTile icon={r.icon} hue={r.hue} />}
              trailing={<ChevronRight className="w-5 h-5 shrink-0 text-fg-faint rtl:rotate-180" aria-hidden="true" />}
              onClick={() => onPick(r.kind)}
            />
          ))}
        </Group>
      </div>
    </Sheet>
  );
}
