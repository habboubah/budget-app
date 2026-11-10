# 05 · Security hardening

- **Covers:** the security focus; issues found in the code while writing these plans
- **Depends on:** 04
- **Size:** M
- **Native:** none (one release setting to confirm)
- **Schema:** no change

## Why

Spartopf reads files from outside (bank CSVs, Excel sheets, backups, screenshots) and writes files that open in Excel. Four of those paths are unguarded today:

- **CSV injection.** `toCsv()` in `src/logic.ts` writes names and notes as they are. A cell starting with `=`, `+`, `-` or `@` runs as a formula when the CSV opens in Excel. Payee names come from bank statements, so a third party controls them.
- **Zip bomb.** `readXlsx()` in `src/xlsx.ts` unzips the whole file with `unzipSync` and no size limit. A small crafted file can expand to gigabytes and kill the app.
- **Unlimited imports.** Backup, CSV and image imports have no size cap.
- **No CSP.** `index.html` has no Content-Security-Policy.

## What the user gets

Nothing visible, apart from clear messages when a file is too large or isn't what it claims to be.

## Design

### 1. CSV export
In `toCsv()`'s `cell()`, prefix a text cell with `'` when it starts with `=`, `+`, `-`, `@`, a tab or a carriage return. Only text columns get this (category, name, note). The amount column is a number the app formats itself.

### 2. Import limits
One file, `src/limits.ts`, holds the numbers, with tests:

| Import | Limit |
|---|---|
| Backup | ≤ 25 MB, ≤ 500,000 entries; strings capped by `cleanText` |
| CSV | ≤ 10 MB, ≤ 50,000 rows |
| `.xlsx` | ≤ 20 MB (details below) |
| Image (before `createImageBitmap`) | ≤ 30 MB |

For `.xlsx`, `unzipSync(bytes, { filter })` reads only the workbook, the shared strings and the sheet XML. It skips any entry whose `originalSize` is over 50 MB, and stops once the total passes 100 MB.

A file over a limit shows a toast in the user's language and nothing is read.

### 3. Content-Security-Policy
Production builds get a CSP meta tag, added by a small Vite plugin (`transformIndexHtml`, `apply: 'build'`). Dev and HMR stay as they are. The policy:

`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`

Check every feature in the built app on the iPhone and in Safari:
- OCR (tesseract.js needs WebAssembly, and its worker may start from a `blob:` URL)
- imports and exports
- an offline PWA start

Loosen the policy only where a real feature needs it, and write down why.

### 4. Web view
- Confirm the release build can't be inspected. Capacitor allows that for debug builds only, and `capacitor.config.ts` must not set `webContentsDebuggingEnabled: true`.
- Links to the privacy policy or the App Store open in the system browser, never inside the app's web view.

### 5. Dependencies
- Pin every dependency in `package.json` to an exact version. CLAUDE.md asks for this; today they use `^`.
- Add `npm audit --omit=dev` to `npm run check`.
- Write down in CLAUDE.md how to vet a new dependency.

### 6. No data in logs
Remove `console.*` calls that print user data. `npm run check` greps `src/` for `console.log`.

### 7. One wipe
`wipeAll()` in `src/storage.ts`, which every later plan with its own files registers with:
- now: the data file, snapshots, pending notifications
- later: the widget snapshot and inbox (14), attachments (27), bank credentials (36)

*Alle Daten löschen* calls it.

### 8. `SECURITY.md` at the repo root
- **What's protected:** the household's financial data.
- **Threats:**
  - a lost or stolen phone
  - a shared family phone
  - a malicious import file
  - a hostile payee name
  - shoulder-surfing
  - a compromised dependency
- **Mitigations:** one for each threat, with the plan that delivers it.
- **Out of scope:** jailbroken devices.

## Steps

Points 1–8 above, one commit each. Points 1, 2 and 7 get tests.

## Tests and checks

- `logic.test.ts`: CSV injection with `=HYPERLINK(…)`, `+49…` and `-Rabatt`.
- `xlsx.test.ts`: a zip bomb built inside the test (highly compressible data) is rejected quickly.
- One test per importer limit.
- The built app with the CSP passes plan 01's privacy check, and the full OCR path works on the iPhone.

## Done when

- [x] CSV injection and zip bombs are handled and tested.
- [x] Every importer has a size limit.
- [x] The production build ships the CSP, and every feature still works on the web (privacy check's OCR step passes under the CSP). iOS device check still to do.
- [x] Dependencies are pinned and audited in `npm run check`.
- [x] `SECURITY.md` exists.

## Notes (built)

1. **CSV injection** — `toCsv()` (`logic.ts`) gained `textCell()`: a leading `'` on the three user/bank-controlled columns (category, name, note) when they start with `= + - @ \t \r`; amounts/dates keep their sign. Tested in `logic.test.ts`.
2. **Import limits** — `src/limits.ts` (`LIMITS`, `checkBytes`, `checkCount`, `FileTooLargeError`), tested in `limits.test.ts`. Wired into `readXlsx` (per-entry + total unzip cap via `unzipSync({ filter })`, rejects a zip bomb — tested), `parseBankCsv` (row cap), and the file-size checks in `App.tsx` (xlsx/csv/image) and `BackupGroup.tsx` (backup bytes + entry count). New strings `importTooLarge` / `importTooMany` in de/en/ar.
3. **CSP** — a build-only Vite plugin (`vite.config.ts`) injects the policy. `'wasm-unsafe-eval'` + `worker-src blob:` for tesseract.js; OCR verified under it by the privacy check.
4. **Web view** — `capacitor.config.ts` does not set `webContentsDebuggingEnabled` (debug-only by default in Capacitor 8). "Links open in the system browser" still to confirm on a device; the app currently opens no external links.
5. **Dependencies** — all pinned to exact versions; `check:security` adds `npm audit --omit=dev --audit-level=high`; **fflate bumped 0.8.2 → 0.8.3** (the audit flagged a ZIP64 infinite-loop advisory, directly relevant here). Vetting guidance added to CLAUDE.md.
6. **No data in logs** — `scripts/no-console.mjs` fails the build on `console.*` in `src/` (test files excepted).
7. **One wipe** — `wipeAll()` + `onWipe()` registry in `storage.ts`; `resetAll()` now calls it plus `cancelAllReminders()`.
8. **`SECURITY.md`** at the repo root (threats → mitigations → plan).

## Not in this plan

File protection and hiding amounts (06).
