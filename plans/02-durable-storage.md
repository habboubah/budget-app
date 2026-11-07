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

## Notes (built; device test pending)

- `src/storage.ts` as designed: `hydrate()`, `createSaver()` / `saver`
  (300 ms debounce, writes serialised, `flush()` on `pagehide`, hidden and app
  background), the envelope with SHA-256, `FsLike` (Capacitor's in the app,
  `Directory.Library`, path `spartopf/data.json`).
- **Rename:** `@capacitor/filesystem` 8.1.2 hands `rename` to the
  IONFilesystemLib package, whose replace behaviour isn't in this repo to
  read. So storage never renames onto an existing file: write the temp, delete
  the old `data.prev.json`, move `data.json` to it, move the temp into place.
  A crash between the two moves leaves a whole `data.json.tmp`, so `hydrate()`
  takes the newest of data.json / .tmp / .prev that checks out.
- Extra beyond the plan: `saver.forget()` for *Alle Daten löschen* (otherwise
  `data.prev.json` would keep the deleted book until the next save).
- `loadStored` moved from `store.ts` to `storage.ts` (the mirror and old
  installs read through it; `compat.test.ts` imports it from there).
- The store has one save effect; `failedKeys` became `saveFailed` (only the
  book's writes raise the banner; in the app only the file's, not the mirror's).
- Crash screen: an unreadable book (files broken, no mirror) renders the
  existing ErrorBoundary; *Daten retten* now adds the raw files to the dump.
- Debug tool for step 5: `localStorage['spartopf-debug'] = '1'` →
  *WebKit-Daten löschen* in *Sichern und übertragen* (clears the data keys
  and deletes `Library/WebKit`).
- **Measured:** `hydrate()` on a two-year book (644 entries, a 135 KB file):
  median 1.8 ms, worst 5.9 ms in Node with an in-memory file system — the
  Capacitor bridge's read comes on top on the phone; measure there.
- **Checked:** 14 tests in `storage.test.ts` (round trip, prev kept, broken
  file → prev, checksum mismatch → mirror, both broken → mirror, nothing to
  fall back on → error, a cut-short write → the temp or prev, debounce, flush,
  mirror vs file failures, the web, forget, moving `storage-v1.json` over with
  its golden balances, a fresh first launch); in the browser: written after
  the debounce, kept over a reload, the banner on a refused write and gone
  after the next one, the debug tool.
- **Mirror removal:** the release after 1.4 (noted in CLAUDE.md).
- **Not done (needs the iPhone):** the device test — wipe WebKit data with
  the debug tool, relaunch, everything there; stop the app from Xcode 20 times
  while editing; the hydrate time on the phone.
