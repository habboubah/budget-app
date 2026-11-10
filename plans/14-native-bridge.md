# 14 · Native bridge

- **Covers:** groundwork for plans 15, 17, 18, 19 and 35, plus the PDF in 28 and file opening in 33
- **Depends on:** 02, 06
- **Size:** M
- **Native:** iOS (Swift in the app target)
- **Schema:** no change

## Why

Widgets, Siri and Shortcuts automations all run outside the web view. They need a small, safe way to:
- read a summary of the book;
- hand new entries to the app.

Build that once, carefully, before the features that use it.

## What the user gets

Nothing visible yet.

## Privacy and security

- **Our own code.** No third-party plugin, because the bridge handles financial data.
- **Summary only.** The shared files hold only what widgets and intents need (see the snapshot below), never the whole book.
- **File protection.** Shared files are written with `completeUntilFirstUserAuthentication`, because widgets and intents can run while the phone is locked.
- **Inbox.** It's deleted as soon as the app has taken in its items.
- **Amounts outside the app.** Allowed only when the user turns that on (a switch for it — none exists). By default the snapshot holds `amountsHidden: true` and no amounts at all.

## Design

### Native side (Swift)
- **Custom code:** a `MainViewController: CAPBridgeViewController`, set as the storyboard's view controller. It registers our plugins in `capacitorDidLoad()`, as Capacitor's "Custom Native iOS Code" guide describes.
  - Keep the UIScene setup intact; CLAUDE.md requires it and `scripts/release.js` checks it.
- **App Group:** `group.com.habboubah.spartopf`, on the app and on every extension.
- **Plugin `SpartopfShared`:**
  - `writeSnapshot({ json })` writes `snapshot.json` to the App Group, then calls `WidgetCenter.shared.reloadAllTimelines()`.
  - `readInbox()` returns the items that intents and widgets wrote; `removeInbox({ ids })` deletes them.
  - `requestReview()` (15) and `makePdf()` (28) get added later.

### Data formats
- **Snapshot** (versioned JSON):
  - month key, *Jetzt*, *Am Monatsende*, *pro Tag*, paid share
  - the next 3 open bills: name, date, amount
  - favourites (09)
  - categories for intents: id, name in the user's language, emoji, kind
  - currency, locale, accent
  - `amountsHidden`, `locked`
- **Inbox item:** `{ id, source: 'siri' | 'widget' | 'wallet' | 'notification' | 'share', createdAt, amount?, name?, categoryId?, date?, card?, text? }`.

### Web side, `src/native/`
- `bridge.ts`: typed calls; no-ops on the web.
- `buildSnapshot(data, prefs, today)`: pure.
- `inboxToEntries(items, data)`: pure. It reuses `planStatement()` for payee names, and for duplicates via `Entry.ref`.

### When things happen
- **Writing the snapshot:** after each save (debounced together with plan 02's save), and at midnight, because *pro Tag* changes.
- **Reading the inbox:** at launch and on resume (`App.tsx`). Items are booked as paid, with one undo toast ("3 Einträge übernommen"). With plan 19's review mode on, they go to a *Neu* list instead.

### Deep links
- **Scheme:** `spartopf` (`CFBundleURLTypes`):
  - `spartopf://add?category=…&amount=…&name=…`
  - `spartopf://month/2026-11`
  - `spartopf://entry/<id>`
- **Handled** by `CapacitorApp.addListener('appUrlOpen')`.
- **Validation:** every parameter is validated; unknown ones are ignored.

## Steps

1. `MainViewController`, the plugin skeleton and the App Group entitlement. Add a debug button that round-trips a snapshot.
2. `buildSnapshot`, `inboxToEntries` and the deep-link parser: pure functions, with tests.
3. Wire it into `store.ts` and `App.tsx`, and register it with plan 05's `wipeAll()`.
4. Document the bridge in CLAUDE.md, under "Native iOS".

## Tests and checks

- **Unit tests** for the three pure functions:
  - with amounts hidden, the snapshot has no amount fields at all;
  - duplicates in the inbox are skipped;
  - bad deep links are ignored.
- **On a device:**
  - Write a snapshot and read it from a debug extension.
  - Add an item to the inbox from a test intent while the app is closed. Open the app: the entry is there, and undo removes it.

## Done when

- [ ] Snapshot, inbox and deep links work on a device, with amounts hidden by default. (Built and unit-tested; the device steps above are still to do.)
- [ ] `scripts/release.js` still passes its UIScene check and archives the app. (The UIScene check reads `Info.plist` and `SceneDelegate.swift`, both kept; the archive needs the App Group on the App ID — see the notes.)

## Notes (built)

- **Native:** `ios/App/App/SpartopfShared.swift` holds `MainViewController` and the plugin, one new file in the Xcode project (checked with a pbxproj parser; not compiled — there is no Swift toolchain where it was written).
  - `SceneDelegate` sets `MainViewController()` as the root instead of `CAPBridgeViewController()`. The storyboard isn't used for the root here, so it stays as it was.
  - `App.entitlements` gains the App Group. `Info.plist` gains `CFBundleURLTypes` (`spartopf`).
- **Plugin methods:** `writeSnapshot`, `readSnapshot` (for the debug round trip), `readInbox` and `removeInbox`. Also `clear`, added for `onWipe`, which the plan only implied.
  - `readInbox` returns `{ id, json }` per file, so the app can drop a broken item by its file name.
  - Caps: snapshot 256 KB, item 64 KB, 500 items per read; ids `[A-Za-z0-9_-]`, no paths.
- **Decided while building:**
  - The inbox item gains `favoriteId` and `paid`. A favourite button outside the app sends only the favourite's id and the app looks up name, category and amount, so the snapshot needn't carry amounts for the buttons to work; the snapshot says `hasAmount` instead. `paid: false` books an open entry (Siri's `paid` parameter, plan 18).
  - An item without a date is dated by its creation time only when that is within the past year; otherwise today. The tests caught a 1970 date.
  - `showAmounts` is `false` as long as no switch for it exists, and must stay `false` while *Beträge verbergen* (plan 06) is on.
  - Only the `appUrlOpen` listener, not `getLaunchUrl()`: the App plugin keeps a cold start's link until a listener is there (`retainUntilConsumed`), and `getLaunchUrl` would also return the last link on every later call.
  - The inbox is read only once the app is unlocked, and a link is held while locked.
  - Items leave the inbox 350 ms after booking, once `saver.flush()` has put the book on disk. If the app stops before that, the refs mark them as already there on the next read.
- **Bundle:** the baseline is raised to 310 kB, with the note in `scripts/perf-check.mjs`.
- **Month switch:** the 150 ms budget is tight on the machine this was built on. About one run in four went over, with plan 14's code and without it (plan 14 adds no work to a month switch on the web). Measure on the Mac.
- **Still to do on an iPhone:**
  - **Signing:** the App Group must exist on the App ID. Automatic signing with `-allowProvisioningUpdates` should register it; if the archive fails, tick *App Groups → group.com.habboubah.spartopf* once in Xcode's Signing & Capabilities. Data Protection (plan 06) the same way.
  - *Optionen › Sichern und übertragen* with `spartopf-debug`: *Widget-Daten testen* says written and read back.
  - **Inbox test:** put a test item into `inbox/` while the app is closed (from a debug extension, or by hand in the App Group container via Xcode's *Devices*), e.g. `{"source":"siri","createdAt":<now>,"amount":1240,"name":"Test"}`. Open the app: one toast, and undo removes the entry.
  - **Links:** `spartopf://month/2026-10` and `spartopf://add?amount=12.50&name=Test`, from Notes or Safari, with the app closed, open and locked.
