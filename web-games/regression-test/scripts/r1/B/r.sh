#!/bin/bash
# retry a script when the CDP attach times out
for i in 1 2 3 4; do
  out=$(node "$1" 2>&1)
  if echo "$out" | grep -q "connectOverCDP: Timeout"; then echo "[attach timeout, retry $i]" >&2; continue; fi
  echo "$out" | node "$(dirname "$0")"/sum.cjs; exit 0
done
echo "attach failed 4x"
