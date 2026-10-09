import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSessionUser } from '@/lib/auth/session';
import { anonQuotaIdFromEnv } from '@/lib/auth/anonIdentity';
import {
  chatDisabled,
  globalRequestCapExceeded,
  releaseGlobalTokens,
  reserveGlobalTokens,
  settleGlobalTokens,
} from '@/lib/chat/globalSpend';
import { shouldChallenge, issueChallenge, verifyChallengeSolution } from '@/lib/chat/challenge';
import { resolvePersonaId } from '@/lib/chat/personas';
import { resolveCanonicalPersona } from '@/lib/chat/registry';
import { STOCKS } from '@/data/stocks';
import { normalizeSymbolInput } from '@/lib/registry/validateInput';
import { checkRateLimit } from '@/lib/rateLimit';
// Phase 5 T49–T52: application code calls the AI abstraction, never a
// provider SDK/URL directly. Provenance rides on every response (T50).
import { generateEvidenceGroundedAnswer, toChatWire } from '@/lib/ai/router';

/**
 * POST /api/chat — hardened LLM proxy (remediation T7; provider-extended).
 *
 * Contract: { personaId, symbol?, history, message }
 * - NO authentication required (founder decision 2026-10-02): anonymous
 *   callers run the SAME bounded pipeline as signed-in callers. A signed-in
 *   session (if present) is used as the quota identity; an anonymous caller
 *   is quota-keyed to a PSEUDONYMOUS per-IP identity (W3: an HMAC under
 *   ANON_ID_PEPPER over the /64-truncated IP, lib/auth/anonIdentity)
 *   so the persistent atomic counter below keeps bounding the spend (R12).
 *   Authentication here is an identity convenience, not a feature gate.
 * - The system prompt is built SERVER-SIDE from the canonical persona
 *   registry — a client-supplied systemPrompt is not part of the contract
 *   and is ignored/rejected.
 * - Persona validation is EXISTENCE + canonical registry resolution
 *   (Commit M3, founder decision 2026-10-02 — every feature free): an
 *   unknown persona id is rejected 400; every canonical persona is
 *   available to every caller. There is no tier gate and no sign-in gate.
 * - symbol is validated and canonicalised through the ONE canonical
 *   registry gate (lib/registry/validateInput — R11, directive 9): the
 *   same validator every API route and the AI tool layer use. Until this
 *   fix the route kept a second, stock-master-only boundary here, so
 *   WTI/USDINR/BTC were rejected by the outer chat contract while the
 *   getPrices tool served them (Rule 14 duplicate-registry defect).
 *   Non-equity instruments receive the canonical price observation plus
 *   an explicit non-equity note from the evidence assembler.
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

// ── X7: challenge persistence (single-use consume; migration 023) ──
// token_hash = SHA-256 of the public challenge token: the table stores a
// VERIFIER, never a credential (rule 8).

function sha256Hex(v: string): string {
  return createHash('sha256').update(v).digest('hex');
}

async function anonUsageToday(quotaIdentity: string): Promise<number> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { data, error } = await getAdminSupabase().rpc('chat_usage_today', {
      p_user_id: quotaIdentity,
    });
    if (error) throw new Error(error.message);
    const n = typeof data === 'number' ? data : Number(data);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (e) {
    // Fail OPEN for the READ only: an unreadable counter must not lock
    // every anonymous caller out behind challenges (the consume path and
    // the quota path still fail closed independently). Logged.
    console.error('[chat] anon usage read failed (challenge skipped):', e instanceof Error ? e.message : e);
    return 0;
  }
}

async function storeChatChallenge(
  challenge: ReturnType<typeof issueChallenge>,
  identityHash: string,
): Promise<void> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { error } = await getAdminSupabase()
      .from('chat_challenges')
      .insert({ token_hash: sha256Hex(challenge.token), identity_hash: identityHash });
    if (error) throw new Error(error.message);
  } catch (e) {
    // Best effort: a lost row only means the solution cannot be consumed
    // (the retry then issues a fresh challenge) — never a wrong admission.
    console.error('[chat] challenge store failed:', e instanceof Error ? e.message : e);
  }
}

async function consumeChatChallengeOnce(args: {
  token: string;
  identityHash: string;
}): Promise<boolean> {
  try {
    const { getAdminSupabase } = await import('@/lib/services/supabaseAdmin');
    const { data, error } = await getAdminSupabase().rpc('consume_chat_challenge', {
      p_token_hash: sha256Hex(args.token),
      p_identity_hash: args.identityHash,
    });
    if (error) throw new Error(error.message);
    return data === true;
  } catch (e) {
    console.error('[chat] challenge consume failed (fail closed):', e instanceof Error ? e.message : e);
    return false;
  }
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

// INT-A9 (Ask Rishi): server-resolved insight context — the client
// supplies ONLY the deterministic A7 change key; the insight is resolved
// through the ONE persistent cache, validated through the ONE A1 parser,
// and anchored into THIS loop (never a second endpoint or provider path).
// Pre-registration: docs/intelligence/chatContext.md.
import {
  insightRefusalResponse,
  resolveChatInsightContext,
  type ChatInsightContext,
} from '@/lib/intelligence/chatContext';
// INT-A10: the ONE package-first evidence merge lives in its own module
// (moved verbatim out of chatContext — the ONE-consumer pin holds).
import { mergeInsightEvidence } from '@/lib/intelligence/evidenceMerge';

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  // §11 latency attribution: route-level wall clock (set once, at the very
  // end, on the successful wire; error paths return without it — the
  // router timings are the attribution surface that matters there).
  const routeStart = Date.now();
  // 0. W3 (founder round-10): the kill switch — before ANY identity,
  //  quota, evidence or upstream work. The canned honest fallback.
  if (chatDisabled()) {
    return NextResponse.json(
      { error: 'Chat temporarily unavailable', fallback: true },
      { status: 503 },
    );
  }
  // 1. Identity (T5 sessions, now OPTIONAL — founder decision 2026-10-02):
  //    a signed-in session supplies the account id; an anonymous caller is
  //    quota-keyed to a PSEUDONYMOUS per-IP identity (W3: HMAC under
  //    ANON_ID_PEPPER over the /64-truncated IP). Neither path is a
  //    feature gate — every caller gets the same pipeline, evidence loop,
  //    grounding and ONE common free quota (R12 spend control retained).
  const user = await getSessionUser();
  let quotaIdentity: string;
  try {
    quotaIdentity = user?.id ?? anonQuotaIdFromEnv(clientIp(req));
  } catch {
    // W3: no pepper configured — the anonymous identity REFUSES to degrade
    // to a pepperless digest (Constitution rule 6: fail closed, never a
    // silently weaker scheme).
    console.error('[chat] anonymous identity unavailable: ANON_ID_PEPPER is not configured');
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 503 });
  }

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
    challenge?: unknown;
    // INT-A9 (Ask Rishi): the deterministic A7 change key (64-hex) —
    // the ONLY client-supplied piece of the insight context. The
    // insight itself is resolved server-side and refused closed when
    // the reference is malformed, missing, stale, unauthorized or
    // invalid (docs/intelligence/chatContext.md).
    insightRef?: unknown;
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
  // founder decision 2026-10-02: no sign-in gate either).
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
    const candidate = body.symbol.trim();
    // Fast-fail format gate (malformed input must never consume quota):
    // registry-legal spellings are alphanumerics plus & - _ / = (slashed
    // FX pairs, M&M-style tickers, the =X yahoo suffix) up to 20 chars.
    if (!/^[A-Za-z0-9&_/=-]{1,20}$/.test(candidate)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    // R11 (directive 9): the ONE canonical registry gate (Rule 14) —
    // validates AND canonicalises (USDINR -> USD/INR, legacy aliases ->
    // NSE symbols) exactly like the AI tool layer, so the outer contract
    // accepts every instrument getPrices serves and rejects the same
    // unknowns it rejects. No second symbol boundary.
    const resolved = normalizeSymbolInput(candidate);
    if (!resolved) {
      return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 });
    }
    symbol = resolved;
  }

  // ── INT-A9 (Ask Rishi): server-resolved insight context ──
  // The client supplies ONLY the deterministic A7 change key. The
  // insight itself — its evidence, its prose, its provenance — is
  // resolved server-side through the persistent cache and validated
  // through the ONE A1 parser. Every refusal fails closed in this
  // validation region: nothing is consumed, nothing reserved (N4).
  // An absent reference is plain chat; a present one anchors it.
  let insightContext: ChatInsightContext | null = null;
  if (body.insightRef != null) {
    const resolution = await resolveChatInsightContext(body.insightRef, {
      requestedSymbol: symbol,
      nowMs: Date.now(),
    });
    if (resolution.refusal || !resolution.context) {
      const refusal = resolution.refusal ?? ({ kind: "unavailable" } as const);
      console.error('[chat] insight context refused:', refusal.kind);
      const { status, error } = insightRefusalResponse(refusal);
      return NextResponse.json({ error }, { status });
    }
    insightContext = resolution.context;
    // Contextual continuation: without an explicit symbol the insight's
    // canonical subject anchors the conversation (the resolver has
    // already refused a disagreeing explicit symbol).
    if (!symbol) symbol = insightContext.symbol;
  }

  // Prompt selection: the concise stock-page variant is EQUITY-analysis
  // wording ("analyzing a stock") and is therefore used for stock symbols
  // only — a documented stock-only decision (directive 10 audit), not a
  // second symbol registry: non-equity instruments (WTI, USD/INR, BTC…)
  // get the full persona prompt. (The old code keyed prompts by the RAW
  // input string, so 'Buffett' and 'buffett' reached two different
  // prompts for the same persona.)
  const symbolIsStock = symbol !== null && Object.prototype.hasOwnProperty.call(STOCKS, symbol);
  const baseSystemPrompt =
    symbolIsStock && persona.stockPrompt ? persona.stockPrompt : persona.systemPrompt;
  // INT-A9: the server-composed, labelled context block rides AFTER the
  // persona prompt — context, not instructions (the block carries its own
  // framing rules; user text never enters it).
  const systemPrompt = insightContext
    ? baseSystemPrompt + insightContext.contextBlock
    : baseSystemPrompt;

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

  // 4.4 X7 (Round 13, Z6b): the SELF-HOSTED anonymous chat challenge.
  //     After N consumed units today (default 5, env
  //     CHAT_CHALLENGE_AFTER), an ANONYMOUS caller must pay a proof-of-work
  //     cost (lib/chat/challenge) before admission: the server issues an
  //     HMAC-signed challenge bound to the identity; the client solves it
  //     (~1-2 s of browser work) and retries with {challenge: {token,
  //     nonce, issuedAt, challengeId}}. Signed-in accounts skip the
  //     challenge entirely (the founder's spec: "anonymous chat").
  //     Placement: AFTER validation (a 400/413 costs nothing, issues
  //     nothing), BEFORE the global reservation and the per-identity quota
  //     (a challenged or failing-solution request burns nothing).
  //     Single-use: consume_chat_challenge (migration 023) is one atomic
  //     UPDATE — a replayed solution finds consumed_at set and is refused.
  //     Passing callers reserve against the FULL global token cap (the
  //     reserved slice — lib/chat/globalSpend#tokenLimitFor); everyone
  //     else against TOTAL minus the slice.
  let passedChallenge = false;
  if (!user) {
    const anonUsage = await anonUsageToday(quotaIdentity);
    if (shouldChallenge(anonUsage)) {
      const c = body.challenge as
        | { token?: unknown; nonce?: unknown; issuedAt?: unknown; challengeId?: unknown }
        | undefined;
      const usable =
        c &&
        typeof c.token === 'string' &&
        typeof c.nonce === 'string' &&
        typeof c.challengeId === 'string' &&
        typeof c.issuedAt === 'number' &&
        Number.isFinite(c.issuedAt);
      const verified =
        usable &&
        verifyChallengeSolution({
          identityHash: quotaIdentity,
          issuedAt: (c as { issuedAt: number }).issuedAt,
          challengeId: (c as { challengeId: string }).challengeId,
          token: (c as { token: string }).token,
          nonce: (c as { nonce: string }).nonce,
          pepper: process.env.ANON_ID_PEPPER ?? '',
          nowMs: Date.now(),
        });
      const consumedOnce =
        verified &&
        (await consumeChatChallengeOnce({
          token: (c as { token: string }).token,
          identityHash: quotaIdentity,
        }));
      if (verified && consumedOnce) {
        passedChallenge = true;
      } else {
        // No solution / bad solution / replayed solution: issue a FRESH
        // challenge and stop. Nothing is consumed anywhere.
        const fresh = issueChallenge(quotaIdentity, process.env.ANON_ID_PEPPER ?? '', Date.now());
        await storeChatChallenge(fresh, quotaIdentity);
        return NextResponse.json(
          {
            challengeRequired: true,
            challenge: {
              token: fresh.token,
              difficulty: fresh.difficulty,
              challengeId: fresh.challengeId,
              issuedAt: fresh.issuedAt,
              expiresAt: fresh.expiresAt,
            },
          },
          { status: 429 },
        );
      }
    }
  }

  // 4.5 W3 (founder round-10, closed 2026-10-03): GLOBAL spend caps —
  //     bound TOTAL daily spend regardless of how many identities ask
  //     (the per-identity quota cannot bound a distributed abuser).
  //     Checked AFTER validation (a 400/413 costs nothing) and BEFORE
  //     per-identity consumption (a globally-capped request must not
  //     burn the caller's unit). The token cap is hard AT ADMISSION
  //     (reservation/settlement): the single-request ceiling is
  //     RESERVED here (refused when it does not fit) and SETTLED to the
  //     reported usage after the response — concurrent requests can
  //     never admit past the cap; settlement records the provider-
  //     reported usage honestly (an above-ceiling report passes the
  //     day's settled total over the cap only by in-flight overage),
  //     and paths that never deliver an answer RELEASE the reservation
  //     (mirroring the per-identity refund). Both fail closed on
  //     infrastructure errors, matching consume_chat_quota.
  if (await globalRequestCapExceeded()) {
    return NextResponse.json(
      { error: 'Chat temporarily unavailable', fallback: true },
      { status: 503 },
    );
  }
  if (!(await reserveGlobalTokens(passedChallenge))) {
    return NextResponse.json(
      { error: 'Chat temporarily unavailable', fallback: true },
      { status: 503 },
    );
  }

  // 5. Daily quota — ONE common free quota for every caller (identity is
  //    the server-resolved account id or the pseudonymous per-IP digest —
  //    never a client-supplied value). N4: consumed only after the request
  //    validated — 400/413 paths above leave the counter untouched, and
  //    upstream failures below refund.
  if (!(await consumeQuota(quotaIdentity))) {
    // W3-A: the request never reaches the provider — release the global
    // token reservation so a quota-denied caller cannot leak budget.
    await releaseGlobalTokens();
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
    // INT-A9: the artifact's evidence joins the canonical array
    // (package-first dedupe) — claims about the insight ground against
    // server-owned evidence ids exactly like every other fact.
    if (insightContext) evidence = mergeInsightEvidence(evidence, insightContext.evidenceItems);
  } catch (e) {
    console.error('[chat] evidence assembly failed:', e instanceof Error ? e.message : e);
    await refundQuota(quotaIdentity);
    // W3-A: no provider call happened — release the reservation.
    await releaseGlobalTokens();
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
    // refunded (R6.2) and the global token reservation RELEASED (W3-A:
    // a request that delivered no answer must not hold the daily budget
    // either — a transient provider incident must not brick the day).
    // Details logged server-side only.
    console.error('[chat] upstream failed:', e instanceof Error ? e.message : e);
    await refundQuota(quotaIdentity);
    await releaseGlobalTokens();
    return NextResponse.json({ error: 'Chat service error' }, { status: 502 });
  }
  if (!answer) {
    // Unconfigured (no approved provider) — 503, quota refunded.
    console.error(
      '[chat] no approved chat provider configured: set CHAT_API_BASE_URL + CHAT_API_KEY (OpenAI-compatible) or GEMINI_API_KEY',
    );
    await refundQuota(quotaIdentity); // R6.2: unanswerable request must not burn quota
    await releaseGlobalTokens(); // W3-A: nothing was spent upstream
    return NextResponse.json({ error: 'Chat unavailable' }, { status: 503 });
  }

  // 8. T52: auditable wire response — {text} preserved for the UI,
  //    provenance (provider/model/generatedAt) rides along (T50). §11: the
  //    route decorates the router's stage timings with its own wall and
  //    evidence-assembly durations before serving.
  const wire = toChatWire(answer);
  // INT-A9: the anchor is disclosed on the wire (auditable provenance).
  if (insightContext) wire.provenance.insightContext = insightContext.disclosure;
  if (answer.timings) {
    wire.provenance.timings = {
      ...answer.timings,
      wallMs: Date.now() - routeStart,
      evidenceMs,
    };
  }
  // W3-A: settle the reservation to the provider-reported usage (the
  // multi-completion total the router accumulated). Unreported usage
  // keeps the full reservation — unknown spend is charged at the
  // ceiling. Best-effort after the response is composed (see
  // lib/chat/globalSpend for the failure semantics).
  await settleGlobalTokens(answer.usage?.totalTokens);
  return NextResponse.json(wire);
}
