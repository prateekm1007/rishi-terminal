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

// 1. unauthenticated chat → 401, no fabricated answer
await probe("anonymous chat (no cookie)", "/api/chat", { personaId: "buffett", symbol: "RELIANCE", message: "What is the ROE?" }, "401 + fallback true");
// 2. forged premium persona, anonymous → 401 (auth precedes persona authz)
await probe("forged premium persona, anonymous", "/api/chat", { personaId: "jhunjhunwala", message: "hi" }, "401 (auth first; persona 403 pinned by CI with mocks)");
// 3. unknown persona id, anonymous → 401
await probe("unknown persona, anonymous", "/api/chat", { personaId: "soros-fake", message: "hi" }, "401");
// 4. oversized message, anonymous → 401 (auth precedes 413)
await probe("oversized message, anonymous", "/api/chat", { personaId: "buffett", message: "x".repeat(4001) }, "401 (413 for authed pinned by CI)");
// 5. malformed JSON body, anonymous → 401 (auth precedes parse)
await probe("malformed JSON, anonymous", "/api/chat", "{not json", "401");
// 6. person as evidence probe: /api/chat/personas must NOT leak prompts
{
  const started = Date.now();
  const resp = await fetch(BASE + "/api/chat/personas", { signal: AbortSignal.timeout(30_000) });
  const text = await resp.text();
  const leak = /systemPrompt|ROE|P\/E|price/i.test(text) && !/"stockPrompt"/.test(text);
  rows.push({ name: "personas projection leak scan", path: "/api/chat/personas", status: resp.status, ms: Date.now() - started, body: text.slice(0, 160), expectHint: "200, no prompt/financial text in client projection", leakFound: leak });
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
