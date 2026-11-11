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
  and the App Review note in `store/listing.md` (plan 16). The recording
  can now play itself: `ios/AppReviewRecorder/README.md`, "Once" and "Every
  recording". The recorder hasn't run on an iPhone yet — expect a round of
  fixes in `SceneRunner.swift` on the first dry run (`DRY_RUN=1 npm run
  record:app-review`); tell Claude where it stops.
- [ ] **Once the app is live:** *Optionen › Spartopf bewerten* opens the
  review page (plan 15, app id 6829541731).
- [ ] **Accessibility Nutrition Labels:** check the app on a device and
  declare only what passes (plan 16).
- [ ] **The € in Arabic sentences:** decide where it goes, and Claude writes
  the rule into CLAUDE.md (plan 16, REDESIGN.md §9).

## On the iPhone — with a build from Xcode

TestFlight builds never show the rating prompt, so use a development build
for plan 15.

**Languages** (plan 25 is closed; this is what it left for people)
- [ ] Find a native speaker for Turkish first, then the other ten. Give them
  `plans/glossary.md` (tick *Reviewed*), the app in their language, and
  their section of `store/listing-languages.md`. Corrections go to Claude.
- [ ] Build in Xcode: 22 new string files (Siri and Shortcuts in eleven
  languages) are registered in the project but not compiled yet.
- [ ] Until a language is reviewed, leave its store listing on English.

**Plan 23 — Android** (`docs/ANDROID_RELEASE.md` has every step)
- [ ] Install Android Studio, then `npm run build:android` and press Run on a
  phone or the emulator. **The app has never run on Android** — if it doesn't
  start, give Claude what Logcat says.
- [ ] Go through: the first entry; the status bar and the gesture bar don't
  cover anything (also with three-button navigation); the system back closes
  a sheet, then goes back a screen, then leaves the app; export a backup and
  share it; import it again; a CSV import; a photo of a statement (the text
  reader) and a receipt from the camera; a reminder arrives; the lock with
  your fingerprint — and with it on, no screenshot and a blank card in
  Recents; *Bericht teilen* opens the print dialog; Arabic.
- [ ] *Im Gerätebackup sichern* off and on again: the data is still there
  each time.
- [ ] Look at the icon on the home screen (round and squircle).
- [ ] Try once: remove the `INTERNET` permission from
  `android/app/src/main/AndroidManifest.xml` and see whether the app still
  starts. If it does, tell Claude — then it stays out.
- [ ] Make the upload key and fill `.env.release`; create the app in the Play
  Console; `npm run release:android`; upload the bundle to *Internal testing*.
  A new personal developer account needs a closed test with 12 testers for
  14 days before production.
- [ ] Publish the updated privacy policy: `store/privacy/index.html` and
  `store/privacy/de/index.html` now cover Android, receipts and Siri /
  Shortcuts — copy them to the `privacy-policy` repository and push it.

**Plan 37 — simplicity review** (needs people and devices)
- [ ] Hand the app, freshly installed, to three people who don't know it:
  the first entry in under 30 seconds, with at most three decisions before.
- [ ] VoiceOver through setup, a new entry, ticking off, the month report;
  text at 200 %; Voice Control names ("Tippe Sichern").
- [ ] Cold start and typing an amount on the oldest iPhone you support.
- [ ] Use the app a while: do the tips come at sensible moments, one a week?

**Plan 19 — automatic capture**
- [ ] Build in Xcode: the two new actions in `SpartopfIntents.swift` have not
  been compiled yet.
- [ ] *Optionen › Automatisch erfassen*: follow the Apple Pay guide once and
  tell Claude where the wording differs from what Kurzbefehle shows
  ("Transaktion", "Sofort ausführen", "Kurzbefehleingabe" …).
- [ ] Pay something small with Apple Pay: the entry appears with an undo.
  Switch to *Erst prüfen*, pay again: *Neu: 1* on the month, and the review.
- [ ] On iOS 27: the same with a notification from your banking app.
- [ ] Collect a few real notification texts from your banking apps (names
  and amounts changed) and give them to Claude: the parser was written from
  made-up samples.
- [ ] *Teilen an Spartopf* needs a share extension — a new target in Xcode
  (File › New › Target › Share Extension, App Group `group.…` as the app's).
  Add the empty target; Claude can then write its code.

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
  of plan 06 (its file is in the git history); the result goes into
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

## The ten features on `new-features` (November 2026)

Built and tested in the browser only. Before they go into a release:

- [ ] **`npm install` first** — two new packages (`qr`, `pdfjs-dist`); without it
  the app doesn't build.
- [ ] **Merge:** `git checkout main && git merge new-features` when you're happy.
  `redesign-2` touches some of the same components (the entry sheet, the
  category card): merge one, then the other, and let Claude sort out the
  conflicts.
- [ ] **Invoice QR code** with the real camera: a paper invoice in normal light,
  and a PDF invoice as a screenshot.
- [ ] **Statement PDF** from your own bank. Where it reads wrongly, tell Claude
  what the lines look like (made-up numbers) — the parser is generic and will
  need tuning per bank.
- [ ] **The daily nudge:** switch it on, wait for the time, then enter something
  and check that today's is gone (*Erinnerungen › Als Nächstes*).
- [ ] **Month and date pickers** in the entry sheet's new pills (*Ohne Ende*,
  *Rückgabe*, *Garantie*) and in *Kann ich mir das leisten?*: they are the
  system's pickers and were only seen in Chrome.
- [ ] **Small screen:** the entry sheet's pill row on an iPhone SE with every
  pill showing (repeat + end, refund, a project, tax, an account).
- [ ] **Languages:** the new strings are written by Claude in all fourteen; the
  eleven newer ones want the same native-speaker pass as the rest.
- [ ] **App Review recording:** `npm run rehearse:app-review` still passes; the
  scenes don't show the new features yet. Say if the recording should.

## Decide


- [ ] **Bug found in plan 06's work:** closing the photo import while it's
  still reading doesn't cancel it; the review pops up later. Should Claude
  fix it?
