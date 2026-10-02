import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolveCanonicalPersona } from '@/lib/chat/registry';
import { checkRateLimit } from '@/lib/rateLimit';
import { generateEvidenceGroundedAnswer, toChatWire } from '@/lib/ai/router';
import { createCanonicalStockState } from '@/lib/ai/evidence';

/**
 * Coder Directions 2026-10-02 §8 — the DETERMINISTIC production AI-loop
 * probe. NOT a user feature; unreachable as one:
 *
 *   - PROBE_SECRET unset → 404 (Constitution Rule 6: default deny — the
 *     route does not exist unless the operator provisions the secret);
 *   - wrong/missing `x-probe-secret` header → 404 (timing-safe compare on
 *     SHA-256 digests, so the check leaks nothing about the secret);
 *   - no daily-quota consumption (it is not a chat feature) but the SAME
 *     per-IP burst bound as chat, so a leaked secret cannot become an
 *     unbounded free-chat oracle;
 *   - fixed persona, fixed message shape, fixed seed symbol/tool — the
 *     probe answers exactly one question shape.
 *
 * FOUR modes (the 2026-10-02 Commit-O reconciliation unified the sibling
 * session's chat-route witness entry point HERE — one secret-gated probe
 * surface, not two):
 *   positive         — probeSeedToolCall(getPrices RELIANCE): the seeded
 *                      tool executes, then the REAL model produces the
 *                      final structured claims (proves the production
 *                      model itself can ground);
 *   negative         — probeSeedToolCall(getPrices ZZZZNOPE): the honest
 *                      unknown-symbol failure through the same executor;
 *   witness          — deterministicWitness: real provider turn-1 + real
 *                      executor, then the SERVER-BUILT witness reply
 *                      (zero-flake pipeline gate; the model is NOT in the
 *                      final-answer path);
 *   witness-negative — deterministicWitness({symbol: ZZZZNOPE}): the
 *                      deterministic unknown-symbol failure.
 *
 * What every mode proves through the REAL production path: the canonical
 * executor, evidence injection, the system-prompt REBUILD with the
 * evidence contract (the 2026-10-02 production defect), grounding
 * validation, the server-generated verified surface, and §11 timings.
 *
 * Rule 10: errors are generic outward, detail logged server-side only.
 */
export const dynamic = 'force-dynamic';

const PROBE_PERSONA = 'damani';
const PROBE_SYMBOL = 'RELIANCE';
const PROBE_TOOL = 'getPrices';
const NEGATIVE_SYMBOL = 'ZZZZNOPE';
const BURST_WINDOW_SECONDS = 60;
const BURST_MAX_REQUESTS = 12;

function secretMatches(header: string | null): boolean {
  const expected = process.env.PROBE_SECRET;
  if (!expected || expected.length < 16) return false; // default deny
  if (!header) return false;
  const a = createHash('sha256').update(header).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function clientIp(req: NextRequest): string {
  // Same verified header semantics as app/api/chat/route.ts (N4, round 3):
  // Vercel overwrites X-Forwarded-For with exactly the client IP; the LAST
  // entry is the platform-set / trusted-proxy hop under both models.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function GET(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-probe-secret'))) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // Burst bound per IP (a probe must not bypass abuse controls entirely).
  const burst = await checkRateLimit(`probe:ai-loop:${clientIp(req)}`, BURST_MAX_REQUESTS, BURST_WINDOW_SECONDS);
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const modeParam = req.nextUrl.searchParams.get('mode');
  const mode =
    modeParam === 'negative' || modeParam === 'witness' || modeParam === 'witness-negative'
      ? modeParam
      : 'positive';
  const symbol = mode === 'negative' || mode === 'witness-negative' ? NEGATIVE_SYMBOL : PROBE_SYMBOL;
  const persona = resolveCanonicalPersona(PROBE_PERSONA);
  if (!persona) {
    console.error('[probe/ai-loop] probe persona missing from canonical registry');
    return NextResponse.json({ error: 'Probe unavailable' }, { status: 503 });
  }

  const message = `What is the latest price of ${symbol}?`;
  const stockState = createCanonicalStockState();
  const probeStart = Date.now();
  try {
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: persona.systemPrompt,
      history: [],
      message,
      evidence: [],
      stockState,
      // Exactly ONE probe mechanism per request — the seed keeps the real
      // model in the final-answer path; the witness replaces it.
      ...(mode === 'witness'
        ? { deterministicWitness: true as const }
        : mode === 'witness-negative'
          ? { deterministicWitness: { symbol: NEGATIVE_SYMBOL } as const }
          : { probeSeedToolCall: { tool: PROBE_TOOL, args: { symbol } } }),
    });
    if (!answer) {
      console.error('[probe/ai-loop] no approved chat provider configured');
      return NextResponse.json({ error: 'Probe unavailable' }, { status: 503 });
    }
    const wire = toChatWire(answer);
    return NextResponse.json({
      ...wire,
      probe: {
        mode,
        seededTool: PROBE_TOOL,
        seededSymbol: symbol,
        persona: PROBE_PERSONA,
        wallMs: Date.now() - probeStart,
      },
    });
  } catch (e) {
    console.error('[probe/ai-loop] failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Probe failed' }, { status: 502 });
  }
}
