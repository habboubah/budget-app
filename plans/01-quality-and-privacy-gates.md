# 01 · Quality and privacy gates

- **Covers:** "fix all issues". Competitors' worst reviews follow updates that broke speed, totals or data (Spendee 6, Bluecoins, Goodbudget). This plan also proves the privacy promise.
- **Depends on:** 00
- **Size:** M
- **Native:** none
- **Schema:** no change

## Why

The next 37 plans touch almost every file. Today's CI (`.github/workflows/ci.yml`) runs lint, the tests and a grep for CDN hosts. That catches a CDN link, but it misses three things:
- a `fetch` to a new host
- a money-rule regression
- an old payload that no longer loads

## What the user gets

Nothing visible: updates that don't break things.

## Design

1. **`npm run check`** runs `lint`, `test`, `check:privacy`, `check:perf` and `audit:contrast`.
   - `scripts/release.js` gates on it instead of on `lint` + `test`.
   - CI runs it too.
2. **Privacy check** (`scripts/privacy-check.mjs`, Playwright, the same setup as `scripts/ui-review.mjs`):
   - **Setup:** `vite build`, serve `dist/` with `vite preview`, open it in Chromium and use `page.route('**/*')` to record every request.
   - **Steps:** first run, add an entry, tick it off, open every tab, import the CSV fixture, read the OCR fixture image, export a backup.
   - **Rule:** fail on any request whose origin isn't the preview server.
   - **Bundle grep:** CI's grep becomes an allowlist. Every `https?://` in `dist/` must be on a short list: the privacy-policy URL now, the App Store review link from plan 15 later.
3. **Compatibility fixtures** (`src/fixtures/storage-v1.json` … `storage-v9.json`, plus `backup-*.json`):
   - One stored payload per schema version, built from the `upgradeData` tests and git history. Synthetic data only, never real finances.
   - `src/compat.test.ts` loads each one through `normalizeState` and `upgradeData` and compares month balances with recorded values.
4. **Golden data** (`src/fixtures/demo-year.json` + `golden.json`): one demo year with the expected values per month:
   - *Jetzt*, *Am Monatsende* and *pro Tag*
   - budget states
   - savings rate and the 50/30/20 split

   A change to a money rule must update `golden.json` on purpose, and say why in the commit.
5. **Performance budgets** (`scripts/perf-check.mjs`, 12 months of demo data):
   - **Typing an amount:** no long task over 50 ms per keystroke (`PerformanceObserver('longtask')`).
   - **Month switch:** next frame with content in under 150 ms.
   - **Main bundle:** record today's gzip size; fail if it grows by more than 10 % without a note in the plan that caused it.

   Headless Chromium is a proxy for the iPhone. These numbers are guardrails, not promises.

## Steps

1. Fixtures and `compat.test.ts`; make it pass on today's code.
2. `privacy-check.mjs`. Prove it fails when `fetch('https://example.com')` is added somewhere, then remove that again.
3. `perf-check.mjs`, with today's numbers recorded in it.
4. Wire up `npm run check`, `scripts/release.js` and CI.
5. Describe the gates in CLAUDE.md, under "Before calling a change done".

## Done when

- [ ] `npm run check` passes locally and in CI.
- [ ] Each of these makes it fail: a deliberate third-party request, a deliberately broken carry-over rule, a deliberately unreadable old payload.
- [ ] `scripts/release.js` refuses to ship on a red check.

## Not in this plan

Performance tests on real devices (plan 37).

## Notes (done)

- `npm run check` = lint, test, `vite build`, `check:privacy`, `check:perf`,
  `audit:contrast`. `scripts/release.js` gates on it; CI installs Chromium and
  runs it (the old CDN grep is gone — it would have failed on tesseract's
  default paths, which the allowlist now names with their reason).
- **Fixtures** (synthetic): `storage-v1`, `-v3`, `-v6`, `-v9` (what
  `localStorage` held — loaded through the newly exported `store.loadStored`)
  and `backup-schema-8`, `-9`. Between them every migration runs: v2's new
  built-ins, v3's Arabic names, v4's merges, v5's Restaurants, v6's emoji,
  v7's dates, v8's Kinder, v9's budgets. Versions without their own file are
  passed through by the older ones; add a file per new version from here on.
  `compat.test.ts` checks entries kept, sums, migrations and golden balances.
- **Golden year:** `demo-year.json` (Dec 2025 – Nov 2026, a bill left open in
  September so the carry-over's two openings differ) and `golden.json`
  (`toMatchFileSnapshot`; update on purpose with `-u`): balances, per day,
  savings rate, budgets, 50/30/20, contracts, the first reminders.
- **Privacy check** steps: first run, an entry added and ticked off, every
  tab, a bank CSV, an OCR read of a drawn screenshot, a backup export. The
  service worker is blocked during the run; its file is in the bundle scan.
- **Perf baselines** recorded: main chunk 221.0 kB gzip (level 9), month
  switch 23–33 ms, no long task while typing.
- **Proved to fail:** a `fetch('https://example.com/ping')` in `main.tsx`
  (both the bundle scan and the request check), `openingNow` taken from the
  previous month's end (compat and golden), an entry in `storage-v1.json`
  made unreadable (compat). All reverted.
- **Not verified:** the CI run itself (nothing is pushed).
