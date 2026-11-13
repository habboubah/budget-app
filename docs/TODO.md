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
- [ ] **The new app icon** (the household book with the euro coin, 12 Nov):
  both stores take it from the next build (`npm run release`). Google Play's
  listing has its own copy: Play Console → *Store listing* → *App icon* →
  `screenshots/store/play-icon-512.png`. Then look at it on a phone: the home
  screen (on Android round and squircle), the splash in light and dark,
  *Mehr › Einstellungen* and the lock screen.

## App Store

- [ ] **The 2.1 resubmission, if it isn't sent yet:** the screen recording
  and the App Review note in `store/listing.md` (plan 16). The recording
  can now play itself: `ios/AppReviewRecorder/README.md`, "Once" and "Every
  recording". The recorder hasn't run on an iPhone yet — expect a round of
  fixes in `SceneRunner.swift` on the first dry run (`DRY_RUN=1 npm run
  record:app-review`); tell Claude where it stops.
- [ ] **Once the app is live:** *Mehr › Einstellungen › Spartopf bewerten* opens the
  review page (plan 15, app id 6829541731).
- [ ] **Accessibility Nutrition Labels:** check the app on a device and
  declare only what passes (plan 16).
- [ ] **The € in Arabic sentences:** in a sentence the € sits left of the
  number ("€ 12,600.00 سنويًا"), on a plain amount right of it
  ("255.00 €") — correct bidi, but inconsistent. Have an Arabic reader
  decide; Claude then writes the rule into CLAUDE.md (plan 16).

## On the iPhone — with a build from Xcode

TestFlight builds never show the rating prompt, so use a development build
for plan 15.

**Languages** (plan 25 is closed; this is what it left for people)
- [ ] Find a native speaker for Turkish first, then the other ten. Give them
  `docs/plans/glossary.md` (tick *Reviewed*), the app in their language, and
  their section of `store/listing-languages.md`. Corrections go to Claude.
- [ ] Build in Xcode: 22 new string files (Siri and Shortcuts in eleven
  languages) are registered in the project but not compiled yet.
- [ ] Until a language is reviewed, leave its store listing on English.

**Plan 23 — Android** ([ANDROID_RELEASE.md](ANDROID_RELEASE.md) has every step)
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
  Console and upload the first bundle to *Internal testing* by hand
  (`npm run release:android -- --no-upload` builds it). From then on
  `npm run release:android` uploads by itself — give the Play service account
  *Release apps to testing tracks* for Spartopf first
  (`docs/ANDROID_RELEASE.md`). A new personal developer account needs a
  closed test with 12 testers for 14 days before production.
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
- [ ] *Mehr › Automatisch erfassen*: follow the Apple Pay guide once and
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
- [ ] *Mehr › Einstellungen › Monat beginnt am* › your payday: the sheet
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
- [ ] *Mehr › Schulden und Kredite*: add a loan with its rate and the
  monthly entry it is paid with; the payoff month and the interest look
  right next to your bank's plan. Planen shows the *Schulden* card.
- [ ] Money lent: link a repayment from the entry sheet's *Zu einer Schuld*
  pill; what is left goes down.

**Plan 30 — cash and savings accounts**
- [ ] *Mehr › Konten › Bargeld hinzufügen* with today's cash: the balance
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
  [SECURITY.md](SECURITY.md).

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

## The first five minutes (plan 39, November 2026)

On the branch `plan-39-first-five-minutes` (not merged, not pushed): a new
book opens on a start with three questions, the month page and the entry
sheet show less until the book has more, *Optionen* became *Mehr* with
*Einstellungen* under it, and *Planen* and *Statistik* open as headlines.
A book in use looks as it did. Built and checked in Chromium only (German
and Arabic, light and dark, SE to Pro Max, once at 200 % text).

- [ ] **Look, then merge:** `git checkout plan-39-first-five-minutes`,
  `npm run dev`, and in the browser's storage clear `localhost` for a new
  book — or *Mehr › Einstellungen › App zurücksetzen*. Your own book should
  look as before, but for the fourth tab, *Weniger* under the balance card,
  one button in the bar of *Planen* and *Statistik*, and a shorter "⋯".
- [ ] **The five-minute test**, with five people who have not seen the app,
  on a fresh install, no help (the tasks are in the plan, phase 4):
  1. "Finde heraus, wie viel dir am Monatsende bleibt."
  2. "Trag einen Kaffee für 3,50 € ein."
  3. "Trag die Miete ein: 950 €, jeden Monat, noch nicht bezahlt."
  4. "Die Miete ist jetzt bezahlt."
  5. "Wie viel hast du für Lebensmittel ausgegeben?"

  Note where each one stops, and what they say the large number means. Done
  when four of five finish 1 to 4 alone and the first expense takes under 30
  seconds. It takes the place of plan 37's three-people test.
- [ ] **On the iPhone, a fresh install:** the start with the keyboard up (the
  field and *Weiter* stay in view, also on an SE); the language chip on the
  welcome; *Erst mit Testdaten ansehen* and the capsule that takes them out
  again; a backup restored through *Ich habe schon Daten* — the app should
  then look as on the old phone, every fold open.
- [ ] **VoiceOver and the largest text size:** the closed balance card reads
  as one figure and "Am Monatsende … – aufklappen"; a headline on *Planen*
  reads its finding and says it opens; *Weniger* is reachable under each
  open card; the entry sheet's "⋯" reads *Mehr* / *Weniger*.
- [ ] **The App Review recording must be rewritten before it runs again.**
  `ios/AppReviewRecorder/scenes.json` was left alone (it had changes of
  yours). `npm run rehearse:app-review` shows each step that no longer
  finds its label; from the committed file these are:
  - **Scene 1** (*Launch and language*): a fresh install opens on the start,
    not on the tab bar. Pick English with the chip on the welcome; the
    currency is under *More › Settings › Currency*, after the start.
  - **Scene 2** (*Setup*): the setup card is gone. The start asks the same
    three things — *How much is in your account right now?*, then the
    income with its day, then *Rent*, *Electricity*, *Internet*, *Mobile
    phone*, *Insurance* as fields with a day each — and ends on *Open my
    budget book*. No *Use this*, *Add your salary*, *Add your fixed costs*,
    *Done*; *Paid* isn't asked (a day up to today is paid).
  - **Scenes 3, 8, 11** (entries): *Tag*, *Refund*, *Receipt*, *Note*,
    *Save as favourite*, *Save & next* and the *Tax* pill are behind the
    sheet's round "⋯" (accessibility label *More*) — one tap, and it stays
    open for good. The search field shows from 15 entries or the second
    month.
  - **Scenes 4, 5, 6** (the month's "⋯"): the imports are one row,
    *Import*, then its sheet (*Import a bank statement (PDF)*, *Take
    transactions from a photo* …); *Collapse / Expand all categories* and
    *Delete month* are under the menu's *More*; *Balance at the start of
    the month* is a button in *Check the bank balance*.
  - **Scenes 4, 10, 12, 13** (*Settings*): the tab is *More*. *Add / Remove
    test data*, *Month starts on*, *Hide amounts*, *Appearance*, *Currency*,
    *Language*, the reminders, *Include in iPhone backup*, *Lock with Face
    ID* and *Reset app* are one tap further, under *More › Settings*.
    Debts, accounts, trips, the tax list, rules and *Back up and transfer*
    are rows of *More* itself.
  - **Scenes 8, 9** (*Statistics*, *Plan*): on the book the recording builds
    they open as headlines. *Expand all* in the bar (one tap, remembered)
    shows the cards the scenes expect.
  - **Scene 13:** after *Reset app* the start comes again.
- [ ] **Store screenshots and the guide's pictures:** `npm run screenshots`
  still passes on the seeded book (it counts as a book in use). The guide's
  pictures were taken again in Chromium on Linux, as before — the item under
  *The guide and the tours* stands.
- [ ] **`scripts/perf-check.mjs`** records 381 kB for the main bundle with
  timings from a two-core Linux container. Run `npm run check` on the Mac
  once and put its three timings into the note there. In the container the
  month switch's slowest sample moved between 115 and 166 ms from run to run
  (budget 150) — as it did before the plan (166) — so the performance check
  passed there four times out of six; everything else passed every time.
- [ ] **Languages:** about forty new strings and a dozen changed guide lines,
  written by Claude in all fourteen. German, English and Arabic are yours to
  read — the start's three questions and its last screen first; the other
  eleven want the same native-speaker pass as the rest
  (`docs/plans/glossary.md` has the new terms).

## Optionen, reordered (November 2026)

On `main` (12 Nov, from `redesign-settings`). Built and checked in the
browser only:

Plan 39 turned *Optionen* into *Mehr* and moved what is set once to *Mehr ›
Einstellungen*; once that branch is merged, read these two for the new
screens:

- [ ] **Look through Mehr and Einstellungen once on the iPhone**, in the app
  (the lock, reminders and the phone's backup only show there): is
  everything where you expect it? The order is in `docs/features.md` under
  *Mehr*.
- [ ] `Werkzeuge` (it was `Weitere Funktionen`) and the short line under
  *Sichern und übertragen* are machine-drafted in the eleven other languages.

## Statistik and Planen, third pass (November 2026)

On `main` (11 Nov, merged from `redesign-statistik-planen`). Built and
checked in the browser only (iPhone SE to Pro Max, light and dark, German
and Arabic, text at 200 %):

- [ ] **On the iPhone:** drag a finger across the charts in Statistik and
  Planen — the tooltip should follow with a light tick per month or day, and
  the page should still scroll up and down from a chart. Watch the charts
  come in once (lines drawn from the left, the ring, the calendar), then
  again with *Bewegung reduzieren* on: everything should simply be there.
- [ ] **The balance card** (redesigned the same evening, merged from
  `redesign-balance-card`): swipe it sideways with a finger on the new line —
  the month should still turn, and the line should be drawn in again for the
  new month. Open the details and check the two bars against your own
  figures. `01-month` of the store screenshots changed with it.
- [ ] **Nächste 30 Tage against your own book:** does the lowest point match
  what you expect before the next salary? It only knows what is entered and
  open.
- [ ] **Store screenshots:** `06-stats`, `07-history` and `10-plan` look
  different now — `npm run screenshots`, then `npm run store-screenshots`,
  before the next upload.
- [ ] **The 14 new strings** (weekdays, calendar, the next 30 days) are
  machine-drafted in the eleven languages beyond German, English and Arabic,
  like the rest: a native reader checks them with the others.

## The ten new features and the second redesign (November 2026)

Both are merged into `main` (11 Nov). Built and tested in the browser only —
before they go into a release:

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

**The second redesign** (the cloud machine had Chromium and Inter only)
- [ ] The type on the iPhone: SF Pro and SF Rounded, not Inter.
- [ ] Scroll a long month in the app: the shadows and tinted card headers
  stay smooth (Safari Web Inspector timeline).
- [ ] `npm run check:perf` on the Mac: the month switch against its 150 ms
  budget (on the cloud machine it was over now and then, before and after).
- [ ] Make the App Store screenshots again (`npm run screenshots`, `npm run
  store-screenshots`) — the current ones show the old look.

## The guide and the tours (November 2026)

Built and tried in Chromium at iPhone sizes (German and Arabic, light and
dark; `node scripts/ui-review.mjs --only guide,guide-topic,guide-topic-paid,guide-topic-bank,guide-search,tour-balance,tour-entry-amount,tour-stats-range,tour-plan-pace,tour-settings-security,point-add,point-bank,guide-back,hint-guide,tips`).
Before it goes into a release:

- [ ] **On the iPhone:** each tour from *Mehr › Anleitung* — the lit
  mark sits where it should, also under the Dynamic Island and with large
  text; the card never hides behind the home indicator. The entry sheet's
  tour with the keyboard up: the marks follow when it goes away.
- [ ] **Zeigen:** try a few topics — the mark lands on the "⋯" (*Kontoumsätze
  importieren*), the repeat pill (*Wiederkehrende Einträge*), the budgets
  card; *Zurück zur Anleitung* and "‹ Anleitung" return to the open topic.
- [ ] **VoiceOver:** each step is read when it appears, *Weiter* and *Tour
  beenden* are reachable, the page behind is not; in a topic, the drawn
  buttons read as their names ("Eintrag hinzufügen", "Sichern").
- [ ] **Android:** the system back ends a tour, and returns to the guide
  from a screen it opened.
- [ ] **The guide's screenshots** were taken in Chromium on Linux (Noto
  emoji, not Apple's; the system's sans for SF Pro). Before a release, take
  them again on the Mac — `npm run guide-shots` — and look through
  `public/guide/` (192 pictures, 4.5 MB). Again after any change to a screen
  they show.
- [ ] **Languages:** the guide's pages (`src/i18n/guide/`) are written by
  Claude in all fourteen; German, English and Arabic are yours to read, the
  eleven others want the same native-speaker pass as the rest.
- [ ] **App Review recording:** see *The first five minutes* above — plan 39
  changed the screens it passes through. Say if the recording should show a
  tour.

## Decide


- [ ] **Bug found in plan 06's work:** closing the photo import while it's
  still reading doesn't cancel it; the review pops up later. Should Claude
  fix it?
