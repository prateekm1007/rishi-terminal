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
# Usage: bash scripts/measureTtfb.sh <base-url> [passes] [table]
#   e.g. bash scripts/measureTtfb.sh https://rishi-terminal.vercel.app 4
#
# E2 (founder directive): pass `table` as the third argument to emit a
# compact, copy-paste table (per route: cold TTFB, warm p50/p95, HTTP
# codes seen, median warm bytes) instead of the Y1 summary block. The
# default output is unchanged for existing acceptance flows.
#
# Private Space auth (E2): the staging Space is PRIVATE (founder order),
# so its curls need `Authorization: Bearer <HF token>`. Set CURL_AUTH to
# the token value to enable that header; leave it unset for Vercel.
#   CURL_AUTH=hf_... bash scripts/measureTtfb.sh https://prateekm1-rishi-terminal.hf.space 4 table
#
# Caveat (E2): this script measures from wherever it runs. Runner/sandbox
# numbers are NOT "India" numbers — the founder runs it from India for
# the India-device rows (docs/HF_STAGING_MEASUREMENTS.md).
#
# Output: one raw line per hit: "<pass> <path> <http_code> <ttfb-seconds>"
# followed by a "SUMMARY" block with p50/p95 per cold/warm group (or the
# E2 table when `table` is passed).

set -euo pipefail

BASE="${1:?usage: measureTtfb.sh <base-url> [passes] [table]}"
PASSES="${2:-4}"
MODE="${3:-summary}"

AUTH_ARGS=()
if [ -n "${CURL_AUTH:-}" ]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${CURL_AUTH}")
fi

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
    # E2: size_download is captured into the raw file as a 5th token but
    # NOT printed in the default (Y1) line format, which stays 4 tokens.
    out="$(curl -s -o /dev/null -w '%{http_code} %{time_starttransfer} %{size_download}' "${AUTH_ARGS[@]}" "$BASE$path")"
    printf '%s %s %s\n' "$pass" "$path" "$out" >> "$RAW"
    if [ "$MODE" != "table" ]; then
      printf '%s %s %s\n' "$pass" "$path" "$(echo "$out" | cut -d' ' -f1-2)"
    fi
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

if [ "$MODE" = "table" ]; then
  # E2 compact table: one row per route. Columns (fixed width for
  # copy-paste): route, cold TTFB (pass 1), warm p50, warm p95 (passes
  # 2..N, nearest-rank), distinct HTTP codes seen, median warm bytes.
  echo "BASE_URL=$BASE passes=$PASSES date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ) measured_from=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo unknown)"
  printf '%-22s %9s %9s %9s  %-9s %10s\n' ROUTE COLD_S WARM_P50_S WARM_P95_S CODES BYTES_WARM_MED
  for path in "${PAGES[@]}"; do
    awk -v p="$path" '
      $2 == p {
        if ($1 == 1) { cold = $4 }
        else { n++; t[n] = $4; b[n] = $5; codes[$3] = 1 }
      }
      END {
        if (n == 0) { printf "%-22s %9.3f %9s %9s  %-9s %10s\n", p, cold, "-", "-", "-", "-" ; exit }
        # median bytes (nearest-rank on the ordered byte column)
        for (i = 1; i <= n; i++) { for (j = i+1; j <= n; j++) { if (b[j] < b[i]) { tb=b[i]; b[i]=b[j]; b[j]=tb } } }
        mb = b[int((n+1)/2)]
        for (i = 1; i <= n; i++) { for (j = i+1; j <= n; j++) { if (t[j] < t[i]) { tt=t[i]; t[i]=t[j]; t[j]=tt } } }
        p50 = t[int(0.50*n+0.999)]; p95 = t[int(0.95*n+0.999)]
        cl = ""
        for (c in codes) { cl = (cl == "" ? c : cl "," c) }
        printf "%-22s %9.3f %9.3f %9.3f  %-9s %10d\n", p, cold, p50, p95, cl, mb
      }
    ' "$RAW"
  done
  # All-routes warm row (p95 across every warm sample).
  percentile '$1 > 1' 0.95 "ALL ROUTES warm (passes 2+)"
  exit 0
fi

echo "SUMMARY"
percentile '$1 == 1'  0.95 "cold (pass 1)"
percentile '$1 == 2'  0.95 "warm (pass 2)"
percentile '$1 > 1'   0.95 "warm (all passes 2+)"
