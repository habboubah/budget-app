# Releasing Spartopf for Android

The Android app is the same web app in a Capacitor shell (`android/`), built
by plan 23. This is what it takes to get it onto a phone and into Google
Play. Nothing here has run on a real device yet — see [TODO.md](TODO.md).

## Once per machine

1. **Android Studio** (it brings the SDK and a JDK). Open it once and let it
   install *Android SDK Platform 36* and *Build-Tools*.
2. `npm install` in the repository.

## Run it on a phone or the emulator

```
npm run build:android     # web build, sync, opens Android Studio — press Run
npm run android:debug     # or: just build android/app/build/outputs/apk/debug/app-debug.apk
```

On the phone: *Settings › About phone › tap "Build number" seven times*, then
*Developer options › USB debugging*, plug it in, and pick it in Android Studio.

## Once: the upload key

Google signs the app for users (Play App Signing); you sign what you upload
with your own **upload key**. Make it once:

```
npm run android:key
```

`keytool` asks for a password and your name. The key goes to
`~/.android-keys/spartopf-upload.jks`; its path and alias are written into
`.env.release` (gitignored), the password is not. Keep a copy of the file and
the password somewhere safe outside the computer — lose them and Google has
to reset the key. Never commit the keystore, the password or `.env.release`.

`npm run release:android` asks for the password each time; to skip the
question, add `ANDROID_KEYSTORE_PASSWORD=…` to `.env.release`. An existing
keystore works too: set `ANDROID_KEYSTORE_PATH` and `ANDROID_KEY_ALIAS` there.

## Once: the Play Console

1. A Google Play developer account (25 USD, once). A personal account created
   after November 2023 must run a **closed test with 12 testers for 14 days**
   before it may publish to production.
2. *Create app*: name *Spartopf – Haushaltsbuch*, default language German,
   App, Free. The package name `com.habboubah.spartopf` is fixed by the first
   upload.
3. Fill in *Store listing*, *Data safety*, *App content* from
   `store/play-listing.md`. Screenshots: plan 38.

## Every release

```
npm run release:android                 # check, build, sign -> app-release.aab
npm run release:android -- --build 1    # the same version again (a rejected upload)
npm run release:android -- --dry-run
```

The version is `package.json`'s — the iPhone release bumps it — and the
version code follows from it (1.2.7 → 1020700, `--build 1` → 1020701).

Upload `android/app/build/outputs/bundle/release/app-release.aab` under
*Testing › Internal testing › Create new release*. The first upload of a new
app has to be done by hand like this.

Later uploads can go through the API: create a service account (*Play Console
› Setup › API access*), give it *Release to testing tracks*, save its JSON key
outside the repository, set `PLAY_SERVICE_ACCOUNT_JSON`, and run
`npm run release:android -- --upload`. **That step has not been run against
Google Play yet.**

## What is different from the iPhone

- **Backup.** *Im Gerätebackup sichern* on: the book is in `files/spartopf/`,
  which `res/xml/data_extraction_rules.xml` lets Google's backup and a
  device-to-device transfer take. Off: it moves to `files/no-backup/`, which
  no rule includes. Nothing else of the app is ever backed up.
- **Lock.** Fingerprint or face unlock, with the screen lock as the way back;
  while the lock is on the window is `FLAG_SECURE` (no screenshots, a blank
  card in Recents).
- **No Google services.** No Firebase, no Play Services library, no in-app
  review prompt — *Spartopf bewerten* opens the Play page.
- **No Siri, no Shortcuts capture** (iPhone only). Android's own capture is
  plan 24.
- **PDF.** *Bericht teilen* opens Android's print dialog (*Save as PDF*).
- **Amounts** are set in Nunito, bundled (OFL); Android has no rounded
  system face.
- **Reminders** are scheduled inexactly (no exact-alarm permission), so one
  may arrive some minutes after its time.

## Keep in step

`@capacitor/android` must be on exactly the same version as `@capacitor/core`
and `@capacitor/ios`. After adding or updating a plugin: `npx cap sync`.
