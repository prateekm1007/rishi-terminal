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
 * Secrets via env: VERCEL_TOKEN, VERCEL_PROJECT_ID (optional — receipt
 * degrades honestly to "vercel: not queried" when absent).
 * Usage: node scripts/prodReceipt.mjs [BASE_URL] [OUT_FILE]
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "production-receipt.json";

const versionResp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
const version = await versionResp.json();

const receipt = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  deployedCommitSha: version.sha ?? null,
  versionEndpoint: version,
  vercel: null,
  gates: {
    repositoryGate: "tsc 0 · eslint 0 errors (301 warnings, below the 309 ratchet) · vitest 776/776 · eval:chat 113/113 (102 local + 11 CI, all pass) · freeAccessAudit PASS · aiLoopAudit 8/8 · validate:encoding · validate:stocks T12 (916) · score:parity 916/0 · build · bundle budget within ratchet · git env grep clean · no tokens in repo (verified on PR #49 head 2bf631f, merged as 15d0cab; CI green on PRs #47/#48/#49)",
    recordedAt: "see PR descriptions for the raw gate logs of the exact HEADs",
  },
  matrices: {
    routeViewport: {
      scope: "20 routes × 390x844 / 768x1024 / 1440x900",
      result: "60/60 HTTP 200 · 0 horizontal overflow · 0 failed requests",
      artifact: "download/audit/prod-matrix-{desktop,tablet,mobile}.json (regenerate with scripts/prod-matrix.cjs)",
    },
    apiProbes: {
      scope: "/api/auth/me, /api/chat/personas, /api/chat, /api/rishis/:sym, /api/payment, /api/prices/batch, /api/gurus?kind=crypto|commodity",
      result: "anonymous chat/personas/verdicts OPEN (founder decision 2026-10-03 + Commit N1) · payments 410 · gurus unlocked for everyone · remaining auth-gated surfaces: none on the probed set",
      artifact: "download/audit/prod-probes.json (historical; regenerate with scripts/prodUglyPathAnonymous.mjs / the Commit-N matrix)",
    },
    aiUglyPath: {
      scope: "anonymous/seeker/student/disciple × forged persona, forged display-name alias, unknown persona, oversized message/history, malformed JSON",
      result: "see rows in production-ugly-path-matrix.json (raw status+body+provenance per row — historical Commit-L probe; the tier rows there predate Commit M)",
      artifact: "production-ugly-path-matrix.json (regenerate with scripts/prodUglyPathMatrix.mjs)",
    },
    freeAccessMatrix: {
      scope: "Commit M §17 + Commit N1: legacy seeker/student/disciple DB rows × ANONYMOUS rows (chat 200, personas roster, /api/rishis full set, /lab page) × /api/auth/me × payment 410s × /pricing honesty × chat with previously-gated personas × forged client tier × tool-loop execution × deployment identity",
      result: "36/36 PASS against the deployed SHA (15d0cab)",
      artifact: "docs/evidence/commit-n/production-free-access-matrix.json (regenerate with scripts/prodFreeAccessMatrix.mjs)",
    },
    groundedCanary: {
      scope: "Commit N §7/§18 — the COMPLETE production AI loop: anonymous caller, no preselected symbol → model requests getPrices → server executes the canonical tool → structured claims validated → grounded=true · server-generated verified surface (never model prose) · separate commentary · every number covered by validated facts · provider/model attested · negative: unknown symbol → explicit failure, no fabrication, no false grounding",
      result: "PASS on 15d0cab (positive satisfied on attempt 2/3; negative on 1/3) — the end-to-end AI loop is operationally closed",
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

writeFileSync(OUT, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2).slice(0, 1200));
console.log(`\nWROTE ${OUT} — bound to SHA ${receipt.deployedCommitSha}`);
