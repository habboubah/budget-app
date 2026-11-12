import { useEffect, useState } from 'react';
import { Clock, History, RotateCcw } from 'lucide-react';
import { AppData } from '../types';
import { Strings, fmt } from '../translations';
import { isoDay } from '../logic';
import { Snapshot, listSnapshots, restoreSnapshot } from '../storage';
import { Empty, Group, IconTile, Row, Screen } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';

/**
 * Optionen → Sichern und übertragen → Automatische Sicherungen (pushed, plan
 * 03): the versions Haushaltsbuch Einfach keeps on the device, newest first, each
 * restorable with a preview and an undo. A torn snapshot shows as "beschädigt"
 * but never breaks the list. Everything stays on the device.
 */
export function BackupsView({ data, t, onRestore, toast, onBack }: {
  data: AppData;
  t: Strings;
  /** Loads the chosen version into the store; returns the book as it was, for undo. */
  onRestore: (next: AppData) => AppData;
  toast: (label: string, action?: { label: string; run: () => void }) => void;
  onBack: () => void;
}) {
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null);
  const [pending, setPending] = useState<Snapshot | null>(null);
  const refresh = () => { void listSnapshots().then(setSnaps); };
  useEffect(refresh, []);

  const label = (s: Snapshot): string => {
    if (s.preRestore) return t.snapshotPreRestore;
    if (!s.date) return t.autoBackups;
    const today = isoDay();
    const yesterday = isoDay(new Date(Date.now() - 86_400_000));
    if (s.date === today) return t.snapshotToday;
    if (s.date === yesterday) return t.snapshotYesterday;
    return new Date(`${s.date}T00:00:00`).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const entriesText = (n: number) => fmt(n === 1 ? t.snapshotEntry : t.snapshotEntries, { n });
  const sub = (s: Snapshot): string => {
    if (!s.ok) return t.snapshotCorrupt;
    return fmt(t.snapshotSpan, { span: s.span || '—', entries: entriesText(s.entries) });
  };

  const doRestore = async (s: Snapshot) => {
    const next = await restoreSnapshot(s.name, data);
    setPending(null);
    if (!next) { toast(t.snapshotCorrupt); refresh(); return; }
    const before = onRestore(next);
    refresh();
    toast(t.restoreDone, { label: t.restoreUndo, run: () => { onRestore(before); toast(t.restoreUndone); refresh(); } });
  };

  return (
    <>
      <Screen title={t.autoBackups} onBack={onBack} backLabel={t.back} tabbed>
        {snaps && snaps.length === 0 ? (
          <Empty emoji="🗂️" title={t.autoBackupsEmpty} body={t.autoBackupsEmptyBody} />
        ) : (
          <Group footer={t.autoBackupsFooter}>
            {(snaps ?? []).map(s => (
              <Row
                key={s.name}
                label={label(s)}
                sub={sub(s)}
                leading={<IconTile icon={s.preRestore ? RotateCcw : s.date === isoDay() ? Clock : History} hue={s.ok ? 'blue' : 'stone'} />}
                onClick={() => setPending(s)}
                ariaLabel={`${t.restoreAction} — ${label(s)}`}
              />
            ))}
          </Group>
        )}
      </Screen>
      <Confirm
        open={!!pending}
        title={t.restoreSnapshotTitle}
        body={pending ? fmt(t.restoreSnapshotBody, { span: pending.span || '—', entries: entriesText(pending.entries) }) : ''}
        confirmLabel={t.restoreAction}
        cancelLabel={t.cancel}
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) void doRestore(pending); }}
      />
    </>
  );
}
