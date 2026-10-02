#!/usr/bin/env node
/**
 * prodAnonymousChatProbe.mjs — reusable production probe for the founder
 * decision 2026-10-03 (chat + lab require NO authentication).
 *
 * Rows:
 *  1. anonymous chat round-trip → 200, wire provenance, structured
 *     response; when a symbol with an evidence package is asked a
 *     fundamentals question, the grounded/claims/verifiedFacts contract
 *     is captured as-is (never assumed).
 *  2. /lab anonymous → 200 (no redirect), HTML contains the lab heading.
 *  3. /alerts anonymous → 307 (still gated, unchanged scope).
 *  4. /api/chat/personas anonymous → 200 full roster, no server prompt
 *     fields.
 *  5. /api/version binding → the exact deployed SHA.
 *
 * Writes docs/evidence/anonymous-chat-prod-<date>.json
 */
const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const { writeFileSync } = await import("node:fs");
const rows = [];

// 1. anonymous chat round-trip
{
  const started = Date.now();
  const resp = await fetch(BASE + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId: "buffett", symbol: "RELIANCE", message: "What is the ROE of RELIANCE?" }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await resp.json().catch(() => null);
  rows.push({
    name: "anonymous chat round-trip (no cookies)",
    status: resp.status,
    ms: Date.now() - started,
    http: "200 expected (founder 2026-10-03: no authentication)",
    wire: {
      provider: body?.provenance?.provider ?? null,
      model: body?.provenance?.model ?? null,
      grounded: body?.provenance?.grounded ?? null,
      groundingMode: body?.provenance?.groundingMode ?? null,
      structuredResponse: body?.provenance?.structuredResponse ?? null,
      claims: body?.provenance?.claims?.map(c => ({
        claim: c.claim, evidenceIds: c.evidenceIds, assertions: c.assertions,
      })) ?? [],
      verifiedText: body?.text ?? null,
      commentarySeparate: typeof body?.provenance?.commentary === "string",
    },
  });
  console.log(`${resp.status} anonymous chat (${Date.now() - started}ms) grounded=${body?.provenance?.grounded}`);
}

// 2. /lab anonymous
for (const path of ["/lab", "/lab?tab=holdings"]) {
  const started = Date.now();
  const resp = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
  const html = await resp.text();
  rows.push({
    name: `GET ${path} anonymous`,
    status: resp.status,
    ms: Date.now() - started,
    http: "200 expected (no sign-in redirect)",
    htmlHasLabHeading: /Portfolio Lab/i.test(html),
  });
  console.log(`${resp.status} ${path} (${Date.now() - started}ms)`);
}

// 3. /alerts still gated
{
  const resp = await fetch(BASE + "/alerts", { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  rows.push({ name: "GET /alerts anonymous (scope guard)", status: resp.status, http: "307 expected (still gated)" });
  console.log(`${resp.status} /alerts`);
}

// 4. personas roster
{
  const resp = await fetch(BASE + "/api/chat/personas", { signal: AbortSignal.timeout(30_000) });
  const body = await resp.json().catch(() => null);
  const leak = /systemPrompt|stockPrompt/i.test(JSON.stringify(body));
  rows.push({
    name: "GET /api/chat/personas anonymous",
    status: resp.status,
    rosterSize: (body?.personas ?? []).length,
    promptLeakFound: leak,
    http: "200 expected (public roster)",
  });
  console.log(`${resp.status} personas roster=${(body?.personas ?? []).length} leak=${leak}`);
}

// 5. version binding
{
  const resp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
  const v = await resp.json();
  rows.push({ name: "version binding", status: resp.status, sha: v.sha });
  console.log("version sha:", v.sha);
}

const out = `docs/evidence/anonymous-chat-prod-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(out, JSON.stringify({ base: BASE, rows }, null, 2));
console.log("saved", out);
