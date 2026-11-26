# What the stores take

Read on 15 November 2026. Apple changes these pages now and then: before a
release that depends on a number here, open the source again.

- App Store Connect Help › Reference › *App preview specifications*:
  <https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications>
- Apple Developer › *Show more with app previews* (what a preview may show):
  <https://developer.apple.com/support/app-previews/>

`scripts/validate.mjs` checks every number in the first two tables against
the finished file (its `SPEC`); when Apple changes one, change it there and
here.

## The file (App Store)

| | Apple takes | What `npm run app-preview` writes |
|---|---|---|
| Length | 15 to 30 seconds | about 28 s; over 29.5 s the filmed parts are played up to 15 % faster, past that the run stops |
| Size on disk | up to 500 MB | about 5 MB |
| Format | H.264 (`.mov`, `.m4v`, `.mp4`) or ProRes 422 HQ (`.mov`) | H.264 in `.mp4` |
| H.264 | progressive, up to High Profile Level 4.0, target 10–12 Mbit/s | High, Level 4.0, quality-driven (CRF 14) with a ceiling of 12 Mbit/s — a calm screen needs far less |
| Frame rate | 30 frames a second at most | 30, constant |
| Audio | stereo, AAC at 256 kbit/s, 44.1 or 48 kHz, every track enabled | one stereo AAC track at 48 kHz: silence, or the storyboard's `music` |
| How many | up to 3 per device size and language | one per language |
| Poster frame | the frame at 5 seconds, until another is picked | `poster-<lang>.png` and its time, to set by hand |

App Store Connect is known to turn away a file that has no audio track
("unsupported or corrupted audio"), which is why a silent film still carries
a silent stereo track.

## The size (App Store)

App Store Connect takes a fixed set of sizes per device slot — not the
device's own resolution, and not "about the right shape".

| Slot | Portrait | Landscape |
|---|---|---|
| iPhone 6.9″, 6.5″, 6.3″, 6.1″, 5.8″ (every iPhone with Face ID) | **886 × 1920** | 1920 × 886 |
| iPhone 5.5″ (Home button, Plus) | 1080 × 1920 | 1920 × 1080 |
| iPhone 4.7″ (SE, 8) | 750 × 1334 | 1334 × 750 |
| iPad 13″, 11″, 10.5″ | 1200 × 1600 | 1600 × 1200 |
| iPad 9.7″ | 900 × 1200 | 1200 × 900 |

One 886 × 1920 file serves every current iPhone: a slot without a preview of
its own shows the one from the next larger slot, scaled. That is the only size
this skill makes. The app is iPhone-only in the stores' eyes as long as there
is no iPad screenshot set; an iPad preview would be a second `video` (1200 ×
1600, the app laid out 600 × 800 pt) with a storyboard checked at that width.

## What a preview may show (App Store)

Apple's page, in this skill's words — the rule and how the skill keeps it:

- **Only the app itself.** Footage of the app in use, not a trailer about it:
  no people, no hands, no phone on a table. → Every frame under the overlays
  is the running app, filmed (`scripts/film.mjs`); nothing is drawn or
  generated. Never add a screen the app does not have. (Apple's page speaks of
  footage captured on the device. This film is the app's own web build at
  iPhone size — the code the iPhone runs in its web view, as the store
  screenshots are — with the status bar drawn. `SKILL.md` › *What the film is
  and is not* lists what differs from a phone.)
- **Graphics and text on top are allowed** where they explain: copy (because
  previews play **muted**), touch indicators. They have to be legible and
  stay up long enough to read. → Captions, the light on a part of the screen,
  the touch dots; `scripts/compose.mjs` refuses a caption that is too long or
  stands too short.
- **The app at its own resolution**, rather than blown up. → Film and video
  share one pixel grid (886 × 1920). `a.zoom` exists, small on purpose
  (1.1–1.25), and compose says so when one goes past that.
- **Plain transitions** (a dissolve, a fade) that do not suggest something
  the app cannot do. → A dissolve between two places, a fade to the end card.
- **Nothing about the price.** Prices differ by country, and Apple reads
  "free" / "kostenlos" on store artwork as a price reference and rejects the
  version for it (the reason the App Store screenshot set has no ribbon —
  `store-screenshot-studio/reference/store-specs.md`). → compose refuses
  price words, calls to action and superlatives in a caption or on the card.
- **Nothing that dates**: no "new", no season, no version number.
- **What needs a purchase or a login has to say so.** Nothing in this app
  does — if that ever changes (ads, a paid tier), the end card says it.
- **Only what Ahmad may show and play everywhere.** No other brand's
  artwork in a list, and music only with a licence that covers advertising in
  every country (`video.music` in the storyboard; `null` is always safe).
- **Suitable for all ages**, like the listing.
- **Localise it**: a language without a preview shows another language's.
  German and English are made; Arabic falls back to English, like the
  screenshots.

Guideline 2.3.4 of the App Review Guidelines says the same from the reviewer's
side: previews may only use video screen captures of the app itself.

## Uploading (Ahmad, in App Store Connect)

The preview belongs to a **version**, like the screenshots: it can only be
added or changed on a version that is not yet in review, and it is reviewed
with it.

1. App Store Connect › the app › the version › *Previews and Screenshots* ›
   iPhone 6.9″ (or 6.5″) › drag in
   `screenshots/store/app-preview/app-preview-de.mp4` for German and
   `…-en.mp4` for English (U.K. / U.S.). It appears before the screenshots.
2. Wait for processing (minutes, up to a day).
3. *Edit poster frame* on the preview: move to the time the run printed
   (`poster frame: 0:16.2`) — by itself App Store Connect takes the frame at
   0:05, which may be a caption.
4. Save. Submit only when Ahmad says so.

## Google Play

Play takes no file. Its *Preview video* is a **YouTube link** in the main
store listing (one per listing language):

- one video's full address — not a playlist, a channel or a shortened link;
- public or unlisted, embeddable, not age-restricted;
- ads off (no monetisation), or the listing shows someone else's advert;
- the feature graphic (which the listing already has) becomes its cover;
- Google asks for **landscape**: the listing plays every video in a landscape
  player, and a portrait one stands in it with bars left and right.

So the App Store file is not Play's video. Uploading it to YouTube as it is
would work and look narrow. A proper Play video is a second composition —
1920 × 1080, the phone in the middle of the teal canvas, the caption beside
it — from the same footage: `templates/stage.*` would get a landscape layout
and the storyboard a second `video`. Not built (15 November 2026); offer it
when Ahmad asks for a video on Google Play.
