#!/usr/bin/env bash
# Lets Claude start App Review recording runs while you keep the iPhone on its
# stand: start this once (npm run record:watch) and leave the window open.
#
# It waits for build/record-request. Its content picks the run – only these
# settings are taken, anything else is ignored: DRY_RUN=1 FROM=n TO=n PACE=x.
# Each run's output goes to build/record-last.log, its state to
# build/record-status ("running" or "done <exit code>"). Ctrl-C stops it.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
rm -f build/record-request
echo "Waiting for run requests from Claude – keep the iPhone unlocked, on its stand, facing you. Ctrl-C stops."
while true; do
  if [ -f build/record-request ]; then
    req=$(cat build/record-request); rm -f build/record-request
    vars=()
    for kv in $req; do
      case "$kv" in
        DRY_RUN=1|DRY_RUN=0) vars+=("$kv") ;;
        FROM=[0-9]|FROM=[0-9][0-9]|TO=[0-9]|TO=[0-9][0-9]) vars+=("$kv") ;;
        PACE=[0-9].[0-9]|PACE=[0-9].[0-9][0-9]|PACE=[0-9]) vars+=("$kv") ;;
      esac
    done
    echo "$(date +%H:%M:%S) run: ${vars[*]:-(full run, recording)}"
    echo running > build/record-status
    env ${vars[@]+"${vars[@]}"} bash scripts/record-app-review.sh < /dev/null > build/record-last.log 2>&1
    code=$?
    echo "done $code" > build/record-status
    grep -E '\[recorder\]|error:' build/record-last.log | tail -4
  fi
  sleep 2
done
