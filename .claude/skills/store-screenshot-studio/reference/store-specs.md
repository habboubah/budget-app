# Store specs

Everything `scripts/validate.py` enforces. Change a number here and change it in
`config/screenshots.config.json` too — the validator reads the config, not this file.

## Apple — App Store Connect

| Slot | Portrait pixels | Notes |
|---|---|---|
| iPhone with Dynamic Island (medium display) — 6.1" / 6.3" | **1206 × 2622** or 1179 × 2556 | **Required.** What this project exports |
| iPhone with Dynamic Island (large display) — 6.9" | 1320 × 2868, 1290 × 2796, 1260 × 2736 | Optional; scaled when missing |
| iPhone with Face ID (large display) — 6.5" | 1284 × 2778, 1242 × 2688 | Optional; scaled when missing |
| iPad 13" | 2064 × 2752 | Only if the app ships for iPad |

- Exact pixels. One pixel off is "File dimensions are invalid", not a warning.
  Each slot accepts only its own sizes — a 6.9" image dropped on the 6.3" slot fails.
- PNG or JPEG, RGB. No alpha channel (`validate.py` fails on one).
- **1–10** screenshots per slot per locale.
- The Asset Library's header / search artwork (3840 × 1646, 5244 × 2950) is a
  different asset, not a screenshot.
- Every slide must show real app UI inside a device frame. Pure-text marketing
  slides get flagged in review.

This app is **iPhone-only**, so the iPad row is listed for completeness and is
not exported.

Source: App Store Connect Help → Reference → Screenshot specifications (read
8 Nov 2026). Sizes change with new iPhones — check there before a release.

## Google Play

| Asset | Size | Format |
|---|---|---|
| Phone screenshot | 320–3840 px per side, longest ≤ 2 × shortest | JPEG or 24-bit PNG |
| Feature graphic | **exactly 1024 × 500** | JPEG or 24-bit PNG |

- **No alpha channel.** This project exports Play assets as JPEG, which cannot carry
  one — the rule is satisfied by construction instead of by a flattening step.
- **2–8** phone screenshots. Under 8 MB each.
- The 2:1 ratio limit is a *screenshot* rule. The feature graphic is pinned at
  1024 × 500, which is 2.05:1, and is exempt.

## The ribbon and the price words

*Kostenlos* / *Free* on the ribbon, and the price points ("Kein Abo", "Keine
In-App-Käufe"), are words about what the app costs. The two stores treat them
differently, which is why they are switched per target (`"ribbon"` in
`config/screenshots.config.json`).

| Store | Rule | What this project does |
|---|---|---|
| App Store | Guideline 2.3.7: app names, subtitles, screenshots and previews may not include prices or terms. App Review counts "free" as a price reference and rejects the version until it is gone | `iphone-6.3` has `"ribbon": false`: no ribbon, no price points. `validate.py` warns if that changes |
| Google Play | The preview-asset guidelines ask to avoid price and promotional words on the feature graphic and screenshots and name "Free" among the examples. Not following them does not take the listing down; it can change how the assets are shown and limits promotion and recommendation by Play | `play-phone` has `"ribbon": "first"` (the ribbon on the first slide only) and the feature graphic `"ribbon": true`. A choice: the listing says "free" loudly, and is picked for Play's own promotion surfaces less readily |

Whatever the store, the words have to be true. Today the app is free, has no
ads, no in-app products and no subscription (`store/play-listing.md`). The day
a paid Plus is sold (`docs/MONETIZATION.md`), the ribbon goes to `false` and
the price points come out of the copy files.

Sources: App Store Review Guidelines 2.3.7 and App Review's rejection text for
it; Play Console Help → *Add preview assets to showcase your app* (both read
12 Nov 2026).

## Why these exports

| Target | Pixels | Format | Reason |
|---|---|---|---|
| `iphone-6.3` | 1206 × 2622 | PNG | The required iPhone slot; App Store Connect scales it for other iPhones |

Google Play (not configured yet): phone screenshots 1080 × 1920 JPEG (1.78:1,
inside Play's 2:1 limit; JPEG for the alpha rule) and the 1024 × 500 feature graphic.
