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
| A lost or stolen phone | The data file and its snapshots carry iOS Data Protection class Complete (`App.entitlements`): unreadable while the phone is locked. The app can lock with Face ID / passcode. | 06, 00 |
| A shared family phone | Face ID / passcode lock; while locked no amount is in the DOM; a plain cover hides the app in the app switcher. | 00, 06 |
| Copies in places the user didn't choose | *Im iPhone-Backup sichern* (on by default) keeps the book in or out of iCloud and computer backups: off, it lives in `Library/NoCloud` (excluded from backup) and the localStorage mirror isn't written. | 06 |
| A malicious import file (zip bomb, oversized file) | Every importer has a byte limit and a row/entry cap (`src/limits.ts`); `.xlsx` is unzipped with a per-entry and total-size cap so a zip bomb is rejected quickly (`src/xlsx.ts`). | 05 |
| A hostile payee name (CSV injection) | `toCsv()` prefixes any text cell that starts with `=`, `+`, `-`, `@`, tab or carriage return with an apostrophe, so Excel treats it as text, never a formula. | 05 |
| A backup read by someone who gets the file | Exports are encrypted by default (AES-GCM-256, PBKDF2-HMAC-SHA-256 at 600k iterations, all WebCrypto; `src/crypto.ts`). A readable file is one switch away, clearly labelled. | 04 |
| Shoulder-surfing | *Beträge verbergen* shows every amount as "•••• €" until the eye is tapped (30 s); the app switcher then shows a plain cover. Notifications, the year picture and (later) widgets carry no amounts unless the user turns them on. | 00, 06, 13, 17 |
| A compromised dependency | Exact pinned versions, `npm audit --omit=dev` in `npm run check`, and no third-party crypto — WebCrypto only. New dependencies are vetted (see CLAUDE.md). | 05 |
| Injected or exfiltrating code at runtime | A Content-Security-Policy on production builds (`default-src 'self'`, no remote origins); the privacy check fails on any request that leaves the app's own origin. | 05, 01 |
| User data leaking into logs | No `console.*` in app source (`npm run check:security`). | 05 |
| A link from another app or a web page (`spartopf://…`) | `parseDeepLink` checks every part and ignores the rest; no link saves anything — "add" only fills the entry sheet; links wait while the app is locked. | 14 |
| What widgets, Siri and the Watch can see | Only the summary in the App Group (`snapshot.json`) — never the book — and no amounts in it unless the user allows them (plan 17), never while *Beträge verbergen* is on. Shared files are `completeUntilFirstUserAuthentication`, size-capped, written by our own Swift. What Siri may say aloud — the two balances and the open bills' amounts — is a separate `amounts.json` with class Complete (unreadable while the phone is locked), written only while the app lock is off; the actions that read it ask for the phone to be unlocked (`authenticationPolicy`). | 14, 17, 18 |
| A link that leaves the app | Only *Über Spartopf*'s three: `SpartopfShared.open` hands iOS https links to `apps.apple.com` and `habboubah.github.io` and mailto: links, nothing else; they open only when tapped, and the privacy check allows exactly these two URLs. The feedback mail carries the app's and the system's version, written and sent by the user. | 15 |
| A forged or broken item in the inbox | `readInboxItem` checks every field (known source, whole cents within the cap, safe ids, real dates); bad items are dropped unbooked; each booked item carries a ref, so one read twice isn't booked twice. | 14 |
| Data lost on a broken or replaced phone | Atomic, checksummed data file with the OS backup on by default; automatic on-device snapshots with one-tap restore; encrypted export to move to a new phone. | 02, 03, 04 |

## Encryption at rest

Today the book is protected by iOS Data Protection (class Complete) on the
device and by encryption when it leaves it (plan 04). Encrypting `data.json`
itself with a key from the Keychain would also cover an unencrypted computer
backup — but a restore to a new phone without that key would lose the book,
the very failure plans 02–04 exist to prevent. So plan 06 decides with a
spike on two iPhones (key stored `kSecAttrAccessibleAfterFirstUnlock`), each
restored from an iCloud backup, an encrypted Finder backup and an unencrypted
one: if every supported path keeps the book readable, app-level encryption
ships; if not, the reason is written here and Data Protection plus encrypted
exports remain the protection. **Not run yet** — until then, it is the latter.

## Deleting everything

*Optionen → Alle Daten löschen* calls `wipeAll()` (`src/storage.ts`): the data
file, its previous version, and all automatic snapshots — in both folders, in
and out of the backup — plus pending reminders and the App Group's snapshot
and inbox (plan 14). Later features with their own files or secrets register a cleaner
with `onWipe()`, so one button erases everything.

## Out of scope

- Jailbroken or rooted devices, where the OS sandbox and file protection no
  longer hold.
- An attacker who already has the device unlocked and the app open.

## Reporting

This is a personal project. Open an issue for anything that looks wrong; do not
include real financial data.
