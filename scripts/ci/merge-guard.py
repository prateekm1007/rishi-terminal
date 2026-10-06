#!/usr/bin/env python3
"""scripts/ci/merge-guard.py — the merge-COMMAND-side hard control (R18).

Founder directive 2026-10-05 (Round-16 audit, merge-cadence correction):

    "Fix the merge-cadence process mechanically, not procedurally. ...
    it must be treated as a hard control:
      - re-read `origin/main` immediately before merge;
      - confirm required checks are green on the exact current head;
      - confirm no main movement since the gate evaluation;
      - confirm cadence window;
      - only then merge.
    A printed 'verified tip' followed by a later merge is insufficient."

The PR-side cadence verdict ALREADY lives in scripts/ci/deployCadence.mjs
(one source of truth per concept — Constitution rule 14); this guard reuses
it verbatim by checking out the PR head and invoking it exactly as CI does.
What this guard adds is everything the CI check cannot be: it runs at the
moment of the merge command, against a freshly fetched origin/main, on the
exact PR head, and it REFUSES (never just reports).

Gates, in order (any refusal exits 2 and names the gate):
  0  PR open, base=main, head SHA pinned for the whole run.
  1  fresh `git fetch origin`; main tip read #1 (post-fetch).
  2  branch currency: merge-base(origin/main, head) == main tip — a moved
     main means the branch is stale: rebase first (C7).
  3  required checks green on the EXACT head (the five blocking CI jobs,
     by name, from .github/workflows/ci.yml).
  4  cadence: canonical verdict from scripts/ci/deployCadence.mjs --pr,
     executed on the PR head checkout. Docs-only PRs are exempt inside the
     canonical tool itself (same path rule as vercel-ignore.sh).
  5  main-not-moved: re-fetch immediately before merge; tip read #2 must
     equal tip read #1 (the race the 16:29:01Z incident exposed).
  6  merge via the API (merge_method=merge), pinned to the validated SHA.

Every decision input is printed raw (HTTP statuses, SHAs, verdicts, exit
codes) so an auditor can reproduce the merge evidence. Exit codes:
  0 merged (or, with --dry-run, all gates green) · 2 refused · 3 env/usage.

Provenance: the 2026-10-05 RELEASE.md ledger recorded a
"scripts/merge-guard.py" as in use BEFORE any such file was committed — a
rule-1 defect (the tool lived only in a wiped sandbox). This file is the
durable version and the only sanctioned merge path for open PRs.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO_DEFAULT = "prateekm1007/rishi-terminal"
# The five blocking CI jobs — exact `name:` fields of .github/workflows/ci.yml.
# They are also what the repo's branch protection requires; the guard refuses
# if any is missing (CI not started / job renamed) so a silent rename cannot
# quietly drop a gate.
REQUIRED_CHECKS = [
    "Lint, typecheck, test, validate",
    "Migrations & RLS invariants (Postgres 16)",
    "Playwright smoke (blocking since round 2 — green on 4+ consecutive runs)",
    "Docker Space image (E1 — build, run, probe acceptance routes)",
    "Lighthouse gate (U3 — measured-score floors, ratchet)",
]


def die(code: int, reason: str) -> None:
    print(f"MERGE-GUARD: REFUSED — {reason}")
    sys.exit(code)


def sh(args: list[str], cwd: str) -> tuple[int, str]:
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()


def api(token: str, method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "merge-guard",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:500]}


def main() -> None:
    ap = argparse.ArgumentParser(description="Hard merge gate — refuses, never just reports")
    ap.add_argument("--pr", type=int, required=True)
    ap.add_argument("--repo", default=REPO_DEFAULT)
    ap.add_argument("--repo-dir", default=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    ap.add_argument("--dry-run", action="store_true", help="evaluate every gate but do not merge")
    args = ap.parse_args()

    token = os.environ.get("GITHUB_PAT", "")
    if not token:
        die(3, "GITHUB_PAT env var not set")

    # ── gate 0: PR state, head pinned ────────────────────────────────────
    st, pr = api(token, "GET", f"/repos/{args.repo}/pulls/{args.pr}")
    print(f"[gate 0] GET /pulls/{args.pr} -> HTTP {st}")
    if st != 200:
        die(3, f"PR fetch failed: {json.dumps(pr)[:300]}")
    head = pr["head"]["sha"]
    print(f"[gate 0] state={pr['state']} base={pr['base']['ref']} head={head} "
          f"mergeable_state={pr.get('mergeable_state')}")
    if pr["state"] != "open":
        die(2, f"PR is {pr['state']}, not open")
    if pr["base"]["ref"] != "main":
        die(2, f"base is {pr['base']['ref']}, not main")

    # ── gate 1: fresh fetch + main tip read #1 ───────────────────────────
    code, out = sh(["git", "fetch", "origin"], args.repo_dir)
    print(f"[gate 1] git fetch origin -> exit {code}")
    if code != 0:
        die(3, f"fetch failed: {out[:200]}")
    code, tip1 = sh(["git", "rev-parse", "origin/main"], args.repo_dir)
    if code != 0:
        die(3, f"cannot read origin/main: {tip1[:200]}")
    print(f"[gate 1] origin/main tip (read #1) = {tip1}")

    # ── gate 2: branch currency (no stale base) ──────────────────────────
    code, out = sh(["git", "merge-base", "origin/main", head], args.repo_dir)
    if code != 0:
        die(2, f"head {head[:12]} not reachable — unknown SHA to this clone? {out[:200]}")
    if out != tip1:
        # NOTE: sh() returns (exit_code, output) — the count is the OUTPUT,
        # not the status. The first version printed the exit code (always 0
        # on success) and claimed "0 commits ahead" on a genuinely stale
        # branch; caught while capturing the stale-base bite on PR #188.
        code_n, count_out = sh(["git", "rev-list", "--count", f"{head}..origin/main"], args.repo_dir)
        n = count_out if code_n == 0 else "unknown"
        die(2, f"STALE BASE: merge-base {out[:12]} != main tip {tip1[:12]} "
               f"(main is {n} commit(s) ahead of this branch — rebase first, C7)")
    print(f"[gate 2] merge-base == main tip — branch is current with main")

    # ── gate 3: required checks green on the EXACT head ──────────────────
    st, crs = api(token, "GET", f"/repos/{args.repo}/commits/{head}/check-runs?per_page=100")
    if st != 200:
        die(3, f"check-runs fetch failed: HTTP {st}")
    seen = {c["name"]: (c["status"], c["conclusion"]) for c in crs.get("check_runs", [])}
    print(f"[gate 3] check-runs on {head[:12]}: {json.dumps(seen, ensure_ascii=False)}")
    for name in REQUIRED_CHECKS:
        if name not in seen:
            die(2, f"required check MISSING on head: {name!r} (CI not started, or the job was renamed — "
                   "the guard refuses either way so a rename can never silently drop a gate)")
        status, conclusion = seen[name]
        if status != "completed":
            die(2, f"required check not completed: {name!r} (status={status})")
        if conclusion != "success":
            die(2, f"required check RED on the exact head: {name!r} -> {conclusion}")

    # ── gate 4: cadence — the CANONICAL verdict, executed on the PR head ─
    # deployCadence.mjs --pr expects HEAD to be the PR branch (it diffs
    # merge-base..HEAD for PR relevance). Check the head out detached, run
    # the tool exactly as CI does, then return to the original checkout.
    original = sh(["git", "rev-parse", "--abbrev-ref", "HEAD"], args.repo_dir)[1]
    code, out = sh(["git", "checkout", "--quiet", head], args.repo_dir)
    if code != 0:
        die(3, f"cannot check out PR head {head[:12]}: {out[:200]}")
    cad_code, cad_out = sh(["node", "scripts/ci/deployCadence.mjs", "--pr", "--base", "origin/main"], args.repo_dir)
    print(f"[gate 4] node scripts/ci/deployCadence.mjs --pr --base origin/main "
          f"(on head {head[:12]}) -> exit {cad_code}")
    print(f"[gate 4] {cad_out}")
    sh(["git", "checkout", "--quiet", original if original != "HEAD" else "main"], args.repo_dir)
    if cad_code != 0:
        die(2, f"cadence window CLOSED (canonical deployCadence verdict above)")

    # ── gate 5: main-not-moved re-read, immediately before merge ─────────
    time.sleep(2)  # a real gap between the two reads, not two adjacent commands
    code, out = sh(["git", "fetch", "origin"], args.repo_dir)
    if code != 0:
        die(3, f"second fetch failed: {out[:200]}")
    code, tip2 = sh(["git", "rev-parse", "origin/main"], args.repo_dir)
    print(f"[gate 5] origin/main tip (read #2, pre-merge) = {tip2}")
    if tip1 != tip2:
        die(2, f"main MOVED during gate evaluation ({tip1[:12]} -> {tip2[:12]}) — re-run the guard")

    # ── gate 6: merge, pinned to the validated SHA ───────────────────────
    if args.dry_run:
        print(f"MERGE-GUARD: DRY-RUN — all gates green; would merge PR #{args.pr} at head {head}")
        sys.exit(0)
    st, res = api(token, "PUT", f"/repos/{args.repo}/pulls/{args.pr}/merge",
                  {"sha": head, "merge_method": "merge"})
    print(f"[gate 6] PUT /pulls/{args.pr}/merge (sha={head}) -> HTTP {st}")
    print(f"[gate 6] {json.dumps(res, ensure_ascii=False)[:300]}")
    if st != 200:
        die(2, f"merge API refused: {json.dumps(res, ensure_ascii=False)[:300]}")
    print(f"MERGE-GUARD: MERGED PR #{args.pr} (head {head[:12]}) -> merge commit {str(res.get('sha'))[:12]}")
    sys.exit(0)


if __name__ == "__main__":
    main()
