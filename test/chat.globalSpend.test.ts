import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * W3 closure (founder round-10 review, 2026-10-03) — the three review
 * defects, each pinned here:
 *
 *  A. The token cap is hard AT ADMISSION (reservation/settlement): the
 *     route RESERVES the single-request ceiling before the provider call
 *     (denied when it does not fit) and SETTLES to the provider-reported
 *     usage afterward (reservation kept in full when usage is
 *     unavailable; an above-ceiling report is recorded honestly —
 *     settlement is a ledger, not an admission). Failure paths RELEASE
 *     the reservation exactly like the per-identity quota refund.
 *  B. CHAT_DISABLED has ONE contract, identical in code, .env.example,
 *     docs/ACCESS_MODEL.md and this file: unset/"" or the explicit
 *     false-y spellings 0/false/no/off (case-insensitive) leave chat
 *     ENABLED; EVERY other non-empty value DISABLES it (a kill-switch
 *     typo must fail toward "off").
 *  C. The IST day key is computed ONLY inside the RPCs (one source of
 *     truth with consume_chat_quota) — the route passes stable prefixes.
 *
 * Harness: the established route-level mock pattern. The reserve/settle
 * mock models the REAL SQL semantics (guarded increment, floored adjust)
 * so reservation arithmetic is asserted, not scripted.
 */
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(async () => null),
}));

let quotaCount = 0;
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

/** Route-test knobs shared with the (hoisted) supabaseAdmin mock. */
const knobs = vi.hoisted(() => ({ denyQuota: false }));

/** In-memory model of the migration-020 SQL contract. */
const counters = new Map<string, number>();

vi.mock('@/lib/services/supabaseAdmin', () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === 'consume_chat_quota') {
        if (knobs.denyQuota) return { data: { ok: false, reason: 'quota exhausted' }, error: null };
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === 'refund_chat_quota') {
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === 'hit_rate_limit') return { data: { allowed: true, count: 1 }, error: null };
      if (fn === 'reserve_rate_limit') {
        // SQL: guarded increment — count + amount must fit under the limit.
        const key = String(args.p_key_prefix ?? '');
        const amount = Number(args.p_amount ?? 0);
        const limit = Number(args.p_limit ?? 0);
        const current = counters.get(key) ?? 0;
        if (current + amount > limit) {
          return { data: { allowed: false, count: current }, error: null };
        }
        counters.set(key, current + amount);
        return { data: { allowed: true, count: current + amount }, error: null };
      }
      if (fn === 'settle_rate_limit') {
        // SQL: GREATEST(0, count + delta), never refused.
        const key = String(args.p_key_prefix ?? '');
        const delta = Number(args.p_delta ?? 0);
        const current = counters.get(key) ?? 0;
        counters.set(key, Math.max(0, current + delta));
        return { data: { ok: true, count: Math.max(0, current + delta) }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from '@/app/api/chat/route';
import { GLOBAL_TOKEN_RESERVATION_CEILING } from '@/lib/chat/globalSpend';

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
function stubModelReply(totalTokens = 137): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = JSON.stringify({
        answer: 'Patience is the greatest compounding force.',
        claims: [],
        uncertainties: [],
      });
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: reply } }],
          usage: { total_tokens: totalTokens },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch,
  );
}

const BODY = { personaId: 'buffett', history: [], message: 'What is patience worth?' };

beforeEach(() => {
  quotaCount = 0;
  rpcCalls.length = 0;
  counters.clear();
  knobs.denyQuota = false;
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

// ── B: the CHAT_DISABLED contract — every value, exact behavior ──────
describe('W3-B — CHAT_DISABLED kill switch (single contract)', () => {
  const DISABLES: string[] = [
    '1',
    'true',
    'TRUE',
    'True',
    'tRUE',
    'yes',
    'on',
    'disable',
    'ture', // typo: a kill-switch typo must fail toward OFF (cost safety)
    '0x1',
    'false-ish',
    ' ', // whitespace-only trims to non-empty " "? No — see ENABLES note:
  ];
  // (a whitespace-only value trims to "" = unset = ENABLED; covered below)

  it.each(DISABLES.filter((v) => v.trim() !== ''))(
    'CHAT_DISABLED=%j -> 503 canned fallback, no quota, no upstream',
    async (value) => {
      stubModelReply();
      vi.stubEnv('CHAT_DISABLED', value);
      const res = await POST(makeReq(BODY));
      expect(res.status).toBe(503);
      const wire = await res.json();
      expect(wire.error).toBe('Chat temporarily unavailable');
      expect(wire.fallback).toBe(true);
      expect(quotaCount).toBe(0);
      expect(rpcCalls.some((c) => c.fn === 'consume_chat_quota')).toBe(false);
    },
  );

  const ENABLES: string[] = ['0', 'false', 'FALSE', 'False', 'no', 'NO', 'off', 'Off', ''];

  it.each(ENABLES)('CHAT_DISABLED=%j -> chat proceeds (200)', async (value) => {
    stubModelReply();
    vi.stubEnv('CHAT_DISABLED', value);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
  });

  it('CHAT_DISABLED unset -> chat proceeds (regression guard)', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
  });

  it('whitespace is trimmed: " 1 " disables and " " does not', async () => {
    stubModelReply();
    vi.stubEnv('CHAT_DISABLED', ' 1 ');
    expect((await POST(makeReq(BODY))).status).toBe(503);
    vi.stubEnv('CHAT_DISABLED', ' ');
    expect((await POST(makeReq(BODY))).status).toBe(200);
  });
});

// ── A: reservation / settlement ──────────────────────────────────────
describe('W3-A — global daily token cap as a hard reservation', () => {
  it('the route reserves the single-request ceiling BEFORE the provider call', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const reserve = rpcCalls.find(
      (c) => c.fn === 'reserve_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(reserve).toBeDefined();
    expect(reserve!.args.p_amount).toBe(GLOBAL_TOKEN_RESERVATION_CEILING);
    // The reservation happens BEFORE the per-identity quota consumption.
    const quotaAt = rpcCalls.findIndex((c) => c.fn === 'consume_chat_quota');
    const reserveAt = rpcCalls.findIndex(
      (c) => c.fn === 'reserve_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(reserveAt).toBeGreaterThanOrEqual(0);
    expect(quotaAt).toBeGreaterThan(reserveAt);
  });

  it('a denied reservation: 503 before per-identity quota is consumed', async () => {
    stubModelReply();
    // Pre-fill the token counter so the ceiling no longer fits.
    counters.set('chat:global:tok', 2_000_000);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(wire.fallback).toBe(true);
    expect(quotaCount).toBe(0);
  });

  it('success settles the reservation to the reported usage (no double counting)', async () => {
    stubModelReply(137);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const settle = rpcCalls.find(
      (c) => c.fn === 'settle_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(settle).toBeDefined();
    // Net contribution after reserve(R) + settle(A - R) is exactly A.
    expect(settle!.args.p_delta).toBe(137 - GLOBAL_TOKEN_RESERVATION_CEILING);
    expect(counters.get('chat:global:tok')).toBe(137);
  });

  it('multi-completion usage is settled ONCE with the accumulated total', async () => {
    // Model completion 1 requests a tool; model completion 2 is the final
    // answer. Data fetches (evidence assembly, tool execution) hit the
    // SAME stubbed global fetch, so dispatch on the request URL: only
    // /chat/completions is a model call.
    let modelCall = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        if (!String(url).includes('/chat/completions')) {
          // A data fetch: refuse it — the tool result becomes an honest
          // error/no-data payload, which does not affect token accounting.
          return new Response('offline', { status: 503 });
        }
        modelCall += 1;
        const content =
          modelCall === 1
            ? JSON.stringify({ tool: 'getPrices', args: { symbol: 'RELIANCE' } })
            : JSON.stringify({ answer: 'The price is grounded.', claims: [], uncertainties: [] });
        return new Response(
          JSON.stringify({
            choices: [{ message: { content } }],
            usage: { total_tokens: modelCall === 1 ? 100 : 250 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as unknown as typeof fetch,
    );
    const res = await POST(makeReq({ ...BODY, symbol: 'RELIANCE' }));
    expect(res.status).toBe(200);
    const settles = rpcCalls.filter(
      (c) => c.fn === 'settle_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(settles.length).toBe(1);
    expect(settles[0].args.p_delta).toBe(350 - GLOBAL_TOKEN_RESERVATION_CEILING);
    expect(counters.get('chat:global:tok')).toBe(350);
  });

  it('usage unavailable: the FULL reservation is kept (unknown spend is charged at the ceiling)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const reply = JSON.stringify({
          answer: 'Patience is the greatest compounding force.',
          claims: [],
          uncertainties: [],
        });
        // No usage member at all — the provider did not report one.
        return new Response(
          JSON.stringify({ choices: [{ message: { content: reply } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as unknown as typeof fetch,
    );
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const settle = rpcCalls.find(
      (c) => c.fn === 'settle_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(settle).toBeDefined();
    expect(settle!.args.p_delta).toBe(0);
    expect(counters.get('chat:global:tok')).toBe(GLOBAL_TOKEN_RESERVATION_CEILING);
  });

  it('upstream failure: quota refunded AND the reservation released', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('upstream broke', { status: 500 })) as unknown as typeof fetch,
    );
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(502);
    expect(rpcCalls.some((c) => c.fn === 'refund_chat_quota')).toBe(true);
    const settle = rpcCalls.find(
      (c) => c.fn === 'settle_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(settle).toBeDefined();
    expect(settle!.args.p_delta).toBe(-GLOBAL_TOKEN_RESERVATION_CEILING);
    expect(counters.get('chat:global:tok')).toBe(0);
  });

  it('per-identity quota denial releases the token reservation (no leak)', async () => {
    stubModelReply();
    knobs.denyQuota = true;
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(429);
    const settle = rpcCalls.find(
      (c) => c.fn === 'settle_rate_limit' && String(c.args.p_key_prefix).includes(':tok'),
    );
    expect(settle).toBeDefined();
    expect(settle!.args.p_delta).toBe(-GLOBAL_TOKEN_RESERVATION_CEILING);
    expect(counters.get('chat:global:tok')).toBe(0);
  });

  it('the admission boundary is exact: limit - ceiling admits, one token more refuses', async () => {
    stubModelReply(1000);
    // The SQL-level TRUE concurrency proof is the CI storm (24 parallel
    // psql sessions) — a JS-side mock race would prove nothing about the
    // real row-lock semantics. Here we pin the boundary arithmetic the
    // guarded increment enforces: a request fits iff counter + ceiling
    // <= limit. X7: the DEFAULT limit is TOTAL minus the reserved slice
    // (20%) — the boundary pins against that limit, and share=0 restores
    // the historical TOTAL boundary; a challenge-passed caller reserves
    // against the full TOTAL (the reserved slice is theirs).
    vi.stubEnv('CHAT_GLOBAL_DAILY_TOKENS', '2500000');
    vi.stubEnv('CHAT_GLOBAL_RESERVED_SHARE', '0');
    const { reserveGlobalTokens, releaseGlobalTokens } = await import('@/lib/chat/globalSpend');
    // counter = limit - ceiling: the last admissible request.
    counters.set('chat:global:tok', 2_500_000 - GLOBAL_TOKEN_RESERVATION_CEILING);
    expect(await reserveGlobalTokens()).toBe(true);
    await releaseGlobalTokens();
    // counter = limit - ceiling + 1: one token over — refused.
    counters.set('chat:global:tok', 2_500_000 - GLOBAL_TOKEN_RESERVATION_CEILING + 1);
    expect(await reserveGlobalTokens()).toBe(false);
    expect(counters.get('chat:global:tok')).toBe(2_500_000 - GLOBAL_TOKEN_RESERVATION_CEILING + 1);
  });
});

// ── C: one day-key source (SQL), stable prefixes from the route ──────
describe('W3-C — the IST day key lives ONLY in the RPCs', () => {
  it('the route passes stable key prefixes (no JS-computed date)', async () => {
    stubModelReply();
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(200);
    const reserves = rpcCalls.filter((c) => c.fn === 'reserve_rate_limit');
    expect(reserves.length).toBeGreaterThanOrEqual(2);
    for (const r of reserves) {
      expect(String(r.args.p_key_prefix)).toMatch(/^chat:global:(req|tok)$/);
    }
  });
});

// ── retained acceptance cases (W3 original) ──────────────────────────
describe('W3 — global daily request cap', () => {
  it('over the cap: 503 before per-identity quota is consumed', async () => {
    stubModelReply();
    counters.set('chat:global:req', 2000);
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(quotaCount).toBe(0);
  });
});

describe('W3 — anonymous identity pepper', () => {
  it('missing ANON_ID_PEPPER: anonymous chat fails CLOSED (503)', async () => {
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
