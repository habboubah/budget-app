# What makes a preview work

A preview is watched muted, small, by someone deciding in a few seconds — in
a search result as often as on the listing. Everything below follows from
that reader.

## The build (Bring!'s, which Ahmad pointed at on 15 November 2026)

Bring!'s preview — 886 × 1920, 26.5 s — is a line of text, then the app doing
what the line says, four times over, and the icon at the end:

| | what is on screen | how long |
|---|---|---|
| caption | the app's screen, dimmed, a few big words in the middle | 1–2 s |
| the app | full screen, no phone around it; taps and their results; now and then everything is dimmed but the one part the line was about | 3–6 s |
| … | three more of those | |
| end card | the icon and the name on a flat colour | 2–3 s |

What it does not have: a voice, a hand, a phone frame, a second line of text,
a list of features. This skill's video has the same build in Spartopf's
own look — the store set's dark petrol as the veil, Nunito for the words, the
icon's petrol for the end card — so it sits next to the store screenshots as
one set.

## The rules

1. **The first frame says what the app is.** A search result plays the first
   seconds, muted. The first caption is up from frame 0 and carries the
   listing's strongest line (the same one as the first screenshot).
2. **One idea per chapter**, and the caption names the benefit, not the
   screen: *Ein Album pro Reise*, not *Der Reise-Bildschirm*. Use the
   store screenshots' headlines where a chapter shows the same thing — they
   were agreed with Ahmad and the listing reads as one voice.
3. **A caption only claims what its chapter shows.** No line about sharing
   over footage of the review.
4. **Three to five chapters.** Four captions and the card fill 24–28 seconds; a
   fifth means every chapter gets shorter. When a chapter goes in, another
   comes out.
5. **Show the app's signature.** Here: a trip that becomes an album with one
   tap, and the review's cards flying off left and right. The video is the one place
   in the listing where motion can be seen — spend the time there, not on
   settings.
6. **Tell it in the order a user lives it**: what was found → a trip → the
   duplicates → clearing out. A story has an end; this one's is the review.
7. **Taps the eye can follow.** One thing at a time, the touch dot a moment
   before the finger, a short pause after each result (0.5–0.9 s). A film
   where three things happen at once reads as noise at thumbnail size.
8. **Light, not arrows.** To point at a part, dim the rest (`a.spotlight`) —
   once or twice in the whole video. A light on everything points at nothing.
9. **Real, tidy data.** Photos that look like a family's holidays — the
   demo library, and for the upload licensed photos (no recognisable
   children unless chosen on purpose), nothing that looks like a test, no
   real name or address.
10. **End on the icon**, with at most two facts that can be checked (*Alles
    auf deinem Gerät*, *Löscht nie von selbst*). No price, no "download now": the
    reader is already on the listing, and Apple rejects price words.
11. **Each language is written, not translated.** German runs longer; a
    caption that fits two lines in English may need three in German. Look at
    both contact sheets.

## Pace, in numbers

| | seconds |
|---|---|
| a caption of two words | 1.5 (`hold`) |
| a caption of four or five words | 2.0 |
| a tap and its result | 0.25 before the finger + 0.5–0.9 after |
| a sheet or a screen arriving | 0.8–0.9 before the next tap |
| a light on a part | 1.0–1.4 |
| typing | about 0.085 a letter |
| the end card | 2.5 |
| the whole video | 24–29; never over 30 |

Compose checks the caption lengths (half a second to find a caption, a fifth
of a second a word, plus its fades) and the total.

## Looking at the contact sheet

`screenshots/store/app-preview/contact-sheet-<lang>.png` shows a still every
half second. Before showing the video to Ahmad, and in every language:

- [ ] The first still is the first caption, readable at the size of the sheet.
- [ ] Every caption stands alone in the middle: nothing bright under its
      words, no word cut by an edge, at most three lines.
- [ ] After each caption the screen shows what the caption said, within about
      a second.
- [ ] Every tap has its dot on the thing that then changes — not beside it,
      not on an empty spot (a dot on nothing means the layout moved).
- [ ] A lit part is whole: the light's edge cuts no text in half.
- [ ] No still shows a half-finished state that reads as a bug (a sheet stuck
      halfway is fine in one still, not in three).
- [ ] The poster frame (green edge) would work as a screenshot: no veil, no
      dot, a full screen.
- [ ] The end card: the icon, the whole name on two lines, the points
      readable.
- [ ] Nothing is in the wrong language, and no demo item looks odd in this one.

The sheet cannot show smoothness. `validate` prints how the film was taken
(frames a second while something moves); a run it calls choppy is a proof,
not an upload.
