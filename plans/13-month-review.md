# 13 · Month report and year review

- **Covers:**
  - U2 (like Monarch's monthly review, Monzo's year in review and Spendee's tips)
  - [STATISTICS_AND_INSIGHTS.md](../STATISTICS_AND_INSIGHTS.md) phase 4
  - a reason to open the app every month
- **Depends on:** 06a; 12 (for the optional line about goals)
- **Size:** M
- **Native:** none. The optional nudge uses plan 00's reminders; the share image uses `@capacitor/share`, already a dependency.
- **Schema:** no change

## Why

People open a budget app when something is due. The start of a month has a story worth telling: what was saved, what changed, what's still open. The turn of the year is when households plan the next one. Plan 06a computes all of it.

## What the user gets

- **The month-review card.** On the first visit to a new month, one card above the categories:

  "Oktober im Rückblick · 1.140 € gespart (160 € weniger als üblich) · Restaurants +60 % · 2 Budgets eingehalten · 1 Posten noch offen"

  - Tapping it opens the *Monatsbericht*.
  - ✕ dismisses it.
- **The Monatsbericht**, for any month (STATISTICS_AND_INSIGHTS.md §9.7):
  - the result against a usual month;
  - Einnahmen, Ausgaben, Gespart, Sparquote;
  - budgets kept;
  - what changed;
  - where the money went;
  - what's still open;
  - a look at the next month.

  It also opens from the month's "⋯", from *Planen › November bis heute* and from Statistik's table.
- **The Jahresrückblick**, from 15 December to 31 January, as a card on Statistik:
  - the year in three numbers, its months, the top categories against last year, top payees, the biggest expense and the best month;
  - *Für 2027*: fixed costs per month, yearly bills as a monthly reserve, and suggested budgets with **Als Budgets übernehmen** (one undoable action);
  - shared as an image only on tap, with amounts hidden unless switched on.

## Keep it simple

- The month card shows from the second finished month on, once per month, as one dismissible card. It doesn't show when there's nothing to say.
- The year card is seasonal and dismissible.
- The optional reminder ("Dein Oktober im Rückblick") is off by default, sits with the other reminders and shows no amounts.

## Design

- `monthReview(book, month, today)` and `yearReview(book, year, today)` in `src/insights/review.ts`, built on plan 06a's book and highlights. The goal line uses plan 12's `goalProgress`.
- Months and years already seen: a view preference (`spartopf-reviews-seen`), not in backups.
- `MonthReportView` and `YearReviewView` are pushed on the tab they're opened from (plan 06a's navigation).
- Plan 28 renders the same report model as a PDF. Plan 29 shares the year logic.

## Tests and checks

- First month → no card.
- An empty month → no card.
- A normal month → the right figures, equal to Statistik's for that month.
- Dismissing is remembered; the year card only shows in season.
- *Als Budgets übernehmen* sets the suggested budgets, and undo restores the old ones.
- The share image shows no amounts unless switched on.

## Done when

- [ ] The month card appears once per new month with correct figures, never in the first month or for an empty one, and opens the report.
- [ ] The report's figures equal Statistik's for the same month.
- [ ] The year review shows in season, and its image never shows amounts unless switched on.

## Notes (build log)

Built in one pass with plan 06a (November 2026), ahead of plans 07–12: STATISTICS_AND_INSIGHTS.md phase 4 builds on 06a's book and highlights, and nothing in it needs 07–12 except the goal line.

- `src/insights/review.ts`: `monthReview(book, month, today)`, `reviewCardMonth(book, today, seen)`, `reviewSeason(today)`, `yearReview(book, year, today)`, `suggestBudgets(book, months)`; tested in `review.test.ts` and `invariants.test.ts` (the report's figures equal Statistik's series, the month page's totals and the category screen's for the same month).
- `MonthReportView` (pushed on the tab it's opened from: the review card and the month's "⋯" on Monat, *Monatsbericht ›* on Planen, a table row on Statistik) and `ReviewCard` on the running month.
- `YearReviewView` from the seasonal card on Statistik (15 Dec – 31 Jan, at least six months in the year; `spartopf-dev-season` shows it out of season). *Als Budgets übernehmen* sets every suggestion in one step and undoes in one. The picture (`shareImage.ts`) is drawn on the device on tap; without amounts unless *Beträge im Bild zeigen* is on — then it carries the headline, income and spending and the top categories' amounts.
- Seen months and years: `spartopf-reviews-seen` (view preference, last 200).
- **Decided while building:** the month card shows until ✕ or opened (both count as seen), not only on the first visit, so a quick look at the month doesn't lose it. *Noch offen* keeps what is still to pay and what is still expected apart — added up, an open salary and open bills made one meaningless sum. Budget suggestions skip mostly-recurring categories (rent) and those under 20 € a month, at most six.
- **Not built:** the goal line (plan 12's `goalProgress` doesn't exist yet); the optional "Dein Oktober im Rückblick" reminder (phase 5, through plan 00's scheduler). Plans 28 (PDF) and 29 (years) should take `monthReview` / `yearReview` as their model.
- **Done when:** the card appears once per new month with correct figures, never in the first month or for an empty one, and opens the report (tests); the report equals Statistik for the same month (tests); the year review shows in season and its image has no amounts unless switched on (by construction in `YearReviewView.image()`; not tested by a unit test — it is view code).
