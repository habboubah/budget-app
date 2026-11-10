# To do by hand

What only Ahmad can do: Xcode, signing, the iPhone and App Store Connect.
Claude adds to this list whenever a plan leaves something for you. Tick
items off, or delete them once done. The details are in each plan's notes.

## Before the next release

- [x] ~~Build once in Xcode, and sign with the App Group and Data
  Protection~~: done with release v1.2.6 (build 10) on 9 Nov.
- [x] ~~Build again in Xcode~~: release v1.2.7 (build 11) on 10 Nov compiled
  plan 28's `makePdf` and plan 18's Siri code.
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

**Plan 22 — iPad** (your decision first)
- [ ] Decide whether Spartopf ships for iPad. If yes: Xcode › App › General ›
  Supported Destinations › add iPad (`TARGETED_DEVICE_FAMILY = "1,2"`). Once
  an iPad build is live it can't be taken back, and every submission then
  needs 13" iPad screenshots.
- [ ] Then on an iPad: landscape and portrait show the month with Statistik /
  Planen / Optionen beside it; Split View at a third falls back to the phone
  layout; with a keyboard ⌘N, ⌘F and ← → work; in Arabic the month is on the
  right.

**Plan 32 — month from payday**
- [ ] *Optionen › Haushaltsbuch › Monat beginnt am* › your payday: the sheet
  says how many entries move; after *Sichern* the month title shows the dates
  (e.g. "25. Okt. – 24. Nov."), and *Rückgängig* puts everything back.
- [ ] With the start on the 25th: look over two or three past months — the
  salary sits in the month it pays for, and *Kontostand jetzt* is the same as
  before the change.
- [ ] Siri "Was bleibt am Monatsende?" still answers (the app was opened once
  after the change).

**Plan 27 — receipts**
- [ ] New entry › *Beleg* › *Foto aufnehmen*: the camera opens, the receipt
  appears as a chip, the row gets a paperclip; the chip shows it full screen.
- [ ] *Betrag vom Beleg lesen* on a real till receipt: the total (and the
  shop) are filled in.
- [ ] Attach a PDF from Files; *Öffnen* shows it.
- [ ] Export a backup with a receipt, *Alle Daten löschen*, import it: the
  receipt is back. Switch *Im iPhone-Backup sichern* off and on: still there.

**Plan 18 — Siri and Shortcuts** (Claude went with option (b): Siri's
amounts in a file only readable while the phone is unlocked)
- [ ] In German, English and Arabic: "Ausgabe in Spartopf" (Siri asks how
  much), with the app closed and open — the entry is there with an undo.
- [ ] "Was bleibt am Monatsende in Spartopf" and "Offene Rechnungen in
  Spartopf": they answer after unlocking; with the app lock on they say to
  open the app.
- [ ] The three actions in the Shortcuts app and in Spotlight.
- [ ] This also covers plan 14's open item: an inbox entry booked while the
  app was closed.

**Plan 31 — debts and loans**
- [ ] *Optionen › Schulden und Kredite*: add a loan with its rate and the
  monthly entry it is paid with; the payoff month and the interest look
  right next to your bank's plan. Planen shows the *Schulden* card.
- [ ] Money lent: link a repayment from the entry sheet's *Zu einer Schuld*
  pill; what is left goes down.

**Plan 30 — cash and savings accounts**
- [ ] *Optionen › Konten › Bargeld hinzufügen* with today's cash: the balance
  card gets the switch; Giro, Bargeld and *Alle Konten* each show the right
  balance.
- [ ] *Umbuchen* 100 € from Giro to Bargeld: both balances move, Statistik and
  the budgets don't. Tick it open and back, edit it, delete it (undo).
- [ ] A bank CSV imported while Bargeld is shown lands in Bargeld.
- [ ] VoiceOver on the switch, the transfers card and the account pill, and an
  Arabic look at the month with accounts.

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
- [ ] An inbox item booked while the app was closed (see plan 18).

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
