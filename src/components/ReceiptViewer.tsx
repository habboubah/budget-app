import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Share, X } from 'lucide-react';
import { Attachment } from '../types';
import { attachmentBlob } from '../receipts';
import { shareImage } from '../export';
import { Strings } from '../translations';
import { Button } from '../ui/Button';

/**
 * A receipt, full screen (plan 27): the photo, free to pinch and scroll, or
 * a PDF, handed to the system's own viewer (*Öffnen*: the share sheet in the
 * app, a download on the web — the page's CSP frames nothing).
 * *Teilen* gives the file to the share sheet; nothing leaves the
 * device otherwise. Above every sheet, as it opens from the entry sheet too.
 */
export function ReceiptViewer({ file, t, onClose }: { file: Attachment | null; t: Strings; onClose: () => void }) {
  const [state, setState] = useState<{ id: string; url: string; blob: Blob } | 'missing' | null>(null);

  useEffect(() => {
    if (!file) { setState(null); return; }
    let url: string | undefined;
    let live = true;
    void attachmentBlob(file).then(blob => {
      if (!live) return;
      if (!blob) { setState('missing'); return; }
      url = URL.createObjectURL(blob);
      setState({ id: file.id, url, blob });
    });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [file, onClose]);

  if (!file) return null;
  const shown = state && state !== 'missing' && state.id === file.id ? state : null;
  const pdf = file.type === 'application/pdf';
  const share = () => { if (shown) void shareImage(`${file.name}.${pdf ? 'pdf' : 'jpg'}`, shown.blob).catch(() => undefined); };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={file.name} className="fixed inset-0 z-[80] flex flex-col bg-bg">
      <div className="shrink-0 flex items-center gap-2 px-[16px] pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <p className="min-w-0 flex-1 text-heading font-semibold text-fg wrap-compound">{file.name}</p>
        <button type="button" onClick={share} disabled={!shown} aria-label={t.receiptShare}
          className="w-tap h-tap shrink-0 rounded-full inline-flex items-center justify-center bg-surface-2 text-accent disabled:opacity-40 active:opacity-60 focus-visible:ring-focus">
          <Share className="w-5 h-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onClose} aria-label={t.close} autoFocus
          className="w-tap h-tap shrink-0 rounded-full inline-flex items-center justify-center bg-surface-2 text-fg active:opacity-60 focus-visible:ring-focus">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto safe-bottom" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
        {state === 'missing' ? (
          <p className="p-8 text-center text-body text-fg-mute wrap-prose">{t.receiptMissing}</p>
        ) : !shown ? null : pdf ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="w-14 h-14 text-fg-mute" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-body text-fg wrap-compound">{file.name}</p>
            <Button onClick={share}>{t.receiptOpen}</Button>
          </div>
        ) : (
          <img src={shown.url} alt={file.name} className="block mx-auto max-w-full h-auto" />
        )}
      </div>
    </div>,
    document.body,
  );
}
