#!/usr/bin/env bash
# scripts/ci/vercel-ignore.sh — Vercel "Ignored Build Step" (X1, Round 11;
# hardened Z1, Round 13).
#
# Purpose: stop the Hobby-plan deployment quota (100/day, team-wide) from
# being starved by builds that ship nothing. Observed twice: ~12 merges in
# one day left production "Deployment rate limited — retry in 24 hours"
# (docs/RELEASE.md records the budget policy).
#
# Contract (Vercel Ignored Build Step): exit 0  -> deployment SKIPPED;
# exit non-zero -> build proceeds.
#
# Z1 skip rules, in order:
#   1. Staging project: every deployment of rishi-terminal-staging is
#      skipped (quota-only mirror, never carried Supabase variables).
#   2. Non-production environments: VERCEL_ENV is "preview" or
#      "development" -> SKIP. GitHub CI gates every branch (build, vitest,
#      Playwright against a local build, Lighthouse against a local
#      server) — a preview/staging deployment is pure quota burn. Fail-safe:
#      VERCEL_ENV unset (a non-Vercel invocation) does NOT skip here —
#      the change-set rules below still apply.
#   3. Production, docs-only ranges: skip when EVERY changed path since the
#      deployment base is inside docs/**, matches *.md at any depth, or is
#      inside scripts/ci/** or artifacts/** (Z1 adds artifacts — PR #115
#      built because of evidence JSON files).
#   4. Production diff base (Z1, fixes the multi-commit defect): diff
#      against VERCEL_GIT_PREVIOUS_SHA when present and reachable, else
#      HEAD^. The HEAD^ fallback mis-served multi-commit pushes whose last
#      commit was docs-only (the earlier code commits were invisible to the
#      gate and never deployed).
#
# Fail-safe direction: when the change set cannot be determined (no git
# checkout, no reachable parent commit, unreachable PREVIOUS_SHA) we ALWAYS
# build. A skip gate that guesses would silently stop shipping code — for a
# deploy gate the safe direction is "build" (Constitution art. II).
#
# VERCEL_GIT_PREVIOUS_SHA is Vercel's system variable for the previous
# commit/deployment SHA on git pushes; when absent (first deployment,
# manual upload, older flow) HEAD^ is the honest local approximation of
# "what changed in this push".

set -uo pipefail

# 1. Staging project suspension — checked FIRST (needs no git history).
if [ "${VERCEL_PROJECT_NAME:-}" = "rishi-terminal-staging" ] ||
   [ "${VERCEL_PROJECT_ID:-}" = "prj_7B1N3qceJOAh5jVAI32RhF84Zygm" ]; then
  echo "vercel-ignore: staging project deployment — skipping (suspended; docs/RELEASE.md, Deployment budget #3)." >&2
  exit 0
fi

# 2. Non-production Vercel builds never consume the quota (Z1 rule 1).
if [ -n "${VERCEL_ENV:-}" ] && [ "${VERCEL_ENV}" != "production" ]; then
  echo "vercel-ignore: VERCEL_ENV=${VERCEL_ENV} — skipping non-production build (Z1: GitHub CI gates branches)." >&2
  exit 0
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "vercel-ignore: not a git checkout — building (fail-safe)." >&2
  exit 1
fi

# 4. Determine the deployment base: PREVIOUS_SHA when present and
# reachable, else HEAD^.
BASE=""
if [ -n "${VERCEL_GIT_PREVIOUS_SHA:-}" ] &&
   git cat-file -e "${VERCEL_GIT_PREVIOUS_SHA}" 2>/dev/null; then
  BASE="${VERCEL_GIT_PREVIOUS_SHA}"
  echo "vercel-ignore: diff base = VERCEL_GIT_PREVIOUS_SHA (${BASE:0:12})." >&2
else
  if [ -n "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
    # Hardening (on top of 207e10f): after a force-push the checkout has no
    # reason to contain the pre-rewrite tip, but the REMOTE often still
    # holds it (side refs, unreferenced-but-present objects). One
    # best-effort fetch before giving up on it — a force-push that removed
    # code then diffs honestly against the deployed tree and BUILDS instead
    # of silently skipping. No VERCEL=1 guard: a remote-less repo fails
    # fast and falls through to the HEAD^ fallback below.
    if git fetch --quiet --depth=1 origin "${VERCEL_GIT_PREVIOUS_SHA}" >/dev/null 2>&1 &&
       git cat-file -e "${VERCEL_GIT_PREVIOUS_SHA}" 2>/dev/null; then
      BASE="${VERCEL_GIT_PREVIOUS_SHA}"
      echo "vercel-ignore: diff base = VERCEL_GIT_PREVIOUS_SHA (${BASE:0:12}, recovered via fetch)." >&2
    else
      echo "vercel-ignore: VERCEL_GIT_PREVIOUS_SHA not reachable even after fetch — falling back." >&2
    fi
  fi
  if [ -z "$BASE" ]; then
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
    BASE="HEAD^"
    echo "vercel-ignore: diff base = HEAD^." >&2
  fi
fi

# 3. Docs-only range check (Z1 adds artifacts/** to the skip scope).
if git diff --quiet "${BASE}" HEAD -- . ':!docs' ':!*.md' ':!scripts/ci' ':!artifacts'; then
  echo "vercel-ignore: only docs/**, *.md, scripts/ci/** or artifacts/** changed — skipping deployment." >&2
  exit 0
fi

echo "vercel-ignore: deployment-relevant changes present — building." >&2
exit 1
