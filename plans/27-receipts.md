# 27 · Receipts and documents

- **Covers:** F10. MoneyControl sells it as a paid add-on; finanzblick and Spendee include it.
- **Depends on:** 02, 04, 06
- **Size:** M–L
- **Native:** none beyond the camera and photo permissions the app already declares
- **Schema:** bump (`Entry.files?`); backup format v2

## What the user gets

- **Attaching:** in the entry sheet's "+" menu, **Beleg** lets the user take a photo, or pick a photo or a PDF.
- **Viewing:** a paperclip appears on the entry's row, and tapping it opens the receipt full screen.
- **Optional reading:** **Betrag vom Beleg lesen** uses the on-device OCR (`src/ocr.ts`) to suggest the total and the shop name.

## Keep it simple

It's only in the "+" menu. Rows without receipts look the same as today.

## Privacy and security

- **Storage:** files live in the app's sandbox (`Library/spartopf/files/`) and are protected like the data file (06). They never go into the photo library.
- **Photos are re-encoded** (at most 1600 px, JPEG about 80 %). That also strips location and other EXIF data.
- **Backups:**
  - The encrypted backup (04) becomes a zip (fflate, already a dependency) with `data.json` and `files/`.
  - Old JSON backups still import.
  - Daily snapshots (03) don't copy the files; they stay where they are.
- **Deleting:** *Alle Daten löschen* removes every file. Deleting an entry removes its files once the undo window has passed.

## Design

- **Storage:** `Entry.files?: { id, name, type, size }[]`. Files are stored under their id.
- **Space:** *Sichern und übertragen* shows how much space receipts use, e.g. "Belege: 42 MB".

## Tests and checks

- Attach, view and delete a receipt.
- The EXIF data is gone after re-encoding.
- Backup round trip with files.
- An old JSON backup still imports.
- Deleting all data leaves no files behind.

## Done when

- [ ] Receipts can be attached, viewed, deleted, backed up and restored on iOS and Android. (Built and checked in the browser; the iPhone check is in TODO.md, Android comes with plan 23.)
- [x] Location and other EXIF data are removed. (`privacy-check.mjs` attaches a photo with an EXIF block and a place in it, and fails if either is in what gets stored.)
- [x] Old backups still load.

## Notes (built)

Where the build differs from the plan above:

- **The backup stays one JSON file, not a zip.** The receipts ride along as `files` (id → base64) next to the book, so the encryption (plan 04) and the import path are unchanged, and a backup from before simply has no `files`. JPEGs don't compress, so a zip would only have saved the base64 overhead (about a third). The price: a backup with many receipts is read into memory whole. The limit is 150 MB.
- **It's a pill, not a "+" menu.** The entry sheet has no "+" menu; *Beleg* sits with *Notiz* and *Tag*, and opens a small menu (*Foto aufnehmen*, *Foto oder PDF wählen*).
- **The paperclip on a row is a marker, not a button.** A row is already one button (edit) beside the tick; a second one inside it isn't possible, and beside it would push the amount out of line. So: tap the row, then the receipt's chip — two taps instead of one.
- **Deleting:** files the book no longer points to are removed at the next launch, not after a timer — by then the undo toast is long gone. A receipt added in a sheet that is closed without saving goes at once.
- **Files are stored as base64 text** (`spartopf/files/<id>`), so they move between the backed-up and the not-backed-up folder with the same tested code as the book (plan 06). On the web they are in IndexedDB.
- **PDFs** open through the share sheet (*Öffnen*); the app's CSP frames nothing, so there is no built-in PDF view.
- **Limits:** five receipts an entry, a PDF up to 5 MB, a photo's longer side 1600 px at JPEG 80 %.
- **Space:** *Sichern und übertragen* says "Belege: 4,2 MB." under the backup rows once there are any.
- **Known gap:** restoring an older daily snapshot (plan 03) can bring back an entry whose receipt was already removed at a launch in between. The entry is back, and its receipt says "nicht mehr auf dem Gerät".
