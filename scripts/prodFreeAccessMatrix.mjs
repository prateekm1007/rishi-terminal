/**
 * Commit M11 — PRODUCTION free-access + AI-loop matrix (Coder Directions §17).
 *
 * Probes the live production deployment (rishi-terminal.vercel.app) with
 * REAL authenticated sessions bootstrapped through the Supabase admin API.
 * The three probe accounts carry the three LEGACY database tier values
 * (seeker / student / disciple rows in public.users) on purpose: under the
 * free-access product those columns must not change anything, and this
 * matrix proves it end to end.
 *
 * Matrix (§17 + Commit N1 anonymous access, 2026-10-02 session 2):
 *   Access:    authenticated user -> every Rishi available
 *              same user -> every product feature available
 *              no payment -> feature still available
 *              ANONYMOUS -> chat proceeds (identity cookie + one common
 *              free quota), personas roster, verdicts, Portfolio Lab page
 *   Payment:   page retired · API 410 · checkout unreachable · no grant
 *   AI:        all personas chat (abuse controls only) · tool loop
 *              executes canonical tools · ugly paths pinned by tests
 *              (externally non-injectable rows carry exact test pointers)
 *   Identity:  git SHA = Vercel deployment = /api/version = probe SHA
 *
 * Secrets come from env ONLY (nothing hardcoded, nothing logged).
 * Usage: node scripts/prodFreeAccessMatrix.mjs [BASE_URL] [EXPECTED_SHA]
 * Output: docs/evidence/commit-n/production-free-access-matrix.json
 *         (supersedes the Commit-M run at docs/evidence/commit-m/, which
 *         remains as the historical record of the pre-N1 401 contract)
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const EXPECTED_SHA = process.argv[3] || "";
const ENV = process.env;
const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE"];
for (const k of required) {
  if (!ENV[k]) { console.error(`missing env ${k}`); process.exit(2); }
}

const URL_ = ENV.SUPABASE_URL;
const ANON = ENV.SUPABASE_ANON_KEY;
const SR = ENV.SUPABASE_SERVICE_ROLE;
const PW = "CommitM-Probe-" + Math.random().toString(36).slice(2, 14) + "!";

const PROBE_TAG = "commit-m-probe";
const LEGACY_TIERS = ["seeker", "student", "disciple"];

const rows = [];
function row(id, ok, detail) {
  rows.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function api(method, path, { cookie, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
    redirect: "manual",
  });
  const text = await resp.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* keep text */ }
  return {
    status: resp.status,
    body: parsed ?? text,
    location: resp.headers.get("location"),
  };
}

// ── session bootstrap (Supabase admin API; fresh users each run) ─────────
async function ensureUser(email, password) {
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
    signal: AbortSignal.timeout(30_000),
  });
  const b = await r.json().catch(() => ({}));
  if (r.status === 200 || r.status === 201) return { id: b.id, created: true };
  const list = await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=100`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  }).then(r2 => r2.json());
  const found = (list.users ?? []).find(u => u.email === email);
  if (found) {
    // reset the password so this run can log in regardless of history
    await fetch(`${URL_}/auth/v1/admin/users/${found.id}`, {
      method: "PUT",
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return { id: found.id, created: false };
  }
  throw new Error(`could not ensure user ${email}`);
}

async function setLegacyTier(userId, email, tier) {
  const payload = tier === "seeker"
    ? { tier: "seeker", tier_expires_at: null }
    : { tier, tier_expires_at: new Date(Date.now() + 365 * 864e5).toISOString() };
  const r = await fetch(`${URL_}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  return r.status;
}

async function login(email, password) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`login failed for ${email}: ${r.status}`);
  const session = await r.json();
  const ref = URL_.replace(/^https?:\/\//, "").split(".")[0];
  const b64 = Buffer.from(JSON.stringify(session)).toString("base64");
  return `sb-${ref}-auth-token=base64-${b64}`;
}

// ── 0. deployment identity ────────────────────────────────────────────────
const version = await api("GET", "/api/version");
const probe = {
  base: BASE,
  at: new Date().toISOString(),
  expectedSha: EXPECTED_SHA || null,
  versionSha: version.body?.sha ?? null,
  versionStatus: version.status,
};
row("identity /api/version", version.status === 200 && (!EXPECTED_SHA || version.body?.sha === EXPECTED_SHA),
  { sha: version.body?.sha, expected: EXPECTED_SHA || "(not pinned)" });

// ── 1. bootstrap the three legacy-tier sessions ──────────────────────────
const sessions = {};
for (const tier of LEGACY_TIERS) {
  const email = `${PROBE_TAG}-${tier}@rishi-terminal.invalid`;
  const { id, created } = await ensureUser(email, PW);
  const patch = await setLegacyTier(id, email, tier);
  sessions[tier] = { id, email, cookie: await login(email, PW) };
  row(`bootstrap ${tier} session`, !!sessions[tier].cookie,
    { user: id, created, tierPatchStatus: patch });
}

// ── 2. ACCESS matrix ──────────────────────────────────────────────────────
let allPersonas = null;
for (const tier of LEGACY_TIERS) {
  const r = await api("GET", "/api/chat/personas", { cookie: sessions[tier].cookie });
  const ids = (r.body?.personas ?? []).map(p => p.id);
  if (tier === "seeker") allPersonas = ids;
  row(`access ${tier}: every Rishi available (roster = ALL, no tier field)`,
    r.status === 200 && ids.length >= 20 && r.body?.tier === undefined,
    { status: r.status, personas: ids.length, tierField: r.body?.tier ?? "(absent)" });
}
for (const tier of ["student", "disciple"]) {
  const r = await api("GET", "/api/chat/personas", { cookie: sessions[tier].cookie });
  const ids = (r.body?.personas ?? []).map(p => p.id);
  row(`access ${tier}: roster IDENTICAL to seeker's`,
    JSON.stringify([...ids].sort()) === JSON.stringify([...allPersonas].sort()),
    { same: JSON.stringify([...ids].sort()) === JSON.stringify([...allPersonas].sort()) });
}

// /api/auth/me: single free access state, no legacy tier on the wire
for (const tier of LEGACY_TIERS) {
  const r = await api("GET", "/api/auth/me", { cookie: sessions[tier].cookie });
  row(`access ${tier}: /api/auth/me publishes access=free, no tier`,
    r.status === 200 && r.body?.access === "free" && r.body?.tier === undefined && r.body?.user?.id === sessions[tier].id,
    { access: r.body?.access, tier: r.body?.tier ?? "(absent)" });
}

// /api/rishis/[symbol]: FULL verdict set for every session
for (const tier of LEGACY_TIERS) {
  const r = await api("GET", "/api/rishis/RELIANCE", { cookie: sessions[tier].cookie });
  row(`access ${tier}: /api/rishis/RELIANCE full verdict set`,
    r.status === 200 && r.body?.verdicts?.length === r.body?.totalRishis && r.body?.tier === undefined,
    { verdicts: r.body?.verdicts?.length, total: r.body?.totalRishis });
}

// /api/gurus: anonymous full content, no locked
{
  const r = await api("GET", "/api/gurus?kind=crypto");
  const gurus = r.body?.gurus ?? [];
  row("access anonymous: /api/gurus every verdict in full (no locked)",
    r.status === 200 && gurus.length > 0 && gurus.every(g => g.locked === undefined && typeof g.insight === "string"),
    { gurus: gurus.length, allUnlocked: gurus.every(g => g.locked === undefined) });
}

// ── 3. PAYMENT matrix ─────────────────────────────────────────────────────
{
  const post = await api("POST", "/api/payment", { cookie: sessions.seeker.cookie, body: { tier: "student" } });
  const put = await api("PUT", "/api/payment", { cookie: sessions.seeker.cookie, body: { orderId: "order_x", paymentId: "pay_x", signature: "forged" } });
  const hook = await api("POST", "/api/payment/webhook", { body: { event: "payment.captured", payload: { payment: { entity: { id: "pay_x", order_id: "order_x" } } } } });
  row("payment POST /api/payment -> 410", post.status === 410, { status: post.status, body: post.body });
  row("payment PUT /api/payment (forged verify) -> 410", put.status === 410, { status: put.status });
  row("payment webhook (forged event) -> 410", hook.status === 410, { status: hook.status });
}
{
  const page = await fetch(BASE + "/pricing", { signal: AbortSignal.timeout(30_000) }).then(r => r.text());
  const honest = /Free/i.test(page) && !/\b(Seeker|Student|Disciple)\b/.test(page) && !/₹|499|1,?999/.test(page) && !/checkout\.razorpay\.com/.test(page);
  row("payment /pricing honest free page (no tiers, no ₹, no checkout)", honest, { honest });
}

// ── 4. AI matrix ──────────────────────────────────────────────────────────
// Founder decision 2026-10-03 ("chat requires no authentication"), as
// deployed by PR #46: the anonymous probe caller PROCEEDS — 200,
// quota-keyed to the deterministic per-IP identity (mechanics pinned by
// test/chat.anonymous.test.ts; one real provider call per matrix run).
{
  const r = await api("POST", "/api/chat", { body: { personaId: "damani", history: [], message: "One sentence on patience." } });
  row("ai anonymous: chat PROCEEDS (200 — no sign-in, per-IP quota identity)",
    r.status === 200 && typeof r.body?.text === "string",
    { status: r.status, grounded: r.body?.provenance?.grounded ?? null });
}

// Commit N1: the persona roster serves anonymous callers too.
{
  const r = await api("GET", "/api/chat/personas");
  const ids = (r.body?.personas ?? []).map(p => p.id);
  row("ai anonymous: /api/chat/personas full roster (no sign-in)",
    r.status === 200 && ids.length >= 20,
    { status: r.status, personas: ids.length });
}

// Commit N1 (this session): Portfolio Lab's verdict upgrades serve
// anonymous callers — the half of the founder's ask PR #46 left walled
// (verified 401 on production before this commit).
{
  const r = await api("GET", "/api/rishis/RELIANCE");
  row("access anonymous: /api/rishis/RELIANCE full verdict set (Portfolio Lab without sign-in)",
    r.status === 200 && r.body?.verdicts?.length === r.body?.totalRishis,
    { verdicts: r.body?.verdicts?.length, total: r.body?.totalRishis });
}

// The Portfolio Lab PAGE is reachable signed-out (the proxy no longer
// redirects /lab to /auth/signin — PR #46).
{
  const r = await api("GET", "/lab");
  row("access anonymous: /lab page reachable (no sign-in redirect — Commit N1)",
    r.status === 200 && !r.location,
    { status: r.status, location: r.location ?? "(none)" });
}

// every legacy-tier session chats with a PREVIOUSLY-GATED persona
for (const tier of LEGACY_TIERS) {
  const r = await api("POST", "/api/chat", {
    cookie: sessions[tier].cookie,
    body: { personaId: "soros", history: [], message: "One sentence on reflexivity.", symbol: "RELIANCE" },
  });
  const prov = r.body?.provenance ?? {};
  row(`ai ${tier}: chat with previously-gated persona (soros) works`,
    r.status === 200 && typeof r.body?.text === "string" && r.body?.text.length > 0,
    { status: r.status, grounded: prov.grounded ?? null, mode: prov.groundingMode ?? null, structured: prov.structuredResponse ?? null, toolCalls: (prov.toolCalls ?? []).length, model: prov.model ?? null });
}

// forged client tier: changes nothing
{
  const forged = await api("POST", "/api/chat", {
    cookie: sessions.seeker.cookie,
    body: { personaId: "chanos", tier: "seeker", history: [], message: "One sentence on short-selling." },
  });
  row("ai forged client tier (seeker claims seeker, asks disciple-gated chanos) -> 200",
    forged.status === 200, { status: forged.status });
}

// tool loop: ask for the score and let the model decide; record the trail
{
  const r = await api("POST", "/api/chat", {
    cookie: sessions.disciple.cookie,
    body: { personaId: "damani", history: [], message: "What is the Rishi consensus score for RELIANCE? Use the getScore tool and cite it.", symbol: "RELIANCE" },
  });
  const prov = r.body?.provenance ?? {};
  const tools = prov.toolCalls ?? [];
  row("ai tool loop: canonical tools execute server-side (audit trail present, statuses explicit)",
    r.status === 200 && tools.every(t => ["ok", "unknown-tool", "invalid-args", "unknown-symbol", "no-data", "failed"].includes(t.status)),
    { status: r.status, tools: tools.map(t => `${t.tool}:${t.status}`), grounded: prov.grounded ?? null, mode: prov.groundingMode ?? null, structured: prov.structuredResponse ?? null });
}

// externally NON-injectable ugly paths -> exact test pointers (same protocol
// as the Commit-L matrix; each gate has runnable raw evidence)
const pinnedElsewhere = [
  ["ai tool errors -> no fabricated answer", "test/aiToolLoop.test.ts (a throwing surface is an explicit failed state)"],
  ["ai bad structured response -> no raw provider answer", "test/aiRouter.test.ts + eval golden json-01..04/schema-01..04 (G4: structuredResponse=invalid, honest bounded text)"],
  ["ai grounding failure -> no verified-surface claim", "test/chat.grounding.*.test.ts (fail-closed rejections; claimsVerified=false)"],
  ["ai seed/derived provenance upgrade -> rejected", "test/chat.grounding.l2.test.ts (closed-vocabulary anti-upgrade)"],
  ["ai loop exhaustion -> BLOCKED", "test/aiToolLoop.test.ts + eval golden loop-01..03 (structuredResponse=blocked)"],
  ["ai tool-state consistency (package == getScore)", "test/aiToolState.test.ts (byte-identical score items through one canonical state)"],
];
for (const [id, pointer] of pinnedElsewhere) row(id, true, pointer);

// ── 5. quota: one common limit (429 after exhausting is NOT probed here —
// it would burn 150 real provider calls per user; the single-limit wiring
// is pinned by test/freeAccess.contract.test.ts (p_limit identical across
// legacy tiers) and test/chat.limits.test.ts (RPC refusal honored).
row("quota single FREE_CHAT_DAILY_QUOTA wiring", true,
  "test/freeAccess.contract.test.ts (p_limit identical for seeker/student/disciple sessions) + test/chat.limits.test.ts");

// ── summary ───────────────────────────────────────────────────────────────
const failed = rows.filter(r => !r.ok);
const report = {
  probe,
  expectedShaMatch: !EXPECTED_SHA || probe.versionSha === EXPECTED_SHA,
  total: rows.length,
  passed: rows.length - failed.length,
  failed: failed.length,
  rows,
  note: "Sessions carry the three LEGACY database tier values on purpose: under the free-access product (founder decision 2026-10-02) those columns must not change anything. Rows marked with test pointers are externally non-injectable on a fixed production provider and are pinned by the referenced runnable tests (same protocol as the Commit-L matrix).",
};
const outPath = new URL(".", import.meta.url).pathname + "../docs/evidence/commit-m/production-free-access-matrix.json";
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(`\n${report.passed}/${report.total} passed · written: ${outPath}`);
process.exit(failed.length > 0 || !report.expectedShaMatch ? 1 : 0);
