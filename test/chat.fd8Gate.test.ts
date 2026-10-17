import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * CHAT-FD8-GATE (round 48, founder directive 2026-10-11, verbatim:
 * "Keep chat at 503 until FD-8 is decided").
 *
 * What this pins:
 *   1. The FD-8 decision state (lib/founderDecisions.ts): status open,
 *      dated 2026-10-11, authority = the founder's verbatim order —
 *      rule 1 (no unattributed state), rule 7 (no env/client override).
 *   2. The structural gate: chatDisabled() is TRUE while FD-8 is open
 *      for EVERY CHAT_DISABLED value — unset, "", and every false-y
 *      spelling included. The live-200 defect that justified this:
 *      production served chat with real upstream spend on 2026-10-11
 *      while FD-8 was open, because an env control nobody set is not a
 *      control (B-06 class).
 *   3. The gate ADDS a condition, it does not replace the W3-B env
 *      contract: with FD-8 mocked decided, every CHAT_DISABLED value
 *      behaves exactly as the W3-B contract says (the bite: the ONLY
 *      delta between the two states is the FD-8 gate).
 *   4. Route level: while FD-8 is open the chat route answers the canned
 *      503 BEFORE any quota, rate limit or upstream work.
 */
vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(async () => null),
}));

let quotaCount = 0;
const rpcCalls: Array<{ fn: string }> = [];
const knobs = vi.hoisted(() => ({ denyQuota: false }));
const counters = new Map<string, number>();

vi.mock('@/lib/services/supabaseAdmin', () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      rpcCalls.push({ fn });
      if (fn === 'consume_chat_quota') {
        if (knobs.denyQuota) return { data: { ok: false, reason: 'quota exhausted' }, error: null };
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === 'refund_chat_quota') return { data: { ok: true, refunded: true }, error: null };
      if (fn === 'hit_rate_limit') return { data: { allowed: true, count: 1 }, error: null };
      if (fn === 'reserve_rate_limit') return { data: { allowed: true, count: 1 }, error: null };
      if (fn === 'settle_rate_limit') return { data: { ok: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { readFileSync } from "node:fs";

import { POST } from '@/app/api/chat/route';
import { chatDisabled } from '@/lib/chat/globalSpend';
import { FD8_CHAT_PROVIDER, fd8ChatProviderApproved } from '@/lib/founderDecisions';

const REAL_FETCH = globalThis.fetch;

function makeReq(json: unknown, ip = '203.0.113.7'): never {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === 'x-forwarded-for' ? ip : null) },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function stubModelReply(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const reply = JSON.stringify({ answer: 'x', claims: [], uncertainties: [] });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: reply } }], usage: { total_tokens: 10 } }),
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
  vi.stubEnv('CHAT_API_BASE_URL', 'https://apihub.agnes-ai.com/v1');
  vi.stubEnv('CHAT_API_KEY', 'sk-test-key');
  vi.stubEnv('ANON_ID_PEPPER', 'test-pepper-0123456789abcdef');
  delete process.env.CHAT_DISABLED;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('CHAT-FD8-GATE — chat stays 503 until FD-8 is decided (founder 2026-10-11)', () => {
  it('the FD-8 state is open, dated, and attributed to the founder order', () => {
    expect(FD8_CHAT_PROVIDER.status).toBe('open');
    expect(fd8ChatProviderApproved()).toBe(false);
    expect(FD8_CHAT_PROVIDER.asOf).toBe('2026-10-11');
    expect(FD8_CHAT_PROVIDER.authority).toContain('Keep chat at 503');
    expect(FD8_CHAT_PROVIDER.authority).toContain('until FD-8 is decided');
  });

  it('no environment variable can move the decision (rule 7)', () => {
    const src = readFileSync('lib/founderDecisions.ts', 'utf8');
    expect(src.includes('process.env')).toBe(false);
    process.env.FD8_CHAT_PROVIDER = 'decided';
    process.env.CHAT_PROVIDER_APPROVED = 'true';
    expect(fd8ChatProviderApproved()).toBe(false);
    delete process.env.FD8_CHAT_PROVIDER;
    delete process.env.CHAT_PROVIDER_APPROVED;
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['false-y 0', '0'],
    ['false-y false', 'false'],
    ['false-y no', 'no'],
    ['false-y off', 'off'],
  ])('CHAT_DISABLED %s -> chatDisabled() is TRUE while FD-8 is open', (_label, value) => {
    if (value === undefined) delete process.env.CHAT_DISABLED;
    else process.env.CHAT_DISABLED = value;
    expect(chatDisabled()).toBe(true);
  });

  it('route level: the canned 503 fires before any quota or upstream work', async () => {
    stubModelReply(); // must NEVER be consumed
    const res = await POST(makeReq(BODY));
    expect(res.status).toBe(503);
    const wire = await res.json();
    expect(wire.error).toBe('Chat temporarily unavailable');
    expect(wire.fallback).toBe(true);
    expect(quotaCount).toBe(0);
    expect(rpcCalls.some((c) => c.fn === 'consume_chat_quota')).toBe(false);
  });

  it('the gate ADDS a condition — with FD-8 decided, the W3-B env contract holds unchanged (C5 bite)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/founderDecisions', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/founderDecisions')>();
      return { ...actual, fd8ChatProviderApproved: () => true };
    });
    try {
      const { chatDisabled: gated } = await import('@/lib/chat/globalSpend');
      // env contract under a decided FD-8: unset -> enabled
      delete process.env.CHAT_DISABLED;
      expect(gated()).toBe(false);
      // 'true' -> disabled (kill switch still kills)
      process.env.CHAT_DISABLED = 'true';
      expect(gated()).toBe(true);
      // 'false' -> enabled
      process.env.CHAT_DISABLED = 'false';
      expect(gated()).toBe(false);
    } finally {
      vi.doUnmock('@/lib/founderDecisions');
      vi.resetModules();
    }
  });
});
