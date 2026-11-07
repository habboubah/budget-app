# 37 · Simplicity review

- **Covers:** "keep the app simple for new users". Competitors lost ratings when updates cluttered them (Bluecoins, Spendee 6, finanzblick).
- **Depends on:** all earlier plans. Run the checklist after plans 13, 21 and 32 as well.
- **Size:** M
- **Native:** none
- **Schema:** no change

## Checklist

Also used as a checkpoint after plans 13, 21 and 32.

1. **Fresh install.** Test with three people who don't know the app, plus ui-review's first-run captures.
   - The first entry takes under 30 seconds, with at most three decisions before it.
   - Nothing is on the first screens that wasn't there after plan 00.
2. **Where features appear.** Make a table: every feature from plans 01–36, and where a new user first meets it. The answer should be "nowhere until …". Anything visible without a trigger needs a reason, or it moves.
3. **Month page count.** Count the controls and figures in the first viewport on SE and Pro Max, and compare with plan 00's captures. No growth without a decision.
4. ***Optionen*.**
   - The groups stay as plan 00 set them.
   - Advanced rows go at the bottom of each group.
   - No group is longer than one screen on SE.
5. **Tips instead of tours.** One contextual tip at a time, at most one a week, each dismissible for good:
   - after three card payments typed by hand → "Apple-Pay-Zahlungen automatisch übernehmen" (19)
   - after the same entry three times → "Als Favorit merken" (09)
   - after the first yearly entry → "Rücklage planen" (11)
   - after a month over budget → "Budget anpassen?" (00)
   - after 30 days without an export while the backup switch is off → plan 03's card
6. **Copy.** DE, EN, AR and TR without jargon. Every empty state says what to do next.
7. **Accessibility.**
   - A VoiceOver walk-through of the main flows.
   - 200 % text.
   - A Voice Control name for every control.
8. **Speed.** Cold start and entry latency, measured against plan 01's budgets on the oldest supported iPhone and Android phone.

## Done when

- [ ] Every item passes, or has a merged fix.
- [ ] The tip system ships with the five tips above.
