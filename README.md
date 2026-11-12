# Haushaltsbuch Einfach 🪙

A simple, private budget book for iPhone, Android and the browser.
Bundle id `com.habboubah.spartopf`.

## Setup

Needs Node.js 22, Xcode (iPhone) and Android Studio (Android).

```bash
npm install
```

## Run

```bash
npm run dev              # http://localhost:3002 — also from your phone on the same Wi-Fi
```

## Build

```bash
npm run build:ios        # web build → sync into ios/ → opens Xcode, then ▶ Run
npm run build:android    # web build → sync into android/ → opens Android Studio, then ▶ Run
npm run android:debug    # debug APK → android/app/build/outputs/apk/debug/app-debug.apk
npm run build:web        # production web build → dist/
npm run preview          # serves dist/ on http://localhost:3002
```

## Screenshots

```bash
npx playwright install chromium                      # once per Mac
npm run screenshots                                  # raw captures → screenshots/de, screenshots/en
npm run screenshots -- --only 08-category,10-plan    # only some screens
npm run store-screenshots                            # framed store set → screenshots/store/
```

## App Review recording

iPhone on the cable, unlocked, Do Not Disturb on.

```bash
npm run rehearse:app-review                        # checks every step against the code (5 min)
DRY_RUN=1 npm run record:app-review                # full run on the iPhone, without recording
npm run record:app-review                          # the real recording → video in Photos
FROM=5 TO=8 DRY_RUN=1 npm run record:app-review    # only scenes 5–8
npm run record:watch                               # lets Claude start the runs
```

Preparation and troubleshooting: [ios/AppReviewRecorder/README.md](ios/AppReviewRecorder/README.md).

## Google Play

- Closed testing: https://play.google.com/store/apps/details?id=com.habboubah.spartopf
- Internal testing: https://play.google.com/apps/internaltest/4700086830731001200

## More

Release to both stores with `npm run release`. Release steps, features and plans are in [docs/](docs).
