import { registerPlugin } from '@capacitor/core';
import { isNative } from '../platform';
import { onWipe } from '../storage';
import { Snapshot } from './snapshot';

/*
 * The app's side of SpartopfShared.swift (plan 14): typed calls, no-ops on
 * the web (no widgets there). A call that fails is let go — a widget a few
 * minutes old is no reason to bother the user; the next save writes again.
 */
interface SharedPlugin {
  writeSnapshot(options: { json: string }): Promise<void>;
  readSnapshot(): Promise<{ json: string | null }>;
  readInbox(): Promise<{ items: { id: string; json: string }[] }>;
  removeInbox(options: { ids: string[] }): Promise<void>;
  clear(): Promise<void>;
}

const Shared = registerPlugin<SharedPlugin>('SpartopfShared');

/** Writes the snapshot to the App Group (widgets reload). False when it couldn't. */
export async function writeSnapshot(snapshot: Snapshot): Promise<boolean> {
  if (!isNative()) return false;
  try { await Shared.writeSnapshot({ json: JSON.stringify(snapshot) }); return true; } catch { return false; }
}

/** The snapshot as written — for the debug round trip. */
export async function readSnapshot(): Promise<unknown> {
  if (!isNative()) return null;
  try {
    const { json } = await Shared.readSnapshot();
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

/** The inbox's items, parsed but unchecked (`inboxToEntries` checks them); a broken one as null. */
export async function readInbox(): Promise<{ id: string; item: unknown }[]> {
  if (!isNative()) return [];
  try {
    const { items } = await Shared.readInbox();
    return items.map(({ id, json }) => {
      try { return { id, item: JSON.parse(json) as unknown }; } catch { return { id, item: null }; }
    });
  } catch { return []; }
}

/** Deletes the items the app has taken in. */
export async function removeInbox(ids: string[]): Promise<void> {
  if (!isNative() || !ids.length) return;
  try { await Shared.removeInbox({ ids }); } catch { /* read again next time; their refs keep them single */ }
}

// "Alle Daten löschen" erases the snapshot and the inbox too (plan 05's wipeAll).
if (isNative()) onWipe(() => Shared.clear());
