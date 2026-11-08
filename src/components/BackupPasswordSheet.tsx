import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Strings } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

/**
 * Ask for the password of an encrypted backup before importing it (plan 04).
 * A wrong password and a tampered file fail the same way, with one message.
 */
export function BackupPasswordSheet({ open, t, onClose, onUnlock }: {
  open: boolean;
  t: Strings;
  onClose: () => void;
  /** Returns true when the password opened the file; false shows the error and keeps the sheet open. */
  onUnlock: (password: string) => Promise<boolean>;
}) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) { setPw(''); setShow(false); setBusy(false); setError(false); }
  }, [open]);

  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setError(false);
    const ok = await onUnlock(pw);
    setBusy(false);
    if (ok) onClose();
    else setError(true);
  };

  return (
    <Sheet open={open} title={t.importPasswordTitle} closeLabel={t.cancel} onClose={onClose}
      action={{ label: busy ? t.decrypting : t.importUnlock, onClick: () => void submit(), disabled: !pw || busy }}>
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-5">
        <p className="text-label text-fg-mute wrap-prose">{t.importPasswordBody}</p>
        <Field
          label={t.encryptPassword}
          value={pw}
          onChange={v => { setPw(v); setError(false); }}
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          autoFocus
          enterKeyHint="done"
          trailing={
            <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t.encryptHide : t.encryptShow}
              className="shrink-0 h-tap w-tap -me-2 inline-flex items-center justify-center text-fg-mute active:scale-[0.92] transition-transform focus-visible:ring-focus">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
        />
        {error && <p className="text-caption text-neg px-1 -mt-2 wrap-prose">{t.backupLocked}</p>}
        <Button type="submit" full size="lg" disabled={!pw || busy}>{busy ? t.decrypting : t.importUnlock}</Button>
      </form>
    </Sheet>
  );
}
