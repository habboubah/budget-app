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
#
# Before: ios/AppReviewRecorder/README.md, "Once" and "Every recording".
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT=ios/AppReviewRecorder/AppReviewRecorder.xcodeproj
RESULT="build/app-review-recording-$(date +%Y%m%d-%H%M%S).xcresult"

if [ -z "${DEVICE:-}" ]; then
  # The first connected iPhone (or iPad) that isn't a simulator.
  tmp=$(mktemp)
  if xcrun devicectl list devices --json-output "$tmp" >/dev/null 2>&1; then
    DEVICE=$(node -e '
      const list = require(process.argv[1]).result?.devices ?? [];
      const d = list.find(d => d.hardwareProperties?.platform === "iOS" && d.connectionProperties?.tunnelState !== "unavailable");
      if (d) console.log(d.hardwareProperties.udid);
    ' "$tmp")
  fi
  rm -f "$tmp"
fi
if [ -z "${DEVICE:-}" ]; then
  # Older Xcode: the device list of xctrace ("Name (iOS version) (UDID)").
  DEVICE=$(xcrun xctrace list devices 2>/dev/null | awk '/^== Devices ==/{on=1; next} /^== /{on=0} on' \
    | grep -E '\([0-9]+\.[0-9.]+\) \([0-9A-Fa-f-]{20,}\)$' | head -1 | sed -E 's/.*\(([0-9A-Fa-f-]+)\)$/\1/')
fi
if [ -z "${DEVICE:-}" ]; then
  echo "No iPhone found. Connect it with a cable, unlock it, trust this Mac, and turn on Developer Mode." >&2
  exit 1
fi

echo "iPhone: $DEVICE"
[ "${DRY_RUN:-}" = "1" ] && echo "Dry run: nothing is recorded."
echo "Keep the iPhone unlocked and facing you (Face ID is needed twice). Don't touch it until the test ends."
mkdir -p build

set +e
TEST_RUNNER_RECORDER_PACE="${PACE:-1}" \
TEST_RUNNER_RECORDER_FROM="${FROM:-1}" \
TEST_RUNNER_RECORDER_TO="${TO:-}" \
TEST_RUNNER_RECORDER_NO_VIDEO="${DRY_RUN:-0}" \
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
