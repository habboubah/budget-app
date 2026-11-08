import { ComponentProps } from 'react';
import { Bug, FolderClock, ShieldAlert } from 'lucide-react';
import { isNative } from '../platform';
import { Group, IconTile, Row, Screen } from '../ui/Screen';
import { debugTools, debugWipeWebData } from '../storage';
import { BackupGroup } from './BackupGroup';

/** Days without a copy leaving the device before the gentle nudge appears (plan 03). */
const NUDGE_AFTER_DAYS = 90;

/**
 * Optionen → Sichern und übertragen (pushed): the whole household book as
 * one backup file and back, the old Excel sheet in, every entry out as CSV,
 * and the versions Spartopf keeps automatically on the device (plan 03).
 * Nothing leaves the device unless the user sends a file somewhere.
 * With the debug flag (storage.ts `debugTools`), a test of plan 02: wipe the
 * web view's data, then relaunch — everything must come back from the file.
 */
export function TransferView({ onBack, onOpenBackups, lastExport, copyCardDismissed, onDismissCopyCard, ...backup }:
  ComponentProps<typeof BackupGroup> & {
    onBack: () => void;
    onOpenBackups: () => void;
    /** When a copy last left the device (YYYY-MM-DD), or '' if never. */
    lastExport: string;
    copyCardDismissed: boolean;
    onDismissCopyCard: () => void;
  }) {
  const { t, toast } = backup;

  // The gentle nudge: no copy has left the device for 90 days (or ever), and
  // the card hasn't been dismissed. Only on the native app, where an automatic
  // on-device backup exists; the web has no file to lose this way.
  const daysSinceExport = lastExport
    ? Math.floor((Date.now() - new Date(`${lastExport}T00:00:00`).getTime()) / 86_400_000)
    : Infinity;
  const showNudge = isNative() && !copyCardDismissed && daysSinceExport >= NUDGE_AFTER_DAYS;

  return (
    <Screen title={t.transferTitle} onBack={onBack} backLabel={t.back} tabbed>
      {showNudge && (
        <Group>
          <Row
            label={t.copyOutsideTitle}
            sub={t.copyOutsideBody}
            leading={<IconTile icon={ShieldAlert} hue="carrot" />}
            trailing={
              <button
                type="button"
                onClick={onDismissCopyCard}
                className="shrink-0 min-h-[40px] px-3 rounded-full text-caption text-fg-mute active:scale-[0.96] transition-transform focus-visible:ring-focus"
              >
                {t.dismiss}
              </button>
            }
          />
        </Group>
      )}
      <BackupGroup {...backup} />
      {isNative() && (
        <Group>
          <Row
            label={t.autoBackups}
            sub={t.autoBackupsSub}
            leading={<IconTile icon={FolderClock} hue="lavender" />}
            onClick={onOpenBackups}
          />
        </Group>
      )}
      {debugTools() && (
        <Group title={t.debugSection}>
          <Row
            label={t.debugWipeWebData}
            leading={<IconTile icon={Bug} hue="stone" />}
            onClick={() => { void debugWipeWebData().then(() => toast(t.debugWiped)); }}
          />
        </Group>
      )}
    </Screen>
  );
}
