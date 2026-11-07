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

- [ ] Data files are protected with class Complete.
- [ ] The backup switch works both ways.
- [ ] Hiding amounts covers every screen.
- [ ] The encryption decision is made and written down, and shipped if positive.

## Not in this plan

Widgets and notifications honouring these settings (14 and 17 build that in).
