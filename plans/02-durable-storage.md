# 02 · Durable storage

- **Covers:** F23, part 1: the biggest data-loss risk, and the angriest complaint about competitors
- **Depends on:** 01
- **Size:** M
- **Native:** iOS config only (no Swift)
- **Schema:** no change to `AppData`

## Why

Every entry lives in the web view's `localStorage`:
- the keys `spartopf-categories`, `spartopf-entries` and `spartopf-months`
- written by `persist()` in `src/store.ts`

[Capacitor's storage guide](https://next.capacitorjs.com/docs/next/guides/storage) says to treat that storage as temporary, because the OS reclaims web-view storage when the phone runs low on space. If it gets cleared, every month is gone.

## What the user gets

Nothing new to learn. Data survives low storage, a crash in the middle of saving, and app updates.

## Keep it simple

No new screen. The existing storage-error banner covers failures.

## Privacy and security

- The file lives in the app's own sandbox (`Directory.Library`), not in Documents, so the Files app can't show or edit it.
- It's part of the phone's own backup (Finder, iCloud Backup) by default. Plan 06 adds the switch to leave it out, and the file-protection class.

## Design

- **`src/storage.ts`** becomes the only module that reads or writes user data:
  - `hydrate(): Promise<StoredState>` runs before the first render; `main.tsx` awaits it. Until then, the page shows the plain background, as it does during today's load. Aim for under 100 ms with a two-year book, and measure it.
  - `save(state)` is debounced to 300 ms. `flush()` runs on `appStateChange` → background, and on `pagehide`.
  - **Native** (iOS now, Android in plan 23): one file, `spartopf/data.json`, written with `@capacitor/filesystem` (already a dependency).
  - **Web/PWA:** `localStorage` as today, plus `navigator.storage.persist()` once.
- **File format:** `{ app: 'spartopf', schemaVersion, savedAt, sha256, data: { categories, entries, months, … } }`.
- **Atomic write:**
  1. Write `data.json.tmp`.
  2. Keep the current file as `data.prev.json`.
  3. Rename the temp file to `data.json`.

  First check whether `Filesystem.rename` replaces an existing target on iOS. If it doesn't, delete and then rename; `data.prev.json` covers the gap.
- **Integrity:** on load, check the SHA-256 with WebCrypto. If it fails or the JSON is broken, fall back in this order:
  1. `data.prev.json`
  2. the `localStorage` mirror
  3. the crash screen with "Daten retten"
- **Migration:**
  - The first launch without a file reads `localStorage` as `loadInitial()` does today, then writes the file.
  - Keep writing the `localStorage` mirror for two releases, as rollback safety. Then remove it, and note in CLAUDE.md which release does that.
- **View preferences** (language, theme, accent, folded cards, intro) stay in `localStorage`. Losing them costs nothing.
- **`useAppStore()`** keeps its API:
  - It takes its initial data from the result of `hydrate()`.
  - One `save()` effect replaces the three data `persist()` effects.
  - The `failedKeys` state becomes a single `saveFailed` flag for the banner.

## Steps

1. `src/storage.ts` with an injectable `FsLike` interface, so tests run without Capacitor.
2. `main.tsx`: `await hydrate()`, then render. The ErrorBoundary's rescue reads the file as well as `localStorage`.
3. `store.ts`: switch to `save()` and `flush()`.
4. Migration and the mirror.
5. Device test on a debug build:
   1. Delete the app's WebKit data (`Library/WebKit`, via a debug-only button).
   2. Relaunch. Everything must load from the file.

## Tests and checks

`storage.test.ts`:
- a save and load round trip
- a corrupt `data.json` falls back to `data.prev.json`
- both files corrupt → the mirror is used
- a checksum mismatch is detected
- the debounce merges writes, and `flush()` writes at once
- migrating plan 01's `localStorage` fixtures gives the same golden balances

On a device: stop the app from Xcode 20 times in the middle of editing. Nothing is lost beyond the last 300 ms.

## Done when

- [ ] On iOS, user data is read from and written to the file.
- [ ] Wiping WebKit storage on a debug build loses nothing.
- [ ] Old installs migrate on first launch, and the web/PWA keeps working.
- [ ] CLAUDE.md's architecture rules describe `storage.ts` instead of `localStorage` for data.

## Not in this plan

Snapshots (03), encryption (04, 06), Android (23, which reuses this).
