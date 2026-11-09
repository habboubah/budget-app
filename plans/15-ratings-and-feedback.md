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

- [x] The prompt only appears when the rule allows it. (`shouldAskForReview` is tested at every boundary; the prompt itself is still to see on a device.)
- [ ] The three rows under *Über Spartopf* work. (Built; opening the App Store, Mail and Safari is still to try on an iPhone.)

## Notes (built)

- **The rule:** `shouldAskForReview` and `REVIEW_RULE` live in `src/logic.ts`, as planned. The state comes from two device settings in `store.ts`: `spartopf-first-use` (set on the first launch with this version, so existing users wait 14 days too) and `spartopf-review-asked`. Entries are counted without the test data, which adds a whole year.
- **"Something good":**
  - **A month closed with money saved:** the user opens the report of the month just closed, and it saved money (income − spending > 0).
  - **A goal reached:** a savings pot crossing its target. One reached before the app started doesn't count.
  - **A big import:** a bank import or an Excel import of 10 or more entries. The widget/Siri inbox doesn't count.
  - The prompt is asked for 1.5 s later, so it doesn't cover the toast.
- **Trouble:** App's `show` marks any *Rückgängig* as trouble, which covers an undone delete and an undone import. So does the storage-error banner, and the two import failure paths.
- **The rows:** in `src/links.ts`, written out in full. The privacy check reads the bundle's URLs as text and allows exactly the review page and the two policy pages.
  - *Spartopf bewerten* shows only in the iPhone app (and with the dev flag). It uses the app's Apple ID, `6829541731`, from App Store Connect; the page works once the app is live.
  - *Feedback senden* goes to the address the privacy policy already gives, with the iOS version from iOS itself (`SpartopfShared.system`). WebKit's user agent may freeze its OS version, so it is only the web's fallback.
- **Native:** `requestReview`, `open` and `system` are in `SpartopfShared.swift`, on the main actor. `open` only takes https links to `apps.apple.com` and `habboubah.github.io`, and mailto: links. `AppStore.requestReview(in:)` from iOS 16, `SKStoreReviewController` before.
- **Bundle:** 311.5 kB gzip, within the 310 kB baseline + 10 %.
- **Still to do on an iPhone:**
  - with a development build from Xcode (TestFlight never shows the prompt), meet the rule and see the prompt;
  - the three rows open the App Store, Mail and Safari;
  - once the app is live, check that the review link opens its page.
