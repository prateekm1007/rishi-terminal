#!/usr/bin/env bash
# scripts/ci/vercel-ignore.sh — Vercel "Ignored Build Step" (Round 11, X1).
#
# Purpose: stop documentation-only merges from consuming the Hobby-plan
# deployment quota. Observed 2026-10-03: team-wide counter of 100
# deployments/day; Vercel status "Deployment rate limited - retry in 24
# hours" on main merges; the counter also counts preview, staging-mirror
# and deleted deployment events (docs/RELEASE.md, "Deployment budget").
#
# Contract (Vercel Ignored Build Step): exit 0  -> deployment SKIPPED;
# exit non-zero -> build proceeds.
#
# Fail-safe direction: when the change set cannot be determined (no git
# checkout, no reachable parent commit) we ALWAYS build. A skip gate that
# guesses would silently stop shipping code — for a deploy gate the safe
# direction is "build" (Constitution art. II).
#
# Skip rule (exact scope from the Round-11 directions): skip only when
# every changed path is inside docs/**, matches *.md at any depth, or is
# inside scripts/ci/**. Anything else — app code, config (including
# vercel.json itself), data, tooling outside scripts/ci — builds.

set -uo pipefail

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "vercel-ignore: not a git checkout — building (fail-safe)." >&2
  exit 1
fi

if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  # Shallow checkout: best-effort deepen on the Vercel build image
  # (origin and network exist there). Anything else fails safe below.
  if [ "${VERCEL:-}" = "1" ] && [ -n "${VERCEL_GIT_COMMIT_SHA:-}" ]; then
    git fetch --quiet --depth=2 origin "${VERCEL_GIT_COMMIT_SHA}" >/dev/null 2>&1 || true
  fi
  if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    echo "vercel-ignore: parent commit not reachable — building (fail-safe)." >&2
    exit 1
  fi
fi

if git diff --quiet HEAD^ HEAD -- . ':!docs' ':!*.md' ':!scripts/ci'; then
  echo "vercel-ignore: only docs/**, *.md or scripts/ci/** changed — skipping deployment." >&2
  exit 0
fi

echo "vercel-ignore: deployment-relevant changes present — building." >&2
exit 1
