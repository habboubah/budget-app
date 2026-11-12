# App Review recorder

Records the screen recording App Review asks for (Guideline 2.1: "captured
on a physical device … beginning with launching the app"): a UI test taps
through every feature of the Spartopf installed on your iPhone while iOS
records the screen. About 15–20 minutes; the video ends up in Photos.

| File | What it is |
|---|---|
| `scenes.json` | The recording, one step per line — the only file to change when the app changes |
| `RecorderUITests/SceneRunner.swift` | Plays a scene file on the iPhone (knows nothing about Spartopf) |
| `RecorderUITests/AppReviewRecordingTests.swift` | The test: preflight, scenes, stop the recording |
| `RecorderHost/` | An empty app the UI test belongs to (a UI test needs one) |
| `demo-files/` | Invented demo files the scenes import — no real finances |
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
   **Predictive Text** off. The recorder types key by key, so a German
   keyboard has time to "correct" the English demo words (and later steps
   look for those words); without the suggestions bar the video is cleaner too.
6. **Mac:** Xcode signed in with the developer account (it already is, you
   archive from it). The first run creates the signing for the recorder's
   two bundle ids by itself.

## Every recording

1. **Save your own data:** Spartopf › Settings › Back up and transfer ›
   Export backup, to iCloud Drive.
2. `npm run rehearse:app-review` — checks every step against the current
   code in 5 minutes. It also writes `demo-files/spartopf-demo-backup.spartopf`
   fresh.
3. **AirDrop the four demo files** to the iPhone (they land in Files ›
   Downloads): `spartopf-demo-history.xlsx`, `spartopf-demo-bank.csv`,
   `spartopf-demo-banking-app.png`, `spartopf-demo-backup.spartopf`.
4. Make sure the build you submit is the one installed from **TestFlight**
   (install it once when there is a new build). No need to delete it before
   each run: when the app isn't empty, the recorder resets it in the app
   (Settings › Reset app) before the screen recording starts, without
   asking (`RESET=0` stops instead). Back up your own data before the run.
5. Connect the iPhone by cable, unlock it, **Do Not Disturb** on.
6. **Dry run:** `DRY_RUN=1 npm run record:app-review` — everything except the
   screen recording. The real run resets what the dry run filled.
7. **Record:** `npm run record:app-review`. Keep the phone unlocked, on a
   stand facing you: Face ID is needed twice (turning the lock on, and the
   last scene). Don't touch it.
8. **Afterwards:** the video is in Photos. Trim it, AirDrop it to the Mac,
   upload it in App Store Connect › App Review Information › Attachment.
   Then Settings › Back up and transfer › Import backup with your own file.

Options: `PACE=1.4` slower, `PACE=0.7` faster; `FROM=5 TO=8` only those
scenes (no preflight, for trying a fix — the app must be in the state the
scene before leaves it); `DEVICE=<udid>` with several iPhones.

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
| `{"tap": "Import from Excel", "pickFile": "x.xlsx"}` | Taps, then picks the file in the Files picker (searches its name) |
| `{"fill": "What for?", "text": "Lidl"}` | Replaces a field's text, typed key by key like a person does |
| `{"amount": "12.50", "into": "Amount"}` | An amount, typed digit by digit with the iPhone's decimal separator |
| `{"placeholderMinus": 20, "into": "…"}` | Types the field's placeholder minus 20 (the app's own figure) |
| `{"select": "English", "in": "Language"}` | Opens a `<select>` and taps the option |
| `{"pickDay": 3, "on": "Date:"}` | The system date picker: that day of the shown month |
| `{"swipe": "left", "on": "Edit Bakery"}` | Swipes across that row |
| `{"drag": "Edit Toys", "to": "Restaurants €", "hold": 0.8}` | Long-press and drag |
| `{"see": "Garage", "timeout": 10}` | Waits until the text is on screen |
| `{"scrollTo": "…"}`, `{"scroll": "down"}` | Scrolls |
| `{"pause": 1.5}` | Waits (times `PACE`) |
| `{"systemAlert": ["Allow", "Erlauben"]}` | Taps a button in a permission alert |
| `{"systemTap": ["Close"]}` | Taps a button in system UI over the app (the share sheet) |
| `{"faceID": true}` | Waits while Face ID looks at you |
| `{"startRecording": true}`, `{"stopRecording": true}` | Control Center's Screen Recording |
| `{"launch": true}`, `{"home": true}`, `{"terminate": true}`, `{"appSwitcher": true}` | Home screen and app life cycle |
| `{"optional": [ … ]}` | Runs the steps only if the first one works |

Any step with `"soft": true` may fail without stopping the recording.
`saveDownloadAs` on a tap is for the rehearsal only (it keeps the web
download); the iPhone shows a share sheet there instead.
