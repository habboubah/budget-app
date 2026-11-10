# 38 · Screenshots, story and release

- **Covers:** S4, the final pass of S1, and the launch on both stores
- **Depends on:** 37
- **Size:** M
- **Native:** none
- **Schema:** no change

## Steps

1. **The story** the screenshots tell, in this order:
   1. Privacy: "Kein Konto. Keine Cloud. Kein Tracking. Kostenlos, ohne Werbung."
   2. Capture without typing: Apple Pay, screenshot, CSV.
   3. The two balances and *pro Tag*.
   4. Budgets and Spartöpfe.
   5. *Planen*.
   6. Widgets.
   7. Arabic and Turkish.
2. **Screenshots**, made with `npm run screenshots` and `.claude/skills/app-store-screenshots`:
   - devices: iPhone 6.9", an Android phone
   - languages: DE, EN, AR, TR
   - light mode, plus one dark screenshot
3. **App Preview video** (15–30 s): pay for a coffee with Apple Pay → it shows up in Spartopf → *pro Tag* updates.
4. **Listings.**
   - Final texts in every language, following plan 16's rules.
   - What's New and keywords.
   - The Play listing and its Data safety form.
5. **Accessibility labels**, checked again against the final app.
6. **Release.**
   1. Run `npm run check`.
   2. Ship with `scripts/release.js` (iOS) and `scripts/release-android.js`.
   3. TestFlight and the Play internal track, with five testers for a week.
   4. Submit for review.

## Done when

- [ ] Both stores show the new listing.
- [ ] The app is live on both.
