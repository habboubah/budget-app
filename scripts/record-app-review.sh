#!/usr/bin/env bash
# Records the App Review screen recording on the iPhone connected to this Mac.
#
# Runs the UI test in ios/AppReviewRecorder: it drives the Spartopf installed
# on the iPhone (the TestFlight build), starts the iOS screen recording from
# Control Center, plays ios/AppReviewRecorder/scenes.json and stops the
# recording. The video is then in the iPhone's Photos.
#
#   npm run record:app-review                       the whole recording
#   DRY_RUN=1 npm run record:app-review             the same, without recording (try it first)
#   FROM=5 TO=8 DRY_RUN=1 npm run record:app-review only scenes 5–8, no preflight
#   PACE=1.4 npm run record:app-review              slower (0.7 = faster)
#   DEVICE=<udid> npm run record:app-review         if several iPhones are connected
#   RESET=1 npm run record:app-review               reset the app without asking first
#
# The app must start empty. If it isn't, the recorder resets it in the app
# (Settings › Reset app) before the screen recording starts – after asking here.
#
# Before: ios/AppReviewRecorder/README.md, "Once" and "Every recording".
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=ios/AppReviewRecorder/AppReviewRecorder.xcodeproj
RESULT="build/app-review-recording-$(date +%Y%m%d-%H%M%S).xcresult"

command -v xcodebuild >/dev/null 2>&1 || { echo "xcodebuild not found – this runs on a Mac with Xcode." >&2; exit 1; }
echo "Looking for the iPhone …"

# Never let a failing lookup end the script without a word: every step
# below may find nothing, and then the message at the end says why.
if [ -z "${DEVICE:-}" ]; then
  # Xcode 15+: devicectl's device list as JSON (not .json-less: node reads it with JSON.parse).
  tmp="$(mktemp -d)/devices.json"
  if xcrun devicectl list devices --json-output "$tmp" >/dev/null 2>&1; then
    DEVICE=$(node -e '
      const fs = require("fs");
      let list = [];
      try { list = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).result?.devices ?? []; } catch {}
      const phones = list.filter(d => /ios/i.test(d.hardwareProperties?.platform ?? "") && !/simulator/i.test(d.hardwareProperties?.reality ?? ""));
      const state = d => d.connectionProperties?.tunnelState ?? "";
      const d = phones.find(d => state(d) === "connected") ?? phones.find(d => state(d) && state(d) !== "unavailable");
      if (d?.hardwareProperties?.udid) console.log(d.hardwareProperties.udid);
    ' "$tmp" 2>/dev/null || true)
  fi
  rm -rf "$(dirname "$tmp")"
fi
if [ -z "${DEVICE:-}" ]; then
  # Older Xcode: xctrace's list, lines like "Ahmad’s iPhone (26.1) (00008110-001A2B3C4D5E801E)".
  DEVICE=$( { xcrun xctrace list devices 2>/dev/null || true; } \
    | awk '/^== Devices ==/{on=1; next} /^== /{on=0} on' \
    | grep -E '\([0-9]+(\.[0-9]+)*\) \([0-9A-Fa-f-]{20,}\)$' \
    | head -1 | sed -E 's/.*\(([0-9A-Fa-f-]+)\)$/\1/' || true)
fi
if [ -z "${DEVICE:-}" ]; then
  echo "No iPhone found." >&2
  echo "Connect it with a cable, unlock it, tap Trust on the iPhone, and turn on" >&2
  echo "Settings › Privacy & Security › Developer Mode. What Xcode sees right now:" >&2
  xcrun devicectl list devices 2>&1 | sed 's/^/  /' >&2 || true
  echo "If your iPhone is listed, run it with its identifier: DEVICE=<identifier> npm run record:app-review" >&2
  exit 1
fi

echo "iPhone: $DEVICE"

# Resetting erases everything in Spartopf on the iPhone, so ask once (only
# the full run checks the app; FROM=n starts from the state the phone is in).
if [ "${FROM:-1}" = "1" ] && [ "${RESET:-}" != "1" ]; then
  echo
  echo "If Spartopf isn't empty, it is reset before recording: every entry, setting"
  echo "and automatic backup in it is erased. Back up your own data first."
  read -r -p "Reset Spartopf on the iPhone if needed? [y/N] " answer
  case "$answer" in
    [yYjJ]*) RESET=1 ;;
    *) echo "Not resetting. If the app isn't empty the recorder stops before recording." ;;
  esac
fi
[ "${DRY_RUN:-}" = "1" ] && echo "Dry run: nothing is recorded."
echo "Keep the iPhone unlocked and facing you (Face ID is needed twice). Don't touch it until the test ends."
mkdir -p build

set +e
TEST_RUNNER_RECORDER_PACE="${PACE:-1}" \
TEST_RUNNER_RECORDER_FROM="${FROM:-1}" \
TEST_RUNNER_RECORDER_TO="${TO:-}" \
TEST_RUNNER_RECORDER_NO_VIDEO="${DRY_RUN:-0}" \
TEST_RUNNER_RECORDER_RESET="${RESET:-0}" \
xcodebuild test \
  -project "$PROJECT" \
  -scheme AppReviewRecorder \
  -destination "id=$DEVICE" \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  -resultBundlePath "$RESULT" \
  | grep --line-buffered -E '\[recorder\]|error:|Test Case|\*\* TEST|Testing failed|Signing|provision'
status=${PIPESTATUS[0]}
set -e
echo
echo "Result: $RESULT  (open it in Xcode for the screenshot where it stopped)"
if [ "$status" -eq 0 ]; then
  [ "${DRY_RUN:-}" = "1" ] && echo "Dry run passed. Now record: npm run record:app-review" \
                            || echo "Done. The video is in Photos on the iPhone."
fi
exit "$status"
