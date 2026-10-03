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
import { MAX_SERIALIZED_INPUT_CHARS } from '@/lib/ai/providers/serializedInputBound';

/** Worst-case input tokens per provider attempt. Derivation (ENFORCED,
 *  not measured — founder round-12 audit): the serialized wire body of
 *  every provider attempt is refused beyond 64,000 chars by BOTH
 *  providers (lib/ai/providers/serializedInputBound.ts; behavioral proof
 *  in test/w3.inputBound.test.ts). 64,000 chars at the calibrated
 *  3 chars/token -> 21,334 -> 22,000. The residual (pathological Unicode
 *  tokenizing a legal-size payload above the calibration) is documented
 *  in lib/chat/globalSpend.ts and covered by the settlement ledger. */
const MAX_INPUT_TOKENS_PER_ATTEMPT = 22_000;

const MAX_FINAL_REPAIRS = 1;

describe('W3-A — GLOBAL_TOKEN_RESERVATION_CEILING derivation', () => {
  it('equals the mechanical product of the production loop bounds', () => {
    const completions = 1 + MAX_TOOL_ITERATIONS + MAX_FINAL_REPAIRS;
    expect(completions).toBe(6);
    expect(MAX_PROVIDER_CANDIDATES).toBe(2);
    expect(OPENAI_MAX_OUTPUT).toBe(2048);
    expect(GEMINI_MAX_OUTPUT).toBe(2048);
    // The 22,000-token input estimate derives from the ENFORCED
    // serialized-input bound (founder round-12 audit): both providers
    // refuse wire bodies beyond 64,000 chars, so the calibration
    // 64,000/3 must always fit inside the estimate.
    expect(MAX_SERIALIZED_INPUT_CHARS).toBe(64_000);
    expect(Math.ceil(MAX_SERIALIZED_INPUT_CHARS / 3)).toBeLessThanOrEqual(MAX_INPUT_TOKENS_PER_ATTEMPT);
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
