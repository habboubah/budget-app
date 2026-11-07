# 15 · Ratings and feedback

- **Covers:** S3, and "make all users happy": hearing about problems before they turn into 1-star reviews
- **Depends on:** 14
- **Size:** S
- **Native:** iOS (one call in the bridge)
- **Schema:** no change

## Why

Ratings drive ranking and trust, and Spartopf never asks for them. Unhappy users need a faster way to reach us than a store review.

## What the user gets

- **Rating prompt:** Apple's own prompt, shown at a good moment. The system shows it at most three times a year.
- **Under *Optionen › Über Spartopf*:**
  - **Spartopf bewerten** opens the App Store review page.
  - **Feedback senden** opens Mail with the app version and the iOS version filled in, and nothing else.
  - **Datenschutz** opens the privacy policy.

## Keep it simple

No custom "Gefällt dir Spartopf?" dialog, no stars of our own, no nagging.

## Privacy and security

- The app sends nothing. The user writes and sends the mail in their own mail app.
- The moment for the prompt is chosen by a local rule, not by analytics.

## Design

- **Bridge call:** `requestReview()` calls StoreKit's review request on the active window scene. Use the current StoreKit API.
- **Local rule:** `shouldAskForReview(state, today)` in `src/logic.ts`, tested. The prompt is shown only when all of these hold:
  - the app has been used for at least 14 days, with at least 30 entries;
  - something good just happened: a month closed with money saved, a goal reached (12), or an import of 10 or more entries;
  - the current session had no error, no failed import and no undone delete;
  - we haven't asked in the last 120 days.
- **Review link:** `https://apps.apple.com/app/id<APP_ID>?action=write-review`. Fill in the app id once the app is live, and add it to plan 01's URL allowlist. It opens outside the app.

## Tests and checks

- The rule: every condition, at its boundaries.
- On a device, use a development build. There the prompt always appears (with submitting disabled), while TestFlight builds never show it.
- The Mail and link rows open the right places.

## Done when

- [ ] The prompt only appears when the rule allows it.
- [ ] The three rows under *Über Spartopf* work.
