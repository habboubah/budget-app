# 33 · Device-to-device transfer

- **Covers:**
  - The local-only replacement for cloud sync (F24).
  - Moving to a new phone; using two phones.
  - Complaints about failed restores on new phones (Monefy, MoneyControl).
- **Depends on:** 04, 30
- **Size:** L
- **Native:** iOS and Android (document types, QR scanning)
- **Schema:** bump (`updatedAt` on records, tombstones)

## What the user gets

*Sichern und übertragen › Auf anderes Gerät übertragen*:

1. This phone shows a QR code and creates an encrypted `.spartopf` file. The user sends the file however they like: AirDrop, Nearby Share, Files or mail.
2. On the other device, the user taps the file, which opens in Spartopf, and scans the QR code. They can also type in the six-word code shown under it.
3. A preview ("+42 neue Einträge, 3 geändert, 1 gelöscht") with **Zusammenführen**, or **Alles ersetzen** for a new phone. Both can be undone.

## Keep it simple

One screen, three steps.

## Privacy and security

- **The key.** The file is encrypted with a random 256-bit key. The key only travels in the QR code (or the words), never together with the file. Encryption is AES-GCM, as in plan 04.
- **No cloud.** No server; the user moves the file.

## Design

- **Merge engine** (`src/merge.ts`):
  - Every record gets `updatedAt`: categories, entries, months, goals, favourites, rules, accounts, debts and contracts.
  - Deleting a record leaves a tombstone, `{ id, type, deletedAt }`, kept for 180 days.
  - `mergeData(a, b)`: for each record the newest version wins, and a tombstone wins over older edits.
  - It's pure, and tested to be commutative and idempotent.
- **Old data:** `normalizeState` sets `updatedAt` from `createdAt`, or 0.
- **Document type:**
  - iOS: `UTExportedTypeDeclarations` and `CFBundleDocumentTypes` for `.spartopf`.
  - Android: an intent filter.
  - Opening a file hands it to the import flow.
- **QR codes:**
  - Generated in JS, with a small vetted library or our own encoder.
  - Scanned with on-device scanners: VisionKit (`DataScannerViewController`) on iOS, ZXing on Android. Not a Play Services scanner.
  - The six words work without the camera.

## Tests and checks

- Merge: the same result in both directions; merging twice changes nothing; a deletion against an edit; old data.
- Devices: two phones with different edits end up the same, both ways. A brand-new phone gets everything.

## Done when

- [ ] Two devices with different edits merge to the same state, both ways.
- [ ] A new phone gets everything.
- [ ] Old backups still import.
