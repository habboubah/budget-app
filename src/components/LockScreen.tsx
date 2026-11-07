import { useEffect } from 'react';
import { Lock, ScanFace, Fingerprint } from 'lucide-react';
import { LockKind } from '../lock';
import { Strings } from '../translations';
import { Button } from '../ui/Button';

/**
 * What a locked Spartopf shows — instead of the app, not over it, so no
 * amount is on the page, in the DOM or under VoiceOver until it is unlocked.
 * Asks for Face ID by itself when it appears; the button is for a second try.
 */
export function LockScreen({ kind, t, onUnlock }: { kind: LockKind | null; t: Strings; onUnlock: () => void }) {
  useEffect(() => { onUnlock(); }, []);
  const Icon = kind === 'touchId' ? Fingerprint : kind === 'faceId' ? ScanFace : Lock;
  const label = kind === 'faceId' ? t.unlockFaceId : kind === 'touchId' ? t.unlockTouchId : t.unlockCode;
  return (
    <main className="min-h-screen bg-bg safe-top flex flex-col items-center justify-center gap-6 px-8 text-center">
      <img src="/icon.svg" alt="" className="w-20 h-20 rounded-[20px]" />
      <h1 className="display text-title2 font-semibold text-fg wrap-compound">{t.lockedTitle}</h1>
      <Button icon={Icon} size="lg" onClick={onUnlock}>{label}</Button>
    </main>
  );
}

/** While the app isn't active (the app switcher, Control Center), with the lock on: nothing to read. */
export function PrivacyCover() {
  return (
    <div className="fixed inset-0 z-[200] bg-bg flex items-center justify-center" aria-hidden="true">
      <img src="/icon.svg" alt="" className="w-20 h-20 rounded-[20px]" />
    </div>
  );
}
