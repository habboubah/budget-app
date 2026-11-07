# 04 · Encrypted backup files

- **Covers:** the security focus, F23 (exports), and the groundwork for device-to-device transfer (33)
- **Depends on:** 03
- **Size:** S–M
- **Native:** none
- **Schema:** no change (new file format)

## Why

Today's backup is plain JSON. Every amount, payee and note can be read by anyone who gets the file from iCloud Drive, a mail attachment or a shared folder. A finance app that promises privacy should hand out locked files by default.

## What the user gets

- **Export:** *Sicherung exportieren* asks for a password (twice, with "anzeigen"). A switch, *Ohne Passwort exportieren*, makes a readable file instead.
- **File:** named `spartopf-2026-11-07.spartopf`. Importing it asks for the password.
- **Old backups:** plain `.json` backups from earlier versions still import.
- **CSV:** the CSV export says above its button that the file isn't protected.

## Keep it simple

One password field. No key files, no account. If the password is lost, the file can't be opened, and the sheet says so in one sentence.

## Privacy and security

- **Encryption:** AES-GCM-256.
- **Key:** derived with PBKDF2-HMAC-SHA-256 at 600,000 iterations (OWASP's current guidance), from a random 16-byte salt.
- **IV:** a random 12-byte IV.
- **Source:** all of it comes from WebCrypto (`crypto.subtle`, `crypto.getRandomValues`).
- **Password:** never stored, and held in memory only for the operation.
- **Errors:** a wrong password and a tampered file fail with the same message (GCM authentication).
- **Header:** the header (app, format version, KDF parameters) is authenticated as additional data, so it can't be swapped.

## Design

- **`src/crypto.ts`:** `encryptBackup(json, password)`, `decryptBackup(text, password)`, `isEncryptedBackup(text)`.
- **Envelope (UTF-8 JSON):** `{ app: 'spartopf', format: 'spartopf-encrypted', v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt }, cipher: { name: 'AES-GCM', iv }, data }`, with base64 fields.
- **`BackupGroup.tsx`:**
  - Export: a sheet with the password fields.
  - Import: detects the envelope and asks for the password before `parseBackup()`.
- **Export date:** recorded for plan 03's 90-day card (view preference `spartopf-last-export`).
- **`downloadFile()`:** works as is, since base64 JSON is text. Use the mime type `application/octet-stream`.
- **Iterations:** read from the file, so a later version can raise them without breaking old files.

## Steps

1. `crypto.ts` with tests. Node 22 has WebCrypto, so vitest can run them.
2. The export and import UI, with de/en/ar strings.
3. On a device:
   1. Export to Files.
   2. AirDrop it to a second iPhone with Spartopf.
   3. Import it there.

## Tests and checks

- Round trip.
- A wrong password fails.
- A flipped byte in the data, the IV or the header fails.
- An old plain backup still imports.
- **Timing:** key derivation on an iPhone SE-class device takes under 1.5 s. If it takes longer, keep 600,000 iterations and show a progress state; don't lower the count.

## Done when

- [ ] Encrypted export is the default, and plain export is one switch away.
- [ ] Import handles both encrypted and old plain files.
- [ ] CLAUDE.md documents the file format.

## Not in this plan

Opening `.spartopf` files straight from Files or AirDrop, and merging instead of replacing (33).
