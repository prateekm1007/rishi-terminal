import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * W3 (founder round-10): anonymous chat cost safety.
 *
 * Acceptance from the founder direction:
 *  - a test that 100 IPv6 addresses in one /64 share one quota;
 *  - a test that the GLOBAL daily cap stops requests;
 *  - a CHAT_DISABLED kill switch returning "temporarily unavailable"
 *    with the canned fallback;
 *  - HMAC-peppered identity: a missing pepper fails CLOSED (503), never
 *    a pepperless digest.
 *
 * Harness: the established route-level mock pattern — auth/quota/burst
 * module-mocked; the router, grounding validator and provider failover
 * chain run FOR REAL; the upstream fetch is scripted per test.
 */
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(async () => null),
}));

let quotaCount = 0;
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let bumpResponses: Record<string, { allowed: boolean; count: number }[]> = {};

vi.mock('@/lib/services/supabaseAdmin', () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === 'consume_chat_quota') {
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === 'refund_chat_quota') {
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === 'hit_rate_limit') return { data: { allowed: true, count: 1 }, error: null };
      if (fn === 'bump_rate_limit') {
        // Match by substring so the tests stay date-independent (the real
        // keys are chat:global:req:<IST-date> / chat:global:tok:<IST-date>).
        const key = String(args.p_key ?? '');
        const bucket = key.includes(':req:') ? 'req' : key.includes(':tok:') ? 'tok' : null;
        if (bucket && bumpResponses[bucket] && bumpResponses[bucket].length > 0) {
          return { data: bumpResponses[bucket].shift(), error: null };
        }
        return { data: { allowed: true, count: 0 }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from '@/app/api/chat/route';

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
function stubModelReply(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = JSON.stringify({
        answer: 'Patience is the greatest compounding force.',
        claims: [],
        uncertainties: [],
      });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: reply } }], usage: { total_tokens: 137 } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch,
  );
}

const BODY = { personaId: 'buffett', history: [], message: 'What is patience worth?' };

beforeEach(() => {
  quotaCount = 0;
  rpcCalls.length = 0;
  bumpResponses = {};
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

describe('W3 — CHAT_DISABLED kill switch', () => {
  it('tripped: 503 "temporarily unavailable" with the canned fallback, no quota, no upstream', async () => {
    stubModelReply();
    vi.stubEnv('CHAT_DISABLED', '1');
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(wire.fallback).toBe(true);
    expect(quotaCount).toBe(0);
    expect(rpcCalls.some((c) => c.fn === 'consume_chat_quota')).toBe(false);
  });

  it('not set: normal 200 path (regression guard)', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
  });
});

describe('W3 — global daily request cap', () => {
  it('over the cap: 503 before per-identity quota is consumed', async () => {
    stubModelReply();
    // First bump call for the req key (the increment+check) denies.
    bumpResponses = { req: [{ allowed: false, count: 2001 }] };
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(quotaCount).toBe(0);
    expect(rpcCalls.some((c) => c.fn === 'consume_chat_quota')).toBe(false);
  });

  it('under the cap: request proceeds and the token usage is recorded', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    // the successful response recorded the model's 137 usage tokens (the
    // first tok bump is the cap READ with p_increment 0; the RECORD is the
    // one carrying the usage)
    const tokBump = rpcCalls.find(
      (c) => c.fn === 'bump_rate_limit' && String(c.args.p_key).includes(':tok:') && c.args.p_increment === 137,
    );
    expect(tokBump).toBeDefined();
  });
});

describe('W3 — global daily token cap', () => {
  it('over the cap: 503 before per-identity quota is consumed', async () => {
    stubModelReply();
    bumpResponses = { tok: [{ allowed: false, count: 2_100_000 }] };
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    expect(quotaCount).toBe(0);
  });
});

describe('W3 — anonymous identity pepper', () => {
  it('missing ANON_ID_PEPPER: anonymous chat fails CLOSED (503), signed-in unaffected', async () => {
    stubModelReply();
    vi.stubEnv('ANON_ID_PEPPER', '');
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
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
