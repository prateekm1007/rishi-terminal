#!/usr/bin/env node
// scripts/ci/branchCheck.mjs — Constitution v2, Core rule C7: branch
// hygiene gate (founder amendment 8 + 10, ratified 2026-10-05).
//
// Replaces the Round-9 commit-scope registry (scripts/commitScopeAudit.mjs
// + scripts/ci/commit-scope-registry.json, retired in incident B-27): the
// registry blocked every push behind a per-task path allowlist that had to
// be extended before each commit. This gate keeps the two invariants that
// actually caught incidents and drops the path allowlist:
//
//   1. The branch is not `main` (work never commits straight to main).
//   2. The branch NAME carries the task token — the V2/N9 wrong-branch
//      incident (B-25) was visible in the branch name before the push.
//   3. Every non-merge commit subject in the audited range carries the
//      SAME token in the `type(TOKEN): subject` convention
//      (B-23: one item, one PR; drive-by commits are visible here).
//   4. The branch is based on the current origin/main tip. STALE bases
//      are reported but only WARN, not FAIL — a legitimately stacked PR
//      merged ahead of this one moves main without making this branch
//      wrong; rebase discipline stays in the Tier-1 checklist (v2).
//
// Token matching is normalized: lowercased, `-`, `_`, `/`, `.`, space
// removed. Token `CON-B1` therefore matches branch
// `fix/con-b1-branch-check`.
//
// Usage:
//   node scripts/ci/branchCheck.mjs [branch-name]
//   npm run check:branch                     (uses the current branch)
//   node scripts/ci/branchCheck.mjs --base <ref> [branch-name]
//
// In CI (pull_request): the step passes the head ref explicitly.
//
// Exit codes: 0 = PASS, 1 = FAIL, 2 = usage/git error.

import { execFileSync } from "node:child_process";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function die(msg, code = 2) {
  console.error(`branch-check: ${msg}`);
  process.exit(code);
}

const argv = process.argv.slice(2);
let baseRef = null;
if (argv[0] === "--base") {
  argv.shift();
  baseRef = argv.shift();
}
const branchArg = argv[0];

let branch = branchArg;
if (!branch) {
  try {
    branch = git("rev-parse", "--abbrev-ref", "HEAD").trim();
  } catch {
    die("cannot determine the current branch (not a git checkout?)");
  }
}

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const branchNorm = normalize(branch);

let fail = [];
let warn = [];

// 1. Never on main.
if (branch === "main" || branch === "origin/main") {
  fail.push(`branch is '${branch}' — work must happen on a task branch (C7)`);
}

// 2. Task token in the branch name: at least one letter run of 2+ chars
//    (rejects branches like `wip`, `tmp`, `x` — tokens are meaningful).
if (!/[a-z]{2}/i.test(branch)) {
  fail.push(`branch name '${branch}' carries no readable task token (C7)`);
}

// Resolve the audited range: base..HEAD. Default base is the merge-base
// with origin/main (best effort — a fresh clone without origin/main
// degrades to the single parent commit).
if (!baseRef) {
  try {
    execFileSync("git", ["fetch", "--quiet", "origin", "main"], {
      stdio: "ignore",
    });
  } catch {
    // offline / no remote: fall through, merge-base may still resolve
  }
  try {
    baseRef = git("merge-base", "HEAD", "origin/main").trim();
  } catch {
    try {
      baseRef = git("rev-parse", "HEAD^").trim();
      warn.push("origin/main unreachable — auditing only the last commit");
    } catch {
      die("no auditable range: neither origin/main nor HEAD^ is reachable");
    }
  }
} else {
  try {
    baseRef = git("rev-parse", baseRef).trim();
  } catch {
    die(`cannot resolve --base '${baseRef}'`);
  }
}

const subjects = git("log", "--format=%s", `${baseRef}..HEAD`)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

if (subjects.length === 0) {
  die(`no commits in the audited range ${baseRef.slice(0, 12)}..HEAD`);
}

// 3. Every non-merge commit carries the branch's token.
const SUBJECT_RE = /^([a-z]+)\(([A-Za-z0-9][A-Za-z0-9._-]*)\):\s*(\S.*)$/i;
const tokens = new Set();
for (const subject of subjects) {
  if (/^merge /i.test(subject)) continue; // merge commits carry no diff
  const m = SUBJECT_RE.exec(subject);
  if (!m) {
    fail.push(
      `commit subject '${subject}' has no type(TOKEN): prefix (C7: fix(TOKEN): …)`
    );
    continue;
  }
  tokens.add(m[2]);
}

if (tokens.size > 1) {
  fail.push(
    `multiple task tokens in one branch: ${[...tokens].join(", ")} — one item, one PR, one branch (C7)`
  );
}

for (const token of tokens) {
  if (!branchNorm.includes(normalize(token))) {
    fail.push(
      `branch '${branch}' does not carry commit token '${token}' (normalized '${normalize(token)}' not found in '${branchNorm}') — B-25: assert the branch name before committing`
    );
  }
}

// 4. Base freshness — WARN only (stacked PRs are legitimate).
try {
  const mainTip = git("rev-parse", "origin/main").trim();
  if (mainTip && baseRef !== mainTip) {
    const behind = git("rev-list", "--count", `${baseRef}..origin/main`).trim();
    if (Number(behind) > 0) {
      warn.push(
        `branch base is ${behind} commit(s) behind origin/main — rebase before reporting (Tier-1 checklist, v2)`
      );
    }
  }
} catch {
  // origin/main unreachable — already warned above when relevant
}

if (warn.length > 0) {
  for (const w of warn) console.error(`branch-check: WARNING: ${w}`);
}

if (fail.length > 0) {
  console.error(`branch-check: FAIL (${branch})`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(
  `branch-check: PASS (${branch}) — ${tokens.size} token(s) [${[...tokens].join(", ") || "n/a"}], ${subjects.length} commit(s) audited against ${baseRef.slice(0, 12)}`
);
process.exit(0);
