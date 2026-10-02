// Probe the DEPLOYED production (910c12a) AI ugly paths that require NO
// credentials — the anonymous subset of scripts/prodUglyPathMatrix.mjs.
// The authenticated-tier rows remain BLOCKED on PROBE_*_PW (absent from
// vault + HF mirror after the sandbox reset; Rule 33 escalation to founder).
// Raw output archived as evidence for §15 step 9.
const BASE = "https://rishi-terminal.vercel.app";
const rows = [];

async function probe(name, path, body, expectHint) {
  const started = Date.now();
  let status = null, parsed = null, text = null;
  try {
    const resp = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    status = resp.status;
    text = await resp.text();
    try { parsed = JSON.parse(text); } catch {}
  } catch (e) {
    text = "THROW: " + (e instanceof Error ? e.message : String(e));
  }
  rows.push({
    name, path, status, ms: Date.now() - started,
    body: parsed ?? (text ?? "").slice(0, 200),
    expectHint,
  });
  console.log(`${String(status).padEnd(3)} ${name} (${Date.now() - started}ms)`);
}

// Founder decision 2026-10-02: chat requires NO authentication. The
// anonymous surface is now the FULL surface: the rows below pin that the
// anonymous path is the same bounded pipeline (quota/burst still apply)
// and that validation still fails closed WITHOUT an auth gate.
// Raw output archived as evidence for the anonymous-chat contract.

// 1. anonymous chat → the SAME pipeline as signed-in callers (200 + wire;
//    honest failure states 502/503/429 mean the bounds, not a sign-in wall)
await probe("anonymous chat (no cookie)", "/api/chat", { personaId: "buffett", symbol: "RELIANCE", message: "What is the ROE?" }, "200 + wire provenance (anonymous allowed; quota/burst still bound)");
// 2. canonical persona, anonymous → 200 (persona validation is existence-only, no tier)
await probe("canonical persona, anonymous", "/api/chat", { personaId: "jhunjhunwala", message: "hi" }, "200 (no tier gate, no sign-in gate)");
// 3. unknown persona id, anonymous → 400 (validation precedes quota; no auth precedes it anymore)
await probe("unknown persona, anonymous", "/api/chat", { personaId: "soros-fake", message: "hi" }, "400");
// 4. oversized message, anonymous → 413 (limit validation, no auth gate)
await probe("oversized message, anonymous", "/api/chat", { personaId: "buffett", message: "x".repeat(4001) }, "413");
// 5. malformed JSON body, anonymous → 400 (parse validation, no auth gate)
await probe("malformed JSON, anonymous", "/api/chat", "{not json", "400");
// 6. person as evidence probe: /api/chat/personas must NOT leak prompts
//    (the roster itself is public marketing content — philosophy blurbs
//    intentionally ship to /rishis too; the LEAK check is for the SERVER
//    prompt fields, never the model's system/stock prompts)
{
  const started = Date.now();
  const resp = await fetch(BASE + "/api/chat/personas", { signal: AbortSignal.timeout(30_000) });
  const text = await resp.text();
  const leak = /systemPrompt|stockPrompt/i.test(text);
  rows.push({ name: "personas projection leak scan", path: "/api/chat/personas", status: resp.status, ms: Date.now() - started, body: text.slice(0, 160), expectHint: "200, full public roster, no server prompt fields in client projection", leakFound: leak });
  console.log(`${String(resp.status).padEnd(3)} personas leak scan → leakFound=${leak}`);
}
// 7. /api/version sanity (binds the probe run to the deployed SHA)
{
  const resp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
  const v = await resp.json();
  rows.push({ name: "version binding", path: "/api/version", status: resp.status, body: v, expectHint: "sha = deployed commit" });
  console.log("version sha:", v.sha);
}

const { writeFileSync } = await import("node:fs");
writeFileSync("docs/evidence/commit-l/prod-ai-ugly-path-anonymous.json", JSON.stringify({ base: BASE, note: "anonymous subset only; authenticated tiers BLOCKED on PROBE_*_PW (not provisioned in vault/mirror)", rows }, null, 2));
console.log("\nsaved docs/evidence/commit-l/prod-ai-ugly-path-anonymous.json");
