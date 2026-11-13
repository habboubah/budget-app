# App Review recorder

Records the screen recording App Review asks for (Guideline 2.1: "captured
on a physical device … beginning with launching the app"): a UI test taps
through the main features of the Spartopf installed on your iPhone while iOS
records the screen. About 6 minutes; the video ends up in Photos.

It films what a new user does, in seven scenes — not every feature (decided
on 13 November 2026: the recording of everything ran close to half an hour;
the bank import, the backup, the lock at reopening and the Face ID switch
went out the same day):

| Scene | Shows |
|---|---|
| 1 Launch and the start | The icon, English on the welcome, the three questions, what is left at the end of the month, US dollars |
| 2 Entering, paid and pending | An expense with its category guessed, a pending monthly bill, an income; the circle, swipe to delete → Undo, the balance card opened |
| 3 Checking the balance and the month report | Check the bank balance with a difference booked, the month report |
| 4 A year of test data and Statistics | Add test data, Statistics (Expand all if it opens as headlines), 12 months, a category's screen |
| 5 Plan | The month so far, budgets and a new one, the outlook, the savings pots |
| 6 More | The guide, categories and budgets |
| 7 Settings | Dark, light, automatic; reminders (the permission, the first time iOS asks) |

What it leaves out is listed at the end, for the Review Notes.

| File | What it is |
|---|---|
| `scenes.json` | The recording, one step per line — the only file to change when the app changes |
| `RecorderUITests/SceneRunner.swift` | Plays a scene file on the iPhone (knows nothing about Spartopf) |
| `RecorderUITests/AppReviewRecordingTests.swift` | The test: preflight, scenes, stop the recording |
| `RecorderHost/` | An empty app the UI test belongs to (a UI test needs one) |
| `demo-files/` | Invented demo files the scenes import — no real finances (none is in use now) |
| `make-project.rb` | Generates the Xcode project (`gem install xcodeproj`, only to change its structure) |
| `../../scripts/rehearse-app-review.mjs` | Plays `scenes.json` against the web app first |
| `../../scripts/record-app-review.sh` | Runs the UI test on the connected iPhone |

## Once

1. **iPhone:** Settings › Privacy & Security › **Developer Mode** on (restarts
   the phone). Then Settings › Developer › **Enable UI Automation** on.
2. **Control Center:** long-press an empty spot › Add a Control › **Screen
   Recording**. Microphone off.
3. Put the **Spartopf icon on the first home screen page**.
4. iPhone language **English or German** — the system buttons the recorder
   taps (Screen Recording, Choose File, Allow …) are listed in those two in
   `scenes.json` › `system`; add your language there to use another.
5. **Keyboard:** Settings › General › Keyboard › **Auto-Correction** and
   **Predictive Text** off, so a German keyboard doesn't "correct" the
   English demo words (later steps look for those words); without the
   suggestions bar the video is cleaner too.
6. **Mac:** Xcode signed in with the developer account (it already is, you
   archive from it). The first run creates the signing for the recorder's
   two bundle ids by itself.

## Every recording

1. **Save your own data:** Spartopf › Settings › Back up and transfer ›
   Export backup, to iCloud Drive.
2. `npm run rehearse:app-review` — checks every step against the current
   code in about 2 minutes.
3. **No demo files to AirDrop:** the imports are no longer filmed. The
   files in `demo-files/` are kept for trying an import by hand. The earlier
   months come from More › Settings › Add test data.
4. The build you submit has to be the one installed from **TestFlight**,
   and a build the scenes fit: `scenes.json` › `app.minVersion` (1.2.20, the
   first with the start — the welcome and its three questions). The run
   prints which build the iPhone has; an older one it **updates from
   TestFlight by itself** (it opens TestFlight and taps Update in the app's
   row) before anything is reset or filmed. `UPDATE=0` only says so and
   stops. A newer build than `minVersion` you install yourself.
   No need to delete the app before each run: every full run **resets it in
   the app before the screen recording starts**, without asking — from a
   book (More › Settings › Reset app), and from the welcome a stopped run
   left (test data first, then the same reset, so the language goes back to
   the iPhone's too). If the reset can't be played the run stops there and
   records nothing (`RESET=0` skips the reset and stops if the app isn't
   empty). Back up your own data first.
5. Connect the iPhone by cable, unlock it, **Do Not Disturb** on.
6. **Dry run:** `DRY_RUN=1 npm run record:app-review` — everything except the
   screen recording. The real run resets what the dry run filled.
7. **Record:** `npm run record:app-review`. Keep the phone unlocked and
   don't touch it. Face ID isn't part of the recording; it is only asked
   for before the recording starts if the app's lock is on from before —
   then look at the phone.
8. **Afterwards:** the video is in Photos. Trim it, AirDrop it to the Mac,
   upload it in App Store Connect › App Review Information › Attachment.
   Then Settings › Back up and transfer › Import backup with your own file.

Options: `PACE` scales every pause (0.65 unless set; `PACE=1` slower,
`PACE=0.5` faster); `FROM=5 TO=8` only those
scenes (no preflight, for trying a fix — the app must be in the state the
scene before leaves it); `DEVICE=<udid>` with several iPhones.

`npm run record:watch`, left open in a Terminal window, lets Claude start
runs while the iPhone stays on its stand: a run is asked for by writing its
settings (`DRY_RUN=1`, `FROM=n`, `TO=n`, `PACE=x`) to `build/record-request`;
its output is in `build/record-last.log`, its state in `build/record-status`.

Xcode films every test run on its own, into the `.xcresult` (a video of
about 1 GB for a full run): handy for looking at a dry run frame by frame,
but `build/` fills up — delete old `app-review-recording-*.xcresult` now and
then.

## When it stops

The terminal names the scene, the step and what was missing; the
`.xcresult` in `build/` (open it in Xcode) has a screenshot of the moment.
The recording is stopped, so what was filmed so far is in Photos.

- **"not found: …"** — a label changed in the app. Run the rehearsal: it fails
  at the same step and prints what is on screen. Fix the label in
  `scenes.json`.
- **It works in the rehearsal but not on the iPhone** — system UI or a
  difference in WebKit. The usual suspects, in order: the Files picker
  (`pickFile`: the file must be in Files, findable by search), the select
  menus (`select`), the share sheet's Close (`systemTap`), an element under
  the keyboard. Fix it in `SceneRunner.swift`, then `FROM=n DRY_RUN=1`.
- **"can't reach … on screen"** — the page didn't scroll to it. Once that was
  the app: a menu that opened a sheet left the page's scroll locked, and no
  finger could reach a row further down. The rehearsal now fails on that
  ("the page no longer scrolls"); if it passes, look at the screenshot for
  what covers the row.
- **"Next" or "Back" on the start goes to the wrong place** (iPhone in
  English): the bar above the keyboard has buttons with the same names. The
  page's own come first in the tree; if a run shows otherwise, give those
  steps `"role": "button"` and say so.
- **"… is greyed out"** — an earlier step didn't do what it should (an amount
  that isn't a number keeps Save disabled). Look at the screenshot for what
  went in.
- The keyboard is put away (its ✓) before a tap that it, or the + − × ÷ row
  above it, would cover — that row once took a tap meant for the date and
  typed "+" into the amount.
- **Signing errors** — open `AppReviewRecorder.xcodeproj` in Xcode once,
  pick your team for both targets, run the test from there (⌘U).

## Steps

Each step is one JSON object. Labels are accessibility labels (what
VoiceOver reads); a list means "the first of these that exists". Matching:
exact, then starts with, then contains; buttons and fields before text; `nth`
counts from 0 in screen order.

| Step | Does |
|---|---|
| `{"tap": "Save"}` | Taps it (scrolls to it first). `nth`, `role` (`button`, `switch`, `textbox`), `timeout` |
| `{"tap": "More", "near": "Bank balance now"}` | Two with one name on screen: taps the exact match closest (up and down) to the `near` text |
| `{"tap": "Import bank transactions", "pickFile": "x.csv"}` | Taps, then picks the file in the Files picker (searches its name) |
| `{"fill": "What for?", "text": "Lidl"}` | Replaces a field's text, typed in one go |
| `{"amount": "12.50", "into": "Amount"}` | An amount, typed digit by digit with the iPhone's decimal separator |
| `{"placeholderMinus": 20, "into": "…"}` | Types the field's placeholder minus 20 (the app's own figure) |
| `{"select": "English", "in": "Language"}` | Opens a `<select>` and taps the option |
| `{"select": "Last 12 months", "in": "Period", "near": "Where the money goes"}` | Two controls with one name: takes the one closest to the `near` text |
| `{"pickDay": 3, "on": "Date:"}` | The system date picker of that field: that day of the shown month |
| `{"pickYearAhead": 1, "on": "Ends:"}` | A month field (`<input type=month>`): turns the year wheel that many years on |
| `{"swipe": "left", "on": "Edit Bakery"}` | Swipes across that row |
| `{"drag": "Edit Toys", "to": "Restaurants €", "hold": 0.8}` | Long-press and drag |
| `{"see": "Garage", "timeout": 10}` | Waits until the text is on screen |
| `{"scrollTo": "…"}`, `{"scroll": "down"}` | Scrolls |
| `{"pause": 1.5}` | Waits (times `PACE`) |
| `{"systemAlert": ["Allow", "Erlauben"], "timeout": 3}` | Taps a button in a permission alert; waits `timeout` seconds for it (4). iOS asks once per install: make it `soft` |
| `{"systemTap": ["Close"]}` | Taps a button in system UI over the app (the share sheet) |
| `{"faceID": true}` | Waits while Face ID looks at you (only the reset uses it, for a lock left on) |
| `{"startRecording": true}`, `{"stopRecording": true}` | Control Center's Screen Recording |
| `{"launch": true}`, `{"home": true}`, `{"terminate": true}`, `{"appSwitcher": true}` | Home screen and app life cycle |
| `{"optional": [ … ]}` | Runs the steps only if the first one works |

Any step with `"soft": true` may fail without stopping the recording.
`saveDownloadAs` on a tap is for the rehearsal only (it keeps the web
download); the iPhone shows a share sheet there instead.

## What the video doesn't show

**Left out to keep it short.** Each of these had a scene until 13 November
2026 (`git log -- ios/AppReviewRecorder/scenes.json`); the Review Notes
describe the app beyond the video (`store/listing.md`, their point 3):
the bank's CSV and the photo of a banking app, exporting a backup, Lock
with Face ID and the lock when the app is reopened, splitting an entry, refunds, tags, favourites, receipts with return and
warranty dates, repeats other than monthly, drag to another category,
folding and the filter, the search, moving between months, the month's
opening balance and deleting a month, the month's start day, the PDF
statement, another app's CSV, the invoice QR code, import rules, a report as
PDF, payees and tags in Statistics, Can I afford it?, yearly and
carried-over budgets, the reserve, contracts' notice periods, the money
check, accounts and transfers, debts and loans, trips and projects, the tax
list, hiding amounts, the colour, Arabic, a new category, automatic capture,
the daily reminder, the iPhone backup switch, CSV export, automatic backups,
and reset with restore. (The Excel import was left out before that.)

**Can't be played by the recorder at all:** the Siri phrases and the
Shortcuts automations behind automatic capture, `spartopf://` links, the
calculator keys (+ − × ÷) above the keyboard, the weekly tip card, the
rating prompt, a notification arriving, and Year in review outside
15 December to January.
