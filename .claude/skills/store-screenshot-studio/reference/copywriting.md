# Headline rules

Assume the reader sees a thumbnail in a search result, at a glance, in a language
they may only half-read. Every rule below exists for that reader.

## Rules

1. **Max 5 words per headline.** `validate.py` fails the run past that.
2. **Name the benefit, not the feature.** "See what you actually earn" beats
   "Statistics screen with charts".
3. **Only claim what the screenshot shows.** If the slide does not show fuel
   tracking, the headline may not mention it. This is the rule that keeps the set
   honest, and the one no validator can check for you.
4. **No calls to action.** "Download now", "Get it today" — the user is already on
   the listing. `validate.py` bans them along with "best app", "#1", "must-have",
   "amazing", "revolutionary".
5. **No superlatives or unverifiable claims.** "The fastest logbook" invites a
   competitor complaint and a review flag.
6. **Slide 1 carries the single strongest value proposition.** Most people never
   swipe past it.
7. **Subline is optional and secondary.** One line, ~8 words, no full stop needed.
   It qualifies the headline; it never introduces a new claim.
8. **Write each locale, do not translate word for word.** German compounds run
   long — a headline that fits in English can wrap to three lines in German. Check
   the contact sheet, not the JSON.

## Ribbon and points

- **The ribbon is one word**, at most 12 letters: *Kostenlos*, *Free*.
- **A point is a fact in two to four words** that fits one pill (28 characters):
  "Keine Werbung", "Nichts verlässt dein Handy". At most five on a slide.
- **Facts, not reassurance.** "Nichts verlässt dein Handy" can be checked;
  "100 % sicher" cannot. The same rule 3 applies: the slide that carries the
  promise shows the screen that says so (*Sichern und übertragen*: "Alles
  bleibt auf diesem Gerät, es gibt keine Cloud").
- **Mark a point about the price** — `{ "text": "Kein Abo", "price": true }` —
  so it stays off the App Store set (`reference/store-specs.md`).

## Good / bad

| ✅ | ❌ | why |
|---|---|---|
| Know what's in your pocket | Wallet overview screen | Names the outcome, not the UI |
| See what you actually earn | Best earnings tracker ever | No superlative, no boast |
| Hand over the right amount | Never lose money again! | Honest about what the screen does |
| Stays on your phone | 100% secure and private | Claims exactly what is true: local storage |
| Log a delivery in seconds | Download now and start logging | Benefit, not a call to action |

## Locale notes

Text lives in `config/copy.<locale>.json`, one file per language, with a `dir`
field. Setting `"dir": "rtl"` flips the layout — the template uses CSS logical
properties throughout, so no separate stylesheet is needed.

Adding a language means adding one `copy.<locale>.json` and one entry in
`locales` in `screenshots.config.json`. No script changes.
