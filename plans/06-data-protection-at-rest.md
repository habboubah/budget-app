# 06 · Data protection at rest

- **Covers:** the security focus and "keeping everything local". REDESIGN.md notes that the Face ID lock locks the UI but doesn't protect the data itself; this plan does.
- **Depends on:** 02, 00 (lock)
- **Size:** M
- **Native:** iOS (an entitlement, maybe one small native call)
- **Schema:** no change

## Why

The lock from plan 00 stops someone tapping into the app. Three more things are needed:
- the data must be unreadable while the phone is locked;
- it must stay out of places the user didn't choose;
- it must be hidable on screen when the app is used in public.

## What the user gets

Two switches under *Optionen › Sicherheit und Mitteilungen*:

- **Im iPhone-Backup sichern** (on by default). Turned off, the data stays out of Finder and iCloud backups. Plan 03's card then reminds the user to export a copy.
- **Beträge verbergen.** Amounts show as "•••• €" until the user taps the eye on the balance card. For using the app in public; the setting is remembered.

## Keep it simple

Both switches are optional and sit next to the lock. Nobody has to touch them.

## Design

### 1. iOS Data Protection, class Complete
Turn on the Data Protection capability with `NSFileProtectionComplete` as the app's default. The data file and the snapshots can then not be read while the phone is locked.

- **Verify:** a debug build logs `FileManager.attributesOfItem(...)[.protectionKey]` for files written through `@capacitor/filesystem`.
- **Writes while locked fail.** Plan 02 flushes on `appStateChange` → background, which runs before the phone locks. If a write still fails, keep the state in memory and retry on the next foreground.
- **Exception:** the App Group files that widgets and intents use while the phone is locked (plan 14). Our own Swift code writes those with `completeUntilFirstUserAuthentication`, and they never hold the full data.

### 2. The backup switch
Moving between the two states moves the data folder between `Library/` and a folder excluded from backup:
- `Directory.LibraryNoCloud`, if the installed `@capacitor/filesystem` has it;
- otherwise a small native call that sets `URLResourceValues.isExcludedFromBackup`.

Move file by file, and test both directions.

### 3. App-level encryption: decide with a spike
Encrypting `data.json` with a key from the Keychain would keep it unreadable even inside an unencrypted computer backup. The risk runs the other way: restore that backup to a new phone, the key isn't there, and the data is gone. That's exactly the complaint plans 02–04 fix.

**Spike** on two iPhones, with the key stored as `kSecAttrAccessibleAfterFirstUnlock` (not `ThisDeviceOnly`). Restore each of these to the second iPhone:
- an iCloud backup
- an encrypted Finder backup
- an unencrypted Finder backup

**Decision rule:**
- If every supported restore path keeps the data readable, ship app-level encryption.
- If not, write down in `SECURITY.md` why Data Protection plus encrypted exports (04) is the protection instead.

### 4. Hide amounts
- **Code:** a view preference read through a `useMoney()` hook that wraps the `formatMoney*` functions. The balance card, cards, sheets and chart labels all go through it.
- **Peek:** the eye on the balance card shows amounts for 30 seconds, or until the app goes to the background.
- **VoiceOver:** says "Betrag verborgen".

### 5. App-switcher snapshot
The lock overlay already covers it (plan 00). With the lock off and *Beträge verbergen* on, blur the snapshot anyway.

## Steps

1. Data Protection entitlement, plus a debug build to verify it.
2. Backup switch with the folder move, plus tests for the path logic.
3. `useMoney()`, the preference and the eye button; strings in de/en/ar.
4. The encryption spike; record the result in `SECURITY.md` and in this plan.

## Tests and checks

- **Locked phone:** a debug background read fails. Unlocked, it works.
- **Backup switch:** after each toggle, make a Finder backup and list its files. The data file is in it or out of it as expected.
- **ui-review:** every screen with *Beträge verbergen* on shows no amount, and the layout doesn't change.

## Done when

- [x] Data files are protected with class Complete. (The entitlement, and `protectBookFiles()` for older files. Still to confirm with the debug log on an iPhone.)
- [x] The backup switch works both ways. (Tested in `storage.test.ts`, including a move stopped at every step. The Finder-backup listing on a device is still to do.)
- [x] Hiding amounts covers every screen.
- [ ] The encryption decision is made and written down, and shipped if positive. (The spike needs two iPhones; `SECURITY.md` says what holds until then.)

## Not in this plan

Widgets and notifications honouring these settings (14 and 17 build that in).

## Notes (built)

- **Hiding amounts: a switch in `logic.ts`, not a `useMoney()` hook.** Amounts are formatted in about 150 places across 35 components, plus the hint sentences (`insightText.ts`). Like the currency (plan 07), one module-level switch (`setAmountsHidden`, set by App on every render before its screens) makes every money formatter write "•••• €": the locale's layout, the figure taken out, no sign. A hook would have touched every call site and could miss one; the switch can't. `savedLabel` in `Charts.tsx`, the one amount formatted with a bare `Intl.NumberFormat`, was found by the hidden-amount captures and now follows it too.
- **What stays visible:**
  - fields being typed into, and what the app makes of them: the calculator's "=", a split's remainder, a reconcile difference (`withAmounts`);
  - reminders whose amounts are switched on, and the year picture shared with amounts (their own switches);
  - CSV and backups, which never go through the formatters;
  - percentages, counts, colours and a "+" a screen sets by hand. They tell direction, not amounts.
- **VoiceOver:** the balance card's `sr-only` twins and the labels of entry rows, due bills and contracts say "Betrag verborgen" (`spoken`). Other hidden amounts are read as the mask: check how VoiceOver reads "••••" on a device.
- **The peek:** the eye shows only while hiding is on, beside *Kontostand jetzt*, out of the line's height (44 pt target). It shows amounts for 30 s (`PEEK_MS`), or until the app goes inactive or hidden. Switching hiding off or on ends a peek.
- **App switcher:** with hiding on, the lock's plain cover shows even with the lock off. It covers more than a blur, and CLAUDE.md keeps `filter: blur` off content.
- **The backup switch moves the files, and where they are *is* the setting.** No preference that a cleared web view could lose. Library ↔ `Directory.LibraryNoCloud`: @capacitor/filesystem 8.1.2 resolves it through ion-ios-filesystem, which sets `isExcludedFromBackup` on `Library/NoCloud` every time it is used. Every file operation the app uses goes through that resolver (only `downloadFile` takes the old path).
  - The move (`moveBook`) copies and reads back the snapshots, `data.prev.json`, a temp file and `data.json` last. It then removes `data.json` from the old folder, which is the moment the move counts; a failure before that undoes the copies.
  - `hydrate` picks the folder with the newest copy (a tie stays in the backup) and tidies the other folder.
  - The test that stops a move at every step found two holes in the first version: a torn copy left behind, and an undo that could delete the only `data.json`. Both are fixed.
- **The mirror:** the localStorage mirror lives in the web view's storage, which is part of the phone's backup. While the book is kept out of it, the mirror is cleared and not written; switching back writes it again at once.
- **Writes while locked:** a failed write is kept and written again on resume (`saver.retry()`). With class Complete, that is what happens if a save lands after the phone locked.
- **90-day card (plan 03):** shows only with the backup switch off.
- **Dev flag:** `spartopf-dev-native` also shows the backup row on the web (nothing moves there). ui-review has `month-hidden`, `month-hidden-details`, `month-peek`, `stats-hidden` and `insights-hidden`.
- **Bundle:** the main bundle grew 2 kB, to 306.8 kB gzip of the 308 kB allowed (280 kB recorded + 10 %). The next plan will need to raise the baseline, with a note.
- **Fixed along the way:** the privacy check's photo step took the bank-import toast before it, or the sheet's own "reading…" panel, for the end of reading. It then closed the sheet mid-read, so the review opened over the backup step. That flaked about two runs in three; the step now waits for the reading panel to come and go.
- **Found, not fixed (app):** closing the photo import while it is still reading doesn't cancel it. The review sheet opens when reading ends.
- **Still to do on an iPhone:**
  - the debug log shows `NSFileProtectionComplete` for every file, and a read with the phone locked fails;
  - toggle the backup switch, make a Finder backup and list it: the files are in or out;
  - make sure the archive signs with the Data Protection capability (automatic signing should add it to the App ID; if not, turn on *Data Protection* in Xcode's Signing & Capabilities once);
  - VoiceOver with hidden amounts;
  - the encryption spike.
