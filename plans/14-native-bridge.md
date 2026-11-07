# 14 · Native bridge

- **Covers:** groundwork for plans 15, 17, 18, 19 and 35, plus the PDF in 28 and file opening in 33
- **Depends on:** 02, 06
- **Size:** M
- **Native:** iOS (Swift in the app target)
- **Schema:** no change

## Why

Widgets, Siri, Shortcuts automations and the Watch all run outside the web view. They need a small, safe way to:
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
- **Amounts outside the app.** Allowed only when the user turns that on (plan 17's switch). By default the snapshot holds `amountsHidden: true` and no amounts at all.

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
- **Inbox item:** `{ id, source: 'siri' | 'widget' | 'wallet' | 'notification' | 'share' | 'watch', createdAt, amount?, name?, categoryId?, date?, card?, text? }`.

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

- [ ] Snapshot, inbox and deep links work on a device, with amounts hidden by default.
- [ ] `scripts/release.js` still passes its UIScene check and archives the app.
