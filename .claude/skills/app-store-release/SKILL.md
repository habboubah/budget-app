---
name: app-store-release
description: Build Spartopf and upload it to App Store Connect / TestFlight, regenerate the App Store screenshots, or prepare a new App Store version. Use when asked to release, ship, publish, upload to the App Store or TestFlight, bump the version, or refresh store screenshots for this app.
---

# Releasing Spartopf to the App Store

Spartopf ships exactly like pizza-driver-log (Fahrtwerk) and shopping-list
(Korb): one command archives the iOS app with `xcodebuild` and uploads it to
App Store Connect with an App Store Connect API key. Submitting for review is a manual click in App Store Connect.
The full human checklist is `docs/APP_STORE_RELEASE.md` — read it when anything
below fails.

## Before running anything

Check, and stop with a clear message if one is missing:

1. Running on **macOS with Xcode** (`xcode-select -p`; the script falls back to
   `/Applications/Xcode.app` itself).
2. `.env.release` exists with `ASC_KEY_ID` and `ASC_ISSUER_ID` (copy of
   `pizza-driver-log/.env.release` works — the key is per team, not per app),
   and the key file `~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8`
   exists (or `ASC_KEY_PATH` points at it). Never print or commit either.
3. The app record exists in App Store Connect (bundle id `com.habboubah.spartopf`).
   If the upload fails with "No suitable application records were found",
   that is the missing step — tell the user to do step 4 of the guide.
4. Working tree is clean enough to commit: the script commits `package.json`
   and `project.pbxproj` and tags `vX.Y.Z`.

## Commands

| Goal | Command |
|---|---|
| Preview the bump, change nothing | `npm run release:dry` |
| **First ever upload** (keeps 1.0.0, build +1) | `npm run release:first` |
| Bug-fix release (1.0.0 → 1.0.1), **both stores** on one version | `npm run release` |
| The App Store only / Google Play only | `npm run release:ios` / `npm run release:android` |
| Feature release (1.0.x → 1.1.0) | `npm run release -- minor` |
| Re-upload same version (rejected build) | `npm run release:ios -- --keep-version` |
| App Store screenshots, DE + EN, 1290×2796 | `npm run screenshots` (once: `npx playwright install chromium`) |

The script gates on `npm run lint` + `npm test`, bumps `package.json` and the
Xcode project's `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` together (build
number always +1), runs `vite build` + `cap sync ios`, archives, uploads via
`ios/App/ExportOptions.plist` (`destination = upload`), then commits
`Prepare release vX.Y.Z (build N)` and tags it.

## After a successful upload

Tell the user:
- the version and build number that went up,
- it appears in TestFlight after Apple's processing (5–30 min),
- to submit: App Store Connect → Spartopf → the version → Build → pick it →
  "Add for Review" (guide step 9), with "What's New" text from
  `store/listing.md` for updates.

## Common failures

- **No profiles / signing errors** → open `ios/App/App.xcodeproj` once in
  Xcode, App target → Signing & Capabilities, team "Ahmad Habboubah
  (HZVBBHBAJN)", "Automatically manage signing". The API key needs the Admin or
  App Manager role for `-allowProvisioningUpdates`.
- **"The bundle version must be higher"** → a build with that number already
  exists; just run the command again (it bumps the build).
- **Missing Swift packages** → open the project once in Xcode, or
  `xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj`.
- **Wrong DEVELOPER_DIR** → install Xcode in /Applications or
  `sudo xcode-select -s /Applications/Xcode.app`.
