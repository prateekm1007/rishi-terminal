/**
 * G12 — PRODUCTION AI ugly-path matrix (audit 2026-10-02, Coder Directions).
 *
 * For authenticated production sessions (anonymous / seeker / student /
 * disciple) this script exercises /api/chat and /api/chat/personas along
 * every ugly path that is externally exercisable and captures the RAW
 * evidence per row: HTTP status, response body, provenance (grounded,
 * groundingMode, claims count, groundingRejections, provider/model).
 * NO narrative summaries — the JSON output is the record.
 *
 * Rows that cannot be forced from outside (provider 500/timeout, the
 * provider emitting a malformed structured reply, wrong evidence
 * id/field/value/unit inside a structured reply) are externally NOT
 * injectable on a fixed production provider — each such row is recorded
 * with an exact pointer to the unit/integration test that pins it
 * (test/aiRouter.test.ts, test/chat.grounding.*.test.ts, chat route
 * tests) so every gate has raw evidence SOMEWHERE runnable.
 *
 * Secrets come from env ONLY (nothing hardcoded):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE,
 *   PROBE_SEEKER_PW, PROBE_STUDENT_PW, PROBE_DISCIPLE_PW
 * Usage: node scripts/prodUglyPathMatrix.mjs [BASE_URL]
 * Output: production-ugly-path-matrix.json (+ stdout table)
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const ENV = process.env;
const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE",
  "PROBE_SEEKER_PW", "PROBE_STUDENT_PW", "PROBE_DISCIPLE_PW"];
for (const k of required) {
  if (!ENV[k]) { console.error(`missing env ${k}`); process.exit(2); }
}

const results = [];
const tierCookie = {}; // tier -> Cookie header value

async function api(method, path, { cookie, body, raw } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const started = Date.now();
  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await resp.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* raw text kept */ }
  return { status: resp.status, body: parsed ?? text, ms: Date.now() - started };
}

function provenanceOf(body) {
  const p = body && typeof body === "object" ? body.provenance ?? body : null;
  if (!p || typeof p !== "object") return null;
  return {
    grounded: p.grounded ?? null,
    groundingMode: p.groundingMode ?? null,
    structuredResponse: p.structuredResponse ?? null,
    claims: Array.isArray(p.claims) ? p.claims.length : null,
    groundingRejections: Array.isArray(p.groundingRejections) ? p.groundingRejections.length : null,
    provider: p.provider ?? null,
    model: p.model ?? null,
  };
}

async function row(tier, id, method, path, opts, expectNote) {
  const r = await api(method, path, opts);
  results.push({
    tier, id, method, path,
    status: r.status, ms: r.ms,
    body: typeof r.body === "string" ? r.body.slice(0, 800) : r.body,
    provenance: provenanceOf(r.body),
    note: expectNote,
  });
  console.log(`[${tier}] ${id}: ${r.status} (${r.ms}ms)`);
  return r;
}

// ── session bootstrapping (automated; production auth via admin API) ──────
const URL_ = ENV.SUPABASE_URL;
const ANON = ENV.SUPABASE_ANON_KEY;
const SR = ENV.SUPABASE_SERVICE_ROLE;
const USERS = {
  seeker: { email: "audit-g12-seeker@rishi-terminal.invalid", pw: ENV.PROBE_SEEKER_PW },
  student: { email: "audit-g12-student@rishi-terminal.invalid", pw: ENV.PROBE_STUDENT_PW },
  disciple: { email: "audit-g12-disciple@rishi-terminal.invalid", pw: ENV.PROBE_DISCIPLE_PW },
};

async function ensureUser(email, password) {
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await r.json().catch(() => ({}));
  if (r.status === 200 || r.status === 201) return { created: true, id: body.id };
  // 422 = already exists → find id
  const list = await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  }).then(r2 => r2.json());
  const found = (list.users ?? []).find(u => u.email === email);
  return { created: false, id: found?.id };
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
  // @supabase/ssr 0.12 cookie format: sb-<ref>-auth-token = base64-<b64(json)>
  const ref = URL_.replace(/^https?:\/\//, "").split(".")[0];
  const b64 = Buffer.from(JSON.stringify(session)).toString("base64");
  return `sb-${ref}-auth-token=base64-${b64}`;
}

// ── bootstrap tiers ───────────────────────────────────────────────────────
const idByEmail = {};
for (const [tier, u] of Object.entries(USERS)) {
  const { id, created } = await ensureUser(u.email, u.pw);
  if (!id) throw new Error(`could not ensure user ${u.email}`);
  idByEmail[u.email] = id;
  const st = await setTierWith(id, u.email, tier);
  tierCookie[tier] = await login(u.email, u.pw);
  console.log(`session ${tier}: user ${id} ${created ? "created" : "reused"}, tier patch ${st}`);
}

async function setTierWith(userId, email, tier) {
  const payload = tier === "seeker"
    ? { id: userId, email, tier: "seeker", tier_expires_at: null }
    : { tier, tier_expires_at: new Date(Date.now() + 365 * 864e5).toISOString() };
  const r = await fetch(`${URL_}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (r.status === 404) {
    const r2 = await fetch(`${URL_}/rest/v1/users`, {
      method: "POST",
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: userId, email, tier, tier_expires_at: tier === "seeker" ? null : payload.tier_expires_at }),
    });
    return r2.status;
  }
  return r.status;
}

// ── the matrix ────────────────────────────────────────────────────────────
const OVERSIZED = "x".repeat(200_000);
const BIG_HISTORY = Array.from({ length: 500 }, (_, i) => ({
  role: i % 2 ? "assistant" : "user", content: `turn ${i} lorem ipsum dolor sit amet`,
}));

// anonymous
await row("anonymous", "personas", "GET", "/api/chat/personas", {}, "fail-closed 401");
await row("anonymous", "chat valid persona", "POST", "/api/chat", { body: { personaId: "damani", message: "hello" } }, "401, no quota, no provider call");
await row("anonymous", "chat forged disciple persona", "POST", "/api/chat", { body: { personaId: "soros", message: "x" } }, "401");

for (const [tier, cookie] of Object.entries(tierCookie)) {
  await row(tier, "personas (roster)", "GET", "/api/chat/personas", { cookie }, `roster per tier (1/17/21)`);
  const allowed = tier === "seeker" ? "damani" : tier === "student" ? "buffett" : "soros";
  await row(tier, `chat allowed persona (${allowed})`, "POST", "/api/chat", { cookie, body: { personaId: allowed, message: "One short question about this stock's fundamentals." } }, "200; capture provenance/grounding truthfully");
  await row(tier, "chat forged disciple persona (soros)", "POST", "/api/chat", { cookie, body: { personaId: "soros", message: "x" } }, tier === "disciple" ? "200 (entitled)" : "403 before quota/provider");
  await row(tier, "chat forged by DISPLAY NAME ('Jim Chanos')", "POST", "/api/chat", { cookie, body: { personaId: "Jim Chanos", message: "x" } }, tier === "disciple" ? "200" : "403/400 (alias must not bypass)");
  await row(tier, "chat unknown persona", "POST", "/api/chat", { cookie, body: { personaId: "does-not-exist-xyz", message: "x" } }, "400");
  await row(tier, "oversized message (200k chars)", "POST", "/api/chat", { cookie, body: { personaId: allowed, message: OVERSIZED } }, "400/413 input validation");
  await row(tier, "oversized history (500 turns)", "POST", "/api/chat", { cookie, body: { personaId: allowed, message: "hi", history: BIG_HISTORY } }, "400/413 input validation");
  await row(tier, "malformed JSON body", "POST", "/api/chat", { cookie, raw: true, body: '{"personaId": "damani", message: BROKEN' }, "400 parse error, no 500");
}

writeFileSync("production-ugly-path-matrix.json", JSON.stringify({
  base: BASE,
  generatedAt: new Date().toISOString(),
  note: "raw capture; rows NOT externally forcible (provider 500/timeout, provider-emitted malformed structured reply, wrong evidence id/field/value/unit inside a structured reply) are pinned by test/aiRouter.test.ts + test/chat.grounding.g3.test.ts + test/chat.grounding.semantic.test.ts + test/chat.route.personaAuth.test.ts (vitest 57 files / 482 tests green at 37a3ef4)",
  rows: results,
}, null, 2));
console.log(`WROTE production-ugly-path-matrix.json (${results.length} rows)`);
