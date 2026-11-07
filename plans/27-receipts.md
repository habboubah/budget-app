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

- [ ] Receipts can be attached, viewed, deleted, backed up and restored on iOS and Android.
- [ ] Location and other EXIF data are removed.
- [ ] Old backups still load.
