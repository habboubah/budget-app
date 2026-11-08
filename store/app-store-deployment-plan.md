# App Store deployment plan — Spartopf

A single, step-by-step plan to get Spartopf live on the App Store: what to do, in
what order, and exactly what text to write for each field. This sits on top of two
files that already exist in the repo:

- **`APP_STORE_RELEASE.md`** — the mechanical build-and-upload steps (Xcode signing, the API key, `npm run release`). Follow it for the commands.
- **`store/listing.md`** — the finished copy (name, subtitle, description, keywords) in German, English and Arabic, already checked against Apple's character limits.

This document ties them together, adds competitor research, and gives you ideas to
sharpen the listing before you submit. Where a text is final, it points you at
`listing.md` rather than repeating it.

---

## 0. The 10-minute overview

| Phase | What happens | Where | Who | Rough time |
|---|---|---|---|---|
| A. Decide positioning | Lock the name, subtitle, keywords, description angle | This file + `listing.md` | You | 30 min |
| B. Prerequisites | Developer account, Xcode, API key | Mac / Terminal | You | 15 min |
| C. Create the app record | New app in App Store Connect | Browser | You | 5 min |
| D. Privacy policy live | Publish the policy page | Terminal | You | 5 min |
| E. First build to TestFlight | `npm run release:first` | Terminal | Automated | 10 min + Apple processing |
| F. Test on your iPhone | Install via TestFlight, try everything | iPhone | You | 10 min |
| G. Screenshots | `npm run screenshots` | Terminal | Automated | 5 min |
| H. Fill the listing | Paste every text + screenshots | Browser | You | 30 min |
| I. App Privacy + Pricing | "Data not collected", Free | Browser | You | 10 min |
| J. Submit for review | Add for Review → Submit | Browser | You | 2 min + 1–2 days Apple |

Phases B–J are the exact sequence in `APP_STORE_RELEASE.md` (steps 1–9). Phase A is
the planning this file adds. Do Phase A first — once you're happy with the words,
the rest is mostly copy-paste and waiting on Apple.

---

## Phase A — Positioning and copy (do this first)

Everything a buyer sees before they download is text and five screenshots. Get
this right and the technical steps are trivial.

### A1. What the App Store shows, and the limits

| Field | Apple's limit | What it's for | Where the text lives |
|---|---|---|---|
| **Name** | 30 chars | Brand + one keyword | `listing.md` → `Spartopf – Haushaltsbuch` |
| **Subtitle** | 30 chars | The one-line promise under the name | `listing.md` → `Haushaltsbuch ohne Konto` |
| **Keywords** | 100 chars, comma-separated, no spaces | Search ranking only (never shown) | `listing.md` keyword block |
| **Promotional text** | 170 chars | Editable any time without a new build | `listing.md` promo block |
| **Description** | 4000 chars | The full pitch; first 2–3 lines show before "more" | `listing.md` description block |
| **Screenshots** | up to 10; 6.9″ required | The thing people actually look at | `npm run screenshots` → `screenshots/de/`, `/en/` |
| **What's New** | 4000 chars | Per-release changelog | `listing.md` "What's New" block |

Two things are worth knowing:

- **Only the name, subtitle and keywords feed search ranking.** The description does
  not. So every keyword you care about should appear across name + subtitle +
  keyword field, without repeating a word (repeats are wasted characters).
- **The first ~2 lines of the description** are all most people read. Lead with the
  two-numbers hook, not a feature list.

### A2. The one-sentence positioning

Spartopf's edge, in plain terms:

> A private, offline household budget book that digitises your monthly Excel sheet —
> one account, one page per month, two numbers that matter (what's on the account
> now, and what's left at month end). No sign-up, no bank linking, no tracking.

Keep that sentence as the north star. Every screenshot caption and the first line of
the description should ladder up to it.

### A3. What the competition does (research, Nov 2026)

I looked at how comparable budget apps present themselves on the App Store. The
pattern among the strongest "private / offline" apps is clear, and Spartopf already
fits it. (Content below is rephrased from public App Store listings for compliance.)

| App | Angle they lead with | Takeaway for Spartopf |
|---|---|---|
| **ZeroBudget** | Private by design — data stays on the phone, no account, no servers, no bank linking ([listing](https://apps.apple.com/us/app/budget-app-zerobudget/id6759937538)) | "No account / stays on your phone" is a headline feature now, not fine print. You already say this — keep it in the subtitle and first screenshot. |
| **Private Budget** | States plainly it's offline and does not connect to any bank ([listing](https://apps.apple.com/us/app/private-budget/id6566190585)) | Naming the *absence* of bank linking reassures privacy-minded users. Worth one explicit line. |
| **Budget Flow** | No registration, works offline, quick to set up ([listing](https://apps.apple.com/us/app/budget-flow-expense-tracker/id1640091876)) | "Quick to set up / no first-run account" is a conversion driver. Spartopf's "no required field, works out of the box" is a selling point — say it. |
| **Pocket Budget (Offline control)** | Manage finances without internet; scheduling + targets ([listing](https://apps.apple.com/us/app/pocket-budget-control/id1569896183)) | Recurring items and due dates resonate. Spartopf's "recurring comes back on its own" maps directly. |
| **YNAB / EveryDollar / Monarch** | Goals, debt payoff, dashboards — but require accounts/subscriptions | These are the opposite end: powerful but not private and not free. Spartopf's "free, private, no account" is the explicit counter-position. Don't try to out-feature them; out-simplify them. |

ASO guidance for the Finance category (from [asomobile.net](https://asomobile.net/en/blog/aso-for-finance-apps-how-to-grow-in-a-competitive-niche-in-2026/) and [asoworld.com](https://asoworld.com/blog/which-app-categories-get-the-most-from-keyword-installs-a-category-by-category-aso-budget-guide/)) reinforces two points: Finance is one of the most competitive categories for keywords, and localised, scenario-style terms ("weekly bills", "monthly rent") convert better than generic ones. That's an argument for keeping your DE/EN/AR keyword sets distinct rather than translating one.

Content was rephrased for compliance with licensing restrictions.

### A4. Listing ideas to consider before you submit

Your `listing.md` copy is already strong and limit-checked. These are optional
tweaks, framed as decisions for you — not changes I've made:

1. **Subtitle A/B idea.** `Haushaltsbuch ohne Konto` (current) is distinctive. An
   alternative that front-loads the benefit: `Privat, offline, kostenlos` — but the
   current one is more specific and probably wins. Keep current unless you want to
   test.
2. **First description line = the hook.** The current DE description opens with the
   "simple as a spreadsheet, one thumb" line, which is great. Make sure the
   two-numbers sentence appears within the first two lines so it survives the "more"
   fold.
3. **One explicit "no bank linking" line.** Competitors call this out directly.
   You could add a short line under PRIVAT like "Keine Bankverbindung, keine
   Synchronisierung" to match how privacy-first apps reassure users. Optional.
4. **Keyword gaps to weigh.** Current DE keywords are solid. Candidates to consider
   swapping in if you drop a weaker one: `kontostand`, `rechnungen`, `abo`,
   `vertrag` (the Planen tab's contracts feature isn't reflected in keywords yet).
   You have 100 chars — count before adding.
5. **Promotional text is free to change anytime.** Use it for seasonal or
   feature-launch messaging without shipping a build. Keep the evergreen version in
   `listing.md` as the default.
6. **Screenshots tell the story in 5 frames:** month → new entry → next month →
   statistics → history. That order walks a new user through the core loop. Keep it.
   Consider a short caption burned into each image (the screenshot script may already
   do this — check `scripts/screenshots.mjs` output before uploading).

### A5. Decisions to lock before Phase B

- [ ] Final **name** (and fallback if taken): `Spartopf – Haushaltsbuch` → fallback `Spartopf: Haushaltsbuch`
- [ ] Final **subtitle**: `Haushaltsbuch ohne Konto`
- [ ] **Languages at launch**: German (primary) + English (U.K.). Arabic copy exists; add it now or in a later pass.
- [ ] **Keyword set** per language (any swaps from A4?)
- [ ] **Category**: Finance (primary), Productivity (secondary)
- [ ] **Price**: Free
- [ ] **Availability**: all countries, or DE/AT/CH only?

---

## Phase B — Prerequisites

Follow `APP_STORE_RELEASE.md` step 1–2. In short:

- [ ] Apple Developer Program active (team **Ahmad Habboubah (HZVBBHBAJN)**)
- [ ] Xcode installed and signed in (`xcodebuild -version` works)
- [ ] `npm install && npm run check` is green
- [ ] API key in place: `cp ../pizza-driver-log/.env.release .env.release`, and `AuthKey_*.p8` is in `~/.appstoreconnect/private_keys/`

Do this on the Mac. The build and upload only run there.

---

## Phase C — Create the app record

`APP_STORE_RELEASE.md` step 3–4. Open the project once in Xcode (`npm run build:ios`)
so the bundle id `com.habboubah.spartopf` registers, then create the app in App Store
Connect:

| Field | Value |
|---|---|
| Platform | iOS |
| Name | `Spartopf – Haushaltsbuch` (fallback `Spartopf: Haushaltsbuch`) |
| Primary language | German |
| Bundle ID | `com.habboubah.spartopf` |
| SKU | `spartopf-001` |

---

## Phase D — Privacy policy live

`APP_STORE_RELEASE.md` step 5. Publish `store/privacy/` to the `privacy-policy` repo
and confirm both URLs resolve:

- DE: https://habboubah.github.io/privacy-policy/spartopf/de/
- EN: https://habboubah.github.io/privacy-policy/spartopf/

Apple blocks submission without a reachable privacy policy URL.

---

## Phase E — First build to TestFlight

`APP_STORE_RELEASE.md` step 6:

```bash
npm run release:dry     # preview: version 1.0.0, build number
npm run release:first   # builds + uploads 1.0.0
```

Then wait 5–30 min for Apple to finish processing (you get an email).

---

## Phase F — Test on your iPhone

`APP_STORE_RELEASE.md` step 7. Install via TestFlight and run the full loop once:
enter salary + a few fixed costs, tick one paid, start next month, check statistics,
export a backup. If anything's wrong, fix it and re-run before you submit for review.

---

## Phase G — Screenshots

`APP_STORE_RELEASE.md` step 8a:

```bash
npx playwright install chromium   # once per Mac
npm run screenshots
```

Produces 5 images each at 1290 × 2796 (the required iPhone 6.9″ slot) in
`screenshots/de/` and `screenshots/en/`.

---

## Phase H — Fill the listing

`APP_STORE_RELEASE.md` step 8b–8d. Paste from `store/listing.md`:

- [ ] Screenshots (DE) into iPhone 6.9″ slot
- [ ] Promotional text, Description, Keywords (DE)
- [ ] Support URL, Copyright
- [ ] Add build 1.0.0
- [ ] App Review Information (no sign-in; your contact; the reviewer note from `listing.md`)
- [ ] English (U.K.) localisation with `screenshots/en/` and the EN texts
- [ ] App Information: Subtitle, Category (Finance / Productivity), Age Rating 4+, Privacy Policy URL

---

## Phase I — App Privacy and Pricing

`APP_STORE_RELEASE.md` step 8e–8f:

- [ ] App Privacy → **Data Not Collected** (true: no server, no analytics, no tracking)
- [ ] Pricing → **Free**
- [ ] Availability → all countries (or DE/AT/CH)

---

## Phase J — Submit for review

`APP_STORE_RELEASE.md` step 9. **Add for Review → Submit to App Review.** Apple
usually responds in 24–48 h. At *Ready for Distribution*, Spartopf is live.

If rejected: read the Resolution Center message, fix, run
`node scripts/release.js --keep-version`, pick the new build, resubmit.

---

## Later updates (after 1.0 is live)

`APP_STORE_RELEASE.md` step 10:

```bash
npm run release                 # bug fix:     1.0.0 -> 1.0.1
node scripts/release.js minor   # new feature: 1.0.x -> 1.1.0
```

Then in App Store Connect: New Version → fill **What's New** (examples in
`listing.md`) → pick build → Add for Review. Re-run `npm run screenshots` only when
something visible changed.

---

## Pre-submission checklist (one glance before you hit Submit)

- [ ] Name, subtitle, keywords, description, promo text pasted (DE + EN)
- [ ] 5 screenshots per language uploaded at 6.9″
- [ ] Build 1.0.0 processed and selected
- [ ] Privacy policy URL live and reachable
- [ ] App Privacy set to "Data Not Collected"
- [ ] Category Finance / Productivity, Age 4+, Free
- [ ] App Review note explains it's fully offline, no account, no bank connection
- [ ] `npm run check` green on the committed release commit
- [ ] You've run the app once via TestFlight and the core loop works
