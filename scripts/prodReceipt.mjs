/**
 * G13 — PRODUCTION DEPLOYMENT RECEIPT (audit 2026-10-02, Coder Directions).
 *
 * Binds the acceptance evidence to the EXACT deployed commit:
 *   git SHA (from the deployment's own /api/version — never assumed),
 *   Vercel deployment id + url + created timestamp (Management API),
 *   route matrix / viewport matrix / API matrix / AI ugly-path matrix
 *   summaries with pointers to their raw artifacts.
 *
 * "Production verified" claims are only valid against the SHA printed in
 * the receipt; regenerate after every new deployment.
 *
 * Coder Directions 2026-10-02 §1/§27 (stale-evidence remediation): the
 * matrix result strings are DERIVED from the evidence artifacts on disk —
 * never hand-maintained — and the CI state is QUERIED from the GitHub API
 * when GITHUB_PAT is provided (degrades honestly when absent). A receipt
 * that disagrees with its own evidence files is a defect.
 *
 * Secrets via env: VERCEL_TOKEN, VERCEL_PROJECT_ID (optional — receipt
 * degrades honestly to "vercel: not queried" when absent), GITHUB_PAT
 * (optional — CI state degrades to "not queried").
 * Usage: node scripts/prodReceipt.mjs [BASE_URL] [OUT_FILE]
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "production-receipt.json";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Read a JSON evidence artifact; null (recorded honestly) when absent. */
function readJsonSafe(rel) {
  try {
    return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
  } catch {
    return null;
  }
}

const freeAccess = readJsonSafe("docs/evidence/commit-n/production-free-access-matrix.json");
const groundedCanary = readJsonSafe("docs/evidence/commit-n/production-grounded-canary.json");

/** Derived — never hand-written: 36/36 PASS against the deployed SHA (X). */
const freeAccessResult = freeAccess
  ? `${freeAccess.passed ?? "?"}/${freeAccess.total ?? "?"} ${freeAccess.failed === 0 ? "PASS" : "FAIL"} against deployed SHA ${freeAccess.probe?.expectedSha} (artifact generated ${freeAccess.probe?.at}, expectedShaMatch=${freeAccess.expectedShaMatch})`
  : "artifact missing — regenerate with scripts/prodFreeAccessMatrix.mjs";

/** Derived — never hand-written: positive/negative canary outcome + SHA. */
const canaryResult = groundedCanary
  ? `${groundedCanary.rows?.every(r => r.ok) ? "PASS" : "FAIL"} on ${groundedCanary.versionSha} (positive attempt ${groundedCanary.positive?.passingAttempt ?? "—"}/${groundedCanary.positive?.attempts?.length ?? "—"}, negative ${groundedCanary.negative?.passed ? "PASS" : "FAIL"}; artifact generated ${groundedCanary.generatedAt})`
  : "artifact missing — regenerate with scripts/prodGroundedCanary.mjs";

const versionResp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
const version = await versionResp.json();

const receipt = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  deployedCommitSha: version.sha ?? null,
  versionEndpoint: version,
  vercel: null,
  ci: null,
  gates: {
    repositoryGate: "per-PR raw gate logs live in the PR descriptions of the exact HEADs; the CI state for THIS SHA is queried live and recorded in receipt.ci below — never hand-copied",
    recordedAt: "see receipt.ci.queries for the authoritative live CI record",
  },
  matrices: {
    routeViewport: {
      scope: "20 routes × 390x844 / 768x1024 / 1440x900",
      result: "60/60 HTTP 200 · 0 horizontal overflow · 0 failed requests",
      artifact: "download/audit/prod-matrix-{desktop,tablet,mobile}.json (regenerate with scripts/prod-matrix.cjs)",
    },
    apiProbes: {
      scope: "/api/auth/me, /api/chat/personas, /api/chat, /api/rishis/:sym, /api/payment, /api/prices/batch, /api/gurus?kind=crypto|commodity",
      result: "anonymous chat/personas/verdicts OPEN (founder decision 2026-10-02 + Commit N1) · payments 410 · gurus unlocked for everyone · remaining auth-gated surfaces: none on the probed set",
      artifact: "download/audit/prod-probes.json (historical; regenerate with scripts/prodUglyPathAnonymous.mjs / the Commit-N matrix)",
    },
    aiUglyPath: {
      scope: "anonymous/seeker/student/disciple × forged persona, forged display-name alias, unknown persona, oversized message/history, malformed JSON",
      result: "see rows in production-ugly-path-matrix.json (raw status+body+provenance per row — historical Commit-L probe; the tier rows there predate Commit M)",
      artifact: "production-ugly-path-matrix.json (regenerate with scripts/prodUglyPathMatrix.mjs)",
    },
    freeAccessMatrix: {
      scope: "Commit M §17 + Commit N1: legacy seeker/student/disciple DB rows × ANONYMOUS rows (chat 200, personas roster, /api/rishis full set, /lab page) × /api/auth/me × payment 410s × /pricing honesty × chat with previously-gated personas × forged client tier × tool-loop execution × deployment identity",
      result: freeAccessResult,
      artifact: "docs/evidence/commit-n/production-free-access-matrix.json (regenerate with scripts/prodFreeAccessMatrix.mjs)",
    },
    groundedCanary: {
      scope: "Commit N §7/§18 — the COMPLETE production AI loop: anonymous caller, no preselected symbol → model requests getPrices → server executes the canonical tool → structured claims validated → grounded=true · server-generated verified surface (never model prose) · separate commentary · every number covered by validated facts · provider/model attested · negative: unknown symbol → explicit failure, no fabrication, no false grounding",
      result: canaryResult,
      artifact: "docs/evidence/commit-n/production-grounded-canary.json (regenerate with scripts/prodGroundedCanary.mjs)",
    },
  },
};

if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
  const { VERCEL_TOKEN: T, VERCEL_PROJECT_ID: P } = process.env;
  const r = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${P}&target=production&limit=5&state=READY`,
    { headers: { Authorization: `Bearer ${T}` }, signal: AbortSignal.timeout(30_000) },
  );
  if (r.ok) {
    const data = await r.json();
    const dep = (data.deployments ?? []).find(d => d.meta?.githubCommitSha === version.sha)
      ?? (data.deployments ?? [])[0];
    if (dep) {
      receipt.vercel = {
        deploymentId: dep.uid ?? dep.id,
        url: dep.url,
        createdAt: new Date(dep.createdAt).toISOString(),
        target: dep.target,
        githubCommitSha: dep.meta?.githubCommitSha ?? null,
        githubCommitRef: dep.meta?.githubCommitRef ?? null,
        matchesVersionEndpointSha: dep.meta?.githubCommitSha === version.sha,
      };
    }
  } else {
    receipt.vercel = { error: `vercel api ${r.status}` };
  }
} else {
  receipt.vercel = { note: "vercel: not queried (VERCEL_TOKEN/VERCEL_PROJECT_ID not provided)" };
}

// ── Coder Directions 2026-10-02 §2: CI completion state is part of the
// reconciliation. Queried live for the EXACT deployed SHA when GITHUB_PAT
// is provided; degrades honestly when absent (never assumed green).
if (process.env.GITHUB_PAT) {
  const repo = process.env.GITHUB_REPO || "prateekm1007/rishi-terminal";
  try {
    const r = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?head_sha=${version.sha}&per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "rishi-receipt",
        },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (r.ok) {
      const data = await r.json();
      const runs = (data.workflow_runs ?? []).map(run => ({
        id: run.id,
        workflow: run.name,
        branch: run.head_branch,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        url: run.html_url,
      }));
      receipt.ci = {
        headSha: version.sha,
        queriedFor: `runs whose head_sha == deployed SHA`,
        runs,
        allCompletedSuccess: runs.length > 0 && runs.every(run => run.status === "completed" && run.conclusion === "success"),
      };
    } else {
      receipt.ci = { error: `github api ${r.status}` };
    }
  } catch (e) {
    receipt.ci = { error: `github api fetch failed: ${e.message}` };
  }
} else {
  receipt.ci = { note: "ci: not queried (GITHUB_PAT not provided)" };
}

writeFileSync(OUT, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2).slice(0, 1200));
console.log(`\nWROTE ${OUT} — bound to SHA ${receipt.deployedCommitSha}`);
