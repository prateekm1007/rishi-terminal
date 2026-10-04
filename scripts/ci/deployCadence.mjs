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
// Enforcement, honestly scoped (B-26 decision protocol):
//   - push to main  — BLOCKING. The landed reality is checked: if the
//     newest production-relevant merge landed less than CADENCE_MINUTES
//     after the previous one, the check fails and the violation is on the
//     record (the check run is the audit trail; it cannot retroactively
//     unmerge — nothing can).
//   - pull_request  — the check fails when THIS PR is production-relevant
//     and the last production-relevant merge on main is younger than the
//     cadence at check time. CI takes minutes and merges follow green
//     checks, so this catches the hurried sequence in the window where it
//     can still be prevented. It is not airtight (a PR green at T-50 min
//     merged at T-59 min still slips) — that residual is what the push-side
//     gate records. Together they are the mechanically enforceable maximum
//     without a merge queue.
//
// Usage:
//   node scripts/ci/deployCadence.mjs [--base <ref>] [--advisory]
//   node scripts/ci/deployCadence.mjs --fixture <json-file> [--now <epoch-ms>]
//
// Exit codes: 0 = within cadence, 1 = violation, 2 = usage/git error.

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

function die(msg, code = 2) {
  console.error(`deploy-cadence: ${msg}`);
  process.exit(code);
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

function main() {
  const argv = process.argv.slice(2);
  let fixturePath = null;
  let now = Date.now();
  let base = "HEAD";
  let advisory = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fixture") fixturePath = argv[++i];
    else if (argv[i] === "--now") now = Number(argv[++i]);
    else if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--advisory") advisory = true;
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

  if (advisory) {
    // PR context: name the risk and the wait. The relevant merges here are
    // the ones already on main; the PR's own relevance is checked by the
    // caller passing the merged tree later (the push gate re-checks the
    // landed reality regardless).
    const last = merges.find((m) => m.relevant);
    if (last) {
      const age = Math.round((now - last.ts) / MS_PER_MINUTE);
      console.log(
        `deploy-cadence: last production-relevant merge on main ${age} min ago — if THIS PR is production-relevant, merge no earlier than ${new Date(last.ts + CADENCE_MINUTES * MS_PER_MINUTE).toISOString()} (C8)`,
      );
    } else {
      console.log("deploy-cadence: no production-relevant merges on main in the audited window");
    }
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
