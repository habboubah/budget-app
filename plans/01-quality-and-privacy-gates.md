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
