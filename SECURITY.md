# Security

Spartopf is a private household budget book. There is no server, no account and
no network use (the one planned exception is an opt-in, on-device bank
connection, plan 36). This document records what the app protects, the threats
it is designed against, and how each is handled.

## What's protected

The household's financial data: every income and expense, amounts, payee names,
notes, dates, budgets and contracts. It lives only on the user's device.

## Threats and mitigations

| Threat | Mitigation | Plan |
|---|---|---|
| A lost or stolen phone | The data file sits in the app sandbox with iOS file protection; the app can lock with Face ID / passcode and hide amounts from the lock screen, notifications and the app switcher. | 06, 00 |
| A shared family phone | Face ID / passcode lock; while locked no amount is in the DOM; a plain cover hides the app in the app switcher. | 00, 06 |
| A malicious import file (zip bomb, oversized file) | Every importer has a byte limit and a row/entry cap (`src/limits.ts`); `.xlsx` is unzipped with a per-entry and total-size cap so a zip bomb is rejected quickly (`src/xlsx.ts`). | 05 |
| A hostile payee name (CSV injection) | `toCsv()` prefixes any text cell that starts with `=`, `+`, `-`, `@`, tab or carriage return with an apostrophe, so Excel treats it as text, never a formula. | 05 |
| A backup read by someone who gets the file | Exports are encrypted by default (AES-GCM-256, PBKDF2-HMAC-SHA-256 at 600k iterations, all WebCrypto; `src/crypto.ts`). A readable file is one switch away, clearly labelled. | 04 |
| Shoulder-surfing | Amounts are hidden from the lock screen, notifications and widgets unless the user turns them on. | 00, 06, 13, 17 |
| A compromised dependency | Exact pinned versions, `npm audit --omit=dev` in `npm run check`, and no third-party crypto — WebCrypto only. New dependencies are vetted (see CLAUDE.md). | 05 |
| Injected or exfiltrating code at runtime | A Content-Security-Policy on production builds (`default-src 'self'`, no remote origins); the privacy check fails on any request that leaves the app's own origin. | 05, 01 |
| User data leaking into logs | No `console.*` in app source (`npm run check:security`). | 05 |
| Data lost on a broken or replaced phone | Atomic, checksummed data file with the OS backup on by default; automatic on-device snapshots with one-tap restore; encrypted export to move to a new phone. | 02, 03, 04 |

## Deleting everything

*Optionen → Alle Daten löschen* calls `wipeAll()` (`src/storage.ts`): the data
file, its previous version, and all automatic snapshots, plus pending
reminders. Later features with their own files or secrets register a cleaner
with `onWipe()`, so one button erases everything.

## Out of scope

- Jailbroken or rooted devices, where the OS sandbox and file protection no
  longer hold.
- An attacker who already has the device unlocked and the app open.

## Reporting

This is a personal project. Open an issue for anything that looks wrong; do not
include real financial data.
