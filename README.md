# Spartopf – Haushaltsbuch 🪙

A simple, private budget book for iPhone, Android and the browser: one bank
account (cash and savings accounts when you add them), one page per month, and
the two numbers that matter — **what is on the account now**
and **what will be left at the end of the month**. No sign-up, no server, no
ads; everything stays on the device.

Bundle id `com.habboubah.spartopf` · Team Ahmad Habboubah (HZVBBHBAJN)

## Documentation

Everything else is in [`docs/`](docs):

| File | What |
|---|---|
| [features.md](docs/features.md) | Every feature of the app |
| [PLAN.md](docs/PLAN.md) | The concept and the money rules |
| [CLAUDE.md](docs/CLAUDE.md) | Where the code lives, and the conventions for working on it |
| [TODO.md](docs/TODO.md) | What is left to do by hand: devices, Xcode, the stores |
| [APP_STORE_RELEASE.md](docs/APP_STORE_RELEASE.md) | The first App Store release step by step, and troubleshooting |
| [ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md) | Android: run it, sign it, Google Play |
| [STORE_LISTING.md](docs/STORE_LISTING.md) | Every store listing field for Google Play and the App Store, ready to copy |
| [SECURITY.md](docs/SECURITY.md) | What the app protects, and how |
| [STATISTICS_AND_INSIGHTS.md](docs/STATISTICS_AND_INSIGHTS.md) | What Statistik and Planen show, and the definitions behind them |
| [plans/](docs/plans/README.md) | The plans still open, in build order |
| [COMPETITOR_ANALYSIS.md](docs/COMPETITOR_ANALYSIS.md) | Research on other budget apps (November 2026) |

The App Store and Google Play texts and the privacy policy are in `store/`.

## Requirements

- A Mac with **Xcode** (opened once, signed in under *Xcode → Settings → Accounts*)
- **Node.js 22** (the version CI uses)
- For Android: **Android Studio** (it brings the SDK and Java)
- For releases: the App Store Connect API key, and for Android the upload key (see [Build a release](#build-a-release))

```bash
cd ~/repos/budget-app
npm install
```

## Run locally

```bash
npm run dev        # http://localhost:3002 — also reachable from your phone on the same Wi-Fi
```

## Check before you ship

```bash
npm run lint       # type-check
npm test           # unit tests
npm run check      # everything CI runs: lint, security, tests, build, privacy, performance, contrast
```

`npm run check` drives the app in Chromium — install it once with
`npx playwright install chromium`.

## Build

### iPhone app

```bash
npm run build:ios          # web build → sync into ios/ → opens Xcode
```

In Xcode: target **App** → *Signing & Capabilities* → Team **Ahmad Habboubah**
(already set) → pick your iPhone at the top → **▶ Run**.

After changing web code, run `npm run build:ios` again (or
`npm run build:web && npx cap sync ios` to sync without opening Xcode).
App icon and splash screen come from `assets/` — regenerate them with
`npm run assets:generate`.

### Android app

```bash
npm run build:android      # web build → sync into android/ → opens Android Studio
```

In Android Studio: pick your phone (USB debugging on) or an emulator at the
top → **▶ Run**. `npm run android:debug` builds the APK without opening it.

### Web app

```bash
npm run build:web          # production build → dist/
npm run preview            # serves dist/ on http://localhost:3002
```

To use it as a home-screen app, host `dist/` on HTTPS (e.g.
`npx wrangler pages deploy dist`), open it in Safari → Share → **Add to Home
Screen**. The web app and the iPhone app keep separate data; move it with
*Optionen → Sichern und übertragen*.

## Build a release

**`npm run release` ships both stores on one version**: checks → the next
version → web build → Android (signed bundle → Google Play's internal test
track) → iPhone (`xcodebuild` archive → App Store Connect / TestFlight) →
commit and tag `vX.Y.Z`. Commit everything first (`git status` must be clean).

| Command | What it does |
|---|---|
| `npm run release` | Both stores, the same new version: e.g. 1.2.2 → 1.2.3 |
| `npm run release:ios` | The App Store only |
| `npm run release:android` | Google Play only |
| `npm run release:dry` | Shows the version, the iOS build number and the Android version code. Nothing is built or uploaded. |
| `npm run release -- minor` | New feature: e.g. 1.2.x → 1.3.0 (`major`: 1.x → 2.0.0) |
| `npm run release:ios -- --keep-version` | The same version again with a new build number — to re-upload after App Review rejected a build (`release:android -- --keep-version`: the next version code) |
| `npm run release -- --skip-check` | Skips `npm run check` (when it just ran) |

**The version is always the same in both stores.** A release takes a new
version — unless the store it ships to does not have the current one yet. So
`npm run release:ios` today and `npm run release:android` tomorrow put the
*same* version on Google Play, and a release that broke off half-way is
finished by running the command again. If the Android half goes through and
the iPhone build fails, the script says so; `npm run release:ios` then ships
that version there too.

### iPhone (App Store)

**Once per Mac — the API key.** It belongs to the team, so the Fahrtwerk key
works here too:

```bash
cp ../pizza-driver-log/.env.release .env.release
ls ~/.appstoreconnect/private_keys/     # AuthKey_<ASC_KEY_ID>.p8 must be here
```

No key yet? Step 2 in [APP_STORE_RELEASE.md](docs/APP_STORE_RELEASE.md#2-reuse-the-api-key).
`.env.release` and the `.p8` file are git-ignored.

**Every release** — `npm run release` (both stores) or `npm run release:ios`,
see the table above. The very first upload of the app: `npm run release:first`
(keeps the version).

It ends with `Done: Spartopf vX.Y.Z uploaded to App Store Connect (build N) …`.
Apple needs 5–30 minutes to process the build (you get an email); then it shows
up in TestFlight.

### Android (Google Play)

The Android half of `npm run release` — or `npm run release:android` by
itself — builds the web app, syncs it into `android/`, makes a **signed
bundle** (`android/app/build/outputs/bundle/release/app-release.aab`) and
**uploads it to Google Play's internal test track** — nothing to click in the
Play Console. The version is the one the iPhone gets.

**Once per Mac**

1. Install [Android Studio](https://developer.android.com/studio) and open the
   `android/` folder in it once (it installs the SDK). The script finds
   Android Studio's Java and SDK by itself.
2. Make the upload key:

   ```bash
   npm run android:key
   ```

   `keytool` asks for a password and your name. The key is saved to
   `~/.android-keys/spartopf-upload.jks`, and its path and alias are written
   into `.env.release`. **Keep a copy of that file and the password somewhere
   safe** — without them Google has to reset the key. Neither is ever
   committed.

   Already have a keystore? Put `ANDROID_KEYSTORE_PATH` and
   `ANDROID_KEY_ALIAS` into `.env.release` instead.
3. For the upload: `PLAY_SERVICE_ACCOUNT_JSON` in `.env.release` is the path
   of the Play service account's JSON key (the same one pizza-driver-log
   uses), and that service account needs *Release apps to testing tracks* for
   Spartopf in the Play Console (*Users and permissions*).

**Every release**

| Command | What it does |
|---|---|
| `npm run release:android -- --dry-run` | Shows the version and version code. Nothing is built. |
| `npm run release:android` | Checks, builds, signs and uploads the bundle to the internal test track, with the release notes from `release-notes/`. Asks for the keystore password the first time only, then keeps it in `.env.release`. Ships the iPhone's version when Google Play does not have it yet, otherwise a new one. |
| `npm run release:android -- --no-upload` | Only builds and signs the bundle; nothing is sent to Google Play. |
| `npm run release:android -- --track alpha` | Releases to the closed test instead (`beta`: the open test). |
| `npm run release:android -- --build 1` | Forces the build number that is added to the version code. |
| `npm run android:debug` | An unsigned debug APK for your own phone: `android/app/build/outputs/apk/debug/app-debug.apk`. |

It ends with `Done: Spartopf X.Y.Z (version code N) is released on Google
Play's internal track`. Promoting a release to production stays a manual step
in the Play Console, and the very first upload of a new app has to be done
there by hand (*Testing › Internal testing › Create new release*).

Everything else — the Play Console setup, the listing, what differs from the
iPhone — is in [docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md).

## Publish on the App Store

The very first release (creating the app, privacy policy, store texts, App
Privacy, pricing) is in [APP_STORE_RELEASE.md](docs/APP_STORE_RELEASE.md). For every
version after that:

1. **Upload the build** — `npm run release` (see above).
2. **Test it** in the TestFlight app on your iPhone.
3. **Renew the screenshots** — only if something visible changed:

   ```bash
   npx playwright install chromium   # once per Mac
   npm run screenshots               # raw captures → screenshots/de, screenshots/en
   npm run store-screenshots         # framed, captioned set → screenshots/store/iphone-6.3/
   ```

4. **Create the version** — [App Store Connect](https://appstoreconnect.apple.com)
   → Spartopf → **+** next to *iOS App* → **New Version**, with the number the
   terminal showed.
5. **Fill it in** — *What's New* (texts in `store/listing.md`, German and
   English); new screenshots go into *iPhone with Dynamic Island (medium
   display)* from `screenshots/store/iphone-6.3/de/` and `…/en/`.
6. **Pick the build** → **Add for Review** → **Submit to App Review**.

Apple usually reviews within 24–48 hours. If it's rejected: read the
*Resolution Center*, fix it, run `npm run release:ios -- --keep-version`, pick
the new build and submit again.

## App Review screen recording

When App Review asks for a video on a real iPhone (Guideline 2.1), a UI test
taps through every feature and records the screen by itself. Details and
troubleshooting: [ios/AppReviewRecorder/README.md](ios/AppReviewRecorder/README.md).

**Once:** on the iPhone, *Settings › Privacy & Security › Developer Mode* on,
*Settings › Developer › Enable UI Automation* on, **Screen Recording** added to
Control Center, and the Spartopf icon on the first home screen page.

**Each time:**

1. Back up your own data: *Settings › Back up and transfer › Export backup*.
2. `npm run rehearse:app-review` — checks every step against the code (5 min).
3. AirDrop the four files in `ios/AppReviewRecorder/demo-files/` to the iPhone.
4. Delete Spartopf and install it again from TestFlight. Don't open it.
5. iPhone on the cable, unlocked, Do Not Disturb on:
   `DRY_RUN=1 npm run record:app-review`.
6. Reinstall from TestFlight once more, then `npm run record:app-review`, with
   the phone facing you (Face ID).
7. The video is in Photos: upload it under *App Review Information ›
   Attachment*, then import your backup again.


# Playstor Closed testing 
https://play.google.com/store/apps/details?id=com.habboubah.spartopf

# Playstor Internal testing
https://play.google.com/apps/internaltest/4700086830731001200
