import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * W3 (founder round-10) + W3 closure (founder round-11): anonymous chat
 * cost safety.
 *
 * Round-11 closure contracts pinned here:
 *
 *  A. HARD token cap via reservation + settlement. The old shape
 *     (read-with-increment-0, provider call, record-afterward) let
 *     concurrent requests pass simultaneously and let usage-less vendors
 *     spend uncounted. Now ONE admission step atomically reserves the
 *     request slot AND the request's worst-case completion budget
 *     (MAX_COMPLETION_TOKENS x MAX_COMPLETIONS_PER_REQUEST) behind a
 *     guarded SQL UPDATE — the daily counter can never exceed the cap at
 *     admission — and every exit path settles the reservation to the
 *     ACTUAL provider-reported usage (0 when the request never reached
 *     the provider: a failed request must not leak its reservation).
 *
 *  B. SINGULAR CHAT_DISABLED contract: unset/empty -> enabled;
 *     "0"/"false"/"off"/"no" (case-insensitive) -> enabled; ANY other
 *     non-empty value -> DISABLED (ambiguous values fail closed — the
 *     failure mode of a garbled operator value must be "off", never
 *     "on"; the RANKINGS_ENABLED house rationale). Code, .env.example,
 *     docs and these tests say exactly this.
 *
 *  C. ONE day boundary: the global spend counters live in
 *     chat_global_spend keyed by the IST date computed in SQL
 *     (reserve/settle RPCs) — the JavaScript day key is GONE.
 *
 * Harness: the established route-level mock pattern — auth/quota/burst
 * module-mocked; the router, grounding validator and provider failover
 * chain run FOR REAL; the upstream fetch is scripted per test. The SQL
 * layer's own atomicity/concurrency is proven separately on the Postgres
 * harness (scripts/ci/chat_global_spend_invariants.sql).
 */
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(async () => null),
}));

let quotaCount = 0;
let refundCount = 0;
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

/** Scripted reserve results (FIFO): {ok:true,...} admits, {ok:false} refuses. */
let reserveResults: Array<{ ok: boolean; tokens?: number; requests?: number }> = [];
/** Scripted settle results (FIFO). */
let settleResults: Array<{ ok: boolean; settled?: boolean }> = [];
let reserveInfraError = false;

vi.mock('@/lib/services/supabaseAdmin', () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === 'consume_chat_quota') {
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === 'refund_chat_quota') {
        refundCount += 1;
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === 'hit_rate_limit') return { data: { allowed: true, count: 1 }, error: null };
      if (fn === 'reserve_chat_global_spend') {
        if (reserveInfraError) return { data: null, error: { message: 'connection refused' } };
        const next = reserveResults.shift();
        if (!next) return { data: { ok: true, tokens: 0, requests: 1 }, error: null };
        return { data: next, error: null };
      }
      if (fn === 'settle_chat_global_tokens') {
        if (settleResults.length > 0) return { data: settleResults.shift(), error: null };
        return { data: { ok: true, settled: true }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from '@/app/api/chat/route';
import { RESERVATION_TOKENS } from '@/lib/chat/globalSpend';
import { MAX_COMPLETION_TOKENS } from '@/lib/ai/providers/openaiCompatible';
import { MAX_COMPLETIONS_PER_REQUEST } from '@/lib/ai/router';

const REAL_FETCH = globalThis.fetch;

function makeReq(json: unknown, ip = '203.0.113.7'): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === 'x-forwarded-for' ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

/** Script a compliant final model response (context-only: no evidence). */
function stubModelReply(usageTokens: number | null = 137): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = JSON.stringify({
        answer: 'Patience is the greatest compounding force.',
        claims: [],
        uncertainties: [],
      });
      const body: Record<string, unknown> = { choices: [{ message: { content: reply } }] };
      if (usageTokens !== null) body.usage = { total_tokens: usageTokens };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch,
  );
}

/** Script an upstream failure (the 502 path). */
function stubUpstreamFailure(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('upstream exploded', { status: 500 })) as unknown as typeof fetch,
  );
}

const BODY = { personaId: 'buffett', history: [], message: 'What is patience worth?' };

beforeEach(() => {
  quotaCount = 0;
  refundCount = 0;
  rpcCalls.length = 0;
  reserveResults = [];
  settleResults = [];
  reserveInfraError = false;
  vi.stubEnv('CHAT_API_BASE_URL', 'https://apihub.agnes-ai.com/v1');
  vi.stubEnv('CHAT_API_KEY', 'sk-test-key');
  vi.stubEnv('ANON_ID_PEPPER', 'test-pepper-0123456789abcdef');
  delete process.env.CHAT_DISABLED;
  delete process.env.CHAT_GLOBAL_DAILY_REQUESTS;
  delete process.env.CHAT_GLOBAL_DAILY_TOKENS;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('W3 closure — CHAT_DISABLED singular contract (defect B)', () => {
  it('tripped values disable chat: 503 canned fallback, no quota, no upstream', async () => {
    for (const value of ['1', 'true', 'TRUE', 'True', 'yes', 'on', 'garbage', ' enabled ']) {
      stubModelReply();
      vi.stubEnv('CHAT_DISABLED', value);
      const res = await POST(makeReq(BODY));
      expect(res.status, `CHAT_DISABLED=${JSON.stringify(value)}`).toBe(503);
      const wire = (await res.json()) as { error: string; fallback: boolean };
      expect(wire.error).toBe('Chat temporarily unavailable');
      expect(wire.fallback).toBe(true);
      expect(quotaCount, `CHAT_DISABLED=${JSON.stringify(value)}`).toBe(0);
    }
  });

  it('explicit operator false-values keep chat enabled', async () => {
    for (const value of ['0', 'false', 'FALSE', 'False', 'off', 'OFF', 'no', 'NO']) {
      stubModelReply();
      vi.stubEnv('CHAT_DISABLED', value);
      const res = await POST(makeReq(BODY));
      expect(res.status, `CHAT_DISABLED=${JSON.stringify(value)}`).toBe(200);
      expect(quotaCount, `CHAT_DISABLED=${JSON.stringify(value)}`).toBe(1);
      quotaCount = 0;
    }
  });

  it('unset and empty keep chat enabled (normal operation)', async () => {
    stubModelReply();
    expect((await POST(makeReq(BODY))).status).toBe(200);
    stubModelReply();
    vi.stubEnv('CHAT_DISABLED', '');
    expect((await POST(makeReq(BODY))).status).toBe(200);
    stubModelReply();
    vi.stubEnv('CHAT_DISABLED', '   ');
    expect((await POST(makeReq(BODY))).status).toBe(200);
  });
});

describe('W3 closure — hard token reservation at admission (defect A)', () => {
  it('admission reserves 1 request + the mechanical completion budget in ONE atomic RPC', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const reserve = rpcCalls.find((c) => c.fn === 'reserve_chat_global_spend');
    expect(reserve).toBeDefined();
    expect(reserve!.args.p_request_increment).toBe(1);
    expect(reserve!.args.p_token_increment).toBe(RESERVATION_TOKENS);
    // The reservation is mechanically derived from the provider completion
    // budget: MAX_COMPLETION_TOKENS x MAX_COMPLETIONS_PER_REQUEST.
    expect(RESERVATION_TOKENS).toBe(MAX_COMPLETION_TOKENS * MAX_COMPLETIONS_PER_REQUEST);
    expect(MAX_COMPLETIONS_PER_REQUEST).toBeGreaterThanOrEqual(1 + 4 + 1); // initial + tool + repair
  });

  it('a refused reservation -> 503 canned fallback BEFORE the per-identity quota', async () => {
    stubModelReply();
    reserveResults = [{ ok: false }];
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = (await res.json()) as { error: string; fallback: boolean };
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(quotaCount).toBe(0);
  });

  it('reservation infrastructure failure fails CLOSED (the documented spend contract)', async () => {
    stubModelReply();
    reserveInfraError = true;
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    expect(quotaCount).toBe(0);
  });

  it('a successful response settles the reservation to the ACTUAL usage (no double count)', async () => {
    stubModelReply(137);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const settle = rpcCalls.find((c) => c.fn === 'settle_chat_global_tokens');
    expect(settle).toBeDefined();
    expect(settle!.args.p_reserved).toBe(RESERVATION_TOKENS);
    expect(settle!.args.p_actual).toBe(137);
  });

  it('a vendor that reports NO usage settles with p_actual = 0 (the ceiling fallback, not silence)', async () => {
    stubModelReply(null);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const settle = rpcCalls.find((c) => c.fn === 'settle_chat_global_tokens');
    expect(settle).toBeDefined();
    expect(settle!.args.p_actual).toBe(0);
  });

  it('every failure path AFTER admission settles the reservation back to 0 (no leak)', async () => {
    // upstream 500 -> 502
    stubUpstreamFailure();
    let res = await POST(makeReq(BODY));
    expect(res.status).toBe(502);
    let settle = rpcCalls.find((c) => c.fn === 'settle_chat_global_tokens');
    expect(settle).toBeDefined();
    expect(settle!.args.p_actual).toBe(0);
    expect(refundCount).toBeGreaterThanOrEqual(1); // per-identity unit refunded too (R6.2)

    // reservation refused later? no — but an unconfigured-provider 503 must settle too
    rpcCalls.length = 0;
    stubModelReply();
    reserveResults = [{ ok: true, tokens: 0, requests: 1 }];
    delete process.env.CHAT_API_BASE_URL; // true unconfigured state -> 503
    delete process.env.GEMINI_API_KEY;
    res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    settle = rpcCalls.find((c) => c.fn === 'settle_chat_global_tokens');
    expect(settle).toBeDefined();
    expect(settle!.args.p_actual).toBe(0);
  });

  it('the reservation is the ONLY admission gate: the old read-with-increment-0 check is gone', async () => {
    stubModelReply();
    await POST(makeReq(BODY));
    // exactly ONE reserve call per request — no separate read bump
    expect(rpcCalls.filter((c) => c.fn === 'reserve_chat_global_spend').length).toBe(1);
    expect(rpcCalls.filter((c) => c.fn === 'bump_rate_limit').length).toBe(0);
  });
});

describe('W3 closure — one day boundary (defect C)', () => {
  it('the reserve RPC computes the day in SQL: no JS day key reaches the RPC args', async () => {
    stubModelReply();
    await POST(makeReq(BODY));
    const reserve = rpcCalls.find((c) => c.fn === 'reserve_chat_global_spend');
    expect(reserve).toBeDefined();
    for (const value of Object.values(reserve!.args)) {
      expect(String(value)).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no date string crosses the boundary
    }
  });
});

describe('W3 closure — anonymous identity pepper (round-10 acceptance, regression guard)', () => {
  it('missing ANON_ID_PEPPER: anonymous chat fails CLOSED (503)', async () => {
    stubModelReply();
    vi.stubEnv('ANON_ID_PEPPER', '');
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = (await res.json()) as { error: string };
    expect(wire.error).toBe('Chat unavailable');
    expect(quotaCount).toBe(0);
  });

  it('100 IPv6 addresses in one /64 share ONE quota identity (acceptance)', async () => {
    stubModelReply();
    const seenIds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      rpcCalls.length = 0;
      const ip = `2001:db8:42:1:${(i + 1).toString(16)}::${(i * 7 + 3).toString(16)}`;
      const res = await POST(makeReq(BODY, ip));
      expect(res.status, `request ${i} (${ip})`).toBe(200);
      const consume = rpcCalls.find((c) => c.fn === 'consume_chat_quota');
      expect(consume).toBeDefined();
      seenIds.add(String(consume!.args.p_user_id));
    }
    expect(seenIds.size).toBe(1);
  });
});
