import { ComponentProps } from 'react';
import { Screen } from '../ui/Screen';
import { BackupGroup } from './BackupGroup';

/**
 * Optionen → Sichern und übertragen (pushed): the whole household book as
 * one backup file and back, the old Excel sheet in, every entry out as CSV.
 * Nothing leaves the device unless the user sends a file somewhere. Later
 * ways to move data (automatic and encrypted backups, a new phone) join here.
 */
export function TransferView({ onBack, ...backup }: ComponentProps<typeof BackupGroup> & { onBack: () => void }) {
  const { t } = backup;
  return (
    <Screen title={t.transferTitle} onBack={onBack} backLabel={t.back} tabbed>
      <BackupGroup {...backup} />
    </Screen>
  );
}
