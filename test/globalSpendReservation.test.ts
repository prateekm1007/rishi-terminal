import { describe, it, expect } from 'vitest';

/**
 * W3-A (founder round-10 review, defect A): the global token reservation
 * ceiling must be MECHANICALLY derived from the production loop bounds —
 * not a magic number. This test pins every factor:
 *
 *   completions  = 1 initial + MAX_TOOL_ITERATIONS post-tool + 1 repair
 *   attempts     = MAX_PROVIDER_CANDIDATES per completion (failover chain)
 *   per attempt  = MAX_INPUT_TOKENS_PER_ATTEMPT + provider max output
 *
 * If any underlying bound changes without the ceiling being revisited,
 * this test FAILS (Constitution rule 24: a gate that cannot fail is
 * theatre). The two provider modules must agree on the output cap, and
 * the resolved failover chain can never exceed MAX_PROVIDER_CANDIDATES.
 */
import { GLOBAL_TOKEN_RESERVATION_CEILING } from '@/lib/chat/globalSpend';
import { MAX_TOOL_ITERATIONS, MAX_PROVIDER_CANDIDATES, resolveAiProviderCandidates } from '@/lib/ai/router';
import { PROVIDER_MAX_OUTPUT_TOKENS as OPENAI_MAX_OUTPUT } from '@/lib/ai/providers/openaiCompatible';
import { PROVIDER_MAX_OUTPUT_TOKENS as GEMINI_MAX_OUTPUT } from '@/lib/ai/providers/gemini';

/** Worst-case input tokens per provider attempt. Derivation (measured
 *  2026-10-03, scripts committed with the W3 closure evidence):
 *    server-built system context  ~4,000 chars (persona prompt max 1,524
 *      across the canonical registry + UNTRUSTED_HISTORY_BLOCK 1,283 +
 *      tool protocol 767 + block framing)
 *  + evidence block               16,000 chars (16-item live package
 *      measured 4,731; merged tool evidence carries the same item shapes)
 *  + history                       8,000 chars (route contract)
 *  + message                       2,000 chars (route contract)
 *  + loop turns                   25,000 chars (5 tool request/result
 *      pairs at the measured per-payload worst)
 *  + repair turns                  9,000 chars (discarded candidate +
 *      validator feedback)
 *  = 64,000 chars at the conservative 3 chars/token -> 21,334 -> 22,000.
 */
const MAX_INPUT_TOKENS_PER_ATTEMPT = 22_000;

const MAX_FINAL_REPAIRS = 1;

describe('W3-A — GLOBAL_TOKEN_RESERVATION_CEILING derivation', () => {
  it('equals the mechanical product of the production loop bounds', () => {
    const completions = 1 + MAX_TOOL_ITERATIONS + MAX_FINAL_REPAIRS;
    expect(completions).toBe(6);
    expect(MAX_PROVIDER_CANDIDATES).toBe(2);
    expect(OPENAI_MAX_OUTPUT).toBe(2048);
    expect(GEMINI_MAX_OUTPUT).toBe(2048);
    expect(GLOBAL_TOKEN_RESERVATION_CEILING).toBe(
      completions * MAX_PROVIDER_CANDIDATES * (MAX_INPUT_TOKENS_PER_ATTEMPT + OPENAI_MAX_OUTPUT),
    );
  });

  it('the resolved failover chain never exceeds MAX_PROVIDER_CANDIDATES', () => {
    process.env.CHAT_API_BASE_URL = 'https://example.invalid/v1';
    process.env.CHAT_API_KEY = 'sk-test';
    process.env.GEMINI_API_KEY = 'gemini-test';
    try {
      expect(resolveAiProviderCandidates().length).toBeLessThanOrEqual(MAX_PROVIDER_CANDIDATES);
    } finally {
      delete process.env.CHAT_API_BASE_URL;
      delete process.env.CHAT_API_KEY;
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('the ceiling is a sane fraction of the default daily cap', () => {
    // With the default 2,000,000-token day, at least 6 concurrent
    // requests must be admissible (the reservation must not be so fat it
    // wedges the default deployment).
    expect(2_000_000 / GLOBAL_TOKEN_RESERVATION_CEILING).toBeGreaterThanOrEqual(6);
  });
});
