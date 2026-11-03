# Store specs

Everything `scripts/validate.py` enforces. Change a number here and change it in
`config/screenshots.config.json` too — the validator reads the config, not this file.

## Apple — App Store Connect

| Device class | Portrait pixels | Notes |
|---|---|---|
| iPhone 6.9" | **1320 × 2868** | Current largest iPhone family |
| iPhone 6.7" | **1290 × 2796** | |
| iPhone 6.5" | **1242 × 2688** | Some listings still demand this slot explicitly |
| iPad 13" | **2064 × 2752** | Only if the app ships for iPad |

- Exact pixels. One pixel off is an upload rejection, not a warning.
- PNG or JPEG, RGB. Flatten transparency.
- **1–10** screenshots per device class per locale.
- Uploading the largest size in a device family is enough — Apple scales down for
  the smaller ones in the same family.
- Every slide must show real app UI inside a device frame. Pure-text marketing
  slides get flagged in review.

This app is **iPhone-only** (`TARGETED_DEVICE_FAMILY = 1` in the Xcode project), so
the iPad row is listed for completeness and is not exported.

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

## Why these exports

| Target | Pixels | Format | Reason |
|---|---|---|---|
| `apple-6.9` | 1320 × 2868 | PNG | Largest iPhone family; Apple scales down |
| `apple-6.5` | 1242 × 2688 | PNG | The slot App Store Connect demanded for this listing |
| `play-phone` | 1080 × 1920 | JPEG | 1.78:1, inside Play's 2:1 limit; JPEG for the alpha rule |
| `play-feature` | 1024 × 500 | JPEG | Required by Play |

1080 × 2400 would be a more modern phone shape but is 2.22:1 and fails Play's limit.
