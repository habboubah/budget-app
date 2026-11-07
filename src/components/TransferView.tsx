import { ComponentProps } from 'react';
import { Bug } from 'lucide-react';
import { Group, IconTile, Row, Screen } from '../ui/Screen';
import { debugTools, debugWipeWebData } from '../storage';
import { BackupGroup } from './BackupGroup';

/**
 * Optionen → Sichern und übertragen (pushed): the whole household book as
 * one backup file and back, the old Excel sheet in, every entry out as CSV.
 * Nothing leaves the device unless the user sends a file somewhere. Later
 * ways to move data (automatic and encrypted backups, a new phone) join here.
 * With the debug flag (storage.ts `debugTools`), a test of plan 02: wipe the
 * web view's data, then relaunch — everything must come back from the file.
 */
export function TransferView({ onBack, ...backup }: ComponentProps<typeof BackupGroup> & { onBack: () => void }) {
  const { t, toast } = backup;
  return (
    <Screen title={t.transferTitle} onBack={onBack} backLabel={t.back} tabbed>
      <BackupGroup {...backup} />
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
