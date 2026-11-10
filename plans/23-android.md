# 23 · Android app

- **Covers:** F20. Every competitor except Copilot is on Android, and in Germany Android has a much larger share than iOS.
- **Depends on:** 02, 05, 06 (Android starts with durable storage and the hardening already in place)
- **Size:** L
- **Native:** Android
- **Schema:** no change

## Why

Half the people who would want Spartopf can't install it.

## What the user gets

Spartopf on Google Play: the same app, free, with no ads, no account, and everything on the phone.

## Keep it simple

The same app and the same flows, with Android conventions where users expect them:
- the system back gesture, including predictive back
- the Android share sheet
- no iOS edge swipe

## Privacy and security

- **Backups.** Android Auto Backup uploads app data to Google Drive by default. Match the iOS decision:
  - The data folder follows the *Im Gerätebackup sichern* switch: `files/spartopf/` when it's on, `no_backup/` (which Android never backs up) when it's off.
  - `dataExtractionRules` allow cloud backup and device-to-device transfer only for `files/spartopf/`.
- **Screen.** `FLAG_SECURE` on the window while the app lock is on: no screenshots, and a blank thumbnail in Recents.
- **Lock.** Biometric lock through the plugin chosen in plan 00, if it supports Android. If it doesn't, pick one that does and vet it the same way.
- **No trackers.** No Google Play Services beyond what the Play Store needs, no Firebase, no analytics.
- **Play's Data safety form:** no data collected, no data shared.

## Design

- **Project:** `npx cap add android`. Keep `@capacitor/android` on exactly the same version as `@capacitor/core`; CLAUDE.md's version rule now covers both platforms.
- **Plugins:** check every plugin in use on Android: app, filesystem, haptics, share, status bar, local notifications, biometric. The `scripts/copy-ocr.mjs` assets must be in the APK.
- **Fonts:** SF Pro and SF Rounded don't exist on Android. Bundle a rounded face for money locally (an OFL-licensed one). Never load it from the Google Fonts CDN; CI's bundle check would fail anyway.
- **Edge to edge:** Android 15+ draws behind the system bars. Check `safe-top` and `safe-bottom` against the WebView's insets, and fix them where the WebView doesn't report them.
- **Release:** `scripts/release-android.js`.
  - It builds a signed AAB, with the version code from `package.json`.
  - It uploads to the internal track first.
  - Signing keys live in the gitignored `.env.release`.
- **ui-review:** add Pixel presets (412 × 915 and 360 × 800) to `scripts/ui-review.mjs`.
- **Listing:** Play texts in DE, EN and AR in `store/`. Screenshots come in plan 38.

## Steps

1. Create the Android project and build a debug version in CI.
2. Platform fixes: back, insets, fonts, share, notifications, lock, `FLAG_SECURE`, backup rules.
3. Test on two phones: a recent Pixel and an older mid-range Samsung.
4. Release script, Play Console setup, internal test track.

## Done when

- [ ] The Android app passes the gates on both phones. (It compiles and packages; it has never run on a phone or an emulator.)
- [ ] It's on an internal Play test track.

## Notes (built: steps 1 and 2, and the script of step 4)

**What was checked, and what was not.** `./gradlew assembleDebug bundleRelease` builds a debug APK (12 MB) and an unsigned release bundle (9 MB) from this project; the APK was opened and its version (1.2.7 / 1020700), permissions, backup rules, font and OCR files checked. `npm run check` passes. **Nothing has run on a device or an emulator** — every behaviour below that needs Android itself (insets, back, the lock, sharing, notifications, the camera, the print dialog, the backup rules) is written from the documentation and the plugins' source, and is on TODO.md to try.

Where the build differs from the plan above:

- **Backup folders.** The plan put the not-backed-up copy in `no_backup/`. The file plugin can't reach that folder — and on Android its `Library` and `LibraryNoCloud` are both `files/`, so the iPhone's two folders would have been one and the same. So: `files/spartopf/` when the switch is on, `files/no-backup/spartopf/` when it is off, and the rules include `files/spartopf/` only. Same effect.
- **Lock.** The plugin of plan 00 supports Android. Fingerprint shows as "Mit Fingerabdruck sperren", face or iris unlock as "Mit Gesichtserkennung sperren"; the screen lock is the way back.
- **Wording.** Thirteen strings name the iPhone, iOS, iCloud, Face ID or Touch ID. Android has its own for each, in all 14 languages (`src/i18n/android.ts`, a chunk only the Android app loads); a test fails when a new Apple-named string has no Android twin.
- **Not on Android:** Siri, the Shortcuts capture and its tip (iPhone only; plan 24), the in-app rating prompt (it needs Google's Play library — *Spartopf bewerten* opens the Play page instead).
- **PDF:** Android's print dialog (*Als PDF speichern*) instead of a share sheet.
- **Exact alarms:** the notifications plugin asks for `SCHEDULE_EXACT_ALARM`; Google Play allows that only for alarm clocks and calendars, so the manifest removes it and reminders are scheduled inexactly.
- **`INTERNET` stays** in the manifest. The app makes no request, but whether Capacitor's web view loads its local pages without the permission could not be tried here. If it does, removing it would be the strongest privacy statement Android has — TODO.md.
- **The OCR model:** Android's packaging unpacks `.gz` assets and drops the ending (`deu.traineddata.gz` is `deu.traineddata` in the APK), so the app loads it un-gzipped there. Found by reading the APK; reading a photo still has to be tried.
- **Font:** Nunito's Latin part (39 kB, SIL OFL, licence beside it in `src/assets/fonts/`) for amounts, only on Android.
- **Icon:** the adaptive icon is the iPhone artwork at 90 % on its own background colour — check it in a round and a squircle mask.
- **Version code:** `major·1 000 000 + minor·10 000 + patch·100 + build` from `package.json` (1.2.7 → 1020700), so a rejected upload can go again as `--build 1`.
- **Portrait only**, as on the iPhone.
- **Charts on a 360-wide phone:** Statistik's six month columns are 42 px wide there, 2 under the 44 px tap size (ui-review `android360`). Left as it is.
- **`release-android.js --upload`** (the Play Developer API) is written but has not run: the first upload of an app is by hand in the Console anyway.
- **CI** builds a debug APK on every push (`.github/workflows/ci.yml`, job `android`).
- **Steps 3 and 4** — two real phones, the upload key, the Play Console — are yours: `docs/ANDROID_RELEASE.md`.
