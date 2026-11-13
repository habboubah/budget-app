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
#   PACE=1 npm run record:app-review                slower (default 0.65; 0.5 = faster)
#   DEVICE=<udid> npm run record:app-review         if several iPhones are connected
#   RESET=0 npm run record:app-review               don't reset: stop if the app isn't empty
#   UPDATE=0 npm run record:app-review              don't update an older build from TestFlight: stop
#
# The app must start empty: a full run resets it in the app (More › Settings › Reset
# app) before the screen recording starts – every time, without asking.
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

# Which build is on the iPhone? The scenes are written for one (scenes.json ›
# app.minVersion): on an older build the run would only stop in the preflight,
# after a reset that can't find its way around. So an older build is updated
# from TestFlight first (the recorder taps Update in TestFlight's list), before
# anything is reset or filmed. UPDATE=0: don't, just say so and stop.
# (If devicectl can't tell which build it is, the run goes on and the preflight decides.)
SCENES=ios/AppReviewRecorder/scenes.json
installed_build() { # sets $state (ok | old | missing | unknown) and $said
  local tmp verdict
  tmp="$(mktemp -d)/apps.json"
  xcrun devicectl device info apps --device "$DEVICE" --json-output "$tmp" >/dev/null 2>&1 || true
  verdict=$(node -e '
    const fs = require("fs");
    const spec = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const id = spec.app?.bundleId, min = spec.app?.minVersion, name = spec.app?.iconName || id;
    let apps = [];
    try { apps = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).result?.apps ?? []; } catch {}
    const app = apps.find(a => a.bundleIdentifier === id);
    if (!apps.length) { console.log("unknown"); process.exit(0); }
    if (!app) { console.log(`missing\n${name} (${id}) isn\u2019t installed on the iPhone \u2013 install it from TestFlight first.`); process.exit(0); }
    const version = String(app.version ?? ""), build = String(app.bundleVersion ?? "");
    const parts = v => v.split(".").map(n => parseInt(n, 10) || 0);
    const older = (a, b) => { const x = parts(a), y = parts(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0); } return false; };
    const have = `${name} on the iPhone: ${version || "?"}${build ? ` (build ${build})` : ""}`;
    if (min && version && older(version, min)) console.log(`old\n${have} \u2013 the recording is written for ${min} or later.`);
    else console.log(`ok\n${have}`);
  ' "$SCENES" "$tmp" 2>/dev/null || echo unknown)
  rm -rf "$(dirname "$tmp")"
  state=$(printf '%s\n' "$verdict" | head -n 1)
  said=$(printf '%s\n' "$verdict" | tail -n +2)
}
SHOWN='\[recorder\]|error:|Test Case|\*\* TEST|Testing failed|Signing|provision'
mkdir -p build
installed_build
if [ "$state" = "old" ] && [ "${UPDATE:-1}" = "1" ]; then
  echo "$said"
  echo "Updating it from TestFlight on the iPhone first – keep it unlocked, don't touch it."
  set +e
  TEST_RUNNER_RECORDER_UPDATE=1 \
  xcodebuild test \
    -project "$PROJECT" \
    -scheme AppReviewRecorder \
    -destination "id=$DEVICE" \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    -only-testing:RecorderUITests/AppReviewRecordingTests/testUpdateFromTestFlight \
    -resultBundlePath "build/app-review-update-$(date +%Y%m%d-%H%M%S).xcresult" \
    -collect-test-diagnostics never \
    | grep --line-buffered -E "$SHOWN"
  set -e
  sleep 3 # the new build registers with the system
  installed_build
fi
case "$state" in
  ok) echo "$said" ;;
  old)
    echo "$said" >&2
    echo "Open TestFlight on the iPhone, tap Update next to the app, then run this again. Nothing was recorded." >&2
    exit 1 ;;
  missing)
    echo "$said" >&2
    echo "Nothing was recorded." >&2
    exit 1 ;;
  *) echo "(Couldn't read which build is on the iPhone – the preflight will tell.)" ;;
esac

# A full run always starts from a freshly reset app (FROM=n starts from the
# state the phone is in). RESET=0: no reset, stop if the app isn't empty.
RESET="${RESET:-1}"
if [ "${FROM:-1}" = "1" ] && [ "$RESET" = "1" ]; then
  echo "Spartopf on the iPhone is reset first (entries, settings and automatic backups are erased)."
fi
[ "${DRY_RUN:-}" = "1" ] && echo "Dry run: nothing is recorded."
echo "Keep the iPhone unlocked and don't touch it until the test ends. (Face ID is only asked for if the app's lock is on from before: then look at the iPhone when the run starts.)"
mkdir -p build

set +e
TEST_RUNNER_RECORDER_PACE="${PACE:-0.65}" \
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
  -only-testing:RecorderUITests/AppReviewRecordingTests/testRecordAppReview \
  -resultBundlePath "$RESULT" \
  -collect-test-diagnostics never \
  | grep --line-buffered -E "$SHOWN"
status=${PIPESTATUS[0]}
set -e
echo
echo "Result: $RESULT  (open it in Xcode for the screenshot where it stopped)"
if [ "$status" -eq 0 ]; then
  [ "${DRY_RUN:-}" = "1" ] && echo "Dry run passed. Now record: npm run record:app-review" \
                            || echo "Done. The video is in Photos on the iPhone."
fi
exit "$status"
