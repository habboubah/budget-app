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
`.env.release` (gitignored). Keep a copy of the file and
the password somewhere safe outside the computer — lose them and Google has
to reset the key. Never commit the keystore, the password or `.env.release`.

The first `npm run release:android` asks for the password **once**, checks
that it opens the keystore, and writes it into `.env.release`
(`ANDROID_KEYSTORE_PASSWORD=…`, the file is readable by you only) — as
pizza-driver-log keeps its own in `android/keystore.properties`. No later
release asks. Delete that line to be asked again. An existing keystore works
too: set `ANDROID_KEYSTORE_PATH` and `ANDROID_KEY_ALIAS` there.

## Once: the Play Console

1. A Google Play developer account (25 USD, once). A personal account created
   after November 2023 must run a **closed test with 12 testers for 14 days**
   before it may publish to production.
2. *Create app*: name *Spartopf – Haushaltsbuch*, default language German,
   App, Free. The package name `com.habboubah.spartopf` is fixed by the first
   upload.
3. Fill in *Store listing*, *Data safety*, *App content* from
   `store/play-listing.md`. Screenshots: plan 38.

## Once: the service account (so the upload needs no Play Console)

`npm run release:android` uploads through the Play Developer API as a
**service account**. A service account belongs to the developer account, not
to one app — the one that ships pizza-driver-log (Fahrtwerk) ships Spartopf
too:

1. *Play Console › Users and permissions*: open the service account (its
   address ends in `.iam.gserviceaccount.com`), *App permissions › Add app ›
   Spartopf*, and tick *Release apps to testing tracks*. (No service account
   yet: create one in Google Cloud, turn on the *Google Play Android
   Developer API*, download its JSON key and invite its address here.)
2. In `.env.release`, `PLAY_SERVICE_ACCOUNT_JSON` is the path of that JSON
   key — the same line as in pizza-driver-log's `.env.release`. The key stays
   outside the repository.
3. The **first** AAB of a new app has to be uploaded in the Play Console by
   hand (*Testing › Internal testing › Create new release*); the API only
   knows the app after that.

## Every release

```
npm run release                           # both stores on one version (App Store + Google Play)
npm run release:android                   # Google Play only: check, build, sign, upload -> internal test track
npm run release:android -- --dry-run      # what would happen; nothing built or sent
npm run release:android -- --no-upload    # only the signed app-release.aab
npm run release:android -- --track alpha  # the closed test instead (beta: the open test)
```

Both are `scripts/release.js` (`release:android` is `--android`);
`scripts/release-android.js` is its Android half.

One command, nothing to click: it asks Play what it already has, runs the
checks, builds and signs the bundle, uploads it, puts it on the **internal
test track** as a finished release and attaches the release notes. Testers get
it as an update a few minutes later.

- **Version.** The same as the iPhone's, always. `npm run release` takes a
  new version for both stores. `npm run release:android` ships the current
  version when Google Play does not have it yet (the iPhone went first), and
  takes a new one otherwise — `npm run release:ios` then brings the App Store
  up to it. The version code follows from the version (1.2.7 → 1020700).
  `--keep-version` ships the same version again under the next free code
  (1020701, …); `--build N` forces the number.
- **Release notes.** `release-notes/<version>/<language>.txt`, else
  `release-notes/default/`. The file name is Play's language code (`de-DE`,
  `en-GB`, `ar`); only the languages the store listing has are sent. 500
  characters at most.
- **Track.** `internal` unless `--track` or `PLAY_TRACK` in `.env.release`
  says `alpha` or `beta`. **Production is never touched** — promote a release
  there by hand in the Play Console.
- **An app that was never published** only takes a *draft* from the API. The
  script then uploads the release as a draft and says so; roll it out once in
  the Play Console. After the app is live the command does that too.
- **When Play refuses** (no permission, the app not there yet), the script
  stops *before* building and says what to check.

The upload step is checked against a stand-in for the Play API (every branch
above); **its first run against Google Play itself is still to come.**

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
