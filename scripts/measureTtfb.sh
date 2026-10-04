#!/usr/bin/env bash
# Y1 (Round 12): page TTFB measurement for the fast-pages acceptance.
#
# The founder's prescribed command is the per-hit curl:
#   curl -s -o /dev/null -w '%{time_starttransfer}\n' <url>
# This script runs exactly that measurement over a fixed 10-route panel
# (home + 9 canonical stock pages), N passes, and reports per-pass
# aggregate p50/p95 using the nearest-rank method. Pass 1 is the
# cold-ish sweep (each page hit once, in sequence); passes 2..N are the
# warm sweeps. One curl per hit — no header requests interleaved, so the
# timings stay clean; the x-vercel-cache evidence is captured separately
# (see the Y1 PR for the curl -sI output).
#
# Usage: bash scripts/measureTtfb.sh <base-url> [passes]
#   e.g. bash scripts/measureTtfb.sh https://rishi-terminal.vercel.app 4
#
# Output: one raw line per hit: "<pass> <path> <http_code> <ttfb-seconds>"
# followed by a "SUMMARY" block with p50/p95 per cold/warm group.

set -euo pipefail

BASE="${1:?usage: measureTtfb.sh <base-url> [passes]}"
PASSES="${2:-4}"

# The 10-route Y1 panel: home + 9 canonical NSE symbols spanning liquid
# mega-caps and smaller banks (BANDHANBNK/CANBK were the founder's own
# X3 probe symbols). Canonical symbols only — 308 alias redirects would
# add a second hop to time_starttransfer and corrupt the measurement.
PAGES=(
  "/"
  "/stock/RELIANCE"
  "/stock/TCS"
  "/stock/HDFCBANK"
  "/stock/SBIN"
  "/stock/INFY"
  "/stock/CANBK"
  "/stock/BANDHANBNK"
  "/stock/AUBANK"
  "/stock/TATAMOTORS"
)

RAW="$(mktemp)"
trap 'rm -f "$RAW"' EXIT

for pass in $(seq 1 "$PASSES"); do
  for path in "${PAGES[@]}"; do
    out="$(curl -s -o /dev/null -w '%{http_code} %{time_starttransfer}' "$BASE$path")"
    printf '%s %s %s\n' "$pass" "$path" "$out" | tee -a "$RAW"
  done
done

# Nearest-rank percentile: p50 = ceil(0.50*n), p95 = ceil(0.95*n).
# POSIX-safe: no gawk asort — sort the sample column with sort -n and
# index into the ordered stream with awk.
percentile() {
  # $1 = awk filter over the raw rows, $2 = rank fraction, $3 = label
  awk "$1" "$RAW" | sort -n -k4 | awk -v frac="$2" -v label="$3" '
    { n++; t[n] = $4 }
    END {
      if (n == 0) { printf "%s: no samples\n", label; exit }
      r = int(frac * n + 0.999); if (r < 1) r = 1;
      printf "%s: n=%d p50=%.3fs p95=%.3fs max=%.3fs\n", label, n,
        t[int(0.50*n+0.999)], t[int(0.95*n+0.999)], t[n];
    }
  '
}

echo "SUMMARY"
percentile '$1 == 1'  0.95 "cold (pass 1)"
percentile '$1 == 2'  0.95 "warm (pass 2)"
percentile '$1 > 1'   0.95 "warm (all passes 2+)"
