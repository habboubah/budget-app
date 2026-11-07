# 06a · Statistics and insights

- **Covers:**
  - [STATISTICS_AND_INSIGHTS.md](../STATISTICS_AND_INSIGHTS.md) phases 0–3
  - U4 (this month at a glance), and the "looking ahead" that reviewers praise (COMPETITOR_ANALYSIS.md §4)
- **Depends on:** 00, 01
- **Size:** L
- **Native:** none
- **Schema:** no change (stays 10)

## Why

Statistik and Planen already compute a lot, but:
- once a savings category is used, two cards disagree about how much is saved;
- *Planen* mixes five time scopes, and its hints are unranked and lead nowhere;
- nothing answers "am I on track this month?" or "where will the balance be in March?";
- a category can't be opened to see its months, payees and entries.

It comes right after the trust plans. It fixes numbers people already see, and plans 11, 12 and 13 build on the *Planen* it leaves behind.

## Scope

STATISTICS_AND_INSIGHTS.md §11, phases 0–3, exactly as written there. That file stays the source of truth for what is shown, the rules behind each figure (§6, §9, §10) and the gates (§12). This plan only adds the points below.

| Phase | Add to it |
|---|---|
| 0 Numbers you can trust | Extend plan 01's golden year (`src/fixtures/demo-year.json`, `golden.json`) instead of adding a second fixture. D1 changes recorded values on purpose: re-record with `npx vitest run src/golden.test.ts -u` and say why in the commit. Add switching to Statistik and to Planen to `scripts/perf-check.mjs`. |
| 1 Two clear tabs | Keep `InsightsView.tsx` and the tab id `insights`, as step 9 did. |
| 2 Looking ahead | `outlook()` is what plan 11's shortfall uses. |
| 3 Drill-down | A pushed screen with a parameter keeps that parameter in `App` state, one per screen. `PARENT` becomes the tab the screen was pushed on (STATISTICS_AND_INSIGHTS.md §10.5). |

## Decisions

D1–D8 in STATISTICS_AND_INSIGHTS.md §14, taken on 7 November 2026 as recommended. The ones other plans rely on are also in [plans/README.md](README.md#decisions-already-taken).

## Done when

- [ ] Every "Done when" of phases 0–3 in STATISTICS_AND_INSIGHTS.md §11 is ticked.
- [ ] `npm run check` passes.
- [ ] ui-review is clean on `stats`, `stats-full`, `insights`, `insights-full`, `contracts` and the new screens, at `--text 2` too.
- [ ] CLAUDE.md's "Statistik and Planen" rule describes what was built.

## Not in this plan

- Phase 4, the month report and the year review: plan 13.
- Years and the comparison with last year: plan 29. The PDF: plan 28.
- Notifications built on these insights: later, as sources in plan 00's reminder scheduler.
