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

## Notes (build log)

Built together with plan 13 (phase 4) in one pass, November 2026.

**Before captures:** `screenshots/insights-06a/before/` (stats, stats-full, stats-category, stats-payees, insights, insights-full, contracts, month; 4 sizes × DE/AR × light/dark) and `before-text2/` (SE and Pro Max at `--text 2`). Gitignored.

**Open points decided while building** (the user asked for the most sensible option where the plan left one open):
- `MonthPoint.expense` keeps its account meaning (every outflow). New: `spending` (*Ausgaben*: need + want), `invested` (*Angelegt*), `kept` (*Kontoplus*). `saved` = income − spending, `rate` = saved ÷ income (D1).
- *Grundbedarf* averages the last up to 12 finished months (the same 12 months its yearly part looks at).
- *Finanz-Check* rows 1 and 3 use the last up to 6 finished months, as Planen did before.
- Trends (H4) leave yearly entries out, like `unusual()` (I6): a yearly bill in one three-month window isn't a trend.
- Stale (H1, H7): days since the newest sign of life in the running month — a one-off entry's date (up to today), or any entry entered or ticked.
- The month-review card sits on the running month and speaks about the month before it, from the second finished month on, until ✕ or opened (`spartopf-reviews-seen`).
- *Als Budgets übernehmen* suggests budgets for need / want categories whose 12 months were mostly one-off spending and averaged at least 20 €, rounded with `roundBudget()`, at most six.
- *Vorausgeplant* (Finanz-Check row 4) waits for plans 11 and 12.

**Progress** (kept current while building; tick boxes in §11 at the end):
- [x] Folder move `src/insights.ts` → `src/insights/` (index re-exports; no behaviour change).
- [x] Engine: `book.ts`, `baseline.ts`, D1 in `series.ts` (`investedByMonth`, `upToNow`), robust `unusual()` and yearly-free trends in `hints.ts`, `pace.ts`, `outlook.ts`, `health.ts`, `highlights.ts`, `detail.ts`, `review.ts`; `formatMoneyEstimate` / `compactMoney` in logic.ts; tests next to each.
- [x] Words: `src/insightText.ts`; all new strings in de / en / ar.
- [x] Store: `spartopf-hints-hidden`, `spartopf-reviews-seen`; entry sheet preset takes amount and open.
- [x] UI: charts (ChartFrame takes any slots + week groups with scrubbing; PaceChart, OutlookChart, CategoryTrendChart with Ø / budget lines and hatching, ShareBar, MiniBars; `chart-halo` for in-plot labels), StatsView, InsightsView, PaceCard, OutlookCard, FinanceCheckCard, HintRows, CategoryView, PayeeSheet, ExplainSheet, MonthReportView + ReviewCard, YearReviewView (+ `shareImage.ts`, `export.shareImage`), App navigation (`HOME`; category / monthReport / yearReview pushed on the tab they're opened from).
- [x] Golden year extended (Kfz-Versicherung yearly in January, undated *Wochenmarkt* entries, June's opening 12,34 € under the carry-over, clothing three times a year) and re-recorded. On the old year, D1 alone moves Ø gespart from 1.361,73 € to 1.561,73 € (the 200 € ETF plan a month now counts as saved) — exactly 50/30/20's save part; with the extended year it is 1.454,54 €, again equal to 50/30/20's save part to the cent's rounding.
- [x] Tests: invariants on seeded books, edge cases, every fixture finite in every new figure, every hint kind in de / en / ar, the speed budget.
- [x] perf-check, ui-review screens, after captures, docs, `npm run check`.

**Performance** (next to plan 01's baselines):
- Vitest, ten generated years (18.101 entries), book + every Statistik and Planen figure: 26–30 ms, the fastest of five runs while the other test files run beside it (budget 50 ms). It was 107 ms until `computeBalances` grouped the entries by month in one pass (it read every entry once per month) and `budgetRule` / `monthReview`'s budgets stopped rescanning the book. CI hasn't run it yet; a slower runner has about 40 % headroom.
- `perf-check.mjs` (desktop Chromium, the demo year): month switch 21–43 ms (150), switch to Statistik 18–43 ms and to Planen 20–27 ms (new budget 200 ms), no long task.
- Main bundle 253,3 kB gzip: the baseline moves from 221 to 254 kB (+32 kB: the engine, eight new cards and screens, about 200 strings × three languages; 38 keys of the removed cards went). Splitting the pushed screens into lazy chunks would save less than 10 kB and flash an empty screen on push, so it wasn't done.

**Charts** (roast-my-chart pass on PaceChart, OutlookChart and the category chart, against the 61 caveats): no 🔴. 🟠 fixed: Arabic labels inside the plots ran the wrong way round (now isolated, word on the right, amount left to right); the category chart's hatching had no key (the "Schraffiert …" note now shows under it); Ausblick's dots had no key ("Punkte: Monate mit einer Jahresrechnung"). 🟠 justified: Ausblick's y-axis doesn't start at zero — it is a balance, about the change, the same convention as the balance chart, with the zero line drawn when it is in range; the pace chart's two lines are the two series the legend toggles, the band labelled in the sub-line and the explainer.

**Accessibility:** every 44 pt finding of the after-audit is fixed: charts that pick nothing on tap (Ausblick, the payee sheet, the year's months) join neighbouring months into one target and read them together; the pace chart has four week targets (the days after the 28th join the fourth). After captures: `screenshots/insights-06a/after/` (17 screens × 4 sizes × DE/AR × light/dark) and `after-text2/`. Clean everywhere at 1×. At `--text 2` one finding stays, unchanged from the before captures: on the SE, Statistik's income and balance charts give each of six months 40–42 px, because the y-axis widens with the text (step 8's charts; letting them scroll at that size is a design change for later).

**Plan 11 hook:** `outlook()` carries every coming month's yearly bills (`months[].big`, `bigItems()`); plan 11's `yearlyReserve()` takes its shortfall from there instead of re-deriving the bills.

**Not verified here** (needs the device or people): VoiceOver on the iPhone (§12.9 script), no long task > 50 ms on an iPhone SE when switching tabs, iOS WebKit's `useGrouping: 'always'` (`compactMoney` falls back to standard notation under a million when an engine leaves "4000" ungrouped, so it reads right either way), the five-person usability test (§12.13), a native Arabic reader for the new strings (§9.10).
