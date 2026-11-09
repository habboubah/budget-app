# 03 · Automatic backups and restore

- **Covers:** F23, part 2. Reviews of competitors complain about lost data, broken backups and failed restores (MoneyControl, Bluecoins, Monefy).
- **Depends on:** 02
- **Size:** M
- **Native:** none
- **Schema:** no change

## Why

A manual export only helps people who remember to make one. MoneyControl users lost years of data when a phone broke, and Bluecoins users lost months after an update. Spartopf should keep its own history of the data, and restoring should take one tap and be undoable.

## What the user gets

- **Automatic backups** under *Optionen › Sichern und übertragen › Automatische Sicherungen*:
  - "Letzte Sicherung: heute, 08:12 · 1.284 Einträge".
  - A list of saved versions: today, yesterday, and further back one per month.
- **Restoring a version:**
  1. A preview: "März 2026 bis Oktober 2026, 1.180 Einträge".
  2. Confirm.
  3. An undo toast.
- **The crash screen** offers **Letzte Sicherung wiederherstellen** next to **Daten retten**.
- **A gentle card** in *Sichern und übertragen*, shown when both are true:
  - no copy has left the phone for 90 days, and
  - the phone's own backup is switched off for Spartopf (plan 06).

  It says: "Sichere eine Kopie außerhalb dieses iPhones".

## Keep it simple

It works without the user doing anything. There's no new step and no pop-up. The card is the only nudge, and it can be dismissed.

## Privacy and security

- Snapshots sit next to the data file in the sandbox (`Library/spartopf/backups/`), not in the Files app. They follow the same backup and protection rules as the data file (02, 06).
- *Alle Daten löschen* deletes the snapshots too, and its confirmation text says so.

## Design

- **When:** on the first save of a day, and on resume if the newest snapshot is older than 24 h. At most one per day.
- **What:** the same envelope as `data.json` from plan 02, named `YYYY-MM-DD.json`.
- **What's kept:** the last 14 days, then the newest snapshot of each of the last 12 months. This is a pure function, `snapshotsToKeep(dates, today)` in `src/storage.ts`.
- **Restore:**
  1. Save the current state as a snapshot marked "vor Wiederherstellung", so undo still works after a restart.
  2. Load the chosen snapshot through `parseBackup()` (it validates and migrates).
- **"Last copy outside the phone":** the date of the last export. Plan 04 records it as a view preference.

## Steps

1. The snapshot writer and the pruning, with tests.
2. The pushed list screen and the restore flow (`ui/Screen`, `Group`, `Row`, `Confirm`).
3. The option on the crash screen (`main.tsx`).
4. The 90-day card.
5. `resetAll()` (later plan 05's `wipeAll()`) removes snapshots. Update the confirmation text in de/en/ar.

## Tests and checks

- `snapshotsToKeep` across month ends and leap years.
- A restore round trip keeps the golden balances.
- A corrupt snapshot shows as "beschädigt" in the list; it doesn't break the list.
- On a device: move the phone's date forward three days → three snapshots. Restore the oldest, then undo → back to today.

## Done when

- [x] Snapshots are written and pruned automatically.
- [x] Restore works with a preview and undo, including from the crash screen.
- [x] Deleting all data removes the snapshots.

## Notes (built)

- `src/storage.ts`: `snapshotsToKeep(dates, today)` (pure, tested: last 14 days + newest of each of the last 12 months), `takeSnapshot`, `listSnapshots`, `readSnapshot`, `restoreSnapshot` (writes a `pre-restore.json` first), `restoreLatestToData` (the crash screen), and `BACKUP_DIR = spartopf/backups`. The `FsLike` interface gained `list(dir)`.
- The saver (`createSaver`) grew a `snapshots` option (on for the app's instance). The first successful file write of a day leaves a snapshot; a resume (`installFlushTriggers`) snapshots the last-saved book so a day the user only opens still gets one. `forget()` deletes the snapshots.
- UI: `components/BackupsView.tsx` (pushed under *Optionen › Sichern und übertragen*), the row and the 90-day card in `TransferView.tsx`, the crash-screen button in `main.tsx`. The last-export date and the card's dismissal are view preferences in `store.ts` (`spartopf-last-export`, `spartopf-copy-card-dismissed`); `restoreData()` returns the previous book for the undo toast.
- Native-only (snapshots need the Capacitor file system), so the list, the card and the crash button show only on the app (`isNative()`); the web keeps its localStorage store.
- Decision taken here: the 90-day card's second condition (the OS backup is off, plan 06) isn't available yet, so for now the card shows on the 90-day rule alone. Tighten it when plan 06 lands. **Done in plan 06:** the card now needs both.

## Not in this plan

Encrypted export (04), moving data to another device (33).
