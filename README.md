# Spartopf – Haushaltsbuch 🪙

A simple, private budget book for iPhone and the browser: one bank account (cash
and savings accounts when you add them), one page per month, and the two numbers that matter — **what is on the account now**
and **what will be left at the end of the month**. No sign-up, no server, no
ads; everything stays on the device.

Bundle id `com.habboubah.spartopf` · Team Ahmad Habboubah (HZVBBHBAJN)

## Documentation

- [docs/features.md](docs/features.md) — what the app does
- [docs/project-layout.md](docs/project-layout.md) — where the code lives
- [APP_STORE_RELEASE.md](APP_STORE_RELEASE.md) — full first-time App Store checklist and troubleshooting
- [CLAUDE.md](CLAUDE.md) — conventions · [PLAN.md](PLAN.md) — concept and money rules

## Requirements

- A Mac with **Xcode** (opened once, signed in under *Xcode → Settings → Accounts*)
- **Node.js 22** (the version CI uses)
- For releases: the App Store Connect API key (see [Build a release](#build-a-release))

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

One command does the whole release: lint + tests → raise version and build
number → web build → `cap sync` → `xcodebuild` archive → upload to App Store
Connect (TestFlight) → commit and tag `vX.Y.Z`.

**Once per Mac — the API key.** It belongs to the team, so the Fahrtwerk key
works here too:

```bash
cp ../pizza-driver-log/.env.release .env.release
ls ~/.appstoreconnect/private_keys/     # AuthKey_<ASC_KEY_ID>.p8 must be here
```

No key yet? Step 2 in [APP_STORE_RELEASE.md](APP_STORE_RELEASE.md#2-reuse-the-api-key).
`.env.release` and the `.p8` file are git-ignored.

**Every release** — commit everything first (`git status` must be clean), then:

| Command | What it does |
|---|---|
| `npm run release:dry` | Shows the next version and build number. Nothing is built or uploaded. |
| `npm run release` | Bug fix: e.g. 1.2.2 → 1.2.3 |
| `node scripts/release.js minor` | New feature: e.g. 1.2.x → 1.3.0 |
| `node scripts/release.js major` | Big change: e.g. 1.x → 2.0.0 |
| `node scripts/release.js --keep-version` | Same version, new build number — to re-upload after a rejection (`npm run release:first` does the same) |

It ends with `Done: Spartopf vX.Y.Z (build N) uploaded to App Store Connect.`
Apple needs 5–30 minutes to process the build (you get an email); then it shows
up in TestFlight.

## Publish on the App Store

The very first release (creating the app, privacy policy, store texts, App
Privacy, pricing) is in [APP_STORE_RELEASE.md](APP_STORE_RELEASE.md). For every
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
*Resolution Center*, fix it, run `node scripts/release.js --keep-version`, pick
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
