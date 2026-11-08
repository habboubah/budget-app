import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

/**
 * Export a backup (plan 04). By default the file is locked with a password
 * (AES-GCM, `src/crypto.ts`); one switch makes a readable `.json` instead.
 * One password field (twice, with "anzeigen"); a lost password can't be
 * recovered, and the sheet says so.
 */
export function BackupExportSheet({ open, t, onClose, onExport }: {
  open: boolean;
  t: Strings;
  onClose: () => void;
  /** Password set → encrypted; undefined → plain, readable file. Resolves when the file has been handed off. */
  onExport: (password: string | undefined) => Promise<void>;
}) {
  const [plain, setPlain] = useState(false);
  const [pw, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setPlain(false); setPw(''); setRepeat(''); setShow(false); setBusy(false); }
  }, [open]);

  const mismatch = !plain && repeat.length > 0 && pw !== repeat;
  const ready = plain || (pw.length > 0 && pw === repeat);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      await onExport(plain ? undefined : pw);
      onClose();
    } catch {
      // The share sheet was dismissed, or the write failed; stay open.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title={t.encryptExportTitle} closeLabel={t.cancel} onClose={onClose}
      action={{ label: busy ? t.encrypting : t.exportData, onClick: () => void submit(), disabled: !ready || busy }}>
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-5">
        {!plain && (
          <>
            <p className="text-label text-fg-mute wrap-prose">{t.encryptBody}</p>
            <Field
              label={t.encryptPassword}
              value={pw}
              onChange={setPw}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              trailing={
                <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t.encryptHide : t.encryptShow}
                  className="shrink-0 h-tap w-tap -me-2 inline-flex items-center justify-center text-fg-mute active:scale-[0.92] transition-transform focus-visible:ring-focus">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />
            <Field
              label={t.encryptPasswordRepeat}
              value={repeat}
              onChange={setRepeat}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              enterKeyHint="done"
            />
            {mismatch && <p className="text-caption text-neg px-1 -mt-2 wrap-prose">{t.encryptMismatch}</p>}
          </>
        )}
        <div className="flex items-start gap-3 px-1">
          <span className="min-w-0 flex-1">
            <span className="block text-body text-fg wrap-compound">{t.encryptWithoutPassword}</span>
            <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{t.encryptWithoutPasswordHint}</span>
          </span>
          <Switch checked={plain} onChange={setPlain} label={t.encryptWithoutPassword} />
        </div>
        <Button type="submit" full size="lg" disabled={!ready || busy}>{busy ? t.encrypting : t.exportData}</Button>
      </form>
    </Sheet>
  );
}
