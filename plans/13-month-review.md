# 13 · Month review

- **Covers:** U2 (similar to Spendee's tips and Copilot's alerts); a reason to open the app every month
- **Depends on:** 00; 12 (for the optional line about goals)
- **Size:** S–M
- **Native:** none (the optional nudge uses plan 00's reminders)
- **Schema:** no change

## Why

People open a budget app when something is due. The start of a month has a story worth telling: what was saved, what changed, what's still open. The app already computes all of it.

## What the user gets

On the first visit to a new month, one card above the categories:

"Oktober im Rückblick · 412 € gespart (80 € mehr als üblich) · Restaurants +60 % · 2 Budgets eingehalten · 1 Posten noch offen"

- Tapping it opens *Planen* on October.
- ✕ dismisses it.

## Keep it simple

- Shown only from the second finished month, once per month, as a single dismissible card.
- Not shown when there's nothing to say.
- The optional reminder ("Dein Oktober im Rückblick") is off by default and sits with the other reminders.

## Design

- `monthReview(data, month, today)` in `src/insights.ts`, built from existing pieces:
  - `savings()`, `unusual()` and `biggestExpenses()`
  - `monthBudgets()` from `src/budgets.ts`
  - open items carried over
  - goal progress (12)
- Months already seen: a view preference (`spartopf-reviews-seen`), not in backups.
- The card uses `ui/Card` and the month's category hues for the changes. Amounts follow *Beträge verbergen* (06).

## Tests and checks

- First month → no card.
- An empty month → no card.
- A normal month → the right figures.
- Dismissing it is remembered.

## Done when

- [ ] The card appears once per new month with correct figures, and never in the first month or an empty one.
