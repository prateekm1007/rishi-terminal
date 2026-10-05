#!/usr/bin/env node
// scripts/ci/deployCadence.mjs — Constitution v2, Core rule C8: at most one
// production-relevant merge per hour (founder Round-15 §8: "enforce
// automatically where possible, rather than documenting a one-per-hour rule
// that can still be violated").
//
// What "production-relevant" means here is the SAME definition the Vercel
// ignored-build-step uses (scripts/ci/vercel-ignore.sh): a merge whose diff
// against its first parent touches anything OUTSIDE docs/**, *.md at any
// depth, scripts/ci/** and artifacts/**. One definition, two consumers —
// a merge this gate counts is exactly a merge that would have deployed.
//
// Enforcement, honestly scoped (B-26 decision protocol; restructured Round 16
// C2 after the founder's audit: "the cadence gate turns main red after the
// fact ... a failing push check can't undo a merge"):
//   - pull_request — BLOCKING (the merge gate). The check fails when THIS PR
//     is production-relevant and the last production-relevant merge on main
//     is younger than the cadence at check time. It runs inside the required
//     "Lint, typecheck, test, validate" context, and branch protection is
//     strict (branches must be up to date), so every main merge forces open
//     PRs to rebase and re-evaluate — the verdict the merge button sees is
//     at most minutes stale.
//   - push to main  — REPORT-ONLY. The landed reality is still measured and
//     printed (the log line is the audit trail), but the run can never fail
//     on cadence: a red push check cannot undo a merge, it skipped nothing
//     that mattered, and it trained everyone to ignore red (founder defect
//     #2). Blocking belongs where it can still prevent — the PR check.
//   - The post-deploy smoke is a separate workflow (deployment_status
//     event) and is therefore unaffected by any cadence verdict.
//
// Usage:
//   node scripts/ci/deployCadence.mjs --pr --base origin/main     # PR check (blocking)
//   node scripts/ci/deployCadence.mjs --report --base origin/main # push (never fails)
//   node scripts/ci/deployCadence.mjs --fixture <json-file> [--now <epoch-ms>]
//
// Exit codes: 0 = within cadence (or report-mode, always), 1 = violation, 2 = usage/git error.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CADENCE_MINUTES = Number(process.env.DEPLOY_CADENCE_MINUTES ?? 60);
const MS_PER_MINUTE = 60_000;

// Same skip-scope as scripts/ci/vercel-ignore.sh (Z1): pathspecs excluded
// from the deployment-relevance diff.
const SKIP_PATHS = [":(exclude)docs", ":(exclude)*.md", ":(exclude)scripts/ci", ":(exclude)artifacts"];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

/** First-parent merge commits reachable from `ref`, newest first:
 *  [{sha, ts (epoch ms), subject}]. */
export function mergeHistory(ref) {
  const out = git(
    "log",
    "--first-parent",
    "--merges",
    "--format=%H%x09%ct%x09%s",
    "-30",
    ref,
  ).trim();
  if (!out) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ts, subject] = line.split("\t");
      return { sha, ts: Number(ts) * 1000, subject };
    });
}

/** A merge is production-relevant when its diff against the FIRST PARENT
 *  touches anything outside the deploy-skip scope. */
export function isProductionRelevant(sha) {
  const diff = git("diff", "--name-only", `${sha}^1`, sha, "--", ".", ...SKIP_PATHS);
  return diff.trim().length > 0;
}

/** The core rule, pure and fixture-testable: given merges (newest first)
 *  with {sha, ts, relevant} and a now, decide the newest production-
 *  relevant merge's cadence against the previous one. Returns
 *  {ok, gapMinutes, message}. */
export function evaluateCadence(merges, now = Date.now()) {
  const relevant = merges.filter((m) => m.relevant);
  if (relevant.length === 0) {
    return { ok: true, gapMinutes: null, message: "no production-relevant merges in the audited window" };
  }
  const newest = relevant[0];
  if (relevant.length === 1) {
    // A single production-relevant merge is judged against the WALL CLOCK:
    // a merge landing within the cadence of the session start still means
    // the previous one was before this push's audit window — pass, and let
    // the deploy budget ledger carry the history.
    const ageMinutes = Math.round((now - newest.ts) / MS_PER_MINUTE);
    return { ok: true, gapMinutes: ageMinutes, message: `only one production-relevant merge in the window (age ${ageMinutes} min)` };
  }
  const previous = relevant[1];
  const gapMinutes = (newest.ts - previous.ts) / MS_PER_MINUTE;
  if (gapMinutes < CADENCE_MINUTES) {
    return {
      ok: false,
      gapMinutes: Math.round(gapMinutes * 10) / 10,
      message: `production-relevant merge ${newest.sha.slice(0, 12)} landed ${Math.round(gapMinutes * 10) / 10} min after ${previous.sha.slice(0, 12)} — C8 allows at most one per ${CADENCE_MINUTES} min`,
    };
  }
  return {
    ok: true,
    gapMinutes: Math.round(gapMinutes * 10) / 10,
    message: `${Math.round(gapMinutes)} min between production-relevant merges — within the ${CADENCE_MINUTES} min cadence`,
  };
}

/** C2 (Round 16): the PR-time merge rule, pure and fixture-testable.
 *  Merging THIS pull request would violate C8 when the PR is
 *  production-relevant AND the last production-relevant merge on main is
 *  younger than the cadence. Deploy-exempt PRs (docs/scripts-ci/artifacts
 *  only — the same skip scope the Vercel ignored-build-step uses) owe no
 *  pacing because they never deploy. */
export function evaluatePrMerge({ lastRelevantTs, prRelevant, now = Date.now() }) {
  if (!prRelevant) {
    return {
      ok: true,
      message: "PR is deploy-exempt (docs/scripts-ci/artifacts only) — no cadence owed",
    };
  }
  if (lastRelevantTs === null) {
    return { ok: true, message: "no production-relevant merges on main in the audited window" };
  }
  const ageMinutes = (now - lastRelevantTs) / MS_PER_MINUTE;
  if (ageMinutes < CADENCE_MINUTES) {
    const earliest = new Date(lastRelevantTs + CADENCE_MINUTES * MS_PER_MINUTE).toISOString();
    return {
      ok: false,
      gapMinutes: Math.round(ageMinutes * 10) / 10,
      message: `last production-relevant merge landed ${Math.round(ageMinutes * 10) / 10} min ago — merging this PR now would violate C8 (at most one production-relevant merge per ${CADENCE_MINUTES} min); earliest safe merge ${earliest}`,
    };
  }
  return {
    ok: true,
    gapMinutes: Math.round(ageMinutes * 10) / 10,
    message: `last production-relevant merge was ${Math.round(ageMinutes * 10) / 10} min ago — within the ${CADENCE_MINUTES} min cadence`,
  };
}

function main() {
  const argv = process.argv.slice(2);
  let fixturePath = null;
  let now = Date.now();
  let base = "HEAD";
  let prMode = false;
  let reportMode = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fixture") fixturePath = argv[++i];
    else if (argv[i] === "--now") now = Number(argv[++i]);
    else if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--pr") prMode = true;
    else if (argv[i] === "--report") reportMode = true;
  }

  let merges;
  if (fixturePath) {
    const rows = JSON.parse(readFileSync(fixturePath, "utf8"));
    merges = rows.map((r) => ({ sha: r.sha ?? "fixture", ts: r.ts, relevant: !!r.relevant, subject: r.subject ?? "" }));
  } else {
    merges = mergeHistory(base).map((m) => ({
      ...m,
      relevant: isProductionRelevant(m.sha),
    }));
  }

  const verdict = evaluateCadence(merges, now);

  // C2 (Round 16): push-time runs REPORT the landed reality, never fail on
  // it. A red push check cannot undo a merge; blocking belongs on the PR
  // check where it can still prevent the violation.
  if (reportMode) {
    const tag = verdict.ok ? "PASS" : "FAIL (recorded, not blocking — enforcement lives on the PR check)";
    console.log(`deploy-cadence: ${tag} — ${verdict.message}`);
    process.exit(0);
  }

  // C2 (Round 16): the PR-time merge gate. Fails when merging THIS PR now
  // would violate C8, naming the earliest safe merge time. Runs inside the
  // required "Lint, typecheck, test, validate" context (branch protection
  // is strict, so the verdict refreshes after every main merge).
  if (prMode) {
    const last = merges.find((m) => m.relevant) ?? null;
    let prRelevant = true; // fail-safe default: assume the PR deploys
    try {
      const mergeBase = git("merge-base", base, "HEAD").trim();
      const diff = git("diff", "--name-only", mergeBase, "HEAD", "--", ".", ...SKIP_PATHS);
      prRelevant = diff.trim().length > 0;
    } catch {
      // Cannot establish the PR's relevance -> assume production-relevant
      // (the deploy gate's own fail-safe direction; Constitution art. II).
    }
    const prVerdict = evaluatePrMerge({
      lastRelevantTs: last ? last.ts : null,
      prRelevant,
      now,
    });
    if (!prVerdict.ok) {
      console.error(`deploy-cadence: FAIL — ${prVerdict.message}`);
      process.exit(1);
    }
    console.log(`deploy-cadence: PASS — ${prVerdict.message}`);
    process.exit(0);
  }

  if (!verdict.ok) {
    console.error(`deploy-cadence: FAIL — ${verdict.message}`);
    process.exit(1);
  }
  console.log(`deploy-cadence: PASS — ${verdict.message}`);
  process.exit(0);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) main();
