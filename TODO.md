# To do by hand

What only Ahmad can do: Xcode, signing, the iPhone and App Store Connect.
Claude adds to this list whenever a plan leaves something for you. Tick
items off, or delete them once done. The details are in each plan's notes.

## Before the next release

- [x] ~~Build once in Xcode, and sign with the App Group and Data
  Protection~~: done with release v1.2.6 (build 10) on 9 Nov.
- [ ] **Build again in Xcode** after each new plan with Swift. Plan 28 added
  `makePdf` to `SpartopfShared.swift`.
- [ ] **Push** when you're ready: `main` is ahead of GitHub (`git status`
  shows how far).

## App Store

- [ ] **The 2.1 resubmission, if it isn't sent yet:** the screen recording
  (the project doc *spartopf-recording-steps*) and the App Review note in
  `store/listing.md` (plan 16).
- [ ] **Once the app is live:** *Optionen › Spartopf bewerten* opens the
  review page (plan 15, app id 6829541731).
- [ ] **Accessibility Nutrition Labels:** check the app on a device and
  declare only what passes (plan 16).
- [ ] **The € in Arabic sentences:** decide where it goes, and Claude writes
  the rule into CLAUDE.md (plan 16, REDESIGN.md §9).

## On the iPhone — with a build from Xcode

TestFlight builds never show the rating prompt, so use a development build
for plan 15.

**Plan 28 — PDF report**
- [ ] Monatsbericht › *Bericht teilen*, with and without every entry, in
  German and Arabic: the share sheet opens and the PDF looks right
  (margins, page breaks). Then the same for a long year, and print one page.

**Plan 15 — ratings and feedback**
- [ ] The rating prompt appears when the rule allows it: 14 days, 30 entries
  of your own, then open last month's report (with money saved) or import
  10+ entries.
- [ ] *Über Spartopf*: *Bewerten* opens the App Store, *Feedback senden* opens
  Mail with the versions, *Datenschutz* opens Safari.

**Plan 14 — native bridge**
- [ ] With `localStorage['spartopf-debug'] = '1'` (Safari's Web Inspector):
  *Sichern und übertragen › Widget-Daten testen* says "written and read back".
- [ ] Links from Notes or Safari, with the app closed, open and locked:
  `spartopf://month/2026-10` and `spartopf://add?amount=12.50&name=Test`.
- [ ] An inbox item booked while the app was closed. This is easiest with
  plan 18's first Siri action, so leave it until then.

**Plan 06 — data protection**
- [ ] Xcode's console on launch lists every book file as
  `NSFileProtectionComplete`.
- [ ] *Im iPhone-Backup sichern* off → make a Finder backup → the book isn't
  in it; on → it is.
- [ ] VoiceOver with *Beträge verbergen* on: it says "Betrag verborgen" on
  the balance card and the rows. How does it read the "••••" elsewhere?
- [ ] **Encryption test (needs two iPhones):** restore an iCloud backup and
  an encrypted and an unencrypted Finder backup to the second phone. Step 3
  of `plans/06-data-protection-at-rest.md`; the result goes into
  `SECURITY.md`.

**Earlier plans**
- [ ] 00: reminders (permission, delivery, tapping one) and the Face ID lock.
- [ ] 02: debug *WebKit-Daten löschen*, relaunch: everything is still there.
- [ ] 03: move the date three days forward → three snapshots; restore the
  oldest, then undo.
- [ ] 04: export to Files, AirDrop to a second iPhone, import it there; the
  password step stays under 1.5 s on an SE-class phone.
- [ ] 05: reading a photo works in the iPhone app.
- [ ] 06a: VoiceOver walk-through, the SE for long pauses, a short test with
  someone new to the app, an Arabic read of Statistik and Planen.
- [ ] A look at these on a real iPhone: 07 (CHF/GBP/SAR, Arabic too),
  08 (SE keyboard), 09 (0/3/8 favourites), 10, 11, 12 (VoiceOver on the
  ring), 20, 21, 26, 29.

## Decide

- [ ] **Bug found in plan 06's work:** closing the photo import while it's
  still reading doesn't cancel it; the review pops up later. Should Claude
  fix it?
