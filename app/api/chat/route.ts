import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { anonQuotaId } from '@/lib/auth/anonIdentity';
import { resolvePersonaId } from '@/lib/chat/personas';
import { resolveCanonicalPersona } from '@/lib/chat/registry';
import { STOCKS } from '@/data/stocks';
import { checkRateLimit } from '@/lib/rateLimit';
// Phase 5 T49–T52: application code calls the AI abstraction, never a
// provider SDK/URL directly. Provenance rides on every response (T50).
import { generateEvidenceGroundedAnswer, toChatWire } from '@/lib/ai/router';

/**
 * POST /api/chat — hardened LLM proxy (remediation T7; provider-extended).
 *
 * Contract: { personaId, symbol?, history, message }
 * - NO authentication required (founder decision 2026-10-03): anonymous
 *   callers run the SAME bounded pipeline as signed-in callers. A signed-in
 *   session (if present) is used as the quota identity; an anonymous caller
 *   is quota-keyed to a DETERMINISTIC per-IP uuidv5 (lib/auth/anonIdentity)
 *   so the persistent atomic counter below keeps bounding the spend (R12).
 *   Authentication here is an identity convenience, not a feature gate.
 * - The system prompt is built SERVER-SIDE from the canonical persona
 *   registry — a client-supplied systemPrompt is not part of the contract
 *   and is ignored/rejected.
 * - Persona validation is EXISTENCE + canonical registry resolution
 *   (Commit M3, founder decision 2026-10-02 — every feature free): an
 *   unknown persona id is rejected 400; every canonical persona is
 *   available to every caller. There is no tier gate and no sign-in gate.
 * - symbol is validated against the stock seed registry before use.
 * - Limits: message <= 2000 chars; history <= 20 turns and <= 8000 chars
 *   total; roles restricted to user|assistant.
 * - Quotas: per-IDENTITY daily quota (Supabase chat_usage — account id,
 *   or the deterministic per-IP uuid for anonymous callers) plus a per-IP
 *   burst limit. One common free quota either way (Commit M5).
 * - Providers (resolved per request from env):
 *     1. OpenAI-compatible endpoint — CHAT_API_BASE_URL + CHAT_API_KEY
 *        (+ optional CHAT_MODEL). The key is sent via the
 *        `Authorization: Bearer` header, never the URL.
 *     2. Google Gemini fallback — GEMINI_API_KEY, key via the
 *        `x-goog-api-key` header, never the URL.
 * - Upstream error details are logged server-side; clients get generic
 *   messages (no `details`, no `raw`).
 * - Prompt-injection hygiene: user text only ever enters `user` turns.
 */

//  ── provider resolution + upstream calls live in lib/ai (T49) ──

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 8000;

// Commit M5 (free access): ONE common daily chat quota for every caller —
// an explicit product/security constant, NOT derived from any legacy tier
// table (the old seeker/student/disciple split of 15/150/500 is gone).
// 150/day is generous for real single-user use (the old paid-median) while
// bounding upstream spend per account; abuse is further bounded by the
// per-IP burst limiter below. Founder-tunable: change this ONE number.
export const FREE_CHAT_DAILY_QUOTA = 150;

// ── per-IP burst limiter: PERSISTENT, shared across instances (R6) ──
const BURST_WINDOW_SECONDS = 60;
const BURST_MAX_REQUESTS = 12;

function clientIp(req: NextRequest): string {
  // VERIFIED against the Vercel docs (N4, round 3):
  // https://vercel.com/docs/headers/request-headers#x-forwarded-for —
  // "we currently overwrite the X-Forwarded-For header and do not forward
  // external IPs. This restriction is in place to prevent IP spoofing."
  // On Vercel the header therefore contains exactly the client's public
  // IP (a single entry). Parsing the LAST entry stays correct under both
  // models: on Vercel it is the (only) platform-set value, and behind a
  // conventional appending proxy it is the hop the trusted proxy added —
  // client-supplied prefixes always sit EARLIER. x-real-ip is only used
  // when no proxy chain is present (local/dev). The previous first-entry
  // order trusted spoofable headers (R6 finding). The assumption is
  // pinned by test/chat.quota.order.test.ts.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

async function ipBurstExceeded(ip: string): Promise<boolean> {
  const r = await checkRateLimit(`chat:ip:${ip}`, BURST_MAX_REQUESTS, BURST_WINDOW_SECONDS);
  return !r.allowed;
}

// ── per-user daily quota: ATOMIC RPC (R6) ──────────────────────
// consume_chat_quota (migration 008) is one INSERT .. ON CONFLICT ..
// DO UPDATE .. WHERE count < limit RETURNING count — concurrent requests
// can no longer read the same count and each increment it. The day key is
// the IST date, computed inside the RPC (it used to be UTC, resetting the
// quota at 05:30 IST).
async function consumeQuota(userId: string): Promise<boolean> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { data, error } = await getAdminSupabase().rpc('consume_chat_quota', {
      p_user_id: userId,
      p_limit: FREE_CHAT_DAILY_QUOTA,
    });
    if (error) throw new Error(error.message);
    return (data as { ok?: boolean } | null)?.ok === true;
  } catch (e) {
    // Fail closed on quota infrastructure errors: do not allow unbounded
    // spend when the counter is unavailable.
    console.error('[chat] quota consume failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Refund one consumed unit when the upstream call fails (R6.2). */
async function refundQuota(userId: string): Promise<void> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    await getAdminSupabase().rpc('refund_chat_quota', { p_user_id: userId });
  } catch (e) {
    // Best effort: a missed refund costs the user one quota unit; it must
    // never change the response of the failed request.
    console.error('[chat] quota refund failed:', e instanceof Error ? e.message : e);
  }
}

// ── stock context: the CANONICAL evidence assembler (end-to-end loop) ──
// Consumes resolveStockMetrics() → getStockScore() with their provenance,
// the price observation path, and explicit unavailable-field notes — with
// deterministic evidence ids the structured AI response is validated
// against. The seed-only stockEvidence() (N3) is superseded here; it
// remains exported for its own labeling-contract tests.
// Commit M7: the package and the tool loop share ONE CanonicalStockState —
// a single memoized live-fundamentals fetch + price observation per
// symbol per request — so getScore/getStock/getFinancials answer from the
// SAME data state as the initial evidence (byte-identical items/ids).
import { buildAiEvidencePackage, createCanonicalStockState } from '@/lib/ai/evidence';

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  // §11 latency attribution: route-level wall clock (set once, at the very
  // end, on the successful wire; error paths return without it — the
  // router timings are the attribution surface that matters there).
  const routeStart = Date.now();
  // 1. Identity (T5 sessions, now OPTIONAL — founder decision 2026-10-03):
  //    a signed-in session supplies the account id; an anonymous caller is
  //    quota-keyed to a deterministic per-IP uuidv5. Neither path is a
  //    feature gate — every caller gets the same pipeline, evidence loop,
  //    grounding and ONE common free quota (R12 spend control retained).
  const user = await getSessionUser();
  const quotaIdentity = user?.id ?? anonQuotaId(clientIp(req));

  // 2. Burst limit per IP.
  if (await ipBurstExceeded(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 3. Validate the contract FIRST (N4, round 3): a malformed request
  //    (bad JSON, unknown persona, oversized message/history, bad symbol)
  //    must never consume one of the user's daily units. Consumption moved
  //    below, after every 400/413 path has returned.
  let body: {
    personaId?: unknown;
    symbol?: unknown;
    history?: unknown;
    message?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const personaId = resolvePersonaId(typeof body.personaId === 'string' ? body.personaId : null);
  if (!personaId) {
    return NextResponse.json({ error: 'Unknown persona' }, { status: 400 });
  }

  // Commit M3 (free access): persona authorization is EXISTENCE + canonical
  // registry resolution — every caller may converse with every canonical
  // persona (founder decision 2026-10-02: no tier may gate any feature;
  // founder decision 2026-10-03: no sign-in gate either).
  // resolveCanonicalPersona re-reads the SAME registry the roster route
  // serves, so the two surfaces cannot drift.
  const persona = resolveCanonicalPersona(personaId)!;

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Message too long' }, { status: 413 });
  }

  let symbol: string | null = null;
  if (body.symbol != null) {
    if (typeof body.symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    const candidate = body.symbol.trim().toUpperCase();
    if (!/^[A-Z0-9&_-]{1,25}$/.test(candidate)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    if (!STOCKS[candidate]) {
      return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 });
    }
    symbol = candidate;
  }

  // Prompt selection from the canonical registry: the concise stock-page
  // variant when a symbol is in scope, the full persona prompt otherwise.
  // (The old code keyed prompts by the RAW input string, so 'Buffett' and
  // 'buffett' reached two different prompts for the same persona.)
  const systemPrompt = symbol !== null && persona.stockPrompt ? persona.stockPrompt : persona.systemPrompt;

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  if (rawHistory.length > MAX_HISTORY_TURNS) {
    return NextResponse.json({ error: 'History too long' }, { status: 413 });
  }
  const history: HistoryTurn[] = [];
  let historyChars = 0;
  for (const turn of rawHistory) {
    const t = turn as { role?: unknown; content?: unknown };
    if (t?.role !== 'user' && t?.role !== 'assistant') {
      return NextResponse.json({ error: 'Invalid history role' }, { status: 400 });
    }
    if (typeof t.content !== 'string') {
      return NextResponse.json({ error: 'Invalid history entry' }, { status: 400 });
    }
    historyChars += t.content.length;
    if (historyChars > MAX_HISTORY_CHARS) {
      return NextResponse.json({ error: 'History too long' }, { status: 413 });
    }
    history.push({ role: t.role, content: t.content });
  }

  // 5. Daily quota — ONE common free quota for every caller (identity is
  //    the server-resolved account id or the deterministic per-IP uuid —
  //    never a client-supplied value). N4: consumed only after the request
  //    validated — 400/413 paths above leave the counter untouched, and
  //    upstream failures below refund.
  if (!(await consumeQuota(quotaIdentity))) {
    return NextResponse.json(
      { error: 'Daily chat quota exhausted', fallback: true },
      { status: 429 },
    );
  }

  // 6. Compose the request. System prompt is server-built (persona);
  //    symbol context comes from the canonical evidence assembler with
  //    stable, validated ids (end-to-end AI loop) — never seed-only
  //    context, never an AI-side score recomputation.
  //    Commit L3 (§8): evidence assembly is inside the refund-protected
  //    region — an unexpected assembly throw must NOT consume a quota unit
  //    without reaching the provider (the provider-call block below has
  //    always refunded; assembly was outside it).
  let evidence;
  let stockState = null;
  let evidenceMs = 0;
  try {
    // One canonical observation state per request: the package below and
    // every tool call inside generateEvidenceGroundedAnswer reuse it.
    stockState = createCanonicalStockState();
    const evidenceStart = Date.now();
    const evidencePackage = symbol ? await buildAiEvidencePackage(symbol, {}, stockState) : null;
    evidenceMs = Date.now() - evidenceStart;
    evidence = evidencePackage?.items ?? [];
  } catch (e) {
    console.error('[chat] evidence assembly failed:', e instanceof Error ? e.message : e);
    await refundQuota(quotaIdentity);
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }

  // 7. Call the AI abstraction — provider resolution, timeout, health and
  //    provenance are handled in lib/ai (T49/T50). Fail-closed: explicit
  //    unavailable state, never a degraded pseudo-answer.
  let answer;
  try {
    answer = await generateEvidenceGroundedAnswer({
      systemPrompt,
      history,
      message,
      evidence,
      stockState: stockState ?? undefined,
    });
  } catch (e) {
    // Upstream broke (timeout/5xx/empty) — 502 with generic body, quota
    // refunded (R6.2). Details logged server-side only.
    console.error('[chat] upstream failed:', e instanceof Error ? e.message : e);
    await refundQuota(quotaIdentity);
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }
  if (!answer) {
    // Unconfigured (no approved provider) — 503, quota refunded.
    console.error(
      '[chat] no approved chat provider configured: set CHAT_API_BASE_URL + CHAT_API_KEY (OpenAI-compatible) or GEMINI_API_KEY',
    );
    await refundQuota(quotaIdentity); // R6.2: unanswerable request must not burn quota
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 503 });
  }

  // 8. T52: auditable wire response — {text} preserved for the UI,
  //    provenance (provider/model/generatedAt) rides along (T50). §11: the
  //    route decorates the router's stage timings with its own wall and
  //    evidence-assembly durations before serving.
  const wire = toChatWire(answer);
  if (answer.timings) {
    wire.provenance.timings = {
      ...answer.timings,
      wallMs: Date.now() - routeStart,
      evidenceMs,
    };
  }
  return NextResponse.json(wire);
}
