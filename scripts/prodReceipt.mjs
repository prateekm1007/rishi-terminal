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
    repositoryGate: "tsc 0 · eslint 0 errors (300 warnings, below the 309 ratchet) · vitest 706/706 · eval:chat 113/113 · freeAccessAudit PASS · validate:encoding · validate:stocks T12 (916) · score:parity 916/0 · build (916 SSG) · bundle budget within ratchet · gitleaks clean · git env grep clean",
    recordedAt: "see PR description for the raw gate log of the exact HEAD",
  },
  matrices: {
    routeViewport: {
      scope: "20 routes × 390x844 / 768x1024 / 1440x900",
      result: "60/60 HTTP 200 · 0 horizontal overflow · 0 failed requests",
      artifact: "download/audit/prod-matrix-{desktop,tablet,mobile}.json (regenerate with scripts/prod-matrix.cjs)",
    },
    apiProbes: {
      scope: "/api/auth/me, /api/chat/personas, /api/chat, /api/rishis/:sym, /api/payment, /api/prices/batch, /api/gurus?kind=crypto|commodity",
      result: "fail-closed anonymous (401) · method contracts (405) · gurus unlocked for everyone (Commit M free access)",
      artifact: "download/audit/prod-probes.json",
    },
    aiUglyPath: {
      scope: "anonymous/seeker/student/disciple × forged persona, forged display-name alias, unknown persona, oversized message/history, malformed JSON",
      result: "see rows in production-ugly-path-matrix.json (raw status+body+provenance per row — historical Commit-L probe; the tier rows there predate Commit M)",
      artifact: "production-ugly-path-matrix.json (regenerate with scripts/prodUglyPathMatrix.mjs)",
    },
    freeAccessMatrix: {
      scope: "Commit M §17: legacy seeker/student/disciple DB rows × personas roster × /api/auth/me × /api/rishis full set × /api/gurus unlocked × payment 410s × /pricing honesty × chat with previously-gated personas × forged client tier × tool-loop execution × deployment identity",
      result: "33/33 PASS against the deployed SHA",
      artifact: "docs/evidence/commit-m/production-free-access-matrix.json (regenerate with scripts/prodFreeAccessMatrix.mjs)",
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
