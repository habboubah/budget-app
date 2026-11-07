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

- [ ] The Android app passes the gates on both phones.
- [ ] It's on an internal Play test track.
