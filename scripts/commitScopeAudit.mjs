#!/usr/bin/env node
// scripts/commitScopeAudit.mjs — Round 9, Direction 5: allowlist-per-commit
// push gate.
//
// Why it exists: a Rule-10 test file was once found inside an unrelated
// Round-9 commit (cross-task leakage caught before push, but by hand).
// This gate replaces the hand check: every commit in the audited range
// must (a) carry a task token in its subject (R9-1..R9-n / V1..Vn (founder round 9) /
// W1..Wn (founder round 10) / X1..Xn (founder round 11) / redeploy),
// (b) touch ONLY paths allowlisted for that task in
// scripts/ci/commit-scope-registry.json, and (c) sit on a parent chain
// that is fully contained in the range (no hidden splice). Merge commits
// are skipped (they introduce no diff of their own); everything else
// fails the audit.
//
// Usage:
//   node scripts/commitScopeAudit.mjs <base>..<head>
//   npm run audit:commit-scope -- e478e42..221a5db
//
// Exit codes: 0 = PASS, 1 = FAIL (with per-commit offenders listed),
// 2 = usage/registry error.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const REGISTRY_PATH = "scripts/ci/commit-scope-registry.json";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function die(msg, code = 2) {
  console.error(`commit-scope audit: ${msg}`);
  process.exit(code);
}

const range = process.argv[2];
if (!range || !/^[^\s]+\.\.[^\s]+$/.test(range)) {
  die("usage: node scripts/commitScopeAudit.mjs <base>..<head>");
}
// Resolve to the FULL SHA: parents below come back full-length from
// rev-list, and a short base string would never compare equal.
const base = git("rev-parse", range.split("..")[0]).trim();

let registry;
try {
  registry = JSON.parse(readFileSync(path.resolve(REGISTRY_PATH), "utf8"));
} catch (err) {
  die(`cannot read registry ${REGISTRY_PATH}: ${err.message}`);
}
const tasks = registry.tasks ?? {};
if (!registry || Object.keys(tasks).length === 0) {
  die("registry has no tasks — refusing to audit against an empty allowlist");
}

const revs = git("rev-list", "--reverse", "--topo-order", range)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);
if (revs.length === 0) die(`empty range: ${range}`);

const inRange = new Set(revs);
const failures = [];
const rows = [];
let mergesSkipped = 0;
let audited = 0;

function allowedPrefixes(entries, file) {
  return entries.some(
    (entry) =>
      file === entry ||
      (entry.endsWith("/") && file.startsWith(entry)) ||
      (!entry.endsWith("/") && file.startsWith(`${entry}/`)),
  );
}

for (const sha of revs) {
  const short = sha.slice(0, 9);
  const subject = git("log", "-1", "--format=%s", sha).trim();
  const parents = git("rev-list", "--parents", "-n", "1", sha)
    .trim()
    .split(" ")
    .slice(1);
  const files = git("show", "--name-only", "--format=", sha)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parents.length > 1) {
    mergesSkipped += 1;
    rows.push(`SKIP  ${short}  (merge commit — no diff of its own) ${subject.slice(0, 60)}`);
    continue;
  }
  audited += 1;

  // (c) parent-chain containment: no commit may splice in from outside.
  const parent = parents[0];
  if (parent !== base && !inRange.has(parent)) {
    failures.push({ short, subject, reason: "parent outside the audited range (spliced history)", offenders: [] });
    continue;
  }

  // (a) task token in the subject. X-n tokens are the Round-11 task
  // series; Y-n tokens are the Round-12 series; Z-n the Round-13 series;
  // A-n the Round-14 series (founder directions
  // mandate the fix(A<n>): commit prefix). Roadmap task IDs may extend a
  // series token with a sub-number (X3-05 = Round-11 X-series item 3,
  // roadmap task 05) — the sub-number is part of the token so the
  // registry can scope sub-tasks independently.
  const token = subject.match(/\b(R\d+-\d+|V\d+|W\d+|X\d+(?:-\d+)?|Y\d+|Z\d+|A\d+|redeploy)\b/);
  if (!token) {
    failures.push({ short, subject, reason: "no task token (R-n / V-n / W-n / X-n / Y-n / Z-n / A-n / redeploy) in subject", offenders: [] });
    continue;
  }
  const taskId = token[1];
  const allow = tasks[taskId];
  if (!allow) {
    failures.push({ short, subject, reason: `task ${taskId} has no allowlist in the registry`, offenders: [] });
    continue;
  }

  // (b) every touched path is inside the task's allowlist. An empty
  // allowlist is only meaningful for empty (redeploy) commits.
  const offenders = files.filter((f) => !allowedPrefixes(allow, f));
  if (allow.length === 0 && files.length > 0) {
    failures.push({ short, subject, reason: `task ${taskId} must not touch files (empty allowlist)`, offenders: files });
    continue;
  }
  if (offenders.length > 0) {
    failures.push({ short, subject, reason: `files outside the ${taskId} allowlist`, offenders });
    continue;
  }

  rows.push(
    files.length === 0
      ? `PASS  ${short}  ${subject.slice(0, 60)}  (task ${taskId}, empty commit)`
      : `PASS  ${short}  ${subject.slice(0, 60)}  (task ${taskId}, ${files.length} file${files.length === 1 ? "" : "s"})`,
  );
}

for (const row of rows) console.log(row);

if (failures.length > 0) {
  console.error("");
  console.error(`AUDIT FAIL — ${failures.length} of ${audited} audited commits violate their scope:`);
  for (const f of failures) {
    console.error(`  ✖ ${f.short}  ${f.subject.slice(0, 70)}`);
    console.error(`      ${f.reason}`);
    for (const off of f.offenders) console.error(`      offender: ${off}`);
  }
  process.exit(1);
}

console.log("");
console.log(
  `AUDIT PASS: ${audited} commit${audited === 1 ? "" : "s"} audited against ` +
    `${Object.keys(tasks).length} task allowlists, ${mergesSkipped} merge${mergesSkipped === 1 ? "" : "s"} skipped, ` +
    `0 cross-task leaks (registry: ${REGISTRY_PATH}).`,
);
